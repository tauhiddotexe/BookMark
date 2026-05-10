import logging

import requests
from django.contrib.auth.models import User
from django.db.models import Case, Count, IntegerField, Prefetch, Q, Value, When
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Book, BookList, Comment, Follow, Notification, Review, ReviewLike, ShelfEntry
from .pagination import CommentPagination, NotificationPagination, StandardResultsSetPagination
from .permissions import IsOwnerOrReadOnly
from .serializers import (
    BookDetailSerializer,
    BookListSerializer,
    BookSearchResultSerializer,
    BookSerializer,
    CommentSerializer,
    FollowSerializer,
    NotificationSerializer,
    ProfileSerializer,
    RegisterSerializer,
    ReviewCreateSerializer,
    ReviewSerializer,
    ShelfEntrySerializer,
    UserSerializer,
)
from .services.google_books import discover_google_books, local_book_results, search_google_books, sync_google_book

logger = logging.getLogger(__name__)


def latest_comments_prefetch():
    return Prefetch(
        "comments",
        queryset=Comment.objects.select_related("user", "user__profile").order_by("-created_at"),
        to_attr="prefetched_latest_comments",
    )


def base_review_queryset():
    return (
        Review.objects.select_related("user", "user__profile", "book")
        .prefetch_related(latest_comments_prefetch())
        .annotate(likes_count=Count("likes", distinct=True), comments_count=Count("comments", distinct=True))
    )


def create_notification(*, recipient, actor, notification_type, review=None, comment=None, follow=None):
    if recipient == actor:
        return None

    data = {}
    if review:
        data["review_id"] = review.id
    if comment:
        data["comment_id"] = comment.id
    if follow:
        data["follow_id"] = follow.id

    payload = {
        "recipient": recipient,
        "actor": actor,
        "notification_type": notification_type,
        "data": data,
    }

    if notification_type == Notification.Type.COMMENT:
        return Notification.objects.create(**payload)

    notification, _ = Notification.objects.get_or_create(
        recipient=recipient,
        actor=actor,
        notification_type=notification_type,
        defaults={"data": data}
    )
    return notification


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class FeedView(generics.ListAPIView):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = base_review_queryset()
        user = self.request.user
        if user.is_authenticated:
            followed_user_ids = user.following_links.values_list("following_id", flat=True)
            return (
                queryset.annotate(
                    feed_priority=Case(
                        When(user=user, then=Value(0)),
                        When(user_id__in=followed_user_ids, then=Value(1)),
                        default=Value(2),
                        output_field=IntegerField(),
                    )
                )
                .order_by("feed_priority", "-created_at")
            )
        return queryset.order_by("-created_at")


class BookViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Book.objects.all()
    lookup_field = "slug"
    pagination_class = StandardResultsSetPagination

    def _attach_existing_books(self, results):
        google_ids = [item["google_books_id"] for item in results]
        existing = {
            book.google_books_id: book
            for book in Book.objects.filter(google_books_id__in=google_ids).only("google_books_id", "slug")
        }
        return [{**item, "existing_slug": existing.get(item["google_books_id"]).slug if existing.get(item["google_books_id"]) else ""} for item in results]

    def get_queryset(self):
        return Book.objects.all()

    def get_serializer_class(self):
        if self.action == "retrieve":
            return BookDetailSerializer
        return BookSerializer

    @action(detail=False, methods=["get"])
    def search(self, request):
        query = request.query_params.get("q", "").strip()
        if not query:
            return Response({"results": []})
        results = search_google_books(query)
        if not results:
            results = local_book_results(query=query, limit=12)
        return Response({"results": BookSearchResultSerializer(self._attach_existing_books(results), many=True).data})

    @action(detail=False, methods=["get"])
    def discover(self, request):
        results = discover_google_books()
        if not results:
            results = local_book_results(limit=18)
        return Response({"results": BookSearchResultSerializer(self._attach_existing_books(results), many=True).data})

    @action(detail=False, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def import_google(self, request):
        volume_id = request.data.get("volume_id") or request.data.get("google_books_id")
        logger.info(
            "Import book request received",
            extra={
                "user_id": request.user.id,
                "volume_id": volume_id,
                "has_auth_header": bool(request.headers.get("Authorization")),
            },
        )
        if not volume_id:
            return Response({"detail": "volume_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            book = sync_google_book(volume_id)
            logger.info("Import book success", extra={"user_id": request.user.id, "book_id": book.id, "slug": book.slug})
        except requests.RequestException:
            logger.exception("Import book failed due to Google Books request error")
            return Response(
                {"detail": "Google Books is temporarily unavailable. Please try again in a moment."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception:
            logger.exception("Import book failed unexpectedly")
            return Response({"detail": "Could not import this book right now."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response(BookSerializer(book).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], permission_classes=[permissions.IsAuthenticated])
    def my_state(self, request, slug=None):
        book = self.get_object()
        shelves = list(ShelfEntry.objects.filter(user=request.user, book=book).values_list("shelf", flat=True))
        review = Review.objects.filter(user=request.user, book=book).first()
        return Response(
            {
                "shelves": shelves,
                "review": {"id": review.id, "rating": review.rating, "review_text": review.review_text} if review else None,
            }
        )

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def set_shelf(self, request, slug=None):
        book = self.get_object()
        shelf = request.data.get("shelf", "")
        ShelfEntry.objects.filter(user=request.user, book=book).delete()
        current = []
        if shelf and shelf in dict(ShelfEntry.Shelf.choices):
            ShelfEntry.objects.create(user=request.user, book=book, shelf=shelf)
            current = [shelf]
        return Response({"shelves": current})

    @action(detail=True, methods=["get"])
    def reviews(self, request, slug=None):
        book = self.get_object()
        queryset = base_review_queryset().filter(book=book).order_by("-created_at")
        page = self.paginate_queryset(queryset)
        serializer = ReviewSerializer(page, many=True)
        return self.get_paginated_response(serializer.data)


class ReviewViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
    pagination_class = StandardResultsSetPagination

    def get_serializer_class(self):
        if self.action in {"create", "update", "partial_update"}:
            return ReviewCreateSerializer
        return ReviewSerializer

    def get_queryset(self):
        queryset = base_review_queryset().order_by("-created_at")
        username = self.request.query_params.get("username")
        book_slug = self.request.query_params.get("book")
        if username:
            queryset = queryset.filter(user__username=username)
        if book_slug:
            queryset = queryset.filter(book__slug=book_slug)
        return queryset

    def perform_create(self, serializer):
        logger.info(
            "Create review request received",
            extra={
                "user_id": self.request.user.id,
                "book_id": self.request.data.get("book_id"),
                "has_auth_header": bool(self.request.headers.get("Authorization")),
            },
        )
        review = serializer.save(user=self.request.user)
        review.book.refresh_metrics()
        logger.info("Create review success", extra={"user_id": self.request.user.id, "review_id": review.id, "book_id": review.book_id})

    def perform_update(self, serializer):
        review = serializer.save()
        review.book.refresh_metrics()

    def perform_destroy(self, instance):
        book = instance.book
        instance.delete()
        book.refresh_metrics()

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def like(self, request, pk=None):
        review = self.get_object()
        like, created = ReviewLike.objects.get_or_create(user=request.user, review=review)
        if created:
            create_notification(
                recipient=review.user,
                actor=request.user,
                notification_type=Notification.Type.LIKE,
                review=review,
            )
        return Response({"likes_count": review.likes.count()})

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def unlike(self, request, pk=None):
        review = self.get_object()
        ReviewLike.objects.filter(user=request.user, review=review).delete()
        Notification.objects.filter(
            recipient=review.user,
            actor=request.user,
            notification_type=Notification.Type.LIKE,
            review=review,
        ).delete()
        return Response({"likes_count": review.likes.count()})


class CommentViewSet(viewsets.ModelViewSet):
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
    pagination_class = CommentPagination

    def get_queryset(self):
        queryset = Comment.objects.select_related("user", "user__profile", "review", "review__book", "review__user")
        review_id = self.request.query_params.get("review")
        if review_id:
            queryset = queryset.filter(review_id=review_id)
        return queryset.order_by("created_at")

    def perform_create(self, serializer):
        comment = serializer.save(user=self.request.user)
        create_notification(
            recipient=comment.review.user,
            actor=self.request.user,
            notification_type=Notification.Type.COMMENT,
            review=comment.review,
            comment=comment,
        )


class ProfileView(generics.RetrieveAPIView):
    serializer_class = ProfileSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "username"
    queryset = (
        User.objects.select_related("profile")
        .prefetch_related("shelf_entries__book", "book_lists__items__book")
        .annotate(
            followers_count=Count("follower_links", distinct=True),
            following_count=Count("following_links", distinct=True),
        )
    )


class FollowUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, username):
        target = generics.get_object_or_404(User, username=username)
        if target == request.user:
            return Response({"detail": "You cannot follow yourself."}, status=status.HTTP_400_BAD_REQUEST)
        follow, created = Follow.objects.get_or_create(follower=request.user, following=target)
        if created:
            create_notification(
                recipient=target,
                actor=request.user,
                notification_type=Notification.Type.FOLLOW,
                follow=follow,
            )
        return Response(FollowSerializer(follow).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class UnfollowUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, username):
        target = generics.get_object_or_404(User, username=username)
        follow = Follow.objects.filter(follower=request.user, following=target).first()
        if not follow:
            return Response(status=status.HTTP_204_NO_CONTENT)
        Notification.objects.filter(
            recipient=target,
            actor=request.user,
            notification_type=Notification.Type.FOLLOW,
            follow=follow,
        ).delete()
        follow.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = NotificationPagination

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user).select_related("actor", "actor__profile")


class ShelfEntryViewSet(viewsets.ModelViewSet):
    serializer_class = ShelfEntrySerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]

    def get_queryset(self):
        return ShelfEntry.objects.filter(user=self.request.user).select_related("book")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class BookListViewSet(viewsets.ModelViewSet):
    serializer_class = BookListSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]

    def get_queryset(self):
        queryset = BookList.objects.select_related("user", "user__profile").prefetch_related("items__book")
        username = self.request.query_params.get("username")
        if username:
            queryset = queryset.filter(user__username=username)
        if self.request.user.is_authenticated:
            return queryset.filter(Q(is_public=True) | Q(user=self.request.user)).distinct()
        return queryset.filter(is_public=True)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def stats_view(_request):
    return Response(
        {
            "users": User.objects.count(),
            "books": Book.objects.count(),
            "reviews": Review.objects.count(),
            "comments": Comment.objects.count(),
            "follows": Follow.objects.count(),
            "notifications": Notification.objects.count(),
            "lists": BookList.objects.count(),
            "top_reviewers": list(
                User.objects.annotate(review_count=Count("reviews"))
                .order_by("-review_count", "username")
                .values("username", "review_count")[:5]
            ),
        }
    )
