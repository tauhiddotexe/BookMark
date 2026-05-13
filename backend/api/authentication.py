from rest_framework import authentication
from rest_framework import exceptions
from .firebase_utils import verify_firebase_token, get_or_create_firebase_user

class FirebaseAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.META.get("HTTP_AUTHORIZATION")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None

        id_token = auth_header.split(" ").pop()
        decoded_token = verify_firebase_token(id_token)
        
        if not decoded_token:
            raise exceptions.AuthenticationFailed("Invalid Firebase token")

        user = get_or_create_firebase_user(decoded_token)
        return (user, None)
