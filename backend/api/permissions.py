from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        for attr in ("user", "follower", "recipient"):
            owner = getattr(obj, attr, None)
            if owner is not None:
                return owner == request.user
        return False
