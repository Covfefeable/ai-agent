# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

ARG NPM_REGISTRY=https://registry.npmmirror.com

# Install pnpm
RUN npm config set registry $NPM_REGISTRY && npm install -g pnpm

# Copy package files
COPY package.json pnpm-workspace.yaml ./
COPY api/package.json api/
COPY web/package.json web/

# Install dependencies
RUN pnpm config set registry $NPM_REGISTRY && pnpm install --no-lockfile --config.node-linker=hoisted

# Copy source code
COPY api api

# Build
WORKDIR /app/api
RUN pnpm build

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/api/dist ./dist
COPY --from=builder /app/api/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Copy source and config for migrations
COPY --from=builder /app/api/src ./src
COPY --from=builder /app/api/drizzle.config.ts ./
COPY --from=builder /app/api/tsconfig.json ./
COPY --from=builder /app/api/entrypoint.sh ./

RUN chmod +x ./entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "dist/index.js"]
