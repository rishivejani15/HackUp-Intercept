"""Build SHAP cache — run once before starting the API server.

This script:
  1. Loads the XGBoost model (mock or real from friend)
  2. Builds shap.TreeExplainer with interventional perturbation
  3. Computes SHAP values across the full test set (vectorized)
  4. Saves the explainer to data/processed/shap_explainer.pkl
  5. Computes and saves global feature importance (shap_global_cache.json)
  6. Pre-scores all test transactions with SHAP + human text
  7. Saves scored_transactions.parquet for GET /transactions

Run AFTER generate_mock_artifacts.py (or after friend delivers real models):
    python scripts/build_shap_cache.py

Estimated time:
  - 50k transactions: ~2–5 minutes
  - 300k transactions: ~10–20 minutes
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import json
import time
import warnings
from datetime import datetime, timezone

import joblib
import numpy as np
import pandas as pd
import shap
from tqdm import tqdm

from app.core.config import get_settings
from app.core.feature_registry import FEATURE_COLUMNS, FEATURE_METADATA
from app.services.explanation_service import ExplanationService
from app.services.waterfall_service import WaterfallService
from app.schemas.shap_schemas import RawSHAPResult

warnings.filterwarnings("ignore")

settings = get_settings()
RANDOM_STATE = 42
BACKGROUND_SIZE = settings.shap_background_size
TOP_N = settings.shap_top_n


# ---------------------------------------------------------------------------
# Step 1: Load model and test data
# ---------------------------------------------------------------------------

def load_artifacts() -> tuple:
    """Load XGBoost model and test features from disk."""
    xgb_path = settings.xgboost_model_path
    if not xgb_path.exists():
        print(f"[ERROR] XGBoost model not found at {xgb_path}")
        print("  Run: python scripts/generate_mock_artifacts.py")
        sys.exit(1)

    print(f"Loading XGBoost model from {xgb_path}...")
    model = joblib.load(xgb_path)
    print("  Model loaded.")

    test_path = settings.data_dir / "features_test.parquet"
    if not test_path.exists():
        print(f"[ERROR] Test features not found at {test_path}")
        print("  Run: python scripts/generate_mock_artifacts.py")
        sys.exit(1)

    print(f"Loading test features from {test_path}...")
    df = pd.read_parquet(test_path)
    
    # Separate features from labels
    label_col = "is_fraud" if "is_fraud" in df.columns else None
    y_test = df[label_col] if label_col else None
    X_test = df[FEATURE_COLUMNS].astype(np.float32)
    
    print(f"  Test set: {len(X_test):,} rows, {len(FEATURE_COLUMNS)} features")
    if y_test is not None:
        n_fraud = int(y_test.sum())
        print(f"  Fraud: {n_fraud:,} ({n_fraud / len(y_test) * 100:.2f}%)")

    return model, X_test, y_test, df


# ---------------------------------------------------------------------------
# Step 2: Build TreeExplainer
# ---------------------------------------------------------------------------

def build_explainer(model, X_test: pd.DataFrame) -> shap.TreeExplainer:
    """Build TreeExplainer with interventional perturbation."""
    print(f"\nSampling {BACKGROUND_SIZE} background rows for interventional SHAP...")
    background = X_test.sample(
        n=min(BACKGROUND_SIZE, len(X_test)), random_state=RANDOM_STATE
    )

    print("Building shap.TreeExplainer (interventional, probability output)...")
    t0 = time.perf_counter()
    explainer = shap.TreeExplainer(
        model,
        data=background,
        feature_perturbation="interventional",
        model_output="probability",
    )
    elapsed = time.perf_counter() - t0
    print(f"  Explainer built in {elapsed:.1f}s")
    print(f"  Base value (background fraud rate): {explainer.expected_value:.6f}")

    explainer_path = settings.shap_explainer_path
    joblib.dump(explainer, explainer_path)
    print(f"  Saved explainer to {explainer_path}")

    return explainer


# ---------------------------------------------------------------------------
# Step 3: Compute global SHAP importance
# ---------------------------------------------------------------------------

def compute_global_importance(
    explainer: shap.TreeExplainer, X_test: pd.DataFrame
) -> np.ndarray:
    """Compute SHAP values on full test set and save global importance."""
    print(f"\nComputing SHAP values on {len(X_test):,} test rows...")
    print("  (This is the slow step — TreeSHAP is O(TLD²). Please wait.)")

    # Process in chunks to show progress
    chunk_size = 1000
    all_shap_values: list[np.ndarray] = []

    for start in tqdm(range(0, len(X_test), chunk_size), desc="  SHAP chunks"):
        chunk = X_test.iloc[start : start + chunk_size]
        sv = explainer.shap_values(chunk)
        # Handle both XGBClassifier list output and raw Booster array
        sv_arr = sv[1] if isinstance(sv, list) else sv
        all_shap_values.append(sv_arr)

    shap_matrix = np.vstack(all_shap_values)  # (N, n_features)
    print(f"  SHAP matrix shape: {shap_matrix.shape}")

    # Global importance = mean |SHAP| per feature
    mean_abs_shap = np.abs(shap_matrix).mean(axis=0)
    ranked_idx = np.argsort(mean_abs_shap)[::-1]

    global_cache: list[dict] = []
    for rank, idx in enumerate(ranked_idx, start=1):
        name = FEATURE_COLUMNS[idx]
        meta = FEATURE_METADATA.get(name)
        global_cache.append({
            "rank":          rank,
            "feature_name":  name,
            "human_label":   meta.human_label if meta else name,
            "mean_abs_shap": round(float(mean_abs_shap[idx]), 6),
            "description":   meta.description if meta else "",
            "icon":          meta.icon if meta else "📊",
        })

    cache_path = settings.shap_global_cache_path
    with cache_path.open("w", encoding="utf-8") as f:
        json.dump(global_cache, f, indent=2)
    print(f"  Saved global SHAP cache to {cache_path}")

    # Print top 10
    print("\n  Top 10 Features by Mean |SHAP|:")
    for item in global_cache[:10]:
        bar = "█" * int(item["mean_abs_shap"] * 200)
        print(f"    {item['rank']:2}. {item['feature_name']:<35} {item['mean_abs_shap']:.4f}  {bar}")

    return shap_matrix


# ---------------------------------------------------------------------------
# Step 4: Pre-score test transactions
# ---------------------------------------------------------------------------

def prescored_transactions(
    model,
    explainer: shap.TreeExplainer,
    X_test: pd.DataFrame,
    y_test: pd.Series | None,
    original_df: pd.DataFrame,
    shap_matrix: np.ndarray,
) -> None:
    """Pre-score all test transactions and save as Parquet."""
    print(f"\nPre-scoring {len(X_test):,} transactions...")

    waterfall_svc = WaterfallService(settings)
    explanation_svc = ExplanationService(settings)

    # Get model probabilities
    proba = model.predict_proba(X_test)[:, 1]
    base_value = float(explainer.expected_value)

    rows: list[dict] = []

    for i in tqdm(range(len(X_test)), desc="  Pre-scoring"):
        sv_row = shap_matrix[i].tolist()
        fv_row = X_test.iloc[i].tolist()
        feature_names = list(X_test.columns)
        output_value = float(proba[i])

        raw_result = RawSHAPResult(
            feature_names=feature_names,
            feature_values=fv_row,
            shap_values=sv_row,
            base_value=base_value,
            output_value=output_value,
        )

        # Build minimal context (no real meta available in test set)
        ctx: dict = {
            "amount": float(np.expm1(X_test.iloc[i].get("log_amount", 0))),
            "user_avg_amount": float(X_test.iloc[i].get("user_avg_amount_7d", 50)),
        }

        top_features = explanation_svc.build_top_features(raw_result, ctx, top_n=TOP_N)
        human_exp = explanation_svc.build_human_explanation(
            top_features, output_value, ctx
        )
        waterfall = waterfall_svc.build(raw_result, top_n=TOP_N)

        risk_score = round(output_value * 100, 2)
        fraud_prob = round(output_value, 6)
        classification = (
            "fraud"
            if output_value >= settings.fraud_threshold
            else "suspicious"
            if output_value >= settings.suspicious_threshold
            else "legitimate"
        )

        # Serialize complex objects as JSON strings (Parquet can't store nested dicts)
        rows.append({
            "id":              f"txn_{i:07d}",
            "amount":          ctx["amount"],
            "timestamp":       _fake_timestamp(i),
            "merchant_name":   f"Merchant_{int(X_test.iloc[i].get('mcc_description_encoded', 0)):04d}",
            "merchant_city":   "Unknown",
            "risk_score":      risk_score,
            "fraud_probability": fraud_prob,
            "classification":  classification,
            "is_fraud_actual": int(y_test.iloc[i]) if y_test is not None else -1,
            "top_features_json": json.dumps(
                [f.model_dump() for f in top_features]
            ),
            "human_explanation_json": json.dumps(
                human_exp.model_dump()
            ),
            "waterfall_json": json.dumps(waterfall.model_dump()),
        })

    out_df = pd.DataFrame(rows)
    out_path = settings.scored_transactions_path
    out_df.to_parquet(out_path, index=False)

    n_fraud = int((out_df["classification"] == "fraud").sum())
    n_suspicious = int((out_df["classification"] == "suspicious").sum())
    print(f"\n  Saved {len(out_df):,} scored transactions to {out_path}")
    print(f"  Fraud: {n_fraud:,} | Suspicious: {n_suspicious:,} | Legitimate: {len(out_df) - n_fraud - n_suspicious:,}")


def _fake_timestamp(idx: int) -> str:
    """Generate a plausible timestamp for synthetic data."""
    from datetime import timedelta
    base = datetime(2024, 1, 1, tzinfo=timezone.utc)
    delta = timedelta(minutes=idx * 3)
    return (base + delta).isoformat()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    print("=" * 60)
    print("FraudShield AI — SHAP Cache Builder")
    print("=" * 60)

    t_start = time.perf_counter()

    model, X_test, y_test, original_df = load_artifacts()
    explainer = build_explainer(model, X_test)
    shap_matrix = compute_global_importance(explainer, X_test)
    prescored_transactions(model, explainer, X_test, y_test, original_df, shap_matrix)

    elapsed = time.perf_counter() - t_start
    print(f"\n{'=' * 60}")
    print(f"SHAP cache built successfully in {elapsed:.1f}s")
    print("Start the API server:")
    print("  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
    print("=" * 60)


if __name__ == "__main__":
    main()
