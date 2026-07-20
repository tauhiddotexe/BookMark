import logging
from datetime import date

import requests
from django.contrib.auth import get_user_model
User = get_user_model()
from django.db.models import Avg, Count, Max, Q
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Book, BookList, BookListItem, DiaryEntry, FavoriteBook, Readlist, Review
from .pagination import StandardResultsSetPagination
from .serializers import (
    BookSearchResultSerializer,
    BookSerializer,
    DiaryEntrySerializer,
    FavoriteBookSerializer,
    MeDetailSerializer,
    ReadlistSerializer,
    ReviewCreateSerializer,
    ReviewSerializer,
    UserSerializer,
)
from .services import book_provider
from .services import cache as cache_service

logger = logging.getLogger(__name__)


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class MyProfileView(generics.RetrieveAPIView):
    serializer_class = MeDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return (
            User.objects.select_related("profile")
            .prefetch_related(
                "reviews__book",
                "diary_entries__book",
                "readlist_entries__book",
                "favorite_books__book",
            )
            .get(pk=self.request.user.pk)
        )


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

    def get_serializer_class(self):
        return BookSerializer

    @action(detail=False, methods=["get"])
    def search(self, request):
        query = request.query_params.get("q", "").strip()
        isbn = request.query_params.get("isbn", "").strip()
        category = request.query_params.get("category", "").strip()
        if not query and not isbn:
            return Response({"results": []})
        try:
            results = book_provider.search_books(query, category=category or None, isbn=isbn or None)
        except Exception:
            logger.exception("Provider search failed, falling back to local DB")
            results = []
        if not results:
            results = book_provider.local_book_results(query=query or isbn, limit=12)
        return Response({"results": BookSearchResultSerializer(self._attach_existing_books(results), many=True).data})

    @action(detail=False, methods=["get"])
    def discover(self, request):
        try:
            results = book_provider.discover_books()
        except Exception:
            logger.exception("Provider discover failed, falling back to local DB")
            results = []
        if not results:
            results = book_provider.local_book_results(limit=18)
        return Response({"results": BookSearchResultSerializer(self._attach_existing_books(results), many=True).data})

    @action(detail=False, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def import_google(self, request):
        volume_id = request.data.get("volume_id") or request.data.get("google_books_id")
        if not volume_id:
            return Response({"detail": "volume_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            book = book_provider.import_book(volume_id)
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


class ReviewViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_serializer_class(self):
        if self.action in {"create", "update", "partial_update"}:
            return ReviewCreateSerializer
        return ReviewSerializer

    def get_queryset(self):
        queryset = Review.objects.select_related("user", "user__profile", "book")
        book_slug = self.request.query_params.get("book")
        if book_slug:
            queryset = queryset.filter(book__slug=book_slug)
        return queryset.filter(user=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        review = serializer.save()
        review.book.refresh_metrics()

    def perform_destroy(self, instance):
        book = instance.book
        instance.delete()
        book.refresh_metrics()


class DiaryEntryViewSet(viewsets.ModelViewSet):
    serializer_class = DiaryEntrySerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = DiaryEntry.objects.select_related("user", "user__profile", "book")
        book_slug = self.request.query_params.get("book")
        year = self.request.query_params.get("year")
        rating = self.request.query_params.get("rating")
        is_reread = self.request.query_params.get("is_reread")

        if book_slug:
            queryset = queryset.filter(book__slug=book_slug)
        if year:
            queryset = queryset.filter(read_date__year=year)
        if rating:
            queryset = queryset.filter(rating=rating)
        if is_reread and is_reread.lower() == "true":
            queryset = queryset.filter(is_reread=True)

        tags_param = self.request.query_params.get("tags")
        if tags_param:
            tag_list = [t.strip() for t in tags_param.split(",") if t.strip()]
            for tag in tag_list:
                queryset = queryset.filter(tags__contains=tag)

        return queryset.filter(user=self.request.user).order_by("-read_date", "-created_at")

    def perform_create(self, serializer):
        book = serializer.validated_data.get("book")
        previous_entries = DiaryEntry.objects.filter(
            user=self.request.user, book=book
        ).exists()
        serializer.save(user=self.request.user, is_reread=previous_entries)

    def perform_update(self, serializer):
        serializer.save(user=self.request.user)


class ReadlistViewSet(viewsets.ModelViewSet):
    serializer_class = ReadlistSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Readlist.objects.filter(user=self.request.user).select_related("book")
        status_filter = self.request.query_params.get("status")
        if status_filter in dict(Readlist.STATUS_CHOICES):
            queryset = queryset.filter(status=status_filter)
        return queryset.order_by("-created_at")

    def perform_create(self, serializer):
        status_val = serializer.validated_data.get("status", Readlist.WANT_TO_READ)
        defaults = {"user": self.request.user}
        if status_val == Readlist.READING:
            from datetime import date
            defaults["start_date"] = date.today()
        serializer.save(**defaults)

    def perform_update(self, serializer):
        if serializer.validated_data.get("status") == Readlist.READING and not serializer.instance.start_date:
            from datetime import date
            serializer.save(start_date=date.today())
        else:
            serializer.save()


class BookListViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "retrieve":
            from .serializers import BookListDetailSerializer
            return BookListDetailSerializer
        return BookListSerializer

    def get_queryset(self):
        return BookList.objects.filter(user=self.request.user).prefetch_related("items__book").order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"])
    def add_book(self, request, pk=None):
        book_list = self.get_object()
        book_id = request.data.get("book_id")
        notes = request.data.get("notes", "")
        if not book_id:
            return Response({"detail": "book_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            book = Book.objects.get(pk=book_id)
        except Book.DoesNotExist:
            return Response({"detail": "Book not found"}, status=status.HTTP_404_NOT_FOUND)
        if book_list.items.filter(book=book).exists():
            return Response({"detail": "Book already in list"}, status=status.HTTP_409_CONFLICT)
        max_pos = book_list.items.aggregate(m=Max("position"))["m"] or 0
        item = BookListItem.objects.create(book_list=book_list, book=book, position=max_pos + 1, notes=notes)
        from .serializers import BookListItemSerializer
        return Response(BookListItemSerializer(item).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def remove_book(self, request, pk=None):
        book_list = self.get_object()
        item_id = request.data.get("item_id")
        if not item_id:
            return Response({"detail": "item_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            item = book_list.items.get(pk=item_id)
            item.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except BookListItem.DoesNotExist:
            return Response({"detail": "Item not found"}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=["post"])
    def reorder(self, request, pk=None):
        book_list = self.get_object()
        order = request.data.get("order", [])
        if not isinstance(order, list):
            return Response({"detail": "order must be a list of item_ids"}, status=status.HTTP_400_BAD_REQUEST)
        for idx, item_id in enumerate(order):
            book_list.items.filter(pk=item_id).update(position=idx)
        return Response({"status": "ok"})


class FavoriteBookViewSet(viewsets.ModelViewSet):
    serializer_class = FavoriteBookSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return FavoriteBook.objects.filter(user=self.request.user).select_related("book").order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_destroy(self, instance):
        if instance.user != self.request.user:
            return Response(status=status.HTTP_403_FORBIDDEN)
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def my_stats_view(request):
    diary_entries = DiaryEntry.objects.filter(user=request.user)
    reviews = Review.objects.filter(user=request.user)

    total_read = diary_entries.count()
    this_year = diary_entries.filter(read_date__year=date.today().year).count()
    avg_rating = reviews.aggregate(avg=Avg("rating"))["avg"]
    avg_rating = round(float(avg_rating), 2) if avg_rating else 0

    genre_counts = (
        diary_entries.values("book__categories")
        .annotate(count=Count("book__categories"))
        .order_by("-count")[:5]
    )
    favorite_genres = [g["book__categories"] for g in genre_counts if g["book__categories"]]

    return Response({
        "total_books_read": total_read,
        "books_read_this_year": this_year,
        "total_reviews": reviews.count(),
        "average_rating": avg_rating,
        "favorite_genres": favorite_genres,
    })


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
@throttle_classes([])
def health_check(_request):
    redis_ok = cache_service.redis_health()
    return Response({
        "status": "healthy",
        "cache": "redis" if redis_ok else "fallback",
    })
