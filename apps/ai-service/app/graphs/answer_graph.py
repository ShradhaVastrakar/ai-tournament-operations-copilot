import uuid

from app.schemas.answer import AnswerRequest, AnswerResponse


def run_placeholder(request: AnswerRequest) -> AnswerResponse:
    """
    Deterministic placeholder answer.
    TODO: Replace with a LangGraph workflow that:
      1. Retrieves relevant chunks from the vector store (RAG).
      2. Calls the configured LLM with retrieved context.
      3. Returns the answer with source references.
    """
    return AnswerResponse(
        answer=(
            "AI service is running in placeholder mode. "
            "Configure an LLM provider in .env to enable real answers."
        ),
        conversation_id=request.conversation_id or str(uuid.uuid4()),
        sources=[],
        is_placeholder=True,
    )
