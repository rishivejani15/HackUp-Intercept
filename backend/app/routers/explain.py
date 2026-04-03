"""POST /explain — single transaction SHAP explainability endpoint.
POST /batch-explain — batch transaction SHAP explainability endpoint.

These are the primary endpoints of the explainability service.
They accept feature vectors (output of friend's FeatureEngineer) and return
full SHAP explanations with waterfall data and human-readable text.
"""

from __future__ import annotations

import pandas as pd
import structlog
from fastapi import APIRouter, Depends, Request

from app.core.exceptions import BatchLimitExceededError, FeatureValidationError
from app.middleware.timing import RequestTimer, get_timer
from app.schemas.response_schemas import (
    BatchExplainData,
    BatchExplainRequest,
    BatchExplainResponse,
    ExplainData,
    ExplainRequest,
    ExplainResponse,
)
from app.schemas.shap_schemas import SHAPExplanation
from app.services.explanation_service import ExplanationService
from app.services.shap_service import SHAPService
from app.services.waterfall_service import WaterfallService

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/explain", tags=["Explainability"])


# ---------------------------------------------------------------------------
# POST /explain — single transaction
# ---------------------------------------------------------------------------

@router.post(
    "",
    response_model=ExplainResponse,
    summary="Explain a single transaction",
    description=(
        "Accepts a flat feature dict (output of FeatureEngineer.transform()) "
        "and returns SHAP values, waterfall data, and human-readable explanations."
    ),
)
async def explain_single(
    request: Request,
    body: ExplainRequest,
    timer: RequestTimer = Depends(get_timer),
) -> ExplainResponse:
    shap_svc: SHAPService = request.app.state.shap_service
    waterfall_svc: WaterfallService = request.app.state.waterfall_service
    explanation_svc: ExplanationService = request.app.state.explanation_service

    # Validate we got at least one feature
    if not body.features:
        raise FeatureValidationError("'features' dict must not be empty.")

    # Build 1-row DataFrame from the features dict
    features_df = pd.DataFrame([body.features])

    # Core SHAP computation
    raw_result = shap_svc.explain_single(features_df)

    # Waterfall data
    waterfall = waterfall_svc.build(raw_result)

    # Context for template rendering
    ctx = _build_context(body)

    # Top features with human explanations
    top_features = explanation_svc.build_top_features(raw_result, ctx)

    # Final fraud probability and classification
    fraud_probability = float(raw_result.output_value)
    risk_score = round(fraud_probability * 100, 1)
    classification = _classify(
        fraud_probability,
        request.app.state.settings.fraud_threshold,
        request.app.state.settings.suspicious_threshold,
    )

    # Human-readable explanation
    human_explanation = explanation_svc.build_human_explanation(
        top_features, fraud_probability, ctx
    )

    shap_explanation = SHAPExplanation(
        base_value=raw_result.base_value,
        output_value=raw_result.output_value,
        top_features=top_features,
        waterfall=waterfall,
    )

    data = ExplainData(
        transaction_id=body.meta.transaction_id,
        risk_score=risk_score,
        fraud_probability=round(fraud_probability, 6),
        classification=classification,
        shap_explanation=shap_explanation,
        human_explanation=human_explanation,
    )

    logger.info(
        "Single explanation generated",
        transaction_id=body.meta.transaction_id,
        risk_score=risk_score,
        classification=classification,
        latency_ms=timer.elapsed_ms,
    )

    return ExplainResponse(latency_ms=timer.elapsed_ms, data=data)


# ---------------------------------------------------------------------------
# POST /batch-explain — batch transactions
# ---------------------------------------------------------------------------

@router.post(
    "/batch",
    response_model=BatchExplainResponse,
    summary="Explain multiple transactions",
    description=(
        "Batch endpoint for explaining up to 1000 transactions at once. "
        "All feature engineering is vectorized for maximum throughput."
    ),
)
async def explain_batch(
    request: Request,
    body: BatchExplainRequest,
    timer: RequestTimer = Depends(get_timer),
) -> BatchExplainResponse:
    shap_svc: SHAPService = request.app.state.shap_service
    waterfall_svc: WaterfallService = request.app.state.waterfall_service
    explanation_svc: ExplanationService = request.app.state.explanation_service
    settings = request.app.state.settings

    batch_size = len(body.batch)
    if batch_size > settings.batch_limit:
        raise BatchLimitExceededError(
            f"Batch size {batch_size} exceeds limit of {settings.batch_limit}."
        )

    # Stack all feature dicts into one DataFrame (vectorized)
    all_features = pd.DataFrame([item.features for item in body.batch])

    # Batch SHAP — one call, vectorized
    raw_results = shap_svc.explain_batch(all_features)

    results: list[ExplainData] = []
    failed_count = 0

    for i, (item, raw_result) in enumerate(zip(body.batch, raw_results)):
        try:
            waterfall = waterfall_svc.build(raw_result)
            ctx = _build_context(item)  # type: ignore[arg-type]
            top_features = explanation_svc.build_top_features(raw_result, ctx)

            fraud_probability = float(raw_result.output_value)
            risk_score = round(fraud_probability * 100, 1)
            classification = _classify(
                fraud_probability,
                settings.fraud_threshold,
                settings.suspicious_threshold,
            )
            human_explanation = explanation_svc.build_human_explanation(
                top_features, fraud_probability, ctx
            )

            results.append(
                ExplainData(
                    transaction_id=item.meta.transaction_id,
                    risk_score=risk_score,
                    fraud_probability=round(fraud_probability, 6),
                    classification=classification,
                    shap_explanation=SHAPExplanation(
                        base_value=raw_result.base_value,
                        output_value=raw_result.output_value,
                        top_features=top_features,
                        waterfall=waterfall,
                    ),
                    human_explanation=human_explanation,
                )
            )
        except Exception as exc:
            # Log and skip failed items instead of aborting the whole batch
            failed_count += 1
            logger.error(
                "Failed to explain batch item",
                index=i,
                transaction_id=item.meta.transaction_id,
                error=str(exc),
            )

    logger.info(
        "Batch explanation complete",
        batch_size=batch_size,
        succeeded=len(results),
        failed=failed_count,
        latency_ms=timer.elapsed_ms,
    )

    return BatchExplainResponse(
        latency_ms=timer.elapsed_ms,
        data=BatchExplainData(
            results=results,
            count=len(results),
            failed_count=failed_count,
        ),
    )


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _build_context(body) -> dict:
    """Build the context dict passed to explanation templates."""
    meta = body.meta if hasattr(body, "meta") else body  # type: ignore[union-attr]
    return {
        "amount":          meta.amount,
        "user_avg_amount": meta.user_avg_amount,
        "merchant_city":   meta.merchant_city,
        "merchant_state":  meta.merchant_state,
        "user_state":      meta.user_state,
        "mcc_description": meta.mcc_description,
        "hour":            meta.hour,
        "minute":          meta.minute,
        "seconds_gap":     meta.seconds_gap,
    }


def _classify(probability: float, fraud_threshold: float, suspicious_threshold: float) -> str:
    if probability >= fraud_threshold:
        return "fraud"
    if probability >= suspicious_threshold:
        return "suspicious"
    return "legitimate"
