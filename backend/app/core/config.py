from pathlib import Path
from pydantic_settings import BaseSettings
from functools import lru_cache

# Absolute path to backend/.env so it loads regardless of CWD
_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    # App
    SECRET_KEY: str = "change-me-in-production"
    ENCRYPTION_KEY: str = ""  # Fernet key for token-at-rest encryption; auto-generated if blank
    DATABASE_URL: str = "sqlite+aiosqlite:///C:/meta/backend/namyah.db"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    ALGORITHM: str = "HS256"

    # Meta Ads — OAuth
    META_APP_ID: str = ""
    META_APP_SECRET: str = ""
    META_REDIRECT_URI: str = "http://localhost:8000/api/meta/oauth/callback"
    META_GRAPH_VERSION: str = "v21.0"
    FRONTEND_URL: str = "http://localhost:5173"

    # Rate limiting
    TRACK_RATE_LIMIT: str = "60/minute"  # per IP

    # AI / OpenAI
    OPENAI_API_KEY: str = ""

    # Scheduler
    META_HIERARCHY_SYNC_HOURS: int = 6
    META_INSIGHTS_SYNC_HOUR: int = 3  # 3 AM daily

    model_config = {"env_file": str(_ENV_FILE), "extra": "ignore"}

    @property
    def fernet_key(self) -> bytes:
        """Return Fernet key for encrypting tokens at rest."""
        if not self.ENCRYPTION_KEY:
            raise RuntimeError(
                "ENCRYPTION_KEY is not set in .env — run: "
                "python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\" "
                "and add the result to backend/.env"
            )
        return self.ENCRYPTION_KEY.encode()

    @property
    def is_postgres(self) -> bool:
        return "postgresql" in self.DATABASE_URL


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
