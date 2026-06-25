require('dotenv').config();

const express = require('express');
const cors = require('cors');
const sequelize = require('./config/sequelize');

// ── import semua model agar Sequelize mendeteksi asosiasi ──────────────────
require('./models/User');
require('./models/Category');
require('./models/Product');
require('./models/Order');
require('./models/OrderItem');
require('./models/InventoryMovement');
require('./models/Setting');

// ── routes ─────────────────────────────────────────────────────────────────
const authRouter       = require('./routes/auth');
const usersRouter      = require('./routes/users');
const categoriesRouter = require('./routes/categories');
const productsRouter   = require('./routes/products');
const ordersRouter     = require('./routes/orders');
const dashboardRouter  = require('./routes/dashboard');
const reportsRouter    = require('./routes/reports');
const settingsRouter   = require('./routes/settings');
const uploadRouter     = require('./routes/upload');

// ── middleware ─────────────────────────────────────────────────────────────
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// serve uploaded images
const path = require('path');

const uploadPath = path.join(__dirname, '..', 'uploads');

console.log('UPLOAD PATH =', uploadPath);

app.use('/uploads', express.static(uploadPath));

// ── health check ───────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'kantingo-server', timestamp: new Date() });
});

// ── api routes ─────────────────────────────────────────────────────────────
app.use('/api/auth',       authRouter);
app.use('/api/users',      usersRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/products',   productsRouter);
app.use('/api/orders',     ordersRouter);
app.use('/api/dashboard',  dashboardRouter);
app.use('/api/reports',    reportsRouter);
app.use('/api/settings',   settingsRouter);
app.use('/api/upload',     uploadRouter);

// ── 404 handler ────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ status: 404, message: `Route ${req.method} ${req.path} tidak ditemukan` });
});

// ── global error handler ───────────────────────────────────────────────────
app.use(errorHandler);

// ── start server ───────────────────────────────────────────────────────────
const port = Number(process.env.PORT || 3001);

(async () => {
  try {
    await sequelize.authenticate();
    console.log('[kantingo-server] Koneksi database berhasil');

    // NOTE: sync({ alter: true }) bisa gagal kalau skema di DB sudah ada dan Sequelize mencoba ALTER yang tidak kompatibel.
    // Untuk debugging dan memastikan server tetap jalan, sync dimatikan sementara.
    // Setelah skema benar, baru aktifkan lagi.
    // await sequelize.sync({ alter: true });
    // console.log('[kantingo-server] Sinkronisasi tabel selesai');
    console.log('[kantingo-server] Skip sequelize.sync({ alter: true })');

    app.listen(port, () => {
      console.log(`[kantingo-server] Server berjalan di port :${port}`);
      console.log(`[kantingo-server] Base URL: http://localhost:${port}`);
      console.log(`[kantingo-server] Health URL: http://localhost:${port}/health`);
      console.log(`[kantingo-server] Upload URL: http://localhost:${port}/uploads`);
    });
  } catch (err) {
    console.error('[kantingo-server] Gagal koneksi database / sync gagal:', err);
    console.error('[kantingo-server] Error message:', err?.message);
    process.exit(1);
  }
})();
