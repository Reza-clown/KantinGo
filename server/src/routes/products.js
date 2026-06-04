const express = require('express');
const { body } = require('express-validator');
const {
  getAll, getById, create, update, updateStock, remove,
} = require('../controllers/productController');
const { authenticate, ownerOnly, kasirOrOwner } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');

const router = express.Router();

router.use(authenticate);

// GET /api/products  — semua role
router.get('/', kasirOrOwner, getAll);

// GET /api/products/:id  — semua role
router.get('/:id', kasirOrOwner, getById);

// POST /api/products  — owner only
router.post(
  '/',
  ownerOnly,
  [
    body('name').notEmpty().withMessage('Nama produk wajib diisi'),
    body('price').isInt({ min: 0 }).withMessage('Harga harus angka dan tidak boleh negatif'),
    body('stock').optional().isInt({ min: 0 }).withMessage('Stok tidak boleh negatif'),
  ],
  handleValidation,
  create
);

// PUT /api/products/:id  — owner only
router.put(
  '/:id',
  ownerOnly,
  [
    body('price').optional().isInt({ min: 0 }).withMessage('Harga harus angka dan tidak boleh negatif'),
    body('stock').optional().isInt({ min: 0 }).withMessage('Stok tidak boleh negatif'),
  ],
  handleValidation,
  update
);

// PATCH /api/products/:id/stock  — owner & kasir
router.patch(
  '/:id/stock',
  kasirOrOwner,
  [
    body('qty').isInt({ min: 1 }).withMessage('qty harus bilangan bulat positif'),
    body('movement_type').isIn(['in', 'out']).withMessage('movement_type harus "in" atau "out"'),
  ],
  handleValidation,
  updateStock
);

// DELETE /api/products/:id  — owner only
router.delete('/:id', ownerOnly, remove);

module.exports = router;
