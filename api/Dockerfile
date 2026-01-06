# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-workspace.yaml ./
COPY api/package.json api/

# Install dependencies
RUN pnpm install --frozen-lockfile --filter api...

# Copy source code
COPY api api

# Build
WORKDIR /app/api
RUN pnpm tsc

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/api/dist ./dist
COPY --from=builder /app/api/package.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["node", "dist/index.js"]
