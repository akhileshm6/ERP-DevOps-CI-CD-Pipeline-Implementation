// RBAC + feature-flag evaluation — Phase 6 acceptance tests.
// Owner: Vivek Anand.
//
// Mints three real JWTs (Admin / Manager / User) and drives them against the
// live route table, asserting each role hits exactly the permissions it should
// — no more, no less — and that flag evaluation resolves per role.

process.env.JWT_SECRET = 'test_secret_for_rbac_suite';

// CI has no Postgres, so the pool is stubbed with the rows that
// 06_contract_tables.sql seeds. Set TEST_LIVE_DB=1 to run against the real
// database instead (e.g. with the Compose stack up).
if (!process.env.TEST_LIVE_DB) {
    const SEEDED_FLAGS = [
        { key: 'beta-dashboard', description: '', enabled: true, rollout_percent: 100, target_roles: ['Admin'], environment: 'all' },
        { key: 'legacy-export', description: '', enabled: false, rollout_percent: 0, target_roles: ['Admin'], environment: 'all' },
        { key: 'new-finance-chart', description: '', enabled: true, rollout_percent: 100, target_roles: ['Admin', 'Manager'], environment: 'all' },
    ];
    jest.mock('../db/pool', () => ({
        query: jest.fn(async () => ({ rows: SEEDED_FLAGS })),
        isHealthy: jest.fn(async () => true),
        pool: { end: jest.fn(async () => {}) },
    }));
}

const request = require('supertest');
const jwt = require('jsonwebtoken');

const app = require('../server');
const db = require('../db/pool');
const { evaluate, bucketFor } = require('../routes/flags');

const sign = (role, id) => jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '1h' });

const TOKENS = {
    Admin: sign('Admin', 1),
    Manager: sign('Manager', 2),
    User: sign('User', 3),
};

const auth = (role) => ({ Authorization: `Bearer ${TOKENS[role]}` });

afterAll(async () => {
    await db.pool.end();
});

// ---------------------------------------------------------------- tokens
describe('JWT middleware', () => {
    it('rejects a request with no token as 401', async () => {
        const res = await request(app).get('/api/admin/dashboard');
        expect(res.statusCode).toBe(401);
    });

    it('rejects a malformed token as 403', async () => {
        const res = await request(app)
            .get('/api/admin/dashboard')
            .set('Authorization', 'Bearer not.a.real.token');
        expect(res.statusCode).toBe(403);
    });

    it('rejects a token signed with the wrong secret as 403', async () => {
        const forged = jwt.sign({ id: 9, role: 'Admin' }, 'wrong_secret');
        const res = await request(app)
            .get('/api/admin/dashboard')
            .set('Authorization', `Bearer ${forged}`);
        expect(res.statusCode).toBe(403);
    });

    it('normalises the "User" alias to the Employee tier', async () => {
        const res = await request(app).get('/api/inventory').set(auth('User'));
        expect(res.statusCode).toBe(200);
    });
});

// ---------------------------------------------------------- access matrix
// Each row is one route and the expected status for each of the three roles.
// 200 = permitted, 403 = correctly refused.
const MATRIX = [
    // route,                    method, Admin, Manager, User
    ['/api/admin/dashboard', 'get', 200, 200, 403],
    ['/api/employees', 'get', 200, 200, 403],
    ['/api/inventory', 'get', 200, 200, 200],
    ['/api/invoices', 'get', 200, 200, 200],
    ['/api/reports/summary', 'get', 200, 200, 403],
    ['/api/metrics', 'get', 200, 403, 403],
    ['/api/flags', 'get', 200, 403, 403],
    ['/api/deployments', 'get', 200, 200, 403],
    ['/api/flags/evaluate', 'get', 200, 200, 200],
];

describe('Access matrix — each role hits exactly its permissions', () => {
    MATRIX.forEach(([route, method, admin, manager, user]) => {
        const expected = { Admin: admin, Manager: manager, User: user };

        Object.keys(expected).forEach((role) => {
            it(`${role} ${method.toUpperCase()} ${route} -> ${expected[role]}`, async () => {
                const res = await request(app)[method](route).set(auth(role));
                expect(res.statusCode).toBe(expected[role]);
            });
        });
    });
});

// ------------------------------------------------------ flag evaluation
describe('GET /api/flags/evaluate', () => {
    it('returns the caller role and an enabled set', async () => {
        const res = await request(app).get('/api/flags/evaluate').set(auth('Admin'));
        expect(res.statusCode).toBe(200);
        expect(res.body.role).toBe('Admin');
        expect(Array.isArray(res.body.enabled)).toBe(true);
    });

    it('requires authentication', async () => {
        const res = await request(app).get('/api/flags/evaluate');
        expect(res.statusCode).toBe(401);
    });

    it('gives Admin a superset of what User gets', async () => {
        const a = await request(app).get('/api/flags/evaluate').set(auth('Admin'));
        const u = await request(app).get('/api/flags/evaluate').set(auth('User'));
        expect(a.statusCode).toBe(200);
        expect(u.statusCode).toBe(200);
        u.body.enabled.forEach((key) => expect(a.body.enabled).toContain(key));
    });

    it('resolves the seeded flags per role', async () => {
        const admin = await request(app).get('/api/flags/evaluate').set(auth('Admin'));
        const manager = await request(app).get('/api/flags/evaluate').set(auth('Manager'));
        const user = await request(app).get('/api/flags/evaluate').set(auth('User'));

        // new-finance-chart targets Admin + Manager
        expect(admin.body.flags['new-finance-chart']).toBe(true);
        expect(manager.body.flags['new-finance-chart']).toBe(true);
        expect(user.body.flags['new-finance-chart']).toBe(false);

        // beta-dashboard targets Admin only
        expect(admin.body.flags['beta-dashboard']).toBe(true);
        expect(manager.body.flags['beta-dashboard']).toBe(false);
        expect(user.body.flags['beta-dashboard']).toBe(false);

        // legacy-export is disabled outright
        expect(admin.body.flags['legacy-export']).toBe(false);
    });
});

// --------------------------------------------------- evaluation unit tests
describe('Flag evaluation rules', () => {
    const base = {
        key: 'x', enabled: true, rollout_percent: 100,
        target_roles: [], environment: 'all',
    };

    it('a disabled flag is off regardless of targeting', () => {
        expect(evaluate({ ...base, enabled: false }, { id: 1, role: 'Admin' }, 'test').on).toBe(false);
    });

    it('an untargeted flag is on for every role', () => {
        ['Admin', 'Manager', 'User'].forEach((role) => {
            expect(evaluate(base, { id: 1, role }, 'test').on).toBe(true);
        });
    });

    it('a role-targeted flag is off for untargeted roles', () => {
        const f = { ...base, target_roles: ['Admin'] };
        expect(evaluate(f, { id: 1, role: 'Admin' }, 'test').on).toBe(true);
        expect(evaluate(f, { id: 2, role: 'Manager' }, 'test').on).toBe(false);
    });

    it('0% rollout is off, 100% is on', () => {
        expect(evaluate({ ...base, rollout_percent: 0 }, { id: 1, role: 'Admin' }, 'test').on).toBe(false);
        expect(evaluate({ ...base, rollout_percent: 100 }, { id: 1, role: 'Admin' }, 'test').on).toBe(true);
    });

    it('environment scoping excludes other environments', () => {
        const f = { ...base, environment: 'production' };
        expect(evaluate(f, { id: 1, role: 'Admin' }, 'production').on).toBe(true);
        expect(evaluate(f, { id: 1, role: 'Admin' }, 'staging').on).toBe(false);
    });

    it('bucketing is deterministic and within range', () => {
        const a = bucketFor('flag-a', '42');
        expect(bucketFor('flag-a', '42')).toBe(a);
        expect(a).toBeGreaterThanOrEqual(0);
        expect(a).toBeLessThan(100);
    });

    it('partial rollout splits the population roughly evenly', () => {
        let on = 0;
        for (let i = 0; i < 1000; i += 1) {
            if (evaluate({ ...base, rollout_percent: 50 }, { id: i, role: 'Admin' }, 'test').on) on += 1;
        }
        // Deterministic hashing, so this is a fixed value, not a flaky sample.
        expect(on).toBeGreaterThan(400);
        expect(on).toBeLessThan(600);
    });
});
