require('dotenv').config();
const mysql = require('mysql2/promise');
(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    await conn.execute("ALTER TABLE orders MODIFY COLUMN payment_method ENUM('tunai','qris','transfer','lainnya','hutang') NOT NULL DEFAULT 'qris'");
    console.log('ALTER_OK');
    await conn.end();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
