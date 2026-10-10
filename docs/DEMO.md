# Demonstration script — SP301 ERP DevOps CI/CD Pipeline

About 12 minutes. Each step says what to show and the point it makes.
Start with the stack already running (`docker compose up -d --build`, all three
containers healthy) and http://localhost:3000 open on the login screen.

## 1. The problem (1 min, no screen)

Manual ERP releases fail in predictable ways: environments differ, untested
builds reach production, a database change breaks the version you need to roll
back to, and people can see or change things they shouldn't. This project makes
each of those failures either impossible or visible.

## 2. One command, one environment (1 min)

```bash
docker compose ps
curl -s localhost:3000/ready
```

- Three containers (database, API, dashboard), all **healthy**, built from the
  same Dockerfiles CI uses.
- `/ready` is a real database check, not a hardcoded `true`. Stop the database
  (`docker compose stop db`), call it again to show **503**, then start the
  database again.

## 3. The dashboard, by role (4 min)

Sign in with the **Admin** demo account.

1. **Overview**: *Needs attention* first (low stock, pending orders and
   transactions, failed deployments, all computed from data), then the 30-day
   business summary, then system status. Point out the **Demo data** label:
   these figures are generated sample data and the UI says so.
2. **Sales**: change the period. *No prior-period data* appears where no
   honest comparison exists, so no trend is invented.
3. **Inventory** and **People** are *current* snapshots; only new hires
   depend on the period.
4. Sign out, then sign in as **Employee**. Only Overview, Sales and
   Inventory are available. Typing `#finance` in the URL doesn't help: the API
   itself returns **403**:

   ```bash
   TOKEN=$(curl -s localhost:3000/api/auth/login -H 'Content-Type: application/json' \
     -d '{"email":"user@erp.local","password":"User123!"}' | jq -r .token)
   curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $TOKEN" localhost:3000/api/metrics/finance
   ```

5. Registration can't escalate: a self-registration that asks for
   `"role":"Admin"` returns **403**.

## 4. Feature flags without a redeploy (2 min)

1. As **Manager**, open **Finance**: the category chart is visible.
2. In a second window as **Admin**, open **Feature flags** and turn
   `new-finance-chart` **off**. The row confirms *Saved*.
3. Reload the Manager's Finance tab: the chart is gone, with a note naming the
   flag. Turn it back on and it returns. No build, no deploy. The change is in
   the audit trail (`flag_events`, `audit_log`).

## 5. The pipeline (3 min, GitHub Actions tab)

Open the latest run on the pull request:

1. **quality-and-test**: dependency audit and the API test suite.
2. **Readiness gate**: starts a real PostgreSQL, applies migrations (a second
   run is a no-op), **proves the gate can fail** (a forced failure must return
   503), boots the API, waits for `/ready`, then checks login, RBAC and data.
3. On `main`: SHA-tagged images to GHCR, then **deploy-production**, which
   needs the gate, can require a reviewer, smoke-tests the live service and
   records the outcome in deployment history.

## 6. Safe database changes and rollback (1 min)

- `server/db/migrate.js` applies numbered files once, in order, each in a
  transaction. It **refuses** `DROP`/`RENAME`/type changes and edited files.
  Show the refusal:

  ```bash
  printf 'ALTER TABLE sales DROP COLUMN region;\n' > server/db/99_bad.sql
  (cd server && DATABASE_URL=postgres://<user>:<password>@127.0.0.1:<DB_PORT>/erp_db npm run migrate)   # -> FAILED: destructive statement
  rm server/db/99_bad.sql
  ```

  Use the values from your `.env`. On Windows, use `127.0.0.1`, not `localhost`.

  Explain why: during a rollback the *old* version runs on the *new* schema,
  so schema changes must be additive.
- **Deployments** tab, *Roll back…*: it states plainly that rollback is a
  manual GitHub Actions workflow, shows the commit SHA to use, and links to it.
  Nothing pretends to be automatic.

  Locally there are no CI deployments yet. To show the table, record one the
  way CI does (clearly labelled as local):

  ```bash
  curl -s -X POST localhost:3000/api/deployments -H 'Content-Type: application/json' \
    -H "X-Deploy-Token: $DEPLOY_API_TOKEN" \
    -d '{"version":"local-demo","imageTag":"erp-server:local","commitSha":"'$(git rev-parse HEAD)'","environment":"local","status":"success","triggeredBy":"presenter","triggerType":"manual","durationSeconds":0,"testSummary":{}}'
  ```

## 7. Close (30 s)

What is verified versus pending: everything above runs locally, and the
pipeline and readiness gate run on GitHub Actions. The hosted production deploy
and rollback need the Render services and GitHub production secrets
([ENVIRONMENT.md](ENVIRONMENT.md)), so say that plainly if they aren't set up.
