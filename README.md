# AI Agent Project

## 目录结构
- `web`: 前端项目 (React + Vite + TypeScript)
- `api`: 后端项目 (Node.js + Fastify + TypeScript + Postgres + Drizzle)
- `docker`: 部署配置 (Docker Compose)

## 开发环境启动

### 1. 安装依赖
在根目录运行：
```bash
pnpm install
```

### 2. 启动数据库 (Docker)
```bash
cd docker
docker-compose up -d db
```
或者启动完整环境：
```bash
cd docker
docker-compose up -d
```

### 3. 本地开发

**Web:**
```bash
cd web
pnpm dev
```

**API:**
```bash
cd api
# 配置 .env (默认连接 localhost:5432)
pnpm run dev # (你需要先在 package.json 添加 dev 脚本)
```

## 构建
```bash
pnpm -r build
```
