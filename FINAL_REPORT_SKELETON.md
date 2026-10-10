# Final Project Report — Working Skeleton

> **Reconciliation note:** The workspace contains no original proposal or written Sections 4, 5, 6, 7, or 10. `master_prompt.md` is a team implementation guide, not the proposal; the project `README.md` contains only the project title. Section headings and topics below are provisional. Replace them with the original headings and compare against the source proposal before treating any item as a confirmed proposal delta.

## 4. [Original heading required — provisional focus: System Design and Data]

### Proposed design
[Paste the approved proposal text for Section 4. Source not present in the workspace.]

### As built
- The client is a React 18 application built with Create React App. The Express server is CommonJS and exposes sales, inventory, HR, finance, health, and authentication endpoints.
- Dashboard metrics are calculated from generated arrays exported by `server/seed.js`; `server/services/metricsService.js` reads those arrays directly.
- Sales and inventory route repositories are in-memory. The `DATABASE_URL` sample and SQL files do not constitute a connected PostgreSQL implementation; no PostgreSQL driver/pool is configured in the server package or runtime.
- Registration stores users in a process-local array. Login signs a JWT with `id` and `role` claims.

### Proposal delta / reconciliation
- **Verified implementation gap:** PostgreSQL is not the backing store for dashboard data or users. The ready endpoint also returns database status as hard-coded `connected` rather than checking a database.
- **Proposal comparison:** Unconfirmed until the original Section 4 and proposal are supplied. If they promise persistent PostgreSQL-backed data or database readiness checks, those items are not delivered by the current runtime.

### Evidence
`server/server.js`, `server/services/metricsService.js`, `server/seed.js`, `server/db/repositories.js`, `server/db/schema.sql`, `server/package.json`

## 5. [Original heading required — provisional focus: Testing and Validation]

### Proposed design
[Paste the approved proposal text for Section 5. Source not present in the workspace.]

### As built
- Backend Jest/Supertest tests are present for health, inventory, metrics, and sales routes.
- The CI workflow defines a backend `npm ci` and `npm test` step. It does not define a client test/build step.
- The local test run did not reach the tests: Jest failed during configuration because `jest-circus/build/runner.js` is missing from the installed server dependencies. This is an environment/dependency issue, not a reported assertion failure.

### Proposal delta / reconciliation
- Backend test coverage and CI execution are represented in source, but successful test execution has not been verified in this workspace.
- No frontend test suite or frontend CI validation step was found. Compare with the proposal before describing frontend validation as complete.

### Evidence
`server/tests/`, `server/package.json`, `.github/workflows/ci.yml`

## 6. [Original heading required — provisional focus: CI/CD Pipeline]

### Proposed design
[Paste the approved proposal text for Section 6. Source not present in the workspace.]

### As built
- `.github/workflows/ci.yml` triggers on pushes and pull requests targeting `main`, selects Node.js 18, installs server dependencies, runs an audit command, and runs backend tests.
- On pushes to `main`, the workflow builds and pushes backend and frontend Docker images tagged `latest`, then invokes configured Render deployment hooks.
- The audit command is explicitly non-blocking (`|| true`). Image tags are not commit-specific in this workflow.

### Proposal delta / reconciliation
- A CI/CD workflow is present, but the audit step cannot fail the job, and published images use a mutable `latest` tag.
- Build, test, image-publish, and deployment success have not been demonstrated by a run log in this workspace. Avoid reporting the pipeline as verified end-to-end until a successful run is attached.

### Evidence
`.github/workflows/ci.yml`, `server/package.json`

## 7. [Original heading required — provisional focus: Containerization and Deployment]

### Proposed design
[Paste the approved proposal text for Section 7. Source not present in the workspace.]

### As built
- `server/Dockerfile` builds a Node 18 Alpine image and exposes port 5000.
- `client/Dockerfile` builds the React bundle and serves it with Nginx on port 80.
- The checked-in `docker-compose.yml` contains GitHub Actions workflow YAML rather than Compose services. It therefore does not define the frontend, backend, or database stack or their port mappings.
- The workflow triggers Render hooks, but no checked-in rollout strategy, deployment health gate, rollback procedure, or zero-downtime verification is present.

### Proposal delta / reconciliation
- Container build recipes exist; local multi-service orchestration is not implemented in the current Compose file.
- **Zero downtime is not verified.** The repository does not provide evidence of rolling/blue-green deployment, health-gated traffic switching, or a tested rollback. Treat any zero-downtime statement as a target, not a demonstrated result, unless deployment evidence is added.
- Confirm how the frontend's container port 80 maps to the documented local port 3000 once valid orchestration is provided.

### Evidence
`client/Dockerfile`, `server/Dockerfile`, `docker-compose.yml`, `.github/workflows/ci.yml`

## 10. [Original heading required — provisional focus: Results and Conclusion]

### Results to report
- [Add measured CI duration, test results, image publish/deployment run links, and environment verification.]
- [Add screenshots or reproducible checks for the dashboard, if required by the original report format.]
- [Do not claim zero-downtime operation, PostgreSQL persistence, or verified health/readiness until supported by implementation and run evidence.]

### Outstanding reconciliation items
- Obtain the original proposal and written Sections 4, 5, 6, 7, and 10; replace provisional section topics with their actual headings and reconcile sentence by sentence.
- Correct `docker-compose.yml` to valid Compose service definitions before reporting a working local multi-container stack.
- Connect runtime persistence/readiness checks to PostgreSQL if those were proposal requirements.
- Restore/install the server test dependencies and capture a successful CI/test run; add client build/test validation to CI if required.
- Attach successful deployment evidence and document the rollout/rollback mechanism before claiming zero downtime.
