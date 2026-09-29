// PostgreSQL connection pool.
// Owner: Vivek Anand (Containerisation & System Architecture)
//
// Single shared pool for the whole API. Every route that needs the database
// imports { query } from here rather than opening its own client.

const { Pool } = require('pg');

const connectionString =
    process.env.DATABASE_URL ||
    'postgres://erp_user:erp_password@localhost:5432/erp_db';

// Managed Postgres (Render/Railway) terminates TLS with a certificate this
// container does not have in its trust store, so verification is relaxed there.
// Local Compose talks to a plaintext container and needs no TLS at all.
const useSsl = /^(staging|production)$/.test(process.env.NODE_ENV || '');

const pool = new Pool({
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
    max: Number(process.env.PG_POOL_MAX || 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
    console.error('[db] idle client error:', err.message);
});

/**
 * Run a parameterised query. Always pass values as the second argument —
 * never interpolate user input into the SQL string.
 */
const query = (text, params) => pool.query(text, params);

/**
 * Liveness probe for the database itself, used by GET /ready.
 * Resolves true only if a round-trip actually succeeds.
 */
const isHealthy = async () => {
    const res = await pool.query('SELECT 1 AS ok');
    return res.rows[0].ok === 1;
};

module.exports = { pool, query, isHealthy };
