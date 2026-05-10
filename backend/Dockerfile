FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . .

# Run migrations and start gunicorn
# In a real strict production environment, migrations might be run separately,
# but for a self-contained compose setup, this is practical.
CMD python manage.py migrate && gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 3
