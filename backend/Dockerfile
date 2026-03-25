# Multi-stage build — keeps the final image lean
FROM python:3.11-slim AS base

WORKDIR /app

# System deps for torch + Pillow
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libsm6 libxext6 libxrender-dev libgl1 \
    && rm -rf /var/lib/apt/lists/*

# Install CPU-only torch first (avoids pulling the 2GB GPU build)
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Install remaining Python deps (layer-cached unless requirements change)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download CLIP ViT-B/32 weights into the image so Railway never has
# to fetch them at runtime (avoids OOM spike on cold start)
RUN python -c "import open_clip; open_clip.create_model_and_transforms('ViT-B-32', pretrained='openai')"

# Copy source
COPY . .
RUN chmod +x start.sh

EXPOSE 8000

CMD ["./start.sh"]
