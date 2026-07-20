#!/bin/bash
set -e

echo "========================================="
echo "  BookMark Backend — Render Startup"
echo "========================================="

echo "[1/3] Running migrations..."
python manage.py makemigrations --noinput 2>&1 || echo "  makemigrations had warnings (non-fatal)"
python manage.py mongodb_migrate 2>&1

echo "[2/3] Collecting static files..."
python manage.py collectstatic --noinput 2>&1 || echo "  collectstatic skipped"

echo "[3/3] Starting Gunicorn on port ${PORT:-8000}..."
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:${PORT:-8000} \
    --workers 3 \
    --timeout 120 \
    --max-requests 1000 \
    --max-requests-jitter 100 \
    --keep-alive 5 \
    --access-logfile - \
    --error-logfile -
