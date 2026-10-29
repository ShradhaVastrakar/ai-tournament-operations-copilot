
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    host: str = "0.0.0.0"
    port: int = 8000

    llm_provider: str = "groq"
    llm_model: str = "llama-3.1-8b-instant"
    groq_api_key: str | None = None

    # Max graph steps per question (each model call or tool call is one step).
    agent_max_steps: int = 12

    vector_db_dir: str = "chroma_db"
    rag_top_k: int = 5
    # Cosine distance cut-off; chunks further away than this are treated as irrelevant.
    rag_max_distance: float = 0.75

    langchain_tracing_v2: bool = False
    langchain_api_key: str | None = None
    langchain_project: str | None = None


settings = Settings()
