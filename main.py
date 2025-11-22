from __future__ import annotations

import json

from config_models import GlobalConfig, UserConfig
from simulation import run_scenario, summarize_worlds


def main() -> None:
    """Example entrypoint wiring the simulation together."""
    example_global = {
        "mortgage_rate": 0.04,
        "interest_rate": 0.03,
        "risk_factor": 0.3,
        "inflation": 0.02,  # extra field captured in extras
    }
    example_user = {
        "income": 75_000,
        "age": 30,
        "education": "bachelor",
        "family_status": "single",  # captured as extra to seed initial world
        "career_length": 7,  # optional override
    }

    global_cfg = GlobalConfig.from_dict(example_global)
    user_cfg = UserConfig.from_dict(example_user)

    loan_now_worlds = run_scenario(global_cfg, user_cfg, take_loan_at_layer=0)
    loan_next_year_worlds = run_scenario(global_cfg, user_cfg, take_loan_at_layer=1)

    print("=== Final worlds: take loan now ===")
    print(json.dumps(summarize_worlds(loan_now_worlds), indent=2))

    print("\n=== Final worlds: take loan next year ===")
    print(json.dumps(summarize_worlds(loan_next_year_worlds), indent=2))


if __name__ == "__main__":
    main()
