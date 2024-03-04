import { Database, DatabaseConfiguration } from "@hocuspocus/extension-database";
import { TiptapTransformer } from "@hocuspocus/transformer";
import StarterKit from "@tiptap/starter-kit";
import knex from "knex";

const transformer = TiptapTransformer.extensions([StarterKit]);

export interface KnexConfiguration extends DatabaseConfiguration {
  /**
   * Knex configuration
   *
   * https://knexjs.org/guide/#configuration-options
   */
  config: string | knex.Knex.Config<unknown>;
}

export class Knex extends Database {
  db?: knex.Knex;

  configuration: KnexConfiguration = {
    config: {},
    fetch: async ({ documentName }) => {
      return new Promise((resolve, reject) => {
        this.db("documents")
          .where({ name: documentName })
          .orderBy("id", "desc")
          .first()
          .then((row) => {
            resolve(row?.data);
          })
          .catch((error) => {
            reject(error);
          });
      });
    },
    store: async ({ documentName, state, document }) => {
      let json = {};
      if (documentName.startsWith("space-")) {
        json = {
          nodes: document.getMap("nodes").toJSON(),
          deletedNodes: document.getArray("deletedNodes").toJSON(),
        };
      } else if (documentName.startsWith("node-graph-")) {
        json = {
          nodes: document.getMap("nodes").toJSON(),
          edges: document.getMap("edges").toJSON(),
        };
      } else {
        json = transformer.fromYdoc(document);
      }
      const data = {
        data: state,
        json,
        updated_at: this.db.fn.now(),
      };
      await this.db("documents")
        .insert({
          name: documentName,
          ...data,
        })
        .onConflict("name")
        .merge({
          data: state,
          ...data,
        });
    },
  };

  constructor(configuration?: Partial<KnexConfiguration>) {
    super({});

    this.configuration = {
      ...this.configuration,
      ...configuration,
    };
  }

  async onConfigure() {
    this.db = knex(this.configuration.config);
  }

  async onListen() {}
}
