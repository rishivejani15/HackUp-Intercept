"""GET /transactions — paginated, filterable, sortable transaction feed.

Serves pre-scored transactions from the in-memory cache.
All SHAP explanations are pre-computed — no live ML at request time.
Target latency: <50ms for any page size.
"""

from __future__ import annotations

from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, Query, Request

from app.middleware.timing import RequestTimer, get_timer
from app.schemas.response_schemas import (
    HumanExplanation,
    TransactionRecord,
    TransactionsData,
    TransactionsResponse,
    ExplanationFactor,
)
from app.services.cache_service import CacheService

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/transactions", tags=["Transactions"])


@router.get(
    "",
    response_model=TransactionsResponse,
    summary="List scored transactions",
    description=(
        "Returns a paginated list of pre-scored transactions from the test set. "
        "Each transaction includes risk score, SHAP top features, and human-readable explanation."
    ),
)
async def list_transactions(
    request: Request,
    timer: RequestTimer = Depends(get_timer),
    page: Annotated[int, Query(ge=1, description="Page number")] = 1,
    page_size: Annotated[int, Query(ge=1, le=500, description="Items per page")] = 50,
    sort: Annotated[
        str, Query(description="Sort order: risk_desc | risk_asc | time_desc | amount_desc")
    ] = "risk_desc",
    min_risk: Annotated[
        float | None, Query(ge=0.0, le=100.0, description="Minimum risk score filter")
    ] = None,
    fraud_only: Annotated[
        bool, Query(description="Return only classified-fraud transactions")
    ] = False,
) -> TransactionsResponse:
    cache_svc: CacheService = request.app.state.cache_service

    rows, total = cache_svc.get_transactions(
        page=page,
        page_size=page_size,
        sort=sort,
        min_risk=min_risk,
        fraud_only=fraud_only,
    )

    records = [_row_to_record(r) for r in rows]

    logger.info(
        "Transactions served from cache",
        page=page,
        returned=len(records),
        total=total,
        latency_ms=timer.elapsed_ms,
    )

    return TransactionsResponse(
        latency_ms=timer.elapsed_ms,
        data=TransactionsData(
            transactions=records,
            total=total,
            page=page,
            page_size=page_size,
            has_next=(page * page_size) < total,
        ),
    )


# ---------------------------------------------------------------------------
# Row de-serialization
# ---------------------------------------------------------------------------

def _row_to_record(row: dict) -> TransactionRecord:
    """Convert a raw parquet row dict into a TransactionRecord.

    The parquet file stores top_features and human_explanation as JSON strings
    (Parquet's list-of-dicts support requires this approach).
    """
    import json

    raw_tf = row.get("top_features_json", "[]")
    top_features = json.loads(raw_tf) if isinstance(raw_tf, str) else raw_tf

    raw_he = row.get("human_explanation_json", "{}")
    he_dict = json.loads(raw_he) if isinstance(raw_he, str) else raw_he

    factors = [
        ExplanationFactor(**f) for f in he_dict.get("factors", [])
    ]
    human_explanation = HumanExplanation(
        headline=he_dict.get("headline", ""),
        summary=he_dict.get("summary", ""),
        factors=factors,
    )

    return TransactionRecord(
        id=str(row.get("id", "")),
        amount=float(row.get("amount", 0.0)),
        timestamp=str(row.get("timestamp", "")),
        merchant_name=str(row.get("merchant_name", "Unknown")),
        merchant_city=str(row.get("merchant_city", "")),
        risk_score=float(row.get("risk_score", 0.0)),
        classification=str(row.get("classification", "unknown")),
        top_features=top_features,
        human_explanation=human_explanation,
    )
