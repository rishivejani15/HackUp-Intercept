import asyncio
import json
from datetime import datetime, timezone
import re
from urllib import request as urllib_request

from fastapi import APIRouter, Header, HTTPException, status

from app.core.config import settings
from app.models.simulator import (
    ExplainRequest,
    ExplainResultData,
    ExplainResultResponse,
    FraudEvaluationResult,
    SimulatedTransaction,
)
from app.services.fraud_model_service import evaluate_transaction
from app.db.firebase_admin import db

router = APIRouter()
SIM_CODE_REGEX = re.compile(r"^SIM-[A-Z2-9]{6}-[A-Z2-9]{6}-[A-Z2-9]{6}$")


async def _call_hf_explain(payload: dict) -> dict:
    body = json.dumps(payload).encode("utf-8")
    req = urllib_request.Request(
        settings.HF_EXPLAIN_API_URL,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    def _send_request() -> dict:
        with urllib_request.urlopen(req, timeout=settings.HF_EXPLAIN_API_TIMEOUT_SECONDS) as response:
            raw = response.read().decode("utf-8")
            parsed = json.loads(raw)
            if not isinstance(parsed, dict):
                raise ValueError("Unexpected explain API response format")
            return parsed

    return await asyncio.to_thread(_send_request)


@router.post("/evaluate", response_model=FraudEvaluationResult)
async def evaluate_simulated_transaction(
    transaction: SimulatedTransaction,
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
):
    if not x_api_key or not SIM_CODE_REGEX.match(x_api_key.strip()):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid simulator code. Generate a new code from dashboard.",
        )

    result = await evaluate_transaction(transaction)

    # Best effort event log for simulator diagnostics.
    if db:
        user_id = transaction.user_id or "banker-simulator"
        record = {
            "id": transaction.transaction_id,
            "transaction_id": transaction.transaction_id,
            "amount": transaction.amount,
            "merchant": transaction.merchant,
            "status": result["label"],
            "fraud": "yes" if result["is_fraud"] else "no",
            "risk_score": result["risk_score"],
            "top_feature": result["reason"],
            "time": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
            "timestamp": transaction.timestamp,
            "created_at": result["processed_at"],
            "country": transaction.country,
            "payment_method": transaction.payment_method,
            "currency": transaction.currency,
            "simulator_code": x_api_key,
            "userId": user_id,
            "user_id": user_id,
        }
        db.collection("transactions").document(transaction.transaction_id).set(record)
        db.collection("simulator_events").add(
            {
                "simulator_code": x_api_key,
                "transaction": transaction.model_dump(),
                "result": result,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )

    return FraudEvaluationResult(**result)


@router.post("/explain", response_model=ExplainResultResponse)
async def explain_transaction(transaction: ExplainRequest):
    payload = transaction.model_dump()

    try:
        explain_response = await _call_hf_explain(payload)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Explain API call failed: {exc}",
        ) from exc

    if explain_response.get("status") != "success":
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Explain API returned a non-success response",
        )

    data = explain_response.get("data") or {}
    classification = str(data.get("classification", "review")).lower()
    risk_score = float(data.get("risk_score", 0.0))
    fraud_probability = float(data.get("fraud_probability", 0.0))
    explainability = data.get("explainability") if isinstance(data.get("explainability"), dict) else None

    if db:
        tx_doc_id = transaction.source_doc_id or transaction.transaction_id
        top_signal = ""
        if explainability and isinstance(explainability.get("top_positive_signals"), list):
            first_signal = explainability["top_positive_signals"][0] if explainability["top_positive_signals"] else {}
            if isinstance(first_signal, dict):
                top_signal = str(first_signal.get("label") or first_signal.get("feature") or "")

        update_payload = {
            "transaction_id": transaction.transaction_id,
            "status": classification,
            "fraud": "yes" if classification == "fraud" else "no",
            "risk_score": round(risk_score, 2),
            "fraud_probability": round(fraud_probability, 6),
            "top_feature": top_signal or "Explainability signal",
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "explainability": explainability,
        }
        db.collection("transactions").document(tx_doc_id).set(update_payload, merge=True)

    return ExplainResultResponse(
        status="success",
        data=ExplainResultData(
            transaction_id=transaction.transaction_id,
            classification=classification,
            fraud_probability=fraud_probability,
            risk_score=risk_score,
            explainability=explainability,
        ),
    )
