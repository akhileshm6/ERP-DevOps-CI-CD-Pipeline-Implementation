const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const metricsRoutes = require('../routes/metrics');
const { SECRET } = require('../middleware/auth');

const app = express();
app.use(express.json());
app.use('/api/metrics', metricsRoutes);

describe('Metrics API endpoints', () => {
	describe('GET /api/metrics/sales', () => {
		it('returns sales metrics for default range (30d)', async () => {
			const res = await request(app).get('/api/metrics/sales');
			expect(res.statusCode).toBe(200);
			expect(res.body).toHaveProperty('range', '30d');
			expect(res.body).toHaveProperty('data');
			expect(Array.isArray(res.body.data)).toBe(true);
			expect(res.body).toHaveProperty('summary');
			expect(res.body.summary).toHaveProperty('totalRevenue');
			expect(res.body.summary).toHaveProperty('orderCount');
		});

		it('supports range parameter (today, 7d, 30d, quarter)', async () => {
			const res = await request(app).get('/api/metrics/sales?range=7d');
			expect(res.statusCode).toBe(200);
			expect(res.body.range).toBe('7d');
		});

		it('returns 400 for invalid range parameter', async () => {
			const res = await request(app).get('/api/metrics/sales?range=invalid');
			expect(res.statusCode).toBe(400);
			expect(res.body).toHaveProperty('error');
		});
	});

	describe('GET /api/metrics/inventory', () => {
		it('returns inventory metrics', async () => {
			const res = await request(app).get('/api/metrics/inventory');
			expect(res.statusCode).toBe(200);
			expect(res.body).toHaveProperty('summary');
			expect(res.body.summary).toHaveProperty('itemCount');
			expect(res.body.summary).toHaveProperty('lowStockCount');
			expect(res.body.summary).toHaveProperty('stockValue');
		});
	});

	describe('GET /api/metrics/hr', () => {
		it('returns HR metrics with employee summary', async () => {
			const res = await request(app).get('/api/metrics/hr');
			expect(res.statusCode).toBe(200);
			expect(res.body).toHaveProperty('range', '30d');
			expect(res.body).toHaveProperty('data');
			expect(res.body).toHaveProperty('summary');
			expect(res.body.summary).toHaveProperty('totalEmployees');
			expect(res.body.summary).toHaveProperty('activeCount');
			expect(res.body.summary).toHaveProperty('averageSalary');
			expect(res.body.summary).toHaveProperty('avgPerformance');
		});

		it('returns 400 for invalid range parameter', async () => {
			const res = await request(app).get('/api/metrics/hr?range=year');
			expect(res.statusCode).toBe(400);
			expect(res.body.error).toBeDefined();
		});
	});

	describe('GET /api/metrics/finance', () => {
		it('returns Finance metrics with revenue, expenses, and net profit', async () => {
			const res = await request(app).get('/api/metrics/finance');
			expect(res.statusCode).toBe(200);
			expect(res.body).toHaveProperty('range', '30d');
			expect(res.body).toHaveProperty('data');
			expect(res.body).toHaveProperty('summary');
			expect(res.body.summary).toHaveProperty('totalRevenue');
			expect(res.body.summary).toHaveProperty('totalExpenses');
			expect(res.body.summary).toHaveProperty('netProfit');
			expect(res.body.summary).toHaveProperty('profitMargin');
		});

		it('returns 400 for invalid range parameter', async () => {
			const res = await request(app).get('/api/metrics/finance?range=invalid_range');
			expect(res.statusCode).toBe(400);
			expect(res.body.error).toBeDefined();
		});
	});

	describe('GET /api/metrics (system stats)', () => {
		it('rejects unauthenticated callers (Admin-only per ACCESS_MATRIX)', async () => {
			const res = await request(app).get('/api/metrics');
			expect(res.statusCode).toBe(401);
		});

		it('returns system health operational status', async () => {
			const token = jwt.sign({ id: 1, role: 'Admin' }, SECRET);
			const res = await request(app).get('/api/metrics').set('Authorization', `Bearer ${token}`);
			expect(res.statusCode).toBe(200);
			expect(res.body).toHaveProperty('status', 'OPERATIONAL');
		});
	});
});
