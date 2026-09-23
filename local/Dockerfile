FROM node:22-alpine AS deps
WORKDIR /package
RUN apk add --no-cache openssl

# Keep this layer dependent on manifests only. Copying package source here made
# every UI or server edit invalidate the dependency-install cache.
COPY package.json package.json
COPY package-lock.json package-lock.json
COPY packages/core/package.json packages/core/package.json
COPY packages/server-core/package.json packages/server-core/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/config/package.json packages/config/package.json
COPY local/package.json local/package.json

RUN npm ci --no-audit

FROM node:22-alpine AS builder
WORKDIR /package
RUN apk add --no-cache openssl

ARG APP_RELEASE_VERSION=
ARG APP_BUILD_SHA=
ARG APP_VERSION=
ARG APP_VERSION_TOKEN=
ENV APP_RELEASE_VERSION=${APP_RELEASE_VERSION}
ENV APP_BUILD_SHA=${APP_BUILD_SHA}
ENV APP_VERSION=${APP_VERSION}
ENV APP_VERSION_TOKEN=${APP_VERSION_TOKEN}

COPY --from=deps /package/node_modules node_modules
COPY packages/core packages/core
COPY packages/server-core packages/server-core
COPY packages/ui packages/ui
COPY packages/config packages/config
COPY local local

WORKDIR /package/local
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ARG APP_RELEASE_VERSION=
ARG APP_BUILD_SHA=
ARG APP_VERSION=
ARG APP_VERSION_TOKEN=
ENV APP_RELEASE_VERSION=${APP_RELEASE_VERSION}
ENV APP_BUILD_SHA=${APP_BUILD_SHA}
ENV APP_VERSION=${APP_VERSION}
ENV APP_VERSION_TOKEN=${APP_VERSION_TOKEN}
RUN apk add --no-cache openssl
RUN mkdir -p /data && chown 1000:1000 /data

COPY --from=builder /package/local/.next/standalone ./
COPY --from=deps /package/node_modules local/node_modules
COPY --from=builder /package/local/.next/static local/.next/static
COPY --from=builder /package/local/public local/public
COPY --from=builder /package/local/prisma.config.ts local/prisma.config.ts
COPY --from=builder /package/local/prisma local/prisma
COPY --from=builder /package/local/scripts/migrate-sqlite.mjs local/scripts/migrate-sqlite.mjs
COPY --from=builder /package/local/scripts/import-postgres-to-sqlite.mjs local/scripts/import-postgres-to-sqlite.mjs
RUN if [ ! -e node_modules ] && [ -d local/node_modules ]; then ln -s local/node_modules node_modules; fi
USER 1000:1000

WORKDIR /app/local
EXPOSE 3000
CMD ["sh", "-c", "node scripts/migrate-sqlite.mjs && node server.js"]
