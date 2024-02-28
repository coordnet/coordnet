import { Server } from "@hocuspocus/server";

import config from "../knexfile";
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

server.listen();
