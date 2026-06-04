const express = require('express');
const { body } = require('express-validator');
const Setting = require('../models/Setting');
const { authenticate, ownerOnly } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');

const router = express.Router();

router.use(authenticate, ownerOnly);

// GET /api/settings
router.get('/', async (req, res, next) => {
  try {
    const [setting] = await Setting.findOrCreate({
      where: { id: 1 },
      defaults: { stock_threshold: 5, is_stock_notification_enabled: 1 },
    });
    return res.json({ status: 200, data: setting });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/settings
router.patch(
  '/',
  [
    body('stock_threshold').optional().isInt({ min: 0 }).withMessage('Threshold harus angka >= 0'),
    body('is_stock_notification_enabled').optional().isIn([0, 1]).withMessage('Nilai harus 0 atau 1'),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const [setting] = await Setting.findOrCreate({
        where: { id: 1 },
        defaults: { stock_threshold: 5, is_stock_notification_enabled: 1 },
      });

      const { stock_threshold, is_stock_notification_enabled } = req.body;
      if (stock_threshold !== undefined) setting.stock_threshold = stock_threshold;
      if (is_stock_notification_enabled !== undefined) setting.is_stock_notification_enabled = is_stock_notification_enabled;

      await setting.save();
      return res.json({ status: 200, message: 'Pengaturan berhasil disimpan', data: setting });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
