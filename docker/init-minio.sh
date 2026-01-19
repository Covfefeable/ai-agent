#!/bin/sh
set -e

# Wait for MinIO to be ready (although depends_on condition: service_healthy handles this mostly)
# Adding a small loop just in case or for verbose logging
echo "Waiting for MinIO to be ready..."

# Configure mc alias
# We use 'myminio' as the alias name
echo "Configuring MinIO client..."
mc alias set myminio http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"

# Create bucket if it doesn't exist
BUCKET_NAME=${MINIO_BUCKET_NAME:-files}
echo "Creating bucket: $BUCKET_NAME"
mc mb --ignore-existing myminio/"$BUCKET_NAME"

# You can add more buckets here if needed
# mc mb --ignore-existing myminio/another-bucket

echo "MinIO initialization completed successfully."
