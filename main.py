"""Entrypoint for the life trajectory simulation."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict

from config_models import GlobalConfig, UserConfig
from simulation import run_scenario, summarize_worlds


DEFAULT_GLOBAL_CONFIG: Dict[str, Any] = {
    "mortgage_rate": 0.04,
    "interest_rate": 0.03,
    "risk_factor": 0.3,
    "inflation": 0.02,  # example extra field
}

DEFAULT_USER_CONFIG: Dict[str, Any] = {
    "income": 75_000,
    "age": 30,
    "education": "bachelor",
    "family_status": "single",
    "career_length": 7,
}

DEFAULT_SETTINGS: Dict[str, Any] = {
    "global_config": DEFAULT_GLOBAL_CONFIG,
    "user_config": DEFAULT_USER_CONFIG,
    "events": [
        {"name": "nothing", "probability": 0.5, "flag": 0},
        {"name": "divorce", "probability": 0.5, "flag": 0},
        {"name": "income_increase", "probability": 0.5, "flag": 0},
        {"name": "income_decrease", "probability": 0.5, "flag": 0},
        {"name": "sickness", "probability": 0.5, "flag": 0},
        {"name": "layoff", "probability": 0.5, "flag": 0},
        {"name": "new_job", "probability": 0.5, "flag": 0},
    ],
    "choices": [
        {"name": "marry", "probability": 0.5, "flag": 0},
        {"name": "kid", "probability": 0.5, "flag": 0},
        {"name": "go_on_vacation", "probability": 0.5, "flag": 0},
        {"name": "buy_insurance", "probability": 0.5, "flag": 0},
    ],
    "num_layers": 10,
    "loan_amount": 200_000.0,
}


def _load_json(path: Path) -> Dict[str, Any]:
    # Use utf-8-sig to tolerate BOM-prefixed files from some editors.
    with path.open("r", encoding="utf-8-sig") as fp:
        return json.load(fp)


def _extract_names_and_probs(items: list[Any], default_prob: float = 0.5) -> tuple[list[str], dict[str, float]]:
    """
    Accept either a list of names or a list of dicts with name/probability/flag.

    Returns (names, probability_mapping).
    """
    names: list[str] = []
    probs: dict[str, float] = {}
    for item in items:
        if isinstance(item, dict):
            name = item.get("name")
            if not name:
                continue
            prob = float(item.get("probability", default_prob))
            names.append(name)
            probs[name] = prob
        else:
            names.append(str(item))
            probs[str(item)] = default_prob
    return names, probs


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Simulate branching life trajectories.")
    parser.add_argument("--global-config", type=Path, help="Path to global config JSON.")
    parser.add_argument("--user-config", type=Path, help="Path to user config JSON.")
    parser.add_argument("--layers", type=int, default=None, help="Number of simulation layers (overrides settings).")
    parser.add_argument("--settings", type=Path, help="Path to simulation settings JSON (events, choices, params).")
    parser.add_argument("--output-dir", type=Path, default=Path("output"), help="Directory to store per-layer outputs.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    if args.settings and args.settings.exists():
        settings_data = _load_json(args.settings)
    else:
        default_settings_path = Path(__file__).parent / "settings.json"
        settings_data = _load_json(default_settings_path) if default_settings_path.exists() else DEFAULT_SETTINGS

    if args.global_config and args.global_config.exists():
        global_data = _load_json(args.global_config)
    else:
        global_data = settings_data.get("global_config", DEFAULT_GLOBAL_CONFIG)

    if args.user_config and args.user_config.exists():
        user_data = _load_json(args.user_config)
    else:
        user_data = settings_data.get("user_config", DEFAULT_USER_CONFIG)

    global_cfg = GlobalConfig.from_dict(global_data)
    user_cfg = UserConfig.from_dict(user_data)

    event_items = settings_data.get("events", DEFAULT_SETTINGS["events"])
    choice_items = settings_data.get("choices", DEFAULT_SETTINGS["choices"])
    event_names, event_probabilities = _extract_names_and_probs(event_items)
    choice_names, choice_probabilities = _extract_names_and_probs(choice_items)
    num_layers = args.layers if args.layers is not None else settings_data.get("num_layers", DEFAULT_SETTINGS["num_layers"])
    loan_amount = float(settings_data.get("loan_amount", DEFAULT_SETTINGS["loan_amount"]))

    loan_now_worlds = run_scenario(
        global_cfg,
        user_cfg,
        take_loan_at_layer=0,
        num_layers=num_layers,
        event_names=event_names,
        choice_names=choice_names,
        event_probabilities=event_probabilities,
        choice_probabilities=choice_probabilities,
        loan_amount=loan_amount,
        output_dir=args.output_dir,
        scenario_name="loan_now",
    )
    loan_next_year_worlds = run_scenario(
        global_cfg,
        user_cfg,
        take_loan_at_layer=1,
        num_layers=num_layers,
        event_names=event_names,
        choice_names=choice_names,
        event_probabilities=event_probabilities,
        choice_probabilities=choice_probabilities,
        loan_amount=loan_amount,
        output_dir=args.output_dir,
        scenario_name="loan_next_year",
    )

    print("=== Final worlds: take loan now ===")
    print(json.dumps(summarize_worlds(loan_now_worlds, timestamp=num_layers), indent=2))

    print("\n=== Final worlds: take loan next year ===")
    print(json.dumps(summarize_worlds(loan_next_year_worlds, timestamp=num_layers), indent=2))


if __name__ == "__main__":
    main()
