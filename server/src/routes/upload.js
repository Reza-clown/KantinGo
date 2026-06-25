const express = require('express');
const path    = require('path');
const fs      = require('fs');
const multer  = require('multer');
const { authenticate, ownerOnly } = require('../middleware/auth');

const router = express.Router();

// ── Pastikan folder uploads ada ───────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'products');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ── Konfigurasi multer ────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = `product-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, name);
  },
});

const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_MB  = 2;

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Format file tidak didukung. Gunakan JPG, PNG, WEBP, atau GIF.'));
    }
  },
});

// ── POST /api/upload/product-image ────────────────────────────────────────
// Field name: "image"
// Response:   { status: 201, url: "/uploads/products/product-xxx.jpg" }
router.post(
  '/product-image',
  authenticate,
  ownerOnly,
  (req, res, next) => {
    upload.single('image')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ status: 400, message: `Ukuran file maksimal ${MAX_SIZE_MB}MB` });
        }
        return res.status(400).json({ status: 400, message: err.message });
      }
      if (err) {
        return res.status(400).json({ status: 400, message: err.message });
      }
      next();
    });
  },
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ status: 400, message: 'Tidak ada file yang diupload' });
    }
    const url = `/uploads/products/${req.file.filename}`;
    return res.status(201).json({ status: 201, message: 'Gambar berhasil diupload', url });
  }
);

// ── DELETE /api/upload/product-image ─────────────────────────────────────
// Body: { filename: "product-xxx.jpg" }
router.delete('/product-image', authenticate, ownerOnly, (req, res) => {
  const { filename } = req.body;
  if (!filename || filename.includes('..') || filename.includes('/')) {
    return res.status(400).json({ status: 400, message: 'Nama file tidak valid' });
  }

  const filePath = path.join(UPLOAD_DIR, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return res.json({ status: 200, message: 'File berhasil dihapus' });
  }
  return res.status(404).json({ status: 404, message: 'File tidak ditemukan' });
});

module.exports = router;
