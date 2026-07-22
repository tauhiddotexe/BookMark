import hashlib
import logging
from django.conf import settings
from django.core.cache import cache
from django.db.models import Q

from api.models import Book
from api.services.http_client import safe_request_json

logger = logging.getLogger("api.services.google_books")

SEARCH_CACHE_TTL = 60 * 60
DISCOVER_CACHE_TTL = 60 * 60
VOLUME_CACHE_TTL = 60 * 60 * 24


def _cache_key(prefix, suffix):
    digest = hashlib.md5(str(suffix).encode("utf-8")).hexdigest()
    return f"google_books:{prefix}:{digest}"


def _request_json(url, *, params, timeout=8):
    return safe_request_json("GET", url, params=params, timeout=timeout)


def _normalize_volume(item):
    info = item.get("volumeInfo", {})
    authors = ", ".join(info.get("authors", []))
    categories = ", ".join(info.get("categories", []))
    image_links = info.get("imageLinks", {})
    volume_id = item["id"]
    
    isbns = info.get("industryIdentifiers", [])
    isbn_13 = next((i["identifier"] for i in isbns if i.get("type") == "ISBN_13"), "")
    isbn_10 = next((i["identifier"] for i in isbns if i.get("type") == "ISBN_10"), "")
    
    return {
        "google_books_id": volume_id,
        "title": info.get("title", "Untitled"),
        "author": authors,
        "description": info.get("description", ""),
        "published_date": info.get("publishedDate", ""),
        "page_count": info.get("pageCount", 0),
        "categories": categories,
        "cover_url": _pick_cover_url(image_links, volume_id),
        "thumbnail_url": _pick_thumbnail_url(image_links, volume_id),
        "isbn_13": isbn_13,
        "isbn_10": isbn_10,
    }


def _google_cover_from_volume(volume_id, zoom):
    return f"https://books.google.com/books/content?id={volume_id}&printsec=frontcover&img=1&zoom={zoom}&source=gbs_api"


def _clean_image_url(url):
    if not url:
        return ""
    return url.replace("http://", "https://").replace("&edge=curl", "")


def _pick_cover_url(image_links, volume_id):
    if image_links:
        for key in ("extraLarge", "large", "medium", "thumbnail"):
            url = image_links.get(key, "")
            if url:
                return _clean_image_url(url)
    return _google_cover_from_volume(volume_id, 4)


def _pick_thumbnail_url(image_links, volume_id):
    if image_links:
        url = image_links.get("thumbnail", "") or image_links.get("smallThumbnail", "")
        if url:
            return _clean_image_url(url)
    return _google_cover_from_volume(volume_id, 2)


def search_google_books(query, **extra_params):
    normalized_query = query.strip().lower()
    if not normalized_query:
        return []

    cache_key = _cache_key("search", normalized_query + str(sorted(extra_params.items())))
    cached_results = cache.get(cache_key)
    if cached_results is not None:
        logger.debug("Google Books search cache hit query=%s", normalized_query)
        return cached_results

    logger.debug("Google Books search cache miss query=%s", normalized_query)
    params = {"q": query, "maxResults": 12, "printType": "books"}
    params.update(extra_params)
    if settings.GOOGLE_BOOKS_API_KEY:
        params["key"] = settings.GOOGLE_BOOKS_API_KEY
    
    payload = _request_json(settings.GOOGLE_BOOKS_API_BASE, params=params)
    if not payload:
        logger.warning("Google Books search request returned no payload query=%s", normalized_query)
        return []
        
    results = [_normalize_volume(item) for item in payload.get("items", [])]
    cache.set(cache_key, results, SEARCH_CACHE_TTL)
    return results


def discover_google_books():
    cached_results = cache.get(_cache_key("discover", "default"))
    if cached_results is not None:
        return cached_results

    queries = [
        "subject:fiction",
        "subject:fantasy",
        "subject:science fiction",
        "subject:mystery",
    ]
    seen_ids = set()
    results = []
    for query in queries:
        for item in search_google_books(query)[:6]:
            if item["google_books_id"] in seen_ids:
                continue
            seen_ids.add(item["google_books_id"])
            results.append(item)
            if len(results) >= 18:
                cache.set(_cache_key("discover", "default"), results, DISCOVER_CACHE_TTL)
                return results
    cache.set(_cache_key("discover", "default"), results, DISCOVER_CACHE_TTL)
    return results


def local_book_results(query="", limit=12):
    queryset = Book.objects.all()
    if query:
        queryset = queryset.filter(Q(title__icontains=query) | Q(author__icontains=query))
    queryset = queryset.order_by("-ratings_count", "title")[:limit]
    return [
        {
            "google_books_id": book.google_books_id,
            "title": book.title,
            "author": book.author,
            "description": book.description,
            "published_date": book.published_date,
            "page_count": book.page_count,
            "categories": book.categories,
            "cover_url": book.cover_url or _google_cover_from_volume(book.google_books_id, 3),
            "thumbnail_url": book.thumbnail_url or _google_cover_from_volume(book.google_books_id, 3),
            "isbn_13": book.isbn_13,
            "isbn_10": book.isbn_10,
            "openlibrary_id": book.openlibrary_id,
        }
        for book in queryset
    ]


def new_releases(limit=18):
    cache_key = _cache_key("new_releases", "v1")
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    queries = [
        "subject:fiction", "subject:fantasy", "subject:mystery",
        "subject:science+fiction", "subject:romance", "subject:nonfiction",
    ]
    seen_ids = set()
    results = []
    for q in queries:
        books = search_google_books(q, orderBy="newest")[:6]
        for item in books:
            gid = item["google_books_id"]
            if gid in seen_ids:
                continue
            seen_ids.add(gid)
            results.append(item)
            if len(results) >= limit:
                cache.set(cache_key, results, DISCOVER_CACHE_TTL)
                return results
    cache.set(cache_key, results, DISCOVER_CACHE_TTL)
    return results


def fetch_google_book_data(volume_id):
    cache_key = _cache_key("volume", volume_id)
    cached_volume = cache.get(cache_key)
    
    if cached_volume is None:
        logger.debug("Google Books volume cache miss id=%s", volume_id)
        params = {}
        if settings.GOOGLE_BOOKS_API_KEY:
            params["key"] = settings.GOOGLE_BOOKS_API_KEY
        
        cached_volume = _request_json(f"{settings.GOOGLE_BOOKS_API_BASE}/{volume_id}", params=params)
        if not cached_volume:
            logger.error("Failed to fetch volume data from Google Books id=%s", volume_id)
            raise Exception(f"Google Books volume {volume_id} not found or request failed")
            
        cache.set(cache_key, cached_volume, VOLUME_CACHE_TTL)
    else:
        logger.debug("Google Books volume cache hit id=%s", volume_id)
        
    return _normalize_volume(cached_volume)


