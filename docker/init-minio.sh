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

# Create a dedicated user for the application
echo "Creating application user 'ai-agent-app'..."
mc admin user add myminio ai-agent-app ai-agent-secret-key
mc admin policy attach myminio readwrite --user ai-agent-app

# Set bucket policy to private (no anonymous access)
echo "Setting bucket policy to private..."
mc anonymous set none myminio/"$BUCKET_NAME"

# Also try to set policy for 'super-agent' if it exists, for backward compatibility with user's error
if mc ls myminio/super-agent >/dev/null 2>&1; then
    echo "Setting policy for existing 'super-agent' bucket to private..."
    mc anonymous set none myminio/super-agent
fi

# You can add more buckets here if needed
# mc mb --ignore-existing myminio/another-bucket

echo "MinIO initialization completed successfully."
