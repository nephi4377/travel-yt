# Hanoi Trip Inbox GAS

用途：2026/10 河內行程專用的「先記錄、後判定、再迭代」收件服務。

## 已綁定 Sheet

- 名稱：2026 河內行程想法 Inbox
- Spreadsheet ID：`1PYxDgLT9y7QXCQG5vKztLgWI_jfqR8gJCxBCgms-QeI`
- trip_id：`2026-10-hanoi`

## 接收欄位

- submitter：提交者
- target_date：不指定 / 10/6 / 10/7 / 10/8 / 10/9
- type：景點 / 餐飲 / 交通 / 住宿 / 行程 / 購物 / 其他
- idea：文字想法
- url：來源網址
- attachment_name：附件檔名
- attachment_mime：MIME type
- attachment_base64：base64 內容

附件第一次收到時會自動在 Google Drive 建立：
`2026 河內行程 Inbox 附件`

## 狀態流程

`pending → accepted / candidate / rejected / need-review → processed`

原始提交內容不得被 AI 覆寫；AI 只寫判定、處理時間、備註與處理紀錄。

## Google 端一次性設定

1. 建立新的 Apps Script 專案：`Hanoi Trip Inbox API`
2. 把 `Code.gs` 貼入。
3. 部署 → 新增部署作業 → 類型「網頁應用程式」。
4. 執行身分：自己。
5. 存取權依實際需要設定；若旅行頁要免登入直接送出，需要允許可存取該 Web App 的對象。
6. 將部署後的 Web App URL 寫回網站設定，再接上 `public/hanoi/` 的提交表單。

## 安全原則

- GitHub Pages 前端不得放 GitHub Token 或 Google 私密金鑰。
- Sheet 是原始 Inbox / 狀態資料源。
- GAS 是唯一寫入入口。
- 附件存 Drive，Sheet 只留附件 URL。
