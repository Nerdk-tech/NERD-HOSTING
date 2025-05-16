// Backend for K-HOSTING with bot deployment
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const db = new sqlite3.Database('./users.db');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(session({
  secret: 'khosting_secret',
  resave: false,
  saveUninitialized: true
}));

app.use(express.static('public'));

// Create user table
db.run(\`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE,
  password TEXT
)\`);

// Signup
app.post('/signup', (req, res) => {
  const { email, password } = req.body;
  const hashed = bcrypt.hashSync(password, 10);
  db.run(\`INSERT INTO users (email, password) VALUES (?, ?)\`, [email, hashed], function (err) {
    if (err) return res.status(400).json({ error: 'Email already exists' });
    req.session.userId = this.lastID;
    res.json({ success: true });
  });
});

// Login
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  db.get(\`SELECT * FROM users WHERE email = ?\`, [email], (err, user) => {
    if (err || !user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    req.session.userId = user.id;
    res.json({ success: true });
  });
});

// Auth Middleware
function checkAuth(req, res, next) {
  if (!req.session.userId) return res.redirect('/');
  next();
}

// Protected panel route
app.get('/panel.html', checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'panel.html'));
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// Deploy Bot
app.post('/deploy-bot', checkAuth, (req, res) => {
  const { botName, scriptPath } = req.body;
  exec(\`pm2 start \${scriptPath} --name "\${botName}"\`, (err, stdout, stderr) => {
    if (err) return res.status(500).json({ error: stderr });
    res.json({ success: true, output: stdout });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(\`K-HOSTING server running at http://localhost:\${PORT}\`));
