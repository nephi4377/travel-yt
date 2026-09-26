# V0.2 可操作離線規劃（目前版本）

舊的六天 mock 模板仍保留在 `prototype/planner.js` 作為歷史參考，但網頁入口已改用 `app-v3.js`、`catalog.js`、`offline-planner.js`，不再載入該模板。`IMPLEMENTATION.md` 下方多數 2026-09-22/23 記錄描述舊版，不代表目前畫面。

## 啟動

在 `TOOLS/trip-planner/prototype/` 執行 `npm run dev`，打開 `http://localhost:8000/TOOLS/trip-planner/prototype/` 或 `http://localhost:8000/`。不需安裝依賴、不需 API key。驗證：`npm test`。伺服器只綁定 127.0.0.1。

## 已可操作

- 選擇旅行形容詞並查看 TripDNA 十維權重。
- 填目的地、日期、1–6 天、人數、全團每日交通預算；勾選想去的釜山地點。只接受釜山／Busan，其他城市不產生假景點。
- 依所選地點的區域與距離分配多日路線；每一天可切換查看具名站點、建議時段、停留時間、地圖連結。修改條件會重排。
- 相鄰站點以座標距離產生最多三種交通粗估，顯示 Money/Time/Energy/Friction、全團當日與全程交通粗估；選另一交通會即時更新費用與後續時段。5 人以上計程車按每車最多 4 人估算。
- 「下雨」可用 4 公里內、未排入的具名室內地點替換戶外站點；「累了／少走路」刪除當天最後一站並排除純步行方案。先預覽後套用。重新整理同分頁可復原暫存草稿。

## 架構與下一步

`catalog.js` 是可替換的本機 Places 資料；`offline-planner.js` 是純函式排程／交通估算；`app-v3.js` 只負責 UI 與同分頁狀態；`provider-contract.js` 是未來 Places/Routes API 的驗證邊界。未修改既有 `public/` 或部署設定。

地點座標來自 repo 既有釜山地圖種子；營業、票價、班次、道路、交通能否直達均未即時驗證。公車和計程車數字是固定假設加距離公式，不是可使用的報價／導航；地圖連結僅供自行核對。調整入口是關鍵字規則，不是真實 AI；尚無住宿、餐食、訂位、跨城市與多語系。下一步是串接經授權且可靠的 Places/Routes 後端，將提供者資料經 `provider-contract.js` 驗證，再加上更細緻的意圖解析與營業時間／硬性預算約束。API key 不可放在靜態前端。
