#!/usr/bin/env python3
"""Pre-push checks for PR28 (links, theme lengths, simplified chars, privacy)."""
import json
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SIMPLIFIED = re.compile(r"(牛头宗|发|团|东|观|头|后|乐|园|门|广|县|灭)")
PRIVACY = re.compile(
    r"(?<![/\w])(1[3-9]\d{9})(?!\d)|房号|护照号|(?<![\w])订单(?![号號])|(?<![\w])訂單(?![号號])|收據|凭证|憑證|800-0885|(?<![\w./])@[\w]",
    re.I,
)


def extract_learn_hrefs(js: str):
    return re.findall(r'href:\s*"([^"]+)"', js)


def extract_theme_bodies(js: str):
    return re.findall(r'\{ t: "[^"]+", b: "([^"]+)" \}', js)


def fetch_title(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "TravelYT-verify/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        status = resp.status
        final = resp.geturl()
        html = resp.read(16000).decode("utf-8", "replace")
    m = re.search(r"<title>([^<]+)</title>", html)
    title = m.group(1) if m else ""
    return f"{status} {final} :: {title[:120]}"


def main() -> int:
    errors = []
    for trip, rel in (
        ("shanghai", "public/shanghai-2026-11/places-data.js"),
        ("turkey", "public/turkey-2026-12/places-data.js"),
    ):
        js = (ROOT / rel).read_text(encoding="utf-8")
        for i, b in enumerate(extract_theme_bodies(js), 1):
            if not (150 <= len(b) <= 500):
                errors.append(f"{trip} theme #{i} length {len(b)}")
            if SIMPLIFIED.search(b):
                errors.append(f"{trip} theme #{i} possible simplified char in: {b[:40]}")
        for href in extract_learn_hrefs(js):
            if not href.startswith("http"):
                continue
            try:
                info = fetch_title(href)
                if "404" in info or "錯誤" in info or "Error" in info:
                    errors.append(f"{trip} bad link {href} -> {info}")
            except Exception as e:
                errors.append(f"{trip} link fail {href}: {e}")

    for rel in (
        "public/shanghai-2026-11/places-data.js",
        "public/turkey-2026-12/places-data.js",
    ):
        p = ROOT / rel
        txt = p.read_text(encoding="utf-8", errors="ignore")
        if PRIVACY.search(txt):
            m = PRIVACY.search(txt)
            errors.append(f"privacy? {p}: matched {m.group(0)}")

    for mf in [
        ROOT / "public/shanghai-2026-11/photos-manifest.json",
        ROOT / "public/turkey-2026-12/photos-manifest.json",
    ]:
        data = json.loads(mf.read_text(encoding="utf-8"))
        for row in data:
            for key in ("alt", "credit"):
                if key not in row or not row[key]:
                    errors.append(f"manifest missing {key}: {row.get('file')}")

    if errors:
        print("\n".join(errors))
        return 1
    print("pr28_verify: OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())