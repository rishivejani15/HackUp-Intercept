import firebase_admin
from firebase_admin import credentials, firestore
import os
import json
from app.core.config import settings

def initialize_firebase():
    """Initializes Firebase Admin SDK."""
    if not firebase_admin._apps:
        # Check for service account JSON in environment or a file path
        service_account_info = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
        
        if service_account_info:
            try:
                # If it's a JSON string
                cert_info = json.loads(service_account_info)
                cred = credentials.Certificate(cert_info)
            except json.JSONDecodeError:
                # If it's a file path
                cred = credentials.Certificate(service_account_info)
        else:
            # Fallback to default credentials or a local file for development
            # Placeholder for user's serviceAccountKey.json
            path = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")
            if os.path.exists(path):
                cred = credentials.Certificate(path)
            else:
                print("Warning: Firebase Service Account Key not found. Backend DB operations will fail.")
                return None
                
        firebase_admin.initialize_app(cred)
    
    return firestore.client()

# Singleton instance of firestore client
db = initialize_firebase()
