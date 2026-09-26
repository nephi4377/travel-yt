# V0.2 全球城市搜尋版（目前網頁入口）

2026-09-27 local request coordination: the bundled localhost server can now proxy the explicitly clicked Nominatim city/place/object searches through one process-wide 1.1-second queue with short bounded memory caching and validation. This removes the per-tab-only throttle as the sole defense for local multi-tab use. The existing static preview still works directly, and a port-8000 server started before this change must be restarted to enable the proxy. Neither mode is a production-scale worldwide POI backend. Port-8001 API and browser searches were verified, then the temporary test server was stopped.

2026-09-27 daily start time: the condition form now exposes a bounded, editable start time used to calculate every day's displayed stop times. The TripDNA words `不想早起` and `緊湊` suggest 11:30 and 09:00 respectively until the traveler sets their own time; manual choice wins. A local-browser one-day Paris/Eiffel walkthrough confirmed the chosen 08:15 appears in the itinerary. This is an intended schedule only, not a live opening-hour or routing check.

2026-09-27 route verification: each displayed walking, transit or vehicle candidate now links to the same leg in Google Maps with that travel mode preselected. The URL does not perform an in-app API call or confirm the app's time estimate, fare, service availability or accessibility; the traveler checks the external result. Driving mode is not a taxi quote. A two-stop Paris itinerary confirmed distinct transit and driving links in the local browser.

2026-09-27 city fallback usability: the secondary OSM city search is an explicit option both when the primary source fails or finds nothing and when its returned list does not contain the intended city. Identical nearby OSM city records are merged for display, while distant namesakes remain available; semicolon-separated multilingual region/country aliases are shown as one label. The local browser verified a no-result primary state, then a Paris primary result with an explicit OSM alternative. It is still one user-triggered lookup, never automatic bulk geocoding.

2026-09-26 object-link fallback: when a known place is missing from name search, a user may paste its official OpenStreetMap node/way/relation URL. The page explicitly checks that one object through Nominatim Lookup, validates a supported named travel feature and a distance of at most 120 km from the chosen city, then adds it to the selected catalog. The lookup is cached for the browser session and locally throttled. This improves user-guided inclusion but is not a global search index; a map-view URL is not an object URL. Browser-tested with the Eiffel Tower OSM way while nearby Overpass discovery failed.

2026-09-26 extension: the selected-city screen also offers an explicit named-place search through public Nominatim, bounded around the city (approximately 40 km rather than the initial 6-km nearby list). Users choose a returned OSM feature before it joins the candidate list. If Overpass nearby discovery times out, this path remains available. Results can include similarly named venues within a landmark, so users must check the visible type, position, source link, and current access/opening details. This is a low-volume local prototype only; see [RESEARCH-LOG.md](RESEARCH-LOG.md) for provider usage restrictions.

2026-09-26 scope expansion: if a named-place lookup has no match, an explicit “擴大範圍再查一次” action offers a wider city-biased search. It does not run automatically, and only same-name results within 120 km of the chosen city are eligible. Search coverage remains incomplete; users should verify the OSM source and current visitor details.

2026-09-26 city reliability: successful city searches are cached for the current browser session for 24 hours. If Open-Meteo city lookup returns an error such as HTTP 429, users can explicitly try a separate OpenStreetMap city search and choose from its city/country candidates. This does not turn the public Nominatim service into a production geocoder; no automatic fallback request or autocomplete is performed.

2026-09-26 TripDNA coverage: OSM-mapped dining and shopping types are now sampled in the existing nearby query, and a small category reserve prevents them from being crowded out of the 60-place list. Food, shopping, and family interests can rank matching dining, shopping, zoo or theme-park places higher; nature and depth remain supported. A preference match means only that the OSM feature type aligns with the chosen interest—not that the venue is good, open, affordable or suitable for a particular child. If nearby discovery fails, users can add a real named place and see the same evidence-based reason.

2026-09-26 route check: every leg offers a deliberate, one-leg OSRM car-road lookup. Its returned distance and pure driving time appear below the estimated transport options with an OSRM/OpenStreetMap attribution link. The route lookup is session-cached and throttled, with no automatic multi-leg traffic. It does not verify transit, taxi availability, traffic, wait time or fare. The existing three-option comparison and schedule continue to use the separate distance model until those costs can be sourced consistently. The public demo service is limited to low-volume local evaluation.

2026-09-26 itinerary editing: after generating a trip, each stop can be moved earlier/later on its day or transferred to another day. The interface enforces 1–4 selected stops per day, recalculates the affected distance-model legs, and keeps the arrangement in session storage. Manual edits clear provisional weather/fatigue adjustments and selected transport options; these are not verified bookings.

2026-09-26 loading behavior: after city selection the named-place search is immediately usable. The nearby Overpass request continues in the background and, if it succeeds, merges results without removing user-added named places or their selections. If it fails, named search and itinerary generation remain available.

2026-09-26 editing behavior: changing date, travelers, budget, or TripDNA words after manually ordering stops retains the itinerary when the chosen city, number of days, and selected place set stay the same. If the preference words changed, provisional transport selections reset; a changed city/day count/place set regenerates the arrangement. Draft loading validates the saved assignment before displaying it.

使用者不必先選釜山。開啟 `prototype/` 後，選旅行形容詞、搜尋世界各地城市／地區、挑選正確國家，再查詢城市中心附近的具名景點，勾選後產生 1–6 天行程。已在瀏覽器實際查到河內的地點並排出三日行程，也查到巴黎的城市候選。`catalog.js`、`app-v3.js` 及 `OFFLINE-PLANNER.md` 是先前釜山離線版本的歷史資料，現行入口為 `index.html` → `app-v4.js`。

## 啟動與驗證

在 `TOOLS/trip-planner/prototype/` 執行 `npm run dev`，開啟 `http://localhost:8000/TOOLS/trip-planner/prototype/`；測試執行 `npm test`。需要網路，但不需要 API key 或付費服務。伺服器只綁定 `127.0.0.1`；本版本不應直接公開部署。

## 資料與流程

1. `world-data.js`：按下搜尋才呼叫 [Open-Meteo Geocoding](https://open-meteo.com/en/docs/geocoding-api)，取全球城市候選與座標；使用者選定候選後，單次向 [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) 查詢中心 6 公里內具名的 OpenStreetMap 景點、博物館、歷史地點與公園。查詢設 25 秒上限，各類型分別設小型結果上限（合計最多 110 筆），前端顯示最多 60 筆，並以同分頁快取減少重複請求。優先顯示有百科／網站等資料的地點，不代表人氣排行。
2. `world-planner.js`：只使用查到且由使用者勾選的地點；依地理距離分成多日，每天 1–4 個。顯示來源地圖、粗估時段、最多三種交通候選及 Time/Energy/Friction。Money 明確標「待查」，預算僅記錄，不將釜山韓元假票價套到其他國家。附逐段實際路線查詢連結。
3. `app-v4.js`：手機優先三步 UI、TripDNA 權重、目的地候選、地點篩選與勾選、切換日期／交通、簡單雨天和體力調整，以及同分頁草稿。初始勾選盡量涵蓋多種地點類型；「自然／深度」等詞會影響候選類型順序。外部資料只用 `textContent` 呈現，避免插入 HTML。

## 限制與正式化路線

- 目前是「全球城市中心附近可查」，不是全球所有景點完整目錄；偏遠地區、資料稀疏區、道路與營業資訊可能缺漏，公共 API 也可能暫時失敗。其他地點不會以虛構名稱補足。
- Open-Meteo 免費端點限非商業原型且無可用性保證；公共 Overpass 供低流量測試，不能當大規模正式產品的後端。遵守[公開實例使用建議](https://wiki.openstreetmap.org/wiki/Overpass_API)，只在使用者主動選城後查詢、快取、不做系統性批次擷取。網站保留 Open-Meteo/GeoNames 與 © OpenStreetMap contributors 署名。正式上線前須改用可承載流量且條款允許的自架或授權資料供應商。
- 交通候選並非可行路線保證；無全球統一票價、班次、開放時間和訂位資料。若要完成可執行旅行計畫，下一階段需接授權 Places/Routes/Transit 與價格來源，後端以 `provider-contract.js` 驗證，並加入地點評分、跨區域／跨城市路線、硬性預算和 AI 意圖解析。API key 必須留在後端。
