const express = require('express');
const { body } = require('express-validator');
const { getAll, getById, create, update, remove } = require('../controllers/userController');
const { authenticate, ownerOnly } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');

const router = express.Router();

// Semua route users hanya untuk owner
router.use(authenticate, ownerOnly);

// GET /api/users
router.get('/', getAll);

// GET /api/users/:id
router.get('/:id', getById);

// POST /api/users
router.post(
  '/',
  [
    body('username').notEmpty().isLength({ min: 3 }).withMessage('Username minimal 3 karakter'),
    body('full_name').notEmpty().withMessage('Nama lengkap wajib diisi'),
    body('password').isLength({ min: 6 }).withMessage('Password minimal 6 karakter'),
    body('role').optional().isIn(['owner', 'kasir']).withMessage('Role harus owner atau kasir'),
  ],
  handleValidation,
  create
);

// PUT /api/users/:id
router.put(
  '/:id',
  [
    body('full_name').optional().notEmpty().withMessage('Nama lengkap tidak boleh kosong'),
    body('role').optional().isIn(['owner', 'kasir']).withMessage('Role harus owner atau kasir'),
    body('password').optional().isLength({ min: 6 }).withMessage('Password minimal 6 karakter'),
  ],
  handleValidation,
  update
);

// DELETE /api/users/:id
router.delete('/:id', remove);

module.exports = router;
