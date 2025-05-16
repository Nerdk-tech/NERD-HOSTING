const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// Set up SQLite database
const db = new sqlite3.Database('./khosting.db', (err) => {
  if (err) console.error('DB error:', err);
  else console.log('Connected to SQLite DB');
});

// Create users table if not exists
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE,
  password TEXT
)`);

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
  secret: 'supersecretkey',
  resave: false,
  saveUninitialized: false,
}));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.post('/signup', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).send('Missing email or password');
  
  db.run(
    'INSERT INTO users (email, password) VALUES (?, ?)',
    [email, password],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) return res.status(400).send('Email already exists');
        return res.status(500).send('DB error');
      }
      req.session.userId = this.lastID;
      res.redirect('/panel.html');
    }
  );
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).send('Missing email or password');
  
  db.get('SELECT * FROM users WHERE email = ? AND password = ?', [email, password], (err, row) => {
    if (err) return res.status(500).send('DB error');
    if (!row) return res.status(401).send('Invalid email or password');
    
    req.session.userId = row.id;
    res.redirect('/panel.html');
  });
});

// Protect panel route
app.get('/panel.html', (req, res, next) => {
  if (!req.session.userId) return res.redirect('/');
  next();
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`K-HOSTING backend running on port ${PORT}`);
});
