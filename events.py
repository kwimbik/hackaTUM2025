"""Event and choice definitions for the branching simulation."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Dict
import random

from config_models import GlobalConfig, UserConfig
from world_state import WorldState


HandlerFn = Callable[[WorldState, GlobalConfig, UserConfig], WorldState]


def _clamp_probability(value: float) -> float:
    """Keep probability values in the [0, 1] range."""
    return max(0.0, min(1.0, float(value)))


def _age_at_layer(user_cfg: UserConfig, layer_idx: int | None) -> float:
    """Approximate age in years, assuming one layer equals one month."""
    months = layer_idx if layer_idx is not None else 0
    return float(user_cfg.age) + months / 12.0


def _months_since(world: WorldState, event_name: str, layer_idx: int | None) -> int | None:
    """Return months since an event last happened for this world."""
    if layer_idx is None:
        return None
    history = world.metadata.get("event_history", {})
    last_layer = history.get(event_name)
    if last_layer is None:
        return None
    return int(layer_idx - int(last_layer))


def _latest_child_layer(world: WorldState, layer_idx: int | None) -> int | None:
    """Find the most recent child-related event layer."""
    child_events = ("kid", "have_first_child", "have_second_child", "have_third_child")
    layers = []
    for evt in child_events:
        months = _months_since(world, evt, layer_idx)
        if months is not None and layer_idx is not None:
            layers.append(layer_idx - months)
    if not layers:
        return None
    return max(layers)


def _is_event_feasible(event_name: str, world: WorldState, layer_idx: int | None) -> bool:
    """Return True when an event can sensibly happen in the given world."""
    if world.health_status == "deceased" or world.metadata.get("world_status") == "terminated":
        return False
    if event_name == "death":
        return world.health_status != "deceased"
    if event_name == "marry":
        return world.family_status != "married"
    if event_name == "divorce":
        return world.family_status == "married"
    if event_name == "have_first_child":
        return world.children == 0
    if event_name == "have_second_child":
        return world.children >= 1 and world.children < 2
    if event_name == "have_third_child":
        return world.children >= 2 and world.children < 3
    if event_name == "kid":
        return world.children < 4  # soft upper bound to keep families reasonable
    if event_name in ("stock_market_increase", "stock_market_crash"):
        return world.stock_value > 0
    if event_name in ("make_extra_payment", "increase_payment_rate", "decrease_payment_rate"):
        return world.current_loan > 0
    if event_name == "get_loan":
        return world.property_price <= 0
    if event_name == "go_on_vacation":
        months_since_vacation = _months_since(world, "go_on_vacation", layer_idx)
        return months_since_vacation is None or months_since_vacation >= 12
    if event_name == "buy_disability_insurance":
        return not world.metadata.get("has_disability_insurance", False)
    if event_name == "buy_insurance":
        return not world.metadata.get("has_insurance", False)
    if event_name == "buy_second_car":
        return not world.metadata.get("second_car", False)
    if event_name == "renovate_house":
        return world.property_price > 0 and not world.metadata.get("renovated_house", False)
    return True


BASE_EVENT_PROBABILITIES: Dict[str, float] = {
    "marry": 0.12,
    "divorce": 0.05,
    "have_first_child": 0.12,
    "have_second_child": 0.10,
    "have_third_child": 0.06,
    "kid": 0.08,
    "go_on_vacation": 0.20,
    "get_loan": 0.10,
    "invest_in_stock": 0.18,
    "make_extra_payment": 0.10,
    "increase_payment_rate": 0.08,
    "decrease_payment_rate": 0.05,
    "buy_disability_insurance": 0.10,
    "buy_insurance": 0.08,
    "buy_second_car": 0.05,
    "renovate_house": 0.05,
    "sickness": 0.06,
    "disability": 0.02,
    "death": 0.005,
}


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


def _invest_in_stock(world: WorldState, _: GlobalConfig, __: UserConfig) -> WorldState:
    if world.cash <= 0:
        return _with_history(world, "invest_in_stock_no_cash")
    investment = world.cash * 0.2
    new_cash = world.cash - investment
    new_stock = world.stock_value + investment
    new_meta = {**world.metadata, "invested_in_stock": True}
    return _with_history(
        world,
        "invest_in_stock",
        cash=new_cash,
        stock_value=new_stock,
        metadata=new_meta,
    )


def _unexpected_expense(world: WorldState, _: GlobalConfig, __: UserConfig) -> WorldState:
    reduction = world.cash * 0.2
    new_cash = max(0.0, world.cash - reduction)
    new_meta = {**world.metadata, "unexpected_expense": reduction}
    return _with_history(world, "unexpected_expense", cash=new_cash, metadata=new_meta)


def _natural_disaster(world: WorldState, _: GlobalConfig, __: UserConfig) -> WorldState:
    new_cash = max(0.0, world.cash * 0.7)
    new_income = world.current_income * 0.9
    new_meta = {**world.metadata, "natural_disaster": True}
    return _with_history(
        world,
        "natural_disaster",
        cash=new_cash,
        current_income=new_income,
        metadata=new_meta,
    )


def _death(world: WorldState, _: GlobalConfig, __: UserConfig) -> WorldState:
    new_meta = {**world.metadata, "world_status": "terminated"}
    return _with_history(
        world,
        "death",
        current_income=0.0,
        health_status="deceased",
        metadata=new_meta,
    )


def _stock_market_increase(world: WorldState, _: GlobalConfig, __: UserConfig) -> WorldState:
    if world.stock_value <= 0:
        return _with_history(world, "stock_market_increase_no_position")
    gain = world.stock_value * 0.15
    new_stock = world.stock_value + gain
    return _with_history(world, "stock_market_increase", stock_value=new_stock)


def _stock_market_crash(world: WorldState, _: GlobalConfig, __: UserConfig) -> WorldState:
    if world.stock_value <= 0:
        return _with_history(world, "stock_market_crash_no_position")
    loss = world.stock_value * 0.3
    new_stock = max(0.0, world.stock_value - loss)
    return _with_history(world, "stock_market_crash", stock_value=new_stock)


def _get_loan(world: WorldState, global_cfg: GlobalConfig, _: UserConfig) -> WorldState:
    if world.property_price > 0:
        return _with_history(world, "get_loan_skipped_has_property")
    # TODO: derive affordable property based on income, savings, and risk profile.
    placeholder_price = 400_000.0
    effective_amount = placeholder_price * (1 + global_cfg.mortgage_rate)
    monthly_payment = float(global_cfg.extras.get("monthly_loan_payment", 0.0))
    new_metadata = {**world.metadata, "monthly_payment_override": monthly_payment}
    loan_history = list(new_metadata.get("loan_history", []))
    loan_history.append(
        {"event": "get_loan", "base_amount": placeholder_price, "effective_amount": effective_amount, "tag": "get_loan"}
    )
    new_metadata["loan_history"] = loan_history
    return _with_history(
        world,
        "get_loan",
        current_loan=world.current_loan + effective_amount,
        cash=world.cash + effective_amount,
        metadata=new_metadata,
        property_type="house",
        property_rooms=3,
        property_price=placeholder_price,
    )


def _promotion(world: WorldState, _: GlobalConfig, __: UserConfig) -> WorldState:
    bump = world.current_income * random.uniform(0.10, 0.20)
    return _with_history(world, "promotion", current_income=world.current_income + bump)


def _bonus(world: WorldState, _: GlobalConfig, __: UserConfig) -> WorldState:
    bonus_cash = world.current_income
    return _with_history(world, "bonus", cash=world.cash + bonus_cash)


def _disability(world: WorldState, _: GlobalConfig, __: UserConfig) -> WorldState:
    new_income = world.current_income * 0.5
    return _with_history(world, "disability", health_status="disabled", current_income=new_income)


def _inheritance(world: WorldState, _: GlobalConfig, __: UserConfig) -> WorldState:
    windfall = 100_000.0
    return _with_history(world, "inheritance", cash=world.cash + windfall)


def _house_damage_minor(world: WorldState, _: GlobalConfig, __: UserConfig) -> WorldState:
    cost = 10_000.0
    new_cash = max(0.0, world.cash - cost)
    new_meta = {**world.metadata, "house_damage_minor": cost}
    return _with_history(world, "house_damage_minor", cash=new_cash, metadata=new_meta)


def _house_damage_major(world: WorldState, _: GlobalConfig, __: UserConfig) -> WorldState:
    cost = 35_000.0
    new_cash = max(0.0, world.cash - cost)
    new_meta = {**world.metadata, "house_damage_major": cost}
    return _with_history(world, "house_damage_major", cash=new_cash, metadata=new_meta)


def _car_breakdown(world: WorldState, _: GlobalConfig, __: UserConfig) -> WorldState:
    cost = 3_000.0
    new_cash = max(0.0, world.cash - cost)
    new_meta = {**world.metadata, "car_breakdown": cost}
    return _with_history(world, "car_breakdown", cash=new_cash, metadata=new_meta)


def _have_first_child(world: WorldState, _: GlobalConfig, __: UserConfig) -> WorldState:
    if world.children >= 1:
        return _with_history(world, "have_first_child_skipped")
    return _with_history(world, "have_first_child", children=world.children + 1)


def _have_second_child(world: WorldState, _: GlobalConfig, __: UserConfig) -> WorldState:
    if world.children >= 2:
        return _with_history(world, "have_second_child_skipped")
    return _with_history(world, "have_second_child", children=world.children + 1)


def _have_third_child(world: WorldState, _: GlobalConfig, __: UserConfig) -> WorldState:
    if world.children >= 3:
        return _with_history(world, "have_third_child_skipped")
    return _with_history(world, "have_third_child", children=world.children + 1)


def _make_extra_payment(world: WorldState, global_cfg: GlobalConfig, __: UserConfig) -> WorldState:
    payment = 5_000.0
    new_cash = max(0.0, world.cash - payment)
    new_loan = max(0.0, world.current_loan - payment)
    new_meta = {**world.metadata, "extra_payment": payment}
    return _with_history(world, "make_extra_payment", cash=new_cash, current_loan=new_loan, metadata=new_meta)


def _increase_payment_rate(world: WorldState, global_cfg: GlobalConfig, __: UserConfig) -> WorldState:
    base_payment = float(global_cfg.extras.get("monthly_loan_payment", 0.0))
    current_override = float(world.metadata.get("monthly_payment_override", base_payment))
    new_override = max(base_payment, current_override * 1.25) if current_override > 0 else base_payment * 1.5
    new_meta = {**world.metadata, "monthly_payment_override": new_override}
    return _with_history(world, "increase_payment_rate", metadata=new_meta)


def _decrease_payment_rate(world: WorldState, global_cfg: GlobalConfig, __: UserConfig) -> WorldState:
    base_payment = float(global_cfg.extras.get("monthly_loan_payment", 0.0))
    current_override = float(world.metadata.get("monthly_payment_override", base_payment))
    new_override = max(0.0, current_override * 0.5)
    new_meta = {**world.metadata, "monthly_payment_override": new_override}
    return _with_history(world, "decrease_payment_rate", metadata=new_meta)


def _buy_disability_insurance(world: WorldState, _: GlobalConfig, __: UserConfig) -> WorldState:
    cost = 500.0
    new_cash = max(0.0, world.cash - cost)
    new_meta = {**world.metadata, "has_disability_insurance": True}
    return _with_history(world, "buy_disability_insurance", cash=new_cash, metadata=new_meta)


def _buy_second_car(world: WorldState, _: GlobalConfig, __: UserConfig) -> WorldState:
    cost = 15_000.0
    new_cash = max(0.0, world.cash - cost)
    new_meta = {**world.metadata, "second_car": True}
    return _with_history(world, "buy_second_car", cash=new_cash, metadata=new_meta)


def _renovate_house(world: WorldState, _: GlobalConfig, __: UserConfig) -> WorldState:
    cost = 30_000.0
    new_cash = max(0.0, world.cash - cost)
    new_meta = {**world.metadata, "renovated_house": True}
    return _with_history(world, "renovate_house", cash=new_cash, metadata=new_meta)


def _change_career(world: WorldState, _: GlobalConfig, __: UserConfig) -> WorldState:
    new_income = world.current_income * 0.9
    new_meta = {**world.metadata, "career_change": True}
    return _with_history(world, "change_career", current_income=new_income, metadata=new_meta)


EVENT_REGISTRY: Dict[str, Event] = {
    "nothing": Event("nothing", _nothing, description="No change this layer.", is_choice=False),
    "marry": Event("marry", _marry, description="Get married if currently single.", is_choice=True),
    "divorce": Event("divorce", _divorce, description="Divorce if currently married.", is_choice=False),
    "income_increase": Event("income_increase", _income_increase, description="Income grows by 10%.", is_choice=False),
    "promotion": Event("promotion", _promotion, description="Promotion with 10-20% salary jump.", is_choice=False),
    "bonus": Event("bonus", _bonus, description="Year-end bonus received.", is_choice=False),
    "income_decrease": Event("income_decrease", _income_decrease, description="Income falls by 10%.", is_choice=False),
    "kid": Event("kid", _kid, description="Family gains a child.", is_choice=True),
    "have_first_child": Event("have_first_child", _have_first_child, description="Have first child.", is_choice=True),
    "have_second_child": Event("have_second_child", _have_second_child, description="Have second child.", is_choice=True),
    "have_third_child": Event("have_third_child", _have_third_child, description="Have third child.", is_choice=True),
    "sickness": Event("sickness", _sickness, description="Temporary health setback.", is_choice=False),
    "disability": Event("disability", _disability, description="Occupational disability.", is_choice=False),
    "layoff": Event("layoff", _layoff, description="Lose job and income halves.", is_choice=False),
    "new_job": Event("new_job", _new_job, description="New job with 20% higher income.", is_choice=False),
    "go_on_vacation": Event("go_on_vacation", _go_on_vacation, description="Spend on vacation; small income dip.", is_choice=True),
    "buy_insurance": Event("buy_insurance", _buy_insurance, description="Purchase insurance coverage.", is_choice=True),
    "buy_disability_insurance": Event("buy_disability_insurance", _buy_disability_insurance, description="Purchase occupational disability insurance.", is_choice=True),
    "invest_in_stock": Event("invest_in_stock", _invest_in_stock, description="Allocate cash into stock holdings.", is_choice=True),
    "unexpected_expense": Event("unexpected_expense", _unexpected_expense, description="Sudden 20% cash expense.", is_choice=False),
    "natural_disaster": Event("natural_disaster", _natural_disaster, description="Disaster impacts finances and income.", is_choice=False),
    "death": Event("death", _death, description="Terminal life event removing income.", is_choice=False),
    "stock_market_increase": Event("stock_market_increase", _stock_market_increase, description="Portfolio gains 15%.", is_choice=False),
    "stock_market_crash": Event("stock_market_crash", _stock_market_crash, description="Portfolio loses 30%.", is_choice=False),
    "get_loan": Event("get_loan", _get_loan, description="Take a mortgage to buy a property.", is_choice=False),
    "inheritance": Event("inheritance", _inheritance, description="Inheritance windfall.", is_choice=False),
    "house_damage_minor": Event("house_damage_minor", _house_damage_minor, description="Water damage/repair 5k-15k.", is_choice=False),
    "house_damage_major": Event("house_damage_major", _house_damage_major, description="Major damage 20k-50k.", is_choice=False),
    "car_breakdown": Event("car_breakdown", _car_breakdown, description="Car repair 1k-5k.", is_choice=False),
    "make_extra_payment": Event("make_extra_payment", _make_extra_payment, description="Make extra mortgage payment.", is_choice=True),
    "increase_payment_rate": Event("increase_payment_rate", _increase_payment_rate, description="Increase repayment rate.", is_choice=True),
    "decrease_payment_rate": Event("decrease_payment_rate", _decrease_payment_rate, description="Decrease repayment rate.", is_choice=True),
    "buy_second_car": Event("buy_second_car", _buy_second_car, description="Buy second car.", is_choice=True),
    "renovate_house": Event("renovate_house", _renovate_house, description="Major renovation.", is_choice=True),
    "change_career": Event("change_career", _change_career, description="Career change.", is_choice=True),
}

# Defaults used for sampling during simulation.
DEFAULT_EVENT_NAMES = tuple(
    name for name, event in EVENT_REGISTRY.items() if not event.is_choice
)
DEFAULT_CHOICE_NAMES = tuple(
    name for name, event in EVENT_REGISTRY.items() if event.is_choice
)


def event_probability(
    event: Event,
    world: WorldState,
    global_cfg: GlobalConfig,
    user_cfg: UserConfig,
    layer_idx: int | None = None,
) -> float:
    """
    Probability model that blends feasibility checks with simple life heuristics.

    The return value reflects both whether the event can happen and how likely it
    is given the world's current situation. This is intentionally lightweight and
    state-based rather than purely random.
    """
    if not _is_event_feasible(event.name, world, layer_idx):
        return 0.0

    age = _age_at_layer(user_cfg, layer_idx)
    base = BASE_EVENT_PROBABILITIES.get(event.name, 0.3)

    # Life-stage adjustments
    if event.name == "marry":
        if world.family_status == "single":
            base = 0.25 if 24 <= age <= 38 else 0.08
        elif world.family_status == "divorced":
            base = 0.12 if age < 55 else 0.03
    elif event.name == "divorce":
        base = 0.08 if world.family_status == "married" else 0.0
    elif event.name == "have_first_child":
        base = 0.20 if 24 <= age <= 38 else 0.05
        last_child = _latest_child_layer(world, layer_idx)
        if last_child is not None and layer_idx is not None and (layer_idx - last_child) < 10:
            return 0.0
    elif event.name == "have_second_child":
        base = 0.18 if 26 <= age <= 40 else 0.04
        last_child = _latest_child_layer(world, layer_idx)
        if last_child is not None and layer_idx is not None and (layer_idx - last_child) < 10:
            return 0.0
    elif event.name == "have_third_child":
        base = 0.10 if 28 <= age <= 42 else 0.02
        last_child = _latest_child_layer(world, layer_idx)
        if last_child is not None and layer_idx is not None and (layer_idx - last_child) < 12:
            return 0.0
    elif event.name == "kid":
        base = 0.10 if world.children < 3 else 0.03
    elif event.name == "go_on_vacation":
        base = 0.25 if world.cash > 3_000 else 0.12 if world.cash > 1_000 else 0.02
        months_since_vacation = _months_since(world, "go_on_vacation", layer_idx)
        if months_since_vacation is not None and months_since_vacation < 12:
            return 0.0
    elif event.name == "get_loan":
        affordability = 1.0 if world.current_income > 3_000 else 0.6
        base = 0.10 * affordability
    elif event.name in ("make_extra_payment", "increase_payment_rate"):
        base = 0.15 if world.cash > 8_000 else 0.08
    elif event.name == "decrease_payment_rate":
        base = 0.10 if world.cash < 1_000 else 0.04
    elif event.name == "invest_in_stock":
        base = 0.20 if world.cash > 2_000 else 0.05
    elif event.name == "buy_disability_insurance":
        base = 0.15 if not world.metadata.get("has_disability_insurance") else 0.0
    elif event.name == "buy_insurance":
        base = 0.12 if not world.metadata.get("has_insurance") else 0.0
    elif event.name == "buy_second_car":
        base = 0.06 if world.cash > 10_000 else 0.02
    elif event.name == "renovate_house":
        base = 0.08 if world.cash > 20_000 else 0.02
    elif event.name == "sickness":
        base = 0.06 if world.health_status == "healthy" else 0.02
    elif event.name == "disability":
        base = 0.03 if world.health_status != "disabled" else 0.0
    elif event.name == "death":
        base = 0.01 if age > 70 else 0.002 if age > 50 else base

    risk_modifier = 1.0 + float(global_cfg.risk_factor) * 0.1
    return _clamp_probability(base * risk_modifier)
