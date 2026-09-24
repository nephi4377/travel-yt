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

`accepted（預設） / candidate / rejected / need-review → processed`

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
7. GAS 先寫入對應旅程工作頁，狀態預設為 `accepted`。
8. 每小時排程讀取尚未處理的 accepted，查證後判定。
9. accepted 才修改 GitHub 的正式行程與手機頁；candidate/rejected/need-review 只更新狀態與理由。
10. 所有實際修改都同步追加到該旅程的「本趟處理紀錄」與 repo 迭代紀錄。

## 安全原則

- GitHub Pages 前端不可放 GitHub Token 或 Google 私密金鑰。
- Google Sheet 是想法、狀態與費用的持久資料源。
- GAS 是網站寫入 Sheet / Drive 的唯一入口。
- AI 排程不能改寫使用者原始提交。
- **不加 passphrase／LINE bot**；維持公開簡易收件，靠截止日關閉寫入。

## 上傳截止政策（2026-09-24）

- **時區：`Asia/Taipei`**
- **最後可上傳日：`2026-10-10`（含當日整天）**
- **自 `2026-10-11 00:00`（台北）起**：`doPost` 拒寫，回傳明確錯誤 JSON（`code: INTAKE_CLOSED`）
- 截止後仍可瀏覽旅程頁；前端隱藏／停用送出與檔案上傳，並顯示「10/10 後已關閉上傳，只能查看」
- 前端用同規則做即時 UX；**伺服器仍強制執行**（不可只靠前端）

錯誤回應範例：

```json
{
  "ok": false,
  "code": "INTAKE_CLOSED",
  "error": "想法上傳已於 2026-10-10（Asia/Taipei）結束；目前僅供查看。",
  "cutoff_date": "2026-10-10",
  "timezone": "Asia/Taipei"
}
```

### 重新部署 GAS（改 `Code.gs` 後）

1. 開啟 Apps Script 專案 **Travel Planner Intake API**
2. 貼上／同步本資料夾最新 `Code.gs`
3. **部署 → 管理部署 → 編輯（鉛筆）→ 版本選「新版本」→ 部署**
4. 確認 Web App URL 與 `public/hanoi/index.html` 的 `INTAKE_API` 一致（通常同一部署 URL 不變）
5. 用瀏覽器 GET 該 URL，應看到 `intake_open`／`cutoff_date` 欄位

## 採納原則（2026-09-24 更新）

- 使用者從旅遊頁送出的新想法，預設狀態直接寫入 `accepted`。
- 排程的任務不是重新審批，而是查證、整理、決定放入哪一天／哪個備案區，以及同步修改正式行程與網頁。
- 只有下列情況才改成 `need-review`：
  - 與已確認事實衝突。
  - 會大幅重排行程或犧牲核心行程。
  - 來源可信度不足或資訊互相矛盾。
  - 涉及明顯額外大額費用、取消既有付款、重大交通／住宿變更。
- 一般的小調整直接做，不需要逐筆詢問。
