"""Pydantic schemas for all SHAP-related data structures.

These are the canonical data shapes that flow between every layer:
  SHAPService → WaterfallService → ExplanationService → routers
"""

from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Internal result from SHAPService (not exposed directly in API responses)
# ---------------------------------------------------------------------------

class RawSHAPResult(BaseModel):
    """Internal container for raw SHAP output from TreeExplainer."""

    feature_names: list[str]
    feature_values: list[float]
    shap_values: list[float]   # one per feature
    base_value: float          # expected model output (background mean)
    output_value: float        # final model probability for this transaction


# ---------------------------------------------------------------------------
# Per-feature SHAP explanation (API-facing)
# ---------------------------------------------------------------------------

class SHAPFeature(BaseModel):
    """SHAP contribution for a single feature."""

    feature_name: str = Field(..., description="Raw feature column name")
    human_label: str = Field(..., description="Display-friendly label")
    feature_value: float = Field(..., description="Actual value of this feature")
    shap_value: float = Field(..., description="SHAP contribution (probability space)")
    direction: str = Field(..., description="'increases_fraud' or 'decreases_fraud'")
    contribution_percent: float = Field(
        ...,
        description="Percentage of total positive SHAP mass explained by this feature",
    )
    severity: str = Field(
        ..., description="CRITICAL | HIGH | MEDIUM | LOW based on |shap_value|"
    )
    human_explanation: str = Field(
        ..., description="Natural-language sentence explaining this feature's role"
    )
    icon: str = Field("📊", description="Emoji icon representing this feature type")

    @field_validator("direction")
    @classmethod
    def validate_direction(cls, v: str) -> str:
        allowed = {"increases_fraud", "decreases_fraud"}
        if v not in allowed:
            raise ValueError(f"direction must be one of {allowed}")
        return v

    @field_validator("severity")
    @classmethod
    def validate_severity(cls, v: str) -> str:
        allowed = {"CRITICAL", "HIGH", "MEDIUM", "LOW"}
        if v not in allowed:
            raise ValueError(f"severity must be one of {allowed}")
        return v


# ---------------------------------------------------------------------------
# Waterfall chart data
# ---------------------------------------------------------------------------

class WaterfallStep(BaseModel):
    """A single step in the SHAP waterfall visualization."""

    feature: str = Field(..., description="Feature name")
    human_label: str = Field(..., description="Display-friendly feature label")
    shap_value: float = Field(..., description="SHAP contribution for this step")
    feature_value: float = Field(..., description="Actual feature value")
    cumulative: float = Field(
        ..., description="Running probability after applying this feature's SHAP"
    )


class WaterfallData(BaseModel):
    """Full waterfall from base rate → final fraud probability."""

    base_value: float = Field(..., description="Background mean fraud probability")
    output_value: float = Field(..., description="Final model fraud probability")
    steps: list[WaterfallStep] = Field(
        ..., description="Top-N steps sorted by |shap_value| descending"
    )
    remainder: float = Field(
        ...,
        description="Sum of SHAP values from features not shown in top-N steps",
    )
    additivity_check_passed: bool = Field(
        ...,
        description="True if base_value + all_shap_values ≈ output_value (within 1e-4)",
    )


# ---------------------------------------------------------------------------
# Full SHAP explanation (combines per-feature + waterfall)
# ---------------------------------------------------------------------------

class SHAPExplanation(BaseModel):
    """Complete SHAP explanation for a single transaction."""

    base_value: float
    output_value: float
    top_features: list[SHAPFeature]
    waterfall: WaterfallData


# ---------------------------------------------------------------------------
# Global feature importance
# ---------------------------------------------------------------------------

class GlobalFeature(BaseModel):
    """Global SHAP importance for one feature across the test set."""

    rank: int = Field(..., ge=1)
    feature_name: str
    human_label: str
    mean_abs_shap: float = Field(..., description="Mean |SHAP| across test set")
    description: str = Field(..., description="What this feature measures")
    icon: str = "📊"
