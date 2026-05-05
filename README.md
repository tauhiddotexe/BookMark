# Bookmark

Bookmark is a full-stack social book review app inspired by Letterboxd's structure and flow, adapted for books.

## Stack

- Frontend: Next.js App Router
- Backend: Django + Django REST Framework
- Database: PostgreSQL via Supabase
- Auth: JWT via `djangorestframework-simplejwt`
- Search: Google Books API

## Structure

- `frontend/`: Next.js UI, dark card-based layout, feed, book, profile, search, and list pages
- `backend/`: Django project configuration
- `backend/api/`: models, serializers, viewsets, pagination, Google Books integration, seed command

## Backend setup

1. Copy `.env.example` to `.env`
2. Fill in your Supabase Postgres connection string in `DATABASE_URL`
3. Install dependencies and run migrations:

```bash
cd backend
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py seed_data
python manage.py runserver
```

Important env values:

- `DATABASE_URL`: Supabase PostgreSQL connection string
- `JWT_SECRET_KEY`: JWT signing secret
- `DJANGO_SECRET_KEY`: Django app secret
- `GOOGLE_BOOKS_API_KEY`: optional, but recommended for more reliable API access

## Social features

- Follow / unfollow users
- Review comments
- Notifications for likes, follows, and comments
- Feed prioritizes reviews from followed users
- Paginated feed, comments, reviews, and notifications

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Set `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api`.

## Demo users

- `ria` / `password123`
- `dev` / `password123`
- `maya` / `password123`
