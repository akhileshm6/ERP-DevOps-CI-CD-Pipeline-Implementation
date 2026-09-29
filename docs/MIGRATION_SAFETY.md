# Additive-Migration Safety — Rollback Window Verification

**Owner:** Vivek Anand · **Plan item:** Week 8
**Test script:** `scripts/migration-safety-check.sh`

## Why this matters

Rollback redeploys a **previous image** but does **not** roll back the database.
For the seconds or minutes of a rollback window, the old and new application
versions are both live against the *same, already-migrated* schema. If a
migration renamed a column, dropped one, or added a `NOT NULL` without a
default, the old version starts throwing the moment it is redeployed — and the
rollback that was supposed to fix an outage causes a worse one.

The rule this project follows: **every migration is additive**. New tables,
new nullable columns, new columns with defaults, new indexes. No drops, no
renames, no tightening of an existing column, in the same release that ships
the code depending on them.

`server/db/06_contract_tables.sql` obeys this. It adds the seven missing
contract tables, and where the contract name differs from what the team built
(`inventory` vs `inventory_items`, `audit_log` vs `audit_logs`) it creates the
contract table **alongside** rather than renaming. `users` gains
`password_hash` (nullable) and `is_active` (`NOT NULL DEFAULT TRUE`) — both
invisible to code that has never heard of them.

## How it was tested

Two images were built and run **simultaneously against one database**:

| Instance | Image | Source | Port |
|---|---|---|---|
| `erp-old` | `erp-server:old` | `main` @ `9ce0bc36` (pre-migration code) | 5010 |
| `erp-new` | `erp-server:new` | this branch (post-migration code) | 5011 |

Both received the same `DATABASE_URL` and the same `JWT_SECRET`, matching a
real rollback where instances of two versions briefly overlap behind one
load balancer.

```bash
docker compose up -d
docker exec -i erp-db psql -U erp_user -d erp_db < server/db/06_contract_tables.sql
bash scripts/migration-safety-check.sh
```

## Result — 20/20 passed

```
=== A. Both app versions serve traffic against the migrated schema ===
  PASS  OLD /health (got 200)      PASS  NEW /health (got 200)
  PASS  OLD /ready  (got 200)      PASS  NEW /ready  (got 200)

=== B. Auth round-trip on BOTH versions (tokens must interoperate) ===
  PASS  OLD issued a JWT
  PASS  NEW issued a JWT
  --- cross-version token acceptance (what a mid-rollback user hits) ---
  PASS  OLD token -> NEW instance (got 200)
  PASS  NEW token -> OLD instance (got 200)

=== C. Old-shape SQL still valid against the new schema ===
  PASS  pre-migration users SELECT      PASS  pre-migration users INSERT
  PASS  pre-migration employees SELECT  PASS  pre-migration inventory_items
  PASS  pre-migration audit_logs

=== D. New-shape SQL works on the same schema ===
  PASS  new users columns    PASS  contract sales    PASS  contract inventory
  PASS  contract finance     PASS  contract deployments
  PASS  contract flags

=== E. Old version writes; new version must read the same row ===
  PASS  row written old-shape, read new-shape (got Mid Rollback|Manager|is_active=true)

================= RESULT: 20 passed, 0 failed =================
```

Section **E** is the one that would catch a genuinely unsafe migration: the old
version inserts using only pre-migration columns, and the new version reads
that row back with the new columns populated by their defaults.

Section **B** covers a subtler rollback hazard — a user holding a token issued
by one version hitting the other mid-cutover. Both directions return 200, so
sessions survive a rollback rather than mass-logging-out.

## Rule for future migrations

Before merging any migration, ask: *if this deploy is rolled back five minutes
after it lands, does the previous image still work against this schema?* If the
answer is no, split it into two releases — additive change first, code that
depends on it second, cleanup (drops/renames) only once the previous version is
permanently out of rotation.
