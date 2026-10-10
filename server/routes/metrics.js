const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const {
	getSalesMetrics,
	getInventoryMetrics,
	getHrMetrics,
	getFinanceMetrics
} = require('../services/metricsService');

const router = express.Router();

function handleMetrics(getMetrics) {
	return async (req, res) => {
		try {
			res.status(200).json(await getMetrics(req.query.range || '30d'));
		} catch (error) {
			// Bad range input is the caller's fault; anything else is ours and stays opaque.
			if (/^range must be/.test(error.message)) return res.status(400).json({ error: error.message });
			console.error('[metrics]', error.message);
			res.status(500).json({ error: 'Unable to compute metrics.' });
		}
	};
}

// Any signed-in role sees sales and inventory; HR and finance are restricted to
// Admin/Manager, matching the dashboard's role views (enforced here, not in the UI).
const anyRole = [authenticateToken];
const leadership = [authenticateToken, authorizeRoles('Admin', 'Manager')];

// GET /api/metrics/sales
router.get('/sales', ...anyRole, handleMetrics(getSalesMetrics));

// GET /api/metrics/inventory
router.get('/inventory', ...anyRole, handleMetrics(getInventoryMetrics));

// GET /api/metrics/hr
router.get('/hr', ...leadership, handleMetrics(getHrMetrics));

// GET /api/metrics/finance
router.get('/finance', ...leadership, handleMetrics(getFinanceMetrics));

// GET /api/metrics - Production system status and runtime stats
// Admin-only per docs/ACCESS_MATRIX.md: it exposes process memory and runtime version.
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