const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const session = require("express-session");
const sqlite3 = require("sqlite3").verbose();
const app = express();
const PORT = process.env.PORT || 10000;

// Static files
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));

// Session setup
app.use(session({
  secret: "khosting_secret",
  resave: false,
  saveUninitialized: true
}));

// SQLite DB
const db = new sqlite3.Database("./khosting.db");

db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE,
  password TEXT
)`);

// Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/deploy", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "deploy.html"));
});

app.post("/signup", (req, res) => {
  const { email, password } = req.body;
  db.run(`INSERT INTO users (email, password) VALUES (?, ?)`, [email, password], (err) => {
    if (err) {
      return res.send("Signup failed: User may already exist.");
    }
    req.session.user = email;
    res.redirect("/deploy");
  });
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  db.get(`SELECT * FROM users WHERE email = ? AND password = ?`, [email, password], (err, user) => {
    if (user) {
      req.session.user = user.email;
      res.redirect("/deploy");
    } else {
      res.send("Invalid credentials.");
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`K-HOSTING backend running on port ${PORT}`);
});
