/**
 * 🗄️ V-TOTAL MASTER v3.202 서버 (타임존 오류 원천 차단 및 중복 생성 영구 방지)
 */

const STRATEGY_COL_OFFSET = {
  "1M": 0,
  "2M3D2(1.0)": 0,
  "2M3D1-1P": 0,
  "2M3D2(1.2)": 0,   
  "2M3D2(2.0)": 0,    
  "2M3D2(2.1)": 0,
  "3M3D1-R": 0       
};

function doGet(e) {
  try {
    var action = e.parameter.action;
    var userId = (e.parameter.id || "admin").toString().trim();

    if (action === "GET_MY_PERF") {
      var sheetName = "LOG_" + userId; 
      var sheetData = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
      
      if (!sheetData) {
        return ContentService.createTextOutput(JSON.stringify({ 
          status: "error", message: "시트 '" + sheetName + "'를 찾을 수 없습니다." 
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      function fetchSlotData(startCol) {
        var lastRow = sheetData.getLastRow();
        if (lastRow < 129) return null;

        var startRow = 129; // 사용자의 요청에 따라 정확히 129행부터 읽기 시작
        var numRows = lastRow - startRow + 1;
        if (numRows <= 0) return null;

        var range = sheetData.getRange(startRow, startCol, numRows, 4).getValues();
        var dateDisplay = sheetData.getRange(startRow, startCol, numRows, 1).getDisplayValues();
        
        var lastJson = "{}";
        var logsData = [];

        for (var i = 0; i < range.length; i++) {
          if (range[i][0] || dateDisplay[i][0]) { 
            logsData.push([
              dateDisplay[i][0], 
              range[i][1], 
              range[i][2], // ⭐️ 0 대신 실제 시트의 D열(입출금) 값을 전달
              range[i][3]  // ⭐️ E열(JSON) 값 전달
            ]);
            if (range[i][3] && String(range[i][3]).trim() !== "") {
              lastJson = range[i][3]; 
            }
          }
        }

        var meta = { currentCash: 0, totalPrincipal: 0, realizedProfit: 0, qty: 0, avgPrice: 0, ticker: "" };
        try {
          var parsed = JSON.parse(lastJson);
          meta.currentCash = parsed.cash || 0;
          meta.totalPrincipal = parsed.base_principal || 0;
          meta.realizedProfit = parsed.realizedProfit || 0;
          
          var qty = 0, totalCost = 0;
          if (parsed.holdings) {
            parsed.holdings.forEach(function(h) {
              var hQty = Number(h.qty) || 0;
              var hCost = Number(h.cost) || ((Number(h.buy_price) || Number(h.buyPrice) || 0) * hQty);
              qty += hQty;
              totalCost += hCost;
            });
          }
          meta.qty = qty;
          meta.avgPrice = qty > 0 ? totalCost / qty : 0;
        } catch(e) {}

        return { meta: meta, logs: logsData, json: lastJson };
      }
      
      var result = { status: "success" };
      if (e.parameter.strat1) result.strat1 = fetchSlotData(2);
      if (e.parameter.strat2) result.strat2 = fetchSlotData(7);
      if (e.parameter.strat3) result.strat3 = fetchSlotData(12);
      if (e.parameter.strat4) result.strat4 = fetchSlotData(17);
      if (e.parameter.strat5) result.strat5 = fetchSlotData(22);
      if (e.parameter.strat6) result.strat6 = fetchSlotData(27);
      
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "GET_ALL_INIT") {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var targetSheet = ss.getSheetByName("LOG_" + userId);
      if (!targetSheet) {
        return ContentService.createTextOutput(JSON.stringify({
          config: null,
          config2: null,
          config3: null,
          config4: null,
          config5: null,
          config6: null,
          hasSheet: false,
          perf: { status: "error", message: "시트 'LOG_" + userId + "'를 찾을 수 없습니다." }
        })).setMimeType(ContentService.MimeType.JSON);
      }

      var config1 = extractSettingsFromSheet(targetSheet, 0);  
      var config2 = extractSettingsFromSheet(targetSheet, 5);  
      var config3 = extractSettingsFromSheet(targetSheet, 10); 
      var config4 = extractSettingsFromSheet(targetSheet, 15); 
      var config5 = extractSettingsFromSheet(targetSheet, 20); 
      var config6 = extractSettingsFromSheet(targetSheet, 25); 
      
      if (!config1.basics.strategy) config1 = null;
      if (!config2.basics.strategy) config2 = null;
      if (!config3.basics.strategy) config3 = null;
      if (!config4.basics.strategy) config4 = null;
      if (!config5.basics.strategy) config5 = null;
      if (!config6.basics.strategy) config6 = null;

      function fetchSlotData(startCol, slotNum) {
        var since = e.parameter["since" + slotNum] || "";
        function normalizeLogDate(value) {
          if (!value) return "";
          var raw = String(value).trim();
          raw = raw.replace(/\([가-힣a-zA-Z]\)/g, "").trim();
          raw = raw.replace(/[년월.\/]/g, "-").replace(/일/g, "").replace(/\s+/g, "");
          if (raw.charAt(raw.length - 1) === "-") raw = raw.slice(0, -1);
          if (raw.indexOf("T") !== -1) raw = raw.split("T")[0];
          var parts = raw.split("-");
          if (parts.length >= 3) {
            var y = parts[0];
            if (y.length === 2) y = "20" + y;
            return y + "-" + String(parts[1]).padStart(2, "0") + "-" + String(parts[2]).padStart(2, "0");
          }
          return raw;
        }
        var lastRow = targetSheet.getLastRow();
        if (lastRow < 129) return null;

        var startRow = 129;
        var numRows = lastRow - startRow + 1;
        if (numRows <= 0) return null;

        if (since) {
          var allDates = targetSheet.getRange(startRow, startCol, numRows, 1).getDisplayValues();
          var sinceNorm = normalizeLogDate(since);
          var offset = allDates.length;
          for (var d = 0; d < allDates.length; d++) {
            var dateNorm = normalizeLogDate(allDates[d][0]);
            if (dateNorm && dateNorm > sinceNorm) {
              offset = d;
              break;
            }
          }
          startRow = startRow + offset;
          numRows = lastRow - startRow + 1;
          if (numRows <= 0) return { logs: [], delta: true, unchanged: true };
        }

        var range = targetSheet.getRange(startRow, startCol, numRows, 4).getValues();
        var dateDisplay = targetSheet.getRange(startRow, startCol, numRows, 1).getDisplayValues();
        var logsData = [];
        var lastJson = "{}";

        for (var i = 0; i < range.length; i++) {
          if (range[i][0] || dateDisplay[i][0]) {
            logsData.push([
              dateDisplay[i][0],
              range[i][1],
              range[i][2],
              range[i][3]
            ]);
            if (range[i][3] && String(range[i][3]).trim() !== "") {
              lastJson = range[i][3];
            }
          }
        }

        var meta = { currentCash: 0, totalPrincipal: 0, realizedProfit: 0, qty: 0, avgPrice: 0, ticker: "" };
        try {
          var parsed = JSON.parse(lastJson);
          meta.currentCash = parsed.cash || 0;
          meta.totalPrincipal = parsed.base_principal || 0;
          meta.realizedProfit = parsed.realizedProfit || 0;
          var qty = 0, totalCost = 0;
          if (parsed.holdings) {
            parsed.holdings.forEach(function(h) {
              var hQty = Number(h.qty) || 0;
              var hCost = Number(h.cost) || ((Number(h.buy_price) || Number(h.buyPrice) || 0) * hQty);
              qty += hQty;
              totalCost += hCost;
            });
          }
          meta.qty = qty;
          meta.avgPrice = qty > 0 ? totalCost / qty : 0;
        } catch(e) {}

        return { meta: meta, logs: logsData, json: lastJson, delta: !!since };
      }

      var dataPerf = {
        status: "success",
        strat1: config1 ? fetchSlotData(2, 1) : null,
        strat2: config2 ? fetchSlotData(7, 2) : null,
        strat3: config3 ? fetchSlotData(12, 3) : null,
        strat4: config4 ? fetchSlotData(17, 4) : null,
        strat5: config5 ? fetchSlotData(22, 5) : null,
        strat6: config6 ? fetchSlotData(27, 6) : null
      };

      return ContentService.createTextOutput(JSON.stringify({ 
        config: config1, 
        config2: config2,
        config3: config3,
        config4: config4,
        config5: config5,
        config6: config6,
        hasSheet: true,
        perf: dataPerf
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "GET_INIT") {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var targetSheet = ss.getSheetByName("LOG_" + userId);
      if (!targetSheet) {
        return ContentService.createTextOutput(JSON.stringify({
          config: null,
          config2: null,
          config3: null,
          config4: null,
          config5: null,
          config6: null,
          hasSheet: false
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      var config1 = extractSettingsFromSheet(targetSheet, 0);  
      var config2 = extractSettingsFromSheet(targetSheet, 5);  
      var config3 = extractSettingsFromSheet(targetSheet, 10); 
      var config4 = extractSettingsFromSheet(targetSheet, 15); 
      var config5 = extractSettingsFromSheet(targetSheet, 20); 
      var config6 = extractSettingsFromSheet(targetSheet, 25); 
      
      if (!config1.basics.strategy) config1 = null;
      if (!config2.basics.strategy) config2 = null;
      if (!config3.basics.strategy) config3 = null;
      if (!config4.basics.strategy) config4 = null;
      if (!config5.basics.strategy) config5 = null;
      if (!config6.basics.strategy) config6 = null;

      return ContentService.createTextOutput(JSON.stringify({ 
        config: config1, 
        config2: config2,
        config3: config3,
        config4: config4,
        config5: config5,
        config6: config6,
        hasSheet: !!ss.getSheetByName("LOG_" + userId) 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "GET_YAHOO") {
      var t = e.parameter.t, p1 = e.parameter.p1, p2 = e.parameter.p2;
      var url = "https://query2.finance.yahoo.com/v8/finance/chart/" + t + "?period1=" + p1 + "&period2=" + p2 + "&interval=1d&events=history";
      var res = UrlFetchApp.fetch(url, {muteHttpExceptions: true}).getContentText();
      return ContentService.createTextOutput(res).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ error: "잘못된 GET 요청" })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (data.action === "LOGIN_OR_REGISTER") {
      var sheet = ss.getSheetByName("USERS");
      if (!sheet) { sheet = ss.insertSheet("USERS"); sheet.appendRow(["ID", "PW", "NAME"]); }
      var userId = data.id.trim(), userPw = data.pw.trim();
      var values = sheet.getRange("A2:B11").getValues();
      var foundIndex = -1, firstEmptyRow = -1;
      for (var i = 0; i < values.length; i++) {
        if (values[i][0].toString() === userId) { foundIndex = i; break; }
        if (firstEmptyRow === -1 && !values[i][0]) { firstEmptyRow = i; }
      }
      if (foundIndex !== -1) { 
        if (values[foundIndex][1].toString() === userPw) return ContentService.createTextOutput(JSON.stringify({result: "success", msg: "로그인 성공"})).setMimeType(ContentService.MimeType.JSON);
        else return ContentService.createTextOutput(JSON.stringify({result: "fail", msg: "비번 오류"})).setMimeType(ContentService.MimeType.JSON);
      } else if (firstEmptyRow !== -1) { 
        sheet.getRange(firstEmptyRow + 2, 1).setValue(userId); sheet.getRange(firstEmptyRow + 2, 2).setValue(userPw);
        return ContentService.createTextOutput(JSON.stringify({result: "success", msg: "계정 생성됨"})).setMimeType(ContentService.MimeType.JSON);
      } else return ContentService.createTextOutput(JSON.stringify({result: "fail", msg: "정원 초과"})).setMimeType(ContentService.MimeType.JSON);
    }

    // 💰 앱에서 쏜 증액(입금) 요청 처리
    if (data.action === "ADD_FUNDS") {
      var sheetName = "LOG_" + (data.id || "admin");
      var logSheet = ss.getSheetByName(sheetName);
      if (!logSheet) return ContentService.createTextOutput(JSON.stringify({ status: "error" })).setMimeType(ContentService.MimeType.JSON);

      // 슬롯 번호에 맞춰서 시트의 열(Column) 위치 설정
      var targetCol = 2; // 기본값 슬롯 1 (B열)
      if (data.slot === 1) targetCol = 2;
      else if (data.slot === 2) targetCol = 7;
      else if (data.slot === 3) targetCol = 12;
      else if (data.slot === 4) targetCol = 17;
      else if (data.slot === 5) targetCol = 22;
      else if (data.slot === 6) targetCol = 27;

      // ⭐️ [핵심 수정] 시트 전체의 마지막 행이 아니라, 해당 슬롯(Column)의 마지막 행을 찾음
      var lastRow = 128;
      // 넉넉하게 데이터가 있을 법한 범위까지 해당 열의 값을 읽어옴
      var colValues = logSheet.getRange(1, targetCol, logSheet.getLastRow() + 20, 1).getValues();
      
      // 아래에서 위로 올라가며 마지막 데이터가 있는 행 번호를 찾음
      for (var i = colValues.length - 1; i >= 128; i--) { // 129행(index 128)부터 탐색
        if (colValues[i][0] !== "" && colValues[i][0] !== null) {
          lastRow = i + 1;
          break;
        }
      }

      // 만약 장부에 기록이 하나도 없다면 에러 반환
      if (lastRow < 129) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", msg: "기록된 장부가 없습니다." })).setMimeType(ContentService.MimeType.JSON);
      }

      // 1. 자산, 입출금, JSON 칸 선택
      var assetRange = logSheet.getRange(lastRow, targetCol + 1);
      var inoutRange = logSheet.getRange(lastRow, targetCol + 2);
      var jsonRange = logSheet.getRange(lastRow, targetCol + 3);

      var amount = parseFloat(data.amount) || 0;

      // 2. 자산과 JSON은 갱신하되, 로그의 입출금 열은 자동으로 다시 쓰지 않음
      //    (입출금 값이 저장/동기화 과정에서 재주입되는 현상 방지)
      assetRange.setValue((parseFloat(assetRange.getValue()) || 0) + amount);
      inoutRange.setValue((parseFloat(inoutRange.getValue()) || 0) + amount);

      // 3. JSON 꾸러미 안의 현금(cash)과 갱신금(base_principal)도 정확히 수정
      var currentJsonStr = jsonRange.getValue();
      if (currentJsonStr && String(currentJsonStr).trim() !== "") {
        try {
          var parsed = JSON.parse(currentJsonStr);
          parsed.cash = (parsed.cash || 0) + amount;
          parsed.base_principal = (parsed.base_principal || 0) + amount;
          // ⭐️ realPrincipal 필드가 없을 때도 갱신금을 바탕으로 안전하게 증액
          parsed.realPrincipal = (parsed.realPrincipal !== undefined ? (parsed.realPrincipal + amount) : (parsed.base_principal || 0));
          
          jsonRange.setValue(JSON.stringify(parsed));
        } catch(e) {
          console.error("JSON 파싱 오류", e);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "ok" })).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === "BACKUP_AND_SAVE_V4" || data.action === "AUTO_DAILY_SAVE") {
      var sheetName = "LOG_" + (data.id || "admin");
      var logSheet = ss.getSheetByName(sheetName) || (ss.getSheetByName("RECORD") ? ss.getSheetByName("RECORD").copyTo(ss).setName(sheetName) : ss.insertSheet(sheetName));

      if(data.params)  saveSettingsToLogSheet(logSheet, data.params, 0);   
      if(data.params2) saveSettingsToLogSheet(logSheet, data.params2, 5);  
      if(data.params3) saveSettingsToLogSheet(logSheet, data.params3, 10); 
      if(data.params4) saveSettingsToLogSheet(logSheet, data.params4, 15); 
      if(data.params5) saveSettingsToLogSheet(logSheet, data.params5, 20); 
      if(data.params6) saveSettingsToLogSheet(logSheet, data.params6, 25); 
      
      if (data.logs) {
        appendLogsBatch(logSheet, data.logs);
      } else if (data.date) {
        appendLogsBatch(logSheet, [{ date: data.date, s1: data.s1, s2: data.s2, s3: data.s3, s4: data.s4, s5: data.s5, s6: data.s6 }]);
      }
      
      return ContentService.createTextOutput(JSON.stringify({ status: "ok" })).setMimeType(ContentService.MimeType.JSON);
    }

  } catch (err) { 
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() })).setMimeType(ContentService.MimeType.JSON); 
  }
}

// 🟢 [중복 차단 100% 보장] 디스플레이 텍스트 기반 초강력 스캐너
function appendLogsBatch(logSheet, logs) {
  if (!logs || logs.length === 0) return;
  
  // 🔥 화면에 적힌 글자("2026. 4. 6")를 앱 표준 포맷("2026-04-06")으로 똑같이 찍어내는 함수
  function normalize(v) {
    if (!v) return "";
    var s = String(v).trim();
    s = s.replace(/\s*\(.*?\)\s*/g, ""); // "(월)" 등 괄호 제거
    s = s.replace(/[년월일\.\/\,_]/g, "-"); // 각종 기호를 하이픈으로 통일
    s = s.replace(/\s+/g, ""); // "2026-4-6" 처럼 사이사이 띄어쓰기 전부 박멸!
    if (s.endsWith("-")) s = s.slice(0, -1);
    
    var p = s.split("-");
    if (p.length >= 3) {
      var y = p[0];
      if (y.length === 2) y = "20" + y; // 26년이면 2026년으로
      var m = p[1].padStart(2, '0');
      var d = p[2].padStart(2, '0');
      return y + "-" + m + "-" + d;
    }
    return s.split('T')[0];
  }

  logs = logs.slice().sort(function(a, b) {
    return normalize(a.date).localeCompare(normalize(b.date));
  });

  const slots = [ 
    {dataKey: 's1', col: 2}, 
    {dataKey: 's2', col: 7}, 
    {dataKey: 's3', col: 12}, 
    {dataKey: 's4', col: 17},
    {dataKey: 's5', col: 22},
    {dataKey: 's6', col: 27}
  ];
  
  slots.forEach(slot => {
    var headers = ["날짜", "총자산", "입출금", "상태(JSON)"];
    logSheet.getRange(128, slot.col, 1, 4).setValues([headers]).setFontWeight("bold").setBackground("#f3f4f6");

    var rowMap = {};
    var maxRowsToRead = Math.max(1, logSheet.getLastRow() - 128);
    var existingValues = logSheet.getRange(129, slot.col, maxRowsToRead, 4).getValues();
    var existingDates = logSheet.getRange(129, slot.col, maxRowsToRead, 1).getDisplayValues();

    for (var r = 0; r < existingValues.length; r++) {
      var existingDate = normalize(existingDates[r][0]);
      if (!existingDate) continue;
      rowMap[existingDate] = [
        existingDate,
        existingValues[r][1],
        existingValues[r][2],
        existingValues[r][3]
      ];

    };
    logs.forEach(function(dayEntry) {
      var sData = dayEntry[slot.dataKey];
      if (!sData || !sData.asset) return;

      var incomingDate = normalize(dayEntry.date);
      if (!incomingDate) return;

      // 기존 날짜는 자산/json만 갱신하고, 입출금 값은 이미 저장된 값을 유지한다.
      var prevRow = rowMap[incomingDate] || [incomingDate, 0, 0, ""];
      rowMap[incomingDate] = [incomingDate, sData.asset, prevRow[2] || 0, sData.json];



    });
    var dates = Object.keys(rowMap).sort();
    var outputRows = dates.map(function(date) { return rowMap[date]; });
    var clearRows = Math.max(maxRowsToRead, outputRows.length, 1);
    logSheet.getRange(129, slot.col, clearRows, 4).clearContent();
    if (outputRows.length > 0) {
      if (128 + outputRows.length > logSheet.getMaxRows()) {
        logSheet.insertRowsAfter(logSheet.getMaxRows(), (128 + outputRows.length) - logSheet.getMaxRows());
      }
      logSheet.getRange(129, slot.col, outputRows.length, 4).setValues(outputRows);
    }
  });
}

function extractSettingsFromSheet(sheet, colOffset) {
  var baseCol = 3 + (colOffset || 0);  var subCol = 5 + (colOffset || 0);  
  function getCellByRC(row, col) { return sheet.getRange(row, col); }
  function fd(row, col) { var v = getCellByRC(row, col).getValue(); return (v instanceof Date) ? Utilities.formatDate(v, "Asia/Seoul", "yyyy-MM-dd") : String(v); }
  function fstr(row, col) { var v = getCellByRC(row, col).getValue(); return v ? String(v) : ""; }
  function parseNum(row, col, def) { var v = getCellByRC(row, col).getValue(); if (v === "" || v == null) return def; var n = parseFloat(v); return isNaN(n) ? def : n; }
  function parsePct(row, col, def) { var str = getCellByRC(row, col).getDisplayValue(); if (!str || str.trim()==="") return def; var n = parseFloat(str.replace(/[^0-9.-]/g, '')); return isNaN(n) ? def : Number(n.toFixed(6)); }
  
  return {
    basics: { 
      ticker: fstr(6, baseCol), 
      startDate: fd(7, baseCol), 
      endDate: fd(8, baseCol), 
      initialCash: (function() { var v = parseNum(9, baseCol, 10000); return v; })(), 
      renewCash: (function() { 
        var ic = parseNum(9, baseCol, 10000);
        return parseNum(7, subCol, ic); 
      })(), 
      strategy: fstr(15, baseCol) || "",
      fBase: parsePct(12, baseCol, 0), 
      fSec: parsePct(6, subCol, 0)
    }
  };
}

function saveSettingsToLogSheet(sh, p, colOffset) {
  if (!p || !p.basics) return;
  var baseCol = 3 + (colOffset || 0); 
  var subCol = 5 + (colOffset || 0);
  
  function p2d(val) { return (val === "" || val == null) ? "" : Number((parseFloat(val) / 100.0).toFixed(8)); }
  sh.getRange(6, baseCol).setValue(p.basics.ticker || "");
  sh.getRange(7, baseCol).setValue(p.basics.startDate || "");
  sh.getRange(8, baseCol).setValue(p.basics.endDate || "");
  sh.getRange(9, baseCol).setValue(p.basics.initialCash === "" ? "" : parseFloat(p.basics.initialCash));
  sh.getRange(7, subCol).setValue(p.basics.renewCash === "" ? "" : parseFloat(p.basics.renewCash));
  sh.getRange(15, baseCol).setValue(p.basics.strategy || "");
  sh.getRange(12, baseCol).setNumberFormat("0.000%").setValue(p2d(p.basics.fBase));
  sh.getRange(6, subCol).setNumberFormat("0.00000%").setValue(p2d(p.basics.fSec));
}




