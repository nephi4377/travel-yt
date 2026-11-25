#!/usr/bin/env python3
"""Apply scripts/photo_credits.json to places-data.js photo blocks."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CREDITS = json.loads((ROOT / "scripts/photo_credits.json").read_text(encoding="utf-8"))

TRIPS = {
    "public/shanghai-2026-11/places-data.js": "shanghai-2026-11",
    "public/turkey-2026-12/places-data.js": "turkey-2026-12",
}

PHOTO_BLOCK = re.compile(
    r"(\{\s*src:\s*\"photos/([^\"]+)\",\s*alt:\s*\")([^\"]*)(\",\s*credit:\s*\")([^\"]*)(\"\s*\})",
)


def apply(path: Path, trip_key: str):
    meta = CREDITS[trip_key]
    text = path.read_text(encoding="utf-8")

    def repl(m):
        fname = m.group(2)
        if fname not in meta:
            return m.group(0)
        return (
            f"{m.group(1)}{meta[fname]['alt']}{m.group(4)}"
            f"{meta[fname]['credit']}{m.group(6)}"
        )

    new = PHOTO_BLOCK.sub(repl, text)
    path.write_text(new, encoding="utf-8")
    print(path.name, "updated", len(meta), "credits")


if __name__ == "__main__":
    for rel, key in TRIPS.items():
        apply(ROOT / rel, key)