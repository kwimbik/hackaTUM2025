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

def timestamp_to_year_month_tuple(t: int) -> Tuple[int, int]:
    """
    Convert timestamp (t=0 starting at 2025-01) into (year, month).
    Every t increments by 1 month.
    """
    start_year = 2025
    start_month = 1

    total_month = start_month - 1 + t

    year = start_year + (total_month // 12)
    month = (total_month % 12) + 1

    return year, month


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
#  THIS YEAR'S EVENT
# ------------------------------------------------------------

def get_this_year_event(world: Dict[str, Any]) -> Optional[str]:
    """
    Return this year's event for a single world, or None if no event.

    Rules:
      - This year's event = the last element of trajectory_events.
      - If it ends with *_not_chosen or *_not_happened, treat as: no event this year.
      - Do NOT fall back to earlier entries.
    """
    events = world.get("trajectory_events", []) or []
    if not events:
        return None

    last = events[-1]
    # if last.endswith("_not_chosen") or last.endswith("_not_happened"):
    #     return None

    return last


# ------------------------------------------------------------
#  MOST RISKY EVENT FOR A SINGLE WORLD
# ------------------------------------------------------------

def compute_most_risky_event_for_world(
    world: Dict[str, Any]
) -> Optional[Tuple[str, int, str]]:
    """
    For a single world, compute the most risky natural-language explanation
    and its severity, based on this year's event and the current state.

    Returns:
      (comment, severity, recent_event) or None if nothing meets the interesting criteria.
    """
    name: str = world.get("name", "This person")

    recent_event = get_this_year_event(world)
    if recent_event is None:
        return None

    # Current state
    children = world.get("children", 0)
    current_loan = world.get("current_loan", 0.0)
    cash = world.get("cash", 0.0)
    income = world.get("current_income", None)
    health_status = world.get("health_status", "healthy")

    has_kids = children > 0
    has_loan = current_loan > 0
    income_low = income is not None and income < 40000
    thin_buffer = income is not None and income > 0 and cash < income / 4

    candidates: List[Tuple[str, int]] = []  # (comment, severity)

    # ---- Event-specific logic ----

    # Handle child events (have_first_child, have_second_child, have_third_child, or old "kid")
    if recent_event in ("have_first_child", "have_second_child", "have_third_child", "kid"):
        base = 6
        candidates.append(
            (f"{name} had a child this month — major life change.", base)
        )
        if has_loan:
            candidates.append(
                (f"{name} had a child while still in debt — financial pressure increases.",
                 base + 2)
            )
        if income_low:
            candidates.append(
                (f"{name} had a child despite low income — budgeting will be challenging.",
                 base + 3)
            )

    elif recent_event == "layoff":
        base = 8
        candidates.append(
            (f"{name} got laid off this month — a serious negative shock.", base)
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
        if thin_buffer:
            candidates.append(
                (f"{name} was laid off with almost no cash buffer — highly risky.",
                 base + 2)
            )

    elif recent_event == "marry":
        base = 4
        partner = random_name()
        while partner == name:
            partner = random_name()
        candidates.append(
            (f"{name} got married this month to {partner}.", base)
        )
        if has_loan:
            candidates.append(
                (f"{name} married {partner} while carrying debt — careful planning needed.",
                 base + 1)
            )
        if thin_buffer:
            candidates.append(
                (f"{name} married {partner} with very low cash reserves — risky start.",
                 base + 2)
            )
        if health_status != "healthy":
            candidates.append(
                (f"{name} married {partner} despite health issues — potential strain.",
                 base + 2)
            )

    elif recent_event == "sickness":
        base = 7
        candidates.append(
            (f"{name} experienced health problems this month.", base)
        )
        if has_kids:
            candidates.append(
                (f"{name} got sick while raising children — demanding situation.",
                 base + 2)
            )

    elif recent_event == "divorce":
        base = 8
        candidates.append(
            (f"{name} went through a divorce this month — major emotional and financial shift.",
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

    elif recent_event == "promotion":
        base = 7
        candidates.append(
            (f"{name} got promoted this month — significant income boost!", base)
        )
        if has_loan:
            candidates.append(
                (f"{name} got promoted while carrying debt — can now pay down faster.",
                 base + 2)
            )
        if has_kids:
            candidates.append(
                (f"{name} got promoted while raising children — financial relief for the family.",
                 base + 1)
            )

    elif recent_event == "graduate_masters":
        base = 6
        candidates.append(
            (f"{name} graduated with a Master's degree this month — ready to enter the workforce!", base)
        )
        if thin_buffer or cash < 2000:
            candidates.append(
                (f"{name} graduated with very little savings — needs to find a job quickly.",
                 base + 2)
            )

    elif recent_event == "first_job":
        base = 8
        candidates.append(
            (f"{name} landed their first professional job this month — major career milestone!", base)
        )
        if income and income > 55000:
            candidates.append(
                (f"{name} got their first job with a great salary of {income:.0f}€ — strong start!",
                 base + 2)
            )
        elif income and income < 45000:
            candidates.append(
                (f"{name} started their career with {income:.0f}€ — modest beginning.",
                 base - 1)
            )

    elif recent_event == "interest_rate_change":
        # This affects everyone differently based on their mortgage situation
        market_rate = world.get("metadata", {}).get("market_interest_rate")
        if market_rate is not None and market_rate > 0.045:
            base = 5
            candidates.append(
                (f"Interest rates rose to {market_rate*100:.1f}% this month — mortgages becoming more expensive.", base)
            )
            if not has_loan:
                candidates.append(
                    (f"Rates jumped to {market_rate*100:.1f}% but {name} hasn't bought yet — timing matters!",
                     base + 2)
                )
        elif market_rate is not None and market_rate < 0.035:
            base = 5
            candidates.append(
                (f"Interest rates dropped to {market_rate*100:.1f}% — great time to buy!", base)
            )
            if has_loan:
                candidates.append(
                    (f"Rates fell to {market_rate*100:.1f}% but {name} already locked in — missed opportunity.",
                     base + 1)
                )

    elif recent_event == "go_on_vacation":
        base = 3
        candidates.append(
            (f"{name} went on vacation this month.", base)
        )
        if has_loan and thin_buffer:
            candidates.append(
                (f"{name} went on vacation despite debt and low savings — financially risky.",
                 base + 4)
            )

    elif recent_event == "get_loan" or recent_event.startswith("take_loan") or recent_event == "initial_loan":
        base = 7
        candidates.append(
            (f"{name} took out a loan this month — long-term obligations increased.", base)
        )
        if thin_buffer:
            candidates.append(
                (f"{name} took a loan with very low cash reserves — highly leveraged position.",
                 base + 3)
            )
        if health_status != "healthy":
            candidates.append(
                (f"{name} took a loan despite health issues — dangerous if income drops.",
                 base + 2)
            )

    if not candidates:
        return None

    candidates.sort(key=lambda x: x[1], reverse=True)
    comment, severity = candidates[0]
    return comment, severity, recent_event


# ------------------------------------------------------------
#  FLAG INTERESTING EVENTS IN ALL WORLDS
# ------------------------------------------------------------
def extract_most_risky_summary(path: str | Path) -> List[Dict[str, Any]]:
    """
    Process all worlds and return summaries for each with an 'interesting' field.
    Returns a list of all worlds with text, data, and interesting flag.
    """
    worlds = load_worlds(path)

    # ---- GET TIMESTAMP SAFELY ----
    timestamp = None
    try:
        with Path(path).open("r", encoding="utf-8-sig") as f:
            raw = json.load(f)
        if isinstance(raw, dict) and "timestamp" in raw:
            timestamp = raw["timestamp"]
    except:
        timestamp = None

    result_worlds = []

    for world in worlds:
        recent_event = get_this_year_event(world)

        # ---- CONVERT TIMESTAMP TO YEAR+MONTH ----
        if timestamp is not None:
            year, month = timestamp_to_year_month_tuple(timestamp)
        else:
            year, month = None, None

        result = compute_most_risky_event_for_world(world)

        if result is not None:
            comment, severity, recent_event = result
            world_summary = {
                "text": comment,
                "data": {
                    "branchId": world.get("id"),
                    "name": world.get("name"),
                    "current_income": world.get("current_income"),
                    "current_loan": world.get("current_loan"),
                    "family_status": world.get("family_status"),
                    "children": world.get("children"),
                    "recent_event": recent_event,
                    "year": year,
                    "month": month,
                    "severity": severity
                },
                "interesting": 1
            }
        else:
            world_summary = {
                "text": "",
                "data": {
                    "branchId": world.get("id"),
                    "name": world.get("name"),
                    "current_income": world.get("current_income"),
                    "current_loan": world.get("current_loan"),
                    "family_status": world.get("family_status"),
                    "children": world.get("children"),
                    "recent_event": recent_event,
                    "year": year,
                    "month": month,
                    "severity": 0
                },
                "interesting": 0
            }

        result_worlds.append(world_summary)

    return result_worlds


# ------------------------------------------------------------
#  CLI
# ------------------------------------------------------------

if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python interesting_event_explanation.py <STATE_JSON>")
        raise SystemExit(1)

    target = sys.argv[1]
    summary = extract_most_risky_summary(target)
    print(json.dumps(summary, indent=2))
