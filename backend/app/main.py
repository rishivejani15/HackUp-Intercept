"""FastAPI application factory.

Wires together all services, routers, middleware, and exception handlers.
Uses the modern lifespan context manager pattern (replaces deprecated on_event).

Startup order:
  1. Configure logging
  2. Load XGBoost model (friend's pkl)
  3. Initialize SHAPService (loads explainer from disk or builds fallback)
  4. Initialize WaterfallService and ExplanationService
  5. Initialize CacheService (loads scored_transactions.parquet)
  6. Mark app as ready

All services are stored on app.state and injected into routes via request.app.state.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

import joblib
import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import Settings, get_settings
from app.core.exceptions import ModelNotLoadedError, register_exception_handlers
from app.core.logging_config import configure_logging
from app.middleware.timing import TimingMiddleware
from app.routers import explain, health, insights, transactions
from app.services.cache_service import CacheService
from app.services.explanation_service import ExplanationService
from app.services.shap_service import SHAPService
from app.services.waterfall_service import WaterfallService

logger = structlog.get_logger(__name__)


# ---------------------------------------------------------------------------
# Lifespan (startup + shutdown logic)
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings: Settings = app.state.settings
    configure_logging(settings.log_level)

    logger.info(
        "Starting FraudShield AI Explainability Service",
        version=settings.app_version,
        model_dir=str(settings.model_dir),
        data_dir=str(settings.data_dir),
    )

    # ── Step 1: Load XGBoost model (from friend's pkl) ────────────────────
    xgb_path = settings.xgboost_model_path
    if xgb_path.exists():
        logger.info("Loading XGBoost model", path=str(xgb_path))
        app.state.xgb_model = joblib.load(xgb_path)
        logger.info("XGBoost model loaded")
    else:
        logger.warning(
            "XGBoost model not found — SHAP will build without model. "
            "Run scripts/generate_mock_artifacts.py to generate mock models.",
            path=str(xgb_path),
        )
        app.state.xgb_model = None

    # ── Step 2: Initialize SHAP Service ───────────────────────────────────
    shap_service = SHAPService(settings)
    if app.state.xgb_model is not None:
        shap_service.load(app.state.xgb_model)
    else:
        logger.warning("SHAPService not loaded — /explain endpoints will return 503")
    app.state.shap_service = shap_service

    # ── Step 3: Initialize stateless services ─────────────────────────────
    app.state.waterfall_service = WaterfallService(settings)
    app.state.explanation_service = ExplanationService(settings)
    logger.info("WaterfallService and ExplanationService initialized")

    # ── Step 4: Load transaction + stats cache ────────────────────────────
    cache_service = CacheService(settings)
    cache_service.load()
    app.state.cache_service = cache_service

    logger.info(
        "All services initialized — FraudShield AI is ready",
        transactions_cached=cache_service.transaction_count,
        shap_ready=shap_service.is_ready,
    )

    yield  # ── Application serves requests ──────────────────────────────

    # ── Shutdown ──────────────────────────────────────────────────────────
    logger.info("FraudShield AI shutting down.")


# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------

def create_app(settings: Settings | None = None) -> FastAPI:
    """Create and configure the FastAPI application.

    Args:
        settings: Override settings (useful for testing).

    Returns:
        Configured FastAPI instance.
    """
    _settings = settings or get_settings()

    app = FastAPI(
        title=_settings.app_title,
        version=_settings.app_version,
        description=(
            "Real-time SHAP-based fraud detection explainability service. "
            "Provides per-transaction SHAP values, waterfall data, and "
            "natural-language explanations for every fraud prediction."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # Expose settings on app state for route access
    app.state.settings = _settings
    app.state.xgb_model = None  # populated in lifespan

    # ── Middleware ──────────────────────────────────────────────────────
    app.add_middleware(TimingMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Exception handlers ─────────────────────────────────────────────
    register_exception_handlers(app)

    # ── Routers ────────────────────────────────────────────────────────
    app.include_router(health.router)
    app.include_router(explain.router)
    app.include_router(transactions.router)
    app.include_router(insights.router)

    return app


# ---------------------------------------------------------------------------
# Module-level app instance (used by uvicorn)
# ---------------------------------------------------------------------------
app = create_app()
