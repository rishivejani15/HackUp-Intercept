"""GET /feature-importance — global SHAP feature importance.
GET /model-stats — model performance metrics.
GET /shap-summary — aggregate SHAP distribution statistics.
"""

from __future__ import annotations

import structlog
from fastapi import APIRouter, Depends, Request

from app.middleware.timing import RequestTimer, get_timer
from app.schemas.response_schemas import (
    ApiResponse,
    FeatureImportanceData,
    FeatureImportanceResponse,
    ModelStatsResponse,
)
from app.services.cache_service import CacheService
from app.services.shap_service import SHAPService

logger = structlog.get_logger(__name__)
router = APIRouter(tags=["Insights"])


# ---------------------------------------------------------------------------
# GET /feature-importance
# ---------------------------------------------------------------------------

@router.get(
    "/feature-importance",
    response_model=FeatureImportanceResponse,
    summary="Global SHAP feature importance",
    description=(
        "Returns the mean absolute SHAP value for each feature across the test set. "
        "Features are ranked by their overall influence on fraud predictions."
    ),
)
async def get_feature_importance(
    request: Request,
    timer: RequestTimer = Depends(get_timer),
) -> FeatureImportanceResponse:
    shap_svc: SHAPService = request.app.state.shap_service
    features = shap_svc.global_importance()

    return FeatureImportanceResponse(
        latency_ms=timer.elapsed_ms,
        data=FeatureImportanceData(
            features=features,
            total_features=len(features),
        ),
    )


# ---------------------------------------------------------------------------
# GET /model-stats
# ---------------------------------------------------------------------------

@router.get(
    "/model-stats",
    response_model=ModelStatsResponse,
    summary="Model performance statistics",
    description=(
        "Returns accuracy, precision, recall, F1, AUPRC, confusion matrix, "
        "and training dataset composition."
    ),
)
async def get_model_stats(
    request: Request,
    timer: RequestTimer = Depends(get_timer),
) -> ModelStatsResponse:
    cache_svc: CacheService = request.app.state.cache_service
    stats = cache_svc.get_model_stats()

    return ModelStatsResponse(latency_ms=timer.elapsed_ms, data=stats)


# ---------------------------------------------------------------------------
# GET /shap-summary — aggregate SHAP statistics (bonus insight endpoint)
# ---------------------------------------------------------------------------

@router.get(
    "/shap-summary",
    response_model=ApiResponse[dict],
    summary="Aggregate SHAP distribution statistics",
    description=(
        "Returns which features most frequently appear as top fraud drivers, "
        "and how SHAP contributions are distributed across the test set."
    ),
)
async def get_shap_summary(
    request: Request,
    timer: RequestTimer = Depends(get_timer),
) -> ApiResponse[dict]:
    shap_svc: SHAPService = request.app.state.shap_service
    features = shap_svc.global_importance()

    # Build a rich summary from the global importance data
    top_3 = features[:3] if len(features) >= 3 else features
    summary: dict = {
        "top_fraud_drivers": [
            {"feature": f.feature_name, "human_label": f.human_label, "mean_abs_shap": f.mean_abs_shap}
            for f in top_3
        ],
        "total_features_analyzed": len(features),
        "method": "interventional_tree_shap",
        "explainer_type": "shap.TreeExplainer",
        "model_output": "probability",
        "description": (
            "Global SHAP importance computed as mean |SHAP value| across the test set. "
            "Higher values indicate features with stronger influence on fraud predictions. "
            "TreeSHAP with interventional perturbation correctly handles correlated features."
        ),
    }

    return ApiResponse(latency_ms=timer.elapsed_ms, data=summary)
