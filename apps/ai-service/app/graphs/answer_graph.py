import uuid
from typing import Annotated, TypedDict

from langchain_core.messages import AIMessage, AnyMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_groq import ChatGroq
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import START, StateGraph
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition

from app.core.config import settings
from app.schemas.answer import AnswerRequest, AnswerResponse
from app.tools.tournament_tools import TOOLS

SYSTEM_PROMPT = (
    "You are an AI assistant for a tournament operations team running the Aethon Cup 2025. "
    "Be clear, accurate, and concise. "
    "Use the tools to get facts: match data, teams, venues and standings come from "
    "tools, and ANY question about rules or regulations must be answered with search_rules, "
    "never from your own knowledge. Do not invent scores, schedules, counts or rules. "
    "When you use rules excerpts, cite the source in brackets, and if sources conflict, say "
    "so and name each one. Use the conversation history to resolve follow-up questions. "
    "If the tools do not provide the information, say so instead of guessing."
)


class AnswerState(TypedDict):
    messages: Annotated[list[AnyMessage], add_messages]


def call_model(state: AnswerState) -> dict[str, list[AIMessage]]:
    """Ask the LLM what to do next: answer, or call one or more tools."""
    if not settings.groq_api_key:
        raise RuntimeError("GROQ_API_KEY is not configured. Check apps/ai-service/.env.")

    model = ChatGroq(
        model=settings.llm_model,
        api_key=settings.groq_api_key,
        temperature=0,
    ).bind_tools(TOOLS)

    response = model.invoke([SystemMessage(content=SYSTEM_PROMPT), *state["messages"]])
    return {"messages": [response]}


def build_answer_graph(checkpointer=None):
    workflow = StateGraph(AnswerState)

    workflow.add_node("model", call_model)
    workflow.add_node("tools", ToolNode(TOOLS))
    workflow.add_edge(START, "model")
    # Loop model -> tools -> model until the model answers without calling a tool.
    workflow.add_conditional_edges("model", tools_condition)
    workflow.add_edge("tools", "model")

    return workflow.compile(checkpointer=checkpointer)


# Conversation memory is keyed by conversation_id. In-memory: cleared on service restart.
answer_graph = build_answer_graph(MemorySaver())


def run_answer_graph(request: AnswerRequest) -> AnswerResponse:
    conversation_id = request.conversation_id or str(uuid.uuid4())

    result = answer_graph.invoke(
        {"messages": [HumanMessage(content=request.message)]},
        config={
            "configurable": {"thread_id": conversation_id},
            "recursion_limit": settings.agent_max_steps,
        },
    )

    messages = result["messages"]
    # Only this turn's tool results count as sources for this answer.
    last_user = max(i for i, m in enumerate(messages) if isinstance(m, HumanMessage))
    sources: list[str] = []
    for m in messages[last_user:]:
        if isinstance(m, ToolMessage) and isinstance(m.artifact, list):
            sources.extend(s for s in m.artifact if s not in sources)

    return AnswerResponse(
        answer=str(messages[-1].content),
        conversation_id=conversation_id,
        sources=sources,
        is_placeholder=False,
    )
