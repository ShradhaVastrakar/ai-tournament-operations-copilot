from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import ai, health

app = FastAPI(
    title="AI Tournament Operations Copilot — AI Service",
    description="Internal AI service. Not intended to be publicly exposed.",
    version="0.1.0",
)

# CORS is not needed in production (Node.js is the only caller).
# Enabled here for local development convenience only.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(ai.router, prefix="/internal")
