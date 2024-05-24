const express = require('express');
const bodyParser = require('body-parser');
const { db, initDatabase } = require('./database');

const app = express();
const PORT = 3000;

app.use(bodyParser.json());

// Initialize the database
initDatabase();

// Rotas CRUD
app.post('/users', (req, res) => {
  const { name, age } = req.body;
  db.run(`INSERT INTO users (name, age) VALUES (?, ?)`, [name, age], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ id: this.lastID });
  });
});

app.get('/users', (req, res) => {
  db.all(`SELECT * FROM users`, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.put('/users/:id', (req, res) => {
  const { id } = req.params;
  const { name, age } = req.body;
  db.run(`UPDATE users SET name = ?, age = ? WHERE id = ?`, [name, age, id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ changes: this.changes });
  });
});

app.delete('/users/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM users WHERE id = ?`, [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ changes: this.changes });
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
