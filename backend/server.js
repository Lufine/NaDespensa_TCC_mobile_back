const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const db = new sqlite3.Database('./database.db');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const axios = require('axios');
const cheerio = require('cheerio');

app.use(bodyParser.json());

// Criação das tabelas
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT,
    idade INTEGER,
    email TEXT,
    senha TEXT,
    telefone TEXT
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
  db.get(
    `SELECT id, senha FROM users WHERE email = ?`,
    [email],
    (err, row) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      if (row && bcrypt.compareSync(senha, row.senha)) {
        res.json({ success: true, userId: row.id });
      } else {
        res.json({ success: false });
      }
    }
  );
});

// Endpoint de registro
app.post('/register', (req, res) => {
  const { nome, idade, email, senha, telefone } = req.body;
  const hashedPassword = bcrypt.hashSync(senha, saltRounds);
  db.run(
    `INSERT INTO users (nome, idade, email, senha, telefone) VALUES (?, ?, ?, ?, ?)`,
    [nome, idade, email, hashedPassword, telefone],
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
  db.all(
    `SELECT * FROM products WHERE user_id = ?`,
    [userId],
    (err, rows) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

app.get('/users/:userId', (req, res) => {
  const { userId } = req.params;
  db.all(
    `SELECT * FROM users WHERE id = ?`,
    [userId],
    (err, rows) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

app.delete('/users/:userId', (req, res) => {
  const { userId } = req.params;
  db.run(
    `DELETE FROM users WHERE id = ?`,
    [userId],
    function (err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      res.json({ success: true });
    }
  );
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

app.put('/products/:productId', (req, res) => {
  const { productId } = req.params;
  const { name, quantity, expiry_date, user_id } = req.body;
  db.run(
    `UPDATE products SET name = ?, quantity = ?, expiry_date = ?, user_id = ? WHERE id = ?`,
    [name, quantity, expiry_date, user_id, productId],
    function (err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      res.json({ success: true });
    }
  );
});

app.delete('/products/:productId', (req, res) => {
  const { productId } = req.params;
  db.run(
    `DELETE FROM products WHERE id = ?`,
    [productId],
    function (err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      res.json({ success: true });
    }
  );
});

// Endpoint para buscar receitas com base nos ingredientes
app.post('/recipes', async (req, res) => {
  const { ingredients } = req.body;

  try {
    const searchUrl = `https://www.tudogostoso.com.br/busca?q=${encodeURIComponent(ingredients.join(' '))}`;
    const searchResponse = await axios.get(searchUrl);
    const $ = cheerio.load(searchResponse.data);

    const recipes = [];

    $('.card').each((index, element) => {
      const title = $(element).find('.card__title').text().trim();
      const link = $(element).find('.card__title').attr('href');
      recipes.push({ title, link });
    });

    const detailedRecipes = [];

    for (let recipe of recipes) {
      const recipeResponse = await axios.get(`https://www.tudogostoso.com.br${recipe.link}`);
      const $$ = cheerio.load(recipeResponse.data);

      const ingredientsList = $$('.recipe-ingredients__item').map((i, el) => $$(el).text().trim()).get();
      const stepsList = $$('.recipe-method__item').map((i, el) => $$(el).text().trim()).get();

      detailedRecipes.push({
        title: recipe.title,
        ingredients: ingredientsList,
        steps: stepsList
      });
    }

    res.json(detailedRecipes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar receitas' });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
