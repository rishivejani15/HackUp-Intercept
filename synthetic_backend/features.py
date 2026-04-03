import numpy as np
from typing import Dict, Any

class FeatureEngineer:
    """
    Handles feature extraction from raw transaction data.
    Works on a single dictionary for real-time inference.
    """

    HIGH_RISK_BRANCHES = [
        "Estados Unidos", "Australia", "Cuba", 
        "Brasil", "Filipinas", "Republica Dominicana", "Francia"
    ]

    @staticmethod
    def transform_dict(raw: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transforms a single raw transaction dictionary into a feature dictionary.
        Safe defaults are used if keys are missing.
        """
        f = {}
        
        # Raw value extraction (with safe fallbacks)
        amount = float(raw.get("amount", 0.0))
        oldbalanceOrg = float(raw.get("oldbalanceOrg", 0.0))
        newbalanceOrig = float(raw.get("newbalanceOrig", 0.0))
        oldbalanceDest = float(raw.get("oldbalanceDest", 0.0))
        newbalanceDest = float(raw.get("newbalanceDest", 0.0))
        txn_type = str(raw.get("type", "")).upper()
        unusuallogin = int(raw.get("unusuallogin", 0))
        time_of_day = str(raw.get("Time of day", raw.get("time_of_day", "")))
        acct_type = str(raw.get("Acct type", raw.get("acct_type", "")))
        nameDest = str(raw.get("nameDest", ""))
        nameOrig = str(raw.get("nameOrig", ""))
        branch = str(raw.get("branch", ""))

        # drain_ratio = 1 - (newbalanceOrig / (oldbalanceOrg + 1e-9)), clipped 0-1
        drain_ratio = 1.0 - (newbalanceOrig / (oldbalanceOrg + 1e-9))
        f["drain_ratio"] = max(0.0, min(1.0, drain_ratio))

        # full_account_drain = 1 if newbalanceOrig == 0 AND oldbalanceOrg > 0, else 0
        f["full_account_drain"] = 1 if newbalanceOrig == 0.0 and oldbalanceOrg > 0.0 else 0

        # balance_discrepancy = abs(oldbalanceOrg - newbalanceOrig - amount)
        f["balance_discrepancy"] = abs(oldbalanceOrg - newbalanceOrig - amount)

        # dest_balance_unchanged = 1 if newbalanceDest == oldbalanceDest, else 0
        f["dest_balance_unchanged"] = 1 if newbalanceDest == oldbalanceDest else 0

        # amount_to_balance_ratio = amount / (oldbalanceOrg + 1e-9), clipped 0-10
        amt_ratio = amount / (oldbalanceOrg + 1e-9)
        f["amount_to_balance_ratio"] = max(0.0, min(10.0, amt_ratio))

        # log_amount = log1p(amount)
        f["log_amount"] = np.log1p(amount)

        # is_transfer, is_cash_out, is_high_risk_type
        f["is_transfer"] = 1 if txn_type == "TRANSFER" else 0
        f["is_cash_out"] = 1 if txn_type == "CASH_OUT" else 0
        f["is_high_risk_type"] = 1 if txn_type in ["TRANSFER", "CASH_OUT"] else 0

        # no_unusual_login = 1 if unusuallogin == 0
        f["no_unusual_login"] = 1 if unusuallogin == 0 else 0

        # login_risk = 1 / (unusuallogin + 1)
        f["login_risk"] = 1.0 / (unusuallogin + 1)

        # is_night, is_morning
        f["is_night"] = 1 if time_of_day == "Night" else 0
        f["is_morning"] = 1 if time_of_day == "Morning" else 0

        # is_savings
        f["is_savings"] = 1 if acct_type == "Savings" else 0

        # dest_is_customer = 1 if nameDest starts with C
        f["dest_is_customer"] = 1 if nameDest.startswith("C") else 0

        # both_customers = 1 if nameOrig and nameDest both start with C
        f["both_customers"] = 1 if nameOrig.startswith("C") and nameDest.startswith("C") else 0

        # is_high_amount
        f["is_high_amount"] = 1 if amount > 200000 else 0

        # is_very_high_amount
        f["is_very_high_amount"] = 1 if amount > 1000000 else 0

        # dest_was_empty
        f["dest_was_empty"] = 1 if oldbalanceDest == 0.0 else 0

        # high_risk_branch
        f["high_risk_branch"] = 1 if branch in FeatureEngineer.HIGH_RISK_BRANCHES else 0

        # Store slightly reformatted originals for template generation access
        f["_amount"] = amount
        f["_oldbalanceOrg"] = oldbalanceOrg
        f["_branch"] = branch

        return f
