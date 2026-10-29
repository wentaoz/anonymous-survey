/**
 * 匿名意见箱 · 只往表格追加一行。
 * 不要 Logger.log(e)，不要把 IP / UA / 邮箱写进表。
 *
 * 部署：扩展程序 → Apps Script → 部署 → 新建部署 → 网页应用
 *   执行身份：我
 *   具有访问权限的用户：任何人
 */
var EXPECTED_TOKEN = "anon-box-w7k3";

function doPost(e) {
  try {
    var p = parseParams_(e);
    if (p.website) return json_({ ok: true });
    if (p.token !== EXPECTED_TOKEN) return json_({ ok: false });

    var message = String(p.message || "").replace(/\s+$/g, "").slice(0, 4000);
    if (message.length < 10) return json_({ ok: false });

    var category = allow_(p.category, ["建议", "问题", "吐槽", "认可", "其他"], "其他");
    var impact = allow_(p.impact, ["", "不急", "有点影响", "已经卡住"], "");

    var sheet = ensureSheet_();
    sheet.appendRow([
      Utilities.getUuid(),
      Utilities.formatDate(new Date(), "Etc/UTC", "yyyy-MM-dd"),
      category,
      impact,
      message,
    ]);

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false });
  }
}

function doGet() {
  return json_({ ok: true, service: "anonymous-survey" });
}

function parseParams_(e) {
  var p = {};
  if (e && e.parameter) {
    p.website = e.parameter.website || "";
    p.token = e.parameter.token || "";
    p.category = e.parameter.category || "";
    p.impact = e.parameter.impact || "";
    p.message = e.parameter.message || "";
  }
  if (e && e.postData && e.postData.type === "application/json" && e.postData.contents) {
    var j = JSON.parse(e.postData.contents);
    p.website = p.website || j.website || "";
    p.token = p.token || j.token || "";
    p.category = p.category || j.category || "";
    p.impact = p.impact || j.impact || "";
    p.message = p.message || j.message || "";
  }
  return p;
}

function ensureSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("responses");
  if (!sheet) sheet = ss.insertSheet("responses");
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["id", "day", "category", "impact", "message"]);
    sheet.getRange(1, 1, 1, 5).setFontWeight("bold");
  }
  return sheet;
}

function allow_(value, list, fallback) {
  var v = String(value || "");
  for (var i = 0; i < list.length; i++) {
    if (list[i] === v) return v;
  }
  return fallback;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
