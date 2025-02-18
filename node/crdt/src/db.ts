import "./instrument";

import knex from "knex";

import { settings } from "./settings";

export const db = knex({
  client: "postgresql",
  connection: settings.DATABASE_URL,
  pool: { min: 2, max: 10 },
});
if (!db) throw Error("Database not connected");
