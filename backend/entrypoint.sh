#!/bin/bash
set -e

echo "========================================="
echo "  BookMark Backend Entrypoint"
echo "========================================="

# Wait for MongoDB to be truly ready (not just accepting connections)
echo "[1/4] Waiting for MongoDB..."
MAX_RETRIES=30
RETRY=0
until python -c "
from pymongo import MongoClient
import os
client = MongoClient(os.environ.get('MONGODB_URL', 'mongodb://mongodb:27017/bookmark'), serverSelectionTimeoutMS=2000)
client.admin.command('ping')
print('MongoDB is ready')
" 2>/dev/null; do
    RETRY=$((RETRY + 1))
    if [ $RETRY -ge $MAX_RETRIES ]; then
        echo "ERROR: MongoDB not available after $MAX_RETRIES retries"
        exit 1
    fi
    echo "  Waiting for MongoDB... (attempt $RETRY/$MAX_RETRIES)"
    sleep 2
done

# Generate migrations if they don't exist
echo "[2/4] Checking migrations..."
python manage.py makemigrations --noinput 2>&1 || echo "  makemigrations had warnings (non-fatal)"

# Run the MongoDB-safe migration command
echo "[3/4] Running MongoDB-safe migrations..."
python manage.py mongodb_migrate 2>&1

# Collect static files
echo "[4/4] Collecting static files (skipped for dev/prod API mode)..."
# python manage.py collectstatic --noinput 2>&1 || echo "  collectstatic skipped"

echo "========================================="
echo "  Starting Gunicorn server on :8000"
echo "========================================="
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 3 \
    --timeout 120 \
    --max-requests 1000 \
    --max-requests-jitter 100 \
    --keep-alive 5 \
    --access-logfile - \
    --error-logfile -
