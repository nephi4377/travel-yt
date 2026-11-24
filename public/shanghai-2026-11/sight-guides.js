/* Merge spec §3.2 guide blocks into SHANGHAI_PLACES (intro / 看點 / 建議拍照 / 提醒). */
(function () {
  var G = {
    nanhu: {
      intro: "江南名湖；團含遊船。煙雨樓與湖心島園林為常見看點。",
      highlights: "湖面與堤柳、湖心島園林",
      shots: ["船上湖面", "島上亭廊"],
      tips: ["不為網紅機位脫隊"]
    },
    jingshan: {
      intro: "餘杭千年古剎；秋冬常見殿前銀杏。",
      highlights: "青瓦白牆殿宇與山林寺院格局",
      shots: ["寺門銀杏落葉", "石階與殿簷"],
      tips: ["尊重寺院禮儀", "不大聲錄影擋路"],
      pending: "葉況待確認"
    },
    qingshan: {
      intro: "臨安水上森林，團安排船遊。",
      highlights: "樹與水面層次",
      shots: ["船側樹列", "碼頭棧道"],
      tips: ["防風防滑", "勿為空景拖團"],
      pending: "葉況不保證"
    },
    keyan: {
      intro: "千年採石遺跡；天工大佛、雲骨等石景為主線。",
      highlights: "石壁尺度、魯鎮主題街、倉橋河岸",
      shots: ["石壁尺度", "河埠廊簷"],
      tips: ["魯鎮主題街一眼即可", "少排演員合影"]
    },
    lanting: {
      intro: "《蘭亭序》相關園林；曲水流觴、碑亭。",
      highlights: "曲水流觸與碑林",
      shots: ["曲水岸", "碑亭／竹影"],
      tips: ["不必追劇情打卡清單"]
    },
    shenyuan: {
      intro: "紹興古典園林；題刻與水岸節奏為主。",
      highlights: "園林池岸與廊影",
      shots: ["廊影", "池水"],
      tips: ["不必追劇情清單"]
    },
    yanguan: {
      intro: "潮樂之城古城；潮牆、北門潮集、御碼頭。",
      highlights: "古城街巷與潮文化空間",
      shots: ["潮牆水幕", "御碼頭夜景"],
      tips: ["觀潮聽安全指示", "不脫隊追網紅機位"],
      pending: "潮況待確認"
    },
    nanxun: {
      intro: "江南絲商古鎮；嘉業堂、小蓮莊、搖櫓船。",
      highlights: "百間樓河岸、藏書樓與園林",
      shots: ["百間樓", "石橋倒影", "船過橋洞"],
      tips: ["選 1–2 處深看", "景區小吃排過久就換點"]
    },
    sunElephant: {
      intro: "湖州南潯一帶現代地標建築夜景；跟團看完即回。",
      highlights: "太陽與大象造型建築輪廓",
      shots: ["夜景輪廓"],
      tips: ["看完即回，不另開夜場"],
      pending: "觀景動線待現場確認",
      photosPending: true
    },
    gongqing: {
      intro: "上海市區近郊森林公園，適合短走秋色林道。",
      highlights: "林蔭道與季節葉相",
      shots: ["林蔭道", "秋葉鋪地"],
      pending: "葉況不保證"
    },
    dishui: {
      intro: "臨港圓湖度假區；環湖曲線與海風。",
      highlights: "環湖步道與湖岸天際",
      shots: ["環湖曲線", "暮色燈帶"],
      tips: ["臨港名店選擇較少"]
    },
    duoyun: {
      intro: "滴水湖片區公共文化書店；書牆短停即可。",
      highlights: "通高書牆與閱讀階梯",
      shots: ["書牆全景"],
      tips: ["勿為拍照占位過久"]
    },
    nanhui: {
      intro: "浦東最南端觀海點；長江口與杭州灣水域交會。",
      highlights: "海堤棧道與燈塔造型雕塑",
      shots: ["堤岸線", "東海大橋遠景"],
      tips: ["海水常偏濁，心理預期觀交匯而非清水沙灘"]
    },
    coke: {
      intro: "可口可樂品牌體驗館；短停互動展即可。",
      highlights: "品牌展陳與互動區",
      tips: ["行程點，不需要可不進"],
      photosPending: true
    }
  };
  var P = window.SHANGHAI_PLACES || {};
  Object.keys(G).forEach(function (k) {
    if (P[k]) P[k].guide = G[k];
  });
})();