<p align="center">
  <img src="https://img.shields.io/badge/BOOKMARK-00c46a?style=for-the-badge&labelColor=07110d" alt="BookMark">
</p>

<p align="center">
  A social book tracking platform — log reads, rate books, write reviews, discover what's trending.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19">
  <img src="https://img.shields.io/badge/Django-6-092E20?logo=django&logoColor=white" alt="Django 6">
  <img src="https://img.shields.io/badge/MongoDB-7-47A248?logo=mongodb&logoColor=white" alt="MongoDB 7">
  <img src="https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white" alt="Redis 7">
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript 5">
  <img src="https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind 4">
</p>

---

## Features

| | | |
|---|---|---|
| **Search & Discover** — title, author, or ISBN search with trending and new releases feed | **Reading Diary** — log reads with dates, star ratings, and reviews | **Reading Lists** — want-to-read, reading, and completed tracking |
| **Reviews** — write and manage reviews with visual star ratings | **Stats** — reading statistics, streaks, and genre breakdowns | **Lists** — create and share custom curated book lists |
| **Favorites** — save books for quick access | **Letterboxd-inspired UI** — poster grids, dark theme, smooth animations | |

## Stack

```
Frontend       React 19 · TypeScript · Vite · Tailwind CSS 4 · Motion
Backend        Django 6 · Django REST Framework · MongoDB · Redis
Infrastructure Docker Compose · Nginx · Gunicorn
```

## Quick Start

```bash
docker compose up -d --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000/api |
| Health | http://localhost:8000/api/health/ |

### Environment

Copy `.env.example` to `.env` with the required variables:

| Variable | Required | Purpose |
|----------|----------|---------|
| `GOOGLE_BOOKS_API_KEY` | Yes | Book search and metadata |
| `SECRET_KEY` | Yes | Django secret key |
| `HARDCOVER_API_KEY` | No | Trending books feed |
| `FIREBASE_*` | No | Authentication |

## Development

```bash
# frontend
cd frontend && npm install && npm run dev

# backend
cd backend && pip install -r requirements.txt && python manage.py runserver
```

## Architecture

```
               ┌─────────────┐     ┌──────────────┐     ┌──────────┐
               │  Nginx      │────▶│  Gunicorn    │────▶│ MongoDB  │
               │  (static)   │     │  (Django)    │     └──────────┘
               └─────────────┘     │              │     ┌──────────┐
                                   │  Redis       │────▶│  Cache   │
                                   └──────────────┘     └──────────┘
```

Book data is sourced from Google Books and Open Library. Trending data from Hardcover API.

## License

MIT
