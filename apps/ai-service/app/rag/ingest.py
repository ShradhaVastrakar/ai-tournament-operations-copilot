"""Rebuild the vector DB: `uv run python -m app.rag.ingest`."""

from app.rag.store import ingest

if __name__ == "__main__":
    print(f"Ingested {ingest()} chunks")
