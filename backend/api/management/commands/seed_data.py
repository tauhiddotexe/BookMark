from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

User = get_user_model()

from api.models import Book, Review, Readlist, FavoriteBook, DiaryEntry
from api.services.google_books import search_google_books


BOOK_QUERIES = [
    ("The Great Gatsby", "The Great Gatsby F. Scott Fitzgerald"),
    ("Project Hail Mary", "Project Hail Mary Andy Weir"),
    ("Circe", "Circe Madeline Miller"),
]


def sync_seed_book(title, query):
    results = search_google_books(query)
    if not results:
        raise RuntimeError(f"No Google Books results found for '{query}'.")

    chosen = next((item for item in results if item["title"].lower() == title.lower()), results[0])
    book = Book.objects.filter(google_books_id=chosen["google_books_id"]).first()
    if not book:
        book = Book.objects.filter(title__iexact=title).first()

    if book:
        for field, value in chosen.items():
            setattr(book, field, value)
        book.save()
        return book

    return Book.objects.create(**chosen)


class Command(BaseCommand):
    help = "Seed demo books, reviews, diary entries, readlist, and favorites."

    def handle(self, *args, **options):
        user, _ = User.objects.get_or_create(username="demo", defaults={"email": "demo@bookmark.local"})
        user.set_password("password123")
        user.save()
        user.profile.display_name = "Demo"
        user.profile.bio = "Reading my way through the shelves."
        user.profile.save()

        books = [sync_seed_book(title, query) for title, query in BOOK_QUERIES]

        reviews_data = [
            (books[0], 4.5, "Everything sparkles and aches. The prose still lands like gossip overheard in the next room."),
            (books[1], 5.0, "An absurdly readable big-idea novel. I loved how competent everyone felt."),
            (books[2], 4.0, "Quietly intense and mythic without losing its human pulse."),
        ]
        for book, rating, text in reviews_data:
            Review.objects.get_or_create(user=user, book=book, defaults={"rating": rating, "review_text": text})
            book.refresh_metrics()

        Readlist.objects.get_or_create(user=user, book=books[1])

        FavoriteBook.objects.get_or_create(user=user, book=books[2])

        self.stdout.write(self.style.SUCCESS("Seeded data. Demo user: demo / password123"))
