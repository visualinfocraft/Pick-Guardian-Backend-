// migrations/YYYYMMDDHHMMSS_add_facebookId_to_users.js

exports.up = function(knex) {
  return knex.schema.alterTable('users', function(table) {
    table.string('facebookId').unique().nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('users', function(table) {
    table.dropColumn('facebookId');
  });
};
