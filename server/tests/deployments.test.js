const request = require('supertest');
const app = require('../server');

describe('GET /api/deployments/current', () => {
  test('returns the current deployment contract', async () => {
    const response = await request(app)
      .get('/api/deployments/current')
      .expect(200);

    // Values come from the build environment, so assert the contract shape.
    expect(Object.keys(response.body).sort()).toEqual(
      ['branch', 'commitSha', 'deployedAt', 'environment', 'pipelineStatus', 'version']
    );
    expect(response.body.pipelineStatus).toBe('success');
  });
});
