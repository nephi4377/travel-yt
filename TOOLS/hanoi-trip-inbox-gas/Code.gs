const CONFIG = {
  SPREADSHEET_ID: '1PYxDgLT9y7QXCQG5vKztLgWI_jfqR8gJCxBCgms-QeI',
  INBOX_SHEET: '想法Inbox',
  LOG_SHEET: '處理紀錄',
  TRIP_ID: '2026-10-hanoi',
  ATTACHMENT_FOLDER_PROP: 'HANOI_INBOX_FOLDER_ID'
};

function doGet(e) {
  return json_({ ok: true, service: 'hanoi-trip-inbox', trip_id: CONFIG.TRIP_ID });
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
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.INBOX_SHEET);
  if (!sheet) throw new Error('找不到想法Inbox分頁');

  const now = new Date();
  const id = 'HN-' + Utilities.formatDate(now, 'Asia/Taipei', 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random()*900+100);
  const idea = String(payload.idea || '').trim();
  const sourceUrl = String(payload.url || '').trim();
  if (!idea && !sourceUrl && !payload.attachment_base64) throw new Error('至少要有想法、網址或附件');

  let attachmentUrl = '';
  let attachmentType = '';
  if (payload.attachment_base64) {
    const saved = saveAttachment_(payload, id);
    attachmentUrl = saved.url;
    attachmentType = saved.type;
  }

  sheet.appendRow([
    id,
    now,
    CONFIG.TRIP_ID,
    String(payload.submitter || '未署名'),
    normalizeDate_(payload.target_date),
    normalizeType_(payload.type),
    idea,
    sourceUrl,
    attachmentUrl,
    attachmentType,
    'pending',
    '',
    '',
    ''
  ]);

  return { ok:true, id:id, status:'pending', attachment_url:attachmentUrl };
}

function saveAttachment_(payload, id) {
  const folder = getAttachmentFolder_();
  const mime = String(payload.attachment_mime || 'application/octet-stream');
  const name = String(payload.attachment_name || (id + '-attachment'));
  const bytes = Utilities.base64Decode(String(payload.attachment_base64).replace(/^data:[^;]+;base64,/, ''));
  const blob = Utilities.newBlob(bytes, mime, name);
  const f = folder.createFile(blob);
  return { url:f.getUrl(), type:mime };
}

function getAttachmentFolder_() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty(CONFIG.ATTACHMENT_FOLDER_PROP);
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (_) {}
  }
  const folder = DriveApp.createFolder('2026 河內行程 Inbox 附件');
  props.setProperty(CONFIG.ATTACHMENT_FOLDER_PROP, folder.getId());
  return folder;
}

function parsePayload_(e) {
  if (e && e.postData && e.postData.contents) {
    const type = String(e.postData.type || '');
    if (type.indexOf('application/json') >= 0) return JSON.parse(e.postData.contents);
  }
  return (e && e.parameter) ? e.parameter : {};
}

function normalizeDate_(v) {
  const allowed = ['不指定','10/6','10/7','10/8','10/9'];
  return allowed.indexOf(v) >= 0 ? v : '不指定';
}

function normalizeType_(v) {
  const allowed = ['景點','餐飲','交通','住宿','行程','購物','其他'];
  return allowed.indexOf(v) >= 0 ? v : '其他';
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
