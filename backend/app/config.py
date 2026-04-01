from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    yandex_oauth_token: str
    yandex_folder_id: str
    openrouter_api_key: str
    gemini_model: str = "google/gemini-3-flash-preview"
    max_file_size_bytes: int = 20 * 1024 * 1024
    yandex_max_bytes: int = 3_950_000
    iam_refresh_interval_seconds: int = 40000

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
