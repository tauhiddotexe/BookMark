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
    
    # Denormalized for MongoDB performance
    followers_count = models.PositiveIntegerField(default=0)
    following_count = models.PositiveIntegerField(default=0)
    review_count = models.PositiveIntegerField(default=0)

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


class Follow(TimeStampedModel):
    follower = models.ForeignKey(User, on_delete=models.CASCADE, related_name="following_links")
    following = models.ForeignKey(User, on_delete=models.CASCADE, related_name="follower_links")

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["follower", "following"], name="unique_follow"),
        ]
        indexes = [
            models.Index(fields=["follower", "following"]),
        ]

    def __str__(self):
        return f"{self.follower.username} -> {self.following.username}"

    def save(self, *args, **kwargs):
        created = self._state.adding
        super().save(*args, **kwargs)
        if created:
            from .models import Profile
            Profile.objects.filter(user=self.follower).update(following_count=F('following_count') + 1)
            Profile.objects.filter(user=self.following).update(followers_count=F('followers_count') + 1)

    def delete(self, *args, **kwargs):
        from .models import Profile
        Profile.objects.filter(user=self.follower).update(
            following_count=models.functions.Greatest(F('following_count') - 1, 0)
        )
        Profile.objects.filter(user=self.following).update(
            followers_count=models.functions.Greatest(F('followers_count') - 1, 0)
        )
        super().delete(*args, **kwargs)


class Review(TimeStampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reviews")
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name="reviews")
    # Denormalization for NoSQL performance
    book_title = models.CharField(max_length=255, blank=True)
    likes_count = models.PositiveIntegerField(default=0)
    comments_count = models.PositiveIntegerField(default=0)
    
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
        created = self._state.adding
        if not self.book_title and self.book:
            self.book_title = self.book.title
        super().save(*args, **kwargs)
        if created:
            from .models import Profile
            Profile.objects.filter(user=self.user).update(review_count=F('review_count') + 1)

    def delete(self, *args, **kwargs):
        from .models import Profile
        Profile.objects.filter(user=self.user).update(
            review_count=models.functions.Greatest(F('review_count') - 1, 0)
        )
        super().delete(*args, **kwargs)


class Comment(TimeStampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="comments")
    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name="comments")
    body = models.TextField()

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.user.username} on review {self.review_id}"

    def save(self, *args, **kwargs):
        created = self._state.adding
        super().save(*args, **kwargs)
        if created:
            Review.objects.filter(pk=self.review_id).update(comments_count=F('comments_count') + 1)

    def delete(self, *args, **kwargs):
        Review.objects.filter(pk=self.review_id).update(
            comments_count=models.functions.Greatest(F('comments_count') - 1, 0)
        )
        super().delete(*args, **kwargs)


class ReviewLike(TimeStampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="review_likes")
    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name="likes")

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "review"], name="unique_review_like"),
        ]
        indexes = [
            models.Index(fields=["user", "review"]),
        ]

    def save(self, *args, **kwargs):
        created = self._state.adding
        super().save(*args, **kwargs)
        if created:
            Review.objects.filter(pk=self.review_id).update(likes_count=F('likes_count') + 1)

    def delete(self, *args, **kwargs):
        Review.objects.filter(pk=self.review_id).update(
            likes_count=models.functions.Greatest(F('likes_count') - 1, 0)
        )
        super().delete(*args, **kwargs)


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
        DROPPED = "dropped", "Dropped"
        REREADING = "re_reading", "Re-reading"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="shelf_entries")
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name="shelf_entries")
    shelf = models.CharField(max_length=20, choices=Shelf.choices)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "book"], name="unique_shelf_entry"),
        ]
        indexes = [
            models.Index(fields=["user", "book", "shelf"]),
        ]


class BookList(TimeStampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="book_lists")
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    is_public = models.BooleanField(default=True)
    likes_count = models.PositiveIntegerField(default=0)
    comments_count = models.PositiveIntegerField(default=0)

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


class BookListLike(TimeStampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="list_likes")
    book_list = models.ForeignKey(BookList, on_delete=models.CASCADE, related_name="likes")

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "book_list"], name="unique_list_like")
        ]

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)
        if is_new:
            BookList.objects.filter(pk=self.book_list_id).update(likes_count=F('likes_count') + 1)

    def delete(self, *args, **kwargs):
        BookList.objects.filter(pk=self.book_list_id).update(
            likes_count=models.functions.Greatest(F('likes_count') - 1, 0)
        )
        super().delete(*args, **kwargs)


class DiaryEntry(TimeStampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="diary_entries")
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name="diary_entries")
    
    # Diary specific fields
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
    contains_spoilers = models.BooleanField(default=False)
    
    # Social stats for the log/entry
    likes_count = models.PositiveIntegerField(default=0)
    comments_count = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-read_date", "-created_at"]
        indexes = [
            models.Index(fields=["user", "-read_date"]),
            models.Index(fields=["book", "-read_date"]),
        ]

    def __str__(self):
        return f"{self.user.username} logged {self.book.title} on {self.read_date}"

    def save(self, *args, **kwargs):
        created = self.pk is None
        super().save(*args, **kwargs)
        # Automatically update shelf to READ when diary entry is created
        ShelfEntry.objects.update_or_create(
            user=self.user,
            book=self.book,
            defaults={"shelf": ShelfEntry.Shelf.READ}
        )
        # Update book metrics if rating is provided
        if self.rating:
            self.book.refresh_metrics()

class Activity(TimeStampedModel):
    class ActivityType(models.TextChoices):
        LOG = "log", "Logged a book"
        REVIEW = "review", "Reviewed a book"
        FOLLOW = "follow", "Followed a user"
        SHELF = "shelf", "Added to shelf"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="activities")
    activity_type = models.CharField(max_length=20, choices=ActivityType.choices)
    
    # Generic references using IDs
    content_id = models.CharField(max_length=120, blank=True)
    content_type_label = models.CharField(max_length=50, blank=True)
    
    # Metadata for display without joining
    book = models.ForeignKey(Book, on_delete=models.SET_NULL, null=True, blank=True, related_name="activities")
    target_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="target_activities")
    
    # Data for the feed item (JSON)
    data = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["activity_type", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.activity_type} - {self.created_at}"

# Signals for Activity Feed

@receiver(post_save, sender=DiaryEntry)
def create_diary_activity(sender, instance, created, **kwargs):
    if created:
        Activity.objects.create(
            user=instance.user,
            activity_type=Activity.ActivityType.LOG,
            content_id=str(instance.id),
            content_type_label="diaryentry",
            book=instance.book,
            data={
                "rating": str(instance.rating) if instance.rating else None,
                "read_date": str(instance.read_date),
                "is_reread": instance.is_reread
            }
        )

@receiver(post_save, sender=Review)
def create_review_activity(sender, instance, created, **kwargs):
    if created:
        Activity.objects.create(
            user=instance.user,
            activity_type=Activity.ActivityType.REVIEW,
            content_id=str(instance.id),
            content_type_label="review",
            book=instance.book,
            data={
                "rating": str(instance.rating),
                "review_snippet": instance.review_text[:140] + "..." if len(instance.review_text) > 140 else instance.review_text
            }
        )

@receiver(post_save, sender=Follow)
def create_follow_activity(sender, instance, created, **kwargs):
    if created:
        Activity.objects.create(
            user=instance.follower,
            activity_type=Activity.ActivityType.FOLLOW,
            content_id=str(instance.id),
            content_type_label="follow",
            target_user=instance.following
        )

@receiver(post_save, sender=BookList)
def create_list_activity(sender, instance, created, **kwargs):
    if created and instance.is_public:
        Activity.objects.create(
            user=instance.user,
            activity_type=Activity.ActivityType.SHELF,
            content_id=str(instance.id),
            content_type_label="list",
            data={
                "list_name": instance.name,
                "item_count": instance.items.count()
            }
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
        pass  # Profile sync is handled by firebase_utils; signal is best-effort
