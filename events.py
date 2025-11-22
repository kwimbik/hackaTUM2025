"""Event and choice definitions for the branching simulation."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Dict

from config_models import GlobalConfig, UserConfig
from world_state import WorldState


HandlerFn = Callable[[WorldState, GlobalConfig, UserConfig], WorldState]


@dataclass(frozen=True)
class Event:
    """Unified interface for both events and user choices."""

    name: str
    handler: HandlerFn
    description: str = ""
    is_choice: bool = False  # True when this represents a user decision.

    def apply(self, world: WorldState, global_cfg: GlobalConfig, user_cfg: UserConfig) -> WorldState:
        """Apply the event logic to a world."""
        return self.handler(world, global_cfg, user_cfg)


def _with_history(world: WorldState, event_name: str, **updates) -> WorldState:
    """Return a new world with trajectory updated."""
    trajectory = world.trajectory_events + [event_name]
    return world.copy_with_updates(trajectory_events=trajectory, **updates)


def _nothing(world: WorldState, _: GlobalConfig, __: UserConfig) -> WorldState:
    return _with_history(world, "nothing")


def _marry(world: WorldState, _: GlobalConfig, __: UserConfig) -> WorldState:
    if world.family_status != "married":
        return _with_history(world, "marry", family_status="married")
    return _with_history(world, "marry_no_change")


def _divorce(world: WorldState, _: GlobalConfig, __: UserConfig) -> WorldState:
    if world.family_status == "married":
        return _with_history(world, "divorce", family_status="divorced")
    return _with_history(world, "divorce_no_change")


def _income_increase(world: WorldState, _: GlobalConfig, __: UserConfig) -> WorldState:
    new_income = world.current_income * 1.10
    return _with_history(world, "income_increase", current_income=new_income)


def _income_decrease(world: WorldState, _: GlobalConfig, __: UserConfig) -> WorldState:
    new_income = world.current_income * 0.90
    return _with_history(world, "income_decrease", current_income=new_income)


def _kid(world: WorldState, _: GlobalConfig, __: UserConfig) -> WorldState:
    return _with_history(world, "kid", children=world.children + 1)


def _sickness(world: WorldState, _: GlobalConfig, __: UserConfig) -> WorldState:
    new_income = world.current_income * 0.85
    return _with_history(world, "sickness", health_status="sick", current_income=new_income)


def _layoff(world: WorldState, _: GlobalConfig, __: UserConfig) -> WorldState:
    new_income = world.current_income * 0.50
    return _with_history(
        world,
        "layoff",
        current_income=new_income,
        metadata={**world.metadata, "employment": "unemployed"},
    )


def _new_job(world: WorldState, _: GlobalConfig, __: UserConfig) -> WorldState:
    new_income = world.current_income * 1.20
    return _with_history(
        world,
        "new_job",
        current_income=new_income,
        metadata={**world.metadata, "employment": "employed"},
    )


def _go_on_vacation(world: WorldState, _: GlobalConfig, __: UserConfig) -> WorldState:
    new_income = world.current_income * 0.95
    new_cash = max(0.0, world.cash - 2_000)
    new_meta = {**world.metadata, "recent_vacation": True}
    return _with_history(
        world,
        "go_on_vacation",
        current_income=new_income,
        cash=new_cash,
        metadata=new_meta,
    )


def _buy_insurance(world: WorldState, _: GlobalConfig, __: UserConfig) -> WorldState:
    new_cash = max(0.0, world.cash - 500)
    new_meta = {**world.metadata, "has_insurance": True}
    return _with_history(world, "buy_insurance", cash=new_cash, metadata=new_meta)


EVENT_REGISTRY: Dict[str, Event] = {
    "nothing": Event("nothing", _nothing, description="No change this layer.", is_choice=False),
    "marry": Event("marry", _marry, description="Get married if currently single.", is_choice=True),
    "divorce": Event("divorce", _divorce, description="Divorce if currently married.", is_choice=False),
    "income_increase": Event("income_increase", _income_increase, description="Income grows by 10%.", is_choice=False),
    "income_decrease": Event("income_decrease", _income_decrease, description="Income falls by 10%.", is_choice=False),
    "kid": Event("kid", _kid, description="Family gains a child.", is_choice=True),
    "sickness": Event("sickness", _sickness, description="Temporary health setback.", is_choice=False),
    "layoff": Event("layoff", _layoff, description="Lose job and income halves.", is_choice=False),
    "new_job": Event("new_job", _new_job, description="New job with 20% higher income.", is_choice=False),
    "go_on_vacation": Event("go_on_vacation", _go_on_vacation, description="Spend on vacation; small income dip.", is_choice=True),
    "buy_insurance": Event("buy_insurance", _buy_insurance, description="Purchase insurance coverage.", is_choice=True),
}

# Defaults used for sampling during simulation.
DEFAULT_EVENT_NAMES = tuple(
    name for name, event in EVENT_REGISTRY.items() if not event.is_choice
)
DEFAULT_CHOICE_NAMES = tuple(
    name for name, event in EVENT_REGISTRY.items() if event.is_choice
)


def event_probability(event: Event, world: WorldState, global_cfg: GlobalConfig, user_cfg: UserConfig) -> float:
    """Placeholder probability model; will be replaced with richer logic."""
    _ = (event, world, global_cfg, user_cfg)  # reserved for future use
    return 0.5
