const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateToken, authorizeRoles, SECRET } = require('./middleware/auth');
const db = require('./db/pool');

// Route Modules
const employeeRoutes = require('./routes/employees');
const inventoryRoutes = require('./routes/inventory');
const invoiceRoutes = require('./routes/invoices');
const reportRoutes = require('./routes/reports');
const metricsRoutes = require('./routes/metrics');
const flagRoutes = require('./routes/flags');   // Vivek — Phase 6
const deploymentsRoutes = require('./routes/deployments');   // Akhilesh — deployment history
const statusRoutes = require('./routes/status');
const { usersRepository, store } = require('./db/repositories');
const { bootstrap } = require('./db/bootstrap');
const { migrate } = require('./db/migrate');
const { loginThrottle, recordFailure, recordSuccess } = require('./middleware/loginThrottle');
const promClient = require('prom-client');

const normalizeRole = (role) => {
    if (typeof role !== 'string') return 'Employee';

    const trimmedRole = role.trim();
    const lowerRole = trimmedRole.toLowerCase();

    if (lowerRole === 'admin') return 'Admin';
    if (lowerRole === 'manager') return 'Manager';
    return 'Employee';
};

const app = express();
const PORT = process.env.PORT || 5000;
const IS_HOSTED = /^(staging|production)$/.test(process.env.NODE_ENV || '');

// ---- Security hardening (Vivek, Week 11) -------------------------------

// Render/Railway terminate TLS at their edge and forward over plain HTTP, so
// Express must trust the proxy for req.secure and the client IP to be real.
if (IS_HOSTED) {
    app.set('trust proxy', 1);
}

// Helmet sets the standard protective headers (CSP, X-Frame-Options, noSniff,
// Referrer-Policy and the rest). HSTS is enabled only where HTTPS actually
// terminates — sending it from a plain-HTTP local container would pin the
// browser to https://localhost and break development.
app.use(helmet({
    hsts: IS_HOSTED ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    crossOriginResourcePolicy: { policy: 'same-site' },
}));

// Redirect any request that reached us over plain HTTP. Belt-and-braces: the
// host should already be doing this at its edge.
if (IS_HOSTED) {
    app.use((req, res, next) => {
        if (req.secure || req.get('x-forwarded-proto') === 'https') return next();
        return res.redirect(308, `https://${req.get('host')}${req.originalUrl}`);
    });
}

// Strict CORS allow-list. Origins come from CORS_ALLOWED_ORIGINS as a
// comma-separated list; anything not on it is refused rather than reflected.
const ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

app.use(cors({
    origin(origin, callback) {
        // No Origin header: same-origin navigations, curl, health probes.
        if (!origin) return callback(null, true);
        if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
        return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
}));

// Cap request bodies so a single oversized payload cannot exhaust memory.
app.use(express.json({ limit: '1mb' }));

// GET /health -> checks basic application availability
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// GET /ready -> checks real database connectivity.
// READINESS_FORCE_FAIL=true makes this return 503 without touching the DB;
// used by the pipeline's gating test to prove the deploy gate actually blocks.
app.get('/ready', async (req, res) => {
    try {
        if (process.env.READINESS_FORCE_FAIL === 'true') {
            throw new Error('Readiness deliberately disabled for gate testing');
        }

        await db.isHealthy();
    } catch (err) {
        console.error('[ready] check failed:', err.message);
        return res.status(503).json({ ready: false, database: 'unreachable' });
    }

    // A reachable database with a schema that failed to migrate is not ready:
    // this is what lets the deploy gate block a release whose migration broke.
    if (startupState.migrationError) {
        return res.status(503).json({ ready: false, database: 'connected', migrations: 'failed' });
    }
    res.status(200).json({ ready: true, database: 'connected' });
});

// Mock user storage
// --- Auth Routes (Week 7) ---
// Accounts live in the users table (in memory under Jest). Self-registration
// always creates an Employee: only a signed-in Admin may grant a higher role,
// otherwise anyone could register themselves as Admin.
const isAdminCaller = (req) => {
    const token = (req.headers['authorization'] || '').split(' ')[1];
    if (!token) return false;
    try {
        return normalizeRole(jwt.verify(token, SECRET).role) === 'Admin';
    } catch (err) {
        return false;
    }
};

app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body || {};
        if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)
            || typeof password !== 'string' || password.length < 8) {
            return res.status(400).json({ error: 'name, a valid email and a password of at least 8 characters are required' });
        }

        const requestedRole = normalizeRole(role);
        if (requestedRole !== 'Employee' && !isAdminCaller(req)) {
            return res.status(403).json({ error: 'Only an Admin can assign the Admin or Manager role' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        if (await usersRepository.findByEmail(normalizedEmail)) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const newUser = await usersRepository.create({ name: name.trim(), email: normalizedEmail, passwordHash, role: requestedRole });

        res.status(201).json({ message: 'User registered successfully', userId: newUser.id });
    } catch (err) {
        console.error('[auth] register failed:', err.message);
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/api/auth/login', loginThrottle, async (req, res) => {
    try {
        const { email, password } = req.body || {};
        if (typeof email !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ error: 'email and password are required' });
        }

        const user = await usersRepository.findByEmail(email.trim().toLowerCase());
        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            recordFailure(req);
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        recordSuccess(req);

        const token = jwt.sign(
            { id: user.id, role: user.role, name: user.name },
            SECRET,
            { expiresIn: '8h' }
        );

        res.status(200).json({ token, role: user.role, name: user.name });
    } catch (err) {
        console.error('[auth] login failed:', err.message);
        res.status(500).json({ error: 'Login failed' });
    }
});

app.get('/api/admin/dashboard', authenticateToken, authorizeRoles('Admin', 'Manager'), (req, res) => {
    res.status(200).json({ message: 'Access granted to admin portal', user: req.user });
});

// --- Module Routes (Weeks 8 - 12) ---
app.use('/api/employees', employeeRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/flags', flagRoutes);   // Vivek — Phase 6 (GET /api/flags/evaluate)
app.use('/api/deployments', deploymentsRoutes);   // Akhilesh — deployment history
app.use('/api/status', statusRoutes);

// Prometheus scrape endpoint (Akhilesh). Default metrics are registered once
// per process; Jest re-requires this module, so guard against double registration.
if (!promClient.register.getSingleMetric('process_cpu_seconds_total')) {
    promClient.collectDefaultMetrics();
}
app.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', promClient.register.contentType);
        res.end(await promClient.register.metrics());
    } catch (ex) {
        res.status(500).end(String(ex));
    }
});

// ---- Error handling (Vivek, Week 11) -----------------------------------
// A CORS rejection is a client error, not a server fault. Without this the
// rejected Error propagates to Express's default handler and surfaces as a
// 500, which misreports the cause and leaks a stack trace in development.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    if (err && /not allowed by CORS/.test(err.message)) {
        return res.status(403).json({ error: 'Origin not allowed.' });
    }

    console.error('[error]', err && err.message);
    res.status(500).json({ error: 'Internal server error' });
});

// Startup: apply pending migrations, then seed demo accounts/data, retrying
// while the database comes up. The server listens regardless; /ready reports
// 503 until the database is reachable and the schema migrated cleanly.
// Set MIGRATE_ON_START=false to run `npm run migrate` as a separate step instead.
const startupState = { migrationError: null };

const startup = async (attempts = 10) => {
    for (let i = 1; i <= attempts; i += 1) {
        try {
            if (store === 'postgres' && process.env.MIGRATE_ON_START !== 'false') {
                await migrate();
            }
            await bootstrap();
            return;
        } catch (err) {
            if (err.fatal) {
                // A bad migration will not fix itself on retry.
                startupState.migrationError = err.message;
                console.error(`[migrate] FAILED, service will report not ready: ${err.message}`);
                return;
            }
            console.error(`[startup] attempt ${i}/${attempts} failed: ${err.message}`);
            await new Promise((resolve) => setTimeout(resolve, 3000));
        }
    }
    console.error('[startup] giving up; migrations/demo data were not applied');
};

// Only listen when executed directly (allows supertest in Jest)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        startup();
    });
}

app.bootstrap = bootstrap;
app.startupState = startupState;

module.exports = app;
