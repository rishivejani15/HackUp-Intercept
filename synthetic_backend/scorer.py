# ============================================================
# TEAMMATE INTEGRATION POINT
# When XGBoost model is ready, replace the dummy_txn_risk()
# function with real model inference.
# Search for: "REPLACE_WITH_XGBOOST" to find every location.
# ============================================================

from typing import Dict, Any

def dummy_txn_risk(features: Dict[str, Any]) -> float:
    """
    # REPLACE_WITH_XGBOOST
    Deterministic placeholder risk score. This keeps demo output stable
    while still reacting to strong fraud indicators.
    """
    base = 8.0

    if features.get("is_high_risk_type"):
        base += 20.0

    if features.get("full_account_drain"):
        base += 30.0

    if features.get("is_high_amount"):
        base += 12.0

    if features.get("high_risk_branch"):
        base += 8.0

    if features.get("both_customers"):
        base += 8.0

    if features.get("no_unusual_login") and features.get("is_high_risk_type"):
        base += 15.0

    if features.get("dest_was_empty") and features.get("is_high_risk_type"):
        base += 10.0

    if features.get("dest_balance_unchanged") and features.get("is_high_risk_type"):
        base += 10.0

    return round(max(0.0, min(100.0, base)), 1)

def combine_scores(txn_risk: float, synthetic_score: float, signals: dict) -> float:
    """
    Combines the real transaction ML risk (currently from dummy_txn_risk) 
    with the synthetic rule-based score.
    """
    base = 0.70 * txn_risk + 0.30 * synthetic_score

    # Strong account-takeover pattern: suspicious transfer + normal login + mule-like destination.
    if (
        signals.get("no_unusual_login")
        and signals.get("is_high_risk_type")
        and (signals.get("both_customers") or signals.get("full_account_drain") or signals.get("dest_was_empty"))
    ):
        base = max(base, 60.0)

    # Drain patterns should bias directly toward block decisions.
    if (
        signals.get("full_account_drain") and signals.get("dest_was_empty")
    ) or signals.get("dest_balance_unchanged_and_high_risk"):
        base = max(base, 75.0)

    if signals.get("is_high_amount") and signals.get("is_high_risk_type") and signals.get("both_customers"):
        base = max(base, 65.0)

    return round(min(100.0, base), 1)

def get_confidence(score: float) -> str:
    """
    Calculates the certainty level of the final score.
    """
    if score >= 75 or score <= 25:
        return "HIGH"
    if score >= 55 or score <= 45:
        return "MEDIUM"
    return "LOW"

def make_decision(final_score: float) -> str:
    """
    Threshold-based decision routing.
    """
    if final_score >= 75:  
        return "BLOCK"
    if final_score >= 45:  
        return "MFA_REQUIRED"
    return "APPROVE"
