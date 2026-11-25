#!/usr/bin/env python3
"""Download Wikimedia photos, resize ≤1200px, JPEG ≤200KB."""
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
    ("nanhu", "nanhu-1.jpg", "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/32/South_Lake_%28Jiaxing%29.jpg/1280px-South_Lake_%28Jiaxing%29.jpg", "嘉興南湖", "CC BY-SA"),
    ("nanhu", "nanhu-2.jpg", "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/11/20240120_Wanghu_Pavilion_in_South_Lake%2C_Jiaxing.jpg/1280px-20240120_Wanghu_Pavilion_in_South_Lake%2C_Jiaxing.jpg", "煙雨樓一帶", "CC BY-SA"),
    ("jingshan", "jingshan-1.jpg", "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0c/Main_gate_of_Jingshan_Temple_1.jpg/1280px-Main_gate_of_Jingshan_Temple_1.jpg", "徑山寺山門", "CC BY-SA"),
    ("qingshan", "qingshan-1.jpg", "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/16/Qingshanhu_Guojia_Senlin_Gongyuan.jpg/1280px-Qingshanhu_Guojia_Senlin_Gongyuan.jpg", "青山湖森林", "CC BY-SA"),
    ("keyan", "keyan-1.jpg", "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0e/Towpath_in_Keyan_Scenic_Area%2C_Shaoxing.jpg/1280px-Towpath_in_Keyan_Scenic_Area%2C_Shaoxing.jpg", "柯岩步道", "CC BY-SA"),
    ("keyan", "keyan-2.jpg", "https://upload.wikimedia.org/wikipedia/commons/0/0e/%E6%9F%AF%E5%B2%A9%E5%A4%A7%E4%BD%9B_-_panoramio.jpg", "柯岩大佛", "CC BY-SA"),
    ("lanting", "lanting-1.jpg", "https://upload.wikimedia.org/wikipedia/commons/a/ad/Zhuxi_Lanting.JPG", "蘭亭曲水", "CC BY-SA"),
    ("shenyuan", "shenyuan-1.jpg", "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/ba/Shen_Garden_in_Shaoxing_2012-07.JPG/1280px-Shen_Garden_in_Shaoxing_2012-07.JPG", "沈園", "CC BY-SA"),
    ("yanguan", "yanguan-1.jpg", "https://upload.wikimedia.org/wikipedia/commons/f/f6/Yanguan_Town_Haining_2016.jpg", "鹽官古城", "CC BY-SA"),
    ("yanguan", "yanguan-2.jpg", "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c4/Tidal_Bore_Qiantang_River.png/1280px-Tidal_Bore_Qiantang_River.png", "錢塘涌潮示意", "CC BY-SA"),
    ("nanxun", "nanxun-1.jpg", "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b1/Nanxun_-_Ancient_water_town_-_0081.jpg/1280px-Nanxun_-_Ancient_water_town_-_0081.jpg", "南潯水巷", "CC BY-SA"),
    ("nanxun", "nanxun-2.jpg", "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f9/Nanxun_-_Ancient_water_town_-_0095.jpg/1280px-Nanxun_-_Ancient_water_town_-_0095.jpg", "古鎮河岸", "CC BY-SA"),
    ("nanxun", "nanxun-3.jpg", "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b7/Nanxun_-_Ancient_water_town_-_0333.jpg/1280px-Nanxun_-_Ancient_water_town_-_0333.jpg", "廊橋石橋", "CC BY-SA"),
    ("gongqing", "gongqing-1.jpg", "https://upload.wikimedia.org/wikipedia/commons/8/87/%E5%85%B1%E9%9D%92%E6%A3%AE%E6%9E%97%E5%85%AC%E5%9B%AD%EF%BC%8CGongqing_Forest_Park_-_panoramio.jpg", "共青森林公園", "CC BY-SA"),
    ("dishui", "dishui-1.jpg", "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bc/201812_Dishui_Lake_from_35L_Final_Approach_Kopie.jpg/1280px-201812_Dishui_Lake_from_35L_Final_Approach_Kopie.jpg", "滴水湖空拍", "CC BY-SA"),
    ("duoyun", "duoyun-1.jpg", "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1c/Sinan_Bookstore_1.jpg/1280px-Sinan_Bookstore_1.jpg", "書店閱讀空間", "CC BY-SA"),
    ("nanhui", "nanhui-1.jpg", "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6d/Donghai_Bridge.jpg/1280px-Donghai_Bridge.jpg", "東海大橋遠景", "CC BY-SA"),
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
        time.sleep(0.35)
    except Exception as e:
        print(f"FAIL {fname}: {e}")

(ROOT.parent / "photos-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")