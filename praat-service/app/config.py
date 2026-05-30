# Pydantic settings for Praat microservice configuration
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    api_key: str = "dev-key"
    log_level: str = "info"
    service_version: str = "0.1.0"


settings = Settings()
