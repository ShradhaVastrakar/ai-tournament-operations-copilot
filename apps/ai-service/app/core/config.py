from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    host: str = "0.0.0.0"
    port: int = 8000

    # Optional LLM config — not required for placeholder mode.
    llm_provider: str | None = None
    llm_model: str | None = None
    openai_api_key: str | None = None

    # Optional LangSmith tracing.
    langchain_tracing_v2: bool = False
    langchain_api_key: str | None = None
    langchain_project: str | None = None


settings = Settings()
