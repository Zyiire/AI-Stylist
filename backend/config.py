from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Qdrant
    qdrant_url: str = "https://82b99a6b-4da3-4667-8ee7-da4a29343edd.us-east4-0.gcp.cloud.qdrant.io:6333"
    qdrant_api_key: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.jVTnHsG3TKG7oyF-SlaxOo37KYo5ADfXJeRkxATHCEs"
    qdrant_collection: str = "AI-Fashion"

    # Cloudinary
    cloudinary_cloud_name: str = "dgioqlisq"
    cloudinary_api_key: str = "566422168138434"
    cloudinary_api_secret: str = "D4gVtjDJA9nZ0V5lOjAlcTcnIxQ"

    # CLIP
    clip_model: str = "ViT-B-32"
    clip_pretrained: str = "openai"
    embedding_dim: int = 512

    # CORS — comma-separated origins, or "*" for local dev
    # Production: set to your Vercel URL e.g. "https://mira.vercel.app"
    allowed_origins: str = "*"

    # Search defaults
    default_top_k: int = 24
    hnsw_ef: int = 128          # higher = better recall, slower
    score_threshold: float = 0.20

    class Config:
        env_file = "../.env"
        case_sensitive = False
        extra = "ignore"


settings = Settings()
