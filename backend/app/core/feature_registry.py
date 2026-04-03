"""
Feature Registry — single source of truth for all feature metadata.

This file defines:
  - FEATURE_COLUMNS: ordered list of all feature names (must match FeatureEngineer output)
  - FEATURE_METADATA: human labels, descriptions, and icon hints per feature
  - HIGH_RISK_MCC_CODES: merchant categories considered high-risk

When your friend finalises their feature engineering, update FEATURE_COLUMNS here.
Nothing else in the codebase needs to change.
"""

from __future__ import annotations
from dataclasses import dataclass, field

# ---------------------------------------------------------------------------
# Feature column order — must match the DataFrame columns from FeatureEngineer
# ---------------------------------------------------------------------------
FEATURE_COLUMNS: list[str] = [
    # Temporal
    "hour_of_day",
    "day_of_week",
    "is_weekend",
    "is_night",
    "month",
    "is_month_end",
    "quarter",
    # Amount
    "log_amount",
    "amount_vs_credit_limit_ratio",
    "amount_is_round",
    "amount_decile",
    # Behavioral (rolling windows)
    "user_avg_amount_7d",
    "user_std_amount_7d",
    "user_txn_count_24h",
    "amount_vs_user_avg_ratio",
    "amount_zscore_user",
    # Velocity
    "seconds_since_last_txn",
    "txns_last_1h",
    "is_rapid_succession",
    # Card-level
    "card_age_days",
    "credit_utilization",
    "days_since_pin_change",
    "card_on_dark_web",
    "has_chip",
    "card_type_encoded",
    "num_cards_issued",
    # User profile
    "debt_to_income_ratio",
    "credit_score",
    "current_age",
    "num_credit_cards",
    # Merchant
    "mcc_description_encoded",
    "is_high_risk_mcc",
    "merchant_in_new_city",
    # Geographic
    "is_foreign_transaction",
    "merchant_state_encoded",
]


# ---------------------------------------------------------------------------
# Feature metadata — human-readable labels & descriptions for every feature
# ---------------------------------------------------------------------------
@dataclass(frozen=True)
class FeatureMeta:
    human_label: str
    description: str
    icon: str = "📊"
    unit: str = ""


FEATURE_METADATA: dict[str, FeatureMeta] = {
    "hour_of_day": FeatureMeta(
        human_label="Transaction Hour",
        description="Hour of day the transaction occurred (0–23)",
        icon="🕐",
        unit="hour",
    ),
    "day_of_week": FeatureMeta(
        human_label="Day of Week",
        description="Day of week (0=Monday … 6=Sunday)",
        icon="📅",
    ),
    "is_weekend": FeatureMeta(
        human_label="Weekend Transaction",
        description="Transaction occurred on Saturday or Sunday",
        icon="📅",
    ),
    "is_night": FeatureMeta(
        human_label="Nighttime Transaction",
        description="Transaction between 10 PM and 6 AM",
        icon="🌙",
    ),
    "month": FeatureMeta(
        human_label="Month",
        description="Calendar month of the transaction",
        icon="📅",
    ),
    "is_month_end": FeatureMeta(
        human_label="Month-End Transaction",
        description="Transaction on or after the 28th of the month",
        icon="📅",
    ),
    "quarter": FeatureMeta(
        human_label="Quarter",
        description="Fiscal quarter of the transaction",
        icon="📅",
    ),
    "log_amount": FeatureMeta(
        human_label="Transaction Amount",
        description="Log-normalized transaction amount",
        icon="💰",
        unit="$",
    ),
    "amount_vs_credit_limit_ratio": FeatureMeta(
        human_label="Credit Limit Usage",
        description="Transaction amount as a fraction of card credit limit",
        icon="💳",
        unit="%",
    ),
    "amount_is_round": FeatureMeta(
        human_label="Round Amount",
        description="Transaction is a suspiciously round number (automated/bot signal)",
        icon="🤖",
    ),
    "amount_decile": FeatureMeta(
        human_label="Amount Percentile Band",
        description="Which 10th-percentile band the transaction amount falls into",
        icon="📊",
    ),
    "user_avg_amount_7d": FeatureMeta(
        human_label="User 7-Day Average",
        description="User's average transaction amount over the past 7 days",
        icon="📊",
        unit="$",
    ),
    "user_std_amount_7d": FeatureMeta(
        human_label="Spending Volatility",
        description="Standard deviation of user's spending over the past 7 days",
        icon="📊",
        unit="$",
    ),
    "user_txn_count_24h": FeatureMeta(
        human_label="24-Hour Transaction Count",
        description="Number of transactions by this user in the past 24 hours",
        icon="🔢",
    ),
    "amount_vs_user_avg_ratio": FeatureMeta(
        human_label="Amount vs User Average",
        description="How many times larger this amount is vs. the user's 7-day average",
        icon="💸",
    ),
    "amount_zscore_user": FeatureMeta(
        human_label="Amount Z-Score (User)",
        description="Standard deviations from this user's average spending",
        icon="📊",
    ),
    "seconds_since_last_txn": FeatureMeta(
        human_label="Time Since Last Transaction",
        description="Seconds elapsed since this user's previous transaction",
        icon="⏱️",
        unit="seconds",
    ),
    "txns_last_1h": FeatureMeta(
        human_label="Transactions in Last Hour",
        description="Number of transactions by this user in the past 60 minutes",
        icon="⚡",
    ),
    "is_rapid_succession": FeatureMeta(
        human_label="Rapid Succession",
        description="Transaction occurred less than 60 seconds after the previous one",
        icon="⚡",
    ),
    "card_age_days": FeatureMeta(
        human_label="Card Age",
        description="Number of days since the card account was opened",
        icon="💳",
        unit="days",
    ),
    "credit_utilization": FeatureMeta(
        human_label="Credit Utilization",
        description="This transaction as a fraction of available credit limit",
        icon="💳",
        unit="%",
    ),
    "days_since_pin_change": FeatureMeta(
        human_label="Days Since PIN Change",
        description="Days elapsed since the card PIN was last changed",
        icon="🔒",
        unit="days",
    ),
    "card_on_dark_web": FeatureMeta(
        human_label="Dark Web Exposure",
        description="Card number found in known dark web breach databases",
        icon="🌑",
    ),
    "has_chip": FeatureMeta(
        human_label="Chip Card",
        description="Whether the card has an EMV chip (more secure)",
        icon="💳",
    ),
    "card_type_encoded": FeatureMeta(
        human_label="Card Type",
        description="Type of card: credit (0), debit (1), or prepaid (2)",
        icon="💳",
    ),
    "num_cards_issued": FeatureMeta(
        human_label="Cards on Account",
        description="Total number of cards issued on this account",
        icon="💳",
    ),
    "debt_to_income_ratio": FeatureMeta(
        human_label="Debt-to-Income Ratio",
        description="User's total debt as a fraction of annual income",
        icon="📊",
    ),
    "credit_score": FeatureMeta(
        human_label="Credit Score",
        description="User's credit score (300–850)",
        icon="⭐",
    ),
    "current_age": FeatureMeta(
        human_label="User Age",
        description="Current age of the account holder",
        icon="👤",
        unit="years",
    ),
    "num_credit_cards": FeatureMeta(
        human_label="Number of Credit Cards",
        description="Total number of credit cards held by this user",
        icon="💳",
    ),
    "mcc_description_encoded": FeatureMeta(
        human_label="Merchant Category",
        description="Encoded merchant category code (MCC)",
        icon="🏪",
    ),
    "is_high_risk_mcc": FeatureMeta(
        human_label="High-Risk Merchant",
        description="Merchant falls in a high-risk category (gambling, crypto, wire transfer, etc.)",
        icon="⚠️",
    ),
    "merchant_in_new_city": FeatureMeta(
        human_label="New City",
        description="First time this user has transacted in this merchant's city",
        icon="📍",
    ),
    "is_foreign_transaction": FeatureMeta(
        human_label="Out-of-State Transaction",
        description="Transaction state differs from the user's home state",
        icon="🗺️",
    ),
    "merchant_state_encoded": FeatureMeta(
        human_label="Merchant State",
        description="Encoded US state where the merchant is located",
        icon="📍",
    ),
}

# ---------------------------------------------------------------------------
# High-risk MCC descriptions (used in explanation_service templates)
# ---------------------------------------------------------------------------
HIGH_RISK_MCC_DESCRIPTIONS: set[str] = {
    "gambling",
    "casino",
    "cryptocurrency",
    "wire transfer",
    "money transfer",
    "pawnshop",
    "jewelry",
    "electronics",
    "gift cards",
    "prepaid cards",
}
