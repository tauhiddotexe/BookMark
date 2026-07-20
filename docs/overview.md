# BookMark — Project Overview

## Purpose

BookMark is a **private personal book journal** — a Letterboxd-for-books experience focused entirely on individual reading tracking. The application lets users search for books, log reviews with star ratings (0.5–5.0), maintain a reading diary, curate a Want to Read list, mark favorite books, and view personal reading statistics. There are **no social features** — no follows, feeds, likes, comments, notifications, or public profiles.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript 5.7, Vite 6, React Router 7 |
| **Backend** | Django 6.0, Django REST Framework 3.17, Python 3.12 |
| **Database** | MongoDB Atlas 7.0 (via `django-mongodb-backend`) |
| **Cache** | Redis 7.0 (via `django-redis`) |
| **Auth** | Firebase Authentication (email/password, Google, Apple) |
| **External APIs** | Google Books v1, Open Library, Hardcover (GraphQL) |
| **Containerization** | Docker Compose (4 services) |
| **WSGI Server** | Gunicorn 21.2 |
| **Reverse Proxy** | Nginx (frontend) |

---

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  React 19    │────▶│  Nginx       │────▶│  Django REST    │
│  + TypeScript│     │  (Port 80)   │     │  + Gunicorn     │
│  Vite 6      │     │  (Port 3000  │     │  (Port 8000)    │
└─────────────┘     │   dev)        │     └────────┬────────┘
                    └──────────────┘              │
                                                  ├──▶ MongoDB Atlas
                                                  ├──▶ Redis 7.0
                                                  └──▶ Firebase Admin SDK
                                                        │
                                                  ┌─────┴──────┐
                                                  │ Google Books│
                                                  │ Open Library│
                                                  │ Hardcover   │
                                                  └────────────┘
```

All pages require authentication (except `/auth`). The app is fully private — users only see their own data.

---

## Project Structure

```
BookMark/
├── backend/
│   ├── config/                  # Django settings, root URLConf, WSGI/ASGI
│   ├── api/
│   │   ├── models.py            # 6 models: User, Profile, Book, Review, DiaryEntry, Readlist, FavoriteBook
│   │   ├── views.py             # 8 views/viewsets
│   │   ├── serializers.py       # 10 serializers
│   │   ├── urls.py              # API routing (all private)
│   │   ├── authentication.py    # Firebase token auth
│   │   ├── firebase_utils.py    # Firebase Admin SDK init + user sync
│   │   ├── permissions.py       # IsOwner permission
│   │   ├── pagination.py        # Standard pagination
│   │   ├── admin.py             # Django admin (Book, Review, DiaryEntry, Readlist, Profile)
│   │   └── services/            # Book provider layer
│   │       ├── book_provider.py  # Search, discover, import orchestrator
│   │       ├── google_books.py   # Google Books API v1
│   │       ├── open_library.py   # Open Library API
│   │       ├── hardcover.py      # Hardcover GraphQL API
│   │       ├── cache.py          # Redis health check
│   │       └── http_client.py    # Retry HTTP client
│   ├── requirements.txt
│   ├── Dockerfile
│   └── entrypoint.sh
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Routes (all protected except /auth)
│   │   ├── pages/               # 6 pages
│   │   ├── components/          # 10 components
│   │   ├── context/             # AuthProvider (Firebase auth state)
│   │   └── lib/                 # API client, types, covers, format, hooks
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml
├── .env / .env.example
└── docs/
    ├── DB_ARCHITECTURE.md
    └── overview.md
```

---

## Data Models

| Model | Fields | Purpose |
|-------|--------|---------|
| **User** (AbstractUser) | `firebase_uid` | Authentication identity |
| **Profile** (1:1 User) | `display_name`, `avatar_url`, `bio`, `favorite_genres` | User profile info |
| **Book** | `google_books_id`, `isbn_13/10`, `title`, `author`, `description`, `published_date`, `page_count`, `categories`, `cover_url`, `thumbnail_url`, `average_rating`, `ratings_count`, `openlibrary_id`, `slug` | Book catalog |
| **Review** | FK → User, FK → Book, `rating` (0.5–5.0), `review_text` | Book reviews (multiple per book allowed) |
| **DiaryEntry** | FK → User, FK → Book, `read_date`, `rating`, `review_text`, `is_reread` | Auto-created from reviews |
| **Readlist** | FK → User, FK → Book (unique) | Want to Read list |
| **FavoriteBook** | FK → User, FK → Book (unique) | Favorite book toggle |

### Key Flows

**Review → Diary**: When a user creates a Review, a DiaryEntry is automatically created via a Django `post_save` signal. The diary entry inherits the review's rating and text, with `read_date` set to the review's creation date. If the user has previously reviewed the same book, `is_reread` is set to `true`.

**Multiple reviews**: Users can review the same book multiple times. Each subsequent review auto-creates a diary entry marked as a re-read.

---

## API Endpoints

All endpoints require authentication except `health-check`:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `auth/me/` | GET, PATCH | Current user profile |
| `me/` | GET | Full personal profile (reviews, diary, readlist, favorites, stats) |
| `stats/` | GET | Personal reading statistics |
| `health-check/` | GET | Redis health status |
| `books/` | GET | List books |
| `books/<slug>/` | GET | Book detail |
| `books/search/?q=` | GET | Search Google Books (falls back to Open Library) |
| `books/discover/` | GET | Trending from Hardcover |
| `books/import_google/` | POST | Import book by volume_id |
| `reviews/` | GET, POST | List/create reviews |
| `reviews/<id>/` | GET, PATCH, DELETE | Review CRUD |
| `diary/` | GET, POST | List/create diary entries (filters: year, rating, reread) |
| `diary/<id>/` | GET, PATCH, DELETE | Diary entry CRUD |
| `readlist/` | GET, POST | List/add readlist entries |
| `readlist/<id>/` | DELETE | Remove from readlist |
| `favorites/` | GET, POST | List/add favorite books |
| `favorites/<id>/` | DELETE | Remove favorite |

---

## User Flow

1. **Sign up / Log in** via `/auth` (email/password, Google, or Apple)
2. **Search books** via `/search` using Google Books / Open Library
3. **View book details** on `/books/:slug` — see cover, info, your reviews, diary history
4. **Add to Readlist** (Want to Read) with one click
5. **Write a review** with star rating (0.5–5.0) and optional text — auto-creates diary entry
6. **Re-read**: Reviewing the same book again auto-labels the diary entry as re-read
7. **Toggle favorites** to mark books as favorites
8. **View personal profile** on `/profile` — reading diary, reviews, readlist, favorites, stats
9. **Browse diary** on `/diary` with year/rating/re-read filters

---

## Authentication

- **Firebase Auth** handles identity (3 providers: email/password, Google, Apple)
- **Firebase Admin SDK** verifies JWT tokens server-side
- **Auto-provisioning**: First sign-in creates Django `User` + `Profile`
- All API requests require authentication (except health-check)

---

## External Services

| Service | Usage | Auth |
|---------|-------|------|
| **Firebase Auth** | User identity | Firebase project credentials |
| **Google Books API** | Primary book search + import | API key |
| **Open Library API** | Search fallback, ISBN enrichment | None required |
| **Hardcover API** | Trending/discover feed | API key (GraphQL) |

---

## What's Implemented

- Private authentication with Firebase (email, Google, Apple)
- Book search via Google Books + Open Library fallback
- Book discovery via Hardcover API
- Book import with ISBN-deduplication
- Review system with star ratings (0.5–5.0) and optional text
- Auto diary entry creation from reviews
- Auto re-read detection for multiple reviews of same book
- Want to Read list
- Favorite book toggle
- Personal reading history (profile)
- Reading diary with year/rating/reread filters
- Personal statistics (total read, this year, avg rating, favorite genres)
- Review and diary entry edit/delete
- Redis caching with graceful fallback
- Docker deployment with health checks
- CORS, security headers, throttling (100/min anon if applicable, 300/min auth)
- Structured logging

## What's Removed (Social Features)

The following social features were removed during the product pivot:

- Follow/unfollow system
- Activity feed (global + following)
- Likes and comments on reviews
- Notifications
- Public profile viewing
- Public book lists
- Community activity stream
- All related models, API endpoints, frontend pages, components, and caching

---

## Future Considerations

- Reading goals/challenges
- Year-in-review statistics
- Data export
- Multiple reading lists (beyond just Want to Read)
- Reading progress tracking (page numbers, dates)
