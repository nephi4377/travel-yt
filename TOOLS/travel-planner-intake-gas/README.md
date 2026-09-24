# Travel Planner Intake GAS

所有旅遊共用的「先記錄 → 後判定 → 再迭代」收件服務。

## GAS 專案名稱

建議使用：**Travel Planner Intake API**

## 綁定資料表

- Google Sheet：旅遊想法與費用管理
- Spreadsheet ID：`1PYxDgLT9y7QXCQG5vKztLgWI_jfqR8gJCxBCgms-QeI`
- 每趟旅遊一個工作頁，越新的旅程排越前面。
- 目前：
  - `2026-10 河內`
  - `2026-09 釜山`

## 核心設計

前端每次提交都必須帶：

- `trip_id`：例如 `2026-10-hanoi`
- `trip_sheet`：例如 `2026-10 河內`

GAS 不把任何旅程名稱寫死。它依 `trip_sheet` 找到對應工作頁，定位「想法 Inbox」區塊後，把新資料寫入第一個空白列。

## 接收內容

- submitter：提交者
- target_date：適用日期
- type：景點 / 餐飲 / 交通 / 住宿 / 行程 / 購物 / 費用 / 其他
- idea：文字想法
- url：來源網址
- attachment_name
- attachment_mime
- attachment_base64

附件會存入：
`Travel Planner Intake 附件/<trip_id>/`

工作頁只保存附件 URL。

## 狀態流程

`pending → accepted / candidate / rejected / need-review → processed`

原始提交不得被 AI 覆寫。排程只能新增：
- 判定
- 處理時間
- 備註
- 關聯項目
- 本趟處理紀錄

## 後續串接流程

1. 在 Google Apps Script 建立新專案：`Travel Planner Intake API`。
2. 貼入本資料夾的 `Code.gs`。
3. 部署為 Web App。
4. 取得 Web App URL。
5. 把 URL 寫入旅遊網站的共用設定。
6. 每個旅程頁的「＋新增想法」表單提交時，帶自己的 `trip_id` 與 `trip_sheet`。
7. GAS 先寫入對應旅程工作頁，狀態固定為 `pending`。
8. 每小時排程讀取 pending，查證後判定。
9. accepted 才修改 GitHub 的正式行程與手機頁；candidate/rejected/need-review 只更新狀態與理由。
10. 所有實際修改都同步追加到該旅程的「本趟處理紀錄」與 repo 迭代紀錄。

## 安全原則

- GitHub Pages 前端不可放 GitHub Token 或 Google 私密金鑰。
- Google Sheet 是想法、狀態與費用的持久資料源。
- GAS 是網站寫入 Sheet / Drive 的唯一入口。
- AI 排程不能改寫使用者原始提交。
