
import uuid
from typing import TypedDict

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq
from langgraph.graph import END, START, StateGraph

from app.core.config import settings
from app.schemas.answer import AnswerRequest, AnswerResponse
from app.tools.match_tools import get_match_summary


class AnswerState(TypedDict, total=False):
    message: str
    answer: str


def generate_answer(state: AnswerState) -> dict[str, str]:
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

    if any(phrase in normalized_message for phrase in summary_phrases):
        summary = get_match_summary()
        context = (
            f"Actual match data from the tournament JSON file: {summary}\n"
            "Use these exact counts. Do not invent or change any numbers."
        )
    else:
        context = (
            "No tournament data was retrieved for this question. "
            "Do not invent match counts, scores, schedules, or rules."
        )

    response = model.invoke(
        [
            SystemMessage(
                content=(
                    "You are an AI assistant for a tournament operations team. "
                    "Be clear, accurate, and concise. Use supplied data as the "
                    "source of truth. If the required information is unavailable, "
                    "say so instead of guessing."
                )
            ),
            HumanMessage(
                content=f"Question: {message}\n\nAvailable data:\n{context}"
            ),
        ]
    )

    return {"answer": str(response.content)}


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
        sources=[],
        is_placeholder=False,
    )
