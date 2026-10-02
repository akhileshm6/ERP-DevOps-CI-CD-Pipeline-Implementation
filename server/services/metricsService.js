// Datasets come from the active store (Postgres, or seed.js in memory mode).
const { metricsSource } = require('../db/repositories');

const RANGE_DAYS = {
	today: 1,
	'7d': 7,
	'30d': 30,
	quarter: 90
};

function getRangeStart(range) {
	if (!Object.prototype.hasOwnProperty.call(RANGE_DAYS, range)) {
		throw new Error('range must be one of: today, 7d, 30d, quarter');
	}

	const start = new Date();
	start.setHours(0, 0, 0, 0);
	start.setDate(start.getDate() - RANGE_DAYS[range] + 1);
	return start;
}

// The window of equal length immediately before the selected range.
function getPreviousRange(range) {
	const end = getRangeStart(range);
	const start = new Date(end);
	start.setDate(start.getDate() - RANGE_DAYS[range]);
	return { start, end };
}

function inRange(date, rangeStart) {
	return new Date(date) >= rangeStart;
}

const round2 = (n) => Number(n.toFixed(2));
const sumBy = (rows, key) => rows.reduce((sum, row) => sum + (row[key] || 0), 0);

// Flow metric: orders and revenue inside the selected period.
async function getSalesMetrics(range = '30d') {
	const rangeStart = getRangeStart(range);
	const all = await metricsSource.sales();
	const rows = all.filter((sale) => inRange(sale.createdAt, rangeStart));
	const totalRevenue = sumBy(rows, 'totalAmount');

	// Compare against the previous period only when it actually has orders;
	// otherwise there is nothing honest to compare with, so report null.
	const prev = getPreviousRange(range);
	const prevRows = all.filter((sale) => {
		const d = new Date(sale.createdAt);
		return d >= prev.start && d < prev.end;
	});
	const previousPeriodRevenue = prevRows.length ? round2(sumBy(prevRows, 'totalAmount')) : null;

	return {
		range,
		data: rows,
		summary: {
			orderCount: rows.length,
			totalRevenue: round2(totalRevenue),
			averageOrderValue: rows.length ? round2(totalRevenue / rows.length) : 0,
			completedOrders: rows.filter((sale) => sale.status === 'Completed').length,
			pendingOrders: rows.filter((sale) => sale.status === 'Pending').length,
			refundedOrders: rows.filter((sale) => sale.status === 'Refunded').length,
			previousPeriodRevenue
		}
	};
}

// Stock metric: a point-in-time snapshot. Stock on hand does not depend on
// when an item was first created, so the range is validated but not applied.
async function getInventoryMetrics(range = '30d') {
	getRangeStart(range);
	const rows = await metricsSource.inventory();
	const lowStockItems = rows.filter((item) => item.quantity <= item.minStockLevel);

	return {
		range,
		asOf: new Date().toISOString(),
		data: rows,
		summary: {
			itemCount: rows.length,
			lowStockCount: lowStockItems.length,
			stockValue: round2(rows.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)),
			totalQuantity: sumBy(rows, 'quantity')
		}
	};
}

// Headcount is a snapshot of the current roster; only new hires depend on the range.
async function getHrMetrics(range = '30d') {
	const rangeStart = getRangeStart(range);
	const rows = await metricsSource.hr();
	const rated = rows.filter((emp) => typeof emp.performanceRating === 'number');

	return {
		range,
		asOf: new Date().toISOString(),
		data: rows,
		summary: {
			totalEmployees: rows.length,
			activeCount: rows.filter((emp) => emp.status === 'Active').length,
			onLeaveCount: rows.filter((emp) => emp.status === 'On Leave').length,
			newHires: rows.filter((emp) => emp.hireDate && inRange(emp.hireDate, rangeStart)).length,
			averageSalary: rows.length ? round2(sumBy(rows, 'salary') / rows.length) : 0,
			avgPerformance: rated.length ? round2(sumBy(rated, 'performanceRating') / rated.length) : 0,
			departmentCount: new Set(rows.map((emp) => emp.department)).size
		}
	};
}

// Flow metric: transactions inside the selected period.
async function getFinanceMetrics(range = '30d') {
	const rangeStart = getRangeStart(range);
	const rows = (await metricsSource.finance()).filter((tx) => inRange(tx.createdAt, rangeStart));
	const totalRevenue = sumBy(rows.filter((tx) => tx.transactionType === 'Revenue'), 'amount');
	const totalExpenses = sumBy(rows.filter((tx) => tx.transactionType === 'Expense'), 'amount');
	const netProfit = round2(totalRevenue - totalExpenses);

	return {
		range,
		data: rows,
		summary: {
			totalRevenue: round2(totalRevenue),
			totalExpenses: round2(totalExpenses),
			netProfit,
			profitMargin: totalRevenue > 0 ? round2((netProfit / totalRevenue) * 100) : 0,
			transactionCount: rows.length,
			pendingCount: rows.filter((tx) => tx.status === 'Pending').length
		}
	};
}

module.exports = {
	getSalesMetrics,
	getInventoryMetrics,
	getHrMetrics,
	getFinanceMetrics,
	getRangeStart,
	RANGE_DAYS
};
