import { Server } from "@hocuspocus/server";
import { TiptapTransformer } from "@hocuspocus/transformer";
import StarterKit from "@tiptap/starter-kit";
import express from "express";
import expressWebsockets from "express-ws";
import knex from "knex";
import * as Y from "yjs";

import config from "../knexfile";
import { addToGraph } from "./addToGraph";
import { addToNodePage } from "./addToNodePage";
import { hocuspocusSettings } from "./settings";
import { Me } from "./types";
import { authRequest, backendRequest, cleanDocumentName, getDocumentType } from "./utils";

const transformer = TiptapTransformer.extensions([StarterKit]);

const environment = process.env.ENVIRONMENT || "development";
const db = knex(config[environment]);
if (!db) throw Error("Database not connected");

const server = Server.configure({
  name: "coordnet-hocuspocus",
  ...hocuspocusSettings,
  async onConnect({ connection }) {
    connection.requiresAuthentication = true;
  },
  async onAuthenticate(data) {
    const { documentName, token } = data;

    const document_type = getDocumentType(documentName);
    const public_id = cleanDocumentName(documentName);

    const request = await backendRequest(`api/users/me/`, token);
    const user = (await request.json()) as Me;

    if (document_type === "SPACE" || document_type === "GRAPH" || document_type === "EDITOR") {
      const model = document_type === "SPACE" ? "spaces" : "nodes";
      const request = await backendRequest(`api/nodes/${model}/${public_id}/`, token);
      const response = await request.json();
      if (request.status !== 200) {
        throw new Error("Not authorized!");
      } else if (!response.allowed_actions.includes("write")) {
        data.connection.readOnly = true;
      }
    } else {
      throw new Error("Not authorized!");
    }

    return { user };
  },
  async onLoadDocument({ document, documentName }) {
    const document_type = getDocumentType(documentName);
    const public_id = cleanDocumentName(documentName);
    const row = await db("nodes_document")
      .where({ public_id, document_type })
      .orderBy("id", "desc")
      .first();

    if (row?.data) {
      Y.applyUpdate(document, row?.data);
    }

    return document;
  },

  async onStoreDocument({ documentName, document }) {
    const data = Buffer.from(Y.encodeStateAsUpdate(document));

    const document_type = getDocumentType(documentName);
    const public_id = cleanDocumentName(documentName);

    let json = {};
    if (document_type === "SPACE") {
      json = {
        nodes: document.getMap("nodes").toJSON(),
        deletedNodes: document.getArray("deletedNodes").toJSON(),
      };
    } else if (document_type === "GRAPH") {
      json = {
        nodes: document.getMap("nodes").toJSON(),
        edges: document.getMap("edges").toJSON(),
      };
    } else if (document_type === "EDITOR") {
      json = transformer.fromYdoc(document);
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

// Add a node to the graph
app.post("/add-to-graph", async (request, response) => {
  if (!authRequest(request)) {
    return response.status(401).send("Unauthorized");
  }
  return await addToGraph(server, request, response);
});

// Add text to a node page
app.post("/add-to-node-page", async (request, response) => {
  if (!authRequest(request)) {
    return response.status(401).send("Unauthorized");
  }
  return await addToNodePage(server, request, response);
});

// Hocuspocus
app.ws("/", (websocket, request) => {
  server.handleConnection(websocket, request, {});
});

app.listen(hocuspocusSettings.port, () =>
  console.log(`Listening on http://127.0.0.1:${hocuspocusSettings.port}`),
);
