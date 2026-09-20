"""
Udyog Samyog — AI Service Configuration
"""
import os
from pathlib import Path
from pydantic import BaseModel
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
PARENT_ENV = BASE_DIR.parent / ".env"
if PARENT_ENV.exists():
    load_dotenv(PARENT_ENV)
load_dotenv(BASE_DIR / ".env")


class Settings(BaseModel):
    service_name: str = "UdyogSamyog-AIService"
    service_version: str = "1.0.0"
    host: str = os.getenv("AI_SERVICE_HOST", "127.0.0.1")
    port: int = int(os.getenv("AI_SERVICE_PORT", "8000"))
    secret_key: str = os.getenv("AI_SERVICE_SECRET", "udyog-samyog-ai-shared-secret-key-2026")
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    data_dir: Path = BASE_DIR / "data"
    default_lang: str = "en"
    rules_version: str = "rules-2026.09.1"
    kb_version: str = "kb-2026.09.0"
    similarity_floor: float = 0.10


settings = Settings()
settings.data_dir.mkdir(parents=True, exist_ok=True)
