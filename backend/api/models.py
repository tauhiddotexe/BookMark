from decimal import Decimal

from django.contrib.auth.models import User
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Avg
from django.utils.text import slugify


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Profile(TimeStampedModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    display_name = models.CharField(max_length=150, blank=True)
    avatar_url = models.URLField(blank=True, max_length=500)
    bio = models.TextField(blank=True)

    def __str__(self):
        return self.user.username


class Book(TimeStampedModel):
    google_books_id = models.CharField(max_length=120, unique=True)
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=300, unique=True, blank=True)
    author = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    published_date = models.CharField(max_length=32, blank=True)
    page_count = models.PositiveIntegerField(default=0)
    categories = models.CharField(max_length=255, blank=True)
    cover_url = models.URLField(blank=True, max_length=500)
    thumbnail_url = models.URLField(blank=True, max_length=500)
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    ratings_count = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["title"]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(f"{self.title}-{self.author}")[:280] or self.google_books_id
            slug = base_slug
            index = 1
            while Book.objects.exclude(pk=self.pk).filter(slug=slug).exists():
                slug = f"{base_slug[:270]}-{index}"
                index += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def refresh_metrics(self):
        aggregate = self.reviews.aggregate(avg=Avg("rating"))
        self.average_rating = round(aggregate["avg"] or 0, 2)
        self.ratings_count = self.reviews.count()
        self.save(update_fields=["average_rating", "ratings_count", "updated_at"])


class Follow(TimeStampedModel):
    follower = models.ForeignKey(User, on_delete=models.CASCADE, related_name="following_links")
    following = models.ForeignKey(User, on_delete=models.CASCADE, related_name="follower_links")

    class Meta:
        ordering = ["-created_at"]
        # MongoDB handles unique indexes fine, but complex check constraints are avoided
        indexes = [
            models.Index(fields=["follower", "following"]),
        ]

    def __str__(self):
        return f"{self.follower.username} -> {self.following.username}"


class Review(TimeStampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reviews")
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name="reviews")
    # Denormalization for NoSQL performance
    book_title = models.CharField(max_length=255, blank=True)
    rating = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        validators=[MinValueValidator(Decimal("0.5")), MaxValueValidator(Decimal("5.0"))],
    )
    review_text = models.TextField()
    contains_spoilers = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username} on {self.book.title}"

    def save(self, *args, **kwargs):
        if not self.book_title and self.book:
            self.book_title = self.book.title
        super().save(*args, **kwargs)


class Comment(TimeStampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="comments")
    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name="comments")
    body = models.TextField()

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.user.username} on review {self.review_id}"


class ReviewLike(TimeStampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="review_likes")
    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name="likes")

    class Meta:
        indexes = [
            models.Index(fields=["user", "review"]),
        ]


class Notification(TimeStampedModel):
    class Type(models.TextChoices):
        LIKE = "like", "Like"
        FOLLOW = "follow", "Follow"
        COMMENT = "comment", "Comment"

    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    actor = models.ForeignKey(User, on_delete=models.CASCADE, related_name="triggered_notifications")
    notification_type = models.CharField(max_length=20, choices=Type.choices)
    
    # Document Pattern: Flexible data field instead of multiple nullable FKs
    data = models.JSONField(default=dict, blank=True)
    
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "is_read", "-created_at"]),
        ]


class ShelfEntry(TimeStampedModel):
    class Shelf(models.TextChoices):
        READ = "read", "Read"
        READING = "reading", "Reading"
        WANT = "want_to_read", "Want to Read"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="shelf_entries")
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name="shelf_entries")
    shelf = models.CharField(max_length=20, choices=Shelf.choices)

    class Meta:
        indexes = [
            models.Index(fields=["user", "book", "shelf"]),
        ]


class BookList(TimeStampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="book_lists")
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    is_public = models.BooleanField(default=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.name


class BookListItem(TimeStampedModel):
    book_list = models.ForeignKey(BookList, on_delete=models.CASCADE, related_name="items")
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name="list_items")
    note = models.CharField(max_length=255, blank=True)
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["position", "created_at"]
