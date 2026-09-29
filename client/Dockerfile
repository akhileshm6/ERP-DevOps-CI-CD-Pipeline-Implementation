# ERP dashboard image.
# Owner: Vivek Anand (Containerisation) — hardened Week 11.

# ---- build stage -------------------------------------------------------
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- runtime stage -----------------------------------------------------
# nginx-unprivileged runs as uid 101 and listens on 8080; the stock nginx
# image needs root to bind :80. Nothing from the build stage's node_modules
# is carried over — only the compiled static bundle.
FROM nginxinc/nginx-unprivileged:alpine

COPY --from=build /app/build /usr/share/nginx/html

USER 101

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
