"""Entrypoint for the life trajectory simulation."""

from __future__ import annotations

import argparse
import os
import requests
import time
import json
import shutil
from pathlib import Path
from typing import Any, Dict

from interesting_event_explanation import extract_most_risky_summary
from interesting_event_explanation import timestamp_to_year_month_tuple

from config_models import GlobalConfig, UserConfig
from simulation import (
    IdAllocator,
    NameAllocator,
    apply_take_loan,
    create_initial_world,
    summarize_worlds,
    simulate_layers,
)


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
    parser.add_argument(
        "--settings",
        type=Path,
        default=Path("settings.json"),
        help="Path to simulation settings JSON (required if not in default location).",
    )
    parser.add_argument("--output-dir", type=Path, default=Path("output"), help="Directory to store per-layer outputs.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    if args.output_dir:
        if args.output_dir.exists():
            shutil.rmtree(args.output_dir)
        args.output_dir.mkdir(parents=True, exist_ok=True)

    if not args.settings.exists():
        raise FileNotFoundError(f"Settings file not found: {args.settings}")
    settings_data = _load_json(args.settings)

    if args.global_config and args.global_config.exists():
        global_data = _load_json(args.global_config)
    else:
        global_data = settings_data.get("global_config")
        if global_data is None:
            raise ValueError("global_config must be present in settings or provided via --global-config.")

    if args.user_config and args.user_config.exists():
        user_data = _load_json(args.user_config)
    else:
        user_data = settings_data.get("user_config")
        if user_data is None:
            raise ValueError("user_config must be present in settings or provided via --user-config.")

    global_cfg = GlobalConfig.from_dict(global_data)
    user_cfg = UserConfig.from_dict(user_data)

    event_items = settings_data.get("events")
    choice_items = settings_data.get("choices")
    if not event_items:
        raise ValueError("Settings must include a non-empty 'events' list.")
    if choice_items is None:
        choice_items = []
    event_names, event_probabilities = _extract_names_and_probs(event_items)
    choice_names, choice_probabilities = _extract_names_and_probs(choice_items)
    num_layers_setting = settings_data.get("num_layers")
    if num_layers_setting is None:
        raise ValueError("Settings must define 'num_layers'.")
    num_layers = args.layers if args.layers is not None else int(num_layers_setting)
    loan_amount_setting = settings_data.get("loan_amount")
    if loan_amount_setting is None:
        raise ValueError("Settings must define 'loan_amount'.")
    loan_amount = float(loan_amount_setting)

    id_provider = IdAllocator()
    name_provider = NameAllocator()
    base_world = create_initial_world(global_cfg, user_cfg, name=name_provider.next_name(), world_id=id_provider.next_id())
    loan_now_world = apply_take_loan(
        base_world,
        layer_index=0,
        global_cfg=global_cfg,
        amount=loan_amount,
        monthly_payment=float(global_cfg.extras.get("monthly_loan_payment", 0.0)),
        tag="initial_loan",
    )
    no_loan_world = base_world.copy_with_updates(
        id=id_provider.next_id(),
        name=name_provider.next_name(),
        metadata={**base_world.metadata, "monthly_payment_override": 0.0},
        trajectory_events=base_world.trajectory_events + ["no_initial_loan"],
        property_type="none",
        property_rooms=0,
        property_price=0.0,
    )

    combined_worlds = simulate_layers(
        global_cfg,
        user_cfg,
        initial_worlds=[loan_now_world, no_loan_world],
        num_layers=num_layers,
        event_names=event_names,
        choice_names=choice_names,
        event_probabilities=event_probabilities,
        choice_probabilities=choice_probabilities,
        output_dir=args.output_dir,
        scenario_name="combined",
        name_allocator=name_provider,
        id_allocator=id_provider,
    )

    print("=== Final worlds: combined scenario ===")
    
    summaries = (json.dumps(summarize_worlds(combined_worlds, timestamp=num_layers), indent=2))
    directory = "output"

    url = "http://localhost:3000/api/event"
    headers = {"Content-Type": "application/json"}

    for name in os.listdir(directory):
        path = os.path.join(directory, name)

        # Extract all events with interesting flag
        event_summaries = extract_most_risky_summary(path)

        # Send ALL events (server will decide whether to enrich/TTS based on interesting flag)
        for summary in event_summaries:
            # Add interesting flag to data object if not already there
            data = summary.get("data", {})
            if "interesting" not in data:
                data["interesting"] = summary.get("interesting", 0)

            payload = {
                "text": summary.get("text", ""),
                "data": data
            }
            print(payload)
            time.sleep(0.05)
            response = requests.post(url, headers=headers, json=payload)
            print("Sent:", payload, "Response:", response.json())

if __name__ == "__main__":
    main()
