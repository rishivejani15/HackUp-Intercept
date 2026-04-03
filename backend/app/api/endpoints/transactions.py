from fastapi import APIRouter, HTTPException
from typing import List
from app.models.transaction import TransactionBase
from app.db.firebase_admin import db

router = APIRouter()

@router.get("/", response_model=List[TransactionBase])
async def get_transactions():
    try:
        # Fetch from Firestore
        if db:
            docs = db.collection("transactions").stream()
            transactions = [doc.to_dict() for doc in docs]
            
            if transactions:
                return transactions
        
        # If no data in Firestore yet, return some mock data for development
        return [
            {
                "transaction_id": "TX-5902",
                "amount": 1240.50,
                "risk_score": 92,
                "status": "fraud",
                "time": "2 mins ago",
                "merchant": "Electronics Hub",
                "top_feature": "Unusual Amount"
            },
            {
                "transaction_id": "TX-5899",
                "amount": 45.00,
                "risk_score": 12,
                "status": "safe",
                "time": "15 mins ago",
                "merchant": "Daily Brew Coffee",
                "top_feature": "Normal Pattern"
            }
        ]
    except Exception as e:
        print(f"Firestore error: {e}")
        # Fallback to mock data on error for now
        return [
            {
                "transaction_id": "TX-5902",
                "amount": 1240.50,
                "risk_score": 92,
                "status": "fraud",
                "time": "2 mins ago",
                "merchant": "Electronics Hub",
                "top_feature": "Unusual Amount"
            }
        ]

@router.get("/{txn_id}", response_model=TransactionBase)
async def get_transaction(txn_id: str):
    if not db:
        raise HTTPException(status_code=500, detail="Firestore not initialized")
        
    doc_ref = db.collection("transactions").document(txn_id).get()
    if not doc_ref.exists:
        # Try searching by field if txn_id is not the document ID
        docs = db.collection("transactions").where("transaction_id", "==", txn_id).limit(1).get()
        if not docs:
            raise HTTPException(status_code=404, detail="Transaction not found")
        return docs[0].to_dict()
        
    return doc_ref.to_dict()
