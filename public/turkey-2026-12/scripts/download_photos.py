#!/usr/bin/env python3
"""Download Wikimedia photos by direct thumb URL, resize ≤1200px, JPEG ≤200KB."""
import io
import json
import time
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent / "photos"
ROOT.mkdir(parents=True, exist_ok=True)

# place, local file, url, alt, license
ITEMS = [
    ("hagia", "hagia-1.jpg", "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/22/Hagia_Sophia_Mars_2013.jpg/1280px-Hagia_Sophia_Mars_2013.jpg", "Hagia Sophia exterior", "CC BY-SA 3.0"),
    ("hagia", "hagia-2.jpg", "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fc/Gaspare_Fossati_-_Louis_Haghe_-_Vue_g%C3%A9n%C3%A9rale_de_la_grande_nef%2C_en_regardant_l%27occident_%28Hagia_Sophia_-_Ayasofya_Mosque_nave%29.jpg/1280px-Gaspare_Fossati_-_Louis_Haghe_-_Vue_g%C3%A9n%C3%A9rale_de_la_grande_nef%2C_en_regardant_l%27occident_%28Hagia_Sophia_-_Ayasofya_Mosque_nave%29.jpg", "Historic interior view", "Public domain"),
    ("blue", "blue-1.jpg", "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/77/Blue_Mosque_Courtyard_Dusk_Wikimedia_Commons.jpg/1280px-Blue_Mosque_Courtyard_Dusk_Wikimedia_Commons.jpg", "Blue Mosque courtyard", "CC BY-SA"),
    ("blue", "blue-2.jpg", "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/12/Exterior_of_Sultan_Ahmed_I_Mosque_in_Istanbul%2C_Turkey_002.jpg/1280px-Exterior_of_Sultan_Ahmed_I_Mosque_in_Istanbul%2C_Turkey_002.jpg", "Sultan Ahmed Mosque", "CC BY-SA"),
    ("safranbolu", "safranbolu-1.jpg", "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/66/Safranbolu_-_Unesco_World_Heritage.jpg/1280px-Safranbolu_-_Unesco_World_Heritage.jpg", "Safranbolu UNESCO town", "CC BY-SA"),
    ("safranbolu", "safranbolu-2.jpg", "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/97/Safranbolu_houses_in_2006_8307b.jpg/1280px-Safranbolu_houses_in_2006_8307b.jpg", "Ottoman wooden houses", "CC BY-SA"),
    ("hidirlik", "hidirlik-1.jpg", "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7d/Safranbolu_Panorama.jpg/1280px-Safranbolu_Panorama.jpg", "Panorama over Safranbolu", "CC BY-SA"),
    ("anitkabir", "anitkabir-1.jpg", "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/ca/Ataturk%27s_Mausoleum_%286225341313%29.jpg/1280px-Ataturk%27s_Mausoleum_%286225341313%29.jpg", "Anitkabir mausoleum", "CC BY"),
    ("tuz", "tuz-1.jpg", "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/ca/Tuz_G%C3%B6l%C3%BC_2.jpg/1280px-Tuz_G%C3%B6l%C3%BC_2.jpg", "Lake Tuz salt flats", "CC BY-SA"),
    ("tuz", "tuz-2.jpg", "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/be/Satellite_image_of_Lake_Tuz%2C_Turkey.tif/lossy-page1-1280px-Satellite_image_of_Lake_Tuz%2C_Turkey.tif.jpg", "Lake Tuz aerial", "Public domain (NASA)"),
    ("cappadocia", "cap-1.jpg", "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e5/G%C3%B6reme_Valley_in_Cappadocia_edit1.jpg/1280px-G%C3%B6reme_Valley_in_Cappadocia_edit1.jpg", "Goreme valley chimneys", "CC BY-SA"),
    ("cappadocia", "cap-2.jpg", "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e9/Castle_U%C3%A7hisar_in_Cappadocia.jpg/1280px-Castle_U%C3%A7hisar_in_Cappadocia.jpg", "Uchisar rock castle", "CC BY-SA"),
    ("cappadocia", "cap-3.jpg", "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8a/Goreme_fairy_chimneys-3.jpg/1280px-Goreme_fairy_chimneys-3.jpg", "Fairy chimneys", "CC BY-SA"),
    ("sultanhani", "sultanhani-1.jpg", "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/04/Sultanhani_Caravanserai_Aksaray.jpg/1280px-Sultanhani_Caravanserai_Aksaray.jpg", "Sultanhani caravanserai", "CC BY"),
    ("sille", "sille-1.jpg", "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9a/Sille_Village%2C_Konya.jpg/1280px-Sille_Village%2C_Konya.jpg", "Sille stone village", "CC BY-SA"),
    ("mevlana", "mevlana-1.jpg", "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/60/Mevlana_M%C3%BCzesi_01.jpg/1280px-Mevlana_M%C3%BCzesi_01.jpg", "Mevlana Museum", "CC BY-SA"),
    ("mevlana", "mevlana-2.jpg", "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bd/Mevlana_Mausoleum_Museum_-_52551844264.jpg/1280px-Mevlana_Mausoleum_Museum_-_52551844264.jpg", "Mausoleum courtyard", "CC BY"),
    ("pamukkale", "pam-1.jpg", "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/46/TR_Pamukkale_White_Terraces_asv2020-02_img16.jpg/1280px-TR_Pamukkale_White_Terraces_asv2020-02_img16.jpg", "White travertine terraces", "CC BY-SA 4.0"),
    ("pamukkale", "pam-2.jpg", "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fe/The_Roman_theatre%2C_built_in_the_2nd_century_AD_under_Hadrian_on_the_ruins_of_an_earlier_theatre%2C_later_renovated_under_Septimius_Severus%2C_Hierapolis%2C_Turkey_-_17033619498.jpg/1280px-thumbnail.jpg", "Hierapolis Roman theatre", "CC BY"),
    ("ephesus", "eph-1.jpg", "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5a/Ephesus_Celsus_Library.jpg/1280px-Ephesus_Celsus_Library.jpg", "Celsus Library facade", "CC BY-SA"),
    ("ephesus", "eph-2.jpg", "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/25/Great_Theatre_of_Ephesus_2024.jpg/1280px-Great_Theatre_of_Ephesus_2024.jpg", "Great Theatre", "CC BY-SA"),
    ("izmir", "izm-1.jpg", "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2e/Izmir_square_clock_tower.jpg/1280px-Izmir_square_clock_tower.jpg", "Konak Clock Tower", "CC BY-SA"),
    ("izmir", "izm-2.jpg", "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/ff/TR_Izmir_asv2020-02_img52_Asans%C3%B6r.jpg/1280px-TR_Izmir_asv2020-02_img52_Asans%C3%B6r.jpg", "Asansor elevator", "CC BY-SA 4.0"),
    ("ulu", "ulu-1.jpg", "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d9/Bursa_Ulu_Camii_2007.jpg/1280px-Bursa_Ulu_Camii_2007.jpg", "Bursa Grand Mosque", "CC BY-SA"),
    ("bosphorus", "bos-1.jpg", "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ea/Istanbul_and_Bosporus_big.jpg/1280px-Istanbul_and_Bosporus_big.jpg", "Bosphorus and skyline", "CC BY-SA"),
    ("bosphorus", "bos-2.jpg", "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1a/Bosphorus_Bridge_from_Ortak%C3%B6y_Istanbul.jpg/1280px-Bosphorus_Bridge_from_Ortak%C3%B6y_Istanbul.jpg", "Bridge over the strait", "CC BY-SA"),
    ("spice", "spice-1.jpg", "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e1/Spices_on_Spice_Bazaar_in_Istanbul_02.jpg/1280px-Spices_on_Spice_Bazaar_in_Istanbul_02.jpg", "Spice Bazaar", "CC BY-SA"),
]


def save_jpeg(img: Image.Image, path: Path, max_bytes: int = 200_000) -> int:
    w = min(img.width, 1200)
    if img.width != w:
        h = int(img.height * w / img.width)
        img = img.resize((w, h), Image.Resampling.LANCZOS)
    data = b""
    for q in range(82, 35, -3):
        buf = io.BytesIO()
        img.convert("RGB").save(buf, format="JPEG", optimize=True, quality=q)
        data = buf.getvalue()
        if len(data) <= max_bytes:
            break
    if len(data) > max_bytes:
        w2 = int(w * 0.85)
        h2 = int(img.height * w2 / img.width)
        img = img.resize((w2, h2), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        img.convert("RGB").save(buf, format="JPEG", optimize=True, quality=72)
        data = buf.getvalue()
    path.write_bytes(data)
    return len(data)


manifest = []
UA = {"User-Agent": "TravelYT/1.0 (travel.tanxin.space)"}
for place, fname, url, alt, credit in ITEMS:
    out = ROOT / fname
    try:
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=90) as resp:
            raw = resp.read()
        size = save_jpeg(Image.open(io.BytesIO(raw)), out)
        manifest.append({"place": place, "file": fname, "alt": alt, "credit": f"Wikimedia Commons · {credit}", "bytes": size})
        print(f"OK {fname} {size // 1024}KB")
        time.sleep(0.5)
    except Exception as e:
        print(f"FAIL {fname}: {e}")

(ROOT.parent / "photos-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")