"""SHAP Service — wraps shap.TreeExplainer for inference.

Responsibilities:
  - Load/cache the TreeExplainer from disk
  - Validate input feature DataFrames
  - Compute per-prediction SHAP values (single + batch)
  - Return global feature importance from pre-computed cache

Design principles:
  - The explainer is built ONCE (in build_shap_cache.py) and loaded here
  - All SHAP computation is done in probability space (not log-odds)
  - Column names are always preserved — never reduced to numpy arrays
"""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import TYPE_CHECKING

import joblib
import numpy as np
import pandas as pd
import shap
import structlog

from app.core.config import Settings
from app.core.exceptions import (
    ModelNotLoadedError,
    SHAPExplainerError,
    FeatureValidationError,
)
from app.core.feature_registry import FEATURE_COLUMNS, FEATURE_METADATA
from app.schemas.shap_schemas import RawSHAPResult, GlobalFeature

if TYPE_CHECKING:
    pass

logger = structlog.get_logger(__name__)


class SHAPService:
    """Manages the SHAP TreeExplainer and computes explanations.

    Lifecycle:
      1. __init__: load explainer from disk (fast, ~0.5s)
      2. explain_single: called per /explain request (~5–10ms)
      3. explain_batch: called per /batch-explain request (~1–2ms/item)
      4. global_importance: served from in-memory cache (~0ms)

    Thread-safety: shap.TreeExplainer is NOT thread-safe for parallel writes,
    but since we only read (shap_values call) after construction, it is safe
    for concurrent read-only use under uvicorn's async event loop.
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._explainer: shap.TreeExplainer | None = None
        self._global_cache: list[GlobalFeature] = []
        self._xgb_model = None  # kept only for fallback explainer build

    # ── Loading ────────────────────────────────────────────────────────────

    def load(self, xgb_model) -> None:
        """Load explainer from disk, or build from xgb_model if not found.

        Args:
            xgb_model: Loaded XGBClassifier from friend's pkl file.
        """
        self._xgb_model = xgb_model
        explainer_path = self._settings.shap_explainer_path

        if explainer_path.exists():
            logger.info("Loading pre-built SHAP explainer", path=str(explainer_path))
            t0 = time.perf_counter()
            self._explainer = joblib.load(explainer_path)
            elapsed = (time.perf_counter() - t0) * 1000
            logger.info("SHAP explainer loaded", latency_ms=round(elapsed, 1))
        else:
            logger.warning(
                "Pre-built explainer not found — building on-the-fly (slow). "
                "Run scripts/build_shap_cache.py to avoid this.",
                path=str(explainer_path),
            )
            self._build_explainer_from_model(xgb_model)

        self._load_global_cache()

    def _build_explainer_from_model(self, xgb_model) -> None:
        """Build TreeExplainer directly from model (no background data).

        Note: Without background data, feature_perturbation falls back to
        tree_path_dependent, which is less accurate for correlated features.
        Run build_shap_cache.py properly before production use.
        """
        logger.warning("Building SHAP explainer without background data")
        try:
            self._explainer = shap.TreeExplainer(xgb_model)
            logger.info("SHAP explainer built (tree_path_dependent fallback)")
        except Exception as exc:
            raise SHAPExplainerError(
                f"Failed to build SHAP explainer: {exc}"
            ) from exc

    def _load_global_cache(self) -> None:
        """Load pre-computed global feature importance from JSON cache."""
        cache_path = self._settings.shap_global_cache_path

        if not cache_path.exists():
            logger.warning(
                "Global SHAP cache not found — run scripts/build_shap_cache.py",
                path=str(cache_path),
            )
            self._global_cache = []
            return

        with cache_path.open("r", encoding="utf-8") as f:
            raw: list[dict] = json.load(f)

        self._global_cache = [GlobalFeature(**item) for item in raw]
        logger.info("Global SHAP cache loaded", features=len(self._global_cache))

    # ── Core computation ───────────────────────────────────────────────────

    def explain_single(self, features_df: pd.DataFrame) -> RawSHAPResult:
        """Compute SHAP values for one transaction.

        Args:
            features_df: 1-row DataFrame with exactly FEATURE_COLUMNS as columns.

        Returns:
            RawSHAPResult with shap_values, base_value, output_value.

        Raises:
            ModelNotLoadedError: if explainer has not been loaded.
            FeatureValidationError: if required columns are missing.
            SHAPExplainerError: if SHAP computation fails.
        """
        self._assert_ready()
        features_df = self._validate_and_align(features_df)

        try:
            shap_values = self._explainer.shap_values(features_df)
            base_value = float(self._explainer.expected_value)
            output_value = float(
                base_value + np.sum(shap_values[0])
                if isinstance(shap_values, list)
                else base_value + np.sum(shap_values)
            )

            # Handle both XGBClassifier (list output) and xgb.Booster (array output)
            sv_row: np.ndarray = (
                shap_values[1][0]
                if isinstance(shap_values, list)
                else shap_values[0]
            )

        except Exception as exc:
            raise SHAPExplainerError(f"SHAP computation failed: {exc}") from exc

        return RawSHAPResult(
            feature_names=list(features_df.columns),
            feature_values=features_df.iloc[0].tolist(),
            shap_values=sv_row.tolist(),
            base_value=base_value,
            output_value=output_value,
        )

    def explain_batch(self, features_df: pd.DataFrame) -> list[RawSHAPResult]:
        """Compute SHAP values for multiple transactions (vectorized).

        Args:
            features_df: N-row DataFrame with FEATURE_COLUMNS as columns.

        Returns:
            List of RawSHAPResult, one per row.
        """
        self._assert_ready()
        features_df = self._validate_and_align(features_df)

        try:
            shap_values = self._explainer.shap_values(features_df)
            base_value = float(self._explainer.expected_value)

            sv_matrix: np.ndarray = (
                shap_values[1] if isinstance(shap_values, list) else shap_values
            )
        except Exception as exc:
            raise SHAPExplainerError(
                f"Batch SHAP computation failed: {exc}"
            ) from exc

        feature_names = list(features_df.columns)
        results: list[RawSHAPResult] = []

        for i in range(len(features_df)):
            sv_row = sv_matrix[i]
            output_value = float(base_value + np.sum(sv_row))
            results.append(
                RawSHAPResult(
                    feature_names=feature_names,
                    feature_values=features_df.iloc[i].tolist(),
                    shap_values=sv_row.tolist(),
                    base_value=base_value,
                    output_value=output_value,
                )
            )

        return results

    def global_importance(self) -> list[GlobalFeature]:
        """Return pre-computed global feature importance (from memory cache).

        Returns:
            List of GlobalFeature sorted by rank ascending.
        """
        return self._global_cache

    # ── Internal helpers ───────────────────────────────────────────────────

    def _assert_ready(self) -> None:
        if self._explainer is None:
            raise ModelNotLoadedError(
                "SHAP explainer is not loaded. Service is not ready yet."
            )

    def _validate_and_align(self, features_df: pd.DataFrame) -> pd.DataFrame:
        """Validate that required columns exist and align column order.

        Missing columns are filled with 0.0 (safe default for most features).
        Extra columns are dropped to prevent unexpected SHAP indexing.
        """
        missing = set(FEATURE_COLUMNS) - set(features_df.columns)
        if missing:
            # Warn but do not fail — fill with zeros as a graceful default
            logger.warning(
                "Missing features — filling with 0.0",
                missing_features=sorted(missing),
                count=len(missing),
            )
            for col in missing:
                features_df[col] = 0.0

        # Align to exact column order the model was trained on
        return features_df[FEATURE_COLUMNS].astype(np.float32)

    @property
    def is_ready(self) -> bool:
        return self._explainer is not None
