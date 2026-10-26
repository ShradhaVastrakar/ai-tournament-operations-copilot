
import uuid
from typing import Any, TypedDict

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq
from langgraph.graph import END, START, StateGraph

from app.core.config import settings
from app.rag import retrieve
from app.schemas.answer import AnswerRequest, AnswerResponse
from app.tools.match_tools import get_match_summary


class AnswerState(TypedDict, total=False):
    message: str
    answer: str
    sources: list[str]


def generate_answer(state: AnswerState) -> dict[str, Any]:
    """Generate an answer using the configured Groq model."""
    if not settings.groq_api_key:
        raise RuntimeError(
            "GROQ_API_KEY is not configured. Check apps/ai-service/.env."
        )

    message = state["message"]

    model = ChatGroq(
        model=settings.llm_model,
        api_key=settings.groq_api_key,
        temperature=0,
    )

    # Retrieve exact match counts for match-summary questions.
    normalized_message = message.lower()
    summary_phrases = [
        "match summary",
        "match counts",
        "how many matches",
        "pending results",
        "pending result",
        "match status",
    ]

    context_parts: list[str] = []

    if any(phrase in normalized_message for phrase in summary_phrases):
        summary = get_match_summary()
        context_parts.append(
            f"Actual match data from the tournament JSON file: {summary}\n"
            "Use these exact counts. Do not invent or change any numbers."
        )

    # Rules and regulations always come from the vector DB, never from model memory.
    chunks = retrieve(message)
    if chunks:
        excerpts = "\n\n".join(f"[{c.citation}]\n{c.text}" for c in chunks)
        context_parts.append(
            "Excerpts from the tournament rules documents (vector database):\n"
            f"{excerpts}\n"
            "Answer rules questions only from these excerpts and cite the source in "
            "brackets. If the excerpts conflict, say so and name each source."
        )

    if context_parts:
        context = "\n\n".join(context_parts)
    else:
        context = (
            "No tournament data or rules were retrieved for this question. "
            "Do not invent match counts, scores, schedules, or rules."
        )

    response = model.invoke(
        [
            SystemMessage(
                content=(
                    "You are an AI assistant for a tournament operations team. "
                    "Be clear, accurate, and concise. Use supplied data as the "
                    "source of truth. Never answer questions about rules or regulations "
                    "from your own knowledge; use only the supplied rules excerpts. "
                    "If the required information is unavailable, say so instead "
                    "of guessing."
                )
            ),
            HumanMessage(
                content=f"Question: {message}\n\nAvailable data:\n{context}"
            ),
        ]
    )

    sources = list(dict.fromkeys(c.citation for c in chunks))
    return {"answer": str(response.content), "sources": sources}


def build_answer_graph():
    workflow = StateGraph(AnswerState)

    workflow.add_node("generate_answer", generate_answer)
    workflow.add_edge(START, "generate_answer")
    workflow.add_edge("generate_answer", END)

    return workflow.compile()


answer_graph = build_answer_graph()


def run_answer_graph(request: AnswerRequest) -> AnswerResponse:
    result = answer_graph.invoke({"message": request.message})

    return AnswerResponse(
        answer=result["answer"],
        conversation_id=request.conversation_id or str(uuid.uuid4()),
        sources=result.get("sources", []),
        is_placeholder=False,
    )
