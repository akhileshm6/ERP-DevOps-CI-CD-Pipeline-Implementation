const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server');
const { SECRET } = require('../middleware/auth');

beforeAll(() => app.bootstrap({ log: () => {} }));

describe('POST /api/auth/login', () => {
  test('signs in a seeded demo user and returns a role-bearing token', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'manager@erp.local', password: 'Manager123!' }).expect(200);
    expect(res.body.role).toBe('Manager');
    expect(jwt.verify(res.body.token, SECRET)).toMatchObject({ role: 'Manager', name: 'Demo Manager' });
  });

  test('rejects a wrong password', async () => {
    await request(app).post('/api/auth/login')
      .send({ email: 'admin@erp.local', password: 'wrong-password' }).expect(401);
  });
});

describe('POST /api/auth/register', () => {
  test('creates an Employee by default', async () => {
    await request(app).post('/api/auth/register')
      .send({ name: 'New Hire', email: 'new.hire@erp.local', password: 'longenough1' }).expect(201);
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'new.hire@erp.local', password: 'longenough1' }).expect(200);
    expect(res.body.role).toBe('Employee');
  });

  test('refuses a self-assigned Admin role', async () => {
    await request(app).post('/api/auth/register')
      .send({ name: 'Mallory', email: 'mallory@erp.local', password: 'longenough1', role: 'Admin' }).expect(403);
  });

  test('lets an Admin create a Manager', async () => {
    const admin = { Authorization: `Bearer ${jwt.sign({ id: 1, role: 'Admin' }, SECRET)}` };
    await request(app).post('/api/auth/register').set(admin)
      .send({ name: 'Team Lead', email: 'lead@erp.local', password: 'longenough1', role: 'Manager' }).expect(201);
  });

  test('validates input', async () => {
    await request(app).post('/api/auth/register').send({ email: 'x' }).expect(400);
  });
});
