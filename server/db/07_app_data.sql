-- 07_app_data.sql — columns and tables the dashboard reads from Postgres.
-- Additive only (see docs/MIGRATION_SAFETY.md): new nullable/defaulted
-- columns and one new table, so the previous image keeps working against
-- this schema during a rollback window. Demo rows are inserted by the API on
-- first boot (server/db/bootstrap.js), not here, so dates stay relative to
-- "now" and the 7d/30d dashboard ranges always have data.

-- inventory_items: the dashboard groups stock by category.
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS category VARCHAR(80) NOT NULL DEFAULT 'General';

-- finance_entries: the finance view lists descriptions and pending items and
-- filters by timestamp, not just date.
ALTER TABLE finance_entries ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE finance_entries ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'Completed';
ALTER TABLE finance_entries ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- hr_staff: HR metrics need department, performance and status per person.
-- `employees` is keyed to login accounts (users.id), and most staff never log
-- in, so the reporting roster lives in its own table.
CREATE TABLE IF NOT EXISTS hr_staff (
    id                 SERIAL PRIMARY KEY,
    name               VARCHAR(150) NOT NULL,
    department         VARCHAR(80) NOT NULL,
    role               VARCHAR(120) NOT NULL,
    salary             NUMERIC(12, 2) NOT NULL DEFAULT 0,
    performance_rating NUMERIC(3, 1),
    status             VARCHAR(20) NOT NULL DEFAULT 'Active',
    hire_date          DATE,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hr_staff_created ON hr_staff (created_at);
CREATE INDEX IF NOT EXISTS idx_sales_orders_created ON sales_orders (created_at);
