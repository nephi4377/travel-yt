#!/usr/bin/env python3
import json, urllib.parse, urllib.request, time
API = "https://commons.wikimedia.org/w/api.php"
UA = {"User-Agent": "TravelYT/1.0 (travel.tanxin.space)"}

QUERIES = {
    "hagia-2": "Hagia Sophia interior",
    "blue-1": "Blue Mosque Istanbul",
    "blue-2": "Sultan Ahmed Mosque",
    "safranbolu-1": "Safranbolu UNESCO",
    "safranbolu-2": "Safranbolu houses",
    "hidirlik-1": "Safranbolu panorama",
    "anitkabir-1": "Anitkabir",
    "tuz-1": "Lake Tuz Turkey",
    "tuz-2": "Tuz Golu",
    "cap-1": "Cappadocia Goreme",
    "cap-2": "Uchisar castle",
    "cap-3": "Three sisters Cappadocia",
    "sultanhani-1": "Sultanhani caravanserai",
    "sille-1": "Sille Konya",
    "mevlana-1": "Mevlana Museum",
    "mevlana-2": "Mevlana mausoleum",
    "pam-1": "Pamukkale travertine",
    "pam-2": "Hierapolis theatre",
    "eph-2": "Ephesus theatre",
    "izm-1": "Izmir clock tower",
    "izm-2": "Asansor Izmir",
    "ulu-1": "Bursa Ulu Camii",
    "bos-1": "Bosphorus Istanbul",
    "bos-2": "Bosphorus strait",
    "spice-1": "Spice Bazaar Istanbul",
}


def search(q):
    params = {
        "action": "query",
        "format": "json",
        "list": "search",
        "srsearch": q,
        "srnamespace": "6",
        "srlimit": "3",
    }
    url = API + "?" + urllib.parse.urlencode(params)
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
        data = json.load(r)
    return [x["title"] for x in data.get("query", {}).get("search", [])]


def thumb(title):
    params = {
        "action": "query",
        "format": "json",
        "titles": title,
        "prop": "imageinfo",
        "iiprop": "url",
        "iiurlwidth": "1200",
    }
    url = API + "?" + urllib.parse.urlencode(params)
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
        data = json.load(r)
    for p in data.get("query", {}).get("pages", {}).values():
        ii = (p.get("imageinfo") or [None])[0]
        if ii:
            return ii.get("thumburl", ii.get("url", "")).split("?")[0], p.get("title")
    return None, None


for key, q in QUERIES.items():
    titles = search(q)
    time.sleep(0.3)
    if not titles:
        print(key, "NO SEARCH", q)
        continue
    url, t = thumb(titles[0])
    print(key, "->", t, "->", url)
    time.sleep(0.3)