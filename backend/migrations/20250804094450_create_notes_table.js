exports.up = function(knex) {
  return knex.schema.createTable('Notes', function(table) {
    table.increments('id').primary();
    table.string('title').notNullable();
    table.text('content').notNullable();

    table.integer('userId').unsigned().notNullable()
      .references('id')
      .inTable('Users')
      .onDelete('CASCADE'); // optional: deletes notes if user is deleted

    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('Notes');
};
