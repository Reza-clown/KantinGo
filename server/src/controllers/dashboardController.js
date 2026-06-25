const { Op, fn, col, literal } = require('sequelize');
const sequelize = require('../config/sequelize');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Product = require('../models/Product');
const Setting = require('../models/Setting');

/** Ambil range bulan ini atau bulan dari query */
const getMonthRange = (queryMonth, queryYear) => {
  const now = new Date();
  const year = Number(queryYear || now.getFullYear());
  const month = Number(queryMonth || now.getMonth() + 1);
  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 0, 23, 59, 59, 999);
  return { from, to };
};

/**
 * GET /api/dashboard/owner
 * Query: ?month=6&year=2025
 */
const ownerDashboard = async (req, res, next) => {
  try {
    const { from, to } = getMonthRange(req.query.month, req.query.year);

    // Omzet & jumlah transaksi bulan ini
    const [omzetRow] = await sequelize.query(
      `SELECT
        COALESCE(SUM(total), 0) AS omzet,
        COUNT(*) AS jumlah_transaksi
       FROM orders
       WHERE order_status = 'paid'
         AND created_at BETWEEN ? AND ?`,
      { replacements: [from, to], type: sequelize.QueryTypes.SELECT }
    );

    // Produk paling laris (top 5)
    const topProducts = await sequelize.query(
      `SELECT
        oi.product_id,
        oi.product_name_snapshot AS nama,
        SUM(oi.qty) AS total_terjual,
        SUM(oi.line_total) AS total_pendapatan
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.order_status = 'paid'
         AND o.created_at BETWEEN ? AND ?
       GROUP BY oi.product_id, oi.product_name_snapshot
       ORDER BY total_terjual DESC
       LIMIT 5`,
      { replacements: [from, to], type: sequelize.QueryTypes.SELECT }
    );

    // Produk kurang laris (bottom 5 yang punya penjualan)
    const bottomProducts = await sequelize.query(
      `SELECT
        oi.product_id,
        oi.product_name_snapshot AS nama,
        SUM(oi.qty) AS total_terjual,
        SUM(oi.line_total) AS total_pendapatan
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.order_status = 'paid'
         AND o.created_at BETWEEN ? AND ?
       GROUP BY oi.product_id, oi.product_name_snapshot
       ORDER BY total_terjual ASC
       LIMIT 5`,
      { replacements: [from, to], type: sequelize.QueryTypes.SELECT }
    );

    // Omzet per hari dalam bulan
    const dailyOmzet = await sequelize.query(
      `SELECT
        DATE(created_at) AS tanggal,
        SUM(total) AS omzet,
        COUNT(*) AS transaksi
       FROM orders
       WHERE order_status = 'paid'
         AND created_at BETWEEN ? AND ?
       GROUP BY DATE(created_at)
       ORDER BY tanggal ASC`,
      { replacements: [from, to], type: sequelize.QueryTypes.SELECT }
    );

    return res.json({
      status: 200,
      data: {
        periode: { dari: from, hingga: to },
        omzet: Number(omzetRow.omzet),
        jumlah_transaksi: Number(omzetRow.jumlah_transaksi),
        produk_paling_laris: topProducts,
        produk_kurang_laris: bottomProducts,
        omzet_harian: dailyOmzet,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/dashboard/kasir
 * Data harian untuk kasir
 */
const kasirDashboard = async (req, res, next) => {
  try {
    const today = new Date();
    const from = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const to = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    // NOTE: query ini menggunakan built-in Date (local time). Jika DB menyimpan created_at dalam UTC,
    // maka filter 'hari ini' bisa bergeser. Pastikan timezone DB sesuai.


    // Omzet hari ini
    // Catatan: filter transaksi hari ini sebaiknya konsisten dengan status lunas.
    // Jika sistem menyimpan order sebagai 'paid' saat lunas, maka query omzet otomatis benar.
    // Namun beberapa flow bisa mengubah 'order_status' setelah pembayaran.
    const [omzetRow] = await sequelize.query(
      `SELECT
        COALESCE(SUM(total), 0) AS omzet,
        COUNT(*) AS jumlah_transaksi
       FROM orders
       WHERE order_status = 'paid'
         AND created_at BETWEEN ? AND ?`,
      { replacements: [from, to], type: sequelize.QueryTypes.SELECT }
    );


    // Transaksi kasir ini hari ini (hitung yang sudah lunas saja agar konsisten dengan card omzet)
    const [kasirRow] = await sequelize.query(
      `SELECT COUNT(*) AS transaksi_saya
       FROM orders
       WHERE created_by_user_id = ?
         AND order_status = 'paid'
         AND created_at BETWEEN ? AND ?`,
      { replacements: [req.user.id, from, to], type: sequelize.QueryTypes.SELECT }
    );


    // Notifikasi stok habis/menipis
    const setting = await Setting.findByPk(1);
    const threshold = setting ? Number(setting.stock_threshold) : 5;

    const lowStockProducts = await Product.findAll({
      where: {
        is_active: 1,
        stock: { [Op.lte]: threshold },
      },
      attributes: ['id', 'name', 'stock', 'status'],
      order: [['stock', 'ASC']],
      limit: 20,
    });

    return res.json({
      status: 200,
      data: {
        tanggal: today.toISOString().slice(0, 10),
        omzet_hari_ini: Number(omzetRow.omzet),
        jumlah_transaksi_hari_ini: Number(omzetRow.jumlah_transaksi),
        transaksi_saya_hari_ini: Number(kasirRow.transaksi_saya),
        notifikasi_stok: {
          threshold,
          produk_menipis: lowStockProducts,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { ownerDashboard, kasirDashboard };
