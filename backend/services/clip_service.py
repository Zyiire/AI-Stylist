"""
CLIP embedding service.

Uses open_clip (ViT-B/32, OpenAI weights) to encode images into 512-dim
float32 vectors. Model is loaded once at startup and reused across requests.
"""
from __future__ import annotations

import io
import logging
from functools import lru_cache

import open_clip
import torch
from PIL import Image

from config import settings

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _load_model():
    """Load CLIP model once and cache it for the lifetime of the process."""
    logger.info("Loading CLIP model %s (%s)…", settings.clip_model, settings.clip_pretrained)
    model, _, preprocess = open_clip.create_model_and_transforms(
        settings.clip_model,
        pretrained=settings.clip_pretrained,
    )
    model.eval()
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = model.to(device)
    logger.info("CLIP model loaded on %s", device)
    return model, preprocess, device


def embed_image_bytes(image_bytes: bytes) -> list[float]:
    """
    Encode raw image bytes into a normalised 512-dim CLIP embedding.

    Args:
        image_bytes: Raw bytes of any Pillow-readable image format.

    Returns:
        List of 512 floats (L2-normalised).
    """
    model, preprocess, device = _load_model()

    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    tensor = preprocess(image).unsqueeze(0).to(device)

    with torch.no_grad():
        embedding = model.encode_image(tensor)
        # L2 normalise so cosine similarity == dot product
        embedding = embedding / embedding.norm(dim=-1, keepdim=True)

    return embedding.squeeze().cpu().tolist()


def embed_image_url(url: str) -> list[float]:
    """
    Encode an image at a remote URL into a CLIP embedding.
    """
    import httpx

    response = httpx.get(url, timeout=10)
    response.raise_for_status()
    return embed_image_bytes(response.content)


def embed_text(text: str) -> list[float]:
    """
    Encode a text query into a 512-dim CLIP embedding.
    Enables text-to-image search (e.g. 'blue floral summer dress').
    """
    model, _, device = _load_model()
    tokenizer = open_clip.get_tokenizer(settings.clip_model)
    tokens = tokenizer([text]).to(device)

    with torch.no_grad():
        embedding = model.encode_text(tokens)
        embedding = embedding / embedding.norm(dim=-1, keepdim=True)

    return embedding.squeeze().cpu().tolist()
