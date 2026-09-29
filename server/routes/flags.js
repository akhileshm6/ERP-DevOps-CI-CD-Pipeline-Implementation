const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAuditEvent } = require('../controllers/deploymentsController');

// GET /api/flags/evaluate - Resolve flags for user role
router.get('/evaluate', authenticateToken, async (req, res) => {
  try {
    const { role } = req.user;
    const { rows } = await db.query('SELECT * FROM feature_flags WHERE enabled = true');
    
    // Filter flags based on user target roles
    const activeFlags = {};
    rows.forEach(flag => {
      const targetRoles = flag.target_roles || [];
      if (targetRoles.length === 0 || targetRoles.includes(role)) {
        activeFlags[flag.key] = true;
      }
    });

    res.json(activeFlags);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/flags/:key - Admin toggle
router.patch('/:key', authenticateToken, requireRole(['Admin']), async (req, res) => {
  const { key } = req.params;
  const { enabled, rolloutPercent, targetRoles } = req.body;

  try {
    const current = await db.query('SELECT * FROM feature_flags WHERE key = $1', [key]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'Flag not found' });

    const updated = await db.query(
      `UPDATE feature_flags 
       SET enabled = COALESCE($1, enabled), 
           rollout_percent = COALESCE($2, rollout_percent), 
           target_roles = COALESCE($3, target_roles),
           updated_by = $4
       WHERE key = $5 RETURNING *`,
      [enabled, rolloutPercent, targetRoles, req.user.name || 'Admin', key]
    );

    // Write audit log entry
    await logAuditEvent({
      actor: req.user.name || 'Admin',
      action: 'TOGGLE_FEATURE_FLAG',
      target: key,
      fromState: current.rows[0],
      toState: updated.rows[0]
    });

    res.json(updated.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;