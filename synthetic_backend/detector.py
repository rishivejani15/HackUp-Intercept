from typing import Dict, Any, Tuple

class SyntheticIdentityDetector:
    def evaluate(self, features: Dict[str, float]) -> Tuple[float, str, Dict[str, Any], list]:
        """
        Evaluates a transaction to produce a synthetic score (0-100), verdict, active signals, and explanations.
        """
        score = 0.0
        signals = {}
        explanations = []

        def mark(signal_name: str, explanation: str | None = None, points: float = 0.0) -> None:
            nonlocal score
            score += points
            signals[signal_name] = True
            if explanation:
                explanations.append(explanation)

        # full_account_drain
        if features.get("full_account_drain") == 1:
            score += 40
            signals["full_account_drain"] = True
            oldbal = features.get("_oldbalanceOrg", 0)
            explanations.append(f"Account fully emptied — balance went from ${oldbal:,.2f} to $0")

        is_high_risk_type = features.get("is_high_risk_type") == 1
        is_high_amount = features.get("is_high_amount") == 1
        has_other_suspicious_context = (
            features.get("full_account_drain") == 1
            or is_high_risk_type
            or is_high_amount
            or features.get("both_customers") == 1
        )

        # no_unusual_login should only matter when paired with suspicious transfer behavior.
        if features.get("no_unusual_login") == 1 and has_other_suspicious_context:
            mark(
                "no_unusual_login",
                "No login anomaly despite suspicious activity — attacker likely has real credentials (Account Takeover)",
                points=20,
            )

        # dest_was_empty is only meaningful for suspicious customer-to-customer or high-risk transfers.
        if features.get("dest_was_empty") == 1 and has_other_suspicious_context:
            mark(
                "dest_was_empty",
                "Funds sent to a previously empty account — likely a synthetic mule account",
                points=20,
            )

        # is_high_risk_type
        if is_high_risk_type:
            score += 15
            signals["is_high_risk_type"] = True

        # is_high_amount
        if is_high_amount:
            score += 20
            signals["is_high_amount"] = True
            amt = features.get("_amount", 0)
            explanations.append(f"Transaction amount ${amt:,.2f} is exceptionally high")

        # both_customers
        if features.get("both_customers") == 1:
            score += 10
            signals["both_customers"] = True

        # high_risk_branch
        if features.get("high_risk_branch") == 1:
            score += 10
            signals["high_risk_branch"] = True
            explanations.append(f"Transaction originates from high-risk geographic region: {features.get('_branch', 'Unknown')}")

        # balance_discrepancy > 0
        if features.get("balance_discrepancy", 0) > 0:
            score += 15
            signals["balance_discrepancy_positive"] = True

        # dest_balance_unchanged AND is_high_risk_type
        if features.get("dest_balance_unchanged") == 1 and is_high_risk_type:
            score += 20
            signals["dest_balance_unchanged_and_high_risk"] = True
            explanations.append("Destination balance remained unchanged after risky transaction — money likely vanished immediately")

        # Cap score at 100
        score = min(score, 100.0)

        # Verdict assignment
        if score >= 70:
            verdict = "SYNTHETIC_CONFIRMED"
        elif score >= 40:
            verdict = "SYNTHETIC_SUSPECTED"
        else:
            verdict = "LEGITIMATE"

        return score, verdict, signals, explanations
