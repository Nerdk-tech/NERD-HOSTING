const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const pm2 = require('pm2');

const app = express();
const db = new sqlite3.Database('./users.db');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'khosting_secret_key',
  resave: false,
  saveUninitialized: true,
}));

// Serve static files from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html explicitly on '/'
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Create users table if it doesn't exist
db.run("CREATE TABLE IF NOT EXISTS users (" +
  "id INTEGER PRIMARY KEY AUTOINCREMENT," +
  "email TEXT UNIQUE," +
  "password TEXT" +
")");

// Middleware to check if user is logged in
function checkAuth(req, res, next) {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.redirect('/');
  }
}

// Login route
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) return res.send('Database error');
    if (!user) return res.send('No user found');

    if (bcrypt.compareSync(password, user.password)) {
      req.session.userId = user.id;
      res.redirect('/panel.html');
    } else {
      res.send('Incorrect password');
    }
  });
});

// Signup route
app.post('/signup', (req, res) => {
  const { email, password } = req.body;
  const hashed = bcrypt.hashSync(password, 8);
  db.run('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashed], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.send('Email already registered');
      }
      return res.send('Database error');
    }
    req.session.userId = this.lastID;
    res.redirect('/panel.html');
  });
});

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// API to deploy a bot with PM2
app.post('/deploy', checkAuth, (req, res) => {
  const { botName, scriptPath } = req.body;
  if (!botName || !scriptPath) {
    return res.status(400).send('Missing botName or scriptPath');
  }

  pm2.connect(function(err) {
    if (err) {
      console.error(err);
      return res.status(500).send('PM2 connection error');
    }

    pm2.start({
      script: scriptPath,
      name: botName,
    }, function(err) {
      pm2.disconnect();
      if (err) {
        console.error(err);
        return res.status(500).send('Failed to deploy bot');
      }
      res.send('Bot deployed successfully');
    });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`K-HOSTING backend running on port ${PORT}`);
});
