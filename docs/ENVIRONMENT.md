# Environment Variables & Hosting Configuration

**Owner:** Vivek Anand — Methodology, Tools & Technologies / Containerisation & System Architecture
**Covers:** SP301 Week 3 (environments) and Week 11 (hardening)

Every variable the system reads, where it is read, and exactly what to enter in
each hosting dashboard. Values marked **[BROWSER]** must be entered by hand —
they cannot be scripted from this repo.

---

## 1. Variables the application reads

| Variable | Read by | Local value | Staging / Production value | Secret? |
|---|---|---|---|---|
| `NODE_ENV` | `server.js`, Helmet/CORS | `development` | `staging` / `production` | No |
| `PORT` | `server.js:14` | `5000` | `10000` (Render injects its own — read it, don't hardcode) | No |
| `DATABASE_URL` | `server/db/pool.js` | `postgres://erp_user:...@db:5432/erp_db` | Managed Postgres connection string from the host | **Yes** |
| `JWT_SECRET` | `middleware/auth.js`, `server.js` | `dev_secret_key` | 32-byte random hex — **different per environment** | **Yes** |
| `CORS_ALLOWED_ORIGINS` | `server.js` CORS allow-list | `http://localhost:3000` | Exact frontend origin, comma-separated, **https://** | No |
| `APP_VERSION` | `/api/deployments/current` | `dev` | Injected by CI from the git tag / run number | No |
| `COMMIT_SHA` | `/api/deployments/current` | `local` | Injected by CI as `${{ github.sha }}` | No |

Postgres container-only (local Compose; managed hosts supply `DATABASE_URL` instead):
`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`.

### Generating `JWT_SECRET`

Use a **different** secret for staging and production. Generate each with:

```bash
openssl rand -hex 32
```

If `openssl` is unavailable on Windows, use:

```powershell
-join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Max 256) })
```

---

## 2. **[BROWSER]** GitHub Environment secrets

`Repo -> Settings -> Environments`. Create two environments, exactly these names
(the workflow references them verbatim):

- `staging`
- `production` — tick **Required reviewers** and add yourself, so production
  deploys pause for approval.

Add these secrets **per environment** (`Settings -> Environments -> <env> -> Add secret`):

| Secret name | staging value | production value |
|---|---|---|
| `DATABASE_URL` | staging Postgres connection string | production Postgres connection string |
| `JWT_SECRET` | staging 32-byte hex | production 32-byte hex (**different**) |
| `RENDER_DEPLOY_HOOK` | staging service deploy-hook URL | production service deploy-hook URL |
| `APP_BASE_URL` | `https://erp-staging.onrender.com` | `https://erp-prod.onrender.com` |

Repository-level secrets (`Settings -> Secrets and variables -> Actions`) — shared by both:

| Secret name | Value |
|---|---|
| `DOCKERHUB_USERNAME` | your Docker Hub username (already in use by Ayush's job) |
| `DOCKERHUB_TOKEN` | Docker Hub access token |

`GITHUB_TOKEN` is provided automatically — do **not** create it. The GHCR publish
job authenticates with it.

---

## 3. **[BROWSER]** Render service setup

Create **two** Web Services from this repo, plus one managed Postgres each.

### Service A — staging
- Name: `erp-staging`
- Branch: `develop` (or `main` if you aren't running a develop branch)
- Runtime: Docker · Dockerfile path `./server/Dockerfile` · context `./server`
- Health check path: `/health`
- Environment variables to paste in:
  ```
  NODE_ENV=staging
  DATABASE_URL=<Internal Database URL from the staging Postgres>
  JWT_SECRET=<staging hex from step 1>
  CORS_ALLOWED_ORIGINS=https://erp-staging-client.onrender.com
  ```

### Service B — production
- Name: `erp-prod`
- Branch: `main`
- Auto-Deploy: **Off** — the pipeline triggers it via deploy hook, so the gating
  in `ci.yml` cannot be bypassed by a direct push.
- Health check path: `/health`
- Environment variables: same keys, production values, `NODE_ENV=production`.

### Getting each deploy hook
`Service -> Settings -> Deploy Hook -> Copy`. Paste into the matching
`RENDER_DEPLOY_HOOK` environment secret above. Treat it as a secret — anyone
holding the URL can trigger a deploy.

### HTTPS
Render terminates TLS and issues certificates automatically; no action needed.
Confirm by loading each URL over `https://` — see `docs/HARDENING.md` for the
verification commands.

---

## 4. Local setup

```bash
cp .env.example .env     # then edit .env and set real values
docker compose up -d
```

`.env` is gitignored. Never commit it.
