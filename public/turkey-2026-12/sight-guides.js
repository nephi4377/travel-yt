/* Merge spec §3.2 guide blocks into TURKEY_PLACES. */
(function () {
  var G = {
    hagia: {
      intro: "拜占庭主教堂遺址；行程為下車外觀拍照。若關閉或整修，可能改其他寺。",
      highlights: "圓頂、尖塔與歷史半島軸線",
      shots: ["圓頂與尖塔輪廓", "廣場遠景"],
      tips: ["尊重現場管制"]
    },
    blue: {
      intro: "鄂圖曼古典清真寺；行程入內參觀。",
      highlights: "六塔外觀與藍綠磁磚內飾",
      shots: ["庭院與宣禮塔", "廣場遠景"],
      tips: ["勿短褲／露肩", "女性備頭巾", "易穿脫的鞋", "尊重禱告空間"]
    },
    safranbolu: {
      intro: "UNESCO 鄂圖曼山城；長途後晚間抵民宿。",
      highlights: "木屋街景、石板巷與山城輪廓",
      shots: ["木屋街景", "石板巷"],
      tips: ["民宿無空調", "另備過夜小包"]
    },
    hidirlik: {
      intro: "番紅花城制高點；俯瞰紅瓦屋頂與山谷。",
      highlights: "山城全景與坡地聚落層次",
      shots: ["山城全景", "紅瓦屋頂層次"],
      tips: ["登高望遠即可，勿為機位拖團"]
    },
    anitkabir: {
      intro: "安卡拉國父陵墓；需安檢。",
      highlights: "勝利之路與紀念廣場",
      shots: ["廣場與建築線條"],
      tips: ["大型背包不宜", "隨身小包入內", "安靜尊重"]
    },
    tuz: {
      intro: "安納托利亞內陸鹽湖；下車拍照。",
      highlights: "粉白鹽地與季節水量變化",
      shots: ["鹽湖白晶"],
      tips: ["水量與鳥況因季節而異"]
    },
    ceramic: {
      intro: "阿瓦諾斯一帶陶瓷觀光工坊。",
      tips: ["不需要可不買"]
    },
    fairy: {
      intro: "火山凝灰岩奇岩區；風化錐岩與谷地。",
      highlights: "妖精煙囪、駱駝岩輪廓",
      shots: ["錐岩／駱駝岩輪廓"],
      tips: ["若整修可能改玫瑰谷等"]
    },
    uchisar: {
      intro: "烏奇希薩岩城；凝灰岩峰制高點，行程入內。",
      highlights: "岩城俯瞰與岩居聚落",
      shots: ["岩城俯瞰"],
      tips: []
    },
    sisters: {
      intro: "三姊妹岩；並立蕈狀岩柱，常見下車拍照點。",
      highlights: "三座並立蕈狀岩",
      shots: ["三姊妹岩"],
      tips: []
    },
    carpet: {
      intro: "手工地毯工廠參觀。",
      tips: ["不需要可不買"]
    },
    sultanhani: {
      intro: "塞爾柱商隊驛站；下車外觀。",
      highlights: "石造拱門與方院格局",
      shots: ["拱門／中庭"],
      tips: []
    },
    sille: {
      intro: "孔亞近郊石灰岩聚落；與梅夫拉納同日動線。",
      highlights: "石屋巷與宗教遺跡",
      shots: ["石屋巷"],
      tips: ["相對靜謐，尊重宗教氛圍"]
    },
    mevlana: {
      intro: "魯米陵墓與博物館；入內參觀。",
      highlights: "綠圓頂與塞爾柱建築群",
      shots: ["綠圓頂輪廓", "庭院立面"],
      tips: ["尊重宗教空間"]
    },
    pamukkale: {
      intro: "石灰棚梯田與希拉波里斯古城；須脫鞋步行。",
      highlights: "白鈣棚層與羅馬劇場遺址",
      shots: ["白棚層層", "劇場遺址"],
      tips: ["地面濕滑", "穿易脫鞋", "小心腳步"]
    },
    latex: {
      intro: "乳膠產品展示選購點。",
      tips: ["不需要可不買"]
    },
    ephesus: {
      intro: "希臘羅馬古城；面積大，跟團走重點。",
      highlights: "塞爾蘇斯圖書館立面與大劇場",
      shots: ["圖書館立面", "劇場"],
      tips: ["遮陽與補水"]
    },
    leather: {
      intro: "皮衣展示／秀場性質。",
      tips: ["不需要可不買"]
    },
    izmir: {
      intro: "康納克鐘樓與 Asansör 百年電梯塔。",
      highlights: "港區廣場與愛琴海視野",
      shots: ["鐘樓廣場", "電梯塔海景"],
      tips: ["天氣好時沿海景觀加分"]
    },
    ulu: {
      intro: "早期鄂圖曼大清真寺；入內參觀。",
      highlights: "多圓頂外觀與中庭噴泉",
      shots: ["多圓頂外觀", "內部書法"],
      tips: ["頭巾／長褲", "若關閉可能改其他寺"]
    },
    bosphorus: {
      intro: "團體包船遊海峽；不另售自費、不擠公共船。",
      highlights: "歐亞兩岸輪廓與沿岸夏宮",
      shots: ["歐亞兩岸輪廓"],
      tips: []
    },
    spice: {
      intro: "埃及市集（香料市集）；下車拍照後往機場。",
      highlights: "拱廊市集與香料色彩",
      shots: ["市集色彩一瞥"],
      tips: ["預留安檢與退稅緩衝", "趕機則勿久逛"]
    }
  };
  var P = window.TURKEY_PLACES || {};
  Object.keys(G).forEach(function (k) {
    if (P[k]) P[k].guide = G[k];
  });
})();
