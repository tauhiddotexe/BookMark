import hashlib

import requests
from django.conf import settings
from django.core.cache import cache
from django.db.models import Q

from api.models import Book

SEARCH_CACHE_TTL = 60 * 60
DISCOVER_CACHE_TTL = 60 * 60
VOLUME_CACHE_TTL = 60 * 60 * 24


def _cache_key(prefix, suffix):
    digest = hashlib.md5(str(suffix).encode("utf-8")).hexdigest()
    return f"google_books:{prefix}:{digest}"


def _request_json(url, *, params, timeout=8):
    response = requests.get(url, params=params, timeout=timeout)
    response.raise_for_status()
    return response.json()


def _normalize_volume(item):
    info = item.get("volumeInfo", {})
    authors = ", ".join(info.get("authors", []))
    categories = ", ".join(info.get("categories", []))
    image_links = info.get("imageLinks", {})
    volume_id = item["id"]
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
    }


def _google_cover_from_volume(volume_id, zoom):
    return f"https://books.google.com/books/content?id={volume_id}&printsec=frontcover&img=1&zoom={zoom}&source=gbs_api"


def _clean_image_url(url):
    if not url:
        return ""
    return url.replace("http://", "https://").replace("&edge=curl", "")


def _pick_cover_url(image_links, volume_id):
    for key in ["extraLarge", "large", "medium", "small", "thumbnail", "smallThumbnail"]:
        if image_links.get(key):
            return _clean_image_url(image_links[key])
    return _google_cover_from_volume(volume_id, 1)


def _pick_thumbnail_url(image_links, volume_id):
    for key in ["medium", "small", "thumbnail", "smallThumbnail", "large", "extraLarge"]:
        if image_links.get(key):
            return _clean_image_url(image_links[key])
    return _google_cover_from_volume(volume_id, 1)


def search_google_books(query):
    normalized_query = query.strip().lower()
    if not normalized_query:
        return []

    cached_results = cache.get(_cache_key("search", normalized_query))
    if cached_results is not None:
        return cached_results

    params = {"q": query, "maxResults": 12}
    if settings.GOOGLE_BOOKS_API_KEY:
        params["key"] = settings.GOOGLE_BOOKS_API_KEY
    try:
        payload = _request_json(settings.GOOGLE_BOOKS_API_BASE, params=params)
    except requests.RequestException:
        return []
    results = [_normalize_volume(item) for item in payload.get("items", [])]
    cache.set(_cache_key("search", normalized_query), results, SEARCH_CACHE_TTL)
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
            "cover_url": book.cover_url or _google_cover_from_volume(book.google_books_id, 1),
            "thumbnail_url": book.thumbnail_url or _google_cover_from_volume(book.google_books_id, 1),
        }
        for book in queryset
    ]


def sync_google_book(volume_id):
    book = Book.objects.filter(google_books_id=volume_id).first()
    if book:
        return book

    cached_volume = cache.get(_cache_key("volume", volume_id))
    params = {}
    if settings.GOOGLE_BOOKS_API_KEY:
        params["key"] = settings.GOOGLE_BOOKS_API_KEY
    if cached_volume is None:
        cached_volume = _request_json(f"{settings.GOOGLE_BOOKS_API_BASE}/{volume_id}", params=params)
        cache.set(_cache_key("volume", volume_id), cached_volume, VOLUME_CACHE_TTL)
    return Book.objects.create(**_normalize_volume(cached_volume))
