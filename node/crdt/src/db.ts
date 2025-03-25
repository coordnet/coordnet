import "./instrument";

import knex from "knex";

import { settings } from "./settings";

export const db = knex({
  client: "postgresql",
  connection: settings.DATABASE_URL,
  pool: {
    min: 5,
    max: 20,
    acquireTimeoutMillis: 60000,
    createTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
  },
});
if (!db) throw Error("Database not connected");
