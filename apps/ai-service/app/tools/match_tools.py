
import json
from pathlib import Path
from typing import Any

# Repository root / data / matches.json
MATCHES_FILE = Path(__file__).resolve().parents[4] / "data" / "matches.json"


def get_match_summary() -> dict[str, Any]:
    """Return exact match counts grouped by status."""
    with MATCHES_FILE.open("r", encoding="utf-8") as file:
        data = json.load(file)

    matches = data["matches"]

    counts = {
        "total": len(matches),
        "scheduled": 0,
        "completed": 0,
        "pending_result": 0,
    }

    for match in matches:
        status = match.get("status")
        if status in counts and status != "total":
            counts[status] += 1

    return counts
