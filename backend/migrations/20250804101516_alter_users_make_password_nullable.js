exports.up = function(knex) {
  return knex.schema.alterTable('users', function(table) {
    table.string('password').nullable().alter();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('users', function(table) {
    table.string('password').notNullable().alter();
  });
};
