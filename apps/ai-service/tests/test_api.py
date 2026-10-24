"""
Tests for the AI service health and answer endpoints.
Run with: uv run pytest tests/ -v
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_returns_ok():
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "ai-service"


def test_answer_returns_placeholder():
    response = client.post("/internal/ai/answer", json={"message": "Who won the last match?"})
    assert response.status_code == 200
    body = response.json()
    assert isinstance(body["answer"], str)
    assert len(body["answer"]) > 0
    assert body["is_placeholder"] is True
    assert isinstance(body["sources"], list)
    assert isinstance(body["conversation_id"], str)


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
