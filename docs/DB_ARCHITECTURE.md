# BookMark Database & Caching Architecture

## Overview
BookMark uses a hybrid data storage strategy:
- **Primary Database**: MongoDB Atlas (via `django_mongodb_backend`)
- **Cache & Session Layer**: Redis
- **Authentication Source**: Firebase Auth

This architecture optimizes for read-heavy operations (feed, discovery, book search) while maintaining data integrity on write operations.

## MongoDB Connection Strategy
The application connects to MongoDB using a robust connection pool configuration to survive network blips and gracefully handle serverless scaling limits.

```python
_mongo_defaults = {
    "retryWrites": "true",
    "w": "majority",
    "maxPoolSize": "10",
    "minPoolSize": "1",
    "serverSelectionTimeoutMS": "5000",
    "connectTimeoutMS": "10000",
    "socketTimeoutMS": "20000",
    "maxIdleTimeMS": "45000",
}
```

## Schema & Data Integrity
To work effectively with MongoDB without joins, we denormalize some data (like counts). To prevent consistency issues, we use two mechanisms:

1. **Database-Level Unique Constraints**
   - `unique_follow` (follower, following)
   - `unique_review_like` (user, review)
   - `unique_shelf_entry` (user, book)

2. **Atomic Counter Updates**
   - Instead of reading the count, adding 1, and saving, we use Django's `F()` expressions.
   - Example: `Profile.objects.filter(...).update(review_count=F('review_count') + 1)`
   - This prevents race conditions when multiple concurrent requests update the same document.

## Caching Strategy

The Redis cache is implemented as a cache-aside pattern.

1. **Graceful Fallback**: If Redis becomes unavailable, `IGNORE_EXCEPTIONS=True` ensures Django falls back silently (cache misses), keeping the application alive instead of crashing.
2. **Centralized Keys**: Cache keys are managed in `api/services/cache.py` to prevent collisions.
3. **TTLs**:
   - `FEED_TTL = 5m`: User's activity feed
   - `PROFILE_TTL = 10m`: User profiles
   - `STATS_TTL = 15m`: Global platform statistics

## Multi-Source API Architecture
- **Primary Source**: Google Books (`backend/api/services/google_books.py`) handles primary metadata and IDs.
- **Enrichment & Fallback**: Open Library (`backend/api/services/open_library.py`) provides missing ISBNs, covers, and acts as a fallback for search when Google Books fails. No auth required.
- **Trending & Discovery**: Hardcover API (`backend/api/services/hardcover.py`) serves the discovery endpoint. Books are dynamically enriched with Google Books/Open Library metadata so they can be seamlessly imported.
- All external API responses are normalized into a unified dictionary schema in `book_provider.py` before hitting the Django models.

## API Optimization
- The `/api/stats/` endpoint is heavily cached to prevent 6 independent `count()` queries per visit.
- `Google Books`, `Open Library`, and `Hardcover` API responses are cached to stay within rate limits and save quota. TTLs vary per provider based on expected data volatility.
- Profile diaries are limited to the 10 most recent entries using `.order_by("-read_date")[:10]` to avoid unbounded data transfer.

## Security Hardening
- **Network**: Backend only binds to necessary internal Docker networks.
- **Resources**: `docker-compose.yml` sets explicit CPU and Memory limits for all containers.
- **Docker**: The backend runs as a non-root user (UID 1001).
- **Secrets**: The Firebase JSON file and `.env` are strictly excluded via `.gitignore`.
