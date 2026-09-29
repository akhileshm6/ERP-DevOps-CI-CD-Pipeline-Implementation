# Production Deploy Gating — Evidence

**Owner:** Vivek Anand · **Plan item:** Week 4
**Extends** `.github/workflows/ci.yml` (Ayush's file) — **append-only**; the
original `quality-and-test` and `publish-and-deploy` jobs are byte-for-byte
unchanged.

## The gate

Production is protected three independent ways:

| # | Mechanism | Where |
|---|---|---|
| 1 | `if: github.ref == 'refs/heads/main' && github.event_name == 'push'` | `deploy-production` |
| 2 | `needs: readiness-gate` — a failed probe stops the chain | `deploy-production` |
| 3 | `environment: production` — GitHub holds for a required reviewer | `deploy-production` |

Job chain: `quality-and-test` -> `publish-ghcr` -> `readiness-gate` -> `deploy-production`.

## Precondition: `/ready` had to be made real first

`/ready` previously hardcoded `const isDbConnected = true` and returned
`{"ready":true,"database":"connected"}` **even with the database container
stopped**. A gate on it would have proven nothing. It now runs `SELECT 1`
through the shared `pg` pool and returns 503 on failure.

Proof the probe is genuinely wired to the database:

```
=== BEFORE: DB running ===
{"ready":true,"database":"connected"} [HTTP 200]

=== stopping database container ===
=== AFTER: DB stopped ===
{"ready":false,"database":"unreachable",
 "error":"Connection terminated due to connection timeout"} [HTTP 503]

=== /health still up (liveness unaffected, as intended) ===
{"status":"ok"} [HTTP 200]
```

`/health` staying 200 is deliberate: liveness says "the process is alive",
readiness says "it can serve traffic". Only readiness gates the deploy.

## Test: does the gate actually refuse a bad build?

A deliberately broken instance was booted with `READINESS_FORCE_FAIL=true`
(the same switch a broken branch would trip naturally) and the gate's exact
probe loop was run against both a healthy and a broken build.

```
############ CASE A: HEALTHY BUILD (:5000) ############
attempt 1 -> HTTP 200
READINESS GATE PASSED
{"ready":true,"database":"connected"}
>>> gate exit code: 0

############ CASE B: BROKEN /ready (:5001) ############
attempt 1 -> HTTP 503
attempt 2 -> HTTP 503
attempt 3 -> HTTP 503
attempt 4 -> HTTP 503
attempt 5 -> HTTP 503
READINESS GATE FAILED - refusing to promote this build
{"ready":false,"database":"unreachable",
 "error":"Readiness deliberately disabled for gate testing"}
>>> gate exit code: 1
```

**Result:** exit 1 fails the `readiness-gate` job. Because `deploy-production`
declares `needs: readiness-gate`, GitHub Actions never starts it — no traffic
is cut over to the bad instance.

### Scope of this evidence

This was executed locally against the real server image and a real Postgres
container, reproducing the workflow step's logic exactly. It has **not** yet
been observed on a live GitHub Actions run, because that requires pushing to
the shared repository. To confirm on CI: push this branch, break `/ready` on
it, and check that `deploy-production` reports *skipped* while
`readiness-gate` reports *failed*.
