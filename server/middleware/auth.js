const jwt = require('jsonwebtoken');

// JWT authentication and role-based access control.
// Owner: Vivek Anand (Phase 6 lead — Access Control & Feature Flags).
//
// `authenticateToken` and `authorizeRoles` keep the exact signatures and
// status codes the existing routes (employees, inventory, invoices, reports,
// metrics) already depend on. Everything below is hardening around them.

// ---------------------------------------------------------------- secret
// Falling back to a hardcoded key is fine locally and unacceptable once
// deployed: anyone who has read the repo could mint an Admin token. Fail at
// boot in a hosted environment rather than serving forgeable sessions.
const DEV_SECRET = 'dev_secret_key';
const SECRET = process.env.JWT_SECRET || DEV_SECRET;

if (/^(staging|production)$/.test(process.env.NODE_ENV || '') && SECRET === DEV_SECRET) {
    throw new Error(
        'JWT_SECRET must be set in staging and production. Refusing to start ' +
        'with the development fallback key.'
    );
}

// ----------------------------------------------------------------- roles
// The schema's CHECK constraint allows Admin / Manager / Employee, while the
// SP301 contract refers to the lowest tier as "User". Both spellings are
// accepted and normalised to the same tier so a JWT minted either way works.
const ROLE_ALIASES = { user: 'Employee', employee: 'Employee', admin: 'Admin', manager: 'Manager' };

const normaliseRole = (role) =>
    ROLE_ALIASES[String(role || '').trim().toLowerCase()] || null;

/**
 * Verify the bearer token and attach the caller to req.user.
 * 401 when no token is supplied, 403 when one is supplied but invalid.
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <TOKEN>

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const verified = jwt.verify(token, SECRET);
        // Normalise the role once, here, so every downstream check compares
        // like with like instead of each route re-deriving it.
        req.user = { ...verified, role: normaliseRole(verified.role) || verified.role };
        next();
    } catch (err) {
        res.status(403).json({ error: 'Invalid or expired token.' });
    }
};

/**
 * Restrict a route to the listed roles. Enforced server-side — hiding a
 * control in the UI is not access control.
 */
const authorizeRoles = (...allowedRoles) => {
    const allowed = allowedRoles.map(normaliseRole).filter(Boolean);

    return (req, res, next) => {
        if (!req.user || !allowed.includes(normaliseRole(req.user.role))) {
            return res.status(403).json({ error: 'Access denied. Unauthorized role.' });
        }
        next();
    };
};

// `requireRole([...])` is the array-style spelling used in Akhilesh's routes.
const requireRole = (roles) => authorizeRoles(...roles);

module.exports = { authenticateToken, authorizeRoles, requireRole, normaliseRole, SECRET };
