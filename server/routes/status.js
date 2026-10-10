const express = require('express');
const db = require('../db/pool');
const { store } = require('../db/repositories');

const router = express.Router();

// GET /api/status — public, read-only summary of what is running and whether it
// is healthy. Used by the dashboard header and login screen. Exposes no secrets:
// only build metadata that the image already carries.
router.get('/', async (req, res) => {
    let ready = false;
    try {
        ready = process.env.READINESS_FORCE_FAIL !== 'true' && (await db.isHealthy());
    } catch (err) {
        console.error('[status] database check failed:', err.message);
    }

    res.status(200).json({
        ready,
        database: ready ? 'connected' : 'unreachable',
        environment: process.env.NODE_ENV || 'development',
        version: process.env.APP_VERSION || 'dev',
        commitSha: process.env.COMMIT_SHA || 'local',
        branch: process.env.GIT_BRANCH || 'local',
        builtAt: process.env.BUILD_TIMESTAMP || null,
        // Demo data is seeded unless SEED_DEMO_DATA=false (see db/bootstrap.js);
        // the in-memory store always serves the generated sample data.
        dataSource: store === 'memory' || process.env.SEED_DEMO_DATA !== 'false' ? 'demo' : 'live',
        store
    });
});

module.exports = router;
