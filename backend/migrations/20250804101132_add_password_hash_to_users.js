// add_password_hash_to_users.js

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable("users", function(table) {
    table.string("passwordHash", 255).nullable(); // yahi naya column add ho raha hai
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable("users", function(table) {
    table.dropColumn("passwordHash"); // agar migration rollback karna ho to
  });
};
