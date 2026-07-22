#!/bin/bash
set -e

echo "========================================="
echo "  BookMark Backend Entrypoint"
echo "========================================="

echo "[1/4] Waiting for MongoDB..."
MAX_RETRIES=30
RETRY=0
MONGO_ERR=""
until python -c "
import os, sys
from pymongo import MongoClient
url = os.environ.get('MONGODB_URL', '')
if not url:
    print('MONGODB_URL is not set!', file=sys.stderr)
    sys.exit(1)
client = MongoClient(url, serverSelectionTimeoutMS=5000)
client.admin.command('ping')
print('MongoDB is ready')
" 2>&1; do
    RETRY=$((RETRY + 1))
    if [ $RETRY -ge $MAX_RETRIES ]; then
        echo "ERROR: MongoDB not available after $MAX_RETRIES retries"
        echo "  MONGODB_URL is set: $(test -n "$MONGODB_URL" && echo yes || echo no)"
        exit 1
    fi
    echo "  Waiting for MongoDB... (attempt $RETRY/$MAX_RETRIES)"
    sleep 2
done

echo "[2/4] Checking migrations..."
python manage.py makemigrations --noinput 2>&1 || echo "  makemigrations had warnings (non-fatal)"

echo "[3/4] Running MongoDB-safe migrations..."
python manage.py mongodb_migrate 2>&1 || echo "  migrations had issues (non-fatal)"

echo "[4/4] Skipping collectstatic (API-only mode)"

PORT="${PORT:-8000}"
echo "========================================="
echo "  Starting Gunicorn server on port $PORT"
echo "========================================="
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:$PORT \
    --workers 3 \
    --timeout 120 \
    --max-requests 1000 \
    --max-requests-jitter 100 \
    --keep-alive 5 \
    --access-logfile - \
    --error-logfile -
