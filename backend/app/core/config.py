"""
Application configuration for NEXUS PULSE.
Supports environment variable loading with type safety and defaults.
"""
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Base application
    APP_NAME: str = "NEXUS PULSE"
    APP_TAGLINE: str = "Never Miss the Opportunity That Matters."
    APP_ENV: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "nexus-pulse-super-secret-key-change-in-production"

    # Regional defaults
    DEFAULT_TIMEZONE: str = "Asia/Karachi"
    DEFAULT_COUNTRY: str = "Pakistan"

    # Supabase & Database
    SUPABASE_URL: str = "https://ervfizmcgcatlwynupbt.supabase.co"
    SUPABASE_ANON_KEY: str = "sb_publishable_IJTTMi5K-ariqsakvSrYiA_LmeINzor"
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None
    JWT_SECRET: Optional[str] = None
    DATABASE_URL: str = "sqlite+aiosqlite:///./nexus_pulse.db"

    # Storage
    STORAGE_BUCKET: str = "nexus-pulse-media"
    STORAGE_FLYERS_BUCKET: str = "nexus-pulse-flyers"
    STORAGE_AVATARS_BUCKET: str = "nexus-pulse-avatars"
    LOCAL_STORAGE_DIR: str = "./media_uploads"

    # Redis & Celery
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"

    # AI Multimodal Providers (Gemini, Groq & Local AI with Auto Failover & Key Rotation)
    LLM_PROVIDER: str = "auto"
    GEMINI_API_KEYS: Optional[str] = None
    GEMINI_MODELS: Optional[str] = "gemini-2.5-flash,gemini-1.5-flash"
    GROQ_API_KEYS: Optional[str] = None
    GROQ_MODELS: Optional[str] = "openai/gpt-oss-120b,openai/gpt-oss-20b"

    # Local AI Model Runner (Ollama, LM Studio, vLLM on another machine or localhost)
    LOCAL_AI_BASE_URL: Optional[str] = None
    LOCAL_AI_MODEL: str = "llama3.2"
    LOCAL_AI_API_KEY: str = "not-needed"
    LOCAL_AI_TIMEOUT: float = 180.0

    # In-process crawler (Render has no Celery). Off until quality gates + Qwen are ready.
    ENABLE_AUTO_CRAWL: bool = False

    # Backward-compatibility defaults
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-3.8-flash"
    EMBEDDING_MODEL: str = "gemini-embedding-001"
    EMBEDDING_DIMENSION: int = 768

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,https://nexus-plus-gilt.vercel.app"

    # Rate Limiting & Crawling Limits
    CRAWLER_USER_AGENT: str = "NexusPulse-Bot/1.0 (+https://nexus-pulse.org/bot; opportunity-intelligence)"
    DEFAULT_CRAWL_DELAY_SECONDS: float = 1.0
    REQUEST_TIMEOUT_SECONDS: float = 15.0
    MAX_CONTENT_LENGTH_BYTES: int = 15 * 1024 * 1024  # 15 MB

    # Notifications
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM: str = "Nexus Pulse <alerts@nexus-pulse.org>"
    TELEGRAM_BOT_TOKEN: Optional[str] = None

    # Apify Cloud Integration (Facebook & Instagram Public Crawlers)
    APIFY_API_TOKEN: Optional[str] = None

    # Admin Control Plane Access Bypass (Allows demo UI actions without requiring Supabase JWT)
    ENABLE_ADMIN_BYPASS: bool = True

    # Meta Graph API (Official Facebook & Instagram Webhooks)
    META_APP_ID: Optional[str] = None
    META_APP_SECRET: Optional[str] = None
    META_VERIFY_TOKEN: str = "nexus_pulse_meta_verify_2026"

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def gemini_api_keys_list(self) -> List[str]:
        raw_keys = []
        if self.GEMINI_API_KEYS:
            raw_keys.extend(self.GEMINI_API_KEYS.split(","))
        if self.GEMINI_API_KEY:
            raw_keys.extend(self.GEMINI_API_KEY.split(","))

        cleaned = [k.strip() for k in raw_keys if k and len(k.strip()) > 10]
        # Prioritize authentic AI Studio keys (start with AIzaSy) and filter invalid OAuth AQ. tokens
        aiza_keys = [k for k in cleaned if k.startswith("AIzaSy")]
        other_keys = [k for k in cleaned if not k.startswith("AIzaSy") and not k.startswith("AQ.")]

        combined = aiza_keys + other_keys
        seen = set()
        deduped = []
        for k in combined:
            if k not in seen:
                seen.add(k)
                deduped.append(k)
        return deduped

    @property
    def gemini_models_list(self) -> List[str]:
        if self.GEMINI_MODELS:
            models = [m.strip() for m in self.GEMINI_MODELS.split(",") if m.strip()]
            if models:
                return models
        return [self.GEMINI_MODEL] if self.GEMINI_MODEL else ["gemini-3.8-flash"]

    @property
    def groq_api_keys_list(self) -> List[str]:
        if self.GROQ_API_KEYS:
            return [k.strip() for k in self.GROQ_API_KEYS.split(",") if k.strip()]
        return []

    @property
    def groq_models_list(self) -> List[str]:
        if self.GROQ_MODELS:
            models = [m.strip() for m in self.GROQ_MODELS.split(",") if m.strip()]
            if models:
                return models
        return ["openai/gpt-oss-120b", "openai/gpt-oss-20b"]


settings = Settings()
