const express = require('express');

const router = express.Router();

router.get('/current', (req, res) => {
  res.json({
    version: 'v1.0.0',
    commitSha: 'abc123def456',
    branch: 'main',
    environment: 'production',
    deployedAt: '2026-08-25T12:00:00.000Z',
    pipelineStatus: 'success'
  });
});

module.exports = router;