const express = require('express');
const { ownerDashboard, kasirDashboard } = require('../controllers/dashboardController');
const { authenticate, ownerOnly, kasirOrOwner } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// GET /api/dashboard/owner  — owner only
router.get('/owner', ownerOnly, ownerDashboard);

// GET /api/dashboard/kasir  — kasir & owner
router.get('/kasir', kasirOrOwner, kasirDashboard);

module.exports = router;
