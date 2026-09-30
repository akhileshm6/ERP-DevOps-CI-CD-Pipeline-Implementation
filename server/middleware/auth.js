const jwt = require('jsonwebtoken');

const normalizeRole = (role) => {
    if (typeof role !== 'string') return '';
    return role.trim().toLowerCase();
};

// Verify JWT Token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <TOKEN>

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_key');
        req.user = verified;
        next();
    } catch (err) {
        res.status(403).json({ error: 'Invalid or expired token.' });
    }
};

// Enforce Role-Based Access Control (RBAC)
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        const normalizedUserRole = normalizeRole(req.user && req.user.role);
        const normalizedAllowedRoles = allowedRoles.map(normalizeRole);

        if (!req.user || !normalizedAllowedRoles.includes(normalizedUserRole)) {
            return res.status(403).json({ error: 'Access denied. Unauthorized role.' });
        }
        next();
    };
};

module.exports = { authenticateToken, authorizeRoles };