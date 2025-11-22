from __future__ import annotations

import copy
from dataclasses import dataclass
from typing import Callable, Dict

from config_models import GlobalConfig, UserConfig
from world_state import WorldState


HandlerFn = Callable[[WorldState, GlobalConfig, UserConfig], WorldState]


@dataclass(frozen=True)
class Event:
    """Represents a possible world transition."""

    name: str
    handler: HandlerFn
    description: str = ""
    probability_hint: float | None = None  # placeholder for future probability models

    def apply(self, world: WorldState, global_cfg: GlobalConfig, user_cfg: UserConfig) -> WorldState:
        """Apply the event logic to produce a new world."""
        return self.handler(world, global_cfg, user_cfg)


def _with_event(world: WorldState, event_name: str, **updates) -> WorldState:
    """Return an updated world with trajectory augmented."""
    new_metadata = copy.deepcopy(world.metadata)
    incoming_metadata = updates.pop("metadata", None)
    if incoming_metadata:
        new_metadata.update(incoming_metadata)
    new_metadata.setdefault("notes", [])
    note = updates.pop("note", None)
    if note:
        new_metadata["notes"].append(note)
    trajectory = world.trajectory_events + [event_name]
    return world.copy_with_updates(metadata=new_metadata, trajectory_events=trajectory, **updates)


def _nothing(world: WorldState, _: GlobalConfig, __: UserConfig) -> WorldState:
    return _with_event(world, "nothing", note="No significant change.")


def _marry(world: WorldState, _: GlobalConfig, __: UserConfig) -> WorldState:
    if world.family_status == "single":
        return _with_event(world, "marry", family_status="married", note="Transitioned to married.")
    return _with_event(world, "marry", note="No change; already not single.")


def _divorce(world: WorldState, _: GlobalConfig, __: UserConfig) -> WorldState:
    if world.family_status == "married":
        return _with_event(world, "divorce", family_status="divorced", note="Transitioned to divorced.")
    return _with_event(world, "divorce", note="No change; not married.")


def _income_increase(world: WorldState, global_cfg: GlobalConfig, __: UserConfig) -> WorldState:
    # Placeholder: modest increase influenced by risk_factor (lower risk => better outcomes).
    adjustment = 1.1 + (0.02 * max(0.0, 1.0 - global_cfg.risk_factor))
    new_income = world.current_income * adjustment
    return _with_event(
        world,
        "income_increase",
        current_income=new_income,
        note=f"Income increased by ~{(adjustment - 1)*100:.1f}%.",
    )


def _income_decrease(world: WorldState, global_cfg: GlobalConfig, __: UserConfig) -> WorldState:
    adjustment = 0.9 - (0.02 * global_cfg.risk_factor)
    adjustment = max(0.5, adjustment)  # avoid dropping unrealistically low in one step
    new_income = world.current_income * adjustment
    return _with_event(
        world,
        "income_decrease",
        current_income=new_income,
        note=f"Income decreased by ~{(1 - adjustment)*100:.1f}%.",
    )


def _kid(world: WorldState, _: GlobalConfig, __: UserConfig) -> WorldState:
    return _with_event(world, "kid", children=world.children + 1, note="Family welcomed a child.")


def _sickness(world: WorldState, _: GlobalConfig, __: UserConfig) -> WorldState:
    new_income = world.current_income * 0.9
    new_metadata = dict(world.metadata)
    new_metadata["health_note"] = "Temporary sickness; slight income dip."
    return _with_event(
        world,
        "sickness",
        current_income=new_income,
        health_status="sick",
        metadata=new_metadata,
        note="Health setback impacted income slightly.",
    )


def _layoff(world: WorldState, _: GlobalConfig, __: UserConfig) -> WorldState:
    new_income = max(0.0, world.current_income * 0.3)
    new_metadata = dict(world.metadata)
    new_metadata["employment_status"] = "laid_off"
    return _with_event(
        world,
        "layoff",
        current_income=new_income,
        metadata=new_metadata,
        note="Layoff event reduced income sharply.",
    )


def _new_job(world: WorldState, _: GlobalConfig, __: UserConfig) -> WorldState:
    new_income = world.current_income * 1.2 + 1000
    new_metadata = dict(world.metadata)
    new_metadata["employment_status"] = "employed"
    return _with_event(
        world,
        "new_job",
        current_income=new_income,
        career_length=world.career_length + 1,
        metadata=new_metadata,
        note="New job boosted income and career length.",
    )


EVENT_REGISTRY: Dict[str, Event] = {
    "nothing": Event("nothing", _nothing, description="No notable event this layer."),
    "marry": Event("marry", _marry, description="Transition to married if single."),
    "divorce": Event("divorce", _divorce, description="Transition to divorced if married."),
    "income_increase": Event("income_increase", _income_increase, description="Income grows modestly."),
    "income_decrease": Event("income_decrease", _income_decrease, description="Income shrinks modestly."),
    "kid": Event("kid", _kid, description="Increase number of children."),
    "sickness": Event("sickness", _sickness, description="Health setback and slight income reduction."),
    "layoff": Event("layoff", _layoff, description="Employment disruption lowering income."),
    "new_job": Event("new_job", _new_job, description="Secures new job with higher income."),
}

# List of default events used in simulation; easy to extend/override.
DEFAULT_EVENT_NAMES = list(EVENT_REGISTRY.keys())
