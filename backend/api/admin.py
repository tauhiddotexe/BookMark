from django.contrib import admin

from .models import Book, BookList, BookListItem, Comment, Follow, Notification, Profile, Review, ReviewLike, ShelfEntry


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "display_name")


@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ("title", "author", "average_rating", "ratings_count")
    search_fields = ("title", "author", "google_books_id")


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("user", "book", "rating", "created_at")
    search_fields = ("user__username", "book__title")


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ("user", "review", "created_at")
    search_fields = ("user__username", "review__book__title")


@admin.register(Follow)
class FollowAdmin(admin.ModelAdmin):
    list_display = ("follower", "following", "created_at")
    search_fields = ("follower__username", "following__username")


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("recipient", "actor", "notification_type", "is_read", "created_at")
    search_fields = ("recipient__username", "actor__username")


admin.site.register(ReviewLike)
admin.site.register(ShelfEntry)
admin.site.register(BookList)
admin.site.register(BookListItem)
