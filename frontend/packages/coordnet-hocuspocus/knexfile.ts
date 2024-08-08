import type { Knex } from "knex";
import { settings } from "./src/settings";

const config: { [key: string]: Knex.Config } = {
  development: {
    client: "postgresql",
    connection: settings.DATABASE_URL,
  },

  staging: {
    client: "postgresql",
    connection: settings.DATABASE_URL,
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: "knex_migrations",
    },
  },

  production: {
    client: "postgresql",
    connection: settings.DATABASE_URL,
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: "knex_migrations",
    },
  },
};

export default config;
