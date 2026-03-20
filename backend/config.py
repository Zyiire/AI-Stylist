from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Qdrant
    qdrant_url: str = "https://your-cluster.qdrant.io"
    qdrant_api_key: str = ""
    qdrant_collection: str = "fashion_products"

    # Cloudinary
    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""

    # CLIP
    clip_model: str = "ViT-B-32"
    clip_pretrained: str = "openai"
    embedding_dim: int = 512

    # Search defaults
    default_top_k: int = 24
    hnsw_ef: int = 128          # higher = better recall, slower
    score_threshold: float = 0.20

    class Config:
        env_file = "../.env"
        case_sensitive = False
        extra = "ignore"


settings = Settings()
