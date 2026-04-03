from typing import Any

from pydantic import BaseModel, Field


class SimulatedTransaction(BaseModel):
    transaction_id: str = Field(min_length=3, max_length=128)
    amount: float = Field(gt=0)
    currency: str = Field(default="USD", min_length=3, max_length=8)
    merchant: str = Field(default="Unknown Merchant", min_length=1, max_length=120)
    country: str = Field(default="US", min_length=2, max_length=3)
    payment_method: str = Field(default="card", min_length=2, max_length=32)
    timestamp: str
    user_id: str | None = None


class FraudEvaluationResult(BaseModel):
    transaction_id: str
    is_fraud: bool
    label: str
    risk_score: float = Field(ge=0, le=100)
    reason: str
    processed_at: str


class ExplainMeta(BaseModel):
    payment_method: str = "credit_card"
    merchant_name: str = "Unknown Merchant"
    timestamp: str


class ExplainRequest(BaseModel):
    transaction_id: str = Field(min_length=3, max_length=128)
    features: dict[str, float | int]
    meta: ExplainMeta
    source_doc_id: str | None = None


class ExplainResultData(BaseModel):
    transaction_id: str
    classification: str
    fraud_probability: float
    risk_score: float
    explainability: dict[str, Any] | None = None


class ExplainResultResponse(BaseModel):
    status: str = "success"
    data: ExplainResultData
