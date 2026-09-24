const CONFIG = {
  SPREADSHEET_ID: '1PYxDgLT9y7QXCQG5vKztLgWI_jfqR8gJCxBCgms-QeI',
  ROOT_ATTACHMENT_FOLDER_PROP: 'TRAVEL_INTAKE_ROOT_FOLDER_ID',
  SERVICE_NAME: 'travel-planner-intake'
};

function doGet() {
  return json_({ ok: true, service: CONFIG.SERVICE_NAME });
}

function doPost(e) {
  try {
    const payload = parsePayload_(e);
    const result = submitIdea_(payload);
    return json_(result);
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function submitIdea_(payload) {
  const tripId = String(payload.trip_id || '').trim();
  const tripSheet = String(payload.trip_sheet || '').trim();
  if (!tripId) throw new Error('缺少 trip_id');
  if (!tripSheet) throw new Error('缺少 trip_sheet');

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(tripSheet);
  if (!sheet) throw new Error('找不到旅程工作頁：' + tripSheet);
  if (/^系統/.test(tripSheet)) throw new Error('不可寫入系統工作頁');

  const idea = String(payload.idea || '').trim();
  const sourceUrl = String(payload.url || '').trim();
  if (!idea && !sourceUrl && !payload.attachment_base64) {
    throw new Error('至少要有想法、網址或附件');
  }

  const now = new Date();
  const id = makeId_(tripId, now);

  let attachmentUrl = '';
  let attachmentType = '';
  if (payload.attachment_base64) {
    const saved = saveAttachment_(payload, tripId, id);
    attachmentUrl = saved.url;
    attachmentType = saved.type;
  }

  const inbox = findSection_(sheet, '想法 Inbox');
  if (!inbox) throw new Error('旅程工作頁缺少「想法 Inbox」區塊');

  const headerRow = inbox.headerRow + 1;
  const startRow = headerRow + 1;
  const stop = findSection_(sheet, '本趟處理紀錄');
  const endRow = stop ? stop.headerRow - 1 : Math.min(sheet.getMaxRows(), startRow + 99);
  const targetRow = firstEmptyRow_(sheet, startRow, endRow, 1);
  if (!targetRow) throw new Error('想法 Inbox 已滿，請增加預留列');

  // 欄位：
  // A ID / B建立時間 / C提交者 / D適用日期 / E類型 / F想法內容 /
  // G來源網址 / H附件網址 / I附件類型 / J狀態 /
  // K判定處理結果 / L處理時間 / M備註 / N關聯項目
  sheet.getRange(targetRow, 1, 1, 14).setValues([[
    id,
    now,
    String(payload.submitter || '未署名'),
    normalizeDate_(payload.target_date),
    normalizeType_(payload.type),
    idea,
    sourceUrl,
    attachmentUrl,
    attachmentType,
    'accepted',
    '',
    '',
    '',
    ''
  ]]);

  return {
    ok: true,
    id,
    trip_id: tripId,
    trip_sheet: tripSheet,
    status: 'accepted',
    attachment_url: attachmentUrl
  };
}

function findSection_(sheet, keyword) {
  const max = Math.min(sheet.getLastRow() || 1, 150);
  const values = sheet.getRange(1, 1, max, 1).getDisplayValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0] || '').indexOf(keyword) >= 0) {
      return { headerRow: i + 1 };
    }
  }
  return null;
}

function firstEmptyRow_(sheet, startRow, endRow, idColumn) {
  if (endRow < startRow) return null;
  const vals = sheet.getRange(startRow, idColumn, endRow - startRow + 1, 1).getDisplayValues();
  for (let i = 0; i < vals.length; i++) {
    if (!String(vals[i][0] || '').trim()) return startRow + i;
  }
  return null;
}

function saveAttachment_(payload, tripId, id) {
  const root = getRootAttachmentFolder_();
  const tripFolder = getOrCreateChildFolder_(root, safeName_(tripId));
  const mime = String(payload.attachment_mime || 'application/octet-stream');
  const name = String(payload.attachment_name || (id + '-attachment'));
  const raw = String(payload.attachment_base64 || '').replace(/^data:[^;]+;base64,/, '');
  const bytes = Utilities.base64Decode(raw);
  const blob = Utilities.newBlob(bytes, mime, name);
  const file = tripFolder.createFile(blob);
  return { url: file.getUrl(), type: mime };
}

function getRootAttachmentFolder_() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty(CONFIG.ROOT_ATTACHMENT_FOLDER_PROP);
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (_) {}
  }
  const folder = DriveApp.createFolder('Travel Planner Intake 附件');
  props.setProperty(CONFIG.ROOT_ATTACHMENT_FOLDER_PROP, folder.getId());
  return folder;
}

function getOrCreateChildFolder_(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function makeId_(tripId, now) {
  const stamp = Utilities.formatDate(now, 'Asia/Taipei', 'yyyyMMdd-HHmmss');
  const slug = String(tripId).replace(/[^a-zA-Z0-9-]/g, '').slice(0, 20) || 'trip';
  return slug.toUpperCase() + '-' + stamp + '-' + Math.floor(Math.random() * 900 + 100);
}

function normalizeDate_(v) {
  return String(v || '不指定').trim() || '不指定';
}

function normalizeType_(v) {
  const allowed = ['景點','餐飲','交通','住宿','行程','購物','費用','其他'];
  return allowed.indexOf(v) >= 0 ? v : '其他';
}

function safeName_(s) {
  return String(s).replace(/[\\/:*?"<>|]/g, '-').slice(0, 80);
}

function parsePayload_(e) {
  if (e && e.postData && e.postData.contents) {
    const type = String(e.postData.type || '');
    if (type.indexOf('application/json') >= 0) return JSON.parse(e.postData.contents);
  }
  return (e && e.parameter) ? e.parameter : {};
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
