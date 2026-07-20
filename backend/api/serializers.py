from datetime import date

from django.contrib.auth import get_user_model
User = get_user_model()
from django.db.models import Avg, Count
from rest_framework import serializers

from .models import Book, BookList, BookListItem, DiaryEntry, FavoriteBook, Profile, Readlist, Review
from django_mongodb_backend.fields import ObjectIdAutoField

serializers.ModelSerializer.serializer_field_mapping[ObjectIdAutoField] = serializers.CharField


class ProfileMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ["display_name", "avatar_url", "bio", "favorite_genres"]


class UserSerializer(serializers.ModelSerializer):
    profile = ProfileMiniSerializer()

    class Meta:
        model = User
        fields = ["id", "username", "email", "profile", "date_joined"]
        read_only_fields = ["id", "username", "email", "date_joined"]

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', None)
        if profile_data:
            profile = instance.profile
            for attr, value in profile_data.items():
                setattr(profile, attr, value)
            profile.save()
        return super().update(instance, validated_data)


class BookSerializer(serializers.ModelSerializer):
    class Meta:
        model = Book
        fields = [
            "id", "google_books_id", "title", "slug", "author", "description",
            "published_date", "page_count", "categories", "cover_url",
            "thumbnail_url", "average_rating", "ratings_count",
            "openlibrary_id", "isbn_13", "isbn_10",
        ]


class ReviewSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    book = BookSerializer(read_only=True)

    class Meta:
        model = Review
        fields = [
            "id", "user", "book", "rating", "review_text",
            "created_at", "updated_at",
        ]


class ReviewCreateSerializer(serializers.ModelSerializer):
    book_id = serializers.PrimaryKeyRelatedField(source="book", queryset=Book.objects.all())

    class Meta:
        model = Review
        fields = ["id", "book_id", "rating", "review_text"]

    def validate(self, attrs):
        request = self.context["request"]
        book = attrs.get("book") or getattr(self.instance, "book", None)
        if not attrs.get("review_text"):
            attrs["review_text"] = ""
        return attrs


class DiaryEntrySerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    book = BookSerializer(read_only=True)
    book_id = serializers.PrimaryKeyRelatedField(source="book", queryset=Book.objects.all(), write_only=True)

    class Meta:
        model = DiaryEntry
        fields = [
            "id", "user", "book", "book_id", "read_date", "rating",
            "review_text", "is_reread", "tags", "created_at",
        ]
        read_only_fields = ["is_reread"]


class BookSearchResultSerializer(serializers.Serializer):
    google_books_id = serializers.CharField()
    title = serializers.CharField()
    author = serializers.CharField(allow_blank=True)
    description = serializers.CharField(allow_blank=True)
    published_date = serializers.CharField(allow_blank=True)
    page_count = serializers.IntegerField()
    categories = serializers.CharField(allow_blank=True)
    cover_url = serializers.CharField(allow_blank=True)
    thumbnail_url = serializers.CharField(allow_blank=True)
    existing_slug = serializers.CharField(allow_blank=True, required=False)
    openlibrary_id = serializers.CharField(allow_blank=True, required=False)
    isbn_13 = serializers.CharField(allow_blank=True, required=False)
    isbn_10 = serializers.CharField(allow_blank=True, required=False)


class ReadlistSerializer(serializers.ModelSerializer):
    book = BookSerializer(read_only=True)
    book_id = serializers.PrimaryKeyRelatedField(source="book", queryset=Book.objects.all(), write_only=True)

    class Meta:
        model = Readlist
        fields = ["id", "book", "book_id", "status", "current_page", "start_date", "created_at"]
        read_only_fields = ["start_date"]


class FavoriteBookSerializer(serializers.ModelSerializer):
    book = BookSerializer(read_only=True)
    book_id = serializers.PrimaryKeyRelatedField(source="book", queryset=Book.objects.all(), write_only=True)

    class Meta:
        model = FavoriteBook
        fields = ["id", "book", "book_id", "created_at"]


class BookListItemSerializer(serializers.ModelSerializer):
    book = BookSerializer(read_only=True)
    book_id = serializers.PrimaryKeyRelatedField(source="book", queryset=Book.objects.all(), write_only=True)

    class Meta:
        model = BookListItem
        fields = ["id", "book", "book_id", "position", "notes", "created_at"]


class BookListSerializer(serializers.ModelSerializer):
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = BookList
        fields = ["id", "name", "description", "is_ranked", "item_count", "created_at"]
        read_only_fields = ["created_at"]

    def get_item_count(self, obj):
        return obj.items.count()


class BookListDetailSerializer(serializers.ModelSerializer):
    items = BookListItemSerializer(many=True, read_only=True)

    class Meta:
        model = BookList
        fields = ["id", "name", "description", "is_ranked", "items", "created_at"]


class MeDetailSerializer(serializers.ModelSerializer):
    profile = ProfileMiniSerializer(read_only=True)
    reviews = serializers.SerializerMethodField()
    diary_entries = serializers.SerializerMethodField()
    readlist = serializers.SerializerMethodField()
    favorite_books = serializers.SerializerMethodField()
    stats = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "profile", "date_joined",
            "reviews", "diary_entries", "readlist", "favorite_books", "stats",
        ]

    def get_reviews(self, obj):
        reviews = obj.reviews.select_related("book").order_by("-created_at")[:50]
        return ReviewSerializer(reviews, many=True).data

    def get_diary_entries(self, obj):
        entries = obj.diary_entries.select_related("book").order_by("-read_date")[:50]
        return DiaryEntrySerializer(entries, many=True).data

    def get_readlist(self, obj):
        entries = obj.readlist_entries.select_related("book").order_by("-created_at")
        return ReadlistSerializer(entries, many=True).data

    def get_favorite_books(self, obj):
        favorites = obj.favorite_books.select_related("book").order_by("-created_at")
        return FavoriteBookSerializer(favorites, many=True).data

    def get_stats(self, obj):
        diary_entries = DiaryEntry.objects.filter(user=obj)
        reviews = Review.objects.filter(user=obj)

        total_read = diary_entries.count()
        this_year = diary_entries.filter(read_date__year=date.today().year).count()

        avg_rating = reviews.aggregate(avg=Avg("rating"))["avg"]
        avg_rating = round(float(avg_rating), 2) if avg_rating else 0

        genre_counts = (
            diary_entries.values("book__categories")
            .annotate(count=Count("book__categories"))
            .order_by("-count")[:5]
        )
        favorite_genres = [
            g["book__categories"] for g in genre_counts if g["book__categories"]
        ]

        return {
            "total_books_read": total_read,
            "books_read_this_year": this_year,
            "total_reviews": reviews.count(),
            "average_rating": avg_rating,
            "favorite_genres": favorite_genres,
        }
