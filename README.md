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

### 2. 启动依赖服务（Postgres + MinIO AIStor）
准备环境变量（首次需要）：
```bash
cp docker/.env.example docker/.env
cp api/.env.example api/.env
```

准备 MinIO AIStor License（首次需要）：
- 从 MinIO AIStor 控制台获取 license 文件
- 保存到 `docker/minio.license`

启动开发依赖服务（DB 会映射到本机 5432，MinIO 映射到 9000/9001，会自动创建默认 bucket）：
```bash
cd docker
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db minio minio-init
```

停止（可选）：
```bash
cd docker
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
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
pnpm dev
```

### 4. 服务地址
- Web（本地开发）：Vite 默认 `http://localhost:5173`
- API（本地开发）：`http://localhost:3000`
- MinIO AIStor API：`http://localhost:9000`
- MinIO AIStor 控制台：`http://localhost:9001`（默认账号/密码见 `docker/.env`）

## 生产/部署（Docker）
在 `docker` 目录启动完整环境（DB 不会暴露到宿主机，仅在内部网络通过 `db:5432` 访问）：
```bash
cd docker
docker compose up -d
```

## 构建
```bash
pnpm -r build
```
