"""Waterfall Service — builds SHAP waterfall chart data.

Transforms raw SHAP values into a structured "journey" from the base fraud
rate to the final prediction probability. This data powers the waterfall
visualization in the frontend dashboard.

Algorithm:
  1. Sort all (feature, shap_value) pairs by |shap_value| descending
  2. Take top-N pairs as visible steps
  3. Compute cumulative running probability at each step
  4. Compute remainder = sum of all SHAP values not in top-N steps
  5. Verify additivity: base_value + sum(all_shap) ≈ output_value (±1e-4)
"""

from __future__ import annotations

import numpy as np
import structlog

from app.core.config import Settings
from app.core.feature_registry import FEATURE_METADATA
from app.schemas.shap_schemas import RawSHAPResult, WaterfallData, WaterfallStep

logger = structlog.get_logger(__name__)

_ADDITIVITY_TOLERANCE = 1e-4


class WaterfallService:
    """Builds waterfall chart data from raw SHAP values."""

    def __init__(self, settings: Settings) -> None:
        self._top_n = settings.shap_top_n

    def build(
        self, shap_result: RawSHAPResult, top_n: int | None = None
    ) -> WaterfallData:
        """Build a WaterfallData object from a RawSHAPResult.

        Args:
            shap_result: Output from SHAPService.explain_single().
            top_n: Override the configured top-N. Uses settings default if None.

        Returns:
            WaterfallData ready for API serialization.
        """
        n = top_n if top_n is not None else self._top_n

        sv = np.array(shap_result.shap_values)
        fv = np.array(shap_result.feature_values)
        names = shap_result.feature_names

        # Sort by absolute SHAP descending → most impactful features first
        order = np.argsort(np.abs(sv))[::-1]

        top_indices = order[:n]
        rest_indices = order[n:]

        # Cumulative sum starting from base_value
        cumulative = shap_result.base_value
        steps: list[WaterfallStep] = []

        for idx in top_indices:
            cumulative += float(sv[idx])
            meta = FEATURE_METADATA.get(names[idx])
            steps.append(
                WaterfallStep(
                    feature=names[idx],
                    human_label=meta.human_label if meta else names[idx],
                    shap_value=round(float(sv[idx]), 6),
                    feature_value=round(float(fv[idx]), 4),
                    cumulative=round(float(np.clip(cumulative, 0.0, 1.0)), 6),
                )
            )

        remainder = float(np.sum(sv[rest_indices]))

        # Additivity check: base + all_shap ≈ output
        reconstructed = shap_result.base_value + float(np.sum(sv))
        delta = abs(reconstructed - shap_result.output_value)
        additivity_ok = delta < _ADDITIVITY_TOLERANCE

        if not additivity_ok:
            logger.warning(
                "SHAP additivity check failed — explainer may be misconfigured",
                delta=round(delta, 6),
                reconstructed=round(reconstructed, 4),
                output_value=round(shap_result.output_value, 4),
            )

        return WaterfallData(
            base_value=round(shap_result.base_value, 6),
            output_value=round(shap_result.output_value, 6),
            steps=steps,
            remainder=round(remainder, 6),
            additivity_check_passed=additivity_ok,
        )
