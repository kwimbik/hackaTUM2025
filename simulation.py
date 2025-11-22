from __future__ import annotations

import copy
from dataclasses import asdict
from typing import Iterable, List

from config_models import GlobalConfig, UserConfig
from events import DEFAULT_EVENT_NAMES, EVENT_REGISTRY, Event
from world_state import WorldState


def create_initial_world(global_cfg: GlobalConfig, user_cfg: UserConfig) -> WorldState:
    """Initialize a world from user/global configs with sensible defaults."""
    initial_family = user_cfg.extras.get("family_status", "single")
    initial_children = int(user_cfg.extras.get("children", 0))
    career_length = int(user_cfg.extras.get("career_length", max(0, user_cfg.age - 22)))
    return WorldState(
        current_income=user_cfg.income,
        current_loan=0.0,
        family_status=initial_family,
        children=initial_children,
        health_status="healthy",
        career_length=career_length,
        metadata={
            "global_extras": global_cfg.extras,
            "user_extras": user_cfg.extras,
            "notes": ["Initial world created."],
        },
        trajectory_events=[],
    )


def apply_take_loan(world: WorldState, layer_index: int, global_cfg: GlobalConfig, amount: float = 200_000.0) -> WorldState:
    """Apply a 'take loan' action to the world."""
    # Placeholder loan accumulation using mortgage_rate; real amortization goes here later.
    effective_amount = amount * (1 + global_cfg.mortgage_rate)
    new_metadata = copy.deepcopy(world.metadata)
    new_metadata.setdefault("notes", []).append(
        f"Took loan at layer {layer_index} for base {amount}, effective {effective_amount:.2f}."
    )
    new_metadata.setdefault("loan_history", []).append(
        {"layer": layer_index, "amount": effective_amount, "base_amount": amount}
    )
    trajectory = world.trajectory_events + [f"take_loan_layer_{layer_index}"]
    return world.copy_with_updates(
        current_loan=world.current_loan + effective_amount,
        metadata=new_metadata,
        trajectory_events=trajectory,
    )


def score_world(world: WorldState) -> float:
    """Heuristic scoring for pruning; higher is better."""
    return world.current_income - 0.4 * world.current_loan - 5_000 * world.children


def prune_worlds(candidates: Iterable[WorldState], max_worlds: int) -> List[WorldState]:
    """Keep only the top-scoring worlds."""
    sorted_worlds = sorted(candidates, key=score_world, reverse=True)
    return sorted_worlds[:max_worlds]


def _advance_career(world: WorldState) -> WorldState:
    """Advance career length by one step to reflect time passing."""
    return world.copy_with_updates(career_length=world.career_length + 1)


def simulate_layers(
    initial_worlds: List[WorldState],
    global_cfg: GlobalConfig,
    user_cfg: UserConfig,
    num_layers: int = 10,
    max_worlds_per_layer: int = 2,
    event_names: Iterable[str] = DEFAULT_EVENT_NAMES,
) -> List[WorldState]:
    """Run layered simulation and return final worlds."""
    current_worlds = initial_worlds
    events: List[Event] = [EVENT_REGISTRY[name] for name in event_names]

    for layer_idx in range(num_layers):
        candidates: List[WorldState] = []
        for world in current_worlds:
            advanced = _advance_career(world)
            for event in events:
                new_world = event.apply(advanced, global_cfg, user_cfg)
                new_world.metadata["layer_last_updated"] = layer_idx
                candidates.append(new_world)
        current_worlds = prune_worlds(candidates, max_worlds_per_layer)
    return current_worlds


def run_scenario(
    global_cfg: GlobalConfig,
    user_cfg: UserConfig,
    take_loan_at_layer: int,
    num_layers: int = 10,
    max_worlds_per_layer: int = 2,
    event_names: Iterable[str] = DEFAULT_EVENT_NAMES,
) -> List[WorldState]:
    """Run a scenario where loan is taken at a specific layer."""
    current_worlds = [create_initial_world(global_cfg, user_cfg)]
    for layer_idx in range(num_layers):
        if layer_idx == take_loan_at_layer:
            current_worlds = [apply_take_loan(w, layer_idx, global_cfg) for w in current_worlds]
        current_worlds = simulate_layers(
            current_worlds,
            global_cfg,
            user_cfg,
            num_layers=1,  # simulate single layer at a time to allow loan injection
            max_worlds_per_layer=max_worlds_per_layer,
            event_names=event_names,
        )
    return current_worlds


def serialize_world(world: WorldState) -> dict:
    """Serialize world to primitive dict for JSON output."""
    data = asdict(world)
    # Ensure metadata contains only serializable primitives; deep cleaning can be added later.
    return data


def summarize_worlds(worlds: List[WorldState]) -> list[dict]:
    return [serialize_world(w) for w in worlds]
