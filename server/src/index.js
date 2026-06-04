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

// ── middleware ─────────────────────────────────────────────────────────────
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

    // alter:true → update kolom jika ada perubahan, tanpa drop tabel
    await sequelize.sync({ alter: true });
    console.log('[kantingo-server] Sinkronisasi tabel selesai');

    app.listen(port, () => {
      console.log(`[kantingo-server] Server berjalan di port :${port}`);
    });
  } catch (err) {
    console.error('[kantingo-server] Gagal koneksi database:', err.message);
    process.exit(1);
  }
})();
