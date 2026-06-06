from rest_framework import authentication
from rest_framework import exceptions
from .firebase_utils import verify_firebase_token, get_or_create_firebase_user
import logging

logger = logging.getLogger(__name__)


class FirebaseAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.META.get("HTTP_AUTHORIZATION")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None

        id_token = auth_header.split(" ", 1)[1]
        if not id_token or len(id_token) < 20:
            logger.warning(
                "[FirebaseAuth] Malformed or empty token received "
                f"(length={len(id_token) if id_token else 0})"
            )
            raise exceptions.AuthenticationFailed("Malformed Firebase token")

        decoded_token = verify_firebase_token(id_token)

        if not decoded_token:
            # verify_firebase_token already logs the specific reason
            raise exceptions.AuthenticationFailed("Invalid or expired Firebase token")

        uid = decoded_token.get("uid", "???")
        logger.info(f"[FirebaseAuth] Token verified OK for uid={uid}")

        try:
            user = get_or_create_firebase_user(decoded_token)
        except Exception:
            logger.exception(
                f"[FirebaseAuth] Unhandled exception in get_or_create_firebase_user for uid={uid}"
            )
            raise exceptions.AuthenticationFailed("User synchronization failed")

        if not user:
            logger.error(
                f"[FirebaseAuth] get_or_create_firebase_user returned None for uid={uid}"
            )
            raise exceptions.AuthenticationFailed("User synchronization failed")

        logger.info(
            f"[FirebaseAuth] Authenticated user={user.username} (id={user.id}) for uid={uid}"
        )
        return (user, None)
