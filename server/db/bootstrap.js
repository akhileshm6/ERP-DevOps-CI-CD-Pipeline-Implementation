// First-boot data for a fresh environment.
//   * Demo login accounts (one per role) so the dashboard can be signed into.
//   * Demo business data from seed.js, written only into EMPTY tables, so it
//     never overwrites real records and restarts are idempotent.
// Disable either with SEED_DEMO_USERS=false / SEED_DEMO_DATA=false; production
// needs SEED_DEMO_USERS=true to create the demo accounts at all.

const bcrypt = require('bcryptjs');
const repos = require('./repositories');
const seed = require('../seed');

const DEMO_USERS = [
    { name: 'Demo Admin', email: 'admin@erp.local', password: 'Admin123!', role: 'Admin' },
    { name: 'Demo Manager', email: 'manager@erp.local', password: 'Manager123!', role: 'Manager' },
    { name: 'Demo User', email: 'user@erp.local', password: 'User123!', role: 'Employee' }
];

async function seedUsers() {
    for (const u of DEMO_USERS) {
        if (await repos.usersRepository.findByEmail(u.email)) continue;
        const passwordHash = await bcrypt.hash(u.password, 10);
        await repos.usersRepository.create({ name: u.name, email: u.email, passwordHash, role: u.role });
    }
}

const isEmpty = async (db, table) => {
    const { rows } = await db.query(`SELECT NOT EXISTS (SELECT 1 FROM ${table}) AS empty`);
    return rows[0].empty;
};

async function seedBusinessData() {
    const db = require('./pool');
    const seeded = [];

    if (await isEmpty(db, 'sales_orders')) {
        for (const s of seed.sales) {
            await db.query(
                'INSERT INTO sales_orders (client_name, total_amount, status, created_at) VALUES ($1, $2, $3, $4)',
                [s.clientName, s.totalAmount, s.status, s.createdAt]
            );
        }
        seeded.push('sales_orders');
    }

    if (await isEmpty(db, 'inventory_items')) {
        for (const i of seed.inventory) {
            await db.query(
                `INSERT INTO inventory_items (sku, name, category, quantity, min_stock_level, unit_price, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [i.sku, i.name, i.category, i.quantity, i.minStockLevel, i.unitPrice, i.createdAt]
            );
        }
        seeded.push('inventory_items');
    }

    if (await isEmpty(db, 'hr_staff')) {
        for (const h of seed.hr) {
            await db.query(
                `INSERT INTO hr_staff (name, department, role, salary, performance_rating, status, hire_date, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [h.name, h.department, h.role, h.salary, h.performanceRating, h.status, h.hireDate, h.createdAt]
            );
        }
        seeded.push('hr_staff');
    }

    if (await isEmpty(db, 'finance_entries')) {
        for (const f of seed.finance) {
            await db.query(
                `INSERT INTO finance_entries (entry_date, category, type, amount, description, status, created_at)
                 VALUES ($1::timestamptz::date, $2, $3, $4, $5, $6, $1)`,
                [f.createdAt, f.category, f.transactionType === 'Revenue' ? 'credit' : 'debit', f.amount, f.description, f.status]
            );
        }
        seeded.push('finance_entries');
    }

    return seeded;
}

// Known demo passwords must not appear in production by accident: there it
// takes an explicit SEED_DEMO_USERS=true; everywhere else it is on by default.
const demoUsersEnabled = () => (
    process.env.NODE_ENV === 'production'
        ? process.env.SEED_DEMO_USERS === 'true'
        : process.env.SEED_DEMO_USERS !== 'false'
);

async function bootstrap({ log = console.log } = {}) {
    if (demoUsersEnabled()) {
        await seedUsers();
        log('[bootstrap] demo users ready');
    }
    if (repos.store === 'postgres' && process.env.SEED_DEMO_DATA !== 'false') {
        const seeded = await seedBusinessData();
        log(`[bootstrap] demo data ${seeded.length ? `seeded: ${seeded.join(', ')}` : 'already present'}`);
    }
}

module.exports = { bootstrap, DEMO_USERS };
