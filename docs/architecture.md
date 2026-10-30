# Architecture

> **AI Tournament Operations Copilot** — fictional portfolio project.

## Components

| Component | Stack | Port | Purpose |
|-----------|-------|------|---------|
| `apps/web` | Next.js 15, React 19, TypeScript, Tailwind | 3000 | Dashboard, matches list, chat UI |
| `apps/api` | Node.js, Express, TypeScript | 4000 | Backend API — serves data, proxies chat to the AI service |
| `apps/ai-service` | Python 3.12, FastAPI, LangChain, LangGraph, ChromaDB | 8000 | Internal AI service — tool-calling agent + RAG |

## Request Flow

```
Browser
  │  HTTPS (in production)
  ▼
Next.js Frontend (port 3000)
  │  fetch() to NEXT_PUBLIC_API_BASE_URL
  ▼
Express API (port 4000)
  │  POST AI_SERVICE_URL/internal/ai/answer
  ▼
FastAPI AI Service (port 8000)
  │  LangGraph agent (Groq LLM), memory keyed by conversation_id
  ├─ Data tools   → data/*.json (matches, counts, teams, venues, standings)
  └─ search_rules → ChromaDB (rulebook PDFs + documents/*.md)
```

**The browser never talks directly to the AI service.**
The Express API is the single entry point for all client requests.

## Agent design

The agent is a LangGraph loop: `model → tools → model`, repeated until the model answers without
calling a tool. It is capped by `AGENT_MAX_STEPS`.

- **Facts come from tools, not from the model.** Counts, schedules, teams, venues and standings
  are computed from the JSON data. The system prompt forbids inventing scores, schedules, counts
  or rules.
- **Rules questions must use `search_rules`.** It returns chunks with citations
  (`file.pdf, p.N`). Only citations from the current turn are returned as `sources`.
- **Conversation memory** uses LangGraph's `MemorySaver`, keyed by `conversation_id`. It is held
  in process memory and is lost on restart.

## RAG pipeline

1. `app/rag/store.py` reads the PDFs in `app/pdf_files/` and the markdown files in `documents/`.
2. Text is split into 1000-character chunks with 150 overlap.
3. Chunks are embedded with Chroma's default local model (all-MiniLM-L6-v2) and stored in a
   persistent cosine-distance collection (`chroma_db/`, gitignored).
4. `retrieve()` returns the top `RAG_TOP_K` chunks and drops any further than
   `RAG_MAX_DISTANCE`. The collection is built automatically on first use, or with
   `uv run python -m app.rag.ingest`.

## Module Boundaries

### `apps/web`
- `src/lib/api.ts` — typed fetch wrapper; base URL from env only.
- `src/app/` — Next.js App Router pages (`/`, `/matches`, `/assistant`).
- `src/components/` — shared UI components.

### `apps/api`
- `src/config/env.ts` — validates required env vars at startup; throws on missing.
- `src/types/index.ts` — shared TypeScript types for requests, responses, and domain models.
- `src/services/` — business logic; reads JSON data files; `assistantService` calls the AI service.
- `src/routes/` — thin Express routers; validate input, delegate to services.
- `src/middleware/` — logger, error handler, 404.

### `apps/ai-service`
- `app/core/config.py` — pydantic-settings; all config from env.
- `app/schemas/` — Pydantic request/response models.
- `app/graphs/answer_graph.py` — LangGraph agent and conversation memory.
- `app/tools/` — LangChain tools over the tournament data and the rules search.
- `app/rag/` — document loading, chunking, embedding and retrieval.

## Data

All data is fictional. See `data/` for JSON fixtures, `documents/` for the markdown rules and
`apps/ai-service/app/pdf_files/` for the rulebook PDFs used in RAG.

## Security Notes

- The Python AI service is not exposed publicly — only the Express API calls it.
- No API keys are committed. All secrets live in `.env` files that are gitignored.
- The Express API validates query params and request bodies before passing data to services.
- The AI service returns a generic error to callers; details stay in server logs.
- Error messages are sanitized in production (stack traces not leaked to clients).

## Known limitations and future work

1. Data is read from JSON files; replace with PostgreSQL.
2. Conversation memory is in-process; persist it (e.g. LangGraph Postgres checkpointer).
3. Add authentication (JWT or session) to the Express API.
4. Stream responses and render markdown in the chat UI.
5. Add an evaluation set to measure answer and citation accuracy.
6. Add operational report generation (daily or per-venue summaries).
