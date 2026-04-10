import logging

from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    yandex_oauth_token: str = ""
    yandex_folder_id: str = ""
    openrouter_api_key: str = ""
    gemini_model: str = "google/gemini-3-flash-preview"
    max_file_size_bytes: int = 20 * 1024 * 1024
    yandex_max_bytes: int = 3_950_000
    iam_refresh_interval_seconds: int = 40000
    # OCR provider: "yandex" | "nemotron"
    ocr_provider: str = "yandex"
    nemotron_ocr_url: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


settings = Settings()

# Log config at startup (mask secrets)
logger.info(
    "Config loaded: folder_id=%s model=%s ocr_key_set=%s llm_key_set=%s",
    settings.yandex_folder_id or "MISSING",
    settings.gemini_model,
    bool(settings.yandex_oauth_token),
    bool(settings.openrouter_api_key),
)
