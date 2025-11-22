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

DEFAULT_WORLD_NAMES: List[str] = [
    "Alice",
    "Bob",
    "Charlie",
    "Diana",
    "Ethan",
    "Fiona",
    "George",
    "Hannah",
    "Ian",
    "Julia",
    "Kevin",
    "Laura",
    "Michael",
    "Nina",
    "Oscar",
    "Paula",
    "Quentin",
    "Rachel",
    "Sam",
    "Tina",
    "Umar",
    "Vera",
    "Walter",
    "Xenia",
    "Yannis",
    "Zara",
    "Aaron",
    "Beatrice",
    "Caleb",
    "Delia",
    "Eli",
    "Freya",
    "Gavin",
    "Helena",
    "Iris",
    "Jonas",
    "Kara",
    "Liam",
    "Mira",
    "Noah",
    "Olivia",
    "Peter",
    "Rita",
    "Simon",
    "Tara",
    "Ulysses",
    "Valerie",
    "Wesley",
    "Xander",
    "Yara",
    "Zane",
    "Adele",
    "Boris",
    "Celine",
    "Derek",
    "Elaine",
    "Felix",
    "Greta",
    "Harvey",
    "Isabel",
    "Jasper",
    "Kelsey",
    "Leon",
    "Marina",
    "Nikolai",
    "Ophelia",
    "Paolo",
    "Queenie",
    "Rafael",
    "Sienna",
    "Theo",
    "Uma",
    "Viktor",
    "Wendy",
    "Ximena",
    "Yuri",
    "Zoey",
    "Alfred",
    "Bella",
    "Cedric",
    "Daisy",
    "Edgar",
    "Flora",
    "Gordon",
    "Hazel",
    "Ismael",
    "Joy",
    "Kai",
    "Lara",
    "Marcus",
    "Noelle",
    "Orion",
    "Penelope",
    "Quincy",
    "Roxanne",
    "Sebastian",
    "Thalia",
    "Ulrich",
    "Violet",
    "Wyatt",
    "Xavier",
    "Yasmine",
    "Zoltan",
    "Abigail",
    "Bruno",
    "Clara",
    "Damian",
    "Evelyn",
    "Frederick",
    "Georgia",
    "Hector",
    "Ingrid",
    "Jade",
    "Kurt",
    "Leona",
    "Mason",
    "Nadia",
    "Owen",
    "Phoebe",
    "Quinn",
    "Rosalind",
    "Stefan",
    "Tobias",
    "Ursula",
    "Vance",
    "Whitney",
    "Xyla",
    "Yakov",
    "Ziva",
    "Aiden",
    "Bianca",
    "Carter",
    "Dahlia",
    "Emil",
    "Farah",
    "Gideon",
    "Holly",
    "Irene",
    "Julius",
    "Keira",
    "Lorenzo",
    "Maddie",
    "Nolan",
    "Oriana",
    "Pierce",
    "Renee",
    "Silas",
    "Tessa",
    "Uliana",
    "Vera",
    "Warren",
    "Xoel",
    "Yvette",
    "Zarek",
    "Adrian",
    "Brielle",
    "Cyrus",
    "Daria",
    "Eamon",
    "Felicity",
    "Graham",
    "Helga",
    "Isaias",
    "Janelle",
    "Kian",
    "Lydia",
    "Malcolm",
    "Nora",
    "Otto",
    "Priscilla",
    "Ronan",
    "Sabrina",
    "Terrence",
    "Usha",
    "Vladimir",
    "Willa",
    "Xandra",
    "Yosef",
    "Zelda",
    "Ari",
    "Bridget",
    "Caden",
    "Delilah",
    "Emilia",
    "Floyd",
    "Gemma",
    "Huxley",
    "Imogen",
    "Jace",
    "Kira",
    "Lucian",
    "Maeve",
    "Nelson",
    "Orla",
    "Paxton",
    "Rhea",
    "Shawn",
    "Talia",
    "Umarion",
    "Vesper",
]


class NameAllocator:
    """Sequentially dispense world names."""

    def __init__(self, names: Sequence[str] | None = None) -> None:
        self._names = list(names) if names is not None else list(DEFAULT_WORLD_NAMES)
        self._counter = 0

    def next_name(self) -> str:
        if self._counter < len(self._names):
            name = self._names[self._counter]
        else:
            name = f"World_{self._counter + 1}"
        self._counter += 1
        return name


def create_initial_world(global_cfg: GlobalConfig, user_cfg: UserConfig, *, name: str) -> WorldState:
    """Initialize a world using config data."""
    initial_family = user_cfg.extras.get("family_status", "single")
    initial_children = int(user_cfg.extras.get("children", 0))
    initial_health = user_cfg.extras.get("health_status", "healthy")
    initial_career = int(user_cfg.extras.get("career_length", max(0, user_cfg.age - 18)))
    starting_cash = float(user_cfg.extras.get("starting_cash", 0.0))
    starting_stock = float(user_cfg.extras.get("starting_stock", 0.0))
    property_data = user_cfg.extras.get("property", {})
    property_type = str(property_data.get("type", "apartment"))
    property_rooms = int(property_data.get("rooms", 0))
    property_price = float(property_data.get("price", 0.0))
    return WorldState(
        name=name,
        current_income=user_cfg.income,
        current_loan=0.0,
        stock_value=starting_stock,
        cash=starting_cash,
        family_status=str(initial_family),
        children=initial_children,
        health_status=str(initial_health),
        career_length=initial_career,
        property_type=property_type,
        property_rooms=property_rooms,
        property_price=property_price,
        metadata={"global_extras": global_cfg.extras, "user_extras": user_cfg.extras},
        trajectory_events=[],
    )


def adjust_global_parameters(global_cfg: GlobalConfig, layer_index: int) -> GlobalConfig:
    """
    Adjust global parameters for the layer.

    TODO: Implement dynamic changes (e.g., interest rate shifts) based on layer.
    """
    _ = layer_index
    return global_cfg


def apply_loan_repayment(world: WorldState, global_cfg: GlobalConfig) -> WorldState:
    """
    Allow a world to repay part of its loan using available cash.

    Each layer represents a month:
    - Add monthly income to cash.
    - Spend the larger of the configured monthly rent payment or 10% of current
      cash.
    - Any portion of that payment that exceeds the remaining loan is treated as
      general expenses.
    """
    monthly_income = world.current_income / 12.0
    cash_after_income = world.cash + monthly_income
    monthly_payment = float(global_cfg.extras.get("monthly_rent_payment", 0.0))
    ten_percent_cash = cash_after_income * 0.10
    target_payment = max(monthly_payment, ten_percent_cash)
    actual_payment = min(target_payment, cash_after_income)

    if world.current_loan > 0:
        loan_payment = min(actual_payment, world.current_loan)
        new_loan = world.current_loan - loan_payment
    else:
        new_loan = world.current_loan

    new_cash = cash_after_income - actual_payment
    went_bankrupt = actual_payment > cash_after_income - 1e-9 and actual_payment < target_payment and new_loan > 0
    return world.copy_with_updates(current_loan=new_loan, cash=new_cash, bankrupt=world.bankrupt or went_bankrupt)


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
    rng: random.Random | None = None,
    name_allocator: NameAllocator | None = None,
) -> List[WorldState]:
    """
    Apply an event or choice.

    - For choices: branch into yes/no worlds.
    - For events: apply directly without branching (future logic may add reactions).
    """
    probability = float(event_probability(event, world, global_cfg, user_cfg))
    if probability <= 0.0:
        probability = 0.0
    elif probability >= 1.0:
        probability = 1.0

    if event.is_choice:
        happens_world = event.apply(world, global_cfg, user_cfg)
        not_happens_history = world.trajectory_events + [f"{event.name}_not_chosen"]
        not_happens_world = world.copy_with_updates(trajectory_events=not_happens_history)
        if probability <= 0.0:
            results = [not_happens_world]
        elif probability >= 1.0:
            results = [happens_world]
        else:
            results = [happens_world, not_happens_world]
    else:
        if probability <= 0.0:
            skipped_history = world.trajectory_events + [f"{event.name}_skipped"]
            results = [world.copy_with_updates(trajectory_events=skipped_history)]
        else:
            random_fn = rng.random if rng is not None else random.random
            if probability >= 1.0 or random_fn() < probability:
                results = [event.apply(world, global_cfg, user_cfg)]
            else:
                skipped_history = world.trajectory_events + [f"{event.name}_skipped"]
                results = [world.copy_with_updates(trajectory_events=skipped_history)]

    if len(results) > 1:
        if name_allocator is None:
            raise ValueError("name_allocator is required when branching worlds.")
        renamed = [world.copy_with_updates(name=name_allocator.next_name()) for world in results]
        return renamed
    return results


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
    name_allocator: NameAllocator | None = None,
) -> List[WorldState]:
    """Run the branching simulation for N layers and return resulting worlds."""
    random_gen = rng or random.Random()
    allocator = name_allocator or NameAllocator()
    if initial_worlds is not None:
        active_worlds = list(initial_worlds)
    else:
        active_worlds = [create_initial_world(global_cfg, user_cfg, name=allocator.next_name())]
    events, event_weights = _build_weighted(event_names, event_probabilities or {})
    choices, choice_weights = _build_weighted(choice_names, choice_probabilities or {})
    selectable = events + choices
    weights = event_weights + choice_weights

    scenario_label = scenario_name or "simulation"

    for layer_idx in range(num_layers):
        global_cfg = adjust_global_parameters(global_cfg, layer_idx)
        active_worlds = [apply_loan_repayment(world, global_cfg) for world in active_worlds]
        sampled_event = random_gen.choices(selectable, weights=weights, k=1)[0]
        next_worlds: List[WorldState] = []
        for world in active_worlds:
            next_worlds.extend(
                _branch_worlds_on_event(
                    world,
                    sampled_event,
                    global_cfg,
                    user_cfg,
                    rng=random_gen,
                    name_allocator=allocator,
                )
            )
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
    name_allocator: NameAllocator | None = None,
) -> List[WorldState]:
    """Run a scenario where a loan is taken at a specific layer."""
    random_gen = rng or random.Random()
    allocator = name_allocator or NameAllocator()
    current_worlds = [create_initial_world(global_cfg, user_cfg, name=allocator.next_name())]
    events, event_weights = _build_weighted(event_names, event_probabilities or {})
    choices, choice_weights = _build_weighted(choice_names, choice_probabilities or {})
    selectable = events + choices
    weights = event_weights + choice_weights
    scenario_label = scenario_name or "scenario"

    for layer_idx in range(num_layers):
        global_cfg = adjust_global_parameters(global_cfg, layer_idx)
        if layer_idx == take_loan_at_layer:
            current_worlds = [apply_take_loan(w, layer_idx, global_cfg, amount=loan_amount) for w in current_worlds]
        current_worlds = [apply_loan_repayment(world, global_cfg) for world in current_worlds]
        sampled_event = random_gen.choices(selectable, weights=weights, k=1)[0]
        next_worlds: List[WorldState] = []
        for world in current_worlds:
            next_worlds.extend(
                _branch_worlds_on_event(
                    world,
                    sampled_event,
                    global_cfg,
                    user_cfg,
                    rng=random_gen,
                    name_allocator=allocator,
                )
            )
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
    payload = {
        "timestamp": layer_idx,
        "worlds": summarize_worlds(worlds),
    }
    file_path = output_dir / f"{scenario_name}_layer_{layer_idx}.json"
    file_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
