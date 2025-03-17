import "./instrument";

import {
  onAuthenticatePayload,
  onConnectPayload,
  onLoadDocumentPayload,
  onStoreDocumentPayload,
  Server,
} from "@hocuspocus/server";
import { TiptapTransformer } from "@hocuspocus/transformer";
import StarterKit from "@tiptap/starter-kit";
import * as Y from "yjs";

import { db } from "./db";
import { hocuspocusSettings } from "./settings";
import { backendRequest, cleanDocumentName, getDocumentType } from "./utils";

const transformer = TiptapTransformer.extensions([StarterKit]);

const modelMap = {
  SPACE: { endpoint: "spaces", type: "SPACE" },
  CANVAS: { endpoint: "nodes", type: "GRAPH" },
  EDITOR: { endpoint: "nodes", type: "EDITOR" },
  SKILL: { endpoint: "methods", type: "METHOD" },
  SKILL_RUN: { endpoint: "method-runs", type: "METHOD_RUN" },
};

setInterval(() => {
  const memoryUsage = process.memoryUsage();
  console.log(
    `Memory usage: RSS: ${Math.round(memoryUsage.rss / 1024 / 1024)}MB, Heap: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}/${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
  );
}, 30000);

export const server = Server.configure({
  name: "coordnet-crdt",
  ...hocuspocusSettings,
  async onConnect({ connection }: onConnectPayload) {
    connection.requiresAuthentication = true;
  },
  async onAuthenticate(data: onAuthenticatePayload) {
    const { documentName, token } = data;
    console.log("Authenticating for document", documentName);

    const documentType = getDocumentType(documentName);
    if (!documentType) {
      throw new Error(`Invalid document type for document '${documentName}'`);
    }
    const public_id = cleanDocumentName(documentName);

    if (
      documentType === "SPACE" ||
      documentType === "CANVAS" ||
      documentType === "EDITOR" ||
      documentType === "SKILL" ||
      documentType === "SKILL_RUN"
    ) {
      if (token == process.env.WEBSOCKET_API_KEY) return true;

      const model = modelMap[documentType];
      const request = await backendRequest(
        `api/nodes/${model.endpoint}/${public_id}/?show_permissions=true`,
        token == "public" ? undefined : token
      );
      if (request.status !== 200) {
        throw new Error("Not authorized!");
      }

      // Skill runs don't have granular permissions so if it returns a 200 then they have access
      if (documentType === "SKILL_RUN") {
        return true;
      }

      // Otherwise check if the user has write access
      const response = await request.json();
      if (!response.allowed_actions.includes("write")) {
        data.connection.readOnly = true;
      }
    } else {
      throw new Error("Not authorized!");
    }
  },

  async onLoadDocument({ document, documentName }: onLoadDocumentPayload) {
    const documentType = getDocumentType(documentName);
    if (!documentType) {
      throw new Error(`Invalid document type for document '${documentName}'`);
    }
    const public_id = cleanDocumentName(documentName);
    const document_type = modelMap[documentType].type;
    const row = await db("nodes_document")
      .where({ public_id, document_type })
      .orderBy("id", "desc")
      .first();

    if (row?.data) {
      Y.applyUpdate(document, row?.data);
    }

    return document;
  },

  async onStoreDocument({ documentName, document }: onStoreDocumentPayload) {
    const data = Buffer.from(Y.encodeStateAsUpdate(document));

    const documentType = getDocumentType(documentName);
    if (!documentType) {
      throw new Error(`Invalid document type for document '${documentName}'`);
    }
    const public_id = cleanDocumentName(documentName);

    let json: { [key: string]: { [key: string]: unknown } } = {};
    if (documentType === "SPACE") {
      json = {
        nodes: document.getMap("nodes").toJSON(),
      };
    } else if (documentType === "CANVAS") {
      json = {
        nodes: document.getMap("nodes").toJSON(),
        edges: document.getMap("edges").toJSON(),
      };
    } else if (documentType === "EDITOR") {
      json = transformer.fromYdoc(document, "default");
    } else if (documentType === "SKILL" || documentType === "SKILL_RUN") {
      // Add all the maps and documents from the skill
      for (const key of document.share.keys()) {
        if (key.endsWith("-document")) {
          const documentJSON = transformer.fromYdoc(document, key);
          if (documentJSON.content.length) {
            json[key] = documentJSON;
          }
        } else {
          json[key] = document.getMap(key).toJSON();
        }
      }
    }

    const document_type = modelMap[documentType].type;
    const columns = { data, json, updated_at: db.fn.now() };
    console.log("Storing document", documentName, document_type, public_id);
    await db("nodes_document")
      .insert({
        public_id,
        document_type,
        created_at: db.fn.now(),
        ...columns,
      })
      .onConflict(["public_id", "document_type"])
      .merge({ ...columns });
  },
});
