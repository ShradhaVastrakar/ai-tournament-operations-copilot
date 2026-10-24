# AI Tournament Operations Copilot

Portfolio project — fictional AI assistant for sports tournament operations staff.

> **All data is fictional.** No real employers, APIs, or confidential datasets are used.

---

## Architecture

```
Browser → Next.js (3000) → Express API (4000) → FastAPI AI service (8000)
```

See [`docs/architecture.md`](docs/architecture.md) for full details.

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 20 |
| npm | ≥ 10 |
| Python | ≥ 3.12 |
| uv | ≥ 0.4 |

Install uv: `curl -LsSf https://astral.sh/uv/install.sh | sh`

## Setup

```bash
# 1. Clone
git clone <repo-url> && cd ai-tournament-operations-copilot

# 2. Install JS dependencies (all workspaces)
npm install

# 3. Install Python dependencies
cd apps/ai-service && uv sync && cd ../..

# 4. Configure environment variables
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
cp apps/ai-service/.env.example apps/ai-service/.env
# Edit each file — see "Environment Variables" below
```

## Starting Services

### All at once (frontend + backend)
```bash
npm run dev
```

### Individually
```bash
npm run dev:web    # Next.js on port 3000
npm run dev:api    # Express on port 4000
cd apps/ai-service && uv run uvicorn app.main:app --reload --port 8000
```

## Tests

```bash
# Backend (Node.js)
npm run test --workspace=apps/api

# AI service (Python)
cd apps/ai-service && uv run pytest tests/ -v

# Type check backend
npm run typecheck --workspace=apps/api

# Lint frontend
npm run lint --workspace=apps/web

# Validate sample data files
npm run validate:data
```

## Lint & Format

```bash
npm run lint       # ESLint (frontend + backend typecheck)
npm run format     # Prettier check
npm run format:fix # Prettier autofix

# Python
cd apps/ai-service && uv run ruff check .
```

## Environment Variables

### `apps/web/.env.local`
| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:4000` | Backend API base URL |

### `apps/api/.env`
| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No (4000) | Server port |
| `FRONTEND_ORIGIN` | **Yes** | Allowed CORS origin (e.g. `http://localhost:3000`) |
| `AI_SERVICE_URL` | **Yes** | Python AI service URL (e.g. `http://localhost:8000`) |
| `BODY_LIMIT` | No (1mb) | Max request body size |

### `apps/ai-service/.env`
| Variable | Required | Description |
|----------|----------|-------------|
| `HOST` | No (0.0.0.0) | Bind address |
| `PORT` | No (8000) | Port |
| `LLM_PROVIDER` | No | LLM provider name (e.g. `openai`) |
| `LLM_MODEL` | No | Model name (e.g. `gpt-4o-mini`) |
| `OPENAI_API_KEY` | No* | Required only when LLM_PROVIDER=openai |
| `LANGCHAIN_TRACING_V2` | No | Enable LangSmith tracing |

*The service starts without LLM credentials — it returns placeholder responses.

## Troubleshooting

**`Missing required environment variable: FRONTEND_ORIGIN`**
→ Copy `apps/api/.env.example` to `apps/api/.env` and set the values.

**`npm run dev` shows no output**
→ `concurrently` requires both workspaces to be installed. Run `npm install` first.

**Python service import errors**
→ Run `uv sync` inside `apps/ai-service` to install dependencies into the virtual environment.

## Current Limitations

- The AI assistant returns a placeholder response — no LLM is connected yet.
- Match data is loaded from JSON files on every request — no database yet.
- No authentication or authorisation layer.
- No RAG pipeline — the tournament rules document exists but is not embedded.

## Next Steps (in order)

1. Wire `assistantService.ts` to forward requests to the Python AI service.
2. Implement a real LangGraph workflow with a configured LLM.
3. Add RAG: embed `documents/tournament-rules.md` into a vector store.
4. Replace JSON file reads with a PostgreSQL + pgvector database.
5. Add authentication (JWT) to the Express API.


####
The main purpose of your AI Tournament Operations Copilot is to solve a real operational problem in sports management: tournament information is spread across match records, schedules, venues, spreadsheets, and rule documents, so operations staff spend time finding information, checking details, and preparing reports manually.

You're building an AI assistant that helps them find the right information faster and prepare operational reports with less manual effort.
