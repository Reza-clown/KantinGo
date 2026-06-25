const express = require('express');
const { body } = require('express-validator');
const { getAll, getById, create, updateStatus, remove } = require('../controllers/orderController');
const { authenticate, kasirOrOwner } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');

const router = express.Router();

router.use(authenticate, kasirOrOwner);

// GET /api/orders
router.get('/', getAll);

// GET /api/orders/:id
router.get('/:id', getById);

// POST /api/orders
router.post(
  '/',
  [
    body('items').isArray({ min: 1 }).withMessage('Items tidak boleh kosong'),
    body('items.*.product_id').isInt({ min: 1 }).withMessage('product_id harus angka valid'),
    body('items.*.qty').isInt({ min: 1 }).withMessage('qty harus minimal 1'),
    body('payment_method')
      .optional()
      .isIn(['tunai', 'qris', 'transfer', 'lainnya', 'hutang'])
      .withMessage('payment_method tidak valid'),
    body('discount_amount').optional().isInt({ min: 0 }).withMessage('Diskon tidak boleh negatif'),
  ],
  handleValidation,
  create
);

// PATCH /api/orders/:id/status
router.patch(
  '/:id/status',
  [
    body('order_status')
      .optional()
      .isIn(['paid', 'unpaid', 'cancelled'])
      .withMessage('Status tidak valid'),
    body('payment_method')
      .optional()
      .isIn(['tunai', 'qris', 'transfer', 'lainnya', 'hutang'])
      .withMessage('Metode bayar tidak valid'),
  ],
  handleValidation,
  updateStatus
);

// DELETE /api/orders/:id
router.delete('/:id', remove);

module.exports = router;
