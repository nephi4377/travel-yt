#!/usr/bin/env python3
"""Sync photos-manifest.json from disk + photo_credits.json."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CREDITS = json.loads((ROOT / "scripts/photo_credits.json").read_text(encoding="utf-8"))
PLACE_PREFIX = {
    "nanhu": "nanhu",
    "jingshan": "jingshan",
    "qingshan": "qingshan",
    "keyan": "keyan",
    "lanting": "lanting",
    "shenyuan": "shenyuan",
    "yanguan": "yanguan",
    "nanxun": "nanxun",
    "gongqing": "gongqing",
    "dishui": "dishui",
    "nanhui": "nanhui",
    "hagia": "hagia",
    "blue": "blue",
    "safranbolu": "safranbolu",
    "hidirlik": "hidirlik",
    "anitkabir": "anitkabir",
    "tuz": "tuz",
    "cap": "cappadocia",
    "sultanhani": "sultanhani",
    "sille": "sille",
    "mevlana": "mevlana",
    "pam": "pamukkale",
    "eph": "ephesus",
    "izm": "izmir",
    "ulu": "ulu",
    "bos": "bosphorus",
    "spice": "spice",
}


def merge_trip(trip_dir: str, credits_key: str):
    meta = CREDITS[credits_key]
    photos_dir = ROOT / trip_dir / "photos"
    out = []
    for path in sorted(photos_dir.glob("*.jpg")):
        fname = path.name
        m = meta.get(fname, {})
        stem = fname.split("-")[0]
        out.append(
            {
                "place": PLACE_PREFIX.get(stem, stem),
                "file": fname,
                "bytes": path.stat().st_size,
                "alt": m.get("alt", fname),
                "credit": m.get("credit", ""),
            }
        )
    mf = ROOT / trip_dir / "photos-manifest.json"
    mf.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(trip_dir, len(out), "rows")


if __name__ == "__main__":
    merge_trip("public/shanghai-2026-11", "shanghai-2026-11")
    merge_trip("public/turkey-2026-12", "turkey-2026-12")