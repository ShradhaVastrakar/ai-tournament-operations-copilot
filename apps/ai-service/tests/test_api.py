"""
Tests for the AI service health and answer endpoints.
Run with: uv run pytest tests/ -v
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch

from app.schemas.answer import AnswerResponse

from app.main import app

client = TestClient(app)


def test_health_returns_ok():
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "ai-service"



def test_answer_rejects_empty_message():
    response = client.post("/internal/ai/answer", json={"message": ""})
    assert response.status_code == 422  # Pydantic validation error


def test_answer_accepts_conversation_id():
    cid = "test-conv-123"
    response = client.post(
        "/internal/ai/answer", json={"message": "Test", "conversation_id": cid}
    )
    assert response.status_code == 200
    assert response.json()["conversation_id"] == cid

def test_answer_returns_generated_response():
    fake_response = AnswerResponse(
        answer="The latest match result is not available in the current data.",
        conversation_id="test-conv-123",
        sources=[],
        is_placeholder=False,
    )

    with patch(
        "app.api.routes.ai.run_answer_graph",
        return_value=fake_response,
    ):
        response = client.post(
            "/internal/ai/answer",
            json={
                "message": "Who won the last match?",
                "conversation_id": "test-conv-123",
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["answer"] == fake_response.answer
    assert body["is_placeholder"] is False
    assert body["conversation_id"] == "test-conv-123"
