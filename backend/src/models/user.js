const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbFile = path.join(__dirname, '..', '..', 'users.db');
const db = new sqlite3.Database(dbFile);
const bcrypt = require('bcrypt');

// Initialize the database table here! This is where data-layer logic belongs.
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT UNIQUE,
    password TEXT
  )
`);

function createUser(username, password) {
  return new Promise(async (resolve, reject) => {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const query = `INSERT INTO users (username, password) VALUES (?, ?)`;
      db.run(query, [username, hashedPassword], function(err) {
        if (err) {
          return reject(err);
        }
        resolve({ id: this.lastID, username });
      });
    } catch (err) {
      reject(err);
    }
  });
}

function getUserByUsername(username) {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM users WHERE username = ?`;
    db.get(query, [username], function(err, row) {
      if (err) {
        return reject(err);
      }
      resolve(row);
    });
  });
}

module.exports = {
  createUser,
  getUserByUsername
};