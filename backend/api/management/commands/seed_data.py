from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from api.models import Book, BookList, BookListItem, Comment, Follow, Notification, Review, ReviewLike, ShelfEntry
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
    help = "Seed demo users, books, shelves, follows, comments, reviews, notifications, and lists."

    def handle(self, *args, **options):
        users = []
        for username in ["ria", "dev", "maya"]:
            user, _ = User.objects.get_or_create(username=username, defaults={"email": f"{username}@bookmark.local"})
            user.set_password("password123")
            user.save()
            user.profile.display_name = username.capitalize()
            user.profile.avatar_url = f"https://api.dicebear.com/9.x/thumbs/svg?seed={username}"
            user.profile.bio = f"{username.capitalize()} shares notes, highlights, and strong opinions about books."
            user.profile.save()
            users.append(user)

        books = [sync_seed_book(title, query) for title, query in BOOK_QUERIES]

        reviews = [
            (users[0], books[0], 4.5, "Everything sparkles and aches. The prose still lands like gossip overheard in the next room."),
            (users[1], books[1], 5.0, "An absurdly readable big-idea novel. I loved how competent everyone felt."),
            (users[2], books[2], 4.0, "Quietly intense and mythic without losing its human pulse."),
        ]
        created_reviews = []
        for user, book, rating, text in reviews:
            review, _ = Review.objects.get_or_create(user=user, book=book, defaults={"rating": rating, "review_text": text})
            created_reviews.append(review)
            like, like_created = ReviewLike.objects.get_or_create(user=users[0], review=review)
            if like_created and review.user != users[0]:
                Notification.objects.get_or_create(
                    recipient=review.user,
                    actor=users[0],
                    notification_type=Notification.Type.LIKE,
                    review=review,
                )
            book.refresh_metrics()

        shelf_entries = [
            (users[0], books[0], ShelfEntry.Shelf.READ),
            (users[0], books[1], ShelfEntry.Shelf.WANT),
            (users[1], books[1], ShelfEntry.Shelf.READ),
            (users[1], books[2], ShelfEntry.Shelf.READING),
            (users[2], books[2], ShelfEntry.Shelf.READ),
        ]
        for user, book, shelf in shelf_entries:
            ShelfEntry.objects.get_or_create(user=user, book=book, shelf=shelf)

        follows = [
            (users[0], users[1]),
            (users[0], users[2]),
            (users[1], users[2]),
        ]
        for follower, following in follows:
            follow, created = Follow.objects.get_or_create(follower=follower, following=following)
            if created:
                Notification.objects.get_or_create(
                    recipient=following,
                    actor=follower,
                    notification_type=Notification.Type.FOLLOW,
                    follow=follow,
                )

        comments = [
            (users[1], created_reviews[0], "That line about overheard gossip sold me immediately."),
            (users[2], created_reviews[1], "This made me want to bump it up my queue."),
        ]
        for user, review, body in comments:
            comment, _ = Comment.objects.get_or_create(user=user, review=review, body=body)
            if review.user != user:
                Notification.objects.get_or_create(
                    recipient=review.user,
                    actor=user,
                    notification_type=Notification.Type.COMMENT,
                    review=review,
                    comment=comment,
                )

        book_list, _ = BookList.objects.get_or_create(
            user=users[0],
            name="Books with impossible problems",
            defaults={"description": "Resourceful people in situations getting steadily worse."},
        )
        for position, book in enumerate(books[:2]):
            BookListItem.objects.get_or_create(book_list=book_list, book=book, defaults={"position": position})

        self.stdout.write(self.style.SUCCESS("Seeded data. Demo users: ria/dev/maya with password123"))
