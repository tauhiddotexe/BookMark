from django.contrib import admin

from .models import Book, DiaryEntry, Profile, Readlist, Review


@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ["title", "author", "google_books_id"]
    search_fields = ["title", "author"]


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ["user", "book", "rating", "created_at"]
    list_filter = ["rating"]


@admin.register(DiaryEntry)
class DiaryEntryAdmin(admin.ModelAdmin):
    list_display = ["user", "book", "read_date", "is_reread"]
    list_filter = ["is_reread"]


@admin.register(Readlist)
class ReadlistAdmin(admin.ModelAdmin):
    list_display = ["user", "book", "created_at"]


admin.site.register(Profile)
