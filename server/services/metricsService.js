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

function inRange(date, rangeStart) {
	return new Date(date) >= rangeStart;
}

async function getSalesMetrics(range = '30d') {
	const rangeStart = getRangeStart(range);
	const rows = (await metricsSource.sales()).filter((sale) => inRange(sale.createdAt, rangeStart));
	const totalRevenue = rows.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);
	const completedOrders = rows.filter((sale) => sale.status === 'Completed').length;
	const pendingOrders = rows.filter((sale) => sale.status === 'Pending').length;

	return {
		range,
		data: rows,
		summary: {
			orderCount: rows.length,
			totalRevenue: Number(totalRevenue.toFixed(2)),
			averageOrderValue: rows.length ? Number((totalRevenue / rows.length).toFixed(2)) : 0,
			completedOrders,
			pendingOrders
		}
	};
}

async function getInventoryMetrics(range = '30d') {
	const rangeStart = getRangeStart(range);
	const rows = (await metricsSource.inventory()).filter((item) => inRange(item.createdAt, rangeStart));
	const lowStockItems = rows.filter((item) => item.quantity <= item.minStockLevel);
	const stockValue = rows.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
	const totalQuantity = rows.reduce((sum, item) => sum + item.quantity, 0);

	return {
		range,
		data: rows,
		summary: {
			itemCount: rows.length,
			lowStockCount: lowStockItems.length,
			stockValue: Number(stockValue.toFixed(2)),
			totalQuantity
		}
	};
}

async function getHrMetrics(range = '30d') {
	const rangeStart = getRangeStart(range);
	const rows = (await metricsSource.hr()).filter((emp) => inRange(emp.createdAt, rangeStart));
	const activeEmployees = rows.filter((emp) => emp.status === 'Active');
	const totalSalary = rows.reduce((sum, emp) => sum + (emp.salary || 0), 0);
	const totalRating = rows.reduce((sum, emp) => sum + (emp.performanceRating || 0), 0);
	const departments = new Set(rows.map((emp) => emp.department));

	return {
		range,
		data: rows,
		summary: {
			totalEmployees: rows.length,
			activeCount: activeEmployees.length,
			averageSalary: rows.length ? Number((totalSalary / rows.length).toFixed(2)) : 0,
			avgPerformance: rows.length ? Number((totalRating / rows.length).toFixed(2)) : 0,
			departmentCount: departments.size
		}
	};
}

async function getFinanceMetrics(range = '30d') {
	const rangeStart = getRangeStart(range);
	const rows = (await metricsSource.finance()).filter((tx) => inRange(tx.createdAt, rangeStart));
	const revenues = rows.filter((tx) => tx.transactionType === 'Revenue');
	const expenses = rows.filter((tx) => tx.transactionType === 'Expense');

	const totalRevenue = revenues.reduce((sum, tx) => sum + (tx.amount || 0), 0);
	const totalExpenses = expenses.reduce((sum, tx) => sum + (tx.amount || 0), 0);
	const netProfit = Number((totalRevenue - totalExpenses).toFixed(2));
	const profitMargin = totalRevenue > 0 ? Number(((netProfit / totalRevenue) * 100).toFixed(2)) : 0;

	return {
		range,
		data: rows,
		summary: {
			totalRevenue: Number(totalRevenue.toFixed(2)),
			totalExpenses: Number(totalExpenses.toFixed(2)),
			netProfit,
			profitMargin,
			transactionCount: rows.length
		}
	};
}

module.exports = {
	getSalesMetrics,
	getInventoryMetrics,
	getHrMetrics,
	getFinanceMetrics,
	getRangeStart
};
