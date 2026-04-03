"""Pytest fixtures shared across all tests."""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.feature_registry import FEATURE_COLUMNS
from app.schemas.shap_schemas import RawSHAPResult


# ---------------------------------------------------------------------------
# Feature helpers
# ---------------------------------------------------------------------------

@pytest.fixture
def feature_columns() -> list[str]:
    return FEATURE_COLUMNS


@pytest.fixture
def legit_features() -> dict[str, float]:
    """A typical legitimate transaction feature dict."""
    return {name: 0.0 for name in FEATURE_COLUMNS} | {
        "hour_of_day":              14.0,
        "is_night":                 0.0,
        "log_amount":               3.8,
        "amount_vs_user_avg_ratio": 0.9,
        "card_on_dark_web":         0.0,
        "credit_score":             750.0,
        "has_chip":                 1.0,
        "user_avg_amount_7d":       50.0,
    }


@pytest.fixture
def fraud_features() -> dict[str, float]:
    """A high-risk fraudulent transaction feature dict."""
    return {name: 0.0 for name in FEATURE_COLUMNS} | {
        "hour_of_day":              3.0,
        "is_night":                 1.0,
        "log_amount":               7.1,
        "amount_vs_user_avg_ratio": 22.4,
        "card_on_dark_web":         1.0,
        "credit_score":             580.0,
        "has_chip":                 0.0,
        "is_high_risk_mcc":         1.0,
        "is_rapid_succession":      1.0,
        "merchant_in_new_city":     1.0,
        "is_foreign_transaction":   1.0,
    }


@pytest.fixture
def legit_features_df(legit_features) -> pd.DataFrame:
    return pd.DataFrame([legit_features])


@pytest.fixture
def fraud_features_df(fraud_features) -> pd.DataFrame:
    return pd.DataFrame([fraud_features])


# ---------------------------------------------------------------------------
# Mock RawSHAPResult
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_legit_shap_result() -> RawSHAPResult:
    n = len(FEATURE_COLUMNS)
    sv = np.zeros(n)
    sv[FEATURE_COLUMNS.index("credit_score")] = -0.05
    sv[FEATURE_COLUMNS.index("has_chip")] = -0.03
    return RawSHAPResult(
        feature_names=FEATURE_COLUMNS,
        feature_values=[0.0] * n,
        shap_values=sv.tolist(),
        base_value=0.008,
        output_value=0.015,
    )


@pytest.fixture
def mock_fraud_shap_result() -> RawSHAPResult:
    n = len(FEATURE_COLUMNS)
    sv = np.zeros(n)
    sv[FEATURE_COLUMNS.index("card_on_dark_web")]         = 0.41
    sv[FEATURE_COLUMNS.index("amount_vs_user_avg_ratio")] = 0.28
    sv[FEATURE_COLUMNS.index("is_night")]                 = 0.12
    sv[FEATURE_COLUMNS.index("is_high_risk_mcc")]         = 0.09
    sv[FEATURE_COLUMNS.index("credit_score")]             = -0.04
    fv = [0.0] * n
    fv[FEATURE_COLUMNS.index("card_on_dark_web")]         = 1.0
    fv[FEATURE_COLUMNS.index("amount_vs_user_avg_ratio")] = 22.4
    fv[FEATURE_COLUMNS.index("is_night")]                 = 1.0
    fv[FEATURE_COLUMNS.index("is_high_risk_mcc")]         = 1.0
    fv[FEATURE_COLUMNS.index("credit_score")]             = 580.0
    return RawSHAPResult(
        feature_names=FEATURE_COLUMNS,
        feature_values=fv,
        shap_values=sv.tolist(),
        base_value=0.008,
        output_value=min(0.008 + float(np.sum(sv)), 1.0),
    )


# ---------------------------------------------------------------------------
# Test client (no ML models required — uses mock app)
# ---------------------------------------------------------------------------

@pytest.fixture
def client() -> TestClient:
    """Create a test client without loading real ML models."""
    from unittest.mock import MagicMock, patch
    from app.main import create_app
    from app.core.config import Settings

    test_settings = Settings(
        model_dir=Path("tests/fixtures/models"),
        data_dir=Path("tests/fixtures/data"),
        debug=True,
    )

    # Patch lifespan to skip ML loading
    with patch("app.main.lifespan"):
        app = create_app(settings=test_settings)

        # Inject mock services
        mock_shap = MagicMock()
        mock_shap.is_ready = True
        mock_cache = MagicMock()
        mock_cache.is_ready = True

        app.state.xgb_model = MagicMock()
        app.state.shap_service = mock_shap
        app.state.waterfall_service = MagicMock()
        app.state.explanation_service = MagicMock()
        app.state.cache_service = mock_cache
        app.state.settings = test_settings

        return TestClient(app)
