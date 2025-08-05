const express = require("express");
const session = require("express-session");
const passport = require("passport");
const authRoutes = require("./routes/auth");
const db = require("./config/Knex"); 
require("dotenv").config();
require("./config/passport"); 

const i18nMiddleware = require('./middleware/i18n');

const app = express();
app.use(express.json());
app.use(i18nMiddleware);

app.use(session({
  secret: "your_secret_key",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, 
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 
  }
}));

app.use(passport.initialize());
app.use(passport.session());


app.use("/api/auth", authRoutes);

// Knex does not auto-create tables – use migrations instead.
// But you can check connection like this:
db.raw("SELECT 1")
  .then(() => console.log("✅ Knex DB connection success"))
  .catch((err) => {
    console.error("❌ Knex DB connection failed", err.message);
    process.exit(1); // stop the app if DB connection fails
  });


module.exports = app;
