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

const getDocumentType = (name: string) => {
  if (name.startsWith("space-")) {
    return "SPACE";
  } else if (name.startsWith("node-graph-")) {
    return "GRAPH";
  } else if (name.startsWith("node-editor-")) {
    return "EDITOR";
  }
};

const cleanDocumentName = (name: string) => {
  return name.replace(/^(node-graph-|space-|node-editor-)/, "");
};

export class Knex extends Database {
  db?: knex.Knex;

  configuration: KnexConfiguration = {
    config: {},
    fetch: async ({ documentName }) => {
      const document_type = getDocumentType(documentName);
      const public_id = cleanDocumentName(documentName);
      return new Promise((resolve, reject) => {
        this.db("nodes_document")
          .where({ public_id, document_type })
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
      const data = {
        data: state,
        json,
        updated_at: this.db.fn.now(),
      };
      await this.db("nodes_document")
        .insert({
          public_id,
          document_type,
          created_at: this.db.fn.now(),
          ...data,
        })
        .onConflict(["public_id", "document_type"])
        .merge({ ...data });
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
