"""Core simulation logic for branching life trajectories."""

from __future__ import annotations

import json
import random
from dataclasses import asdict
from typing import Iterable, List, Sequence

from config_models import GlobalConfig, UserConfig
from events import (
    DEFAULT_CHOICE_NAMES,
    DEFAULT_EVENT_NAMES,
    EVENT_REGISTRY,
    Event,
    event_probability,
)
from world_state import WorldState


def create_initial_world(global_cfg: GlobalConfig, user_cfg: UserConfig) -> WorldState:
    """Initialize a world using config data."""
    initial_family = user_cfg.extras.get("family_status", "single")
    initial_children = int(user_cfg.extras.get("children", 0))
    initial_health = user_cfg.extras.get("health_status", "healthy")
    initial_career = int(user_cfg.extras.get("career_length", max(0, user_cfg.age - 18)))
    starting_cash = float(user_cfg.extras.get("starting_cash", 0.0))
    return WorldState(
        current_income=user_cfg.income,
        current_loan=0.0,
        cash=starting_cash,
        family_status=str(initial_family),
        children=initial_children,
        health_status=str(initial_health),
        career_length=initial_career,
        metadata={"global_extras": global_cfg.extras, "user_extras": user_cfg.extras},
        trajectory_events=[],
    )


def apply_take_loan(world: WorldState, layer_index: int, global_cfg: GlobalConfig, amount: float = 200_000.0) -> WorldState:
    """Attach a loan to the world at the given layer."""
    effective_amount = amount * (1 + global_cfg.mortgage_rate)
    new_metadata = {**world.metadata}
    loan_history = list(new_metadata.get("loan_history", []))
    loan_history.append({"layer": layer_index, "base_amount": amount, "effective_amount": effective_amount})
    new_metadata["loan_history"] = loan_history
    new_trajectory = world.trajectory_events + [f"take_loan_layer_{layer_index}"]
    return world.copy_with_updates(
        current_loan=world.current_loan + effective_amount,
        cash=world.cash + effective_amount,
        metadata=new_metadata,
        trajectory_events=new_trajectory,
    )


def _branch_worlds_on_event(
    world: WorldState,
    event: Event,
    global_cfg: GlobalConfig,
    user_cfg: UserConfig,
) -> List[WorldState]:
    """
    Apply an event or choice.

    - For choices: branch into yes/no worlds.
    - For events: apply directly without branching (future logic may add reactions).
    """
    _ = event_probability(event, world, global_cfg, user_cfg)  # TODO: use when probability model is added.

    if event.is_choice:
        happens_world = event.apply(world, global_cfg, user_cfg)
        not_happens_history = world.trajectory_events + [f"{event.name}_not_chosen"]
        not_happens_world = world.copy_with_updates(trajectory_events=not_happens_history)
        return [happens_world, not_happens_world]

    # Events are applied directly (no split for now).
    return [event.apply(world, global_cfg, user_cfg)]


def simulate_layers(
    global_cfg: GlobalConfig,
    user_cfg: UserConfig,
    initial_worlds: Sequence[WorldState] | None = None,
    num_layers: int = 10,
    event_names: Iterable[str] = DEFAULT_EVENT_NAMES,
    choice_names: Iterable[str] = DEFAULT_CHOICE_NAMES,
    rng: random.Random | None = None,
) -> List[WorldState]:
    """Run the branching simulation for N layers and return resulting worlds."""
    random_gen = rng or random.Random()
    active_worlds: List[WorldState] = list(initial_worlds) if initial_worlds is not None else [
        create_initial_world(global_cfg, user_cfg)
    ]
    events: List[Event] = [EVENT_REGISTRY[name] for name in event_names]
    choices: List[Event] = [EVENT_REGISTRY[name] for name in choice_names]
    selectable = events + choices

    for _layer_idx in range(num_layers):
        sampled_event = random_gen.choice(selectable)
        next_worlds: List[WorldState] = []
        for world in active_worlds:
            next_worlds.extend(_branch_worlds_on_event(world, sampled_event, global_cfg, user_cfg))
        active_worlds = next_worlds
    return active_worlds


def run_scenario(
    global_cfg: GlobalConfig,
    user_cfg: UserConfig,
    take_loan_at_layer: int,
    num_layers: int = 10,
    event_names: Iterable[str] = DEFAULT_EVENT_NAMES,
    choice_names: Iterable[str] = DEFAULT_CHOICE_NAMES,
    rng: random.Random | None = None,
    loan_amount: float = 200_000.0,
) -> List[WorldState]:
    """Run a scenario where a loan is taken at a specific layer."""
    random_gen = rng or random.Random()
    current_worlds = [create_initial_world(global_cfg, user_cfg)]
    events: List[Event] = [EVENT_REGISTRY[name] for name in event_names]
    choices: List[Event] = [EVENT_REGISTRY[name] for name in choice_names]
    selectable = events + choices

    for layer_idx in range(num_layers):
        if layer_idx == take_loan_at_layer:
            current_worlds = [apply_take_loan(w, layer_idx, global_cfg, amount=loan_amount) for w in current_worlds]
        sampled_event = random_gen.choice(selectable)
        next_worlds: List[WorldState] = []
        for world in current_worlds:
            next_worlds.extend(_branch_worlds_on_event(world, sampled_event, global_cfg, user_cfg))
        current_worlds = next_worlds
    return current_worlds


def serialize_world(world: WorldState) -> dict:
    """Serialize a world into JSON-friendly data."""
    return asdict(world)


def summarize_worlds(worlds: List[WorldState]) -> list[dict]:
    """Serialize all worlds."""
    return [serialize_world(w) for w in worlds]


def worlds_to_json(worlds: List[WorldState]) -> str:
    """Helper for pretty-printing JSON output."""
    return json.dumps(summarize_worlds(worlds), indent=2)
