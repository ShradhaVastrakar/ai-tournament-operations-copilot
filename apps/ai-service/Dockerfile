# Build context: repo root  ->  docker build -f apps/ai-service/Dockerfile .

FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1

RUN pip install --no-cache-dir uv

WORKDIR /app/apps/ai-service

# Dependencies first (cached layer)
COPY apps/ai-service/pyproject.toml apps/ai-service/uv.lock ./
RUN uv sync --frozen --no-install-project

# App code + files the tools/RAG read relative to the repo root
COPY apps/ai-service ./
COPY data /app/data
COPY documents /app/documents

ENV PATH="/app/apps/ai-service/.venv/bin:${PATH}"

# Build the Chroma vector DB (and download the embedding model) at image build time,
# so the first rules question in production isn't slow.
RUN python -m app.rag.ingest

EXPOSE 8000
# Single worker: conversation memory (MemorySaver) is in-process
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
