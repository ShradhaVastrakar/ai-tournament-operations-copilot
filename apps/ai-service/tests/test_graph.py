"""Tests for the tool-calling answer graph. The LLM is scripted, so no API key is needed."""
from unittest.mock import patch

from langchain_core.messages import AIMessage, HumanMessage

from app.core.config import settings
from app.graphs import answer_graph as graph_module
from app.schemas.answer import AnswerRequest
from app.tools.tournament_tools import get_matches, get_standings, search_rules


class ScriptedModel:
    """Stands in for ChatGroq: replays canned AI messages and records what it was sent."""

    def __init__(self, replies: list[AIMessage]):
        self.replies = list(replies)
        self.seen: list[list] = []

    def bind_tools(self, _tools):
        return self

    def invoke(self, messages):
        self.seen.append(list(messages))
        return self.replies.pop(0)


def _run(model: ScriptedModel, message: str, conversation_id: str | None = None):
    with (
        patch.object(settings, "groq_api_key", "test-key"),
        patch.object(graph_module, "ChatGroq", return_value=model),
    ):
        return graph_module.run_answer_graph(
            AnswerRequest(message=message, conversation_id=conversation_id)
        )


def test_get_matches_filters_by_status_and_team():
    pending = get_matches.invoke({"status": "pending_result"})
    assert [m["id"] for m in pending] == ["m-006"]
    assert pending[0]["home"] == "Crimson Tide SC"

    wolves = get_matches.invoke({"team": "Iron Wolves"})
    assert wolves and all("Iron Wolves FC" in (m["home"], m["away"]) for m in wolves)
    assert get_matches.invoke({"team": "nobody"}) == []


def test_standings_use_three_one_zero_points():
    table = get_standings.invoke({})
    assert table == sorted(table, key=lambda r: -r["points"])
    for row in table:
        assert row["points"] == 3 * row["won"] + row["drawn"]


def test_search_rules_returns_citations_as_artifact():
    content, citations = search_rules.func("how are points awarded for a win")
    assert content and citations


def test_graph_calls_tool_then_answers():
    model = ScriptedModel(
        [
            AIMessage(
                content="",
                tool_calls=[
                    {"name": "get_matches", "args": {"status": "pending_result"}, "id": "c1"}
                ],
            ),
            AIMessage(content="Crimson Tide SC v Golden Strike FC is awaiting a result."),
        ]
    )
    response = _run(model, "Which result is pending?", "conv-tool")

    assert response.answer.startswith("Crimson Tide SC")
    # Second model call saw the tool's output, with the real data in it.
    assert "m-006" in str(model.seen[1][-1].content)


def test_rule_sources_come_from_search_rules():
    model = ScriptedModel(
        [
            AIMessage(
                content="",
                tool_calls=[
                    {"name": "search_rules", "args": {"query": "penalty shoot-out"}, "id": "c1"}
                ],
            ),
            AIMessage(content="See the manual."),
        ]
    )
    response = _run(model, "Penalty shoot-out rule?", "conv-rules")
    assert response.sources
    assert all(".pdf" in s or ".md" in s for s in response.sources)


def test_conversation_memory_is_kept_per_conversation_id():
    first = ScriptedModel([AIMessage(content="Iron Wolves lead the table.")])
    _run(first, "Who leads the table?", "conv-memory")

    second = ScriptedModel([AIMessage(content="They have 7 points.")])
    _run(second, "How many points do they have?", "conv-memory")
    history = [m.content for m in second.seen[0] if isinstance(m, (HumanMessage, AIMessage))]
    assert "Who leads the table?" in history
    assert "Iron Wolves lead the table." in history

    other = ScriptedModel([AIMessage(content="Hello.")])
    _run(other, "Hi", "conv-other")
    assert "Who leads the table?" not in [m.content for m in other.seen[0]]
