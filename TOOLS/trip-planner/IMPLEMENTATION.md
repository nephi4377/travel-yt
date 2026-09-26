# AI Travel Planner V0.2 Prototype

2026-09-26 功能更新：網頁已改為具名地點可選、依區域與距離排出多日行程的離線規劃。請以 [OFFLINE-PLANNER.md](OFFLINE-PLANNER.md) 作為目前架構、啟動、完成狀態與限制的準確說明；以下為舊 mock 版的歷史紀錄。

2026-09-26 local preview recovery: The bundled localhost server now accepts both `/` and the previously shared `/TOOLS/trip-planner/prototype/` path, and serves prototype files without browser caching. This keeps existing browser tabs usable after restarting the server.

2026-09-23 provider contract update: `prototype/provider-contract.js` defines and checks the future dated Places/Routes day boundary: unique place IDs, coordinates, adjacent route endpoints, one to three options, currency, and four nonnegative cost dimensions. The existing mock builder does not claim these are real coordinates or routes. A future provider must pass this check before replacing mock data.

2026-09-23 browser walkthrough: Checked a three-day trip in the local browser, switched to day 2, previewed and applied a rain adjustment, and confirmed the replacement stop and cost caveat appear. Corrected the leg warning to cover routes both to and from the replacement stop.

2026-09-23 trip-total caveat update: When any day has a mock rain replacement, the full-trip transport estimate now carries a visible reminder that affected leg prices have not been recalculated, even while viewing another day.

2026-09-23 rain-adjustment clarity update: Transport legs next to a mock rain replacement now show a visible warning that their time and fare still come from the original stop and require recalculation. The leg data includes `estimateNeedsRecheck` for future Routes adapter handling.

2026-09-23 multi-day budget update: The active-day budget card now also shows the selected transport estimate for the entire trip against the sum of all daily limits. Changing any day's route or applying an adjustment recalculates this trip total.

2026-09-23 draft validation update: Restored session drafts now require a real calendar date, including leap-year checks. Invalid saved dates are discarded instead of producing broken day labels.

2026-09-22 budget message correction: The daily budget card now describes the currently selected transport combination after manual changes. Going over budget prompts another choice without claiming that every mock combination is unaffordable.

2026-09-22 explanation update: The selected route now shows a short, deterministic tradeoff explanation based on the available mock alternatives (lowest group fare, fastest duration, least walking, or a compromise). This describes visible data, not AI-generated rationale or verified real-world superiority.

2026-09-22 draft recovery update: The prototype now keeps the current trip, selected day, transport choices, and per-day mock adjustments in browser `sessionStorage`, so reloading the same tab restores the work. The draft is local to that browser tab and is removed when the user chooses "重新設定旅程"; it is not sent to a server or saved as an account profile.

2026-09-22 progressive disclosure update: Each transport leg now shows only its selected option by default; a comparison control reveals the remaining options (at most two). This restores the mobile-first disclosure rule in PRODUCT-SPEC.md while keeping manual choices and daily cost recalculation available.

2026-09-22 budget-aware routing update: On initial generation, the mock planner now evaluates all available route combinations per day and chooses the lowest TripDNA cost combination that fits the daily group transport budget. If none fits, it selects the cheapest available combination and visibly states that the mock options cannot meet the limit. Manual route changes are still allowed and update the total.

2026-09-22 destination safety update: Non-Busan destinations now render clearly generic demonstration stops instead of showing named Busan places under another city. Prices/routes remain KRW mock values, so this does not add genuine destination coverage.

2026-09-22 multi-day update: The browser now generates 1–6 distinct mock days, exposes day tabs, lets users choose each leg's transport option, and recalculates the selected day's group transport total. Natural-language mock adjustments apply only to the active day. This replaces the previous day-1-only display. The 6-day limit is intentional until more reliable content is available.

2026-09-22 hourly follow-up: Day 1 now shows the estimated total for the recommended transport choices against the entered daily group transport budget. This is a transparent comparison, not a hard budget constraint; route ranking remains driven by TripDNA. Later versions should optimize options across the whole day and enforce hard budget limits only after reliable route pricing is available.

## 啟動與查看

完全靜態、無需安裝依賴或 API key。進入 `TOOLS/trip-planner/prototype/` 後執行 `npm run dev`，開啟 `http://localhost:8000/`。請透過 HTTP 伺服器開啟；直接雙擊 HTML 可能因 ES modules 的瀏覽器安全限制失敗。示範伺服器只綁定本機 `127.0.0.1`，不對外開放。

## 架構與界線

- `prototype/index.html`：三階段手機優先互動 UI，必要條件與預覽式調整。
- `prototype/style.css`：獨立樣式，不引用或更動原網站。
- `prototype/engine.js`：純函式資料層；形容詞 → 十維 TripDNA、示範 POI/RouteOption、全團票價與四成本排序、簡單意圖解析。
- `prototype/planner.js`、`budget.js`：六天 mock 模板、交通排序與所選方案的全團費用計算。
- `prototype/app-v2.js`：多日 DOM 狀態與渲染。使用 `textContent` 呈現使用者輸入，沒有外部網路請求。`app.js` 保留為舊版參考，現已不由網頁載入。

未來替換 mock 時，Places adapter 回傳 `{id,name,time,note,priority}`，Routes adapter 回傳 `{mode,duration_min,estimated_cost,currency,walking_min,transfers,energy_score,friction_score}`；AI intent adapter 回傳 `{tired,rain,noMetro}` 或較完整的受約束變更提案。真實路線需由 Routes provider 提供站點對應，不能沿用 fallback 示例。API key 應只存在後端，不能放入此靜態前端。費用幣別、預算與旅程日期須由資料供應商校準。

## 已完成

形容詞複選、可見且可解釋的十維權重、目的地/日期/天數/人數/每日交通預算表單、1–6 天可切換的示範行程、每段至多三個可選交通方案與 Money/Time/Energy/Friction、每日所選交通費與預算差額、針對當天的自然語言調整入口與套用前預覽。計程車按整團、公共交通按人數計價。其餘既有 `public/` 與 Firebase 設定未更改。

## 限制與後續

目前僅有釜山的 6 天具名示例資料，其他城市僅顯示通用示範站點；超過 6 天尚不支援。日期、營業、路線、預訂、匯率、餐飲/住宿、真實 AI 與完整預算約束尚未串接。調整只辨識三類關鍵字，替換地點後仍使用原段 mock 交通，不能用於實際導航。具地點座標和日期的 provider 資料契約與測試已建立，但尚未接入現有 mock 流程。下一步：加入真實 Places/Routes 後端 adapter、可驗證的預算與硬性限制，以及更完整的 AI 解析。
