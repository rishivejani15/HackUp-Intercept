"""Timing middleware — automatically injects latency into every response.

Every response gets:
  - X-Process-Time-Ms header (for frontend/monitoring tools)
  - The response body is NOT modified here; latency_ms is added by dependencies
    injected into route handlers via FastAPI's Depends() pattern.
"""

from __future__ import annotations

import time

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response


class TimingMiddleware(BaseHTTPMiddleware):
    """Measures and injects server-side processing time into response headers."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        start = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
        response.headers["X-Process-Time-Ms"] = str(elapsed_ms)
        return response


class RequestTimer:
    """FastAPI dependency that tracks per-request start time.

    Usage in a route:
        @router.post("/explain")
        async def explain(timer: RequestTimer = Depends(get_timer)):
            ...
            return ApiResponse(latency_ms=timer.elapsed_ms, data=...)
    """

    def __init__(self) -> None:
        self._start = time.perf_counter()

    @property
    def elapsed_ms(self) -> float:
        return round((time.perf_counter() - self._start) * 1000, 2)


def get_timer() -> RequestTimer:
    """FastAPI dependency factory."""
    return RequestTimer()
