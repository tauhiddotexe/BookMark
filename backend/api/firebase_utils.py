import threading
import os
import json
import logging
import uuid
from django.db import IntegrityError
import firebase_admin
from firebase_admin import auth, credentials
from django.conf import settings
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
            # Already tried and failed — don't retry every request
            return _init_success

        _init_attempted = True

        # 1. Try loading from JSON string in environment variable
        service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
        # 2. Try loading from file path in environment variable
        service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")

        logger.info(
            f"[Firebase Init] Starting. "
            f"JSON env set: {bool(service_account_json)}, "
            f"PATH env set: {bool(service_account_path)}, "
            f"PATH value: {service_account_path}"
        )

        if service_account_json:
            try:
                cert = json.loads(service_account_json)
                cred = credentials.Certificate(cert)
                firebase_admin.initialize_app(cred)
                logger.info("[Firebase Init] Success via FIREBASE_SERVICE_ACCOUNT_JSON")
                _init_success = True
                return True
            except Exception as e:
                logger.error(f"[Firebase Init] Failed with JSON env: {e}")

        if service_account_path:
            # Try multiple paths — the .env path may be a Windows host path
            # that doesn't exist inside Docker
            candidates = [service_account_path]
            basename = os.path.basename(service_account_path)

            # Add fallback paths for Docker container
            candidates.append(os.path.join(os.getcwd(), basename))
            candidates.append(os.path.join("/app", basename))
            candidates.append(os.path.join("/app/backend", basename))

            for path_to_use in candidates:
                if os.path.exists(path_to_use):
                    try:
                        cred = credentials.Certificate(path_to_use)
                        firebase_admin.initialize_app(cred)
                        logger.info(f"[Firebase Init] Success via path: {path_to_use}")
                        _init_success = True
                        return True
                    except Exception as e:
                        logger.error(f"[Firebase Init] Failed with path {path_to_use}: {e}")
                else:
                    logger.debug(f"[Firebase Init] Path not found: {path_to_use}")

            logger.error(
                f"[Firebase Init] FIREBASE_SERVICE_ACCOUNT_PATH is set but no valid "
                f"file found. Checked: {candidates}"
            )

        # Fallback to default credentials (e.g. GCP metadata server)
        try:
            firebase_admin.initialize_app()
            logger.info("[Firebase Init] Success via default credentials")
            _init_success = True
            return True
        except Exception as e:
            logger.error(
                f"[Firebase Init] FAILED completely. No Firebase credentials available. "
                f"Token verification will fail for all requests. Error: {e}"
            )
            _init_success = False
            return False


def verify_firebase_token(id_token):
    init_ok = initialize_firebase()
    if not init_ok:
        logger.error(
            "[Firebase Auth] Cannot verify token — Firebase Admin SDK not initialized. "
            "Check FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH env vars."
        )
        return None

    try:
        decoded_token = auth.verify_id_token(id_token)
        logger.debug(
            f"[Firebase Auth] Token verified: uid={decoded_token.get('uid')}, "
            f"email={decoded_token.get('email')}"
        )
        return decoded_token
    except auth.ExpiredIdTokenError as e:
        logger.warning(f"[Firebase Auth] Token EXPIRED: {e}")
        return None
    except auth.InvalidIdTokenError as e:
        logger.warning(
            f"[Firebase Auth] Token INVALID (bad signature, wrong issuer, "
            f"or audience mismatch): {e}"
        )
        return None
    except auth.RevokedIdTokenError as e:
        logger.warning(f"[Firebase Auth] Token REVOKED: {e}")
        return None
    except ValueError as e:
        logger.warning(f"[Firebase Auth] Token VALUE ERROR (malformed): {e}")
        return None
    except Exception as e:
        logger.error(
            f"[Firebase Auth] Token verification UNEXPECTED {type(e).__name__}: {e}"
        )
        return None


def get_or_create_firebase_user(decoded_token):
    uid = decoded_token.get("uid")
    email = decoded_token.get("email")
    name = decoded_token.get("name", "")

    logger.info(f"[User Sync] Start: uid={uid}, email={email}, name={name}")

    # --- Step 1: Find existing user ---
    user = None
    if uid:
        user = User.objects.filter(firebase_uid=uid).first()

    if not user and email:
        user = User.objects.filter(email=email).first()
        if user:
            logger.info(
                f"[User Sync] Found existing user by email ({email}), "
                f"linking firebase_uid: {user.username}"
            )
            try:
                user.firebase_uid = uid
                user.save(update_fields=["firebase_uid"])
            except Exception as e:
                logger.warning(f"[User Sync] Failed to link firebase_uid: {e}")

    # --- Step 2: Create user if not found ---
    if not user:
        raw_name = decoded_token.get("name", "")
        # Sanitize: only keep alphanumeric, underscores, dots, hyphens
        base_username = "".join(
            c if c.isalnum() or c in "_.-" else "_" for c in raw_name.lower()
        ).strip("_.-")
        if not base_username or len(base_username) < 2:
            base_username = (uid or "user")[:15]
        # Truncate to safe length
        base_username = base_username[:30]
        username = base_username

        max_tries = 10
        for i in range(max_tries):
            try:
                logger.info(f"[User Sync] Creating user: {username}, email={email}")
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=None,
                    firebase_uid=uid,
                )
                logger.info(f"[User Sync] User created: {user.username} (id={user.id})")
                break
            except Exception as e:
                logger.warning(f"[User Sync] Create attempt {i + 1} failed: {e}")
                # Check if concurrent request already created this user
                existing = None
                if uid:
                    existing = User.objects.filter(firebase_uid=uid).first()
                if not existing and email:
                    existing = User.objects.filter(email=email).first()

                if existing:
                    logger.info(
                        f"[User Sync] Found concurrently-created user: {existing.username}"
                    )
                    user = existing
                    break

                username = f"{base_username}_{uuid.uuid4().hex[:6]}"
                logger.info(f"[User Sync] Retrying with username: {username}")

        if not user:
            logger.error("[User Sync] FAILED to create user after all retries")
            return None
    else:
        logger.info(f"[User Sync] Found existing user: {user.username} (id={user.id})")

    # --- Step 3: Guaranteed Profile creation ---
    try:
        profile = Profile.objects.filter(user=user).first()
        if not profile:
            logger.info(f"[User Sync] Creating missing profile for: {user.username}")
            profile = Profile.objects.create(
                user=user,
                display_name=name or user.username,
                avatar_url=decoded_token.get("picture", ""),
            )
            logger.info(f"[User Sync] Profile created for: {user.username}")
    except Exception as e:
        logger.error(f"[User Sync] Profile create/fetch error for {user.username}: {e}")
        # Race condition with signal — try to fetch what the signal created
        profile = Profile.objects.filter(user=user).first()

    if profile:
        modified = False
        if name and not profile.display_name:
            profile.display_name = name
            modified = True

        picture = decoded_token.get("picture")
        if picture and not profile.avatar_url:
            profile.avatar_url = picture
            modified = True

        if modified:
            try:
                profile.save(update_fields=["display_name", "avatar_url"])
            except Exception as e:
                logger.warning(
                    f"[User Sync] Failed to update profile fields for {user.username}: {e}"
                )

    # --- Step 4: Sync first/last name ---
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
        except Exception as e:
            logger.warning(f"[User Sync] Failed to update user fields: {e}")

    return user
