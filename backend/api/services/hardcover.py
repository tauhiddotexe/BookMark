"""
Hardcover API service — trending & popular discovery.

GraphQL API. Requires Authorization header with Bearer token.
Gracefully skips if no token configured.
"""
import hashlib
import logging

import requests
from django.conf import settings
from django.core.cache import cache

from api.services.http_client import safe_request_json

logger = logging.getLogger("api.services.hardcover")

HC_TRENDING_TTL = 60 * 60 * 2  # 2 hours
_TIMEOUT = 10

def _cache_key(prefix: str, suffix: str) -> str:
    digest = hashlib.md5(str(suffix).encode()).hexdigest()
    return f"hc:{prefix}:{digest}"

def _is_configured() -> bool:
    return bool(getattr(settings, "HARDCOVER_API_URL", None) and getattr(settings, "HARDCOVER_API_KEY", None))

def _query_graphql(query: str, variables: dict | None = None) -> dict | None:
    if not _is_configured():
        return None

    headers = {
        "Authorization": f"Bearer {settings.HARDCOVER_API_KEY}",
        "Content-Type": "application/json",
    }
    return safe_request_json(
        "POST",
        settings.HARDCOVER_API_URL,
        headers=headers,
        json={"query": query, "variables": variables or {}},
        timeout=_TIMEOUT
    )

def _normalize_hc_book(book_data: dict) -> dict:
    """Normalize Hardcover book schema to our standard BookData."""
    title = book_data.get("title", "")
    author_str = ""
    
    contributions = book_data.get("contributions", [])
    authors = [c.get("author", {}).get("name") for c in contributions if c.get("author")]
    if authors:
        author_str = ", ".join(authors[:3])
        
    isbns = []
    editions = book_data.get("editions", [])
    if editions:
        for ed in editions:
            if ed.get("isbn13"):
                isbns.append(ed.get("isbn13"))
            elif ed.get("isbn10"):
                isbns.append(ed.get("isbn10"))

    isbn_13 = next((i for i in isbns if len(i) == 13), "")
    isbn_10 = next((i for i in isbns if len(i) == 10), "")

    # Handle image url from image object
    image_data = book_data.get("image") or {}
    cover_url = image_data.get("url", "")

    return {
        "title": title,
        "author": author_str,
        "description": book_data.get("description", ""),
        "published_date": str(book_data.get("release_year", "") or ""),
        "page_count": book_data.get("pages", 0) or 0,
        "categories": "",
        "cover_url": cover_url,
        "thumbnail_url": cover_url,
        "isbn_13": isbn_13,
        "isbn_10": isbn_10,
    }


def get_trending_books(limit: int = 15) -> list[dict]:
    """Fetch trending books from Hardcover."""
    if not _is_configured():
        return []

    key = _cache_key("trending", str(limit))
    cached = cache.get(key)
    if cached is not None:
        return cached

    query = """
    query TrendingBooks($limit: Int!) {
      books(order_by: {users_count: desc}, limit: $limit) {
        id
        title
        description
        release_year
        pages
        image {
          url
        }
        contributions(limit: 3) {
          author {
            name
          }
        }
        editions(limit: 3, order_by: {users_count: desc}) {
          isbn13
          isbn10
        }
      }
    }
    """
    
    payload = _query_graphql(query, {"limit": limit})
    if not payload or "data" not in payload or "books" not in payload["data"]:
        return []

    results = [_normalize_hc_book(b) for b in payload["data"]["books"]]
    results = [r for r in results if r["title"]]
    
    cache.set(key, results, HC_TRENDING_TTL)
    logger.info("Hardcover trending fetched %d books", len(results))
    return results
