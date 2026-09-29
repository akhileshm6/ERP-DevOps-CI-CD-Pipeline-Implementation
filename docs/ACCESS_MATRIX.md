# Access Control & Feature Flags — Phase 6

**Owner:** Vivek Anand (Phase 6 lead) · **Plan item:** Week 9
**Code:** `server/middleware/auth.js`, `server/routes/flags.js`
**Tests:** `server/tests/rbac-flags.test.js` — 36 passing

## Roles

The database `CHECK` constraint allows `Admin`, `Manager`, `Employee`; the
SP301 contract calls the lowest tier `User`. The middleware normalises both
spellings to one tier, so a JWT minted either way is accepted. This is why the
live response below echoes `role: Employee` for a token minted as `User`.

## Access matrix

Enforced **server-side** by `authorizeRoles(...)`. Hiding a control in the UI is
not access control — every row here is asserted by the test suite.

| Route | Admin | Manager | User |
|---|:--:|:--:|:--:|
| `GET /api/admin/dashboard` | 200 | 200 | 403 |
| `GET /api/employees` | 200 | 200 | 403 |
| `GET /api/inventory` | 200 | 200 | 200 |
| `GET /api/invoices` | 200 | 200 | 200 |
| `GET /api/reports/summary` | 200 | 200 | 403 |
| `GET /api/metrics` | 200 | 403 | 403 |
| `GET /api/flags/evaluate` | 200 | 200 | 200 |

Token handling: **401** when no token is supplied, **403** when a token is
supplied but is malformed, expired, or signed with the wrong secret.

## Hardening applied to the middleware

`JWT_SECRET` previously fell back to the hardcoded `dev_secret_key` in every
environment — anyone who had read the repository could mint an Admin token
against the deployed app. The middleware now **throws at boot** if
`NODE_ENV` is `staging` or `production` and the secret is still the default,
so a misconfigured deploy fails loudly instead of serving forgeable sessions.

## Flag evaluation

`GET /api/flags/evaluate` resolves the enabled set for the calling user's role
from the `feature_flags` table. Checks apply in order: flag disabled →
environment scope → role targeting → rollout percentage.

Partial rollouts bucket on `sha256(flagKey + ':' + userId) % 100`. Hashing
rather than randomising keeps a given user on the same side of a 50% flag
across requests — otherwise the feature would flicker on every page load —
and keying by flag stops one unlucky user being excluded from everything.

### Live output (seeded flags, running container)

```
--- Admin ---
  role   : Admin
  enabled: ['beta-dashboard', 'new-finance-chart']
  flags  : {'beta-dashboard': True, 'legacy-export': False, 'new-finance-chart': True}
--- Manager ---
  role   : Manager
  enabled: ['new-finance-chart']
  flags  : {'beta-dashboard': False, 'legacy-export': False, 'new-finance-chart': True}
--- User ---
  role   : Employee
  enabled: []
  flags  : {'beta-dashboard': False, 'legacy-export': False, 'new-finance-chart': False}
```

`new-finance-chart` targets Admin+Manager, `beta-dashboard` targets Admin only,
`legacy-export` is disabled outright — each role resolves exactly its own set.

## Out of scope here

`PATCH /api/flags/:key` (Admin-only flag mutation) is **Ayush's** Week 9 task
and is deliberately not implemented in this branch. Once it lands, flag writes
should also append to `flag_events` — the table is created and indexed in
`server/db/06_contract_tables.sql` and is ready for it.

## Reproducing

```bash
docker compose up -d
docker exec -i erp-db psql -U erp_user -d erp_db < server/db/06_contract_tables.sql
cd server
DATABASE_URL="postgres://erp_user:<pw>@localhost:5544/erp_db" npx jest tests/rbac-flags.test.js
```
