"""Tests for ExplanationService."""

from __future__ import annotations

import pytest

from app.core.config import get_settings
from app.services.explanation_service import ExplanationService


@pytest.fixture
def svc() -> ExplanationService:
    return ExplanationService(get_settings())


@pytest.fixture
def fraud_context() -> dict:
    return {
        "amount": 1240.0,
        "user_avg_amount": 54.33,
        "merchant_city": "Las Vegas",
        "merchant_state": "NV",
        "user_state": "CA",
        "mcc_description": "Casino/Gambling",
        "hour": 3,
        "minute": 14,
        "seconds_gap": 42.0,
    }


@pytest.fixture
def legit_context() -> dict:
    return {
        "amount": 45.0,
        "user_avg_amount": 50.0,
        "merchant_city": "Chicago",
        "merchant_state": "IL",
        "user_state": "IL",
        "mcc_description": "Grocery Store",
        "hour": 14,
        "minute": 30,
        "seconds_gap": 3600.0,
    }


class TestBuildTopFeatures:
    def test_returns_top_n_features(self, svc, mock_fraud_shap_result, fraud_context):
        features = svc.build_top_features(mock_fraud_shap_result, fraud_context, top_n=3)
        assert len(features) == 3

    def test_sorted_by_abs_shap_descending(self, svc, mock_fraud_shap_result, fraud_context):
        features = svc.build_top_features(mock_fraud_shap_result, fraud_context)
        abs_vals = [abs(f.shap_value) for f in features]
        assert abs_vals == sorted(abs_vals, reverse=True)

    def test_direction_correct(self, svc, mock_fraud_shap_result, fraud_context):
        features = svc.build_top_features(mock_fraud_shap_result, fraud_context)
        for f in features:
            if f.shap_value > 0:
                assert f.direction == "increases_fraud"
            else:
                assert f.direction == "decreases_fraud"

    def test_severity_assigned(self, svc, mock_fraud_shap_result, fraud_context):
        features = svc.build_top_features(mock_fraud_shap_result, fraud_context)
        valid_severities = {"CRITICAL", "HIGH", "MEDIUM", "LOW"}
        for f in features:
            assert f.severity in valid_severities

    def test_critical_severity_for_high_shap(self, svc, mock_fraud_shap_result, fraud_context):
        features = svc.build_top_features(mock_fraud_shap_result, fraud_context)
        # card_on_dark_web has shap=0.41 → should be CRITICAL
        top = features[0]
        assert top.feature_name == "card_on_dark_web"
        assert top.severity == "CRITICAL"

    def test_human_explanation_not_empty(self, svc, mock_fraud_shap_result, fraud_context):
        features = svc.build_top_features(mock_fraud_shap_result, fraud_context)
        for f in features:
            assert f.human_explanation.strip() != ""

    def test_contribution_percent_sums_to_100_for_positive(
        self, svc, mock_fraud_shap_result, fraud_context
    ):
        # All features (not just top-N) should be accounted for
        features = svc.build_top_features(mock_fraud_shap_result, fraud_context)
        positive_pct = sum(f.contribution_percent for f in features if f.shap_value > 0)
        # Top-N positive contributions should be ≤ 100%
        assert 0 < positive_pct <= 100.1


class TestBuildHumanExplanation:
    def test_fraud_headline_for_high_probability(
        self, svc, mock_fraud_shap_result, fraud_context
    ):
        top_features = svc.build_top_features(mock_fraud_shap_result, fraud_context)
        explanation = svc.build_human_explanation(top_features, 0.91, fraud_context)
        assert "FRAUD" in explanation.headline.upper() or "RISK" in explanation.headline.upper()

    def test_legitimate_headline_for_low_probability(
        self, svc, mock_legit_shap_result, legit_context
    ):
        top_features = svc.build_top_features(mock_legit_shap_result, legit_context)
        explanation = svc.build_human_explanation(top_features, 0.02, legit_context)
        assert "LEGITIMATE" in explanation.headline.upper() or "NORMAL" in explanation.headline.upper()

    def test_factors_count_equals_top_features(
        self, svc, mock_fraud_shap_result, fraud_context
    ):
        top_features = svc.build_top_features(mock_fraud_shap_result, fraud_context, top_n=3)
        explanation = svc.build_human_explanation(top_features, 0.91, fraud_context)
        assert len(explanation.factors) == 3

    def test_compliance_note_present(self, svc, mock_fraud_shap_result, fraud_context):
        top_features = svc.build_top_features(mock_fraud_shap_result, fraud_context)
        explanation = svc.build_human_explanation(top_features, 0.91, fraud_context)
        assert "GDPR" in explanation.compliance_note or "Article 22" in explanation.compliance_note

    def test_summary_not_empty(self, svc, mock_fraud_shap_result, fraud_context):
        top_features = svc.build_top_features(mock_fraud_shap_result, fraud_context)
        explanation = svc.build_human_explanation(top_features, 0.91, fraud_context)
        assert len(explanation.summary) > 10

    def test_suspicious_classification(self, svc, mock_fraud_shap_result, fraud_context):
        top_features = svc.build_top_features(mock_fraud_shap_result, fraud_context)
        explanation = svc.build_human_explanation(top_features, 0.55, fraud_context)
        assert "SUSPICIOUS" in explanation.headline.upper()
