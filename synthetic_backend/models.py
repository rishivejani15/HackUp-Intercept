from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

class TransactionInput(BaseModel):
    step: int
    type: str
    branch: str
    amount: float
    nameOrig: str
    oldbalanceOrg: float
    newbalanceOrig: float
    nameDest: str
    oldbalanceDest: float
    newbalanceDest: float
    unusuallogin: int
    acct_type: str = Field(alias="Acct type", default="Unknown")
    time_of_day: str = Field(alias="Time of day", default="Unknown")
    date_of_transaction: Optional[str] = Field(alias="Date of transaction", default=None)
    isFlaggedFraud: Optional[int] = 0
    isFraud: Optional[int] = None

    class Config:
        populate_by_name = True

class EvaluationResult(BaseModel):
    txn_risk: float
    synthetic_score: float
    confidence: str
    final_score: float
    decision: str
    signals: Dict[str, Any]
    human_explanation: List[str]
    latency_ms: float

class TransactionDetail(BaseModel):
    id: str
    input_data: TransactionInput
    evaluation: EvaluationResult

class ModelStats(BaseModel):
    total_transactions: int
    actual_frauds: int
    fraud_rate: float
    caught_by_existing: int
    caught_by_us: int
    synthetic_confirmed_count: int
    synthetic_suspected_count: int
    decisions_breakdown: Dict[str, int]
    top_fraud_branches: List[str]
    fraud_by_type: Dict[str, int]
    avg_risk_score: float
    avg_synthetic_score: float

class FraudRing(BaseModel):
    ring_id: str
    size: int
    member_transactions: List[str]
    shared_attributes: Dict[str, str]

class UserTimelineEvent(BaseModel):
    transaction_id: str
    step: int
    date: Optional[str]
    type: str
    amount: float
    balance_before: float
    balance_after: float
    dest_account: str
    is_anomaly: bool  # Highlight unusual events (e.g. heavy drain)
    decision: str

class Alert(BaseModel):
    transaction_id: str
    account_id: str
    amount: float
    synthetic_score: float
    signals_fired: List[str]
    human_explanation: List[str]
    decision: str

class PaginatedTransactions(BaseModel):
    total: int
    limit: int
    transactions: List[TransactionDetail]
