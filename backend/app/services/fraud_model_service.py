from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from typing import Any
from urllib import request as urllib_request

from app.core.config import settings
from app.models.simulator import SimulatedTransaction


def _utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _heuristic_evaluation(transaction: SimulatedTransaction) -> dict[str, Any]:
    score = min(100.0, max(1.0, (transaction.amount / 25.0)))

    if transaction.country.upper() not in {"US", "IN", "GB", "SG", "AE"}:
        score = min(100.0, score + 12)

    if transaction.payment_method.lower() in {"crypto", "giftcard"}:
        score = min(100.0, score + 10)

    is_fraud = score >= 70
    label = "fraud" if is_fraud else "safe"
    reason = (
        "High anomaly score from fallback engine"
        if is_fraud
        else "Transaction pattern within normal fallback threshold"
    )

    return {
        "transaction_id": transaction.transaction_id,
        "is_fraud": is_fraud,
        "label": label,
        "risk_score": round(score, 2),
        "reason": reason,
        "processed_at": _utc_iso(),
    }


def _normalize_external_response(
    transaction: SimulatedTransaction, response_json: dict[str, Any]
) -> dict[str, Any]:
    is_fraud = bool(
        response_json.get("is_fraud")
        or response_json.get("fraud")
        or str(response_json.get("label", "")).lower() == "fraud"
    )

    score = response_json.get("risk_score")
    if score is None:
        score = response_json.get("score", 0)

    try:
        score = float(score)
    except (TypeError, ValueError):
        score = 0.0

    score = max(0.0, min(100.0, score))
    label = "fraud" if is_fraud else "safe"
    reason = str(
        response_json.get("reason")
        or response_json.get("explanation")
        or "Model response received"
    )

    return {
        "transaction_id": transaction.transaction_id,
        "is_fraud": is_fraud,
        "label": label,
        "risk_score": round(score, 2),
        "reason": reason,
        "processed_at": _utc_iso(),
    }


async def evaluate_transaction(transaction: SimulatedTransaction) -> dict[str, Any]:
    if not settings.FRAUD_MODEL_API_URL:
        return _heuristic_evaluation(transaction)

    headers: dict[str, str] = {"Content-Type": "application/json"}
    if settings.FRAUD_MODEL_API_AUTH_HEADER and settings.FRAUD_MODEL_API_AUTH_TOKEN:
        headers[settings.FRAUD_MODEL_API_AUTH_HEADER] = settings.FRAUD_MODEL_API_AUTH_TOKEN

    payload = transaction.model_dump()

    try:
        body = json.dumps(payload).encode("utf-8")
        req = urllib_request.Request(
            settings.FRAUD_MODEL_API_URL,
            data=body,
            headers=headers,
            method="POST",
        )

        def _send_request() -> dict[str, Any]:
            with urllib_request.urlopen(req, timeout=settings.FRAUD_MODEL_API_TIMEOUT_SECONDS) as response:
                raw = response.read().decode("utf-8")
                return json.loads(raw)

        data = await asyncio.to_thread(_send_request)
        if not isinstance(data, dict):
            return _heuristic_evaluation(transaction)
        return _normalize_external_response(transaction, data)
    except Exception:
        return _heuristic_evaluation(transaction)
