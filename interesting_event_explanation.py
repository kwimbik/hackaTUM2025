# interesting_event_explanation.py
from __future__ import annotations

import json
import random
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


# ------------------------------------------------------------
#  NAME GENERATION (for partners etc.)
# ------------------------------------------------------------

ENGLISH_NAMES = [
    "Alice", "Bob", "Charlie", "Diana", "Ethan", "Fiona",
    "George", "Hannah", "Ivan", "Julia", "Kevin", "Laura",
    "Marco", "Nina", "Oscar", "Paula", "Quentin", "Rita",
    "Sam", "Tina", "Victor", "Wendy", "Yuki", "Zara",
]

ITALIAN_NAMES = [
    "Marco", "Giulia", "Luca", "Sofia", "Francesco", "Chiara",
    "Matteo", "Alessia", "Davide", "Martina", "Nicola", "Serena",
    "Giorgio", "Elena", "Alberto", "Claudia",
]

JAPANESE_NAMES = [
    "Taro", "Hanako", "Yuto", "Sakura", "Haruto", "Hina",
    "Ren", "Aoi", "Souta", "Yui", "Kaito", "Mio",
]

ALL_NAMES = ENGLISH_NAMES + ITALIAN_NAMES + JAPANESE_NAMES


def random_name() -> str:
    """Return a random first name from a mixed pool."""
    return random.choice(ALL_NAMES)


# ------------------------------------------------------------
#  JSON LOADING
# ------------------------------------------------------------

def load_worlds(path: str | Path) -> List[Dict[str, Any]]:
    """
    Load a simulation file that contains either:
      - {"timestamp": ..., "worlds": [ ... ]}  (new format)
      - or simply [ {world}, {world}, ... ]    (fallback / old format)

    Returns a list of world dictionaries.
    """
    path = Path(path)
    with path.open(encoding="utf-8-sig") as f:
        data = json.load(f)

    if isinstance(data, dict) and "worlds" in data:
        worlds = data["worlds"]
        if not isinstance(worlds, list):
            raise ValueError("Expected 'worlds' to be a list.")
        return worlds

    if isinstance(data, list):
        return data

    raise ValueError("Unexpected file format: expected dict with 'worlds' or list.")


# ------------------------------------------------------------
#  THIS YEAR'S EVENT (SINGLE WORLD, NO DIFF)
# ------------------------------------------------------------

def get_this_year_event(world: Dict[str, Any]) -> Optional[str]:
    """
    Return this year's event for a single world, or None if no event.

    Rules:
      - This year's event = the last element of trajectory_events.
      - If it ends with *_not_chosen or *_not_happened, treat as: no event this year.
      - We do NOT fall back to earlier entries.
    """
    events = world.get("trajectory_events", []) or []
    if not events:
        return None

    last = events[-1]
    if last.endswith("_not_chosen") or last.endswith("_not_happened") or last.endswith("_skipped"):
        return None

    return last


# ------------------------------------------------------------
#  MOST RISKY EVENT FOR A SINGLE WORLD
# ------------------------------------------------------------

def compute_most_risky_event_for_world(
    world: Dict[str, Any]
) -> Optional[Tuple[str, int]]:
    """
    For a single world, compute the single most risky (highest severity)
    comment for this year.

    Returns:
      - (comment, severity) if there is any interesting event
      - None if there is nothing to comment on
    """
    name: str = world.get("name", "This person")

    event = get_this_year_event(world)
    if event is None:
        return None

    # Current state
    children: int = world.get("children", 0) or 0
    current_loan: float = world.get("current_loan", 0.0) or 0.0
    cash: float = world.get("cash", 0.0) or 0.0
    health_status: str = world.get("health_status", "healthy") or "healthy"
    current_income = world.get("current_income", None)

    has_kids = children > 0
    has_loan = current_loan > 0

    income_is_low = (current_income is not None and current_income < 40000)
    # Very rough cash buffer: less than ~3 months of income
    has_thin_buffer = (
        current_income is not None
        and current_income > 0
        and cash < current_income / 4
    )

    candidates: List[Tuple[str, int]] = []  # (comment, severity)

    # ----------------------------
    # Event-specific logic
    # ----------------------------

    if event == "layoff":
        base = 8
        candidates.append(
            (f"{name} got laid off this year — a serious negative shock.", base)
        )

        if has_kids:
            candidates.append(
                (f"{name} got laid off while raising children — extremely stressful.",
                 base + 3)
            )
        if has_loan:
            candidates.append(
                (f"{name} lost their job while still carrying debt — repayment is at risk.",
                 base + 4)
            )
        if has_thin_buffer:
            candidates.append(
                (f"{name} was laid off with almost no cash buffer — risk of running out of funds.",
                 base + 2)
            )

    elif event == "sickness":
        base = 7
        candidates.append(
            (f"{name} experienced health problems this year.", base)
        )
        if has_kids:
            candidates.append(
                (f"{name} became sick while raising children — difficult to manage.",
                 base + 2)
            )
        if has_loan:
            candidates.append(
                (f"{name} is ill this year while carrying debt — repayment risk increases.",
                 base + 2)
            )

    elif event == "divorce":
        base = 8
        candidates.append(
            (f"{name} went through a divorce this year — major emotional and financial shift.",
             base)
        )
        if has_kids:
            candidates.append(
                (f"{name} divorced while having children — extremely heavy situation.",
                 base + 2)
            )
        if has_loan:
            candidates.append(
                (f"{name} divorced while carrying debt — financial complexity increased.",
                 base + 2)
            )

    elif event == "kid":
        base = 6
        candidates.append(
            (f"{name} had a child this year — long-term commitment increases.", base)
        )
        if has_loan:
            candidates.append(
                (f"{name} had a child while still in debt — expenses will rise further.",
                 base + 2)
            )
        if income_is_low:
            candidates.append(
                (f"{name} welcomed a child despite relatively low income — difficult budget management.",
                 base + 3)
            )

    elif event == "marry":
        base = 4
        partner = random_name()
        # Avoid using the same name for both person and partner
        while partner == name:
            partner = random_name()

        candidates.append(
            (f"{name} got married this year to {partner}.", base)
        )

        if has_loan:
            candidates.append(
                (f"{name} married {partner} this year while carrying debt — financial planning becomes important.",
                 base + 1)
            )
        if has_thin_buffer:
            candidates.append(
                (f"{name} married {partner} this year with very low cash reserves — financially risky start.",
                 base + 2)
            )
        if health_status != "healthy":
            candidates.append(
                (f"{name} married {partner} despite health issues — potential strain ahead.",
                 base + 2)
            )

    elif event == "new_job":
        base = 5
        candidates.append(
            (f"{name} started a new job this year.", base)
        )
        if has_loan and has_thin_buffer:
            candidates.append(
                (f"{name} began a new job while in debt and with little cash — unstable transition.",
                 base + 2)
            )

    elif event == "income_decrease":
        base = 6
        candidates.append(
            (f"{name}'s income decreased this year.", base)
        )
        if has_loan:
            candidates.append(
                (f"{name}'s income dropped while carrying debt — repayment burden worsens.",
                 base + 3)
            )
        if has_kids:
            candidates.append(
                (f"{name}'s household faces income decrease while raising children — tough year.",
                 base + 2)
            )

    elif event == "income_increase":
        base = 2
        candidates.append(
            (f"{name}'s income increased this year.", base)
        )
        if has_loan and has_thin_buffer:
            candidates.append(
                (f"{name} gained more income but remains fragile due to debt and low savings.",
                 base + 2)
            )

    elif event == "go_on_vacation":
        base = 3
        candidates.append(
            (f"{name} went on vacation this year.", base)
        )
        if has_loan and has_thin_buffer:
            candidates.append(
                (f"{name} went on vacation despite debt and low savings — financially risky leisure.",
                 base + 4)
            )

    elif event.startswith("take_loan"):
        base = 7
        candidates.append(
            (f"{name} took out a loan this year — long-term obligations increased.", base)
        )
        if has_thin_buffer:
            candidates.append(
                (f"{name} took a loan with thin cash reserves — highly leveraged position.",
                 base + 3)
            )
        if health_status != "healthy":
            candidates.append(
                (f"{name} took a loan despite health issues — dangerous if income drops.",
                 base + 2)
            )

    # If nothing produced a candidate, there is nothing to report for this world
    if not candidates:
        return None

    # Return this world’s most risky comment (highest severity)
    candidates.sort(key=lambda x: x[1], reverse=True)
    return candidates[0]


# ------------------------------------------------------------
#  GLOBAL MOST RISKY EVENT IN A FILE
# ------------------------------------------------------------

def describe_most_risky_event_in_file(path: str | Path) -> str:
    """
    For a given JSON file (one timestamp, multiple worlds),
    return ONLY the single most risky comment across all worlds.
    """
    worlds = load_worlds(path)

    best: Optional[Tuple[str, int]] = None

    for world in worlds:
        candidate = compute_most_risky_event_for_world(world)
        if candidate is None:
            continue
        if best is None or candidate[1] > best[1]:
            best = candidate

    if best is None:
        return f"{path}: No particularly dangerous events in this file."

    comment, severity = best
    return f"{path}:\n- {comment}"


# ------------------------------------------------------------
#  CLI
# ------------------------------------------------------------

if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python interesting_event_explanation.py <STATE_JSON>")
        raise SystemExit(1)

    target = sys.argv[1]
    print(describe_most_risky_event_in_file(target))
