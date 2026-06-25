const sequelize = require('../config/sequelize');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Product = require('../models/Product');
const InventoryMovement = require('../models/InventoryMovement');
const User = require('../models/User');

/** Generate kode order unik: ORD-YYYYMMDD-XXXX */
const generateOrderCode = () => {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${date}-${rand}`;
};

/** GET /api/orders */
const getAll = async (req, res, next) => {
  try {
    const { status, from, to, limit = 50, page = 1 } = req.query;
    const where = {};

    if (status) where.order_status = status;
    if (from || to) {
      const { Op } = require('sequelize');
      where.created_at = {};
      if (from) where.created_at[Op.gte] = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        where.created_at[Op.lte] = toDate;
      }
    }

    // Kasir hanya lihat transaksinya sendiri
    if (req.user.role === 'kasir') {
      where.created_by_user_id = req.user.id;
    }

    const limitNum = Math.min(Number(limit), 200);
    const offset = (Number(page) - 1) * limitNum;

    const { count, rows } = await Order.findAndCountAll({
      where,
      include: [
        { model: User, as: 'kasir', attributes: ['id', 'full_name', 'username'] },
        { model: OrderItem, as: 'items' },
      ],
      order: [['created_at', 'DESC']],
      limit: limitNum,
      offset,
    });

    return res.json({
      status: 200,
      data: rows,
      meta: { total: count, page: Number(page), limit: limitNum },
    });
  } catch (err) {
    next(err);
  }
};

/** GET /api/orders/:id */
const getById = async (req, res, next) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        { model: User, as: 'kasir', attributes: ['id', 'full_name'] },
        { model: OrderItem, as: 'items' },
      ],
    });
    if (!order) return res.status(404).json({ status: 404, message: 'Transaksi tidak ditemukan' });

    // Kasir hanya lihat miliknya
    if (req.user.role === 'kasir' && order.created_by_user_id !== req.user.id) {
      return res.status(403).json({ status: 403, message: 'Akses ditolak' });
    }

    return res.json({ status: 200, data: order });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/orders
 * Body: { payment_method, discount_amount, items: [{ product_id, qty }] }
 */
const create = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { payment_method = 'tunai', discount_amount = 0, items } = req.body;
    const orderStatus = payment_method === 'hutang' ? 'unpaid' : 'paid';

    if (!Array.isArray(items) || items.length === 0) {
      await t.rollback();
      return res.status(400).json({ status: 400, message: 'Items transaksi tidak boleh kosong' });
    }

    let subtotal = 0;
    const itemsToInsert = [];

    for (const item of items) {
      const { product_id, qty } = item;
      if (!product_id || !qty || Number(qty) < 1) {
        await t.rollback();
        return res.status(400).json({ status: 400, message: `Item tidak valid: product_id=${product_id}` });
      }

      const product = await Product.findByPk(product_id, { transaction: t, lock: true });
      if (!product || !product.is_active) {
        await t.rollback();
        return res.status(404).json({ status: 404, message: `Produk id=${product_id} tidak ditemukan` });
      }
      if (product.stock < Number(qty)) {
        await t.rollback();
        return res.status(400).json({
          status: 400,
          message: `Stok ${product.name} tidak mencukupi (tersisa ${product.stock})`,
        });
      }

      const lineTotal = product.price * Number(qty);
      subtotal += lineTotal;

      itemsToInsert.push({
        product,
        qty: Number(qty),
        unit_price: product.price,
        line_total: lineTotal,
        product_name_snapshot: product.name,
      });
    }

    const discountNum = Number(discount_amount) || 0;
    const total = Math.max(0, subtotal - discountNum);

    // Buat order
    let orderCode;
    let tries = 0;
    do {
      orderCode = generateOrderCode();
      tries++;
    } while (tries < 5 && (await Order.findOne({ where: { order_code: orderCode }, transaction: t })));

    const order = await Order.create(
      {
        order_code: orderCode,
        created_by_user_id: req.user.id,
        // Jika metode hutang dipilih, order disimpan sebagai unpaid.
        // Untuk pembayaran tunai/online, order tetap langsung paid.
        order_status: orderStatus,
        payment_method,
        subtotal,
        discount_amount: discountNum,
        total,
      },
      { transaction: t }
    );


    // Insert order items & kurangi stok
    for (const { product, qty, unit_price, line_total, product_name_snapshot } of itemsToInsert) {
      await OrderItem.create(
        { order_id: order.id, product_id: product.id, product_name_snapshot, unit_price, qty, line_total },
        { transaction: t }
      );

      const stockBefore = Number(product.stock);
      const stockAfter = stockBefore - qty;
      product.stock = stockAfter;
      product.status = stockAfter > 0 ? 'tersedia' : 'habis';
      await product.save({ transaction: t });

      await InventoryMovement.create(
        {
          product_id: product.id,
          movement_type: 'out',
          qty,
          source: 'order',
          source_ref: orderCode,
          created_by_user_id: req.user.id,
          stock_before: stockBefore,
          stock_after: stockAfter,
        },
        { transaction: t }
      );
    }

    await t.commit();
    return res.status(201).json({
      status: 201,
      message: 'Transaksi berhasil dibuat',
      data: { id: order.id, order_code: orderCode, total },
    });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

/**
 * PATCH /api/orders/:id/status
 * Body: { order_status: 'paid' | 'unpaid' | 'cancelled' }
 *
 * Catatan penting:
 * - Order dibuat awalnya dengan status `unpaid`.
 * - Untuk memastikan omzet/rekap di dashboard masuk, transaksi yang sudah berhasil bayar
 *   harus diubah ke `paid`.
 */
const updateStatus = async (req, res, next) => {

  const t = await sequelize.transaction();
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [{ model: OrderItem, as: 'items' }],
      transaction: t,
      lock: true,
    });
    if (!order) {
      await t.rollback();
      return res.status(404).json({ status: 404, message: 'Transaksi tidak ditemukan' });
    }

    const { order_status, payment_method } = req.body;
    const prevStatus = order.order_status;

    // Jika di-cancel dan sebelumnya belum cancel, kembalikan stok
    if (order_status === 'cancelled' && prevStatus !== 'cancelled') {
      for (const item of order.items) {
        const product = await Product.findByPk(item.product_id, { transaction: t, lock: true });
        if (product) {
          const stockBefore = Number(product.stock);
          const stockAfter = stockBefore + Number(item.qty);
          product.stock = stockAfter;
          product.status = 'tersedia';
          await product.save({ transaction: t });

          await InventoryMovement.create(
            {
              product_id: product.id,
              movement_type: 'in',
              qty: item.qty,
              source: 'order',
              source_ref: order.order_code,
              note: 'Stok dikembalikan karena transaksi dibatalkan',
              created_by_user_id: req.user.id,
              stock_before: stockBefore,
              stock_after: stockAfter,
            },
            { transaction: t }
          );
        }
      }
    }

    // Untuk memastikan rekap omzet dashboard konsisten, set order_status = 'paid'
    // setiap kali order diposting sebagai berhasil bayar.
    // (Frontend biasanya mengirim { order_status: 'paid' } saat pembayaran sukses.)
    if (order_status) order.order_status = order_status;
    if (payment_method) order.payment_method = payment_method;
    await order.save({ transaction: t });


    await t.commit();
    return res.json({ status: 200, message: 'Status transaksi berhasil diupdate' });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

/** DELETE /api/orders/:id — hanya jika status unpaid atau cancelled */
const remove = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [{ model: OrderItem, as: 'items' }],
      transaction: t,
      lock: true,
    });
    if (!order) {
      await t.rollback();
      return res.status(404).json({ status: 404, message: 'Transaksi tidak ditemukan' });
    }

    if (order.order_status === 'paid') {
      await t.rollback();
      return res.status(400).json({ status: 400, message: 'Transaksi yang sudah dibayar tidak bisa dihapus' });
    }

    // Kembalikan stok jika belum di-cancel
    if (order.order_status !== 'cancelled') {
      for (const item of order.items) {
        const product = await Product.findByPk(item.product_id, { transaction: t, lock: true });
        if (product) {
          const stockBefore = Number(product.stock);
          const stockAfter = stockBefore + Number(item.qty);
          product.stock = stockAfter;
          product.status = 'tersedia';
          await product.save({ transaction: t });

          await InventoryMovement.create(
            {
              product_id: product.id,
              movement_type: 'in',
              qty: item.qty,
              source: 'order',
              source_ref: order.order_code,
              note: 'Stok dikembalikan karena transaksi dihapus',
              created_by_user_id: req.user.id,
              stock_before: stockBefore,
              stock_after: stockAfter,
            },
            { transaction: t }
          );
        }
      }
    }

    await order.destroy({ transaction: t });
    await t.commit();
    return res.json({ status: 200, message: 'Transaksi berhasil dihapus' });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

module.exports = { getAll, getById, create, updateStatus, remove };
