from decimal import Decimal

from django.contrib.auth.models import AbstractUser
from django_mongodb_backend.fields import ObjectIdAutoField
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Avg, F
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils.text import slugify


class User(AbstractUser):
    id = ObjectIdAutoField(primary_key=True)
    firebase_uid = models.CharField(max_length=128, unique=True, null=True, blank=True, db_index=True)

    class Meta:
        swappable = 'AUTH_USER_MODEL'


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
    favorite_genres = models.JSONField(default=list, blank=True)

    def __str__(self):
        return self.user.username


class Book(TimeStampedModel):
    google_books_id = models.CharField(max_length=120, unique=True, db_index=True)
    openlibrary_id = models.CharField(max_length=120, blank=True, db_index=True)
    isbn_13 = models.CharField(max_length=13, blank=True, db_index=True)
    isbn_10 = models.CharField(max_length=10, blank=True, db_index=True)
    title = models.CharField(max_length=255, db_index=True)
    slug = models.SlugField(max_length=300, unique=True, blank=True, db_index=True)
    author = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    published_date = models.CharField(max_length=32, blank=True)
    page_count = models.PositiveIntegerField(default=0)
    categories = models.CharField(max_length=255, blank=True, db_index=True)
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


class Review(TimeStampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reviews")
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name="reviews")

    rating = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        validators=[MinValueValidator(Decimal("0.5")), MaxValueValidator(Decimal("5.0"))],
    )
    review_text = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username} on {self.book.title}"


class DiaryEntry(TimeStampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="diary_entries")
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name="diary_entries")

    read_date = models.DateField()
    rating = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.5")), MaxValueValidator(Decimal("5.0"))],
    )
    review_text = models.TextField(blank=True)
    is_reread = models.BooleanField(default=False)
    tags = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ["-read_date", "-created_at"]
        indexes = [
            models.Index(fields=["user", "-read_date"]),
            models.Index(fields=["book", "-read_date"]),
        ]

    def __str__(self):
        return f"{self.user.username} logged {self.book.title} on {self.read_date}"


class Readlist(TimeStampedModel):
    WANT_TO_READ = "want_to_read"
    READING = "currently_reading"
    STATUS_CHOICES = [
        (WANT_TO_READ, "Want to Read"),
        (READING, "Currently Reading"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="readlist_entries")
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name="readlist_entries")

    status = models.CharField(max_length=24, choices=STATUS_CHOICES, default=WANT_TO_READ)
    current_page = models.PositiveIntegerField(default=0)
    start_date = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["user", "book"], name="unique_readlist_entry"),
        ]

    def __str__(self):
        return f"{self.user.username} wants to read {self.book.title}"


class BookList(TimeStampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="book_lists")
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    is_ranked = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class BookListItem(models.Model):
    book_list = models.ForeignKey(BookList, on_delete=models.CASCADE, related_name="items")
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name="list_items")
    position = models.PositiveIntegerField(default=0)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["position", "created_at"]
        constraints = [
            models.UniqueConstraint(fields=["book_list", "book"], name="unique_list_item"),
        ]

    def __str__(self):
        return f"{self.book.title} in {self.book_list.name}"


class FavoriteBook(TimeStampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="favorite_books")
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name="favorited_by")

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["user", "book"], name="unique_favorite_book"),
        ]

    def __str__(self):
        return f"{self.user.username}'s favorite: {self.book.title}"


@receiver(post_save, sender=Review)
def create_diary_entry_from_review(sender, instance, created, **kwargs):
    if created:
        previous_reviews = Review.objects.filter(
            user=instance.user, book=instance.book
        ).exclude(pk=instance.pk).exists()

        DiaryEntry.objects.create(
            user=instance.user,
            book=instance.book,
            read_date=instance.created_at.date(),
            rating=instance.rating,
            review_text=instance.review_text,
            is_reread=previous_reviews,
        )


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        try:
            Profile.objects.get_or_create(user=instance, defaults={"display_name": instance.username})
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Signal failed to create profile for {instance.username}: {e}")


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    try:
        profile = getattr(instance, 'profile', None)
        if profile and profile.pk:
            profile.save()
    except Exception:
        pass
