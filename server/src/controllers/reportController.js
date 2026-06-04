const sequelize = require('../config/sequelize');
const ExcelJS = require('exceljs');
const { stringify } = require('csv-stringify/sync');

/** Ambil data laporan transaksi bulanan */
const fetchReportData = async (year, month) => {
  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 0, 23, 59, 59, 999);

  // Summary
  const [summary] = await sequelize.query(
    `SELECT
      COALESCE(SUM(total), 0)           AS total_omzet,
      COALESCE(SUM(discount_amount), 0) AS total_diskon,
      COUNT(*)                          AS jumlah_transaksi,
      COALESCE(SUM(CASE WHEN order_status='paid' THEN 1 ELSE 0 END), 0) AS transaksi_lunas,
      COALESCE(SUM(CASE WHEN order_status='cancelled' THEN 1 ELSE 0 END), 0) AS transaksi_batal
     FROM orders
     WHERE created_at BETWEEN ? AND ?`,
    { replacements: [from, to], type: sequelize.QueryTypes.SELECT }
  );

  // Transaksi detail
  const transactions = await sequelize.query(
    `SELECT
      o.order_code,
      o.created_at,
      o.order_status,
      o.payment_method,
      o.subtotal,
      o.discount_amount,
      o.total,
      u.full_name AS kasir
     FROM orders o
     LEFT JOIN users u ON u.id = o.created_by_user_id
     WHERE o.created_at BETWEEN ? AND ?
     ORDER BY o.created_at ASC`,
    { replacements: [from, to], type: sequelize.QueryTypes.SELECT }
  );

  // Produk terlaris bulan ini
  const topProducts = await sequelize.query(
    `SELECT
      oi.product_name_snapshot AS nama_produk,
      SUM(oi.qty)             AS total_terjual,
      SUM(oi.line_total)      AS total_pendapatan
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE o.order_status = 'paid'
       AND o.created_at BETWEEN ? AND ?
     GROUP BY oi.product_name_snapshot
     ORDER BY total_terjual DESC`,
    { replacements: [from, to], type: sequelize.QueryTypes.SELECT }
  );

  return { summary, transactions, topProducts, from, to };
};

/**
 * GET /api/reports/monthly?month=6&year=2025
 * JSON response
 */
const getMonthlyReport = async (req, res, next) => {
  try {
    const year = Number(req.query.year || new Date().getFullYear());
    const month = Number(req.query.month || new Date().getMonth() + 1);

    const data = await fetchReportData(year, month);

    return res.json({
      status: 200,
      data: {
        periode: { tahun: year, bulan: month, dari: data.from, hingga: data.to },
        ringkasan: data.summary,
        transaksi: data.transactions,
        produk_terlaris: data.topProducts,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/reports/monthly/export?month=6&year=2025&format=csv|excel
 */
const exportReport = async (req, res, next) => {
  try {
    const year = Number(req.query.year || new Date().getFullYear());
    const month = Number(req.query.month || new Date().getMonth() + 1);
    const format = (req.query.format || 'excel').toLowerCase();

    const { summary, transactions, topProducts, from, to } = await fetchReportData(year, month);
    const periodLabel = `${year}-${String(month).padStart(2, '0')}`;

    if (format === 'csv') {
      const rows = [
        ['Laporan KantinGO', `Periode: ${periodLabel}`],
        [],
        ['=== RINGKASAN ==='],
        ['Total Omzet', summary.total_omzet],
        ['Total Diskon', summary.total_diskon],
        ['Jumlah Transaksi', summary.jumlah_transaksi],
        ['Transaksi Lunas', summary.transaksi_lunas],
        ['Transaksi Batal', summary.transaksi_batal],
        [],
        ['=== DETAIL TRANSAKSI ==='],
        ['Kode Order', 'Tanggal', 'Status', 'Metode Bayar', 'Subtotal', 'Diskon', 'Total', 'Kasir'],
        ...transactions.map((t) => [
          t.order_code,
          t.created_at,
          t.order_status,
          t.payment_method,
          t.subtotal,
          t.discount_amount,
          t.total,
          t.kasir,
        ]),
        [],
        ['=== PRODUK TERLARIS ==='],
        ['Nama Produk', 'Total Terjual', 'Total Pendapatan'],
        ...topProducts.map((p) => [p.nama_produk, p.total_terjual, p.total_pendapatan]),
      ];

      const csv = stringify(rows);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="laporan-kantingo-${periodLabel}.csv"`);
      return res.send('\uFEFF' + csv); // BOM untuk Excel
    }

    // Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'KantinGO';
    workbook.created = new Date();

    // Sheet 1: Ringkasan
    const wsSum = workbook.addWorksheet('Ringkasan');
    wsSum.addRow(['Laporan KantinGO', `Periode: ${periodLabel}`]);
    wsSum.addRow([]);
    wsSum.addRows([
      ['Total Omzet', Number(summary.total_omzet)],
      ['Total Diskon', Number(summary.total_diskon)],
      ['Jumlah Transaksi', Number(summary.jumlah_transaksi)],
      ['Transaksi Lunas', Number(summary.transaksi_lunas)],
      ['Transaksi Batal', Number(summary.transaksi_batal)],
    ]);
    wsSum.getColumn(1).width = 25;
    wsSum.getColumn(2).width = 20;

    // Sheet 2: Transaksi
    const wsTx = workbook.addWorksheet('Transaksi');
    wsTx.addRow(['Kode Order', 'Tanggal', 'Status', 'Metode Bayar', 'Subtotal', 'Diskon', 'Total', 'Kasir']);
    wsTx.getRow(1).font = { bold: true };
    transactions.forEach((t) => {
      wsTx.addRow([
        t.order_code,
        new Date(t.created_at).toLocaleString('id-ID'),
        t.order_status,
        t.payment_method,
        Number(t.subtotal),
        Number(t.discount_amount),
        Number(t.total),
        t.kasir,
      ]);
    });
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach((c, i) => {
      wsTx.getColumn(i + 1).width = [16, 20, 12, 14, 14, 12, 14, 20][i];
    });

    // Sheet 3: Produk Terlaris
    const wsProd = workbook.addWorksheet('Produk Terlaris');
    wsProd.addRow(['Nama Produk', 'Total Terjual', 'Total Pendapatan']);
    wsProd.getRow(1).font = { bold: true };
    topProducts.forEach((p) => {
      wsProd.addRow([p.nama_produk, Number(p.total_terjual), Number(p.total_pendapatan)]);
    });
    wsProd.getColumn(1).width = 30;
    wsProd.getColumn(2).width = 15;
    wsProd.getColumn(3).width = 18;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="laporan-kantingo-${periodLabel}.xlsx"`);
    await workbook.xlsx.write(res);
    return res.end();
  } catch (err) {
    next(err);
  }
};

module.exports = { getMonthlyReport, exportReport };
