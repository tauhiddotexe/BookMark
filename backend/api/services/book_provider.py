import hashlib
import logging
from concurrent.futures import ThreadPoolExecutor
from django.core.cache import cache
from django.db import transaction, IntegrityError

from api.models import Book
from api.services import google_books, open_library, hardcover

logger = logging.getLogger("api.services.book_provider")

def _merge_book_data(primary: dict, secondary: dict) -> dict:
    """Merge secondary data into primary, keeping primary's truthy values."""
    if not secondary:
        return primary
        
    merged = dict(secondary)
    for k, v in primary.items():
        if v:
            merged[k] = v
        elif k not in merged:
            merged[k] = v
            
    # Prefer secondary cover if primary lacks it
    if not primary.get("cover_url") and secondary.get("cover_url"):
        merged["cover_url"] = secondary["cover_url"]
        merged["thumbnail_url"] = secondary.get("thumbnail_url") or secondary["cover_url"]

    return merged

def _enrich_with_open_library(book: dict) -> dict:
    """Enrich a single book with Open Library data, safely handling any exceptions."""
    try:
        ol_data = {}
        if book.get("isbn_13"):
            ol_data = open_library.enrich_from_isbn(book["isbn_13"])
        elif book.get("isbn_10"):
            ol_data = open_library.enrich_from_isbn(book["isbn_10"])
        elif book.get("title"):
            ol_data = open_library.enrich_from_title_author(book["title"], book.get("author", ""))
            
        return _merge_book_data(book, ol_data)
    except Exception:
        logger.exception(f"Failed to enrich book with Open Library: {book.get('title')}")
        return book

def search_books(query: str) -> list[dict]:
    """Search Google Books, fallback to Open Library, enrich results, cached centrally."""
    normalized_query = query.strip().lower()
    if not normalized_query:
        return []

    digest = hashlib.md5(normalized_query.encode("utf-8")).hexdigest()
    cache_key = f"book_provider:search:{digest}"
    
    cached = cache.get(cache_key)
    if cached is not None:
        logger.debug("Central book provider search cache hit query=%s", normalized_query)
        return cached

    logger.debug("Central book provider search cache miss query=%s", normalized_query)
    results = google_books.search_google_books(query)
    
    if not results:
        logger.info("Google Books search empty. Falling back to Open Library.")
        results = open_library.search_open_library(query, limit=12)
        # We assign pseudo-ids for importing
        for r in results:
            if not r.get("google_books_id"):
                if r.get("openlibrary_id"):
                    r["google_books_id"] = f"ol:{r['openlibrary_id']}"
                elif r.get("isbn_13"):
                    r["google_books_id"] = f"isbn:{r['isbn_13']}"
        
    # Enrich top results concurrently
    with ThreadPoolExecutor(max_workers=4) as executor:
        enriched = list(executor.map(_enrich_with_open_library, results[:6]))
    
    final_results = enriched + results[6:]
    # Cache for 1 hour (3600 seconds)
    cache.set(cache_key, final_results, 3600)
    return final_results

def discover_books() -> list[dict]:
    """Get trending from Hardcover, enrich with GB/OL data, cached centrally."""
    cache_key = "book_provider:discover"
    cached = cache.get(cache_key)
    if cached is not None:
        logger.debug("Central book provider discover cache hit")
        return cached

    logger.debug("Central book provider discover cache miss")
    hc_results = hardcover.get_trending_books(limit=18)
    
    if not hc_results:
        valid_books = google_books.discover_google_books()
    else:
        def enrich_hc(hc_book):
            try:
                gb_data = {}
                if hc_book.get("isbn_13"):
                    gb_matches = google_books.search_google_books(f"isbn:{hc_book['isbn_13']}")
                    if gb_matches:
                        gb_data = gb_matches[0]
                
                if not gb_data and hc_book.get("title"):
                    gb_matches = google_books.search_google_books(f'intitle:"{hc_book["title"]}" inauthor:"{hc_book["author"]}"')
                    if gb_matches:
                        gb_data = gb_matches[0]
                        
                if gb_data:
                    merged = _merge_book_data(gb_data, hc_book)
                    return _enrich_with_open_library(merged)
                else:
                    ol_data = open_library.enrich_from_title_author(hc_book["title"], hc_book["author"])
                    merged = _merge_book_data(hc_book, ol_data)
                    
                    if not merged.get("google_books_id"):
                        if merged.get("openlibrary_id"):
                            merged["google_books_id"] = f"ol:{merged['openlibrary_id']}"
                        elif merged.get("isbn_13"):
                            merged["google_books_id"] = f"isbn:{merged['isbn_13']}"
                        else:
                            return None
                    return merged
            except Exception:
                logger.exception(f"Failed to enrich hardcover book: {hc_book.get('title')}")
                return None

        with ThreadPoolExecutor(max_workers=6) as executor:
            valid_books = list(filter(None, executor.map(enrich_hc, hc_results)))
            
        if not valid_books:
            valid_books = google_books.discover_google_books()
            
    # Cache for 2 hours (7200 seconds)
    cache.set(cache_key, valid_books, 7200)
    return valid_books

def import_book(volume_id: str) -> Book:
    """Fetch full book data for importing. Handles Google Books and OL pseudo-IDs, with atomic ISBN-matching deduplication."""
    # Check if already imported by volume_id
    book = Book.objects.filter(google_books_id=volume_id).first()
    if book:
        logger.debug("Import book cache hit (already imported by ID) id=%s", volume_id)
        return book

    data = {}
    if volume_id.startswith("ol:"):
        olid = volume_id[3:]
        results = open_library.search_open_library(olid, limit=1)
        if results:
            data = results[0]
            data["google_books_id"] = volume_id
        else:
            logger.error("Open Library book not found on import olid=%s", olid)
            raise Exception("Open Library book not found")
            
    elif volume_id.startswith("isbn:"):
        isbn = volume_id[5:]
        data = open_library.enrich_from_isbn(isbn)
        if data:
            data["google_books_id"] = volume_id
        else:
            logger.error("ISBN not found in Open Library on import isbn=%s", isbn)
            raise Exception("ISBN not found in Open Library")
            
    else:
        # Standard Google Books sync
        gb_data = google_books.fetch_google_book_data(volume_id)
        if gb_data:
            data = _enrich_with_open_library(gb_data)
        else:
            logger.error("Google Books volume not found on import id=%s", volume_id)
            raise Exception("Google Books volume not found")
            
    # Deduplicate strictly by ISBN to prevent duplicate books (Requirement 8)
    isbn_13 = data.get("isbn_13")
    isbn_10 = data.get("isbn_10")
    
    if isbn_13:
        existing_book = Book.objects.filter(isbn_13=isbn_13).first()
        if existing_book:
            logger.info("Import book matched existing book by isbn_13=%s", isbn_13)
            # If current volume_id is a real Google Books ID but existing has a pseudo ID, update it
            if existing_book.google_books_id.startswith(("ol:", "isbn:")) and not volume_id.startswith(("ol:", "isbn:")):
                existing_book.google_books_id = volume_id
                existing_book.save(update_fields=["google_books_id", "updated_at"])
            return existing_book
            
    if isbn_10:
        existing_book = Book.objects.filter(isbn_10=isbn_10).first()
        if existing_book:
            logger.info("Import book matched existing book by isbn_10=%s", isbn_10)
            if existing_book.google_books_id.startswith(("ol:", "isbn:")) and not volume_id.startswith(("ol:", "isbn:")):
                existing_book.google_books_id = volume_id
                existing_book.save(update_fields=["google_books_id", "updated_at"])
            return existing_book

    try:
        with transaction.atomic():
            return Book.objects.create(**data)
    except IntegrityError:
        # Gunicorn thread/process-safe fallback (if created concurrently by another process)
        logger.warning("IntegrityError encountered during book import creation. Attempting fetch.")
        book = Book.objects.filter(google_books_id=volume_id).first()
        if book:
            return book
        if isbn_13:
            book = Book.objects.filter(isbn_13=isbn_13).first()
            if book:
                return book
        if isbn_10:
            book = Book.objects.filter(isbn_10=isbn_10).first()
            if book:
                return book
        raise

def local_book_results(query="", limit=12):
    return google_books.local_book_results(query, limit)
