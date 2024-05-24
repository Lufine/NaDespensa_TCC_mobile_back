const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./myApp.db');

const initDatabase = () => {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        age INTEGER
      )
    `);
  });
};

module.exports = { db, initDatabase };
