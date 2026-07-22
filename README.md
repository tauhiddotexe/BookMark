# BookMark

A social book tracking platform — log reads, rate books, write reviews, and discover what's trending.

## Stack

**Frontend** — React 19, TypeScript, Vite, Tailwind CSS 4, Motion
**Backend** — Django 6, Django REST Framework, MongoDB, Redis
**Infrastructure** — Docker Compose (Nginx, Gunicorn)

## Features

- **Search & Discover** — search by title/author/ISBN, browse trending and new releases
- **Reading Diary** — log books with dates, star ratings, and reviews
- **Reading Lists** — track what you want to read, are reading, or have read
- **Favorites** — save and organize favorite books
- **Reviews** — write and manage reviews with star ratings
- **Stats** — reading statistics, streaks, genre breakdowns
- **Lists** — create custom curated book lists
- **Letterboxd-inspired UI** — poster grids, dark theme, smooth animations

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────┐
│  Frontend   │────▶│  Backend     │────▶│ MongoDB  │
│  (Nginx)    │     │  (Gunicorn)  │     └──────────┘
└─────────────┘     │              │     ┌──────────┐
                    │  Redis       │────▶│  Cache   │
                    └──────────────┘     └──────────┘
```

Book data is sourced from Google Books and Open Library APIs. Trending data comes from a book discovery service.

## Quick Start

```bash
docker compose up -d --build
```

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000/api`
- Health check: `http://localhost:8000/api/health/`

### Environment

Copy `.env.example` to `.env` and configure:

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_BOOKS_API_KEY` | Yes | Google Books API key |
| `HARDCOVER_API_KEY` | No | Hardcover API key (trending) |
| `FIREBASE_*` | No | Firebase auth credentials |
| `SECRET_KEY` | Yes | Django secret key |

## Development

```bash
# Frontend
cd frontend
npm install
npm run dev

# Backend
cd backend
python -m venv venv
pip install -r requirements.txt
python manage.py runserver
```

## License

MIT
