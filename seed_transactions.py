import json
import urllib.request
import random
import uuid
from datetime import datetime, timedelta

PROJECT_ID = "interceptai-e82e5"
URL = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents/transactions"

def generate_transactions(num=100):
    txs = []
    merchants = ["Amazon", "Walmart", "Target", "Starbucks", "Uber", "BestBuy", "Netflix", "Shell"]
    for i in range(num):
        is_fraud = random.random() < 0.2
        tx = {
            "fields": {
                "id": {"stringValue": str(uuid.uuid4())[:8]},
                "userId": {"stringValue": f"U-{random.randint(1000, 9999)}"},
                "amount": {"doubleValue": round(random.uniform(5.0, 5000.0), 2)},
                "merchant": {"stringValue": random.choice(merchants)},
                "timestamp": {"timestampValue": (datetime.utcnow() - timedelta(days=random.randint(0, 30), hours=random.randint(0, 23))).isoformat() + "Z"},
                "fraud": {"stringValue": "yes" if is_fraud else "no"}
            }
        }
        txs.append(tx)
    return txs

def upload_tx(tx):
    req = urllib.request.Request(
        URL, 
        data=json.dumps(tx).encode('utf-8'), 
        headers={'Content-Type': 'application/json'}, 
        method='POST'
    )
    try:
        urllib.request.urlopen(req)
        print(".", end="", flush=True)
    except Exception as e:
        print(f"X", end="", flush=True)

if __name__ == "__main__":
    print(f"Generating and uploading 100 dummy transactions to {PROJECT_ID}...")
    data = generate_transactions(100)
    for t in data:
        upload_tx(t)
    print("\nDone!")
