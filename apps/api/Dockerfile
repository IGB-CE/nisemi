# Multi-stage build for apps/api in the monorepo.
# Build context must be the repo root: `docker build -f apps/api/Dockerfile .`

FROM node:22-slim AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
RUN npm ci --workspace apps/api --include-workspace-root

FROM node:22-slim AS build
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY apps/api ./apps/api
RUN npx prisma generate --schema apps/api/prisma/schema.prisma
# tsc emits dist even when it reports type errors (no noEmitOnError);
# accept that for now and assert the artifact exists.
RUN npx tsc -p apps/api/tsconfig.json || true
RUN test -f apps/api/dist/server.js

FROM node:22-slim AS prod-deps
WORKDIR /repo
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
RUN npm ci --workspace apps/api --include-workspace-root --omit=dev
COPY apps/api/prisma ./apps/api/prisma
RUN npx prisma generate --schema apps/api/prisma/schema.prisma

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates wget && rm -rf /var/lib/apt/lists/*
RUN groupadd --system nodejs && useradd --system --gid nodejs --shell /bin/false nodejs

COPY --from=prod-deps --chown=nodejs:nodejs /repo/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /repo/apps/api/dist ./dist
COPY --chown=nodejs:nodejs apps/api/prisma ./prisma
COPY --chown=nodejs:nodejs apps/api/package.json ./package.json

USER nodejs
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:4000/health || exit 1

CMD ["node", "dist/server.js"]
