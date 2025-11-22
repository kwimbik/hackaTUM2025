from __future__ import annotations

from dataclasses import dataclass, field, replace
from typing import Any, Dict, List


@dataclass
class WorldState:
    """Represents a single world (state) in the simulation."""

    current_income: float
    current_loan: float
    family_status: str  # e.g., "single", "married", "divorced"
    children: int
    health_status: str  # e.g., "healthy", "sick"
    career_length: int  # years in career
    metadata: Dict[str, Any] = field(default_factory=dict)
    trajectory_events: List[str] = field(default_factory=list)

    def copy_with_updates(self, **kwargs: Any) -> "WorldState":
        """Return a shallow copy with provided field updates."""
        return replace(self, **kwargs)
