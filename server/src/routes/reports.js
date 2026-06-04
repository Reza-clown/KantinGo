const express = require('express');
const { getMonthlyReport, exportReport } = require('../controllers/reportController');
const { authenticate, ownerOnly } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, ownerOnly);

// GET /api/reports/monthly?month=6&year=2025
router.get('/monthly', getMonthlyReport);

// GET /api/reports/monthly/export?month=6&year=2025&format=csv|excel
router.get('/monthly/export', exportReport);

module.exports = router;
