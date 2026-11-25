#!/usr/bin/env python3
"""Sync photos-manifest.json from on-disk JPGs + places-data.js credit/alt."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
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


def place_for(fname: str, old_rows):
    for r in old_rows:
        if r["file"] == fname:
            return r.get("place")
    stem = fname.split("-")[0]
    return PLACE_PREFIX.get(stem, stem)


def merge_trip(trip_dir: str):
    js = (ROOT / trip_dir / "places-data.js").read_text(encoding="utf-8")
    photo_meta = {}
    for src, alt, credit in re.findall(
        r'src:\s*"photos/([^"]+)"[^}]*alt:\s*"([^"]+)"[^}]*credit:\s*"([^"]+)"',
        js,
        re.S,
    ):
        photo_meta[src] = {"alt": alt, "credit": credit}

    mf = ROOT / trip_dir / "photos-manifest.json"
    old = json.loads(mf.read_text(encoding="utf-8")) if mf.exists() else []
    photos_dir = ROOT / trip_dir / "photos"
    out = []
    for path in sorted(photos_dir.glob("*.jpg")):
        fname = path.name
        meta = photo_meta.get(fname, {})
        old_row = next((r for r in old if r["file"] == fname), {})
        out.append(
            {
                "place": place_for(fname, old),
                "file": fname,
                "bytes": path.stat().st_size,
                "alt": meta.get("alt") or old_row.get("alt") or fname,
                "credit": meta.get("credit") or old_row.get("credit") or "Wikimedia Commons",
            }
        )
    mf.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(trip_dir, len(out), "manifest rows")


if __name__ == "__main__":
    merge_trip("public/shanghai-2026-11")
    merge_trip("public/turkey-2026-12")