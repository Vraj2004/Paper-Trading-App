const { Pool } = require('pg');
require('dotenv').config();

// Create a connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});
console.log("DB_HOST", process.env.DB_HOST, process.env.DB_PORT, process.env.DB_USER, process.env.DB_NAME);

pool.on('connect', () => {
  console.log('Connected to the database');
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};