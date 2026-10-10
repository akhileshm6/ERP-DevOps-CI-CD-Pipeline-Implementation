-- Contract tables required by the SP301 shared naming contract.
-- Owner: Vivek Anand (Week 7/9 catch-up).
--
-- ADDITIVE ONLY. Nothing here drops, renames or alters a column that an
-- existing version of the application reads. Every statement is guarded with
-- IF NOT EXISTS, and every column added to an existing table is nullable or
-- carries a DEFAULT, so an older build that has never heard of these tables
-- keeps running unchanged against this schema. That property is what makes a
-- rollback safe: see docs/MIGRATION_SAFETY.md.
--
-- Teammate-owned tables already in the database (users, departments,
-- employees, inventory_items, sales_orders, invoices, audit_logs) are left
-- in place. Where the contract name differs from what was built, the contract
-- table is added alongside rather than renaming theirs.

-- ---------------------------------------------------------------- users
-- Contract asks for password_hash and is_active. The existing table has
-- `password` and no active flag. Added as nullable / defaulted columns so
-- current code that writes `password` is unaffected.
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- ---------------------------------------------------------------- sales
CREATE TABLE IF NOT EXISTS sales (
    id          SERIAL PRIMARY KEY,
    order_date  DATE NOT NULL DEFAULT CURRENT_DATE,
    product_id  INT,
    quantity    INT NOT NULL DEFAULT 0,
    amount      NUMERIC(12, 2) NOT NULL DEFAULT 0,
    region      VARCHAR(80)
);
CREATE INDEX IF NOT EXISTS idx_sales_order_date ON sales (order_date);
CREATE INDEX IF NOT EXISTS idx_sales_region ON sales (region);

-- ------------------------------------------------------------ inventory
-- Contract name is `inventory`; the team built `inventory_items`. Added
-- alongside; inventory_items is untouched.
CREATE TABLE IF NOT EXISTS inventory (
    id            SERIAL PRIMARY KEY,
    sku           VARCHAR(64) UNIQUE NOT NULL,
    product_name  VARCHAR(150) NOT NULL,
    warehouse     VARCHAR(80),
    quantity      INT NOT NULL DEFAULT 0,
    reorder_level INT NOT NULL DEFAULT 10
);

-- ------------------------------------------------------- finance_entries
CREATE TABLE IF NOT EXISTS finance_entries (
    id         SERIAL PRIMARY KEY,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    category   VARCHAR(80) NOT NULL,
    type       VARCHAR(20) NOT NULL CHECK (type IN ('credit', 'debit')),
    amount     NUMERIC(12, 2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_finance_entry_date ON finance_entries (entry_date);

-- ----------------------------------------------------------- deployments
-- Akhilesh's workstream owns the data that fills this. Created here only so
-- the rollback and retention work has the table it depends on; population
-- from CI stays his.
CREATE TABLE IF NOT EXISTS deployments (
    id               SERIAL PRIMARY KEY,
    version          VARCHAR(80),
    image_tag        VARCHAR(255),
    commit_sha       VARCHAR(64),
    environment      VARCHAR(32) NOT NULL DEFAULT 'staging',
    status           VARCHAR(32) NOT NULL DEFAULT 'pending',
    triggered_by     VARCHAR(120),
    trigger_type     VARCHAR(32),
    started_at       TIMESTAMPTZ DEFAULT NOW(),
    completed_at     TIMESTAMPTZ,
    duration_seconds INT,
    test_summary     TEXT
);
CREATE INDEX IF NOT EXISTS idx_deployments_env_started ON deployments (environment, started_at DESC);

-- --------------------------------------------------------- feature_flags
CREATE TABLE IF NOT EXISTS feature_flags (
    id              SERIAL PRIMARY KEY,
    key             VARCHAR(80) UNIQUE NOT NULL,
    description     TEXT,
    enabled         BOOLEAN NOT NULL DEFAULT FALSE,
    rollout_percent INT NOT NULL DEFAULT 0 CHECK (rollout_percent BETWEEN 0 AND 100),
    target_roles    TEXT[] NOT NULL DEFAULT '{}',
    environment     VARCHAR(32) NOT NULL DEFAULT 'all',
    updated_by      VARCHAR(120),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------- flag_events
-- Audit trail for flag changes (Akhilesh owns the wider audit story).
CREATE TABLE IF NOT EXISTS flag_events (
    id         SERIAL PRIMARY KEY,
    flag_key   VARCHAR(80) NOT NULL,
    actor      VARCHAR(120),
    from_state JSONB,
    to_state   JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_flag_events_key_created ON flag_events (flag_key, created_at DESC);

-- ------------------------------------------------------------- audit_log
-- Contract name is singular; the team built `audit_logs`. Added alongside.
CREATE TABLE IF NOT EXISTS audit_log (
    id         SERIAL PRIMARY KEY,
    actor      VARCHAR(120),
    action     VARCHAR(255) NOT NULL,
    module     VARCHAR(64),
    details    JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------- seeding
-- Two flags so RBAC/flag evaluation has something to resolve on a fresh boot.
INSERT INTO feature_flags (key, description, enabled, rollout_percent, target_roles, environment, updated_by)
VALUES
    ('new-finance-chart', 'Week 9 demo flag: renders the new Finance chart', TRUE, 100, ARRAY['Admin','Manager'], 'all', 'seed'),
    ('beta-dashboard',    'Experimental dashboard layout, Admin only',       TRUE, 100, ARRAY['Admin'],           'all', 'seed'),
    ('legacy-export',     'Deprecated CSV export, disabled everywhere',       FALSE, 0,  ARRAY['Admin'],           'all', 'seed')
ON CONFLICT (key) DO NOTHING;
