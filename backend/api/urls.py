from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    BookListViewSet,
    BookViewSet,
    DiaryEntryViewSet,
    FavoriteBookViewSet,
    MeView,
    MyProfileView,
    ReadlistViewSet,
    ReviewViewSet,
    health_check,
    my_stats_view,
)

router = DefaultRouter()
router.register("books", BookViewSet, basename="book")
router.register("reviews", ReviewViewSet, basename="review")
router.register("diary", DiaryEntryViewSet, basename="diary")
router.register("readlist", ReadlistViewSet, basename="readlist")
router.register("lists", BookListViewSet, basename="list")
router.register("favorites", FavoriteBookViewSet, basename="favorite")

urlpatterns = [
    path("auth/me/", MeView.as_view(), name="me"),
    path("me/", MyProfileView.as_view(), name="my-profile"),
    path("stats/", my_stats_view, name="my-stats"),
    path("health-check/", health_check, name="health-check"),
    path("", include(router.urls)),
]
