import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("documents", function (table) {
    table.increments();
    table.string("name").notNullable();
    table.binary("data").notNullable();
    table.json("json").notNullable();
    table.timestamps(true, true);
    table.unique("name");
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable("documents");
}
