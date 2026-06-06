import os
from pathlib import Path
from urllib.parse import urlparse, urlencode, urlunparse, parse_qs

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
REPO_DIR = BASE_DIR.parent
load_dotenv(REPO_DIR / ".env")

# ---------------------------------------------------------------------------
# MongoDB Connection — pooling, retries, timeouts
# ---------------------------------------------------------------------------
_raw_mongo_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017/bookmark")

# Inject production-safe connection options if not already in the URL
_mongo_defaults = {
    "retryWrites": "true",
    "w": "majority",
    "maxPoolSize": os.getenv("MONGO_MAX_POOL_SIZE", "10"),
    "minPoolSize": "1",
    "serverSelectionTimeoutMS": os.getenv("MONGO_SERVER_SELECTION_TIMEOUT", "5000"),
    "connectTimeoutMS": os.getenv("MONGO_CONNECT_TIMEOUT", "10000"),
    "socketTimeoutMS": os.getenv("MONGO_SOCKET_TIMEOUT", "20000"),
    "maxIdleTimeMS": "45000",
    "appName": "BookMark",
}

def _build_mongo_url(raw_url, defaults):
    """Merge default query params into a MongoDB URL without overriding explicit ones."""
    parsed = urlparse(raw_url)
    existing = parse_qs(parsed.query)
    merged = {k: v for k, v in defaults.items() if k not in existing}
    if existing:
        # flatten existing lists to single values for urlencode
        for k, v in existing.items():
            merged[k] = v[0] if isinstance(v, list) and len(v) == 1 else v
    new_query = urlencode(merged, doseq=True)
    return urlunparse(parsed._replace(query=new_query))

MONGODB_URL = _build_mongo_url(_raw_mongo_url, _mongo_defaults)

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "bookmark-dev-secret-key-change-me-2026")
DEBUG = os.getenv("DJANGO_DEBUG", "True").lower() == "true"
ALLOWED_HOSTS = os.getenv("DJANGO_ALLOWED_HOSTS", "127.0.0.1,localhost,testserver").split(",")
AUTH_USER_MODEL = 'api.User'

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "api",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django_mongodb_backend",
        "NAME": urlparse(MONGODB_URL).path.lstrip("/").split("?")[0] or "bookmark",
        "HOST": MONGODB_URL,
    }
}

# ---------------------------------------------------------------------------
# Redis / Cache — with connection pool, retry, graceful fallback
# ---------------------------------------------------------------------------
REDIS_URL = os.getenv("REDIS_URL")

if REDIS_URL:
    CACHES = {
        "default": {
            "BACKEND": "django_redis.cache.RedisCache",
            "LOCATION": REDIS_URL,
            "TIMEOUT": int(os.getenv("DJANGO_CACHE_TIMEOUT", "900")),
            "KEY_PREFIX": "bm",
            "OPTIONS": {
                "CLIENT_CLASS": "django_redis.client.DefaultClient",
                "SOCKET_CONNECT_TIMEOUT": 3,
                "SOCKET_TIMEOUT": 3,
                "IGNORE_EXCEPTIONS": True,  # Fallback silently if Redis is down
                "CONNECTION_POOL_KWARGS": {
                    "max_connections": int(os.getenv("REDIS_MAX_CONNECTIONS", "20")),
                    "retry_on_timeout": True,
                },
            },
        }
    }
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": os.getenv("DJANGO_CACHE_LOCATION", "bookmark-local-cache"),
            "TIMEOUT": int(os.getenv("DJANGO_CACHE_TIMEOUT", "900")),
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django_mongodb_backend.fields.ObjectIdAutoField"
SILENCED_SYSTEM_CHECKS = ["mongodb.fields.auto.E001"]

CORS_ALLOW_ALL_ORIGINS = os.getenv("CORS_ALLOW_ALL_ORIGINS", "True").lower() == "true"
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "api.authentication.FirebaseAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ),
    "DEFAULT_PAGINATION_CLASS": "api.pagination.StandardResultsSetPagination",
    "PAGE_SIZE": 10,
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle"
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/minute",
        "user": "300/minute"
    }
}

SESSION_ENGINE = "django.contrib.sessions.backends.cache"
SESSION_CACHE_ALIAS = "default"

# ---------------------------------------------------------------------------
# Security Headers
# ---------------------------------------------------------------------------
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
if not DEBUG:
    SECURE_SSL_REDIRECT = os.getenv("DJANGO_SSL_REDIRECT", "False").lower() == "true"
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True

# ---------------------------------------------------------------------------
# Structured Logging
# ---------------------------------------------------------------------------
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "[{asctime}] {levelname} {name} {message}",
            "style": "{",
        },
        "simple": {
            "format": "{levelname} {name}: {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose" if not DEBUG else "simple",
        },
    },
    "loggers": {
        "api": {
            "handlers": ["console"],
            "level": os.getenv("DJANGO_API_LOG_LEVEL", "INFO"),
            "propagate": False,
        },
        "api.authentication": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "api.firebase_utils": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "api.db": {
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },
        "api.cache": {
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },
        "django.request": {
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },
    },
}

GOOGLE_BOOKS_API_BASE = "https://www.googleapis.com/books/v1/volumes"
GOOGLE_BOOKS_API_KEY = os.getenv("GOOGLE_BOOKS_API_KEY", "")

HARDCOVER_API_URL = os.getenv("HARDCOVER_API_URL", "https://api.hardcover.app/v1/graphql")
HARDCOVER_API_KEY = os.getenv("HARDCOVER_API_KEY", "")
