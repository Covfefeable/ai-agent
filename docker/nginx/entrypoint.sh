#!/bin/sh

# Default variables
SERVER_NAME=${SERVER_NAME:-localhost}
ENABLE_HTTPS=${ENABLE_HTTPS:-false}
SSL_CERT_FILENAME=${SSL_CERT_FILENAME:-server.crt}
SSL_CERT_KEY_FILENAME=${SSL_CERT_KEY_FILENAME:-server.key}

# Base configuration for locations (shared between HTTP and HTTPS)
cat > /etc/nginx/conf.d/locations.inc <<EOF
    client_max_body_size 100m;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Proxy API requests to the backend
    location /api/ {
        proxy_pass http://api:3000/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Proxy File requests to the backend
    location /files/ {
        proxy_pass http://api:3000/files/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
EOF

if [ "$ENABLE_HTTPS" = "true" ]; then
    echo "Generating HTTPS configuration..."
    cat > /etc/nginx/conf.d/default.conf <<EOF
server {
    listen 80;
    server_name $SERVER_NAME;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name $SERVER_NAME;

    ssl_certificate /etc/nginx/certs/$SSL_CERT_FILENAME;
    ssl_certificate_key /etc/nginx/certs/$SSL_CERT_KEY_FILENAME;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    include /etc/nginx/conf.d/locations.inc;
}
EOF
else
    echo "Generating HTTP configuration..."
    cat > /etc/nginx/conf.d/default.conf <<EOF
server {
    listen 80;
    server_name $SERVER_NAME;

    include /etc/nginx/conf.d/locations.inc;
}
EOF
fi

# Execute Nginx
exec nginx -g "daemon off;"
