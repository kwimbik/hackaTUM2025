"""Core simulation logic for branching life trajectories."""

from __future__ import annotations

import json
import random
import sys
from dataclasses import asdict
from pathlib import Path
from typing import Iterable, List, Mapping, Sequence

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


def _build_weighted(
    names: Iterable[str],
    probabilities: Mapping[str, float],
) -> tuple[List[Event], List[float]]:
    """Return events/choices with weights pulled from probabilities mapping."""
    items: List[Event] = []
    weights: List[float] = []
    for name in names:
        if name not in EVENT_REGISTRY:
            print(f"Skipping unknown event/choice '{name}' from settings.", file=sys.stderr)
            continue
        event = EVENT_REGISTRY[name]
        items.append(event)
        weights.append(float(probabilities.get(name, 0.5)))
    return items, weights


def simulate_layers(
    global_cfg: GlobalConfig,
    user_cfg: UserConfig,
    initial_worlds: Sequence[WorldState] | None = None,
    num_layers: int = 10,
    event_names: Iterable[str] = DEFAULT_EVENT_NAMES,
    choice_names: Iterable[str] = DEFAULT_CHOICE_NAMES,
    event_probabilities: Mapping[str, float] | None = None,
    choice_probabilities: Mapping[str, float] | None = None,
    output_dir: Path | None = None,
    scenario_name: str | None = None,
    rng: random.Random | None = None,
) -> List[WorldState]:
    """Run the branching simulation for N layers and return resulting worlds."""
    random_gen = rng or random.Random()
    active_worlds: List[WorldState] = list(initial_worlds) if initial_worlds is not None else [
        create_initial_world(global_cfg, user_cfg)
    ]
    events, event_weights = _build_weighted(event_names, event_probabilities or {})
    choices, choice_weights = _build_weighted(choice_names, choice_probabilities or {})
    selectable = events + choices
    weights = event_weights + choice_weights

    scenario_label = scenario_name or "simulation"

    for layer_idx in range(num_layers):
        sampled_event = random_gen.choices(selectable, weights=weights, k=1)[0]
        next_worlds: List[WorldState] = []
        for world in active_worlds:
            next_worlds.extend(_branch_worlds_on_event(world, sampled_event, global_cfg, user_cfg))
        active_worlds = next_worlds
        if output_dir is not None:
            _write_layer_output(output_dir, scenario_label, layer_idx, active_worlds)
    return active_worlds


def run_scenario(
    global_cfg: GlobalConfig,
    user_cfg: UserConfig,
    take_loan_at_layer: int,
    num_layers: int = 10,
    event_names: Iterable[str] = DEFAULT_EVENT_NAMES,
    choice_names: Iterable[str] = DEFAULT_CHOICE_NAMES,
    event_probabilities: Mapping[str, float] | None = None,
    choice_probabilities: Mapping[str, float] | None = None,
    rng: random.Random | None = None,
    loan_amount: float = 200_000.0,
    output_dir: Path | None = None,
    scenario_name: str | None = None,
) -> List[WorldState]:
    """Run a scenario where a loan is taken at a specific layer."""
    random_gen = rng or random.Random()
    current_worlds = [create_initial_world(global_cfg, user_cfg)]
    events, event_weights = _build_weighted(event_names, event_probabilities or {})
    choices, choice_weights = _build_weighted(choice_names, choice_probabilities or {})
    selectable = events + choices
    weights = event_weights + choice_weights
    scenario_label = scenario_name or "scenario"

    for layer_idx in range(num_layers):
        if layer_idx == take_loan_at_layer:
            current_worlds = [apply_take_loan(w, layer_idx, global_cfg, amount=loan_amount) for w in current_worlds]
        sampled_event = random_gen.choices(selectable, weights=weights, k=1)[0]
        next_worlds: List[WorldState] = []
        for world in current_worlds:
            next_worlds.extend(_branch_worlds_on_event(world, sampled_event, global_cfg, user_cfg))
        current_worlds = next_worlds
        if output_dir is not None:
            _write_layer_output(output_dir, scenario_label, layer_idx, current_worlds)
    return current_worlds


def serialize_world(world: WorldState, timestamp: int | None = None) -> dict:
    """Serialize a world into JSON-friendly data."""
    data = asdict(world)
    if timestamp is not None:
        data["timestamp"] = timestamp
    return data


def summarize_worlds(worlds: List[WorldState], timestamp: int | None = None) -> list[dict]:
    """Serialize all worlds."""
    return [serialize_world(w, timestamp=timestamp) for w in worlds]


def worlds_to_json(worlds: List[WorldState]) -> str:
    """Helper for pretty-printing JSON output."""
    return json.dumps(summarize_worlds(worlds), indent=2)


def _write_layer_output(
    output_dir: Path,
    scenario_name: str,
    layer_idx: int,
    worlds: List[WorldState],
) -> None:
    """Persist layer snapshot as JSON."""
    output_dir.mkdir(parents=True, exist_ok=True)
    payload = summarize_worlds(worlds, timestamp=layer_idx)
    file_path = output_dir / f"{scenario_name}_layer_{layer_idx}.json"
    file_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
