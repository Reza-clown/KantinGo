const express = require('express');
const { body } = require('express-validator');
const { login, register, me } = require('../controllers/authController');
const { authenticate, ownerOnly } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');

const router = express.Router();

// POST /api/auth/login
router.post(
  '/login',
  [
    body('username').notEmpty().withMessage('Username wajib diisi'),
    body('password').notEmpty().withMessage('Password wajib diisi'),
  ],
  handleValidation,
  login
);

// POST /api/auth/register  — hanya owner
router.post(
  '/register',
  authenticate,
  ownerOnly,
  [
    body('username').notEmpty().isLength({ min: 3 }).withMessage('Username minimal 3 karakter'),
    body('full_name').notEmpty().withMessage('Nama lengkap wajib diisi'),
    body('password').isLength({ min: 6 }).withMessage('Password minimal 6 karakter'),
    body('role').optional().isIn(['owner', 'kasir']).withMessage('Role harus owner atau kasir'),
  ],
  handleValidation,
  register
);

// GET /api/auth/me
router.get('/me', authenticate, me);

module.exports = router;
