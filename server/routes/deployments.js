const express = require('express');
const router = express.Router();
const db = require('../db/pool');

// GET /api/deployments/current
router.get('/current', async (req, res) => {
  try {
    res.json({
      version: process.env.APP_VERSION || '1.0.0',
      commitSha: process.env.COMMIT_SHA || 'local-sha',
      branch: process.env.GIT_BRANCH || 'main',
      environment: process.env.NODE_ENV || 'development',
      deployedAt: process.env.BUILD_TIMESTAMP || new Date().toISOString(),
      pipelineStatus: 'success'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch current deployment' });
  }
});

// GET /api/deployments (Paginated history)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { rows } = await db.query(
      'SELECT * FROM deployments ORDER BY started_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    const countRes = await db.query('SELECT COUNT(*) FROM deployments');

    res.json({
      data: rows,
      total: parseInt(countRes.rows[0].count),
      page,
      pages: Math.ceil(parseInt(countRes.rows[0].count) / limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CI authenticates with a shared token (header `X-Deploy-Token`) so nobody
// else can forge deployment history. Hosted environments must configure it.
const requireDeployToken = (req, res, next) => {
  const expected = process.env.DEPLOY_API_TOKEN;
  if (!expected) {
    if (/^(staging|production)$/.test(process.env.NODE_ENV || '')) {
      return res.status(503).json({ error: 'DEPLOY_API_TOKEN not configured' });
    }
    return next(); // local development
  }
  if (req.get('X-Deploy-Token') !== expected) {
    return res.status(401).json({ error: 'Invalid deploy token' });
  }
  next();
};

// POST /api/deployments (Record deployment outcome from CI)
router.post('/', requireDeployToken, async (req, res) => {
  const { version, imageTag, commitSha, environment, status, triggeredBy, triggerType, durationSeconds, testSummary } = req.body;
  try {
    const result = await db.query(
      `INSERT INTO deployments (version, image_tag, commit_sha, environment, status, triggered_by, trigger_type, duration_seconds, test_summary, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()) RETURNING *`,
      [version, imageTag, commitSha, environment, status, triggeredBy, triggerType, durationSeconds, JSON.stringify(testSummary)]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;