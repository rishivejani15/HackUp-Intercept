"""Explanation Service — generates human-readable fraud explanations.

This service translates raw SHAP values into:
  1. Per-feature natural-language sentences (e.g. "Amount is 22x user average")
  2. Severity classifications (CRITICAL / HIGH / MEDIUM / LOW)
  3. A headline summarising the overall risk
  4. An ordered list of risk ExplanationFactor objects
  5. A 1–2 sentence prose summary

The FEATURE_TEMPLATES dict is the single place to update text copy.
Adding a new feature requires only adding one entry here — nothing else changes.
"""

from __future__ import annotations

import math
from typing import Callable

import numpy as np
import structlog

from app.core.config import Settings
from app.core.feature_registry import FEATURE_METADATA
from app.schemas.response_schemas import ExplanationFactor, HumanExplanation
from app.schemas.shap_schemas import RawSHAPResult, SHAPFeature

logger = structlog.get_logger(__name__)

# ---------------------------------------------------------------------------
# Severity thresholds (tuned for probability-space SHAP values)
# ---------------------------------------------------------------------------
_SEVERITY_THRESHOLDS: list[tuple[float, str]] = [
    (0.25, "CRITICAL"),
    (0.12, "HIGH"),
    (0.05, "MEDIUM"),
    (0.00, "LOW"),
]

_SEVERITY_ICONS: dict[str, str] = {
    "CRITICAL": "🚨",
    "HIGH":     "⚠️",
    "MEDIUM":   "📌",
    "LOW":      "ℹ️",
}

# ---------------------------------------------------------------------------
# Feature template type: (feature_value, shap_value, context_dict) → str
# ---------------------------------------------------------------------------
TemplateFunc = Callable[[float, float, dict], str]


def _fmt_dollars(v: float) -> str:
    return f"${v:,.2f}"


def _fmt_ratio(v: float) -> str:
    return f"{v:.1f}x"


# ---------------------------------------------------------------------------
# Feature-level explanation templates
# Each function receives (feature_value, shap_value, context) and returns a
# natural-language sentence. Context is the TransactionMeta dict.
# ---------------------------------------------------------------------------
FEATURE_TEMPLATES: dict[str, TemplateFunc] = {

    "card_on_dark_web": lambda val, shap, ctx: (
        "Card number found in known dark web breach databases"
        if val == 1.0 else
        "Card has no dark web exposure — this reduces fraud likelihood"
    ),

    "is_night": lambda val, shap, ctx: (
        (
            f"Transaction at {ctx.get('hour', '?'):02d}:{ctx.get('minute', 0):02d} "
            "— outside normal activity hours (10 PM – 6 AM)"
        ) if val == 1.0 else (
            f"Transaction at {ctx.get('hour', '?'):02d}:{ctx.get('minute', 0):02d} "
            "— within normal daytime hours"
        )
    ),

    "amount_vs_user_avg_ratio": lambda val, shap, ctx: (
        (
            f"Amount ({_fmt_dollars(ctx['amount'])}) is {_fmt_ratio(val)} "
            f"this user's average ({_fmt_dollars(ctx['user_avg_amount'])})"
        ) if (shap > 0 and ctx.get("amount") and ctx.get("user_avg_amount")) else (
            f"Amount is {_fmt_ratio(val)} the user's average — within normal range"
            if shap <= 0 else
            f"Amount is {_fmt_ratio(val)}x the user's 7-day average"
        )
    ),

    "amount_zscore_user": lambda val, shap, ctx: (
        f"Amount is {abs(val):.1f} standard deviations above this user's average"
        if shap > 0 else
        f"Amount is within {abs(val):.1f} standard deviations of this user's average"
    ),

    "is_rapid_succession": lambda val, shap, ctx: (
        (
            f"Only {ctx.get('seconds_gap', 0):.0f}s since the last transaction "
            "— unusually rapid (possible bot or card-testing activity)"
        ) if val == 1.0 else
        "Normal time gap since the last transaction"
    ),

    "txns_last_1h": lambda val, shap, ctx: (
        f"{int(val)} transactions in the past hour — elevated frequency"
        if shap > 0 else
        f"{int(val)} transactions in the past hour — normal frequency"
    ),

    "is_high_risk_mcc": lambda val, shap, ctx: (
        (
            f"Merchant category ({ctx.get('mcc_description', 'Unknown')}) "
            "is classified as high-risk (gambling, crypto, wire transfer, etc.)"
        ) if val == 1.0 else
        f"Merchant category ({ctx.get('mcc_description', 'Unknown')}) is standard"
    ),

    "merchant_in_new_city": lambda val, shap, ctx: (
        (
            f"First-ever transaction in {ctx.get('merchant_city', 'this city')} "
            "for this user"
        ) if val == 1.0 else
        f"User has previously transacted in {ctx.get('merchant_city', 'this city')}"
    ),

    "is_foreign_transaction": lambda val, shap, ctx: (
        (
            f"Transaction in {ctx.get('merchant_state', 'unknown state')} "
            f"— differs from user's home state ({ctx.get('user_state', 'unknown')})"
        ) if val == 1.0 else
        "Transaction in user's home region"
    ),

    "is_weekend": lambda val, shap, ctx: (
        "Transaction on a weekend — slightly elevated fraud occurrence"
        if (val == 1.0 and shap > 0) else
        "Weekday transaction — typical activity pattern"
    ),

    "is_month_end": lambda val, shap, ctx: (
        "Transaction near month-end — elevated fraud occurrence period"
        if (val == 1.0 and shap > 0) else
        "Not a month-end transaction"
    ),

    "credit_utilization": lambda val, shap, ctx: (
        f"Transaction uses {val * 100:.0f}% of the card's credit limit"
        if shap > 0 else
        f"Credit utilization ({val * 100:.0f}%) is within normal range"
    ),

    "card_on_dark_web": lambda val, shap, ctx: (
        "Card number found in known dark web breach databases"
        if val == 1.0 else
        "Card has no known dark web exposure"
    ),

    "amount_is_round": lambda val, shap, ctx: (
        "Transaction is a suspiciously round amount (common in automated/bot fraud)"
        if val == 1.0 else
        "Transaction amount is irregular — not a round number"
    ),

    "card_age_days": lambda val, shap, ctx: (
        f"Card is newly issued ({int(val)} days old) — elevated risk period"
        if (shap > 0 and val < 90) else
        f"Card has been active for {int(val)} days — established account"
    ),

    "days_since_pin_change": lambda val, shap, ctx: (
        f"PIN has not changed in {int(val)} days — potential compromise window"
        if shap > 0 else
        f"PIN recently changed ({int(val)} days ago) — security posture is good"
    ),

    "debt_to_income_ratio": lambda val, shap, ctx: (
        f"User carries high debt relative to income (DTI ratio: {val:.2f})"
        if shap > 0 else
        f"User's debt-to-income ratio ({val:.2f}) is within acceptable range"
    ),

    "credit_score": lambda val, shap, ctx: (
        f"Credit score ({int(val)}) is relatively low — associated with higher risk"
        if shap > 0 else
        f"Credit score ({int(val)}) is strong — associated with lower fraud risk"
    ),

    "amount_vs_credit_limit_ratio": lambda val, shap, ctx: (
        f"This transaction is {val * 100:.0f}% of the card's total credit limit"
        if shap > 0 else
        f"Transaction is a small fraction ({val * 100:.0f}%) of the credit limit"
    ),

    "log_amount": lambda val, shap, ctx: (
        (
            f"Transaction amount ({_fmt_dollars(ctx['amount'])}) is unusually large"
        ) if (shap > 0 and ctx.get("amount")) else (
            f"Transaction amount ({_fmt_dollars(ctx['amount'])}) is within normal range"
            if ctx.get("amount") else
            "Transaction amount is elevated compared to baseline"
        )
    ),

    "has_chip": lambda val, shap, ctx: (
        "Card does not have an EMV chip — higher fraud risk for in-person use"
        if (val == 0.0 and shap > 0) else
        "Card has an EMV chip — more secure for in-person transactions"
    ),

    "num_cards_issued": lambda val, shap, ctx: (
        f"{int(val)} cards on this account — higher than typical"
        if shap > 0 else
        f"{int(val)} cards on this account — normal"
    ),

    # Default fallback for any unmapped feature
    "_default": lambda name, val, shap, ctx: (
        f"Feature '{name}' shows {abs(shap) * 100:.1f}% deviation "
        "from expected baseline"
    ),
}


# ---------------------------------------------------------------------------
# ExplanationService
# ---------------------------------------------------------------------------

class ExplanationService:
    """Converts raw SHAP results into human-readable explanations."""

    def __init__(self, settings: Settings) -> None:
        self._top_n = settings.shap_top_n
        self._fraud_threshold = settings.fraud_threshold
        self._suspicious_threshold = settings.suspicious_threshold

    # ── Public API ─────────────────────────────────────────────────────────

    def build_top_features(
        self, shap_result: RawSHAPResult, context: dict, top_n: int | None = None
    ) -> list[SHAPFeature]:
        """Build a ranked list of SHAPFeature objects.

        Args:
            shap_result: Raw SHAP output from SHAPService.
            context: TransactionMeta fields (amount, merchant_city, etc.).
            top_n: Override default top-N count.

        Returns:
            List of SHAPFeature sorted by |shap_value| descending.
        """
        n = top_n if top_n is not None else self._top_n
        sv = np.array(shap_result.shap_values)
        fv = np.array(shap_result.feature_values)
        names = shap_result.feature_names

        # Sort by absolute SHAP descending
        order = np.argsort(np.abs(sv))[::-1]

        # Compute contribution_percent from positive SHAP mass
        positive_total = float(np.sum(sv[sv > 0])) or 1e-9

        features: list[SHAPFeature] = []
        for idx in order[:n]:
            name = names[idx]
            sv_val = float(sv[idx])
            fv_val = float(fv[idx])

            meta = FEATURE_METADATA.get(name)
            human_label = meta.human_label if meta else name
            icon = meta.icon if meta else "📊"

            explanation = self._render_template(name, fv_val, sv_val, context)
            severity = self._classify_severity(sv_val)
            direction = (
                "increases_fraud" if sv_val > 0 else "decreases_fraud"
            )
            contribution_pct = round((sv_val / positive_total) * 100, 1)

            features.append(
                SHAPFeature(
                    feature_name=name,
                    human_label=human_label,
                    feature_value=round(fv_val, 4),
                    shap_value=round(sv_val, 6),
                    direction=direction,
                    contribution_percent=contribution_pct,
                    severity=severity,
                    human_explanation=explanation,
                    icon=icon,
                )
            )

        return features

    def build_human_explanation(
        self,
        top_features: list[SHAPFeature],
        fraud_probability: float,
        context: dict,
    ) -> HumanExplanation:
        """Generate a complete human-readable explanation.

        Args:
            top_features: Output of build_top_features().
            fraud_probability: Final fraud probability (0–1).
            context: TransactionMeta fields.

        Returns:
            HumanExplanation with headline, summary, and ordered factors.
        """
        classification = self._classify_transaction(fraud_probability)
        headline = self._generate_headline(classification, top_features)
        factors = self._build_factors(top_features)
        summary = self._generate_summary(top_features, fraud_probability, context)

        return HumanExplanation(
            headline=headline,
            summary=summary,
            factors=factors,
        )

    # ── Internal helpers ───────────────────────────────────────────────────

    def _classify_severity(self, shap_value: float) -> str:
        abs_val = abs(shap_value)
        for threshold, label in _SEVERITY_THRESHOLDS:
            if abs_val >= threshold:
                return label
        return "LOW"

    def _classify_transaction(self, probability: float) -> str:
        if probability >= self._fraud_threshold:
            return "fraud"
        if probability >= self._suspicious_threshold:
            return "suspicious"
        return "legitimate"

    def _render_template(
        self, feature_name: str, feature_value: float, shap_value: float, ctx: dict
    ) -> str:
        """Render a feature's explanation sentence using its template."""
        template = FEATURE_TEMPLATES.get(feature_name)
        if template is None:
            return FEATURE_TEMPLATES["_default"](
                feature_name, feature_value, shap_value, ctx
            )
        try:
            return template(feature_value, shap_value, ctx)
        except Exception:
            # Template failed (e.g. missing ctx key) → safe fallback
            meta = FEATURE_METADATA.get(feature_name)
            label = meta.human_label if meta else feature_name
            direction_word = "elevated" if shap_value > 0 else "normal"
            return f"{label} is {direction_word} for this transaction"

    def _generate_headline(
        self, classification: str, top_features: list[SHAPFeature]
    ) -> str:
        critical = sum(1 for f in top_features if f.severity == "CRITICAL")
        high = sum(1 for f in top_features if f.severity == "HIGH")
        total_risks = critical + high

        if classification == "fraud":
            if critical >= 2:
                return f"🚨 CRITICAL FRAUD RISK — {critical} critical signals detected"
            if critical == 1:
                return f"🚨 HIGH FRAUD RISK — {total_risks} risk factor{'s' if total_risks > 1 else ''} found"
            return "⚠️ ELEVATED FRAUD RISK — Multiple suspicious patterns"
        if classification == "suspicious":
            return (
                f"⚠️ SUSPICIOUS TRANSACTION — {total_risks} anomal{'ies' if total_risks != 1 else 'y'} detected"
            )
        return "✅ LEGITIMATE — Transaction appears normal"

    def _build_factors(
        self, top_features: list[SHAPFeature]
    ) -> list[ExplanationFactor]:
        factors: list[ExplanationFactor] = []
        for f in top_features:
            icon = _SEVERITY_ICONS.get(f.severity, "📊")
            factors.append(
                ExplanationFactor(
                    severity=f.severity,
                    icon=icon,
                    text=f.human_explanation,
                    feature=f.feature_name,
                )
            )
        return factors

    def _generate_summary(
        self,
        top_features: list[SHAPFeature],
        fraud_probability: float,
        ctx: dict,
    ) -> str:
        """Generate a 1–2 sentence prose summary."""
        pct = round(fraud_probability * 100, 1)
        classification = self._classify_transaction(fraud_probability)

        if classification == "fraud":
            drivers = [
                f.human_explanation.rstrip(".")
                for f in top_features
                if f.direction == "increases_fraud"
            ][:2]
            if drivers:
                driver_text = "; ".join(drivers[:2])
                return (
                    f"Fraud probability: {pct}%. Primary signals: {driver_text}."
                )
            return f"Model assigned {pct}% fraud probability based on multiple anomalous patterns."

        if classification == "suspicious":
            return (
                f"Transaction shows suspicious patterns ({pct}% fraud probability) "
                "but falls below the automated blocking threshold. Manual review recommended."
            )

        return (
            f"Transaction appears legitimate ({pct}% fraud probability). "
            "No significant anomalies were detected."
        )
