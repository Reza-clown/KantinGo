const { Op } = require('sequelize');
const sequelize = require('../config/sequelize');
const Product = require('../models/Product');
const Category = require('../models/Category');
const InventoryMovement = require('../models/InventoryMovement');

/** GET /api/products */
const getAll = async (req, res, next) => {
  try {
    const { category_id, q, status, limit = 50, page = 1 } = req.query;
    const where = { is_active: 1 };

    if (category_id) where.category_id = category_id;
    if (status) where.status = status;
    if (q) where.name = { [Op.like]: `%${q}%` };

    const limitNum = Math.min(Number(limit), 200);
    const offset = (Number(page) - 1) * limitNum;

    const { count, rows } = await Product.findAndCountAll({
      where,
      include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'slug'] }],
      order: [['name', 'ASC']],
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

/** GET /api/products/:id */
const getById = async (req, res, next) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'slug'] }],
    });
    if (!product || !product.is_active) {
      return res.status(404).json({ status: 404, message: 'Produk tidak ditemukan' });
    }
    return res.json({ status: 200, data: product });
  } catch (err) {
    next(err);
  }
};

/** POST /api/products  — owner only */
const create = async (req, res, next) => {
  try {
    const { category_id, name, price, image_url, stock, status } = req.body;
    // if upload used, prefer req.file
    const imageFromUpload = req.file ? `/uploads/products/${req.file.filename}` : null;
    const finalImageUrl = imageFromUpload || image_url || null;


    if (Number(price) < 0) {
      return res.status(400).json({ status: 400, message: 'Harga tidak boleh negatif' });
    }
    if (Number(stock) < 0) {
      return res.status(400).json({ status: 400, message: 'Stok tidak boleh negatif' });
    }

    const product = await Product.create({
      category_id: category_id || null,
      name,
      price: Number(price),
      image_url: finalImageUrl,
      stock: Number(stock || 0),
      status: status || (Number(stock || 0) > 0 ? 'tersedia' : 'habis'),
    });


    // Log inventory jika ada stok awal
    if (Number(stock) > 0) {
      await InventoryMovement.create({
        product_id: product.id,
        movement_type: 'in',
        qty: Number(stock),
        source: 'manual',
        note: 'Stok awal produk baru',
        created_by_user_id: req.user.id,
        stock_before: 0,
        stock_after: Number(stock),
      });
    }

    return res.status(201).json({ status: 201, message: 'Produk berhasil ditambahkan', data: { id: product.id } });
  } catch (err) {
    next(err);
  }
};

/** PUT /api/products/:id  — owner only */
const update = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const product = await Product.findByPk(req.params.id, { transaction: t, lock: true });
    if (!product || !product.is_active) {
      await t.rollback();
      return res.status(404).json({ status: 404, message: 'Produk tidak ditemukan' });
    }

    const { category_id, name, price, image_url, status } = req.body;
    const imageFromUpload = req.file ? `/uploads/products/${req.file.filename}` : null;
    const finalImageUrl = imageFromUpload || image_url || undefined;


    if (price !== undefined && Number(price) < 0) {
      await t.rollback();
      return res.status(400).json({ status: 400, message: 'Harga tidak boleh negatif' });
    }

    if (category_id !== undefined) product.category_id = category_id;
    if (name !== undefined) product.name = name;
    if (price !== undefined) product.price = Number(price);
    if (finalImageUrl !== undefined) product.image_url = finalImageUrl;

    if (status !== undefined) product.status = status;

    await product.save({ transaction: t });
    await t.commit();

    return res.json({ status: 200, message: 'Produk berhasil diupdate' });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

/** PATCH /api/products/:id/stock  — owner & kasir */
const updateStock = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const product = await Product.findByPk(req.params.id, { transaction: t, lock: true });
    if (!product || !product.is_active) {
      await t.rollback();
      return res.status(404).json({ status: 404, message: 'Produk tidak ditemukan' });
    }

    const { qty, movement_type, note } = req.body;
    const qtyNum = Number(qty);

    if (!Number.isInteger(qtyNum) || qtyNum <= 0) {
      await t.rollback();
      return res.status(400).json({ status: 400, message: 'qty harus bilangan bulat positif' });
    }

    const stockBefore = Number(product.stock);
    let stockAfter;

    if (movement_type === 'in') {
      stockAfter = stockBefore + qtyNum;
    } else if (movement_type === 'out') {
      if (stockBefore < qtyNum) {
        await t.rollback();
        return res.status(400).json({ status: 400, message: 'Stok tidak mencukupi' });
      }
      stockAfter = stockBefore - qtyNum;
    } else {
      await t.rollback();
      return res.status(400).json({ status: 400, message: 'movement_type harus "in" atau "out"' });
    }

    product.stock = stockAfter;
    product.status = stockAfter > 0 ? 'tersedia' : 'habis';
    await product.save({ transaction: t });

    await InventoryMovement.create(
      {
        product_id: product.id,
        movement_type,
        qty: qtyNum,
        source: 'manual',
        note: note || null,
        created_by_user_id: req.user.id,
        stock_before: stockBefore,
        stock_after: stockAfter,
      },
      { transaction: t }
    );

    await t.commit();
    return res.json({
      status: 200,
      message: 'Stok berhasil diupdate',
      data: { stock_before: stockBefore, stock_after: stockAfter },
    });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

/** DELETE /api/products/:id  — owner only (soft delete) */
const remove = async (req, res, next) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product || !product.is_active) {
      return res.status(404).json({ status: 404, message: 'Produk tidak ditemukan' });
    }

    product.is_active = 0;
    await product.save();

    return res.json({ status: 200, message: 'Produk berhasil dihapus' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getById, create, update, updateStock, remove };
