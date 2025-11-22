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


class IdAllocator:
    """Sequentially dispense world IDs."""

    def __init__(self, start: int = 0) -> None:
        self._counter = start

    def next_id(self) -> int:
        current = self._counter
        self._counter += 1
        return current

    def reset(self, start: int) -> None:
        """Reset the counter to a specific starting point (inclusive)."""
        self._counter = start

    def ensure_at_least(self, start: int) -> None:
        """Bump the counter forward without rewinding it."""
        if start > self._counter:
            self._counter = start


def create_initial_world(
    global_cfg: GlobalConfig,
    user_cfg: UserConfig,
    *,
    name: str,
    world_id: int,
    highlight: bool | None = None,
    rng: random.Random | None = None,
) -> WorldState:
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
    if highlight is None:
        rand = rng.random() if rng is not None else random.random()
        highlight = rand < 0.2
    return WorldState(
        id=world_id,
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
        highlight=bool(highlight),
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
    - Spend the larger of the configured monthly loan payment or 10% of current
      cash.
    - Any portion of that payment that exceeds the remaining loan is treated as
      general expenses.
    """
    monthly_income = world.current_income  # settings values are monthly
    cash_after_income = world.cash + monthly_income
    monthly_override = world.metadata.get("monthly_payment_override")
    monthly_payment = float(monthly_override) if monthly_override is not None else float(
        global_cfg.extras.get("monthly_loan_payment", 0.0)
    )
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


def apply_take_loan(
    world: WorldState,
    layer_index: int | None,
    global_cfg: GlobalConfig,
    amount: float = 200_000.0,
    monthly_payment: float | None = None,
    tag: str | None = None,
) -> WorldState:
    """Attach a loan to the world."""
    effective_amount = amount * (1 + global_cfg.mortgage_rate)
    payment_override = monthly_payment
    if payment_override is None:
        payment_override = float(global_cfg.extras.get("monthly_loan_payment", 0.0))
    new_metadata = {**world.metadata, "monthly_payment_override": payment_override}
    loan_history = list(new_metadata.get("loan_history", []))
    loan_history.append({"layer": layer_index, "base_amount": amount, "effective_amount": effective_amount, "tag": tag})
    new_metadata["loan_history"] = loan_history
    tag_label = tag or (f"take_loan_layer_{layer_index}" if layer_index is not None else "take_loan")
    new_trajectory = world.trajectory_events + [tag_label]
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
    id_allocator: IdAllocator | None = None,
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
        if not world.highlight:
            rand_fn = rng.random if rng is not None else random.random
            take_choice = probability >= 1.0 or (probability > 0 and rand_fn() < probability)
            results = [happens_world if take_choice else not_happens_world]
        else:
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
        if name_allocator is None or id_allocator is None:
            raise ValueError("name_allocator and id_allocator are required when branching worlds.")
        renamed: List[WorldState] = []
        # Preserve the original world's identity on the first branch
        primary = results[0].copy_with_updates(name=results[0].name, id=world.id)
        renamed.append(primary)
        # Assign fresh IDs/names to additional branches
        for branch_world in results[1:]:
            renamed.append(
                branch_world.copy_with_updates(
                    name=name_allocator.next_name(),
                    id=id_allocator.next_id(),
                )
            )
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
    id_allocator: IdAllocator | None = None,
) -> List[WorldState]:
    """Run the branching simulation for N layers and return resulting worlds."""
    random_gen = rng or random.Random()
    name_alloc = name_allocator or NameAllocator()
    id_alloc = id_allocator or IdAllocator()
    if initial_worlds is not None:
        active_worlds = list(initial_worlds)
        max_existing_id = max((w.id for w in active_worlds), default=-1)
        id_alloc.ensure_at_least(max_existing_id + 1)
    else:
        active_worlds = [
            create_initial_world(
                global_cfg,
                user_cfg,
                name=name_alloc.next_name(),
                world_id=id_alloc.next_id(),
                highlight=True,
                rng=random_gen,
            )
        ]
    events, event_weights = _build_weighted(event_names, event_probabilities or {})
    choices, choice_weights = _build_weighted(choice_names, choice_probabilities or {})
    selectable = events + choices
    weights = event_weights + choice_weights

    scenario_label = scenario_name or "simulation"

    for layer_idx in range(num_layers):
        global_cfg = adjust_global_parameters(global_cfg, layer_idx)
        active_worlds = [apply_loan_repayment(world, global_cfg) for world in active_worlds]
        # Small chance to toggle highlight each month.
        for idx, world in enumerate(active_worlds):
            if random_gen.random() < 0.1:
                active_worlds[idx] = world.copy_with_updates(highlight=not world.highlight)
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
                    name_allocator=name_alloc,
                    id_allocator=id_alloc,
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
    id_allocator: IdAllocator | None = None,
) -> List[WorldState]:
    """Run a scenario where a loan is taken at a specific layer."""
    random_gen = rng or random.Random()
    name_alloc = name_allocator or NameAllocator()
    id_alloc = id_allocator or IdAllocator()
    current_worlds = [
        create_initial_world(
            global_cfg,
            user_cfg,
            name=name_alloc.next_name(),
            world_id=id_alloc.next_id(),
            highlight=True,
            rng=random_gen,
        )
    ]
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
        for idx, world in enumerate(current_worlds):
            if random_gen.random() < 0.1:
                current_worlds[idx] = world.copy_with_updates(highlight=not world.highlight)
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
                    name_allocator=name_alloc,
                    id_allocator=id_alloc,
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
