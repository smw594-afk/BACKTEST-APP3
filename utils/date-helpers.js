// utils/date-helpers.js
// 날짜 처리 및 미국 시장 휴일 판정 유틸 함수 모음

const formatterNY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

function formatDateNY(dateObj) {
  if (typeof dateObj === 'string') {
    let s = dateObj.replace(/\//g, '-');
    if (s.length >= 10 && s.charAt(4) === '-' && s.charAt(7) === '-') {
      return s.substring(0, 10);
    }
  }
  const d = (dateObj instanceof Date) ? dateObj : new Date(dateObj);
  if (isNaN(d.getTime())) return '';
  let formatted = formatterNY.format(d);
  return formatted.replace(/\//g, '-');
}

function normalizeDateKey(value) {
  if (!value) return "";
  if (value instanceof Date) {
    const parts = formatterNY.formatToParts(value);
    const y = parts.find(p => p.type === 'year')?.value || "";
    const m = parts.find(p => p.type === 'month')?.value || "";
    const d = parts.find(p => p.type === 'day')?.value || "";
    return (y && m && d) ? `${y}-${m}-${d}` : "";
  }

  let raw = String(value).trim();
  if (!raw) return "";
  if (raw.includes('T')) raw = raw.split('T')[0];
  raw = raw.replace(/[.\/]/g, '-');

  let match = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
  }

  const d = new Date(value);
  return isNaN(d.getTime()) ? raw : normalizeDateKey(d);
}

function dateFromKey(dateKey) {
  return new Date(`${dateKey}T12:00:00Z`);
}

function getFridayEnd(d) {
  const nyStr = formatterNY.format(d);
  const [y, m, dayVal] = nyStr.split('-').map(Number);
  const date = new Date(y, m - 1, dayVal);
  const day = date.getDay();
  const diff = (day <= 5) ? (5 - day) : (5 + 7 - day);
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function isUSMarketHoliday(dateStr) {
  const parts = dateStr.split('-');
  const y = parseInt(parts[0]), m = parseInt(parts[1]), d = parseInt(parts[2]);
  const targetDate = new Date(y, m - 1, d);
  const dow = targetDate.getDay();

  const getObs = (yy, mm, dd) => {
    let dc = new Date(yy, mm - 1, dd);
    if (dc.getDay() === 0) dc.setDate(dc.getDate() + 1);
    else if (dc.getDay() === 6) dc.setDate(dc.getDate() - 1);
    return `${yy}-${String(dc.getMonth() + 1).padStart(2, '0')}-${String(dc.getDate()).padStart(2, '0')}`;
  };

  const getNth = (yy, mm, wd, nth) => {
    let dc;
    if (nth > 0) {
      dc = new Date(yy, mm - 1, 1);
      let diff = (wd - dc.getDay() + 7) % 7;
      dc.setDate(1 + diff + (nth - 1) * 7);
    } else {
      dc = new Date(yy, mm, 0);
      let diff = (dc.getDay() - wd + 7) % 7;
      dc.setDate(dc.getDate() - diff);
    }
    return `${yy}-${String(dc.getMonth() + 1).padStart(2, '0')}-${String(dc.getDate()).padStart(2, '0')}`;
  };

  const getGF = (yy) => {
    let a = yy % 19, b = Math.floor(yy / 100), c = yy % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    let month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    let gf = new Date(yy, month - 1, day);
    gf.setDate(gf.getDate() - 2);
    return `${yy}-${String(gf.getMonth() + 1).padStart(2, '0')}-${String(gf.getDate()).padStart(2, '0')}`;
  };

  const hols = [
    getObs(y, 1, 1), getNth(y, 1, 1, 3), getNth(y, 2, 1, 3), getGF(y),
    getNth(y, 5, 1, -1), getObs(y, 6, 19), getObs(y, 7, 4), getNth(y, 9, 1, 1),
    getNth(y, 11, 4, 4), getObs(y, 12, 25)
  ];
  return hols.includes(dateStr);
}

function normalizeOrderDateKey(value) {
  if (!value) return "";
  let raw = String(value).trim();
  if (!raw) return "";
  raw = raw.replace(/\s*\(동기화됨\)\s*$/, "").trim();
  raw = raw.replace(/\s+/g, " ");

  // 연도 없는 주문일(예: 7/15)은 Date 파서가 2001년으로 해석할 수 있으므로
  // 현재 뉴욕 연도를 먼저 붙여 시장 휴장 여부를 판정한다.
  const md = raw.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (md) {
    const now = new Date();
    const year = formatterNY.formatToParts(now).find(p => p.type === 'year')?.value || String(now.getFullYear());
    return `${year}-${md[1].padStart(2, '0')}-${md[2].padStart(2, '0')}`;
  }

  const normalized = normalizeDateKey(raw);
  if (normalized && /^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;

  return normalized;
}

function getUSMarketDateStatus(dateStr) {
  const dateKey = normalizeOrderDateKey(dateStr);
  if (!dateKey) return { dateKey: "", isWeekend: false, isHoliday: false, isClosed: false, label: "" };

  const parts = dateKey.split('-').map(Number);
  const dt = new Date(parts[0], parts[1] - 1, parts[2]);
  const dow = dt.getDay();
  const isWeekend = dow === 0 || dow === 6;
  const isHoliday = !isWeekend && isUSMarketHoliday(dateKey);
  const isClosed = isWeekend || isHoliday;
  const label = isWeekend ? '주말' : (isHoliday ? '휴장' : '');
  return { dateKey, isWeekend, isHoliday, isClosed, label };
}

function formatOrderDateWithMarketStatus(dateStr) {
  const status = getUSMarketDateStatus(dateStr);
  const cleanDate = String(dateStr || "").replace(/\s*\(동기화됨\)\s*$/, "").trim();
  if (!status.isClosed || !cleanDate) return cleanDate;
  return `<span style="color:var(--danger); font-weight:700;">${cleanDate}${status.label ? ` (${status.label})` : ''}</span>`;
}

function getOrderHeaderMarketStatusBadge() {
  const now = new Date();
  const nyTimeStr = now.toLocaleString("en-US", { timeZone: "America/New_York" });
  const nyHour = new Date(nyTimeStr).getHours();
  let dForTag = now;
  if (nyHour >= 16) dForTag = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const checkDateStrForTag = formatDateNY(dForTag);
  const isHoliday = isUSMarketHoliday(checkDateStrForTag);
  const nyDayStr = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short" }).format(dForTag);
  const isWeekend = (nyDayStr === "Sat" || nyDayStr === "Sun");

  if (!isHoliday && !isWeekend) return "";
  const statusText = isHoliday ? "[휴장일]" : "[주말]";
  return ` <span style="color:var(--danger); font-size:0.75em; font-weight:700; margin-left:8px;">${statusText}</span>`;
}

window.dateHelpers = {
  formatDateNY,
  normalizeDateKey,
  dateFromKey,
  getFridayEnd,
  isUSMarketHoliday,
  normalizeOrderDateKey,
  getUSMarketDateStatus,
  formatOrderDateWithMarketStatus,
  getOrderHeaderMarketStatusBadge
};
