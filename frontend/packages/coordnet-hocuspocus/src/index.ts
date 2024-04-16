import { Server } from "@hocuspocus/server";
import express from "express";
import expressWebsockets from "express-ws";

import config from "../knexfile";
import { addToGraph } from "./addToGraph";
import { addToNodePage } from "./addToNodePage";
import { Knex } from "./knex";
import { hocuspocusSettings } from "./settings";

const environment = process.env.ENVIRONMENT || "development";
const server = Server.configure({
  name: "coordnet-hocuspocus",
  ...hocuspocusSettings,
  extensions: [
    new Knex({
      config: config[environment],
    }),
  ],
});

const { app } = expressWebsockets(express());
app.use(express.json());

// Healthcheck
app.get("/", (_, response) => {
  response.send("OK");
});

// Add a node to the graph
app.post("/add-to-graph", async (request, response) => {
  return await addToGraph(server, request, response);
});

// Add text to a node page
app.post("/add-to-node-page", async (request, response) => {
  return await addToNodePage(server, request, response);
});

// Hocuspocus
app.ws("/", (websocket, request) => {
  server.handleConnection(websocket, request, {});
});

app.listen(hocuspocusSettings.port, () =>
  console.log(`Listening on http://127.0.0.1:${hocuspocusSettings.port}`),
);
