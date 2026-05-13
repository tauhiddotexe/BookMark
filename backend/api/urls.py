from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    BookListViewSet,
    BookViewSet,
    CommentViewSet,
    FeedView,
    FollowUserView,
    MeView,
    NotificationListView,
    ProfileView,
    ReviewViewSet,
    ShelfEntryViewSet,
    DiaryEntryViewSet,
    UnfollowUserView,
    stats_view,
    health_check,
    ActivityViewSet,
)

router = DefaultRouter()
router.register("books", BookViewSet, basename="book")
router.register("reviews", ReviewViewSet, basename="review")
router.register("comments", CommentViewSet, basename="comment")
router.register("shelves", ShelfEntryViewSet, basename="shelf")
router.register("lists", BookListViewSet, basename="list")
router.register("diary", DiaryEntryViewSet, basename="diary")
router.register("activities", ActivityViewSet, basename="activity")

urlpatterns = [
    path("auth/me/", MeView.as_view(), name="me"),
    path("feed/", FeedView.as_view(), name="feed"),
    path("profiles/<str:username>/", ProfileView.as_view(), name="profile"),
    path("profiles/<str:username>/follow/", FollowUserView.as_view(), name="follow-user"),
    path("profiles/<str:username>/unfollow/", UnfollowUserView.as_view(), name="unfollow-user"),
    path("notifications/", NotificationListView.as_view(), name="notifications"),
    path("stats/", stats_view, name="stats"),
    path("health-check/", health_check, name="health-check"),
    path("", include(router.urls)),
]
