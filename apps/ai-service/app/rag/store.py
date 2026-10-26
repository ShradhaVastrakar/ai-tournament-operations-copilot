"""Vector store for tournament rules: PDFs and markdown are chunked, embedded and
kept in a persistent local Chroma collection."""

import hashlib
import logging
from dataclasses import dataclass
from pathlib import Path

import chromadb
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader

from app.core.config import settings

logger = logging.getLogger(__name__)

SERVICE_ROOT = Path(__file__).resolve().parents[2]
REPO_ROOT = SERVICE_ROOT.parents[1]

PDF_DIR = SERVICE_ROOT / "app" / "pdf_files"
MARKDOWN_DIR = REPO_ROOT / "documents"
COLLECTION_NAME = "tournament_rules"

_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)


@dataclass(frozen=True)
class RetrievedChunk:
    text: str
    source: str
    page: int | None
    distance: float

    @property
    def citation(self) -> str:
        return f"{self.source}, p.{self.page}" if self.page else self.source


def _collection() -> chromadb.Collection:
    client = chromadb.PersistentClient(path=str(SERVICE_ROOT / settings.vector_db_dir))
    # Uses Chroma's default local embedding model (all-MiniLM-L6-v2, ONNX).
    return client.get_or_create_collection(
        COLLECTION_NAME, metadata={"hnsw:space": "cosine"}
    )


def _load_pages() -> list[tuple[str, int | None, str]]:
    """Return (source file name, page number or None, text) for every document."""
    pages: list[tuple[str, int | None, str]] = []

    for pdf in sorted(PDF_DIR.glob("*.pdf")):
        for number, page in enumerate(PdfReader(pdf).pages, start=1):
            text = (page.extract_text() or "").strip()
            if text:
                pages.append((pdf.name, number, text))

    for md in sorted(MARKDOWN_DIR.glob("*.md")):
        pages.append((md.name, None, md.read_text(encoding="utf-8")))

    return pages


def ingest() -> int:
    """(Re)build the collection from the source documents. Returns the chunk count."""
    ids: list[str] = []
    texts: list[str] = []
    metadatas: list[dict[str, str | int]] = []

    for source, page, text in _load_pages():
        for index, chunk in enumerate(_splitter.split_text(text)):
            digest = hashlib.sha1(f"{source}|{page}|{index}|{chunk}".encode()).hexdigest()
            ids.append(digest)
            texts.append(chunk)
            metadatas.append({"source": source, "page": page or 0})

    client = chromadb.PersistentClient(path=str(SERVICE_ROOT / settings.vector_db_dir))
    try:
        client.delete_collection(COLLECTION_NAME)
    except Exception:  # collection did not exist yet
        pass
    collection = client.create_collection(COLLECTION_NAME, metadata={"hnsw:space": "cosine"})

    batch = 100
    for start in range(0, len(ids), batch):
        end = start + batch
        collection.add(
            ids=ids[start:end], documents=texts[start:end], metadatas=metadatas[start:end]
        )

    logger.info("Ingested %d chunks into '%s'", len(ids), COLLECTION_NAME)
    return len(ids)


def retrieve(query: str, k: int | None = None) -> list[RetrievedChunk]:
    """Return the chunks most relevant to the query, ingesting first if the DB is empty."""
    collection = _collection()
    if collection.count() == 0:
        ingest()
        collection = _collection()

    result = collection.query(query_texts=[query], n_results=k or settings.rag_top_k)

    chunks: list[RetrievedChunk] = []
    for text, meta, distance in zip(
        result["documents"][0], result["metadatas"][0], result["distances"][0], strict=True
    ):
        if distance > settings.rag_max_distance:
            continue
        chunks.append(
            RetrievedChunk(
                text=text,
                source=str(meta["source"]),
                page=int(meta["page"]) or None,
                distance=distance,
            )
        )
    return chunks
