const request = require('supertest');
const app = require('../app');

describe('GET /api/deployments/current', () => {
  test('returns the current deployment contract', async () => {
    const response = await request(app)
      .get('/api/deployments/current')
      .expect(200);

    expect(response.body).toEqual({
      version: 'v1.0.0',
      commitSha: 'abc123def456',
      branch: 'main',
      environment: 'production',
      deployedAt: '2026-08-25T12:00:00.000Z',
      pipelineStatus: 'success'
    });
  });
});