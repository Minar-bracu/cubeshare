const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Create a connection pool to PostgreSQL
// On your local machine, this will fail until you provide a DATABASE_URL
// On Render/GitHub, you will set this in the Environment Variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for most managed Postgres services like Neon/Render
  }
});

// Initialize the database table
const initDb = async () => {
  if (!process.env.DATABASE_URL) {
    console.warn("⚠️ DATABASE_URL not found in .env. Persistence is disabled.");
    return;
  }
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE,
        password TEXT
      )
    `);
    console.log("✅ PostgreSQL Database initialized");
  } catch (err) {
    console.error("❌ Error initializing PostgreSQL:", err.message);
  }
};

async function createUser(username, password) {
  if (!process.env.DATABASE_URL) throw new Error("Database not configured");
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username`;
    const result = await pool.query(query, [username, hashedPassword]);
    return result.rows[0];
  } catch (err) {
    throw err;
  }
}

async function getUserByUsername(username) {
  if (!process.env.DATABASE_URL) return null;
  try {
    const query = `SELECT * FROM users WHERE username = $1`;
    const result = await pool.query(query, [username]);
    return result.rows[0];
  } catch (err) {
    throw err;
  }
}

module.exports = {
  initDb,
  createUser,
  getUserByUsername
};