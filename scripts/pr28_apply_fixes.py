#!/usr/bin/env python3
"""One-shot content fixes for PR28 xiaot review (places-data patches)."""
from pathlib import Path

SH = Path("public/shanghai-2026-11/places-data.js")
TR = Path("public/turkey-2026-12/places-data.js")

sh = SH.read_text(encoding="utf-8")
tr = TR.read_text(encoding="utf-8")

REPLACEMENTS_SH = [
    # jingshan facts & links
    (
        "唐代乾封二年（667 年）由法欽禪師開山，初屬牛头宗一系",
        "唐代天寶四年（745 年）由法欽禪師開山，初屬牛頭宗一系",
    ),
    (
        'credit: "方的1P · CC BY-SA · https://commons.wikimedia.org/wiki/File:Main_gate_of_Jingshan_Temple_1.jpg"',
        'credit: "CatOnMars · CC BY-SA 3.0 · https://commons.wikimedia.org/wiki/File:Main_gate_of_Jingshan_Temple_1.jpg"',
    ),
    (
        '{ label: "Wikipedia (EN)・Jingshan Temple", href: "https://en.wikipedia.org/wiki/Jingshan%20Temple%20(Hangzhou)" }',
        '{ label: "維基百科・臨濟宗", href: "https://zh.wikipedia.org/wiki/%E8%87%A8%E6%BF%9F%E5%AE%97" }',
    ),
    (
        "唐代起徑山有古道通臨安與天目，迄今仍可循石階上下山，沿線茶坡與竹海亦可見宋代以來的梯田利用痕跡。",
        "",
    ),
    # keyan
    ("高聳如锥", "高聳如錐"),
    (
        "鑒湖古草工程歷經唐代賀知章疏浚、宋代整修，柯岩水道仍匯入鑒湖支脈，形成採石遺址與農田水利並置的景觀。",
        "柯岩水道匯入鑒湖支脈，形成採石遺址與農田水利並置的景觀。",
    ),
    (
        '{ label: "Wikipedia (EN)", href: "https://en.wikipedia.org/wiki/Ke_Yan" }',
        '{ label: "Wikipedia (EN)・Keqiao", href: "https://en.wikipedia.org/wiki/Keqiao_District" }',
    ),
    # qingshan learn
    (
        '{ label: "維基百科（中文）・青山湖", href: "https://zh.wikipedia.org/wiki/%E9%9D%92%E5%B1%B1%E6%B9%96" }',
        '{ label: "維基百科・臨安區", href: "https://zh.wikipedia.org/wiki/%E4%B8%B4%E5%AE%89%E5%8C%BA" }',
    ),
    (
        '{ label: "Wikipedia (EN)・Lin\'an", href: "https://en.wikipedia.org/wiki/Lin\'an_District" }',
        '{ label: "維基百科・青山湖", href: "https://zh.wikipedia.org/wiki/%E9%9D%92%E5%B1%B1%E6%B9%96" }',
    ),
    # shen yuan
    (
        '{ label: "維基百科・陸游", href: "https://zh.wikipedia.org/wiki/%E9%99%B8%E6%B8%8A" }',
        '{ label: "維基百科・陸游", href: "https://zh.wikipedia.org/wiki/%E9%99%B8%E6%B8%B8" }',
    ),
    (
        '{ label: "Wikipedia (EN)", href: "https://en.wikipedia.org/wiki/Shen_Yuan" }',
        '{ label: "維基百科・紹興市", href: "https://zh.wikipedia.org/wiki/%E7%B4%B9%E8%88%88%E5%B8%82" }',
    ),
    # dishui
    (
        'href: "https://zh.wikipedia.org/wiki/%E6%BB%B4%E6%B0%B4%E6%B9%96"',
        'href: "https://zh.wikipedia.org/wiki/%E6%BB%B4%E6%B0%B4%E6%B9%96_(%E4%B8%8A%E6%B5%B7)"',
    ),
    # sun elephant
    (
        "喜來登熱球酒店（民間稱「月亮」）",
        "湖州喜來登溫泉度假酒店（民間稱「月亮酒店」）",
    ),
    (
        "大象酒店以大象造型超高層為城市辨識符，結構採用裝配式與綠色建築技術；太陽酒店球體臨水布置",
        "大象酒店以大象造型超高層為城市辨識符；太陽酒店球體臨水布置",
    ),
    (
        '{ label: "維基百科・湖州太湖旅遊度假區", href: "https://zh.wikipedia.org/wiki/%E6%B9%96%E5%B7%9E%E5%A4%AA%E6%B9%96%E6%97%85%E6%B8%B8%E5%BA%A6%E5%81%87%E5%8C%BA" }',
        '{ label: "維基百科・太湖", href: "https://zh.wikipedia.org/wiki/%E5%A4%AA%E6%B9%96" }',
    ),
    # nanxun
    ("園內魚沼飛梁式橋與荷池川西法洋樓並置，反映清末江南商賈兼採洋風裝飾的審美。", ""),
    # duoyun – no licensed Dishui branch photo
    (
        """    photos: [{ src: "photos/duoyun-1.jpg", alt: "朵雲書院書牆", credit: "Wikimedia Commons · CC BY-SA" }],
""",
        "",
    ),
    # lanting credit
    (
        'credit: "Gisling · CC BY-SA · https://commons.wikimedia.org/wiki/File:Zhuxi_Lanting.JPG"',
        'credit: "Gisling · CC BY 3.0 · https://commons.wikimedia.org/wiki/File:Lanting,_2021-04-17_01.jpg"',
    ),
    # nanhui credit
    (
        'credit: "Wikimedia Commons · CC BY-SA" }],\n    themes: [\n      { t: "長江口與杭州灣交會"',
        'credit: "Natuur12 · Public domain · https://commons.wikimedia.org/wiki/File:Donghai_Bridge.jpg" }],\n    themes: [\n      { t: "長江口與杭州灣交會"',
    ),
    # trim filler last sentences (theme bodies)
    (
        "元代《嘉興志》已述南湖與運河支流相通，近代浚淤與堤岸整治仍保留部分古堤走向，可供對照今日水陸分界。",
        "",
    ),
    (
        "南宋《臨安志》與《夢粱錄》均載茶宴禮節，點茶、分盞、鬥勝等程序後世成為茶道研究的重要史料。",
        "",
    ),
    (
        "上巳節俗在唐宋融入春遊踏青，修禊詩集亦影響日本「曲水宴」儀式，學界常以蘭亭敘事為東亞雅集史的起點之一。",
        "",
    ),
    (
        "若耶溪上游連接鑒湖系統，蘭亭一帶丘陵與溪谷為越人早期聚落帶，考古點曾出土先越時期陶器與農耕工具。",
        "",
    ),
    (
        "臨港店倚湖設大面玻璃與通高書架，營業形態接近書店加輕閱讀，是否設低消或預約參觀須以門市公告為準。",
        "滴水湖分店以通高書牆與閱讀階梯為空間主軸，選書與活動以世紀出版集團公開介紹為準。",
    ),
]

REPLACEMENTS_TR = [
    (
        'href: "https://muze.gov.tr/muze-detay?SectionId=MEV01&DistId=MRK"',
        'href: "https://muze.gov.tr/muze-detay?SectionId=MEV01&DistId=MEV"',
    ),
    (
        '{ label: "博物館官網", href: "https://muze.gov.tr/muze-detay?SectionId=MEV01&DistId=MEV" }',
        '{ label: "土耳其文化部・梅夫拉納博物館", href: "https://muze.gov.tr/muze-detay?SectionId=MEV01&DistId=MEV" }',
    ),
    (
        '{ label: "Wikipedia (EN)", href: "https://en.wikipedia.org/wiki/Sultan_Han" }\n    ]',
        '{ label: "Wikipedia (EN)", href: "https://en.wikipedia.org/wiki/Sultan_Han" },\n      { label: "維基百科・驛站", href: "https://zh.wikipedia.org/wiki/%E9%A9%BF%E7%AB%99" }\n    ]',
    ),
    (
        '{ label: "維基百科・伊斯坦堡（中文）", href: "https://zh.wikipedia.org/wiki/%E4%BC%8A%E6%96%AF%E5%9D%A6%E5%A0%A1" },\n      { label: "維基百科・伊斯坦堡", href: "https://zh.wikipedia.org/wiki/%E4%BC%8A%E6%96%AF%E5%9D%A6%E5%A0%A1" }',
        '{ label: "維基百科（中文）・香料市集", href: "https://zh.wikipedia.org/wiki/%E8%8D%89%E6%99%82%E5%B8%82%E9%9B%86" },\n      { label: "Wikipedia (EN)・Egyptian Bazaar", href: "https://en.wikipedia.org/wiki/Egyptian_Bazaar" }',
    ),
    (
        'credit: "Wikimedia Commons · CC BY-SA · https://commons.wikimedia.org/wiki/File:Tuz_G%C3%B6l%C3%BC_2.jpg"',
        'credit: "Hernández et al. · CC0 · https://commons.wikimedia.org/wiki/File:Lake_Tuz_Salt_flat_Turkey.jpg"',
    ),
    (
        'credit: "Wikimedia Commons · CC BY-SA 4.0 · https://commons.wikimedia.org/wiki/File:TR_Pamukkale_White_Terraces_asv2020-02_img16.jpg"',
        'credit: "A.Savin · FAL · https://commons.wikimedia.org/wiki/File:TR_Pamukkale_White_Terraces_asv2020-02_img16.jpg"',
    ),
    (
        'credit: "Wikimedia Commons · CC BY · https://commons.wikimedia.org/wiki/File:The_Roman_theatre,',
        'credit: "Carole Raddato · CC BY-SA 2.0 · https://commons.wikimedia.org/wiki/File:The_Roman_theatre,',
    ),
    (
        'credit: "Wikimedia Commons · CC BY-SA · https://commons.wikimedia.org/wiki/File:Bursa_Ulu_Camii_2007.jpg"',
        'credit: "Dosseman · CC BY-SA 3.0 · https://commons.wikimedia.org/wiki/File:Bursa_Ulu_Cami.jpg"',
    ),
    (
        '    learn: [\n      { label: "維基百科（中文）", href: "https://zh.wikipedia.org/wiki/%E5%B8%83%E7%88%BE%E8%96%A9" },\n      { label: "Wikipedia 大清真寺 (EN)", href: "https://en.wikipedia.org/wiki/Bursa_Grand_Mosque" },\n      { label: "維基百科・布爾薩", href: "https://zh.wikipedia.org/wiki/%E5%B8%83%E7%88%BE%E8%96%A9" }\n    ]',
        '    learn: [\n      { label: "Wikipedia (EN)・Grand Mosque", href: "https://en.wikipedia.org/wiki/Bursa_Grand_Mosque" },\n      { label: "維基百科（中文）・布爾薩", href: "https://zh.wikipedia.org/wiki/%E5%B8%83%E7%88%BE%E8%96%A9" },\n      { label: "維基百科・鄂圖曼帝國", href: "https://zh.wikipedia.org/wiki/%E9%84%A7%E5%9C%96%E6%9B%BC%E5%B8%9D%E5%9C%8B" }\n    ]',
    ),
]

for old, new in REPLACEMENTS_SH:
    if old not in sh:
        print("WARN missing SH:", old[:60])
    else:
        sh = sh.replace(old, new, 1)

for old, new in REPLACEMENTS_TR:
    if old not in tr:
        print("WARN missing TR:", old[:60])
    else:
        tr = tr.replace(old, new, 1)

SH.write_text(sh, encoding="utf-8")
TR.write_text(tr, encoding="utf-8")
print("places-data patched")