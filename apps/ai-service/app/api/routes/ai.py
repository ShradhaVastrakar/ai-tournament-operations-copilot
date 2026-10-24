from fastapi import APIRouter

from app.graphs.answer_graph import run_placeholder
from app.schemas.answer import AnswerRequest, AnswerResponse

router = APIRouter()


@router.post("/ai/answer", response_model=AnswerResponse)
def answer(request: AnswerRequest) -> AnswerResponse:
    # TODO: swap run_placeholder for a real LangGraph workflow when LLM is configured.
    return run_placeholder(request)
