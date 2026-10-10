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

describe('POST /api/deployments', () => {
  afterEach(() => { delete process.env.DEPLOY_API_TOKEN; });

  test('rejects a missing or wrong deploy token', async () => {
    process.env.DEPLOY_API_TOKEN = 'ci-token';
    await request(app).post('/api/deployments').send({}).expect(401);
    await request(app).post('/api/deployments').set('X-Deploy-Token', 'nope').send({}).expect(401);
  });
});
