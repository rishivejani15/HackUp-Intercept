"""GET /health — liveness probe.
GET /ready — readiness probe.

/health: Returns 200 if the process is alive (no state check).
/ready:  Returns 200 only when all services are fully loaded.
         Returns 503 during startup or if models failed to load.

These endpoints are typically polled by load balancers and container orchestrators.
"""

from __future__ import annotations

import structlog
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from app.schemas.response_schemas import ApiResponse, HealthData, ReadinessData
from app.services.cache_service import CacheService
from app.services.shap_service import SHAPService

logger = structlog.get_logger(__name__)
router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    response_model=ApiResponse[HealthData],
    summary="Liveness probe",
    description="Always returns 200 if the process is running.",
)
async def health_check() -> ApiResponse[HealthData]:
    return ApiResponse(latency_ms=0.0, data=HealthData(status="ok"))


@router.get(
    "/ready",
    summary="Readiness probe",
    description="Returns 200 when all ML services are loaded and ready to serve.",
)
async def readiness_check(request: Request) -> JSONResponse:
    shap_svc: SHAPService = getattr(request.app.state, "shap_service", None)
    cache_svc: CacheService = getattr(request.app.state, "cache_service", None)
    model_loaded = request.app.state.xgb_model is not None
    shap_loaded = shap_svc is not None and shap_svc.is_ready
    cache_loaded = cache_svc is not None and cache_svc.is_ready
    all_ready = model_loaded and shap_loaded and cache_loaded

    body = {
        "status": "success",
        "latency_ms": 0.0,
        "data": {
            "ready":        all_ready,
            "model_loaded": model_loaded,
            "shap_loaded":  shap_loaded,
            "cache_loaded": cache_loaded,
            "message":      "All services ready." if all_ready else "Still loading — retry shortly.",
        },
    }

    status_code = 200 if all_ready else 503
    return JSONResponse(content=body, status_code=status_code)
