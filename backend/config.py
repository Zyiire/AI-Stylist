from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Qdrant — set via env vars / .env (never hardcode credentials here)
    qdrant_url: str = ""
    qdrant_api_key: str = ""
    qdrant_collection: str = "Mira"

    # Cloudinary — set via env vars / .env
    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""

    # CLIP
    clip_model: str = "ViT-B-32"
    clip_pretrained: str = "openai"
    embedding_dim: int = 512

    # CORS — comma-separated origins, or "*" for local dev
    # Production: set to your Vercel URL e.g. "https://mira.vercel.app"
    allowed_origins: str = "https://mira-4.vercel.app"

    # Search defaults
    default_top_k: int = 24
    hnsw_ef: int = 128          # higher = better recall, slower
    score_threshold: float = 0.20

    class Config:
        env_file = "../.env"
        case_sensitive = False
        extra = "ignore"


settings = Settings()
