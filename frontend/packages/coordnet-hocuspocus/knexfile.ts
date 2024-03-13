import type { Knex } from "knex";
import { settings } from "./src/settings";

const config: { [key: string]: Knex.Config } = {
  development: {
    client: "postgresql",
    connection: {
      database: settings.POSTGRES_DATABASE,
      port: settings.POSTGRES_PORT,
      user: settings.POSTGRES_USER,
      password: settings.POSTGRES_PASSWORD,
    },
  },

  staging: {
    client: "postgresql",
    connection: {
      database: settings.POSTGRES_DATABASE,
      port: settings.POSTGRES_PORT,
      user: settings.POSTGRES_USER,
      password: settings.POSTGRES_PASSWORD,
    },
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
    connection: {
      database: settings.POSTGRES_DATABASE,
      port: settings.POSTGRES_PORT,
      user: settings.POSTGRES_USER,
      password: settings.POSTGRES_PASSWORD,
    },
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
