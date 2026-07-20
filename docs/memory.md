# BookMark — Development Memory

## Session Context

This file tracks ongoing development context so returning sessions don't lose knowledge. Update whenever the project direction, architecture, or known issues change.

---

## Current Product Vision

**Private personal book journal** (Letterboxd for books, no social features). Users sign up, search books, review them with star ratings, auto-generate diary entries, maintain a Want to Read list, favorite books, and view personal reading statistics. Everything is private — no follows, feeds, likes, comments, notifications, or public profiles.

---

## Tech Stack

| Layer | Technology | Status |
|-------|-----------|--------|
| Frontend | React 19, TypeScript 5.7, Vite 6, React Router 7 | Stable |
| Backend | Django 6.0, DRF 3.17, Python 3.12 | Stable |
| Database | MongoDB Atlas 7.0 (via django-mongodb-backend) | Live |
| Cache | Redis 7.0 (via django-redis, IGNORE_EXCEPTIONS=True) | Configured |
| Auth | Firebase Auth (email/password, Google, Apple) | Live |
| External APIs | Google Books v1 (primary), Open Library (fallback), Hardcover (discover) | Live |
| WSGI | Gunicorn 21.2 | Prod |
| Proxy | Nginx (frontend Docker) | Prod |

---

## Architecture

- **Docker Compose**: mongodb, redis, backend (Gunicorn), frontend (Nginx)
- **Network**: `bookmark_net` bridge, all services internal
- **Backend auth**: Firebase Admin SDK verifies JWTs → auto-provisions Django User + Profile
- **Frontend auth**: Firebase client SDK → onIdTokenChanged → syncUser() to Django backend
- **API gating**: Requests blocked until auth hydration completes (prevents auth-retry storms)
- **Cache**: Redis cache-aside pattern, graceful fallback to DB if Redis down
- **Book data**: Google Books primary → Open Library enrichment → Hardcover for discovery

---

## Data Models

### Current Models (7 total)

**User** (AbstractUser + firebase_uid)
- Fields: id (ObjectIdAutoField), firebase_uid, + all AbstractUser fields
- Profile auto-created on first sign-in via post_save signal

**Profile** (1:1 → User)
- display_name, avatar_url, bio, favorite_genres (JSON)
- No social counts

**Book**
- google_books_id (unique), isbn_13, isbn_10, openlibrary_id
- title, slug (auto-generated from title+author), author
- description, published_date, page_count, categories
- cover_url, thumbnail_url
- average_rating, ratings_count (denormalized, refreshed via refresh_metrics())

**Review** (FK → User, FK → Book)
- rating (Decimal, 0.5–5.0, 0.5 increments)
- review_text (Text)
- No likes/comments counts
- Multiple reviews per user+book allowed (no unique constraint)

**DiaryEntry** (FK → User, FK → Book)
- read_date (Date), is_reread (Boolean, auto-set)
- rating (nullable), review_text
- Auto-created by post_save signal on Review

**Readlist** (FK → User, FK → Book)
- UniqueConstraint on (user, book)
- Simple Want to Read tracker

**FavoriteBook** (FK → User, FK → Book)
- UniqueConstraint on (user, book)
- Favorite toggle

### Key Signals
- `create_diary_entry_from_review` (Review post_save): Creates DiaryEntry with review data. Sets is_reread=True if user has previous reviews of same book.
- `create_user_profile` (User post_save): Creates Profile on user creation.
- `save_user_profile` (User post_save): Best-effort profile sync.

### Removed Models
Follow, Comment, ReviewLike, Notification, ShelfEntry, BookList, BookListItem, BookListLike, Activity

---

## API Endpoints

All require auth (except health-check):

| Endpoint | Methods | Purpose |
|----------|---------|---------|
| `auth/me/` | GET, PATCH | Current user identity |
| `me/` | GET | Full profile + reviews + diary + readlist + favorites + stats |
| `stats/` | GET | Personal stats (total read, this year, avg rating, genres) |
| `health-check/` | GET | Redis ping |
| `books/` | GET | List books |
| `books/<slug>/` | GET | Book detail |
| `books/search/?q=` | GET | External search (Google Books → Open Library) |
| `books/discover/` | GET | Trending (Hardcover → enriched) |
| `books/import_google/` | POST | Import by volume_id, dedup by ISBN |
| `reviews/` | GET, POST | List user's reviews / create review → auto diary |
| `reviews/<id>/` | GET, PATCH, DELETE | Review CRUD |
| `diary/` | GET, POST | List (filters: book, year, rating, is_reread) / create |
| `diary/<id>/` | GET, PATCH, DELETE | Diary entry CRUD |
| `readlist/` | GET, POST | List / add |
| `readlist/<id>/` | DELETE | Remove |
| `favorites/` | GET, POST | List / add |
| `favorites/<id>/` | DELETE | Remove |

---

## Frontend Pages & Routes

All routes under `<ProtectedRoute>` except `/auth`, `/login`, `/signup`:

| Route | Page | Purpose |
|-------|------|---------|
| `/` | HomePage | Dashboard: stats cards, recent diary entries, readlist preview |
| `/search` | SearchPage | Debounced search input + discover grid |
| `/books/:slug` | BookPage | Book hero, review form, review list, diary history, readlist + favorite toggles |
| `/profile` | ProfilePage | Personal reading history with tabs (Diary, Reviews, Readlist, Favorites) + stats + genres |
| `/diary` | DiaryPage | All diary entries grouped by month, filters (year, rating, re-read), inline edit/delete |
| `/auth` | AuthPage | Login/signup mode toggling |

---

## Key Data Flows

### Review → Diary
1. User clicks "Write a Review" on BookPage
2. POST `/reviews/` with book_id, rating, review_text
3. Backend signal auto-creates DiaryEntry (read_date = review.created_at.date())
4. If user has existing reviews for same book → is_reread = True
5. Frontend refreshes to show new review + diary entry

### Book Import
1. Search returns books from Google Books (with existing_slug if already in DB)
2. If slug is `import-<google_books_id>`, BookPage shows "Import Book" button
3. POST `/books/import_google/` with volume_id → creates Book in DB, returns slug
4. Frontend navigates to real `/books/<slug>` after import

### BookPage State
- Loads: book detail, user's reviews, diary entries, readlist entries, favorites
- All fetched in parallel with Promise.all
- After mutations (review, readlist, favorite), calls refresh() which re-fetches everything

---

## Caching Strategy

- **Redis**: Cache-aside with `IGNORE_EXCEPTIONS=True` for graceful degradation
- **Book provider search**: 1h TTL, keyed by MD5 of query
- **Book provider discover**: 2h TTL
- **Frontend API client**: 5min in-memory cache + request deduplication
- **Cache invalidated** on mutations via `clearApiCache()` (follow, review, diary, readlist, favorite actions)

---

## Known Issues & Technical Debt

### Bugs
- None currently tracked

### Status After Audit (July 2026)
All 11 audit findings resolved:
- **HIGH**: seed_data.py User import fixed (was using django.contrib.auth.models.User instead of get_user_model)
- **MEDIUM**: Hardcoded year 2026 replaced with `date.today().year` in both views.py and serializers.py
- **LOW**: Removed dead functions (`sync_google_book`, `_safe_get/set/delete`), dead class (`IsOwner`), orphaned file (`signals.py`), redundant `get_queryset` override, duplicate `Count` import, deprecated `default_app_config`, unused `localUser` destructuring, redundant `displayResults` passthrough
- **SPOILER SYSTEM**: Fully removed from all layers (models, serializers, types, API, pages, docs)

### Remaining Code Smells
- `frontend/src/index.css` at 1565+ lines — contains ~7 blocks of orphaned social-feature CSS classes (`.activity-stack`, `.comment-preview`, `.follows-you-badge`, `.list-card`, `.profile-stats-visual`, `.feed`, `.topbar`). Cleanup deferred as visual-only.
- `api.ts` (API client) contains both HTTP infrastructure and API functions — could separate
- `firebase_utils.py` handles init + token verify + user sync — SRP violation
- No test coverage at all (`tests.py` is placeholder)
- BookPage imports many API functions directly — could benefit from a custom hook
- SearchPage handles import flow via slug prefix `import-` — fragile coupling

### Missing Features
- No infinite scroll / pagination on diary page
- No image upload for avatar
- No reading goals or challenges
- No data export
- No year-in-review page

---

## Environment

Atlastic Connect MongoDB URI configured. Firebase project `bookmark-6cbb0` with email/password, Google, and Apple auth providers. Keys in `.env` (gitignored).

### Required .env vars
```
MONGODB_URL, DJANGO_SECRET_KEY, DJANGO_DEBUG
FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_JSON
VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET, VITE_FIREBASE_MESSAGING_SENDER_ID, VITE_FIREBASE_APP_ID
GOOGLE_BOOKS_API_KEY, HARDCOVER_API_KEY (optional)
```

---

## Files to Remember

### Backend Core
- `backend/api/models.py` — All 7 models + signals
- `backend/api/views.py` — 8 views/viewsets
- `backend/api/serializers.py` — 10 serializers
- `backend/api/urls.py` — API routing
- `backend/api/firebase_utils.py` — Firebase Admin SDK + user sync
- `backend/api/authentication.py` — DRF Firebase auth backend
- `backend/api/services/book_provider.py` — Book search/discover/import orchestrator

### Frontend Core
- `frontend/src/lib/api.ts` — API client (all endpoints)
- `frontend/src/lib/types.ts` — TypeScript interfaces
- `frontend/src/pages/BookPage.tsx` — Most complex page (review, diary, readlist, favorites)
- `frontend/src/pages/DiaryPage.tsx` — Filtered diary with inline editing
- `frontend/src/pages/ProfilePage.tsx` — Personal reading history with tabs
- `frontend/src/context/auth-context.tsx` — Firebase auth state management

---

## Development Commands

```bash
# Backend (requires venv at backend/venv/)
cd backend
python manage.py runserver

# Frontend dev
cd frontend
npm run dev

# Full stack via Docker
docker compose up --build

# Build frontend
cd frontend && npm run build

# Seed demo data
cd backend && python manage.py seed_data
```
