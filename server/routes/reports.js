const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { store } = require('../db/repositories');
const {
    getSalesMetrics,
    getInventoryMetrics,
    getHrMetrics,
    getFinanceMetrics
} = require('../services/metricsService');

// Latest deployment and recent failures. Deployment history only exists in
// Postgres, so the in-memory store reports none rather than inventing any.
async function getDeploymentSummary() {
    if (store !== 'postgres') return { latest: null, failedLast7d: 0 };
    const db = require('../db/pool');
    const latest = await db.query(
        `SELECT version, status, environment, commit_sha, started_at
           FROM deployments ORDER BY started_at DESC LIMIT 1`
    );
    const failed = await db.query(
        `SELECT COUNT(*)::int AS n FROM deployments
          WHERE status = 'failed' AND started_at >= NOW() - INTERVAL '7 days'`
    );
    return { latest: latest.rows[0] || null, failedLast7d: failed.rows[0].n };
}

// GET /api/reports/summary - Executive overview, computed from the same data
// the domain metrics use (previously a hardcoded placeholder).
router.get('/summary', authenticateToken, authorizeRoles('Admin', 'Manager'), async (req, res) => {
    try {
        const range = '30d';
        const [sales, inventory, hr, finance, deployments] = await Promise.all([
            getSalesMetrics(range),
            getInventoryMetrics(range),
            getHrMetrics(range),
            getFinanceMetrics(range),
            getDeploymentSummary()
        ]);

        const lowStockItems = inventory.data
            .filter((item) => item.quantity <= item.minStockLevel)
            .sort((a, b) => (a.quantity - a.minStockLevel) - (b.quantity - b.minStockLevel))
            .slice(0, 5)
            .map(({ sku, name, quantity, minStockLevel }) => ({ sku, name, quantity, minStockLevel }));

        res.status(200).json({
            generatedAt: new Date().toISOString(),
            range,
            sales: {
                revenue: sales.summary.totalRevenue,
                orders: sales.summary.orderCount,
                pendingOrders: sales.summary.pendingOrders,
                previousPeriodRevenue: sales.summary.previousPeriodRevenue
            },
            inventory: {
                itemCount: inventory.summary.itemCount,
                lowStockCount: inventory.summary.lowStockCount,
                stockValue: inventory.summary.stockValue,
                lowStockItems
            },
            hr: {
                headcount: hr.summary.totalEmployees,
                active: hr.summary.activeCount,
                onLeave: hr.summary.onLeaveCount,
                newHires: hr.summary.newHires
            },
            finance: {
                revenue: finance.summary.totalRevenue,
                expenses: finance.summary.totalExpenses,
                netProfit: finance.summary.netProfit,
                pendingCount: finance.summary.pendingCount
            },
            deployments
        });
    } catch (err) {
        console.error('[reports] summary failed:', err.message);
        res.status(500).json({ error: 'Unable to build summary report.' });
    }
});

module.exports = router;
