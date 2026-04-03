import json
import firebase_admin
from firebase_admin import credentials, firestore

try:
    # Try initializing without explicit credentials, it will use ADC (e.g. gcloud auth application-default login)
    app = firebase_admin.initialize_app()
except Exception as e:
    print("Could not initialize with ADC:", e)
    # If not, let's try reading the project from environment
    try:
        app = firebase_admin.initialize_app(options={'projectId': 'interceptai-e82e5'})
    except Exception as e2:
        print("Could not initialize with explicit projectId:", e2)

db = firestore.client()

with open("generated_transactions.json", "r") as f:
    transactions = json.load(f)

print(f"Uploading {len(transactions)} transactions...")

count = 0
for tx in transactions:
    tx_id = tx["transaction_id"]
    try:
        db.collection("transactions").document(tx_id).set(tx)
        count += 1
    except Exception as e:
        print(f"Failed to upload {tx_id}:", e)

print(f"Successfully uploaded {count} transactions.")
