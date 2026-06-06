"""
Open Library API service — metadata enrichment + cover fallback.

Used as secondary provider when Google Books data is missing or incomplete.
Endpoints:
  - Search: https://openlibrary.org/search.json
  - Works:  https://openlibrary.org/works/<OLID>.json
  - Covers: https://covers.openlibrary.org/b/<key>/<value>-<size>.jpg

All responses are normalized to the shared BookData dict schema.
No auth required. Aggressive caching to stay within free-tier rate limits.
"""
import hashlib
import logging

import requests
from django.conf import settings
from django.core.cache import cache

from api.services.http_client import safe_request_json

logger = logging.getLogger("api.services.open_library")

# ---------------------------------------------------------------------------
# Cache TTLs
# ---------------------------------------------------------------------------
OL_SEARCH_TTL = 60 * 60          # 1 hour
OL_VOLUME_TTL = 60 * 60 * 24     # 24 hours
OL_ENRICH_TTL = 60 * 60 * 6      # 6 hours

# ---------------------------------------------------------------------------
# API bases
# ---------------------------------------------------------------------------
OL_SEARCH_BASE = "https://openlibrary.org/search.json"
OL_WORKS_BASE = "https://openlibrary.org/works"
OL_COVERS_BASE = "https://covers.openlibrary.org/b"

# Request timeout (seconds) — Open Library can be slow
_TIMEOUT = 8


def _cache_key(prefix: str, suffix: str) -> str:
    digest = hashlib.md5(str(suffix).encode()).hexdigest()
    return f"ol:{prefix}:{digest}"


def _safe_get(url: str, params: dict | None = None) -> dict | None:
    return safe_request_json("GET", url, params=params, timeout=_TIMEOUT)


# ---------------------------------------------------------------------------
# Cover URL helpers
# ---------------------------------------------------------------------------

def ol_cover_url(identifier_type: str, value: str, size: str = "M") -> str:
    """
    Build an Open Library cover URL.
    identifier_type: 'isbn', 'olid', 'id'
    size: 'S', 'M', 'L'
    """
    return f"{OL_COVERS_BASE}/{identifier_type}/{value}-{size}.jpg"


def get_cover_url_for_isbn(isbn: str) -> str:
    """Return a medium Open Library cover URL from an ISBN."""
    if not isbn:
        return ""
    return ol_cover_url("isbn", isbn, "M")


def get_cover_url_for_olid(olid: str) -> str:
    """Return a medium Open Library cover URL from an OL Work/Edition ID."""
    if not olid:
        return ""
    # Strip /works/ prefix if present
    clean = olid.replace("/works/", "").replace("/", "")
    return ol_cover_url("olid", clean, "M")


# ---------------------------------------------------------------------------
# Normalize a single Open Library search doc → shared BookData dict
# ---------------------------------------------------------------------------

def _normalize_ol_doc(doc: dict) -> dict:
    """
    Convert a single Open Library search result doc to our normalized schema.
    Fields that are missing are returned as empty/zero so callers can merge.
    """
    key = doc.get("key", "")                              # e.g. /works/OL12345W
    olid = key.replace("/works/", "").strip("/") if key else ""

    # ISBNs
    isbns = doc.get("isbn", [])
    isbn_13 = next((i for i in isbns if len(i) == 13), "")
    isbn_10 = next((i for i in isbns if len(i) == 10), "")

    # Authors
    authors = doc.get("author_name", [])
    author_str = ", ".join(authors[:3])  # cap at 3

    # Subjects / categories
    subjects = doc.get("subject", [])
    categories = ", ".join(subjects[:5]) if subjects else ""

    # Cover — try ISBN first, then OLID
    cover_url = ""
    if isbn_13:
        cover_url = get_cover_url_for_isbn(isbn_13)
    elif isbn_10:
        cover_url = get_cover_url_for_isbn(isbn_10)
    elif olid:
        cover_url = get_cover_url_for_olid(olid)

    return {
        "openlibrary_id": olid,
        "title": doc.get("title", ""),
        "author": author_str,
        "description": "",           # not in search results; fetch via works if needed
        "published_date": str(doc.get("first_publish_year", "")),
        "page_count": doc.get("number_of_pages_median", 0) or 0,
        "categories": categories,
        "cover_url": cover_url,
        "thumbnail_url": cover_url,  # same URL, frontend picks size
        "isbn_13": isbn_13,
        "isbn_10": isbn_10,
        # google_books_id intentionally absent — provider layer merges
    }


# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------

def search_open_library(query: str, limit: int = 10) -> list[dict]:
    """
    Search Open Library. Returns list of normalized BookData dicts.
    Results are cached for OL_SEARCH_TTL seconds.
    """
    if not query:
        return []

    normalized = query.strip().lower()
    key = _cache_key("search", f"{normalized}:{limit}")
    cached = cache.get(key)
    if cached is not None:
        logger.debug("OL search cache hit query=%s", normalized)
        return cached

    payload = _safe_get(OL_SEARCH_BASE, params={"q": query, "limit": limit, "fields": (
        "key,title,author_name,first_publish_year,isbn,"
        "subject,number_of_pages_median,cover_i"
    )})
    if not payload:
        return []

    docs = payload.get("docs", [])
    results = [_normalize_ol_doc(doc) for doc in docs]
    cache.set(key, results, OL_SEARCH_TTL)
    logger.info("OL search query=%s results=%d", query, len(results))
    return results


# ---------------------------------------------------------------------------
# Enrichment — given ISBN or OL ID, fetch richer metadata
# ---------------------------------------------------------------------------

def enrich_from_isbn(isbn: str) -> dict:
    """
    Fetch OL metadata for a single ISBN. Returns partial BookData dict.
    Missing fields are empty so callers merge with primary data.
    """
    if not isbn:
        return {}

    key = _cache_key("isbn", isbn)
    cached = cache.get(key)
    if cached is not None:
        return cached

    payload = _safe_get(OL_SEARCH_BASE, params={
        "q": f"isbn:{isbn}",
        "limit": 1,
        "fields": "key,title,author_name,first_publish_year,isbn,subject,number_of_pages_median",
    })
    if not payload or not payload.get("docs"):
        cache.set(key, {}, OL_ENRICH_TTL)
        return {}

    result = _normalize_ol_doc(payload["docs"][0])
    cache.set(key, result, OL_ENRICH_TTL)
    logger.info("OL enrich isbn=%s olid=%s", isbn, result.get("openlibrary_id"))
    return result


def enrich_from_title_author(title: str, author: str = "") -> dict:
    """
    Attempt OL enrichment by title+author query. Best-effort — can return {}.
    Used to fill missing cover/ISBN when Google Books data is incomplete.
    """
    if not title:
        return {}

    query = f"{title} {author}".strip()
    key = _cache_key("enrich_ta", query.lower())
    cached = cache.get(key)
    if cached is not None:
        return cached

    results = search_open_library(query, limit=1)
    result = results[0] if results else {}
    cache.set(key, result, OL_ENRICH_TTL)
    return result
