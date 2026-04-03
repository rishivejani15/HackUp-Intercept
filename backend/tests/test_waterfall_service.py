"""Tests for WaterfallService."""

from __future__ import annotations

import pytest

from app.core.config import get_settings
from app.services.waterfall_service import WaterfallService


@pytest.fixture
def waterfall_svc() -> WaterfallService:
    return WaterfallService(get_settings())


class TestWaterfallBuild:
    def test_steps_sorted_by_abs_shap_descending(
        self, waterfall_svc, mock_fraud_shap_result
    ):
        waterfall = waterfall_svc.build(mock_fraud_shap_result)
        abs_values = [abs(s.shap_value) for s in waterfall.steps]
        assert abs_values == sorted(abs_values, reverse=True)

    def test_cumulative_starts_from_base_value(
        self, waterfall_svc, mock_fraud_shap_result
    ):
        waterfall = waterfall_svc.build(mock_fraud_shap_result)
        first_step = waterfall.steps[0]
        expected = mock_fraud_shap_result.base_value + first_step.shap_value
        assert abs(first_step.cumulative - max(0, min(expected, 1))) < 1e-4

    def test_additivity_check_passes_for_well_formed_input(
        self, waterfall_svc, mock_fraud_shap_result
    ):
        waterfall = waterfall_svc.build(mock_fraud_shap_result)
        assert waterfall.additivity_check_passed is True

    def test_step_count_equals_top_n(
        self, waterfall_svc, mock_fraud_shap_result
    ):
        waterfall = waterfall_svc.build(mock_fraud_shap_result, top_n=3)
        assert len(waterfall.steps) == 3

    def test_remainder_accounts_for_un_shown_features(
        self, waterfall_svc, mock_fraud_shap_result
    ):
        import numpy as np
        waterfall = waterfall_svc.build(mock_fraud_shap_result, top_n=2)
        shown_sum = sum(s.shap_value for s in waterfall.steps)
        all_sum = float(np.sum(mock_fraud_shap_result.shap_values))
        expected_remainder = all_sum - shown_sum
        assert abs(waterfall.remainder - expected_remainder) < 1e-4

    def test_human_label_present_for_known_features(
        self, waterfall_svc, mock_fraud_shap_result
    ):
        waterfall = waterfall_svc.build(mock_fraud_shap_result)
        for step in waterfall.steps:
            assert step.human_label != ""

    def test_legit_transaction_waterfall(
        self, waterfall_svc, mock_legit_shap_result
    ):
        waterfall = waterfall_svc.build(mock_legit_shap_result)
        assert waterfall.output_value < 0.5
        assert waterfall.base_value > 0

    def test_output_value_preserved(
        self, waterfall_svc, mock_fraud_shap_result
    ):
        waterfall = waterfall_svc.build(mock_fraud_shap_result)
        assert abs(waterfall.output_value - mock_fraud_shap_result.output_value) < 1e-6
