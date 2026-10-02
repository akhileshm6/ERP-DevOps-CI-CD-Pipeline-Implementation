// Employees, reports summary, status and metric semantics (in-memory store).
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server');
const { SECRET } = require('../middleware/auth');

const as = (role) => ({ Authorization: `Bearer ${jwt.sign({ id: 1, role, name: role }, SECRET)}` });
const newHire = { name: 'Priya Nair', department: 'Engineering', role: 'Platform Engineer', salary: 91000 };

describe('/api/employees', () => {
  test('requires sign-in, and Employees cannot read the roster', async () => {
    await request(app).get('/api/employees').expect(401);
    await request(app).get('/api/employees').set(as('Employee')).expect(403);
  });

  test('Manager can read the roster but not add to it', async () => {
    const res = await request(app).get('/api/employees').set(as('Manager')).expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    await request(app).post('/api/employees').set(as('Manager')).send(newHire).expect(403);
  });

  test('Admin adds an employee and they appear in HR metrics', async () => {
    const before = (await request(app).get('/api/metrics/hr').set(as('Admin'))).body.summary.totalEmployees;
    const res = await request(app).post('/api/employees').set(as('Admin')).send(newHire).expect(201);
    expect(res.body.employee).toMatchObject({ name: 'Priya Nair', status: 'Active' });
    const after = (await request(app).get('/api/metrics/hr').set(as('Admin'))).body.summary.totalEmployees;
    expect(after).toBe(before + 1);
  });

  test.each([
    [{ ...newHire, salary: -5 }],
    [{ ...newHire, name: '' }],
    [{ ...newHire, status: 'Retired' }],
    [{ ...newHire, hireDate: '03/10/2026' }]
  ])('rejects invalid input %#', async (body) => {
    await request(app).post('/api/employees').set(as('Admin')).send(body).expect(400);
  });
});

describe('GET /api/reports/summary', () => {
  test('is restricted to Admin and Manager', async () => {
    await request(app).get('/api/reports/summary').expect(401);
    await request(app).get('/api/reports/summary').set(as('Employee')).expect(403);
  });

  test('is computed from the same data as the domain metrics', async () => {
    const summary = (await request(app).get('/api/reports/summary').set(as('Manager')).expect(200)).body;
    const sales = (await request(app).get('/api/metrics/sales?range=30d').set(as('Manager'))).body.summary;
    const inventory = (await request(app).get('/api/metrics/inventory').set(as('Manager'))).body.summary;

    expect(summary.sales.revenue).toBe(sales.totalRevenue);
    expect(summary.sales.orders).toBe(sales.orderCount);
    expect(summary.inventory.lowStockCount).toBe(inventory.lowStockCount);
    expect(summary.inventory.lowStockItems.length).toBeLessThanOrEqual(5);
    summary.inventory.lowStockItems.forEach((i) => expect(i.quantity).toBeLessThanOrEqual(i.minStockLevel));
    // No deployment history exists in memory mode, and none is invented.
    expect(summary.deployments).toEqual({ latest: null, failedLast7d: 0 });
  });
});

describe('GET /api/status', () => {
  test('is public and reports build metadata without secrets', async () => {
    const res = await request(app).get('/api/status').expect(200);
    expect(res.body).toMatchObject({ store: 'memory', dataSource: 'demo' });
    expect(typeof res.body.ready).toBe('boolean');
    expect(JSON.stringify(res.body)).not.toMatch(/secret|password|postgres:\/\//i);
  });
});

describe('metric semantics', () => {
  test('inventory is a snapshot: the period does not change stock figures', async () => {
    const today = (await request(app).get('/api/metrics/inventory?range=today').set(as('Admin'))).body.summary;
    const quarter = (await request(app).get('/api/metrics/inventory?range=quarter').set(as('Admin'))).body.summary;
    expect(today).toEqual(quarter);
  });

  test('headcount is a snapshot; only new hires depend on the period', async () => {
    const week = (await request(app).get('/api/metrics/hr?range=7d').set(as('Admin'))).body.summary;
    const quarter = (await request(app).get('/api/metrics/hr?range=quarter').set(as('Admin'))).body.summary;
    expect(week.totalEmployees).toBe(quarter.totalEmployees);
    expect(week.newHires).toBeLessThanOrEqual(quarter.newHires);
  });

  test('sales comparison is null when the previous period has no orders', async () => {
    // Seed data spans the last 30 days, so the 30 days before that are empty.
    const res = await request(app).get('/api/metrics/sales?range=30d').set(as('Admin'));
    expect(res.body.summary.previousPeriodRevenue).toBeNull();
    const week = await request(app).get('/api/metrics/sales?range=7d').set(as('Admin'));
    expect(typeof week.body.summary.previousPeriodRevenue).toBe('number');
  });
});
