const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const app = express();
const db = new sqlite3.Database('./database.db');

app.use(bodyParser.json());

// Criação das tabelas e inserção de dados de exemplo
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT,
    idade INTEGER,
    email TEXT UNIQUE,
    senha TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    quantity INTEGER,
    expiry_date TEXT,
    user_id INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);
});

// Endpoint de login
app.post('/login', (req, res) => {
  const { email, senha } = req.body;
  db.get(`SELECT id, senha FROM users WHERE email = ?`, [email], async (err, row) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (row && await bcrypt.compare(senha, row.senha)) {
      res.json({ success: true, userId: row.id });
    } else {
      res.json({ success: false });
    }
  });
});

// Endpoint de registro
app.post('/register', async (req, res) => {
  const { nome, idade, email, senha } = req.body;
  const hashedPassword = await bcrypt.hash(senha, 10);
  db.run(
    `INSERT INTO users (nome, idade, email, senha) VALUES (?, ?, ?, ?)`,
    [nome, idade, email, hashedPassword],
    function (err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      res.json({ success: true, userId: this.lastID });
    }
  );
});

app.get('/users/:userId/products', (req, res) => {
  const { userId } = req.params;
  db.all(`SELECT * FROM products WHERE user_id = ?`, [userId], (err, rows) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.post('/products', (req, res) => {
  const { name, quantity, expiry_date, user_id } = req.body;
  db.run(
    `INSERT INTO products (name, quantity, expiry_date, user_id) VALUES (?, ?, ?, ?)`,
    [name, quantity, expiry_date, user_id],
    function (err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      res.json({ id: this.lastID });
    }
  );
});

app.put('/products/:id', (req, res) => {
  const { id } = req.params;
  const { name, quantity, expiry_date } = req.body;
  db.run(
    `UPDATE products SET name = ?, quantity = ?, expiry_date = ? WHERE id = ?`,
    [name, quantity, expiry_date, id],
    function (err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      res.json({ success: true });
    }
  );
});

app.delete('/products/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM products WHERE id = ?`, [id], function (err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    res.json({ success: true });
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
