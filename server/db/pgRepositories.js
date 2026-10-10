// PostgreSQL persistence. Same interface as memoryRepositories.js, so routes
// and services don't care which store is active (see repositories.js).
// Every query is parameterised; rows are mapped to the camelCase shapes the
// routes and the dashboard already use.

const db = require('./pool');

const RANGE_DAYS = { day: 1, week: 7, month: 30, year: 365 };

const toInventoryItem = (r) => ({
    id: r.id,
    sku: r.sku,
    name: r.name,
    category: r.category,
    quantity: r.quantity,
    minStockLevel: r.min_stock_level,
    unitPrice: Number(r.unit_price),
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at
});

const inventoryRepository = {
    async list(filters = {}) {
        const where = [];
        const params = [];
        const add = (sql, value) => { params.push(value); where.push(sql.replace('?', `$${params.length}`)); };

        if (filters.sku) add('sku = ?', filters.sku);
        if (filters.name) add('name ILIKE ?', `%${filters.name}%`);
        if (filters.lowStock === true) where.push('quantity <= min_stock_level');
        if (filters.minQuantity !== undefined) add('quantity >= ?', filters.minQuantity);
        if (filters.maxQuantity !== undefined) add('quantity <= ?', filters.maxQuantity);

        const { rows } = await db.query(
            `SELECT * FROM inventory_items ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY id`,
            params
        );
        return rows.map(toInventoryItem);
    },

    async listLowStock(filters = {}) {
        return this.list({ ...filters, lowStock: true });
    },

    async create(item) {
        const { rows } = await db.query(
            `INSERT INTO inventory_items (sku, name, quantity, min_stock_level, unit_price, category)
             VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'General')) RETURNING *`,
            [item.sku, item.name, item.quantity, item.minStockLevel, item.unitPrice, item.category || null]
        );
        return toInventoryItem(rows[0]);
    }
};

const toInvoice = (r) => ({
    id: r.id,
    invoiceNumber: r.invoice_number,
    clientName: r.client_name,
    amountDue: Number(r.amount_due),
    status: r.status,
    issuedDate: r.issued_date instanceof Date ? r.issued_date.toISOString().split('T')[0] : r.issued_date
});

const salesRepository = {
    async list(filters = {}) {
        const where = [];
        const params = [];
        if (filters.status) { params.push(filters.status); where.push(`i.status = $${params.length}`); }
        if (filters.clientName) { params.push(`%${filters.clientName}%`); where.push(`o.client_name ILIKE $${params.length}`); }
        if (filters.range) { params.push(RANGE_DAYS[filters.range]); where.push(`i.issued_date >= CURRENT_DATE - $${params.length}::int`); }

        const { rows } = await db.query(
            `SELECT i.id, i.invoice_number, i.amount_due, i.status, i.issued_date, o.client_name
               FROM invoices i LEFT JOIN sales_orders o ON o.id = i.order_id
              ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
              ORDER BY i.issued_date DESC, i.id DESC`,
            params
        );
        return rows.map(toInvoice);
    },

    // An invoice belongs to an order, so both rows are written in one transaction.
    async create({ clientName, amountDue }) {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            const order = await client.query(
                `INSERT INTO sales_orders (client_name, total_amount, status) VALUES ($1, $2, 'Pending') RETURNING id`,
                [clientName, amountDue]
            );
            const { rows } = await client.query(
                `INSERT INTO invoices (order_id, invoice_number, amount_due)
                 VALUES ($1, $2, $3) RETURNING *, $4::text AS client_name`,
                [order.rows[0].id, `INV-${Date.now()}`, amountDue, clientName]
            );
            await client.query('COMMIT');
            return toInvoice(rows[0]);
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }
};

const iso = (d) => (d instanceof Date ? d.toISOString() : d);

// Dashboard datasets in the same shape seed.js generates.
const metricsSource = {
    async sales() {
        const { rows } = await db.query('SELECT id, client_name, total_amount, status, created_at FROM sales_orders ORDER BY created_at');
        return rows.map((r) => ({
            id: r.id, clientName: r.client_name, totalAmount: Number(r.total_amount), status: r.status, createdAt: iso(r.created_at)
        }));
    },
    async inventory() {
        const { rows } = await db.query('SELECT * FROM inventory_items ORDER BY id');
        return rows.map(toInventoryItem);
    },
    async hr() {
        const { rows } = await db.query('SELECT * FROM hr_staff ORDER BY id');
        return rows.map((r) => ({
            id: r.id, name: r.name, department: r.department, role: r.role, salary: Number(r.salary),
            performanceRating: r.performance_rating === null ? null : Number(r.performance_rating),
            status: r.status, hireDate: iso(r.hire_date)?.split('T')[0], createdAt: iso(r.created_at)
        }));
    },
    async finance() {
        const { rows } = await db.query('SELECT * FROM finance_entries ORDER BY created_at');
        return rows.map((r) => ({
            id: r.id,
            // finance_entries.type is the contract's credit/debit; the dashboard speaks Revenue/Expense.
            transactionType: r.type === 'credit' ? 'Revenue' : 'Expense',
            category: r.category, amount: Number(r.amount), description: r.description,
            status: r.status, createdAt: iso(r.created_at)
        }));
    }
};

const usersRepository = {
    async findByEmail(email) {
        const { rows } = await db.query(
            'SELECT id, name, email, role, COALESCE(password_hash, password) AS password_hash FROM users WHERE email = $1 AND is_active',
            [email]
        );
        if (!rows[0]) return null;
        const { password_hash: passwordHash, ...user } = rows[0];
        return { ...user, passwordHash };
    },
    async create({ name, email, passwordHash, role }) {
        // `password` is the original NOT NULL column; both hold the bcrypt hash.
        const { rows } = await db.query(
            `INSERT INTO users (name, email, password, password_hash, role)
             VALUES ($1, $2, $3, $3, $4) RETURNING id, name, email, role`,
            [name, email, passwordHash, role]
        );
        return { ...rows[0], passwordHash };
    }
};

// Staff roster (hr_staff). The same rows feed the HR metrics.
const employeesRepository = {
    list: () => metricsSource.hr(),
    async create({ name, department, role, salary, status, hireDate }) {
        const { rows } = await db.query(
            `INSERT INTO hr_staff (name, department, role, salary, status, hire_date)
             VALUES ($1, $2, $3, $4, $5, COALESCE($6::date, CURRENT_DATE)) RETURNING *`,
            [name, department, role, salary, status, hireDate || null]
        );
        const r = rows[0];
        return {
            id: r.id, name: r.name, department: r.department, role: r.role, salary: Number(r.salary),
            performanceRating: null, status: r.status, hireDate: iso(r.hire_date).split('T')[0], createdAt: iso(r.created_at)
        };
    }
};

module.exports = { inventoryRepository, salesRepository, metricsSource, usersRepository, employeesRepository };
