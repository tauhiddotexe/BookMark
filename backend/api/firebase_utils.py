import os
import json
import firebase_admin
from firebase_admin import auth, credentials
from django.conf import settings
from django.contrib.auth.models import User
from django.core.exceptions import ImproperlyConfigured

def initialize_firebase():
    if not firebase_admin._apps:
        # 1. Try loading from JSON string in environment variable
        service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
        # 2. Try loading from file path in environment variable
        service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")

        if service_account_json:
            try:
                cert = json.loads(service_account_json)
                cred = credentials.Certificate(cert)
                firebase_admin.initialize_app(cred)
                return
            except Exception as e:
                print(f"Error initializing Firebase with JSON: {e}")
        
        if service_account_path and os.path.exists(service_account_path):
            try:
                cred = credentials.Certificate(service_account_path)
                firebase_admin.initialize_app(cred)
                return
            except Exception as e:
                print(f"Error initializing Firebase with path {service_account_path}: {e}")

        # Fallback to default credentials
        try:
            firebase_admin.initialize_app()
        except Exception as e:
            # Only raise if no apps were initialized at all
            if not firebase_admin._apps:
                print(f"Firebase initialization failed: {e}")

def verify_firebase_token(id_token):
    initialize_firebase()
    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        print(f"Firebase token verification failed: {e}")
        return None

def get_or_create_firebase_user(decoded_token):
    uid = decoded_token.get("uid")
    email = decoded_token.get("email")
    name = decoded_token.get("name", "")
    
    # Try to find user by Firebase UID (stored in a profile or similar)
    # For now, we'll use email as the primary link if available
    user = None
    if email:
        user = User.objects.filter(email=email).first()
    
    if not user:
        # Create a new user if not found
        # We need a unique username. Firebase UID is a good candidate if we don't have one.
        username = decoded_token.get("name", "").replace(" ", "_").lower() or uid[:15]
        # Ensure username is unique
        if User.objects.filter(username=username).exists():
            username = f"{username}_{uid[:5]}"
        
        user = User.objects.create_user(
            username=username,
            email=email,
            password=None # Password managed by Firebase
        )
        if name:
            first_name = name.split(" ")[0]
            last_name = " ".join(name.split(" ")[1:])
            user.first_name = first_name
            user.last_name = last_name
            user.save()
            
    return user
