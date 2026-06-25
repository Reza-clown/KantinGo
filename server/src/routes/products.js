const express = require('express');
const { body } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const {
  getAll, getById, create, update, updateStock, remove,
} = require('../controllers/productController');
const { authenticate, ownerOnly, kasirOrOwner } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');

const router = express.Router();

router.use(authenticate);

// ensure upload dir exists
const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'products');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `prod-${unique}${ext}`);
  },
});

const allowedMimes = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!allowedMimes.has(file.mimetype)) {
      return cb(new Error('Format gambar harus jpg/jpeg/png/webp'));
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// GET /api/products  — semua role
router.get('/', kasirOrOwner, getAll);

// GET /api/products/:id  — semua role
router.get('/:id', kasirOrOwner, getById);

// POST /api/products  — owner only
router.post(
  '/',
  ownerOnly,
  upload.single('image_file'),
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
  upload.single('image_file'),
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

