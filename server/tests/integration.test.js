const request = require('supertest');
const app = require('../server'); // Path to Express app

describe('API Integration Tests', () => {
  it('GET /api/deployments/current returns version metadata', async () => {
    const res = await request(app).get('/api/deployments/current');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('version');
    expect(res.body).toHaveProperty('commitSha');
  });

  it('GET /metrics exposes Prometheus metrics', async () => {
    const res = await request(app).get('/metrics');
    expect(res.statusCode).toEqual(200);
    expect(res.text).toContain('process_cpu_seconds_total');
  });
});