from django.contrib.auth.models import User
from django.db.models import Count, Prefetch
from rest_framework import serializers

from .models import Book, BookList, BookListItem, Comment, Follow, Notification, Profile, Review, ShelfEntry


def latest_comments_prefetch():
    return Prefetch(
        "comments",
        queryset=Comment.objects.select_related("user", "user__profile").order_by("-created_at"),
        to_attr="prefetched_latest_comments",
    )


class ProfileMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ["display_name", "avatar_url", "bio"]


class UserSerializer(serializers.ModelSerializer):
    profile = ProfileMiniSerializer(read_only=True)
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "email", "profile", "followers_count", "following_count"]

    def get_followers_count(self, obj):
        try:
            return obj.profile.followers_count
        except:
            return obj.follower_links.count()

    def get_following_count(self, obj):
        try:
            return obj.profile.following_count
        except:
            return obj.following_links.count()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    email = serializers.EmailField(required=False, allow_blank=True)
    avatar_url = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ["username", "email", "password", "avatar_url"]

    def create(self, validated_data):
        avatar_url = validated_data.pop("avatar_url", "")
        user = User.objects.create_user(**validated_data)
        Profile.objects.update_or_create(
            user=user,
            defaults={"display_name": user.username, "avatar_url": avatar_url},
        )
        return user


class BookSerializer(serializers.ModelSerializer):
    class Meta:
        model = Book
        fields = [
            "id",
            "google_books_id",
            "title",
            "slug",
            "author",
            "description",
            "published_date",
            "page_count",
            "categories",
            "cover_url",
            "thumbnail_url",
            "average_rating",
            "ratings_count",
        ]


class CommentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    review_id = serializers.PrimaryKeyRelatedField(source="review", queryset=Review.objects.all(), write_only=True)

    class Meta:
        model = Comment
        fields = ["id", "user", "review", "review_id", "body", "created_at", "updated_at"]
        read_only_fields = ["review"]


class ReviewSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    book = BookSerializer(read_only=True)
    likes_count = serializers.IntegerField(read_only=True)
    comments_count = serializers.IntegerField(read_only=True)
    latest_comments = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = [
            "id",
            "user",
            "book",
            "rating",
            "review_text",
            "contains_spoilers",
            "likes_count",
            "comments_count",
            "latest_comments",
            "created_at",
            "updated_at",
        ]

    def get_latest_comments(self, obj):
        comments = getattr(obj, "prefetched_latest_comments", None)
        if comments is None:
            comments = obj.comments.select_related("user", "user__profile").order_by("-created_at")[:2]
        return CommentSerializer(comments[:2], many=True).data


class ReviewCreateSerializer(serializers.ModelSerializer):
    book_id = serializers.PrimaryKeyRelatedField(source="book", queryset=Book.objects.all())
    user_id = serializers.IntegerField(write_only=True, required=False)
    text = serializers.CharField(write_only=True, required=False, allow_blank=False)

    class Meta:
        model = Review
        fields = ["id", "user_id", "book_id", "rating", "review_text", "text", "contains_spoilers"]

    def validate(self, attrs):
        request = self.context["request"]
        book = attrs.get("book") or getattr(self.instance, "book", None)
        submitted_user_id = attrs.pop("user_id", None)
        if submitted_user_id and submitted_user_id != request.user.id:
            raise serializers.ValidationError("user_id does not match the authenticated user.")

        if not attrs.get("review_text") and attrs.get("text"):
            attrs["review_text"] = attrs.pop("text")
        else:
            attrs.pop("text", None)

        if not attrs.get("review_text"):
            raise serializers.ValidationError({"review_text": "This field is required."})

        if request.method == "POST" and book and Review.objects.filter(user=request.user, book=book).exists():
            raise serializers.ValidationError("You have already reviewed this book.")
        return attrs


class BookDetailSerializer(BookSerializer):
    reviews = serializers.SerializerMethodField()

    class Meta(BookSerializer.Meta):
        fields = BookSerializer.Meta.fields + ["reviews"]

    def get_reviews(self, obj):
        reviews = (
            obj.reviews.select_related("user", "user__profile", "book")
            .prefetch_related(latest_comments_prefetch())
            .order_by("-created_at")[:5]
        )
        return ReviewSerializer(reviews, many=True).data


class ShelfEntrySerializer(serializers.ModelSerializer):
    book = BookSerializer(read_only=True)
    book_id = serializers.PrimaryKeyRelatedField(source="book", queryset=Book.objects.all(), write_only=True)

    class Meta:
        model = ShelfEntry
        fields = ["id", "shelf", "book", "book_id", "created_at"]


class BookListItemSerializer(serializers.ModelSerializer):
    book = BookSerializer(read_only=True)
    book_id = serializers.PrimaryKeyRelatedField(source="book", queryset=Book.objects.all(), write_only=True)

    class Meta:
        model = BookListItem
        fields = ["id", "book", "book_id", "note", "position"]


class BookListSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    items = BookListItemSerializer(many=True)

    class Meta:
        model = BookList
        fields = ["id", "user", "name", "description", "is_public", "items", "created_at", "updated_at"]

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        book_list = BookList.objects.create(**validated_data)
        for index, item in enumerate(items_data):
            BookListItem.objects.create(book_list=book_list, position=index, **item)
        return book_list

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if items_data is not None:
            instance.items.all().delete()
            for index, item in enumerate(items_data):
                BookListItem.objects.create(book_list=instance, position=index, **item)
        return instance


class FollowSerializer(serializers.ModelSerializer):
    follower = UserSerializer(read_only=True)
    following = UserSerializer(read_only=True)

    class Meta:
        model = Follow
        fields = ["id", "follower", "following", "created_at"]


class NotificationSerializer(serializers.ModelSerializer):
    actor = UserSerializer(read_only=True)
    review_id = serializers.SerializerMethodField()
    comment_id = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id",
            "notification_type",
            "actor",
            "recipient",
            "review_id",
            "comment_id",
            "is_read",
            "created_at",
        ]
        read_only_fields = fields

    def get_review_id(self, obj):
        return obj.data.get("review_id")

    def get_comment_id(self, obj):
        return obj.data.get("comment_id")


class ProfileSerializer(serializers.ModelSerializer):
    profile = ProfileMiniSerializer(read_only=True)
    reviews = serializers.SerializerMethodField()
    lists = BookListSerializer(many=True, source="book_lists", read_only=True)
    shelves = serializers.SerializerMethodField()
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "profile",
            "reviews",
            "lists",
            "shelves",
            "followers_count",
            "following_count",
        ]

    def get_reviews(self, obj):
        reviews = (
            obj.reviews.select_related("user", "user__profile", "book")
            .prefetch_related(latest_comments_prefetch())
            .order_by("-created_at")[:10]
        )
        return ReviewSerializer(reviews, many=True).data

    def get_followers_count(self, obj):
        try:
            return obj.profile.followers_count
        except:
            return obj.follower_links.count()

    def get_following_count(self, obj):
        try:
            return obj.profile.following_count
        except:
            return obj.following_links.count()

    def get_shelves(self, obj):
        grouped = {choice: [] for choice, _ in ShelfEntry.Shelf.choices}
        for entry in obj.shelf_entries.select_related("book").all():
            grouped[entry.shelf].append(BookSerializer(entry.book).data)
        return grouped


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
