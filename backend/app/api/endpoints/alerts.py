from fastapi import APIRouter
from typing import List
from app.models.alert import AlertBase
from app.db.firebase_admin import db

router = APIRouter()

@router.get("/", response_model=List[AlertBase])
async def get_alerts():
    try:
        if db:
            docs = db.collection("alerts").stream()
            alerts = [doc.to_dict() for doc in docs]
            if alerts:
                return alerts
                
        # Mock data for development
        return [
            {
                "title": "Unusual Withdrawal",
                "description": "High-value withdrawal detected from an unverified location.",
                "severity": "critical",
                "status": "active"
            },
            {
                "title": "Velocity Spike",
                "description": "Multiple small transactions within seconds.",
                "severity": "medium",
                "status": "active"
            }
        ]
    except Exception as e:
        print(f"Firestore alerts error: {e}")
        return [
            {
                "title": "Unusual Withdrawal",
                "description": "High-value withdrawal detected from an unverified location.",
                "severity": "critical",
                "status": "active"
            }
        ]
