"""LangChain tools the assistant can call. Each reads the tournament JSON files or the
rules vector DB, so the model never has to guess facts."""

import json
from typing import Any, Literal

from langchain_core.tools import tool

from app.rag import retrieve
from app.tools.match_tools import MATCHES_FILE, get_match_summary

DATA_DIR = MATCHES_FILE.parent

MatchStatus = Literal["scheduled", "completed", "pending_result"]


def _load(name: str) -> Any:
    with (DATA_DIR / name).open("r", encoding="utf-8") as file:
        return json.load(file)


def _teams() -> dict[str, dict[str, Any]]:
    return {t["id"]: t for t in _load("teams.json")["teams"]}


def _venues() -> dict[str, dict[str, Any]]:
    return {v["id"]: v for v in _load("venues.json")}


def _team_ids(query: str) -> set[str]:
    """Team ids whose id, name, city or code matches the query (case-insensitive)."""
    q = query.lower()
    return {
        team_id
        for team_id, t in _teams().items()
        if q in (team_id, t["code"].lower()) or q in t["name"].lower() or q in t["city"].lower()
    }


@tool
def get_matches(
    status: MatchStatus | None = None,
    team: str | None = None,
    venue: str | None = None,
    date: str | None = None,
) -> list[dict[str, Any]]:
    """List matches, optionally filtered. All filters are combined with AND.

    Args:
        status: scheduled (not yet played), completed (final score recorded) or
            pending_result (played, score not yet confirmed).
        team: team name, city, code or id, e.g. "Iron Wolves" or "IWF".
        venue: venue name, city or id, e.g. "Marveth".
        date: ISO date prefix of the kickoff, e.g. "2025-03-22" or "2025-03".
    """
    teams, venues = _teams(), _venues()
    wanted_teams = _team_ids(team) if team else None
    result = []

    for m in _load("matches.json")["matches"]:
        if status and m["status"] != status:
            continue
        if wanted_teams is not None and not {m["homeTeamId"], m["awayTeamId"]} & wanted_teams:
            continue
        v = venues[m["venueId"]]
        if venue and not (
            venue.lower() == m["venueId"]
            or venue.lower() in v["name"].lower()
            or venue.lower() in v["city"].lower()
        ):
            continue
        if date and not m["scheduledAt"].startswith(date):
            continue
        result.append(
            {
                "id": m["id"],
                "home": teams[m["homeTeamId"]]["name"],
                "away": teams[m["awayTeamId"]]["name"],
                "venue": v["name"],
                "kickoff_utc": m["scheduledAt"],
                "status": m["status"],
                "score": m["score"],
            }
        )
    return result


@tool
def get_match_counts() -> dict[str, int]:
    """Exact number of matches in total and per status. Use for any 'how many' question."""
    return get_match_summary()


@tool
def get_teams() -> list[dict[str, Any]]:
    """List the tournament's teams (name, city, code)."""
    return list(_teams().values())


@tool
def get_venues() -> list[dict[str, Any]]:
    """List the venues (name, city, capacity, surface)."""
    return list(_venues().values())


@tool
def get_standings() -> list[dict[str, Any]]:
    """Group-stage table from completed matches: 3 points for a win, 1 for a draw, 0 for a
    loss (Aethon Cup rules), sorted by points, goal difference, then goals scored."""
    table = {
        team_id: {"team": t["name"], "played": 0, "won": 0, "drawn": 0, "lost": 0,
                  "goals_for": 0, "goals_against": 0, "points": 0}
        for team_id, t in _teams().items()
    }
    for m in _load("matches.json")["matches"]:
        if m["status"] != "completed" or not m["score"]:
            continue
        home, away = table[m["homeTeamId"]], table[m["awayTeamId"]]
        hg, ag = m["score"]["home"], m["score"]["away"]
        for row, gf, ga in ((home, hg, ag), (away, ag, hg)):
            row["played"] += 1
            row["goals_for"] += gf
            row["goals_against"] += ga
            if gf > ga:
                row["won"] += 1
                row["points"] += 3
            elif gf == ga:
                row["drawn"] += 1
                row["points"] += 1
            else:
                row["lost"] += 1
    rows = sorted(
        table.values(),
        key=lambda r: (-r["points"], -(r["goals_for"] - r["goals_against"]), -r["goals_for"]),
    )
    for row in rows:
        row["goal_difference"] = row["goals_for"] - row["goals_against"]
    return rows


@tool(response_format="content_and_artifact")
def search_rules(query: str) -> tuple[str, list[str]]:
    """Search the tournament rules, regulations and operating procedures (rulebook PDFs and
    Aethon Cup rules). Use for ANY question about rules, scoring, discipline, eligibility,
    formats, officials, or host responsibilities. Quote results and cite the [source]."""
    chunks = retrieve(query)
    if not chunks:
        return "No relevant rules were found in the rules documents.", []
    content = "\n\n".join(f"[{c.citation}]\n{c.text}" for c in chunks)
    return content, list(dict.fromkeys(c.citation for c in chunks))


TOOLS = [
    get_matches,
    get_match_counts,
    get_teams,
    get_venues,
    get_standings,
    search_rules,
]
