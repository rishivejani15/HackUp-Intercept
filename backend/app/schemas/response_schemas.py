"""API request and response schemas.

Defines the exact shapes of all HTTP request bodies and responses.
Every endpoint returns an ApiResponse[T] wrapper for consistent structure.
"""

from __future__ import annotations

from typing import Generic, TypeVar

from pydantic import BaseModel, Field

from app.schemas.shap_schemas import SHAPExplanation, GlobalFeature

T = TypeVar("T")


# ---------------------------------------------------------------------------
# Generic API wrapper
# ---------------------------------------------------------------------------

class ApiResponse(BaseModel, Generic[T]):
    """Uniform envelope for every API response."""

    status: str = "success"
    latency_ms: float = Field(..., description="End-to-end server latency in milliseconds")
    data: T


class ApiError(BaseModel):
    """Uniform envelope for error responses."""

    status: str = "error"
    error_code: str
    message: str


# ---------------------------------------------------------------------------
# Explain endpoint
# ---------------------------------------------------------------------------

class TransactionMeta(BaseModel):
    """Optional metadata that enriches human-readable explanations."""

    transaction_id: str | None = None
    amount: float | None = Field(None, description="Raw dollar amount (not log-transformed)")
    timestamp: str | None = Field(None, description="ISO-8601 transaction timestamp")
    merchant_name: str | None = None
    merchant_city: str | None = None
    merchant_state: str | None = None
    user_avg_amount: float | None = Field(
        None,
        description="User's recent average spend (for human-readable ratio text)",
    )
    mcc_description: str | None = Field(
        None, description="Human-readable merchant category"
    )
    hour: int | None = Field(None, ge=0, le=23)
    minute: int | None = Field(None, ge=0, le=59)
    seconds_gap: float | None = Field(
        None, description="Seconds since last transaction"
    )
    user_state: str | None = Field(None, description="User's home state")


class ExplainRequest(BaseModel):
    """Input to POST /explain.

    'features' is the direct output of your friend's FeatureEngineer.transform()
    — a flat dict mapping feature_name → float value.
    """

    features: dict[str, float] = Field(
        ...,
        description="Flat dict of feature_name → value (FeatureEngineer output)",
        examples=[
            {
                "hour_of_day": 3.0,
                "is_night": 1.0,
                "log_amount": 7.12,
                "amount_vs_user_avg_ratio": 22.4,
                "card_on_dark_web": 1.0,
                "credit_score": 720.0,
            }
        ],
    )
    meta: TransactionMeta = Field(
        default_factory=TransactionMeta,
        description="Optional transaction metadata for richer natural-language explanations",
    )


class ExplanationFactor(BaseModel):
    """A single human-readable risk factor."""

    severity: str
    icon: str
    text: str
    feature: str = Field(..., description="Raw feature name (for frontend tooltip)")


class HumanExplanation(BaseModel):
    """Natural-language explanation package for a transaction."""

    headline: str = Field(..., description="Short bold headline shown in the UI")
    summary: str = Field(..., description="1–2 sentence summary of the decision")
    factors: list[ExplanationFactor] = Field(..., description="Ordered risk factors")
    compliance_note: str = (
        "Explanation generated per GDPR Article 22 requirements "
        "for automated decision-making transparency."
    )


class ExplainData(BaseModel):
    """Full explainability payload for a single transaction."""

    transaction_id: str | None = None
    risk_score: float = Field(..., ge=0.0, le=100.0)
    fraud_probability: float = Field(..., ge=0.0, le=1.0)
    classification: str = Field(..., description="fraud | suspicious | legitimate")
    shap_explanation: SHAPExplanation
    human_explanation: HumanExplanation


# ExplainResponse is typed for clarity
ExplainResponse = ApiResponse[ExplainData]


# ---------------------------------------------------------------------------
# Batch explain endpoint
# ---------------------------------------------------------------------------

class BatchExplainItem(BaseModel):
    features: dict[str, float]
    meta: TransactionMeta = Field(default_factory=TransactionMeta)


class BatchExplainRequest(BaseModel):
    batch: list[BatchExplainItem] = Field(..., min_length=1)


class BatchExplainData(BaseModel):
    results: list[ExplainData]
    count: int
    failed_count: int = 0


BatchExplainResponse = ApiResponse[BatchExplainData]


# ---------------------------------------------------------------------------
# Transactions endpoint
# ---------------------------------------------------------------------------

class TransactionRecord(BaseModel):
    """A pre-scored transaction served from the cache."""

    id: str
    amount: float
    timestamp: str
    merchant_name: str
    merchant_city: str
    risk_score: float
    classification: str
    top_features: list  # List[SHAPFeature] — avoid circular import
    human_explanation: HumanExplanation


class TransactionsData(BaseModel):
    transactions: list[TransactionRecord]
    total: int
    page: int
    page_size: int
    has_next: bool


TransactionsResponse = ApiResponse[TransactionsData]


# ---------------------------------------------------------------------------
# Feature importance endpoint
# ---------------------------------------------------------------------------

class FeatureImportanceData(BaseModel):
    features: list[GlobalFeature]
    total_features: int
    method: str = "mean_absolute_shap"
    description: str = (
        "Mean absolute SHAP value across the test set. "
        "Higher = this feature has more influence on fraud predictions."
    )


FeatureImportanceResponse = ApiResponse[FeatureImportanceData]


# ---------------------------------------------------------------------------
# Model stats endpoint
# ---------------------------------------------------------------------------

class ConfusionMatrix(BaseModel):
    true_negatives: int
    false_positives: int
    false_negatives: int
    true_positives: int


class ModelStatsData(BaseModel):
    model_version: str
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    auprc: float
    false_positive_rate: float
    false_negative_rate: float
    confusion_matrix: ConfusionMatrix
    training_samples: int
    fraud_samples: int
    legitimate_samples: int
    fraud_rate_percent: float


ModelStatsResponse = ApiResponse[ModelStatsData]


# ---------------------------------------------------------------------------
# Health endpoints
# ---------------------------------------------------------------------------

class HealthData(BaseModel):
    status: str = "ok"


class ReadinessData(BaseModel):
    ready: bool
    model_loaded: bool
    shap_loaded: bool
    cache_loaded: bool
    message: str
