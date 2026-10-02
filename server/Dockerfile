# ERP API image.
# Owner: Vivek Anand (Containerisation) — hardened Week 11.

FROM node:18-alpine

# dumb-init reaps zombies and forwards SIGTERM, so `docker stop` and a Render
# rolling deploy shut the process down cleanly instead of waiting out the
# 10-second kill timeout. That matters for zero-downtime deploys.
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy manifests first so `npm ci` is cached independently of source changes.
COPY package*.json ./

# npm ci (not npm install) installs exactly the lockfile, so the image matches
# what CI tested. --omit=dev keeps the dev toolchain out of the runtime image.
RUN npm ci --omit=dev && npm cache clean --force

COPY . .

# Build metadata, reported by GET /api/deployments/current. CI passes these as
# build args; local builds fall back to "dev".
ARG APP_VERSION=dev
ARG COMMIT_SHA=local
ARG GIT_BRANCH=local
ENV APP_VERSION=$APP_VERSION COMMIT_SHA=$COMMIT_SHA GIT_BRANCH=$GIT_BRANCH

# node:18-alpine ships an unprivileged `node` user (uid 1000). Run as it, and
# own the app directory so nothing needs to write as root at runtime.
RUN chown -R node:node /app
USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:5000/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
