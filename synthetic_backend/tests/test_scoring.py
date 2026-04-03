from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from detector import SyntheticIdentityDetector
from features import FeatureEngineer
from scorer import combine_scores, dummy_txn_risk, get_confidence, make_decision


def evaluate(payload: dict) -> dict:
    features = FeatureEngineer.transform_dict(payload)
    synthetic_score, _verdict, signals, explanations = SyntheticIdentityDetector().evaluate(features)
    txn_risk = dummy_txn_risk(features)
    final_score = combine_scores(txn_risk, synthetic_score, signals)

    return {
        "txn_risk": txn_risk,
        "synthetic_score": synthetic_score,
        "confidence": get_confidence(final_score),
        "final_score": final_score,
        "decision": make_decision(final_score),
        "signals": signals,
        "human_explanation": explanations,
    }


def test_clean_merchant_payment_is_approved() -> None:
    result = evaluate(
        {
            "step": 45,
            "type": "PAYMENT",
            "branch": "Canada",
            "amount": 25.50,
            "nameOrig": "C99887766",
            "oldbalanceOrg": 15000.00,
            "newbalanceOrig": 14974.50,
            "nameDest": "M11223344",
            "oldbalanceDest": 0.0,
            "newbalanceDest": 0.0,
            "unusuallogin": 0,
            "Acct type": "Checking",
            "Time of day": "Morning",
            "Date of transaction": "2026-04-04",
        }
    )

    assert result["decision"] == "APPROVE"
    assert result["synthetic_score"] == 0.0
    assert result["signals"] == {}


def test_full_account_drain_blocks() -> None:
    result = evaluate(
        {
            "step": 200,
            "type": "TRANSFER",
            "branch": "Republica Dominicana",
            "amount": 95000.00,
            "nameOrig": "C10293847",
            "oldbalanceOrg": 95000.00,
            "newbalanceOrig": 0.0,
            "nameDest": "C56473829",
            "oldbalanceDest": 0.0,
            "newbalanceDest": 95000.00,
            "unusuallogin": 1,
            "Acct type": "Savings",
            "Time of day": "Night",
            "Date of transaction": "2026-04-04",
        }
    )

    assert result["decision"] == "BLOCK"
    assert result["signals"]["full_account_drain"] is True
    assert result["signals"]["dest_was_empty"] is True
    assert result["signals"]["is_high_risk_type"] is True


def test_risky_cash_out_with_unchanged_destination_blocks() -> None:
    result = evaluate(
        {
            "step": 230,
            "type": "CASH_OUT",
            "branch": "Estados Unidos",
            "amount": 350000.00,
            "nameOrig": "C23414322",
            "oldbalanceOrg": 500000.00,
            "newbalanceOrig": 150000.00,
            "nameDest": "C98989898",
            "oldbalanceDest": 1000.00,
            "newbalanceDest": 1000.00,
            "unusuallogin": 0,
            "Acct type": "Savings",
            "Time of day": "Morning",
            "Date of transaction": "2026-04-05",
        }
    )

    assert result["decision"] == "BLOCK"
    assert result["signals"]["dest_balance_unchanged_and_high_risk"] is True
    assert result["signals"]["is_high_amount"] is True


def test_small_payment_with_empty_destination_stays_approved() -> None:
    result = evaluate(
        {
            "step": 88,
            "type": "PAYMENT",
            "branch": "Canada",
            "amount": 4200.00,
            "nameOrig": "C44556677",
            "oldbalanceOrg": 9000.00,
            "newbalanceOrig": 4800.00,
            "nameDest": "M55667788",
            "oldbalanceDest": 0.0,
            "newbalanceDest": 0.0,
            "unusuallogin": 1,
            "Acct type": "Checking",
            "Time of day": "Evening",
            "Date of transaction": "2026-04-04",
        }
    )

    assert result["decision"] == "APPROVE"
    assert result["synthetic_score"] == 0.0
    assert result["signals"] == {}


def test_suspicious_transfer_requires_mfa() -> None:
    result = evaluate(
        {
            "step": 310,
            "type": "TRANSFER",
            "branch": "Brazil",
            "amount": 78000.00,
            "nameOrig": "C77889900",
            "oldbalanceOrg": 80000.00,
            "newbalanceOrig": 2000.00,
            "nameDest": "C11224455",
            "oldbalanceDest": 120.00,
            "newbalanceDest": 78120.00,
            "unusuallogin": 0,
            "Acct type": "Savings",
            "Time of day": "Night",
            "Date of transaction": "2026-04-05",
        }
    )

    assert result["decision"] == "MFA_REQUIRED"
    assert result["signals"]["no_unusual_login"] is True
    assert result["signals"]["is_high_risk_type"] is True
    assert result["signals"]["both_customers"] is True