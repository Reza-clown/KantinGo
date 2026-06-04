const mysql = require('mysql2/promise');
require('dotenv').config();

if (!process.env.DB_USER || !process.env.DB_HOST || !process.env.DB_NAME) {
  console.error('[kantingo-server] Missing DB env. Pastikan sudah ada server/.env');
  // tetap buat pool agar error terlihat jelas dari MySQL
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = { pool };

