const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// GET /api/reports/summary - Executive overview aggregating system metrics
router.get('/summary', authenticateToken, authorizeRoles('Admin', 'Manager'), (req, res) => {
    const summaryReport = {
        overview: {
            totalEmployees: 15,
            lowStockAlerts: 2,
            totalRevenue: 24500.00,
            unpaidInvoices: 3
        },
        generatedAt: new Date().toISOString(),
        generatedBy: req.user.id
    };

    res.status(200).json(summaryReport);
});

module.exports = router;