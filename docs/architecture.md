# Architecture

> **AI Tournament Operations Copilot** — fictional portfolio project.

## Components

| Component | Stack | Port | Purpose |
|-----------|-------|------|---------|
| `apps/web` | Next.js 15, React 19, TypeScript, Tailwind | 3000 | User-facing dashboard |
| `apps/api` | Node.js, Express, TypeScript | 4000 | Backend API — proxies AI requests, serves data |
| `apps/ai-service` | Python 3.12, FastAPI, LangChain, LangGraph | 8000 | Internal AI service — RAG + LLM |

## Request Flow

```
Browser
  │  HTTPS (in production)
  ▼
Next.js Frontend (port 3000)
  │  fetch() to NEXT_PUBLIC_API_BASE_URL
  ▼
Express API (port 4000)
  │  HTTP to AI_SERVICE_URL/internal/ai/answer
  ▼
FastAPI AI Service (port 8000)
  │  LangGraph workflow
  ├─ Data tools (reads data/*.json)
  └─ RAG retrieval (future: pgvector)
```

**The browser never talks directly to the AI service.**
The Express API is the single entry point for all client requests.

## Module Boundaries

### `apps/web`
- `src/lib/api.ts` — typed fetch wrapper; base URL from env only.
- `src/app/` — Next.js App Router pages.
- `src/components/` — shared UI components.

### `apps/api`
- `src/config/env.ts` — validates required env vars at startup; throws on missing.
- `src/types/index.ts` — shared TypeScript types for requests, responses, and domain models.
- `src/services/` — business logic; reads JSON data files; will call the AI service.
- `src/routes/` — thin Express routers; delegate to controllers/services.
- `src/middleware/` — logger, error handler, 404.

### `apps/ai-service`
- `app/core/config.py` — pydantic-settings; all config from env; LLM keys are optional.
- `app/schemas/` — Pydantic request/response models.
- `app/graphs/` — LangGraph workflows (placeholder until LLM is configured).
- `app/tools/` — LangChain tools for data retrieval (future).
- `app/rag/` — RAG document pipeline (future).

## Data

All data is fictional. See `data/` for JSON fixtures and `documents/` for Markdown rules used in RAG.

## Security Notes

- The Python AI service is not exposed publicly — only the Express API calls it.
- No API keys are committed. All secrets live in `.env` files that are gitignored.
- The Express API validates query params and request bodies before passing data to services.
- Error messages are sanitized in production (stack traces not leaked to clients).

## Future Work

1. Connect Express → AI service HTTP call (replace placeholder in `assistantService.ts`).
2. Implement LangGraph workflow with a real LLM.
3. Add RAG pipeline: embed `documents/tournament-rules.md`, store in pgvector.
4. Add authentication (JWT or session) to the Express API.
5. Add PostgreSQL with pgvector for persistent storage and vector search.
