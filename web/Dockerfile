# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-workspace.yaml ./
COPY web/package.json web/
COPY api/package.json api/

# Install dependencies
RUN pnpm install --no-lockfile --config.node-linker=hoisted

# Copy source code
COPY web web

# Build
WORKDIR /app/web
RUN pnpm build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/web/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
