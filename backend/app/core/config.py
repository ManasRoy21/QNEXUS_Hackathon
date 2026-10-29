"""Application Configuration Settings."""

import os
from pathlib import Path
try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
except ImportError:
    from pydantic import BaseModel as BaseSettings, ConfigDict as SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "QDS Threat Detection"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    IMAGE_LAB_SIGNING_KEY: str | None = None
    QDS_DATABASE_PATH: str = str(Path(__file__).resolve().parents[2] / ".data" / "qds.sqlite3")
    ALLOWED_ORIGINS: str = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,https://*.vercel.app",
    )

    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env", extra="ignore")


settings = Settings()

