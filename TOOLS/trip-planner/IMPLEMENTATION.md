# AI Travel Planner V0.2 Prototype

2026-09-22 hourly follow-up: Day 1 now shows the estimated total for the recommended transport choices against the entered daily group transport budget. This is a transparent comparison, not a hard budget constraint; route ranking remains driven by TripDNA. Later versions should optimize options across the whole day and enforce hard budget limits only after reliable route pricing is available.

## 啟動與查看

完全靜態、無需安裝依賴或 API key。進入 `TOOLS/trip-planner/prototype/` 後執行 `npm run dev`，開啟 `http://localhost:8000/`。請透過 HTTP 伺服器開啟；直接雙擊 HTML 可能因 ES modules 的瀏覽器安全限制失敗。示範伺服器只綁定本機 `127.0.0.1`，不對外開放。

## 架構與界線

- `prototype/index.html`：三階段手機優先互動 UI，必要條件與預覽式調整。
- `prototype/style.css`：獨立樣式，不引用或更動原網站。
- `prototype/engine.js`：純函式資料層；形容詞 → 十維 TripDNA、示範 POI/RouteOption、全團票價與四成本排序、簡單意圖解析。
- `prototype/app.js`：DOM 狀態與渲染。使用 `textContent` 呈現使用者輸入，沒有外部網路請求。

未來替換 mock 時，Places adapter 回傳 `{id,name,time,note,priority}`，Routes adapter 回傳 `{mode,duration_min,estimated_cost,currency,walking_min,transfers,energy_score,friction_score}`；AI intent adapter 回傳 `{tired,rain,noMetro}` 或較完整的受約束變更提案。真實路線需由 Routes provider 提供站點對應，不能沿用 fallback 示例。API key 應只存在後端，不能放入此靜態前端。費用幣別、預算與旅程日期須由資料供應商校準。

## 已完成

形容詞複選、可見且可解釋的十維權重、目的地/日期/天數/人數/每日交通預算表單、第 1 天示範行程、每段至多三個交通方案與 Money/Time/Energy/Friction、自然語言入口與套用前預覽。計程車按整團、公共交通按人數計價。其餘既有 `public/` 與 Firebase 設定未更改。

## 限制與後續

目前僅有釜山示例資料，其他城市仍顯示釜山模板並警告；僅產生第 1 天，天數暫只作旅程摘要。日期、營業、路線、預訂、匯率、餐飲/住宿、真實 AI 與完整預算約束尚未串接。調整只辨識三類關鍵字，替換站點交通使用示範 fallback，不能用於實際導航。下一步：建立具地點座標和日期的資料契約與測試，加入真實 Places/Routes 後端 adapter、可驗證的預算與硬性限制，再擴充多日規劃與 AI 解析。
