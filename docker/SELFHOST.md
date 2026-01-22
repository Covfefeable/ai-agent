# Self-Hosting Guide

This document provides detailed instructions on how to deploy the AI Agent system using Docker Compose.

## 📋 Prerequisites

- [Docker Engine](https://docs.docker.com/engine/install/) (v20.10+)
- [Docker Compose](https://docs.docker.com/compose/install/) (v2.0+)

## 🚀 Quick Start

### 1. Prepare Configuration

Navigate to the `docker` directory and copy the example configuration file:

```bash
cd docker
cp .env.example .env
```

### 2. Basic Configuration

Edit the `.env` file and modify the following core configurations according to your needs:

- **PostgreSQL Database** (`POSTGRES_USER`, `POSTGRES_PASSWORD`)
- **MinIO Object Storage** (`MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`)
- **JWT Secret** (`JWT_SECRET`): **Must be changed to a strong random string**
- **Dify API Key**: Enter your Dify platform API Key

### 3. HTTPS Configuration (Recommended)

The system supports one-click HTTPS enablement.

#### 3.1 Prepare Certificates
Place your SSL certificate files (`.crt` and `.key`) in the `docker/nginx/ssl/` directory.

If you don't have a certificate, you can generate a self-signed certificate using OpenSSL (for testing purposes only):
```bash
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/server.key \
  -out nginx/ssl/server.crt \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
```

#### 3.2 Update Environment Variables
Enable HTTPS in the `.env` file:

```env
ENABLE_HTTPS=true
SERVER_NAME=your-domain.com  # Your domain or IP
SSL_CERT_FILENAME=server.crt # Your certificate filename
SSL_CERT_KEY_FILENAME=server.key # Your private key filename
WEB_SSL_PORT=443             # HTTPS port
```

### 4. Start Services

```bash
docker compose up -d --build
```

Check service status:
```bash
docker compose ps
```

### 5. Access Services

- **Web Frontend**: `http://localhost` or `https://localhost` (if HTTPS is enabled)
- **API Service**: `http://localhost/api`

---

## 📂 Directory Structure

```text
docker/
├── .env                # Environment configuration file
├── docker-compose.yml  # Service orchestration file
├── nginx/
│   ├── entrypoint.sh   # Nginx startup script (auto-generates config)
│   └── ssl/            # SSL certificates directory
├── minio/
│   ├── init-minio.sh   # MinIO initialization script
│   └── minio.license   # MinIO license file
└── volumes/            # Persistent data directory (auto-generated)
    ├── postgres_data/  # Database data
    └── minio_data/     # Object storage data
```

## 🛠️ Operations

### View Logs

```bash
# View all service logs
docker compose logs -f

# View specific service logs (e.g., web or api)
docker compose logs -f web
```

### Update Deployment

1. Pull the latest code.
2. Rebuild and restart containers:
   ```bash
   docker compose up -d --build
   ```

### Stop Services

```bash
docker compose down
```

### Data Backup
- **Database**: Backup the `docker/volumes/postgres_data` directory.
- **File Storage**: Backup the `docker/volumes/minio_data` directory.

## ❓ FAQ

**Q: How to modify the upload file size limit?**
A: Modify the `FASTIFY_MULTIPART_FILE_SIZE_MB` variable in `.env`.

**Q: Browser shows "Connection not secure"?**
A: If you are using a self-signed certificate, this is normal. Please verify the fingerprint and proceed (usually "Advanced" -> "Proceed"), or use a valid certificate issued by a CA like Let's Encrypt.

**Q: MinIO upload fails?**
A: Check if `MINIO_ENDPOINT` in `.env` is correct (it should be `minio` for internal container communication) and ensure the `volumes/minio_data` directory has write permissions.
