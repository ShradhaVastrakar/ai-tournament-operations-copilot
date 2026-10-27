# AI Tournament Operations Copilot

An AI assistant for sports tournament operations staff. Ask it about matches, standings, venues
and the rulebook in plain English and get answers grounded in tournament data, with sources.

> **All data is fictional** (the "Aethon Cup 2025"). No real employers, APIs, or confidential
> datasets are used.

## The problem

Tournament information is spread across match records, schedules, venues, spreadsheets and rule
documents. Operations staff lose time finding facts, double-checking details and preparing
reports by hand. The Copilot puts all of it behind one chat box and one dashboard.

## What it does

- **Dashboard and Matches pages** show the fixture list, with status (scheduled, completed,
  pending result).
- **Chat assistant** answers questions such as:
  - "How many matches are pending a result?"
  - "Who is top of the standings?"
  - "What happens in a penalty shoot-out?"
- **Tool-calling agent.** Facts (counts, standings, schedules, venues, teams) come from
  deterministic tools, never from the model's memory.
- **RAG over the rulebooks.** Two PDF rulebooks and a markdown rules file are chunked, embedded
  and searched. Answers cite their source, e.g. `tournamenthandbook.pdf, p.12`. If sources
  conflict, the assistant says so.
- **Conversation memory.** Follow-up questions work ("and what about the away team?").

## Architecture

```
Browser → Next.js (3000) → Express API (4000) → FastAPI AI service (8000)
                                                    │
                                                    ├─ LangGraph agent (Groq LLM)
                                                    ├─ Data tools  → data/*.json
                                                    └─ search_rules → ChromaDB (PDF + markdown)
```

The browser never talks to the AI service directly. Express is the single entry point.
See [`docs/architecture.md`](docs/architecture.md) for details.

| Component | Stack | Purpose |
|-----------|-------|---------|
| `apps/web` | Next.js 15, React 19, TypeScript, Tailwind | Dashboard, matches, chat UI |
| `apps/api` | Node.js, Express, TypeScript | Validated REST API; proxies chat to the AI service |
| `apps/ai-service` | Python 3.12, FastAPI, LangChain, LangGraph, ChromaDB | Agent, tools, RAG |

### Agent tools

| Tool | Purpose |
|------|---------|
| `get_matches` | List matches, filtered by status, team, venue or date |
| `get_match_counts` | Exact totals per status |
| `get_teams` / `get_venues` | Reference data |
| `get_standings` | Table computed from completed matches (3 pts win, 1 draw) |
| `search_rules` | Semantic search over the rulebooks, returns text plus citations |

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 20 |
| npm | ≥ 10 |
| Python | ≥ 3.12 |
| uv | ≥ 0.4 |
| Groq API key | free at [console.groq.com](https://console.groq.com) |

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
# Set GROQ_API_KEY in apps/ai-service/.env — see "Environment Variables" below
```

## Starting services

```bash
# Terminal 1: frontend + Express API
npm run dev

# Terminal 2: AI service
cd apps/ai-service && uv run uvicorn app.main:app --reload --port 8000
```

Or individually: `npm run dev:web` (3000), `npm run dev:api` (4000).

Then open http://localhost:3000 and go to **Assistant**.

The first rules question builds the vector DB (`apps/ai-service/chroma_db/`) from the PDFs, which
takes a few seconds and downloads a small local embedding model. To rebuild it after changing the
documents:

```bash
cd apps/ai-service && uv run python -m app.rag.ingest
```

## Tests

```bash
npm run test --workspace=apps/api                  # Express API
cd apps/ai-service && uv run pytest tests/ -v      # AI service (tools, graph, memory, API)
npm run typecheck --workspace=apps/api
npm run lint --workspace=apps/web
npm run validate:data                              # sample data files
```

The AI-service tests do not call the real LLM.

## Lint & format

```bash
npm run lint       # ESLint (frontend + backend typecheck)
npm run format     # Prettier check
npm run format:fix # Prettier autofix

cd apps/ai-service && uv run ruff check .
```

## Environment variables

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
| `GROQ_API_KEY` | **Yes** | Groq API key. Without it, chat requests fail with a 502 |
| `LLM_PROVIDER` | No (groq) | LLM provider name |
| `LLM_MODEL` | No (`openai/gpt-oss-120b`) | Model name |
| `AGENT_MAX_STEPS` | No (12) | Max model and tool steps per question |
| `VECTOR_DB_DIR` | No (chroma_db) | Where the Chroma DB is stored |
| `RAG_TOP_K` | No (5) | Chunks retrieved per rules search |
| `RAG_MAX_DISTANCE` | No (0.75) | Cosine-distance cut-off; further chunks are dropped |
| `LANGCHAIN_TRACING_V2` | No | Enable LangSmith tracing |
| `HOST` / `PORT` | No | Bind address and port (0.0.0.0 / 8000) |

## Troubleshooting

**`Missing required environment variable: FRONTEND_ORIGIN`**
→ Copy `apps/api/.env.example` to `apps/api/.env` and set the values.

**Chat shows "could not generate an answer" (502)**
→ Check that `GROQ_API_KEY` is set in `apps/ai-service/.env` and that the AI service is running
on port 8000. Details are in the AI service logs.

**Rules answers are empty or irrelevant**
→ Rebuild the vector DB (`uv run python -m app.rag.ingest`). Raise `RAG_MAX_DISTANCE` if
relevant chunks are being filtered out.

**`npm run dev` shows no output**
→ Run `npm install` first (`concurrently` must be installed).

**Python import errors**
→ Run `uv sync` inside `apps/ai-service`.

## Current limitations

- Match data is read from JSON files on every request. There is no database.
- Conversation memory is in-process (`MemorySaver`) and is lost when the AI service restarts.
- No authentication or authorisation.
- The chat UI renders only `**bold**`; lists and tables in answers show as plain text.
- Answers are not yet evaluated systematically (no accuracy benchmark).
- Not deployed; runs locally only.

## Roadmap

See [Next steps](#next-steps) below. The Express-to-FastAPI link, the LangGraph agent, tool
calling and RAG are done.

## Next steps

In priority order:

1. **Add an evaluation set.** Write 20–30 questions with expected answers (counts, standings,
   rules, follow-ups, "not in the data" cases). Add a script that runs them against the agent and
   reports accuracy and citation correctness. This is the biggest step toward trusting the
   assistant.
2. **Add a demo to this README.** Screenshots or a short GIF of the dashboard and a chat with
   citations.
3. **Streaming responses and better rendering.** Stream tokens to the UI and render markdown
   (lists, tables) properly.
4. **Dockerise.** A `docker-compose.yml` for web, api and ai-service so the whole stack starts
   with one command, then deploy it (e.g. Render, Fly.io or Vercel + a container host).
5. **Operational reports.** A tool and UI to generate a daily or per-venue report (matches today,
   pending results, issues to chase), which is the second half of the original goal.
6. **Persistent storage.** Replace the JSON files with PostgreSQL, and use it for conversation
   memory (LangGraph Postgres checkpointer). Optionally move vectors to pgvector.
7. **Authentication.** Add JWT or session auth to the Express API, with roles for staff and admin.
8. **Observability.** Turn on LangSmith tracing, and log tool calls, latency and token use.
9. **Improve retrieval.** Try hybrid search (keyword + vector), re-ranking, and tuning chunk size
   against the evaluation set.
10. **Run the evaluation in CI.** CI already runs `ruff` and `pytest` for the AI service; add the
    evaluation run as a manual job.
