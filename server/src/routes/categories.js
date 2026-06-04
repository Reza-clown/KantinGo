const express = require('express');
const { body } = require('express-validator');
const Category = require('../models/Category');
const { authenticate, ownerOnly, kasirOrOwner } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');

const router = express.Router();

router.use(authenticate);

// GET /api/categories
router.get('/', kasirOrOwner, async (req, res, next) => {
  try {
    const categories = await Category.findAll({
      where: { is_active: 1 },
      attributes: ['id', 'name', 'slug'],
      order: [['name', 'ASC']],
    });
    return res.json({ status: 200, data: categories });
  } catch (err) {
    next(err);
  }
});

// POST /api/categories  — owner only
router.post(
  '/',
  ownerOnly,
  [
    body('name').notEmpty().withMessage('Nama kategori wajib diisi'),
    body('slug').notEmpty().withMessage('Slug wajib diisi'),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const { name, slug } = req.body;
      const exists = await Category.findOne({ where: { slug } });
      if (exists) return res.status(400).json({ status: 400, message: 'Slug sudah digunakan' });

      const cat = await Category.create({ name, slug });
      return res.status(201).json({ status: 201, message: 'Kategori berhasil dibuat', data: { id: cat.id } });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/categories/:id  — owner only
router.put('/:id', ownerOnly, async (req, res, next) => {
  try {
    const cat = await Category.findByPk(req.params.id);
    if (!cat) return res.status(404).json({ status: 404, message: 'Kategori tidak ditemukan' });

    const { name, slug, is_active } = req.body;
    if (name !== undefined) cat.name = name;
    if (slug !== undefined) cat.slug = slug;
    if (is_active !== undefined) cat.is_active = is_active;

    await cat.save();
    return res.json({ status: 200, message: 'Kategori berhasil diupdate' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/categories/:id  — owner only
router.delete('/:id', ownerOnly, async (req, res, next) => {
  try {
    const cat = await Category.findByPk(req.params.id);
    if (!cat) return res.status(404).json({ status: 404, message: 'Kategori tidak ditemukan' });

    cat.is_active = 0;
    await cat.save();
    return res.json({ status: 200, message: 'Kategori berhasil dihapus' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
