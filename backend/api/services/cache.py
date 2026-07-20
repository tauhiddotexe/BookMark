import logging

from django.core.cache import cache

logger = logging.getLogger("api.cache")


def redis_health():
    try:
        cache.set("__health_ping__", "pong", 10)
        val = cache.get("__health_ping__")
        return val == "pong"
    except Exception:
        return False
