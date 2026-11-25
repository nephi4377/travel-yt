#!/usr/bin/env python3
"""
Fetch Commons API credits (Artist + LicenseShortName), verify aspect ratio,
optionally re-download mismatched images, update places-data + manifest only.
"""
from __future__ import annotations

import html
import io
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MAP_PATH = ROOT / "scripts/photo_commons_map.json"
UA = {"User-Agent": "TravelYT/commons-sync/1.0 (travel.tanxin.space)"}
API = "https://commons.wikimedia.org/w/api.php"
ASPECT_TOLERANCE = 0.04
INFO_CACHE: dict[str, dict] = {}

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


def strip_artist(raw: str) -> str:
    if not raw:
        return "Unknown"
    t = re.sub(r"<[^>]+>", "", raw)
    t = html.unescape(t).replace("\n", " ").strip()
    t = re.sub(r"\s+", " ", t)
    return t[:120] if t else "Unknown"


def commons_file_info(commons_filename: str) -> dict | None:
    if commons_filename in INFO_CACHE:
        return INFO_CACHE[commons_filename]
    title = f"File:{commons_filename}"
    q = (
        f"{API}?action=query&titles={urllib.parse.quote(title, safe='/')}"
        "&prop=imageinfo&iiprop=url|size|extmetadata&format=json"
    )
    for attempt in range(6):
        req = urllib.request.Request(q, headers=UA)
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = json.loads(resp.read())
            break
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < 5:
                time.sleep(2 ** (attempt + 2))
                continue
            raise
    pages = data["query"]["pages"]
    page = next(iter(pages.values()))
    if "missing" in page:
        return None
    ii = page["imageinfo"][0]
    meta = ii.get("extmetadata", {})
    artist = strip_artist(meta.get("Artist", {}).get("value", ""))
    lic = meta.get("LicenseShortName", {}).get("value", "").strip() or "See Commons"
    out = {
        "commons_filename": commons_filename,
        "commons_url": (
            "https://commons.wikimedia.org/wiki/File:"
            + urllib.parse.quote(commons_filename.replace(" ", "_"), safe="(),")
        ),
        "artist": artist,
        "license": lic,
        "width": ii["width"],
        "height": ii["height"],
        "url": ii["url"],
    }
    INFO_CACHE[commons_filename] = out
    return out


def local_aspect(path: Path) -> float:
    with Image.open(path) as im:
        w, h = im.size
    return w / h if h else 1.0


def commons_aspect(info: dict) -> float:
    w, h = info["width"], info["height"]
    return w / h if h else 1.0


def save_jpeg(img: Image.Image, path: Path, max_bytes: int = 200_000) -> int:
    img = img.convert("RGB")
    w = min(img.width, 1200)
    if img.width != w:
        h = int(img.height * w / img.width)
        img = img.resize((w, h), Image.Resampling.LANCZOS)
    for q in range(82, 40, -3):
        buf = io.BytesIO()
        img.save(buf, "JPEG", quality=q, optimize=True)
        data = buf.getvalue()
        if len(data) <= max_bytes:
            path.write_bytes(data)
            return len(data)
    w2 = int(w * 0.82)
    h2 = int(img.height * w2 / img.width)
    img = img.resize((w2, h2), Image.Resampling.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=68, optimize=True)
    data = buf.getvalue()
    path.write_bytes(data)
    return len(data)


def download_commons_jpeg(url: str, dest: Path) -> None:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=120) as resp:
        raw = resp.read()
    save_jpeg(Image.open(io.BytesIO(raw)), dest)


def format_credit(info: dict) -> str:
    return f"{info['artist']} · {info['license']} · {info['commons_url']}"


def patch_places_data(js_path: Path, credits: dict[str, str]):
    text = js_path.read_text(encoding="utf-8")
    for fname, credit in credits.items():
        pat = re.compile(
            rf'(src:\s*"photos/{re.escape(fname)}"\s*,\s*alt:\s*")([^"]*)("\s*,\s*credit:\s*")([^"]*)(")',
        )
        text, n = pat.subn(rf"\1\2\3{credit}\5", text, count=1)
        if n == 0:
            pat2 = re.compile(
                rf'(src:\s*"photos/{re.escape(fname)}"[^}}]*?credit:\s*")([^"]*)(")',
                re.S,
            )
            text, n = pat2.subn(rf"\1{credit}\3", text, count=1)
        if n == 0:
            print("WARN no photo block", fname, "in", js_path.name)
    js_path.write_text(text, encoding="utf-8")


def write_manifest(trip_dir: str, rows: list[dict]):
    mf = ROOT / trip_dir / "photos-manifest.json"
    mf.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def process_trip(trip_key: str, trip_dir: str, file_map: dict[str, str], redownload: bool):
    photos = ROOT / trip_dir / "photos"
    manifest_rows = []
    credits: dict[str, str] = {}
    alts: dict[str, str] = {}
    aspect_ok = 0
    aspect_bad = 0
    api_missing = 0

    for fname in sorted(photos.glob("*.jpg")):
        fname = fname.name
        commons_name = file_map.get(fname)
        if not commons_name:
            print("SKIP unmapped", fname)
            continue
        info = commons_file_info(commons_name)
        if not info:
            api_missing += 1
            print("MISSING commons", commons_name)
            continue
        time.sleep(0.8)
        local = photos / fname
        la = local_aspect(local)
        ca = commons_aspect(info)
        ratio_ok = abs(la - ca) / ca <= ASPECT_TOLERANCE
        if not ratio_ok and redownload:
            try:
                download_commons_jpeg(info["url"], local)
                la = local_aspect(local)
                ratio_ok = abs(la - ca) / ca <= ASPECT_TOLERANCE
                print("REDOWN", fname, "->", commons_name)
            except Exception as e:
                print("REDOWN FAIL", fname, e)
        if ratio_ok:
            aspect_ok += 1
        else:
            aspect_bad += 1
            print(f"ASPECT MISMATCH {fname}: local {la:.3f} commons {ca:.3f} ({commons_name})")

        credit = format_credit(info)
        credits[fname] = credit
        stem = fname.split("-")[0]
        place = PLACE_PREFIX.get(stem, stem)
        manifest_rows.append(
            {
                "place": place,
                "file": fname,
                "bytes": local.stat().st_size,
                "alt": alts.get(fname) or fname,
                "credit": credit,
                "commons_file": commons_name,
                "artist": info["artist"],
                "license": info["license"],
            }
        )

    # preserve alt from existing manifest if present
    mf_old = ROOT / trip_dir / "photos-manifest.json"
    if mf_old.exists():
        for row in json.loads(mf_old.read_text(encoding="utf-8")):
            if row["file"] in credits:
                alts[row["file"]] = row.get("alt", row["file"])
                for m in manifest_rows:
                    if m["file"] == row["file"]:
                        m["alt"] = row.get("alt", m["alt"])

    patch_places_data(ROOT / trip_dir / "places-data.js", credits)
    for m in manifest_rows:
        m["alt"] = alts.get(m["file"], m["alt"])
        credits[m["file"]]  # ensure in credits dict for patch already done
    write_manifest(trip_dir, manifest_rows)
    return aspect_ok, aspect_bad, api_missing, credits


def verify_credits_match_api(credits: dict[str, str], file_map: dict[str, str]) -> tuple[int, int]:
    ok, bad = 0, 0
    for fname, credit in credits.items():
        commons_name = file_map[fname]
        info = INFO_CACHE.get(commons_name) or commons_file_info(commons_name)
        if not info:
            bad += 1
            continue
        expected = format_credit(info)
        if credit.strip() == expected.strip():
            ok += 1
        else:
            bad += 1
            print("CREDIT MISMATCH", fname)
            print("  got     ", credit[:120])
            print("  expected", expected[:120])
    return ok, bad


def main():
    redownload = "--redownload" in sys.argv
    raw = json.loads(MAP_PATH.read_text(encoding="utf-8"))
    sh_map = dict(raw["shanghai-2026-11"])
    tr_map = dict(raw["turkey-2026-12"])

    a1, b1, m1, c1 = process_trip("shanghai-2026-11", "public/shanghai-2026-11", sh_map, redownload)
    a2, b2, m2, c2 = process_trip("turkey-2026-12", "public/turkey-2026-12", tr_map, redownload)

    all_credits = {**c1, **c2}
    all_map = {**sh_map, **tr_map}
    v_ok, v_bad = verify_credits_match_api(all_credits, all_map)

    out = {
        "aspect_match": a1 + a2,
        "aspect_mismatch": b1 + b2,
        "commons_missing": m1 + m2,
        "credit_verify_ok": v_ok,
        "credit_verify_bad": v_bad,
        "total_photos": len(all_credits),
    }
    (ROOT / "scripts" / "commons_sync_report.json").write_text(
        json.dumps(out, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(out, indent=2))
    return 1 if v_bad or b1 + b2 or m1 + m2 else 0


if __name__ == "__main__":
    raise SystemExit(main())