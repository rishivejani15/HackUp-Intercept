"""Custom exceptions and FastAPI exception handlers.

All application errors inherit from FraudShieldError, which gives every error:
  - A specific HTTP status code
  - A machine-readable error_code
  - A human-readable message

The register_exception_handlers() function wires these into the FastAPI app.
"""

from __future__ import annotations

import structlog
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

logger = structlog.get_logger(__name__)


# ---------------------------------------------------------------------------
# Exception hierarchy
# ---------------------------------------------------------------------------

class FraudShieldError(Exception):
    """Base exception for all FraudShield AI errors."""

    status_code: int = 500
    error_code: str = "INTERNAL_ERROR"

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


class ModelNotLoadedError(FraudShieldError):
    """Raised when the XGBoost model has not been loaded yet."""

    status_code = 503
    error_code = "MODEL_NOT_LOADED"


class SHAPExplainerError(FraudShieldError):
    """Raised when the SHAP explainer fails to compute values."""

    status_code = 500
    error_code = "SHAP_EXPLAINER_ERROR"


class FeatureValidationError(FraudShieldError):
    """Raised when the input feature dict is missing required columns."""

    status_code = 422
    error_code = "FEATURE_VALIDATION_ERROR"


class CacheNotReadyError(FraudShieldError):
    """Raised when the pre-scored transaction cache has not been built."""

    status_code = 503
    error_code = "CACHE_NOT_READY"


class BatchLimitExceededError(FraudShieldError):
    """Raised when a batch request exceeds the configured limit."""

    status_code = 413
    error_code = "BATCH_LIMIT_EXCEEDED"


# ---------------------------------------------------------------------------
# Handler registration
# ---------------------------------------------------------------------------

def register_exception_handlers(app: FastAPI) -> None:
    """Attach exception handlers to the FastAPI application."""

    @app.exception_handler(FraudShieldError)
    async def fraudshield_error_handler(
        request: Request, exc: FraudShieldError
    ) -> JSONResponse:
        logger.warning(
            "Application error",
            error_code=exc.error_code,
            message=exc.message,
            path=str(request.url),
            method=request.method,
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "status": "error",
                "error_code": exc.error_code,
                "message": exc.message,
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        logger.exception(
            "Unhandled exception",
            exc_type=type(exc).__name__,
            path=str(request.url),
            method=request.method,
        )
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "error_code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred. Please try again.",
            },
        )
