#!/bin/sh
set -e

# Run database migrations
echo "Running database migrations..."
npm run db:push

# Start the application
echo "Starting application..."
exec "$@"
