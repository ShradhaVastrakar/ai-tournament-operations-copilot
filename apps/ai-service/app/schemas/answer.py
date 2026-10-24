from pydantic import BaseModel, Field


class AnswerRequest(BaseModel):
    message: str = Field(..., min_length=1, description="The user's question or message.")
    conversation_id: str | None = Field(None, description="Optional conversation ID for context.")


class AnswerResponse(BaseModel):
    answer: str
    conversation_id: str
    sources: list[str]
    is_placeholder: bool
