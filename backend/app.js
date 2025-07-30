const express = require("express");
const session = require("express-session");
const passport = require("passport");
const authRoutes = require("./routes/auth");
const sequelize = require("./config/database");
require("dotenv").config();
require("./config/passport"); // setup passport before routes



const i18nMiddleware = require('./middleware/i18n');

const app = express();
app.use(express.json());
app.use(i18nMiddleware); 

app.use(session({
  secret: "your_secret_key",
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());

app.use(express.json());
app.use("/api/auth", authRoutes);

sequelize.sync({ alter: true })
  .then(() => console.log("✅ DB Synced"))
  .catch(err => console.error("❌ DB Sync Error:", err));

module.exports = app;
