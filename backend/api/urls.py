from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    BookListViewSet,
    BookViewSet,
    CommentViewSet,
    FeedView,
    FollowUserView,
    MeView,
    NotificationListView,
    ProfileView,
    RegisterView,
    ReviewViewSet,
    ShelfEntryViewSet,
    UnfollowUserView,
    stats_view,
)

router = DefaultRouter()
router.register("books", BookViewSet, basename="book")
router.register("reviews", ReviewViewSet, basename="review")
router.register("comments", CommentViewSet, basename="comment")
router.register("shelves", ShelfEntryViewSet, basename="shelf")
router.register("lists", BookListViewSet, basename="list")

urlpatterns = [
    path("auth/signup/", RegisterView.as_view(), name="signup"),
    path("auth/login/", TokenObtainPairView.as_view(), name="login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="refresh"),
    path("auth/me/", MeView.as_view(), name="me"),
    path("feed/", FeedView.as_view(), name="feed"),
    path("profiles/<str:username>/", ProfileView.as_view(), name="profile"),
    path("profiles/<str:username>/follow/", FollowUserView.as_view(), name="follow-user"),
    path("profiles/<str:username>/unfollow/", UnfollowUserView.as_view(), name="unfollow-user"),
    path("notifications/", NotificationListView.as_view(), name="notifications"),
    path("stats/", stats_view, name="stats"),
    path("", include(router.urls)),
]
