
from fastapi import APIRouter, HTTPException

from app.graphs.answer_graph import run_answer_graph
from app.schemas.answer import AnswerRequest, AnswerResponse

router = APIRouter()


@router.post("/ai/answer", response_model=AnswerResponse)
def answer(request: AnswerRequest) -> AnswerResponse:
    try:
        return run_answer_graph(request)
    except Exception:
        # Avoid returning internal details or credentials to the caller.
        raise HTTPException(
            status_code=502,
            detail="The AI service could not generate an answer. Check server logs.",
        ) from None
