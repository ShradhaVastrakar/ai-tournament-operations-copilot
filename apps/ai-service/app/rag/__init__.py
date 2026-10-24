# TODO: Implement RAG retrieval pipeline.
# Steps:
#   1. Load documents/tournament-rules.md (and future docs).
#   2. Chunk and embed using a chosen embeddings model.
#   3. Store in pgvector (or a local Chroma instance for dev).
#   4. Expose a retrieve(query: str) -> list[str] function for the graph to call.
