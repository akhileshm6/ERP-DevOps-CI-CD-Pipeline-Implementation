const express = require('express');
const {
	getSalesMetrics,
	getInventoryMetrics,
	getHrMetrics,
	getFinanceMetrics
} = require('../services/metricsService');

const router = express.Router();

function handleMetrics(getMetrics) {
	return (req, res) => {
		try {
			res.status(200).json(getMetrics(req.query.range || '30d'));
		} catch (error) {
			res.status(400).json({ error: error.message });
		}
	};
}

// GET /api/metrics/sales
router.get('/sales', handleMetrics(getSalesMetrics));

// GET /api/metrics/inventory
router.get('/inventory', handleMetrics(getInventoryMetrics));

// GET /api/metrics/hr
router.get('/hr', handleMetrics(getHrMetrics));

// GET /api/metrics/finance
router.get('/finance', handleMetrics(getFinanceMetrics));

// GET /api/metrics - Production system status and runtime stats
router.get('/', (req, res) => {
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