import threading
import os
import json
import logging
import uuid

import firebase_admin
from firebase_admin import auth, credentials
from django.contrib.auth import get_user_model
from .models import Profile

User = get_user_model()
logger = logging.getLogger(__name__)

_init_lock = threading.Lock()
_init_attempted = False
_init_success = False


def initialize_firebase():
    global _init_attempted, _init_success

    if firebase_admin._apps:
        return True

    with _init_lock:
        if firebase_admin._apps:
            return True

        if _init_attempted:
            return _init_success

        _init_attempted = True

        service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
        service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")

        if service_account_json:
            try:
                cert = json.loads(service_account_json)
                cred = credentials.Certificate(cert)
                firebase_admin.initialize_app(cred)
                _init_success = True
                return True
            except Exception as e:
                logger.error(f"[Firebase Init] Failed with JSON env: {e}")

        if service_account_path:
            candidates = [service_account_path]
            basename = os.path.basename(service_account_path)
            candidates.append(os.path.join(os.getcwd(), basename))
            candidates.append(os.path.join("/app", basename))
            candidates.append(os.path.join("/app/backend", basename))

            for path_to_use in candidates:
                if os.path.exists(path_to_use):
                    try:
                        cred = credentials.Certificate(path_to_use)
                        firebase_admin.initialize_app(cred)
                        _init_success = True
                        return True
                    except Exception as e:
                        logger.error(f"[Firebase Init] Failed with path {path_to_use}: {e}")

        try:
            firebase_admin.initialize_app()
            _init_success = True
            return True
        except Exception as e:
            logger.error(f"[Firebase Init] FAILED completely. Error: {e}")
            _init_success = False
            return False


def verify_firebase_token(id_token):
    init_ok = initialize_firebase()
    if not init_ok:
        logger.error("[Firebase Auth] Cannot verify token — Firebase Admin SDK not initialized.")
        return None

    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except auth.ExpiredIdTokenError as e:
        logger.warning(f"[Firebase Auth] Token EXPIRED: {e}")
        return None
    except auth.InvalidIdTokenError as e:
        logger.warning(f"[Firebase Auth] Token INVALID: {e}")
        return None
    except auth.RevokedIdTokenError as e:
        logger.warning(f"[Firebase Auth] Token REVOKED: {e}")
        return None
    except ValueError as e:
        logger.warning(f"[Firebase Auth] Token VALUE ERROR: {e}")
        return None
    except Exception as e:
        logger.error(f"[Firebase Auth] Token verification UNEXPECTED {type(e).__name__}: {e}")
        return None


def _sanitize_username(raw_name, uid):
    base = "".join(
        c if c.isalnum() or c in "_.-" else "_" for c in (raw_name or "").lower()
    ).strip("_.-")
    if not base or len(base) < 2:
        base = (uid or "user")[:15]
    return base[:30]


def get_or_create_firebase_user(decoded_token):
    uid = decoded_token.get("uid")
    email = decoded_token.get("email")
    name = decoded_token.get("name", "")
    fallback = (uid or "user")[:15]

    user = None
    if uid:
        user = User.objects.filter(firebase_uid=uid).first()

    if not user and email:
        user = User.objects.filter(email=email).first()
        if user:
            try:
                user.firebase_uid = uid
                user.save(update_fields=["firebase_uid"])
            except Exception as e:
                logger.warning(f"[User Sync] Failed to link firebase_uid: {e}")

    if not user:
        username = _sanitize_username(name, uid)

        for i in range(10):
            try:
                user = User.objects.create_user(
                    username=username, email=email, password=None, firebase_uid=uid,
                )
                break
            except Exception:
                existing = None
                if uid:
                    existing = User.objects.filter(firebase_uid=uid).first()
                if not existing and email:
                    existing = User.objects.filter(email=email).first()
                if existing:
                    user = existing
                    break
                username = f"{username[:23]}_{uuid.uuid4().hex[:6]}"

        if not user:
            logger.error("[User Sync] FAILED to create user after all retries")
            return None
    elif name:
        # Self-heal accounts created before the ID token carried the name claim.
        # The signup sync can race with updateProfile, so the first creation often
        # falls back to a uid-derived username. Align it with the token name here.
        sanitized = _sanitize_username(name, uid)
        if sanitized and sanitized != user.username and not User.objects.filter(
            username=sanitized
        ).exclude(pk=user.pk).exists():
            try:
                user.username = sanitized
                user.save(update_fields=["username"])
            except Exception:
                logger.warning("[User Sync] Failed to self-heal username")

    try:
        profile = Profile.objects.filter(user=user).first()
        if not profile:
            profile = Profile.objects.create(
                user=user,
                display_name=name or user.username,
                avatar_url=decoded_token.get("picture", ""),
            )
    except Exception:
        profile = Profile.objects.filter(user=user).first()

    if profile:
        modified = False
        if name and (not profile.display_name or profile.display_name == fallback):
            profile.display_name = name
            modified = True
        picture = decoded_token.get("picture")
        if picture and not profile.avatar_url:
            profile.avatar_url = picture
            modified = True
        if modified:
            try:
                profile.save(update_fields=["display_name", "avatar_url"])
            except Exception:
                pass

    user_modified = False
    if name and not user.first_name:
        parts = name.split(" ", 1)
        user.first_name = parts[0][:30]
        if len(parts) > 1:
            user.last_name = parts[1][:150]
        user_modified = True

    if not user.firebase_uid and uid:
        user.firebase_uid = uid
        user_modified = True

    if user_modified:
        try:
            user.save(update_fields=["first_name", "last_name", "firebase_uid"])
        except Exception:
            pass

    return user
