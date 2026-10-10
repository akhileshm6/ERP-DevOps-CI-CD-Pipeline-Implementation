# Hardening Pass

**Owner:** Vivek Anand · **Plan item:** Week 11

## 1. Containers run as non-root

Both images previously ran as **root** (no `USER` directive in either
Dockerfile). Verified before:

```
erp-server: uid=0(root) gid=0(root) groups=0(root),...
erp-client: uid=0(root) gid=0(root) groups=0(root),...
```

**Fixed.** `server/Dockerfile` now runs as the `node` user that ships with
`node:18-alpine`; `client/Dockerfile` switched from stock `nginx:alpine`
(which needs root to bind port 80) to `nginxinc/nginx-unprivileged:alpine`,
which runs as uid 101 and listens on 8080. The Compose client mapping changed
from `3000:80` to `3000:8080` to match. Verified after:

```
erp-server -> uid=1000(node)  gid=1000(node)  groups=1000(node)
erp-client -> uid=101(nginx)  gid=101(nginx)  groups=101(nginx)
```

Also in this pass: `npm install --only=production` became `npm ci --omit=dev`,
so the image installs exactly the lockfile that CI tested; `dumb-init` was
added as PID 1 so `SIGTERM` is forwarded and a rolling deploy drains cleanly
rather than being killed after the timeout.

## 2. `npm audit`

**Server — clean.**

```
before:  js-yaml 3.0.0-3.15.1   high      (CPU exhaustion via merge keys)
         qs      2.2.5-6.15.3   moderate  (array-limit bypass, DoS)
         2 vulnerabilities (1 moderate, 1 high)

after `npm audit fix`:  found 0 vulnerabilities
```

**Client — 33 findings (16 high), FLAGGED not fixed.** All of them come from
the `react-scripts@5.0.1` build toolchain (`webpack-dev-server`, `sockjs`,
`uuid`, `postcss` and friends). `npm audit fix --force` resolves them by
installing `react-scripts@0.0.0` — a breaking change that would destroy the
build, on Sanketh's workstream.

They do not reach production. The client image is multi-stage: the build stage
compiles the bundle, and the runtime stage copies **only** `/app/build` into
nginx. Verified by listing the running container's filesystem:

```
/usr/share/nginx/html -> 50x.html  asset-manifest.json  index.html  static
node_modules in image -> (none)
```

So the exposure is limited to a developer running `npm start` locally. The
real remedy is migrating off Create React App (to Vite, which the SP301 plan
actually specifies) — a scoped piece of work for whoever owns the client, not
something to force through in a hardening pass.

## 3. Helmet + strict CORS

Helmet is applied with HSTS enabled **only** in `staging`/`production` —
sending HSTS from a plain-HTTP local container would pin the browser to
`https://localhost` and break development. Live headers:

```
Content-Security-Policy: default-src 'self';base-uri 'self';font-src 'self' https: data:;
  form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';
  script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';
  upgrade-insecure-requests
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-site
Referrer-Policy: no-referrer
X-Content-Type-Options: nosniff
X-DNS-Prefetch-Control: off
X-Frame-Options: SAMEORIGIN
X-Powered-By: REMOVED
```

CORS reads a comma-separated allow-list from `CORS_ALLOWED_ORIGINS` and
refuses anything not on it rather than reflecting the request origin:

```
Origin: http://localhost:3000     -> HTTP 200, Access-Control-Allow-Origin: http://localhost:3000
Origin: https://evil.example.com  -> HTTP 403, no Access-Control-Allow-Origin header
```

The 403 is deliberate: a rejected origin first surfaced as a 500 because the
CORS error reached Express's default handler. An error middleware now maps it
to 403, so the status reports the actual cause.

Request bodies are capped at 1 MB.

## 4. HTTPS

Render and Railway terminate TLS at their edge and issue certificates
automatically, then forward over plain HTTP inside their network. The app
therefore sets `trust proxy` in hosted environments and redirects anything
that did not arrive over HTTPS. Verified against a container booted with
`NODE_ENV=production`:

```
X-Forwarded-Proto: http   -> HTTP/1.1 308 Permanent Redirect
                             Location: https://erp-prod.onrender.com/health

X-Forwarded-Proto: https  -> HTTP/1.1 200 OK
                             Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

**[BROWSER] Still to confirm by hand**, once the services exist: load each
deployed URL over `http://` and check it lands on `https://`.

```bash
curl -sI http://erp-staging.onrender.com/health | head -1   # expect 30x
curl -sI https://erp-staging.onrender.com/health | head -1  # expect 200
curl -sI https://erp-prod.onrender.com/health | head -1     # expect 200
```

This cannot be verified from the repository — neither environment is
provisioned yet.

## 5. Secret handling

`JWT_SECRET` previously fell back to the hardcoded string `dev_secret_key` in
every environment, so anyone who had read the repository could mint an Admin
token against the deployed app. The middleware now refuses to boot when
`NODE_ENV` is `staging` or `production` and the secret is still the default:

```
$ docker run -e NODE_ENV=production erp-server
Error: JWT_SECRET must be set in staging and production.
       Refusing to start with the development fallback key.
```

A misconfigured deploy now fails loudly at startup instead of quietly serving
forgeable sessions.
