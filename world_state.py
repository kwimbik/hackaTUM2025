"""World state model used throughout the simulation."""

from __future__ import annotations

from dataclasses import dataclass, field, replace
from typing import Any, Dict, List


@dataclass
class WorldState:
    """Represents a single world in the branching simulation."""

    name: str
    current_income: float
    current_loan: float
    stock_value: float
    cash: float
    family_status: str
    children: int
    health_status: str
    career_length: int
    property_type: str
    property_rooms: int
    property_price: float
    bankrupt: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)
    trajectory_events: List[str] = field(default_factory=list)

    def copy_with_updates(self, **kwargs: Any) -> "WorldState":
        """Return a shallow copy with provided field updates."""
        return replace(self, **kwargs)
