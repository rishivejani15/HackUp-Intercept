"""Application configuration via Pydantic Settings.

All values can be overridden through environment variables or a .env file.
No magic numbers exist anywhere else in the codebase — everything lives here.
"""

from __future__ import annotations

from pathlib import Path
from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ───────────────────────────────────────────────────────
    app_title: str = "FraudShield AI — Explainability API"
    app_version: str = "1.0.0"
    debug: bool = False
    log_level: str = "INFO"

    # ── Paths ─────────────────────────────────────────────────────────────
    model_dir: Path = Path("models")
    data_dir: Path = Path("data/processed")

    # ── CORS ──────────────────────────────────────────────────────────────
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    # ── SHAP ──────────────────────────────────────────────────────────────
    shap_top_n: int = Field(5, ge=1, le=20)
    shap_background_size: int = Field(250, ge=50, le=1000)

    # ── Classification thresholds ─────────────────────────────────────────
    fraud_threshold: float = Field(0.70, ge=0.0, le=1.0)
    suspicious_threshold: float = Field(0.40, ge=0.0, le=1.0)

    # ── API limits ────────────────────────────────────────────────────────
    batch_limit: int = Field(1000, ge=1, le=5000)
    transactions_page_size: int = Field(50, ge=1, le=500)
    transactions_cache_size: int = Field(10_000, ge=100)

    # ── Model filenames ──────────────────────────────────────────────────
    # Change these via .env when friend delivers real models — zero code change.
    xgboost_model_filename: str = "xgboost_model.pkl"
    isolation_forest_filename: str = "isolation_forest.pkl"
    shap_explainer_filename: str = "shap_explainer.pkl"
    shap_global_cache_filename: str = "shap_global_cache.json"
    scored_transactions_filename: str = "scored_transactions.parquet"
    model_stats_filename: str = "model_stats.json"

    # ── Derived paths (computed properties) ──────────────────────────────
    @property
    def xgboost_model_path(self) -> Path:
        return self.model_dir / self.xgboost_model_filename

    @property
    def shap_explainer_path(self) -> Path:
        return self.data_dir / self.shap_explainer_filename

    @property
    def shap_global_cache_path(self) -> Path:
        return self.data_dir / self.shap_global_cache_filename

    @property
    def scored_transactions_path(self) -> Path:
        return self.data_dir / self.scored_transactions_filename

    @property
    def model_stats_path(self) -> Path:
        return self.data_dir / self.model_stats_filename

    @field_validator("log_level")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        allowed = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
        upper = v.upper()
        if upper not in allowed:
            raise ValueError(f"log_level must be one of {allowed}")
        return upper


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached Settings instance. Use this everywhere."""
    return Settings()


# Module-level singleton for convenience imports
settings: Settings = get_settings()
