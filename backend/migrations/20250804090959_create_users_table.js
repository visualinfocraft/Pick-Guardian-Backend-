exports.up = function(knex) {
  return knex.schema.createTable('users', function(table) {
    table.increments('id').primary();

    // Local Email/Password
    table.string('email', 255).unique().nullable();
   table.string('passwordHash', 255).nullable(); 

    // Facebook / Google Auth
    table.string('facebookId').unique().nullable();
    table.string('googleId').unique().nullable();

    table.string('displayName').nullable();
    table.string('photo').nullable();
    table.string('provider').nullable().defaultTo('local');

    // OTP for reset password
    table.string('resetOtp', 6).nullable();
    table.timestamp('otpExpiresAt').nullable();

    table.timestamps(true, true); // created_at & updated_at
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('users');
};
