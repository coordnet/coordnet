import "./instrument";

import * as Sentry from "@sentry/node";
import express from "express";
import expressWebsockets from "express-ws";
import knex from "knex";

import { server } from "./server";
import { hocuspocusSettings, settings } from "./settings";

const db = knex({
  client: "postgresql",
  connection: settings.DATABASE_URL,
  pool: { min: 2, max: 10 },
});
if (!db) throw Error("Database not connected");

const { app } = expressWebsockets(express());
app.use(express.json());

// Healthcheck
app.get("/", (_, response) => {
  response.send("OK");
});

// CRDT
app.ws("/", (websocket, request) => {
  server.handleConnection(websocket, request, {});
});

if (settings.SENTRY_DSN) Sentry.setupExpressErrorHandler(app);

app.listen(hocuspocusSettings.port, "::", () =>
  console.log(`Listening on http://0.0.0.0 and [::]:${hocuspocusSettings.port}`),
);
