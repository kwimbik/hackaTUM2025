"""Bridge server: receive UI requests, run main.py, return stdout/stderr."""

from __future__ import annotations

import json
import subprocess
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent
MAIN_PATH = ROOT / "main.py"


def run_main() -> dict[str, Any]:
    """Execute main.py and capture output."""
    proc = subprocess.run([sys.executable, str(MAIN_PATH)], capture_output=True, text=True)
    return {
        "returncode": proc.returncode,
        "stdout": proc.stdout,
        "stderr": proc.stderr,
    }


class Handler(BaseHTTPRequestHandler):
    def _set_headers(self, status: int = 200) -> None:
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_OPTIONS(self) -> None:  # noqa: N802
        self._set_headers(200)

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/run":
            self._set_headers(404)
            self.wfile.write(b"{}")
            return

        try:
            result = run_main()
            status = 200 if result["returncode"] == 0 else 500
            self._set_headers(status)
            self.wfile.write(json.dumps({"status": "ok" if status == 200 else "error", **result}).encode("utf-8"))
        except Exception as exc:  # noqa: BLE001
            self._set_headers(500)
            self.wfile.write(json.dumps({"status": "error", "error": str(exc)}).encode("utf-8"))


def run_server(host: str = "0.0.0.0", port: int = 5001) -> None:
    server = HTTPServer((host, port), Handler)
    print(f"Bridge server listening at http://{host}:{port} (POST /run)")
    server.serve_forever()


if __name__ == "__main__":
    run_server()
