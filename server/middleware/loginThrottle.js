// Failed-login throttle: after MAX_FAILURES wrong passwords for the same
// email from the same IP within WINDOW_MS, further attempts get 429 until the
// window passes. A successful login clears the counter.
//
// In-process memory is enough for a single API instance (this project's
// deployment). Running several instances would need a shared store (Redis).

const WINDOW_MS = Number(process.env.LOGIN_WINDOW_MS || 15 * 60 * 1000);
const MAX_FAILURES = Number(process.env.LOGIN_MAX_FAILURES || 10);

const failures = new Map(); // key -> { count, resetAt }

const keyFor = (req) => `${req.ip}|${String(req.body?.email || '').trim().toLowerCase()}`;

function current(key) {
    const entry = failures.get(key);
    if (entry && entry.resetAt <= Date.now()) {
        failures.delete(key);
        return null;
    }
    return entry || null;
}

const loginThrottle = (req, res, next) => {
    const entry = current(keyFor(req));
    if (entry && entry.count >= MAX_FAILURES) {
        const retryAfter = Math.ceil((entry.resetAt - Date.now()) / 1000);
        res.set('Retry-After', String(retryAfter));
        return res.status(429).json({ error: 'Too many failed sign-in attempts. Try again later.' });
    }
    next();
};

const recordFailure = (req) => {
    const key = keyFor(req);
    const entry = current(key) || { count: 0, resetAt: Date.now() + WINDOW_MS };
    entry.count += 1;
    failures.set(key, entry);
    // Keep memory bounded if someone sprays many emails.
    if (failures.size > 10000) failures.delete(failures.keys().next().value);
};

const recordSuccess = (req) => failures.delete(keyFor(req));

module.exports = { loginThrottle, recordFailure, recordSuccess, MAX_FAILURES };
