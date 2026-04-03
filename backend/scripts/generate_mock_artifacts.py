"""Generate mock model artifacts for development.

This script creates realistic mock artifacts so the SHAP service
can run immediately without waiting for your friend's real models.

What it produces:
  models/xgboost_model.pkl       — XGBClassifier trained on synthetic data
  models/isolation_forest.pkl    — IsolationForest trained on same data

The model is trained on synthetic features that match FEATURE_COLUMNS exactly,
so SHAP values are real (not faked) — just from artificially generated data.

Usage:
    python scripts/generate_mock_artifacts.py

When your friend delivers real models:
  1. Replace models/xgboost_model.pkl with their file
  2. Run scripts/build_shap_cache.py to rebuild the SHAP explainer
  3. Everything else stays the same
"""

from __future__ import annotations

import sys
from pathlib import Path

# Add backend root to path so imports work from scripts/
sys.path.insert(0, str(Path(__file__).parent.parent))

import json
import warnings

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

from app.core.feature_registry import FEATURE_COLUMNS

warnings.filterwarnings("ignore")

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
MODELS_DIR = Path("models")
DATA_DIR = Path("data/processed")
MODELS_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)

N_SAMPLES = 50_000
FRAUD_RATE = 0.015   # 1.5% fraud rate — realistic for transaction data
RANDOM_STATE = 42
np.random.seed(RANDOM_STATE)


# ---------------------------------------------------------------------------
# Synthetic data generation
# ---------------------------------------------------------------------------

def generate_synthetic_transactions(n: int, fraud_rate: float) -> pd.DataFrame:
    """Generate synthetic transactions with realistic feature distributions.

    Fraud transactions are seeded with statistically anomalous values
    across the key fraud-signal features, so the trained model learns
    meaningful patterns and SHAP values reflect real signal.
    """
    n_fraud = int(n * fraud_rate)
    n_legit = n - n_fraud

    rng = np.random.default_rng(RANDOM_STATE)

    def make_legit(n_rows: int) -> dict:
        return {
            # Temporal
            "hour_of_day":          rng.integers(8, 22, n_rows).astype(float),
            "day_of_week":          rng.integers(0, 7, n_rows).astype(float),
            "is_weekend":           rng.integers(0, 2, n_rows).astype(float),
            "is_night":             np.zeros(n_rows),
            "month":                rng.integers(1, 13, n_rows).astype(float),
            "is_month_end":         rng.integers(0, 2, n_rows).astype(float) * 0.1,
            "quarter":              rng.integers(1, 5, n_rows).astype(float),
            # Amount
            "log_amount":           rng.normal(3.8, 1.0, n_rows),   # ~$45 avg
            "amount_vs_credit_limit_ratio": rng.uniform(0.01, 0.3, n_rows),
            "amount_is_round":      rng.integers(0, 2, n_rows).astype(float) * 0.05,
            "amount_decile":        rng.integers(1, 11, n_rows).astype(float),
            # Behavioral
            "user_avg_amount_7d":   rng.normal(45, 20, n_rows).clip(1),
            "user_std_amount_7d":   rng.normal(15, 8, n_rows).clip(0),
            "user_txn_count_24h":   rng.integers(0, 8, n_rows).astype(float),
            "amount_vs_user_avg_ratio": rng.normal(1.0, 0.4, n_rows).clip(0.01),
            "amount_zscore_user":   rng.normal(0, 1, n_rows),
            # Velocity
            "seconds_since_last_txn": rng.exponential(3600, n_rows),
            "txns_last_1h":         rng.integers(0, 4, n_rows).astype(float),
            "is_rapid_succession":  np.zeros(n_rows),
            # Card
            "card_age_days":        rng.normal(800, 400, n_rows).clip(1),
            "credit_utilization":   rng.uniform(0.01, 0.4, n_rows),
            "days_since_pin_change": rng.normal(365, 200, n_rows).clip(0),
            "card_on_dark_web":     np.zeros(n_rows),
            "has_chip":             np.ones(n_rows),
            "card_type_encoded":    rng.integers(0, 3, n_rows).astype(float),
            "num_cards_issued":     rng.integers(1, 4, n_rows).astype(float),
            # User profile
            "debt_to_income_ratio": rng.uniform(0.1, 0.5, n_rows),
            "credit_score":         rng.normal(720, 60, n_rows).clip(300, 850),
            "current_age":          rng.normal(42, 12, n_rows).clip(18, 85),
            "num_credit_cards":     rng.integers(1, 6, n_rows).astype(float),
            # Merchant
            "mcc_description_encoded": rng.integers(0, 50, n_rows).astype(float),
            "is_high_risk_mcc":     rng.integers(0, 2, n_rows).astype(float) * 0.05,
            "merchant_in_new_city": rng.integers(0, 2, n_rows).astype(float) * 0.1,
            # Geographic
            "is_foreign_transaction": rng.integers(0, 2, n_rows).astype(float) * 0.05,
            "merchant_state_encoded":  rng.integers(0, 50, n_rows).astype(float),
        }

    def make_fraud(n_rows: int) -> dict:
        d = make_legit(n_rows)
        # Inject fraud signals with high probability
        fraud_mask = rng.random(n_rows) < 0.7
        d["card_on_dark_web"]      = (rng.random(n_rows) < 0.55).astype(float)
        d["is_night"]              = (rng.random(n_rows) < 0.65).astype(float)
        d["amount_vs_user_avg_ratio"] = rng.normal(12, 6, n_rows).clip(1)
        d["amount_zscore_user"]    = rng.normal(8, 3, n_rows).clip(0)
        d["is_rapid_succession"]   = (rng.random(n_rows) < 0.4).astype(float)
        d["txns_last_1h"]          = rng.integers(3, 15, n_rows).astype(float)
        d["is_high_risk_mcc"]      = (rng.random(n_rows) < 0.45).astype(float)
        d["merchant_in_new_city"]  = (rng.random(n_rows) < 0.60).astype(float)
        d["is_foreign_transaction"] = (rng.random(n_rows) < 0.50).astype(float)
        d["log_amount"]            = rng.normal(6.5, 1.2, n_rows)  # ~$600 avg
        d["credit_score"]          = rng.normal(620, 80, n_rows).clip(300, 850)
        d["seconds_since_last_txn"] = rng.exponential(120, n_rows)   # rapid
        d["credit_utilization"]    = rng.uniform(0.6, 1.0, n_rows)
        d["has_chip"]              = (rng.random(n_rows) < 0.3).astype(float)
        d["amount_is_round"]       = (rng.random(n_rows) < 0.5).astype(float)
        return d

    legit_data = make_legit(n_legit)
    fraud_data = make_fraud(n_fraud)

    legit_df = pd.DataFrame(legit_data)[FEATURE_COLUMNS]
    fraud_df = pd.DataFrame(fraud_data)[FEATURE_COLUMNS]
    legit_df["is_fraud"] = 0
    fraud_df["is_fraud"] = 1

    df = pd.concat([legit_df, fraud_df], ignore_index=True)
    df = df.sample(frac=1, random_state=RANDOM_STATE).reset_index(drop=True)
    return df


# ---------------------------------------------------------------------------
# Training
# ---------------------------------------------------------------------------

def train_xgboost(X_train: pd.DataFrame, y_train: pd.Series) -> XGBClassifier:
    print("Training XGBoost classifier...")
    n_legit = int((y_train == 0).sum())
    n_fraud = int((y_train == 1).sum())
    scale_pos_weight = n_legit / max(n_fraud, 1)
    print(f"  Class ratio → positive weight: {scale_pos_weight:.1f}")

    model = XGBClassifier(
        objective="binary:logistic",
        eval_metric="aucpr",
        max_depth=6,
        learning_rate=0.05,
        n_estimators=300,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=scale_pos_weight,
        min_child_weight=5,
        gamma=1,
        reg_alpha=0.1,
        reg_lambda=1.0,
        tree_method="hist",
        random_state=RANDOM_STATE,
        verbosity=0,
        use_label_encoder=False,
    )
    model.fit(
        X_train,
        y_train,
        eval_set=[(X_train, y_train)],
        verbose=False,
    )
    print("  XGBoost training complete.")
    return model


def train_isolation_forest(X_train: pd.DataFrame) -> IsolationForest:
    print("Training Isolation Forest...")
    iso = IsolationForest(
        contamination=FRAUD_RATE,
        n_estimators=200,
        max_features=0.8,
        bootstrap=True,
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )
    iso.fit(X_train)
    print("  Isolation Forest training complete.")
    return iso


def save_model_stats(
    model: XGBClassifier,
    X_test: pd.DataFrame,
    y_test: pd.Series,
) -> None:
    from sklearn.metrics import (
        accuracy_score, precision_score, recall_score,
        f1_score, average_precision_score, confusion_matrix,
    )

    y_prob = model.predict_proba(X_test)[:, 1]
    y_pred = (y_prob >= 0.5).astype(int)
    cm = confusion_matrix(y_test, y_pred)
    tn, fp, fn, tp = cm.ravel()

    stats = {
        "model_version": "mock-1.0",
        "accuracy":          float(accuracy_score(y_test, y_pred)),
        "precision":         float(precision_score(y_test, y_pred, zero_division=0)),
        "recall":            float(recall_score(y_test, y_pred, zero_division=0)),
        "f1_score":          float(f1_score(y_test, y_pred, zero_division=0)),
        "auprc":             float(average_precision_score(y_test, y_prob)),
        "false_positive_rate": float(fp / max(fp + tn, 1)),
        "false_negative_rate": float(fn / max(fn + tp, 1)),
        "confusion_matrix":  {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
        "training_samples":  len(X_test),
        "fraud_samples":     int(y_test.sum()),
        "legitimate_samples": int((y_test == 0).sum()),
        "fraud_rate_percent": float(y_test.mean() * 100),
    }
    stats_path = DATA_DIR / "model_stats.json"
    with stats_path.open("w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2)

    print(f"\n  Model Stats:")
    print(f"    Accuracy  : {stats['accuracy']:.3f}")
    print(f"    Precision : {stats['precision']:.3f}")
    print(f"    Recall    : {stats['recall']:.3f}")
    print(f"    F1 Score  : {stats['f1_score']:.3f}")
    print(f"    AUPRC     : {stats['auprc']:.3f}")
    print(f"  Saved to {stats_path}")


def save_test_features(X_test: pd.DataFrame, y_test: pd.Series) -> None:
    X_test_copy = X_test.copy()
    X_test_copy["is_fraud"] = y_test.values
    test_path = DATA_DIR / "features_test.parquet"
    X_test_copy.to_parquet(test_path, index=False)
    print(f"  Test features saved to {test_path}  ({len(X_test_copy):,} rows)")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    print("=" * 60)
    print("FraudShield AI — Mock Artifact Generator")
    print("=" * 60)

    print(f"\nGenerating {N_SAMPLES:,} synthetic transactions...")
    df = generate_synthetic_transactions(N_SAMPLES, FRAUD_RATE)
    n_fraud = int(df["is_fraud"].sum())
    print(f"  Legitimate: {N_SAMPLES - n_fraud:,}   Fraud: {n_fraud:,}   Rate: {n_fraud / N_SAMPLES * 100:.2f}%")

    X = df[FEATURE_COLUMNS]
    y = df["is_fraud"]
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=RANDOM_STATE
    )
    print(f"  Train: {len(X_train):,}   Test: {len(X_test):,}")

    print()
    xgb_model = train_xgboost(X_train, y_train)
    iso_model = train_isolation_forest(X_train)

    # Save
    xgb_path = MODELS_DIR / "xgboost_model.pkl"
    iso_path = MODELS_DIR / "isolation_forest.pkl"
    joblib.dump(xgb_model, xgb_path)
    joblib.dump(iso_model, iso_path)
    print(f"\nSaved: {xgb_path}")
    print(f"Saved: {iso_path}")

    print("\nEvaluating model...")
    save_model_stats(xgb_model, X_test, y_test)
    save_test_features(X_test, y_test)

    print("\n" + "=" * 60)
    print("Mock artifacts generated successfully!")
    print("Next step: python scripts/build_shap_cache.py")
    print("=" * 60)


if __name__ == "__main__":
    main()
