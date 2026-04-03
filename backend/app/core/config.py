import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "InterceptAI"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    
    FIREBASE_PROJECT_ID: str = os.getenv("FIREBASE_PROJECT_ID", "")
    FIREBASE_SERVICE_ACCOUNT_JSON: str = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON", "")
    FRAUD_MODEL_API_URL: str = os.getenv("FRAUD_MODEL_API_URL", "")
    FRAUD_MODEL_API_TIMEOUT_SECONDS: int = int(os.getenv("FRAUD_MODEL_API_TIMEOUT_SECONDS", "10"))
    FRAUD_MODEL_API_AUTH_HEADER: str = os.getenv("FRAUD_MODEL_API_AUTH_HEADER", "")
    FRAUD_MODEL_API_AUTH_TOKEN: str = os.getenv("FRAUD_MODEL_API_AUTH_TOKEN", "")
    HF_EXPLAIN_API_URL: str = os.getenv(
        "HF_EXPLAIN_API_URL",
        "https://samyak000-fraud-detection-model.hf.space/explain",
    )
    HF_EXPLAIN_API_TIMEOUT_SECONDS: int = int(os.getenv("HF_EXPLAIN_API_TIMEOUT_SECONDS", "30"))
    
    class Config:
        case_sensitive = True

settings = Settings()
