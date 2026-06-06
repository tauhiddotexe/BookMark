"""
Centralized cache helpers for BookMark.

Provides:
  - Typed, prefixed cache keys to avoid collisions
  - Safe get/set with fallback when Redis is down (IGNORE_EXCEPTIONS handles this)
  - Explicit invalidation helpers for write-through consistency
  - Redis health check for the /health-check/ endpoint
"""
import logging
from functools import wraps

from django.core.cache import cache

logger = logging.getLogger("api.cache")

# ---------------------------------------------------------------------------
# Key factories — single source of truth for every cache key
# ---------------------------------------------------------------------------
FEED_KEY = "feed:user:{user_id}:page:{page}"
PROFILE_KEY = "profile:{username}"
STATS_KEY = "stats:global"
DISCOVER_KEY = "google_books:discover:default"

# TTLs (seconds)
FEED_TTL = 60 * 5        # 5 min
PROFILE_TTL = 60 * 10    # 10 min
STATS_TTL = 60 * 15      # 15 min


def _safe_get(key):
    """Get from cache. Returns None if cache is unavailable."""
    try:
        return cache.get(key)
    except Exception:
        logger.warning("Cache GET failed for key=%s", key, exc_info=True)
        return None


def _safe_set(key, value, timeout):
    """Set in cache. Silently fails if cache is unavailable."""
    try:
        cache.set(key, value, timeout)
    except Exception:
        logger.warning("Cache SET failed for key=%s", key, exc_info=True)


def _safe_delete(key):
    """Delete from cache. Silently fails if cache is unavailable."""
    try:
        cache.delete(key)
    except Exception:
        logger.warning("Cache DELETE failed for key=%s", key, exc_info=True)


def _safe_delete_pattern(pattern):
    """Delete keys matching a pattern. Only works with django-redis backend."""
    try:
        if hasattr(cache, "delete_pattern"):
            cache.delete_pattern(pattern)
        else:
            logger.debug("Cache backend does not support delete_pattern for %s", pattern)
    except Exception:
        logger.warning("Cache delete_pattern failed for %s", pattern, exc_info=True)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_feed(user_id, page):
    return _safe_get(FEED_KEY.format(user_id=user_id, page=page))


def set_feed(user_id, page, data):
    _safe_set(FEED_KEY.format(user_id=user_id, page=page), data, FEED_TTL)


def invalidate_feed(user_id=None):
    """Invalidate feed caches. If user_id given, only that user's feed."""
    if user_id:
        _safe_delete_pattern(f"*feed:user:{user_id}:*")
    else:
        _safe_delete_pattern("*feed:user:*")


def get_profile(username):
    return _safe_get(PROFILE_KEY.format(username=username))


def set_profile(username, data):
    _safe_set(PROFILE_KEY.format(username=username), data, PROFILE_TTL)


def invalidate_profile(username):
    _safe_delete(PROFILE_KEY.format(username=username))


def get_stats():
    return _safe_get(STATS_KEY)


def set_stats(data):
    _safe_set(STATS_KEY, data, STATS_TTL)


def invalidate_stats():
    _safe_delete(STATS_KEY)


# ---------------------------------------------------------------------------
# Redis Health Check
# ---------------------------------------------------------------------------
def redis_health():
    """Return True if Redis is reachable, False otherwise."""
    try:
        cache.set("__health_ping__", "pong", 10)
        val = cache.get("__health_ping__")
        return val == "pong"
    except Exception:
        return False
