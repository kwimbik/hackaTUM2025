"""Configuration models for simulation input."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict


@dataclass
class GlobalConfig:
    """Global configuration with extensible extra fields."""

    mortgage_rate: float
    interest_rate: float
    risk_factor: float
    extras: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "GlobalConfig":
        """Create an instance while stashing unknown fields in extras."""
        known = {"mortgage_rate", "interest_rate", "risk_factor"}
        extras = {k: v for k, v in data.items() if k not in known}
        return cls(
            mortgage_rate=float(data.get("mortgage_rate", 0.0)),
            interest_rate=float(data.get("interest_rate", 0.0)),
            risk_factor=float(data.get("risk_factor", 0.0)),
            extras=extras,
        )


@dataclass
class UserConfig:
    """User configuration with extensible extra fields."""

    income: float
    age: int
    education: str | None
    extras: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "UserConfig":
        """Create an instance while stashing unknown fields in extras."""
        known = {"income", "age", "education"}
        extras = {k: v for k, v in data.items() if k not in known}
        return cls(
            income=float(data.get("income", 0.0)),
            age=int(data.get("age", 0)),
            education=data.get("education"),
            extras=extras,
        )
