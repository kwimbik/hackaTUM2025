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


def _load_json(path: Path) -> Dict[str, Any]:
    with path.open("r", encoding="utf-8") as fp:
        return json.load(fp)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Simulate branching life trajectories.")
    parser.add_argument("--global-config", type=Path, help="Path to global config JSON.")
    parser.add_argument("--user-config", type=Path, help="Path to user config JSON.")
    parser.add_argument("--layers", type=int, default=10, help="Number of simulation layers.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    if args.global_config and args.global_config.exists():
        global_data = _load_json(args.global_config)
    else:
        global_data = DEFAULT_GLOBAL_CONFIG

    if args.user_config and args.user_config.exists():
        user_data = _load_json(args.user_config)
    else:
        user_data = DEFAULT_USER_CONFIG

    global_cfg = GlobalConfig.from_dict(global_data)
    user_cfg = UserConfig.from_dict(user_data)

    loan_now_worlds = run_scenario(global_cfg, user_cfg, take_loan_at_layer=0, num_layers=args.layers)
    loan_next_year_worlds = run_scenario(global_cfg, user_cfg, take_loan_at_layer=1, num_layers=args.layers)

    print("=== Final worlds: take loan now ===")
    print(json.dumps(summarize_worlds(loan_now_worlds), indent=2))

    print("\n=== Final worlds: take loan next year ===")
    print(json.dumps(summarize_worlds(loan_next_year_worlds), indent=2))


if __name__ == "__main__":
    main()
