"""Application Configuration Settings."""

import os
try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
except ImportError:
    from pydantic import BaseModel as BaseSettings, ConfigDict as SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "QDS Threat Detection"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env", extra="ignore")


settings = Settings()

