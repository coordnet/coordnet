import "./instrument";

import {
  onAuthenticatePayload,
  onConnectPayload,
  onLoadDocumentPayload,
  onStoreDocumentPayload,
  Server,
} from "@hocuspocus/server";
import { TiptapTransformer } from "@hocuspocus/transformer";
import * as Sentry from "@sentry/node";
import StarterKit from "@tiptap/starter-kit";
import express from "express";
import expressWebsockets from "express-ws";
import knex from "knex";
import * as Y from "yjs";

import config from "../knexfile";
import { addToCanvas } from "./addToCanvas";
import { addToNodePage } from "./addToNodePage";
import { hocuspocusSettings, settings } from "./settings";
import { authRequest, backendRequest, cleanDocumentName, getDocumentType } from "./utils";

const transformer = TiptapTransformer.extensions([StarterKit]);

const environment = process.env.ENVIRONMENT || "development";
const db = knex(config[environment]);
if (!db) throw Error("Database not connected");

const modelMap = {
  SPACE: { endpoint: "spaces", type: "SPACE" },
  CANVAS: { endpoint: "nodes", type: "GRAPH" },
  EDITOR: { endpoint: "nodes", type: "EDITOR" },
  SKILL: { endpoint: "methods", type: "METHOD" },
};

const server = Server.configure({
  name: "coordnet-crdt",
  ...hocuspocusSettings,
  async onConnect({ connection }: onConnectPayload) {
    connection.requiresAuthentication = true;
  },
  async onAuthenticate(data: onAuthenticatePayload) {
    const { documentName, token } = data;

    const document_type = getDocumentType(documentName);
    const public_id = cleanDocumentName(documentName);

    if (
      document_type === "SPACE" ||
      document_type === "CANVAS" ||
      document_type === "EDITOR" ||
      document_type === "SKILL"
    ) {
      const model = modelMap[document_type];
      const request = await backendRequest(
        `api/nodes/${model.endpoint}/${public_id}/?show_permissions=true`,
        token == "public" ? undefined : token,
      );
      if (request.status !== 200) {
        throw new Error("Not authorized!");
      }

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

    const document_type = getDocumentType(documentName);
    const public_id = cleanDocumentName(documentName);

    console.log("Storing document", documentName, document_type, public_id);

    let json: { [key: string]: { [key: string]: unknown } } = {};
    if (document_type === "SPACE") {
      json = {
        nodes: document.getMap("nodes").toJSON(),
      };
    } else if (document_type === "CANVAS") {
      json = {
        nodes: document.getMap("nodes").toJSON(),
        edges: document.getMap("edges").toJSON(),
      };
    } else if (document_type === "EDITOR") {
      json = transformer.fromYdoc(document, "default");
    } else if (document_type === "SKILL") {
      // Add all the maps and documents from the skill
      for (const key of document.share.keys()) {
        if (key.endsWith("-document")) {
          json[key] = transformer.fromYdoc(document, key);
        } else {
          json[key] = document.getMap(key).toJSON();
        }
      }
    }
    const columns = { data, json, updated_at: db.fn.now() };
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

const { app } = expressWebsockets(express());
app.use(express.json());

// Healthcheck
app.get("/", (_, response) => {
  response.send("OK");
});

// Add a node to the canvas
app.post("/add-to-canvas", async (request, response) => {
  if (!authRequest(request)) {
    return response.status(401).send("Unauthorized");
  }
  return await addToCanvas(server, request, response);
});

// Add text to a node page
app.post("/add-to-node-page", async (request, response) => {
  if (!authRequest(request)) {
    return response.status(401).send("Unauthorized");
  }
  return await addToNodePage(server, request, response);
});

// CRDT
app.ws("/", (websocket, request) => {
  server.handleConnection(websocket, request, {});
});

if (settings.SENTRY_DSN) Sentry.setupExpressErrorHandler(app);

app.listen(hocuspocusSettings.port, "0.0.0.0", () =>
  console.log(`Listening on http://0.0.0.0:${hocuspocusSettings.port}`),
);
