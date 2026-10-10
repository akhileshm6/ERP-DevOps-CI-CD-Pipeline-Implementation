// Migration runner for existing databases (hosted Postgres on Render, etc.).
//
// Docker's initdb only runs server/db/*.sql on a brand-new volume, so an
// existing database never receives new files. This runner closes that gap:
//   * applies every db/NN_*.sql file not yet recorded, in filename order,
//     each in its own transaction, and records it in schema_migrations;
//   * records a checksum, and refuses to continue if an already-applied file
//     has since been edited (fix forward with a new file instead);
//   * takes a Postgres advisory lock so two instances starting together
//     cannot migrate concurrently;
//   * refuses destructive statements (DROP, RENAME, column type changes),
//     which would break the previous image during a rollback window — see
//     docs/MIGRATION_SAFETY.md. Override only deliberately with
//     ALLOW_DESTRUCTIVE_MIGRATIONS=true.
//
// Every existing file is written idempotently (IF NOT EXISTS / ON CONFLICT),
// so running this against a database that initdb already set up is safe: the
// files re-apply as no-ops and are then recorded.
//
// Usage: `npm run migrate` (uses DATABASE_URL), or on startup via
// MIGRATE_ON_START (default on for Postgres, see server.js).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MIGRATIONS_DIR = __dirname;
const LOCK_KEY = 301301; // arbitrary, project-specific advisory lock id

const DESTRUCTIVE = [
    /\bDROP\s+(TABLE|COLUMN|SCHEMA|INDEX|CONSTRAINT|TYPE)\b/i,
    /\bRENAME\s+(TO|COLUMN)\b/i,
    /\bALTER\s+COLUMN\s+\w+\s+(SET\s+DATA\s+)?TYPE\b/i,
    /\bTRUNCATE\b/i
];

const listMigrationFiles = () => fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d+_.+\.sql$/.test(f))
    .sort();

// Errors in the migrations themselves are fatal: retrying cannot fix them.
const fatal = (message) => Object.assign(new Error(message), { fatal: true });

const checksum = (sql) => crypto.createHash('sha256').update(sql).digest('hex');

// Strip comments so a rule mentioned in prose ("never DROP a column") does not trip the check.
const stripComments = (sql) => sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

function findDestructive(sql) {
    const code = stripComments(sql);
    const hit = DESTRUCTIVE.find((re) => re.test(code));
    return hit ? code.match(hit)[0] : null;
}

async function migrate({ pool, log = console.log } = {}) {
    const db = pool || require('./pool').pool;
    const client = await db.connect();
    const applied = [];

    try {
        await client.query('SELECT pg_advisory_lock($1)', [LOCK_KEY]);
        await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
            filename   VARCHAR(255) PRIMARY KEY,
            checksum   CHAR(64) NOT NULL,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`);

        const { rows } = await client.query('SELECT filename, checksum FROM schema_migrations');
        const done = new Map(rows.map((r) => [r.filename, r.checksum]));

        for (const file of listMigrationFiles()) {
            const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
            const sum = checksum(sql);

            if (done.has(file)) {
                if (done.get(file) !== sum) {
                    throw fatal(`${file} was modified after it was applied. Do not edit applied migrations; add a new file instead.`);
                }
                continue;
            }

            const destructive = findDestructive(sql);
            if (destructive && process.env.ALLOW_DESTRUCTIVE_MIGRATIONS !== 'true') {
                throw fatal(`${file} contains a destructive statement ("${destructive}"). Migrations must be additive (docs/MIGRATION_SAFETY.md).`);
            }

            try {
                await client.query('BEGIN');
                await client.query(sql);
                await client.query('INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)', [file, sum]);
                await client.query('COMMIT');
            } catch (err) {
                await client.query('ROLLBACK');
                throw fatal(`${file} failed and was rolled back: ${err.message}`);
            }
            applied.push(file);
            log(`[migrate] applied ${file}`);
        }

        log(`[migrate] ${applied.length ? `${applied.length} applied` : 'up to date'}`);
        return applied;
    } finally {
        await client.query('SELECT pg_advisory_unlock($1)', [LOCK_KEY]).catch(() => {});
        client.release();
    }
}

module.exports = { migrate, findDestructive, listMigrationFiles };

if (require.main === module) {
    migrate()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error(`[migrate] FAILED: ${err.message}`);
            process.exit(1);
        });
}
