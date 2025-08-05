// const { DataTypes } = require("sequelize");
// const sequelize = require("../config/database");
// const User = require("./User"); // Import User model

// const Note = sequelize.define("Note", {
//   id: {
//     type: DataTypes.INTEGER,
//     primaryKey: true,
//     autoIncrement: true,
//   },

//   title: {
//     type: DataTypes.STRING,
//     allowNull: false,
//   },

//   content: {
//     type: DataTypes.TEXT,
//     allowNull: false,
//   },

//   userId: {
//     type: DataTypes.INTEGER,
//     allowNull: false,
//     references: {
//       model: User,
//       key: 'id'
//     }
//   }

// }, {
//   tableName: 'Notes',
//   timestamps: true
// });

// // Association
// User.hasMany(Note, { foreignKey: "userId", onDelete: "CASCADE" });
// Note.belongsTo(User, { foreignKey: "userId" });

// module.exports = Note;
