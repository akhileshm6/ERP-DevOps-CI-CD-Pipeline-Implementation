const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// GET /api/metrics - Production system status and runtime stats
router.get('/', authenticateToken, authorizeRoles('Admin'), (req, res) => {
    const systemMetrics = {
        uptime: `${Math.floor(process.uptime())} seconds`,
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
        timestamp: new Date().toISOString(),
        status: 'OPERATIONAL'
    };

    res.status(200).json(systemMetrics);
});

module.exports = router;