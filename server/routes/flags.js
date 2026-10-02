const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { authenticateToken, authorizeRoles, normaliseRole } = require('../middleware/auth');
const db = require('../db/pool');

// Feature flag evaluation.
// Owner: Vivek Anand (Phase 6 lead).
//
// PATCH /api/flags/:key (Admin toggle) ported from Akhilesh's commit 5c6f3058
// onto the shared pool, with the change recorded in flag_events and audit_log.

/**
 * Deterministic 0-99 bucket for a (flag, subject) pair.
 *
 * Hashing rather than random so a given user stays on the same side of a
 * partial rollout across requests — otherwise a 50% flag would flicker on
 * every page load. Keyed by flag so a user unlucky on one flag is not
 * systematically unlucky on all of them.
 */
const bucketFor = (flagKey, subject) => {
    const digest = crypto.createHash('sha256').update(`${flagKey}:${subject}`).digest();
    return digest.readUInt32BE(0) % 100;
};

/**
 * Resolve one flag row against one caller.
 * Order matters: the cheapest, most absolute checks reject first.
 */
const evaluate = (flag, user, environment) => {
    if (!flag.enabled) return { on: false, reason: 'flag disabled' };

    if (flag.environment && flag.environment !== 'all' && flag.environment !== environment) {
        return { on: false, reason: `scoped to ${flag.environment}` };
    }

    const targets = Array.isArray(flag.target_roles) ? flag.target_roles : [];
    if (targets.length > 0) {
        const allowed = targets.map(normaliseRole).filter(Boolean);
        if (!allowed.includes(normaliseRole(user.role))) {
            return { on: false, reason: 'role not targeted' };
        }
    }

    const pct = Number(flag.rollout_percent);
    if (pct <= 0) return { on: false, reason: 'rollout at 0%' };
    if (pct < 100) {
        const subject = user.id != null ? String(user.id) : 'anonymous';
        const bucket = bucketFor(flag.key, subject);
        if (bucket >= pct) return { on: false, reason: `bucket ${bucket} >= ${pct}%` };
        return { on: true, reason: `bucket ${bucket} < ${pct}%` };
    }

    return { on: true, reason: 'enabled for role' };
};

/**
 * GET /api/flags/evaluate
 * Resolves the enabled feature set for the calling user's role.
 * Any authenticated role may call it — the response is scoped to the caller,
 * so a User only ever learns about their own flags.
 */
router.get('/evaluate', authenticateToken, async (req, res) => {
    try {
        const environment = process.env.NODE_ENV || 'development';
        const { rows } = await db.query(
            `SELECT key, description, enabled, rollout_percent, target_roles, environment
               FROM feature_flags
              ORDER BY key`
        );

        const enabled = [];
        const detail = {};

        for (const flag of rows) {
            const verdict = evaluate(flag, req.user, environment);
            detail[flag.key] = verdict.on;
            if (verdict.on) enabled.push(flag.key);
        }

        res.status(200).json({
            role: normaliseRole(req.user.role) || req.user.role,
            environment,
            enabled,
            flags: detail,
            evaluatedAt: new Date().toISOString(),
        });
    } catch (err) {
        res.status(500).json({ error: 'Flag evaluation failed', detail: err.message });
    }
});

/**
 * GET /api/flags — every flag with its full configuration, for the Admin console.
 */
router.get('/', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
    try {
        const { rows } = await db.query(
            `SELECT key, description, enabled, rollout_percent, target_roles, environment, updated_by, updated_at
               FROM feature_flags ORDER BY key`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Unable to list flags', detail: err.message });
    }
});

/**
 * PATCH /api/flags/:key — Admin-only flag mutation.
 * Body: { enabled?, rolloutPercent?, targetRoles? }. Omitted fields keep their value.
 */
router.patch('/:key', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
    const { key } = req.params;
    const { enabled, rolloutPercent, targetRoles } = req.body || {};
    const actor = req.user.name || req.user.email || String(req.user.id || 'Admin');

    if (rolloutPercent !== undefined && !(Number.isInteger(rolloutPercent) && rolloutPercent >= 0 && rolloutPercent <= 100)) {
        return res.status(400).json({ error: 'rolloutPercent must be an integer 0-100' });
    }

    try {
        const current = await db.query('SELECT * FROM feature_flags WHERE key = $1', [key]);
        if (current.rows.length === 0) return res.status(404).json({ error: 'Flag not found' });

        const updated = await db.query(
            `UPDATE feature_flags
                SET enabled = COALESCE($1, enabled),
                    rollout_percent = COALESCE($2, rollout_percent),
                    target_roles = COALESCE($3, target_roles),
                    updated_by = $4,
                    updated_at = NOW()
              WHERE key = $5 RETURNING *`,
            [enabled ?? null, rolloutPercent ?? null, targetRoles ?? null, actor, key]
        );

        const from = JSON.stringify(current.rows[0]);
        const to = JSON.stringify(updated.rows[0]);
        await db.query('INSERT INTO flag_events (flag_key, actor, from_state, to_state) VALUES ($1, $2, $3, $4)', [key, actor, from, to]);
        await db.query(
            "INSERT INTO audit_log (actor, action, module, details) VALUES ($1, 'TOGGLE_FEATURE_FLAG', 'flags', $2)",
            [actor, JSON.stringify({ key, from: current.rows[0], to: updated.rows[0] })]
        );

        res.json(updated.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Flag update failed', detail: err.message });
    }
});

module.exports = router;
module.exports.evaluate = evaluate;
module.exports.bucketFor = bucketFor;
