// migrations/XXXXXXXXXXXX_add_facebook_columns_to_users.js

exports.up = function(knex) {
  return knex.schema.alterTable('users', function(table) {
    table.string('displayName').nullable();
    table.string('photo').nullable();
    table.string('provider').nullable().defaultTo('local');
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('users', function(table) {
    table.dropColumn('displayName');
    table.dropColumn('photo');
    table.dropColumn('provider');
  });
};
