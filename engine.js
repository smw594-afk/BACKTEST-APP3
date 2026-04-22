// strategy.js에서 병합됨
const MASTER_STRATEGIES = {
  "1M": {
    config: { compR: 0.824, lossR: 0.329, dLimit: -0.048, cDn3: 0.0, cDn2: 0.008, cDn1: 0.0, tierMethod: '보유', useMid1: false, useMid2: false, useMid3: false },
    modes: {
      SF: { buy: [0.034, 0.034, 0.034, 0.034, 0.034, 0.034], sell: [0.023, 0.023, 0.023, 0.023, 0.023, 0.023], hold: [7, 7, 7, 7, 7, 7], weight: [0.08, 0.055, 0.06, 0.285, 0.084, 0.064] },
      Middle: { buy: [0.034, 0.034, 0.034, 0.034, 0.034, 0.034], sell: [0.023, 0.023, 0.023, 0.023, 0.023, 0.023], hold: [7, 7, 7, 7, 7, 7], weight: [0.08, 0.055, 0.06, 0.285, 0.084, 0.064] },
      AG: { buy: [0.034, 0.034, 0.034, 0.034, 0.034, 0.034], sell: [0.023, 0.023, 0.023, 0.023, 0.023, 0.023], hold: [7, 7, 7, 7, 7, 7], weight: [0.08, 0.055, 0.06, 0.285, 0.084, 0.064] },
      Middle2: { buy: [0.034, 0.034, 0.034, 0.034, 0.034, 0.034], sell: [0.023, 0.023, 0.023, 0.023, 0.023, 0.023], hold: [7, 7, 7, 7, 7, 7], weight: [0.08, 0.055, 0.06, 0.285, 0.084, 0.064] },
      Middle3: { buy: [0.034, 0.034, 0.034, 0.034, 0.034, 0.034], sell: [0.023, 0.023, 0.023, 0.023, 0.023, 0.023], hold: [7, 7, 7, 7, 7, 7], weight: [0.08, 0.055, 0.06, 0.285, 0.084, 0.064] }
    }
  },
  "2M3D2(2.1)": {
    config: { compR: 0.939, lossR: 0.699, dLimit: -0.048, cDn3: 0.0, cDn2: 0.008, cDn1: 0.0, tierMethod: '보유', useMid1: true, useMid2: false, useMid3: true },
    modes: {
      // SF 모드: 8티어 체제 유지
      SF: {
        buy: [0.051, 0.051, 0.051, 0.051, 0.051, 0.051, 0.051, 0.051],
        sell: [0.017, 0.017, 0.017, 0.017, 0.017, 0.017, 0.017, 0.017],
        hold: [35, 35, 35, 35, 35, 35, 35, 35],
        weight: [0.05, 0.052, 0.291, 0.055, 0.226, 0.051, 0.3, 0.053]
      },
      // Middle 모드: 7티어 체제 유지
      Middle: {
        buy: [0.032, 0.032, 0.032, 0.032, 0.032, 0.032, 0.032],
        sell: [0.001, 0.001, 0.001, 0.001, 0.001, 0.001, 0.001],
        hold: [20, 20, 20, 20, 20, 20, 20],
        weight: [0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3]
      },
      // AG 모드: 8티어 체제 유지
      AG: {
        buy: [0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025],
        sell: [0.032, 0.032, 0.032, 0.032, 0.032, 0.032, 0.032, 0.032],
        hold: [8, 8, 8, 8, 8, 8, 8, 8],
        weight: [0.061, 0.3, 0.05, 0.05, 0.242, 0.3, 0.295, 0.292]
      },
      // Middle2/3 모드: 9티어 체제 유지
      Middle2: { buy: [0.044, 0.044, 0.044, 0.044, 0.044, 0.044, 0.044, 0.044, 0.044], sell: [0.005, 0.005, 0.005, 0.005, 0.005, 0.005, 0.005, 0.005, 0.005], hold: [12, 12, 12, 12, 12, 12, 12, 12, 12], weight: [0.127, 0.127, 0.127, 0.127, 0.127, 0.127, 0.127, 0.127, 0.127] },
      Middle3: { buy: [0.044, 0.044, 0.044, 0.044, 0.044, 0.044, 0.044, 0.044, 0.044], sell: [0.005, 0.005, 0.005, 0.005, 0.005, 0.005, 0.005, 0.005, 0.005], hold: [12, 12, 12, 12, 12, 12, 12, 12, 12], weight: [0.127, 0.127, 0.127, 0.127, 0.127, 0.127, 0.127, 0.127, 0.127] }
    }
  },
  "2M3D1-1P": {
    config: { compR: 0.818, lossR: 0.282, dLimit: -0.048, cDn3: 0.0, cDn2: 0.008, cDn1: 0.0, tierMethod: '보유', useMid1: true, useMid2: true, useMid3: true },
    modes: {
      SF: { buy: [0.046, 0.046, 0.046, 0.046, 0.046, 0.046], sell: [0.018, 0.018, 0.018, 0.018, 0.018, 0.018], hold: [34, 34, 34, 34, 34, 34], weight: [0.13, 0.116, 0.289, 0.05, 0.273, 0.05] },
      Middle: { buy: [0.043, 0.043, 0.043, 0.043, 0.043, 0.043], sell: [0.014, 0.014, 0.014, 0.014, 0.014, 0.014], hold: [6, 6, 6, 6, 6, 6], weight: [0.3, 0.3, 0.3, 0.3, 0.3, 0.3] },
      AG: { buy: [0.034, 0.034, 0.034, 0.034, 0.034, 0.034], sell: [0.022, 0.022, 0.022, 0.022, 0.022, 0.022], hold: [7, 7, 7, 7, 7, 7], weight: [0.17, 0.08, 0.052, 0.3, 0.072, 0.247] },
      Middle2: { buy: [0.025, 0.025, 0.025, 0.025, 0.025, 0.025], sell: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0], hold: [12, 12, 12, 12, 12, 12], weight: [0.05, 0.05, 0.05, 0.05, 0.05, 0.05] },
      Middle3: { buy: [0.043, 0.043, 0.043, 0.043, 0.043, 0.043], sell: [0.014, 0.014, 0.014, 0.014, 0.014, 0.014], hold: [6, 6, 6, 6, 6, 6], weight: [0.3, 0.3, 0.3, 0.3, 0.3, 0.3] }
    }
  },
  "2M3D2(2.0)": {
    config: { compR: 0.814, lossR: 0.286, dLimit: -0.048, cDn3: 0.0, cDn2: 0.008, cDn1: 0.0, tierMethod: '보유', useMid1: true, useMid2: false, useMid3: true },
    modes: {
      SF: { buy: [0.036, 0.036, 0.036, 0.036, 0.036, 0.036, 0.036, 0.036], sell: [0.016, 0.016, 0.016, 0.016, 0.016, 0.016, 0.016, 0.016], hold: [35, 35, 35, 35, 35, 35, 35, 35], weight: [0.046, 0.143, 0.23, 0.046, 0.115, 0.161, 0.31, 0.001] },
      Middle: { buy: [0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03], sell: [0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003], hold: [20, 20, 20, 20, 20, 20, 20], weight: [0.355, 0.355, 0.355, 0.355, 0.355, 0.355, 0.355] },
      AG: { buy: [0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025], sell: [0.031, 0.031, 0.031, 0.031, 0.031, 0.031, 0.031, 0.031], hold: [8, 8, 8, 8, 8, 8, 8, 8], weight: [0.047, 0.39, 0.042, 0.043, 0.217, 0.22, 0.31, 0.45] },
      Middle2: { buy: [0.039, 0.039, 0.039, 0.039, 0.039, 0.039, 0.039, 0.039, 0.039, 0.039], sell: [0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003], hold: [12, 12, 12, 12, 12, 12, 12, 12, 12, 12], weight: [0.131, 0.131, 0.131, 0.131, 0.131, 0.131, 0.131, 0.131, 0.131, 0.131] },
      Middle3: { buy: [0.039, 0.039, 0.039, 0.039, 0.039, 0.039, 0.039, 0.039, 0.039, 0.039], sell: [0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003], hold: [12, 12, 12, 12, 12, 12, 12, 12, 12, 12], weight: [0.131, 0.131, 0.131, 0.131, 0.131, 0.131, 0.131, 0.131, 0.131, 0.131] }
    }
  },
  "2M3D2(1.2)": {
    config: { compR: 0.814, lossR: 0.293, dLimit: -0.048, cDn3: 0.0, cDn2: 0.008, cDn1: 0.0, tierMethod: '보유', useMid1: true, useMid2: false, useMid3: true },
    modes: {
      SF: { buy: [0.035, 0.035, 0.035, 0.035, 0.035, 0.035, 0.035, 0.035], sell: [0.016, 0.016, 0.016, 0.016, 0.016, 0.016, 0.016, 0.016], hold: [35, 35, 35, 35, 35, 35, 35, 35], weight: [0.046, 0.143, 0.23, 0.046, 0.115, 0.161, 0.31, 0.046] },
      Middle: { buy: [0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03], sell: [0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003], hold: [21, 21, 21, 21, 21, 21, 21, 21], weight: [0.352, 0.352, 0.352, 0.352, 0.352, 0.352, 0.352, 0.352] },
      AG: { buy: [0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025], sell: [0.032, 0.032, 0.032, 0.032, 0.032, 0.032, 0.032, 0.032], hold: [8, 8, 8, 8, 8, 8, 8, 8], weight: [0.049, 0.216, 0.043, 0.043, 0.216, 0.216, 0.12, 0.096] },
      Middle2: { buy: [0.038, 0.038, 0.038, 0.038, 0.038, 0.038, 0.038, 0.038], sell: [0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003], hold: [13, 13, 13, 13, 13, 13, 13, 13], weight: [0.129, 0.129, 0.129, 0.129, 0.129, 0.129, 0.129, 0.129] },
      Middle3: { buy: [0.038, 0.038, 0.038, 0.038, 0.038, 0.038, 0.038, 0.038], sell: [0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003], hold: [13, 13, 13, 13, 13, 13, 13, 13], weight: [0.129, 0.129, 0.129, 0.129, 0.129, 0.129, 0.129, 0.129] }
    }
  },
  "2M3D2(1.0)": {
    config: { compR: 0.814, lossR: 0.293, dLimit: -0.048, cDn3: 0.0, cDn2: 0.008, cDn1: 0.0, tierMethod: '보유', useMid1: true, useMid2: false, useMid3: true },
    modes: {
      SF: { buy: [0.035, 0.035, 0.035, 0.035, 0.035, 0.035, 0.035, 0.035], sell: [0.016, 0.016, 0.016, 0.016, 0.016, 0.016, 0.016, 0.016], hold: [35, 35, 35, 35, 35, 35, 35, 35], weight: [0.046, 0.143, 0.23, 0.046, 0.115, 0.143, 0.23, 0.040] },
      Middle: { buy: [0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03], sell: [0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003], hold: [12, 12, 12, 12, 12, 12, 12, 12], weight: [0.129, 0.129, 0.129, 0.129, 0.129, 0.129, 0.129, 0.129] },
      AG: { buy: [0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025], sell: [0.032, 0.032, 0.032, 0.032, 0.032, 0.032, 0.032, 0.032], hold: [8, 8, 8, 8, 8, 8, 8, 8], weight: [0.049, 0.216, 0.043, 0.043, 0.216, 0.216, 0.12, 0.096] },
      Middle2: { buy: [0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03], sell: [0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003], hold: [12, 12, 12, 12, 12, 12, 12, 12], weight: [0.129, 0.129, 0.129, 0.129, 0.129, 0.129, 0.129, 0.129] },
      Middle3: { buy: [0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03], sell: [0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003], hold: [12, 12, 12, 12, 12, 12, 12, 12], weight: [0.129, 0.129, 0.129, 0.129, 0.129, 0.129, 0.129, 0.129] }
    }
  }
};

// engine.js (코어 백테스트 엔진 및 퉁치기 유틸리티)

const GAS_URL = "https://script.google.com/macros/s/AKfycbwGUjfRXu03cvsYz9DqWEbnnvO0DketTn_D-0sbGImAps6Cy-nOYIGLF4YUUvviWOa2/exec";
const VERCEL_URL = "https://yahoo-proxy-gamma.vercel.app/api/yahoo";

// 🛡️ IndexedDB (캐싱 및 데이터 관리)
const DB_NAME = "VTotalDB_Cache"; const DB_VERSION = 2; const STORE_NAME = "YahooDataStore";
const yahooCache = {}; const pendingFetches = {};

// 🛡️ 글로벌 상태 및 환율 관리
let isCurrencyKRW = false;
let currentFXRate = 1450;

async function updateCurrentFXRate(callback = null) {
  try {
    const nowTs = Math.floor(Date.now() / 1000);
    const pastTs = nowTs - (86400 * 5);
    const yUrl = `${VERCEL_URL}?t=KRW=X&p1=${pastTs}&p2=${nowTs}`;
    const response = await fetch(yUrl);
    const res = await response.json();
    if (!res.error && res.chart && res.chart.result[0]) {
      const cls = res.chart.result[0].indicators.quote[0].close;
      let latestRate = 1450;
      for (let i = cls.length - 1; i >= 0; i--) {
        if (cls[i] !== null && !isNaN(cls[i])) {
          latestRate = cls[i];
          break;
        }
      }
      currentFXRate = latestRate;
      console.log(`[환율 동기화 완료] 현재 적용 환율: ${currentFXRate.toFixed(2)}원`);
      if (callback) callback(currentFXRate);
    }
  } catch (e) {
    console.warn("환율 동기화 실패. 기본값(1450원)을 유지합니다.", e);
  }
}

async function openDB() { return new Promise((resolve, reject) => { const req = indexedDB.open(DB_NAME, DB_VERSION); req.onupgradeneeded = e => { const db = e.target.result; if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "ticker" }); }; req.onsuccess = e => resolve(e.target.result); req.onerror = e => reject(e.target.error); }); }
async function getDB(tk) { try { const db = await openDB(); return new Promise((resolve, reject) => { const tx = db.transaction(STORE_NAME, "readonly"); const req = tx.objectStore(STORE_NAME).get(tk); req.onsuccess = () => resolve(req.result); req.onerror = () => resolve(null); }); } catch (e) { return null; } }
async function setDB(data) { try { const db = await openDB(); const tx = db.transaction(STORE_NAME, "readwrite"); tx.objectStore(STORE_NAME).put(data); } catch (e) { } }

// 🛡️ 금융 계산 및 유틸리티 함수 모음
function fixFloat(value) {
  if (value === null || value === undefined || isNaN(value)) return 0;
  return Math.round(value * 100) / 100;
}
function formatComma(val) {
  if (!val && val !== 0) return '';
  let s = String(val).replace(/[^0-9.]/g, '');
  let parts = s.split('.'); parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ","); return parts.join('.');
}
function unformatComma(val) { return String(val).replace(/,/g, ''); }
const formatterNY = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' });
function formatDateNY(dateObj) { return formatterNY.format(dateObj); }
function pyRound2(num) { let factor = 100, temp = num * factor, rounded = Math.round(temp); if (Math.abs(temp % 1) === 0.5) rounded = (Math.floor(temp) % 2 === 0) ? Math.floor(temp) : Math.ceil(temp); return rounded / factor; }

function getFridayEnd(d) {
  const nyStr = formatterNY.format(d);
  const [y, m, dayVal] = nyStr.split('-').map(Number);
  const date = new Date(y, m - 1, dayVal); const day = date.getDay(); const diff = (day <= 5) ? (5 - day) : (5 + 7 - day); date.setDate(date.getDate() + diff); date.setHours(0, 0, 0, 0); return date.getTime();
}

function isUSMarketHoliday(dateStr) {
  const parts = dateStr.split('-'); const y = parseInt(parts[0]), m = parseInt(parts[1]), d = parseInt(parts[2]); const targetDate = new Date(y, m - 1, d); const dow = targetDate.getDay();
  const getObs = (yy, mm, dd) => { let dc = new Date(yy, mm - 1, dd); if (dc.getDay() === 0) dc.setDate(dc.getDate() + 1); else if (dc.getDay() === 6) dc.setDate(dc.getDate() - 1); return `${yy}-${String(dc.getMonth() + 1).padStart(2, '0')}-${String(dc.getDate()).padStart(2, '0')}`; };
  const getNth = (yy, mm, wd, nth) => { let dc; if (nth > 0) { dc = new Date(yy, mm - 1, 1); let diff = (wd - dc.getDay() + 7) % 7; dc.setDate(1 + diff + (nth - 1) * 7); } else { dc = new Date(yy, mm, 0); let diff = (dc.getDay() - wd + 7) % 7; dc.setDate(dc.getDate() - diff); } return `${yy}-${String(dc.getMonth() + 1).padStart(2, '0')}-${String(dc.getDate()).padStart(2, '0')}`; };
  const getGF = (yy) => { let a = yy % 19, b = Math.floor(yy / 100), c = yy % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451); let month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1; let gf = new Date(yy, month - 1, day); gf.setDate(gf.getDate() - 2); return `${yy}-${String(gf.getMonth() + 1).padStart(2, '0')}-${String(gf.getDate()).padStart(2, '0')}`; };
  const hols = [getObs(y, 1, 1), getNth(y, 1, 1, 3), getNth(y, 2, 1, 3), getGF(y), getNth(y, 5, 1, -1), getObs(y, 6, 19), getObs(y, 7, 4), getNth(y, 9, 1, 1), getNth(y, 11, 4, 4), getObs(y, 12, 25)];
  return hols.includes(dateStr);
}

// 🌐 데이터 수집 (Yahoo Finance)
async function fetchYahooData(t, p1, p2, rnd, force = false) {
  if (!t) throw new Error("티커가 비어있습니다.");
  const memKey = `${t}_${p1}_${p2}`;
  if (!force && yahooCache[memKey]) return yahooCache[memKey];
  if (!force && pendingFetches[memKey]) return await pendingFetches[memKey];

  const fetchPromise = (async () => {
    let cached = await getDB(t);
    if (!cached) { cached = { ticker: t, dates: [], close: [], open: [] }; }
    const requestedStart = p1 * 1000, requestedEnd = p2 * 1000;
    const lastCachedTs = cached.dates.length > 0 ? (new Date(cached.dates[cached.dates.length - 1])).getTime() : 0;
    const firstCachedTs = cached.dates.length > 0 ? (new Date(cached.dates[0])).getTime() : Infinity;
    let fetchP1 = p1, fetchP2 = p2, isDelta = false;
    const now = Date.now();
    const enoughOld = (firstCachedTs <= requestedStart + 43200000);

    if (force || !enoughOld || (requestedEnd - lastCachedTs > 86400000)) {
      fetchP1 = p1; fetchP2 = p2; isDelta = false;
      fetchP2 = fetchP2 + (86400 * 3);
      const yUrl = `${VERCEL_URL}?t=${t}&p1=${fetchP1}&p2=${fetchP2}`;
      try {
        const response = await fetch(yUrl); const res = await response.json(); if (res.error) throw new Error(res.error);
        const r = res.chart.result[0], ts = r.timestamp, cls = r.indicators.quote[0].close, ops = r.indicators.quote[0].open;
        let newDates = [], newClose = [], newOpen = [], lastDay = "";
        for (let i = 0; i < ts.length; i++) {
          if (cls[i] !== null) {
            let dateObj = new Date(ts[i] * 1000); let dayStr = formatDateNY(dateObj); let cVal = rnd ? pyRound2(cls[i]) : cls[i]; let oVal = rnd ? pyRound2(ops[i]) : ops[i];
            if (dayStr !== lastDay) { newDates.push(dateObj); newClose.push(cVal); newOpen.push(oVal); lastDay = dayStr; } else { newClose[newClose.length - 1] = cVal; newOpen[newOpen.length - 1] = oVal; }
          }
        }
        if (isDelta) {
          const lastStr = formatDateNY(new Date(lastCachedTs));
          const freshIdx = newDates.findIndex(d => formatDateNY(d) > lastStr);
          if (freshIdx !== -1) { cached.dates = cached.dates.concat(newDates.slice(freshIdx)); cached.close = cached.close.concat(newClose.slice(freshIdx)); cached.open = cached.open.concat(newOpen.slice(freshIdx)); }
        } else {
          let existingLastStr = cached.dates.length > 0 ? formatDateNY(new Date(cached.dates[cached.dates.length - 1])) : "1900-01-01";
          let newLastStr = newDates.length > 0 ? formatDateNY(newDates[newDates.length - 1]) : "1900-01-01";
          if (existingLastStr > newLastStr) { console.warn(`데이터 누락 감지! 기존 캐시 보호.`); } else { cached.dates = newDates; cached.close = newClose; cached.open = newOpen; }
        }
        const todayNYStr = formatDateNY(new Date()); const nowNY = new Date(); const nyHour = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }).format(nowNY));
        if (cached.dates.length > 0) { const lastDayNY = formatDateNY(new Date(cached.dates[cached.dates.length - 1])); if (lastDayNY === todayNYStr) { if (nyHour < 17) { cached.dates.pop(); cached.close.pop(); cached.open.pop(); } } }
        await setDB(cached); localStorage.setItem('vtotal_last_fetch_' + t, now.toString());
      } catch (e) { throw new Error("데이터 수집 실패: " + e.message); }
    }
    const finalResult = { dates: [], close: [], open: [] }; const reqS = requestedStart, reqE = requestedEnd;
    for (let i = 0, len = cached.dates.length; i < len; i++) { const d = cached.dates[i]; const ts = (d instanceof Date) ? d.getTime() : new Date(d).getTime(); if (ts >= reqS && ts <= reqE + (86400 * 1000 * 5)) { finalResult.dates.push(d); finalResult.close.push(cached.close[i]); finalResult.open.push(cached.open[i]); } }
    yahooCache[memKey] = finalResult; return finalResult;
  })();
  pendingFetches[memKey] = fetchPromise; const result = await fetchPromise; delete pendingFetches[memKey]; return result;
}

// 📈 핵심 투자 로직 함수들
function calculateWRSI_WFRI(qData) {
  let dD = qData.dates, qC = qData.close, weeklyData = {}, wP = [], wD = [];
  for (let i = 0; i < dD.length; i++) weeklyData[getFridayEnd(dD[i])] = { close: qC[i], date: dD[i] };
  let sortedFri = Object.keys(weeklyData).sort((a, b) => Number(a) - Number(b));
  for (let i = 0; i < sortedFri.length; i++) { wP.push(weeklyData[sortedFri[i]].close); wD.push(weeklyData[sortedFri[i]].date); }
  let p = 14, wRsi = [];
  for (let i = 0; i < wP.length; i++) {
    if (i < p) { wRsi.push(50); continue; }
    let g = 0, l = 0;
    for (let j = i - p + 1; j <= i; j++) {
      let df = wP[j] - wP[j - 1];
      if (df > 0) g += df; else l -= df;
    }
    let val = (l === 0 ? 50 : 100 - (100 / (1 + (g / p) / (l / p))));
    wRsi.push(pyRound2(val));
  }
  let wRMap = {};
  for (let i = 0; i < dD.length; i++) { let ds = formatDateNY(dD[i]), friEnd = getFridayEnd(dD[i]), wIdx = sortedFri.indexOf(friEnd.toString()); wRMap[ds] = { dR: (wIdx >= 1) ? wRsi[wIdx - 1] : 50, dRR: (wIdx >= 2) ? wRsi[wIdx - 2] : 50, dCurrent: wRsi[wIdx] }; }
  return wRMap;
}

// 🧮 퉁치기 (Order Matcher) - 다중 슬롯 확장에 대비해 한도 500개로 대폭 상향
function run_tungchigi_master(paramsArr) {
  if (!paramsArr || paramsArr.length === 0) return [];
  const MAX_ORDERS = 500;

  let g = new Float64Array(MAX_ORDERS), h = new Float64Array(MAX_ORDERS), i_p = new Float64Array(MAX_ORDERS), j = new Float64Array(MAX_ORDERS), k = new Array(MAX_ORDERS).fill(false);

  for (let idx = 0; idx < paramsArr.length; idx++) {
    if (idx >= MAX_ORDERS) break;
    let side = paramsArr[idx][0], method = paramsArr[idx][1], price = parseFloat(paramsArr[idx][2]), qty = parseFloat(paramsArr[idx][3]);
    if (side === '매수') { g[idx] = price; h[idx] = qty; }
    else { i_p[idx] = price; j[idx] = qty; if (method.toUpperCase() === 'MOC') k[idx] = true; }
  }

  let u_g = Array.from(g).filter(v => v > 0), adj_sell = Array.from(i_p).map((val, i) => k[i] ? 0.01 : val), u_i = adj_sell.filter(v => v > 0);
  let m_prices = [...new Set([...u_g, ...u_i])].sort((a, b) => b - a), m_col = new Array(MAX_ORDERS).fill(NaN);
  m_prices.forEach((val, i) => m_col[i] = val);

  let n_col = new Float64Array(MAX_ORDERS), o_col = new Float64Array(MAX_ORDERS);
  for (let idx = 0; idx < MAX_ORDERS; idx++) {
    if (isNaN(m_col[idx])) continue;
    let mv = m_col[idx], count_m = m_col.slice(0, idx + 1).filter(v => v === mv).length;
    if (count_m > 1) { n_col[idx] = 0; }
    else { let sum_h = 0; for (let x = 0; x < MAX_ORDERS; x++) if (g[x] === mv) sum_h += h[x]; n_col[idx] = sum_h; }

    if (n_col[idx] > 0) { o_col[idx] = 0; }
    else if (mv === 0.01) { let sum_j = 0; for (let x = 0; x < MAX_ORDERS; x++) if (k[x]) sum_j += j[x]; o_col[idx] = -sum_j; }
    else { let sum_j = 0; for (let x = 0; x < MAX_ORDERS; x++) if (!k[x] && i_p[x] === mv) sum_j += j[x]; o_col[idx] = -sum_j; }
  }

  let p_col = new Float64Array(MAX_ORDERS), cumsum_n = 0;
  for (let idx = 0; idx < MAX_ORDERS - 1; idx++) { cumsum_n += n_col[idx]; p_col[idx + 1] = cumsum_n; }

  let q_col = new Float64Array(MAX_ORDERS), cumsum_o = 0;
  for (let idx = MAX_ORDERS - 2; idx >= 0; idx--) { cumsum_o += o_col[idx]; q_col[idx] = cumsum_o; }

  let r_col = new Float64Array(MAX_ORDERS);
  for (let idx = 0; idx < MAX_ORDERS; idx++) r_col[idx] = p_col[idx] + q_col[idx];

  let s_col = new Float64Array(MAX_ORDERS);
  for (let idx = 0; idx < MAX_ORDERS; idx++) {
    let curr = r_col[idx], prev = idx > 0 ? r_col[idx - 1] : 0, nxt = idx < MAX_ORDERS - 1 ? r_col[idx + 1] : 0;
    if (curr === 0) s_col[idx] = 0;
    else if (curr < 0) s_col[idx] = (nxt < 0) ? (curr - nxt) : curr;
    else s_col[idx] = (prev < 0) ? curr : (curr - prev);
  }

  let y_raw = [], z_raw = [];
  for (let idx = 0; idx < MAX_ORDERS - 1; idx++) {
    let mv = m_col[idx]; if (isNaN(mv)) continue;
    y_raw.push(o_col[idx] < 0 ? mv - 0.01 : mv);
    z_raw.push(n_col[idx] > 0 ? mv + 0.01 : mv);
  }

  let y_sorted = y_raw.sort((a, b) => b - a), z_sorted = z_raw.sort((a, b) => b - a), y_final = new Array(MAX_ORDERS).fill(NaN), z_final = new Array(MAX_ORDERS).fill(NaN);
  for (let i = 0; i < z_sorted.length; i++) z_final[i] = z_sorted[i];
  for (let i = 0; i < y_sorted.length; i++) if (i + 1 < MAX_ORDERS) y_final[i + 1] = y_sorted[i];

  let grouped = {};
  for (let idx = 0; idx < MAX_ORDERS; idx++) {
    let s = s_col[idx]; if (s === 0) continue;
    let side = s > 0 ? "매수" : "매도", price = s > 0 ? y_final[idx] : z_final[idx];
    if (isNaN(price) || price <= 0) continue;
    let method = (price === 0.01 && side === "매도") ? "MOC" : "LOC", key = side + "|" + method + "|" + price.toFixed(4);
    if (!grouped[key]) grouped[key] = { side: side, method: method, price: price, qty: Math.abs(s) };
    else grouped[key].qty += Math.abs(s);
  }

  return Object.values(grouped).sort((a, b) => b.price - a.price).map(r => [r.side, r.method, r.price, r.qty]);
}

// 🧠 백테스트 엔진 메인 프로세스
async function runBacktestMemory(params, force = false, slotNum = null) {
  try {
    let ticker = params.basics.ticker.toString().trim(), startDate = new Date(params.basics.startDate);
    let endDateInput = params.basics.endDate;
    let endDate = (endDateInput && endDateInput.trim() !== "") ? new Date(endDateInput) : new Date();
    endDate.setHours(23, 59, 59, 999);

    function n(val, def) { return (val === "" || isNaN(val)) ? def : parseFloat(val); }
    function p(val) { const num = parseFloat(val); return isNaN(num) ? 0.0 : (num / 100.0); }

    // 수동 백테스트 모드일 때는 화면 입력값이 아닌 전달받은 params(통합 설정값)를 그대로 사용
    const useDomValues = !isManualBacktestMode && (activeSettingsTab === slotNum);

    const pInput = useDomValues ? document.getElementById('initialCash') : null;
    const realTimePrincipal = pInput ? parseFloat(unformatComma(pInput.value)) : n(params.basics.initialCash, 10000);

    const rInput = useDomValues ? document.getElementById('renewCash') : null;
    const realTimeRenew = rInput ? parseFloat(unformatComma(rInput.value)) : n(params.basics.renewCash, realTimePrincipal);

    params.basics.initialCash = realTimePrincipal;
    params.basics.renewCash = realTimeRenew;

    let initialCash = fixFloat(realTimePrincipal);
    let basePrincipal = fixFloat(realTimeRenew);

    let curStrat = params.basics.strategy || '2M3D1-1P';
    if (!MASTER_STRATEGIES[curStrat]) curStrat = '2M3D1-1P';
    let M_STRAT = MASTER_STRATEGIES[curStrat];
    let cfg = M_STRAT.config;
    let MODES = M_STRAT.modes;

    let compR = cfg.compR, lossR = cfg.lossR, EPS = 0.0000001;
    let fBuy = p(params.basics.fBase);
    let fSellT = p(params.basics.fBase) + p(params.basics.fSec);
    let tierAssign = cfg.tierMethod, dLimit = cfg.dLimit, cDn3 = cfg.cDn3, cDn2 = cfg.cDn2, cDn1 = cfg.cDn1;
    let useMid1 = cfg.useMid1, useMid2 = cfg.useMid2, useMid3 = cfg.useMid3;

    let startTs = Math.floor(startDate.getTime() / 1000) - (365 * 86400);
    let todayFixed = new Date(); todayFixed.setHours(23, 59, 59, 999);
    let endTs = Math.floor(todayFixed.getTime() / 1000);

    let [mainDataAll, qqqData] = await Promise.all([
      fetchYahooData(ticker, startTs, endTs, true, force),
      fetchYahooData("QQQ", startTs, endTs, true, force)
    ]);
    window.globalMainData = mainDataAll;
    let startIndex = mainDataAll.dates.findIndex(d => d >= startDate); if (startIndex === -1) startIndex = 0;
    let firstPrevClose = (startIndex > 0) ? mainDataAll.close[startIndex - 1] : mainDataAll.open[0], wRsiMap = calculateWRSI_WFRI(qqqData);

    let cash = initialCash, prev_total = initialCash, peak = initialCash, base = basePrincipal, inv = [];
    let cumulativeInOut = 0;
    let cumulativeRealizedProfit = 0;
    let trackingRealPrincipal = initialCash; // ⭐️ 엔진 루프용 원금 추적 변수 초기화
    let res = { S: [], BA: [], BF: [], AV: [], INOUT: [], dailyStates: [], trades: [] };

    let activeSlot = slotNum || activeSettingsTab;
    let bDates = mainDataAll.dates.filter(d => d <= endDate && d >= startDate);
    const snapKey = `vtotal_snap${activeSlot}_` + myUserId;
    const snapStr = localStorage.getItem(snapKey);
    let startLoopIdx = 0;
    let maxBuyDate = "";

    // ⭐️ [수정] 수동 백테스트나 저장 모드(!isManualBacktestMode 아닐 때)에서는 스냅샷 상속 차단
    // 그래야 시트 데이터와 현재 계산값이 다를 때 경고창을 정확히 띄울 수 있음.
    if (!isManualBacktestMode && !force && snapStr) {
      let snap = JSON.parse(snapStr);
      if (snap.currentStrat === curStrat && snap.chartDates && snap.chartDates.length > 0) {
        res.S = snap.chartDates;
        res.BA = snap.chartBalances;
        res.BF = snap.chartMdd;
        res.trades = snap.trades || [];

        inv = snap.inv || [];
        inv.forEach(h => { if (h.buyDate > maxBuyDate) maxBuyDate = h.buyDate; });
        let lastSnapDateStr = res.S[res.S.length - 1];
        if (lastSnapDateStr > maxBuyDate) maxBuyDate = lastSnapDateStr;

        cash = fixFloat(snap.summary.cash);
        peak = snap.summary.peak || (res.BA.length > 0 ? Math.max(...res.BA) : initialCash);
        cumulativeRealizedProfit = snap.summary.realizedProfit || 0;

        let oldBase = fixFloat(snap.summary.base || initialCash);
        // ⭐️ [원금 오염 차단] 시트 데이터(스냅샷)가 있으면 설정창 값 대신 시트 원금을 상속받습니다.
        trackingRealPrincipal = snap.summary.realPrincipal || initialCash; 
        cumulativeInOut = fixFloat(snap.summary.inout || 0);

        // ⭐️ 보유 주식이 없어도 시트의 현금 상태를 100% 보존
        base = oldBase;

        // ⭐️ [4/20 누락 버그 해결] 무조건 시트의 마지막 날짜(4/17) 다음부터 루프 실행!
        // (위에서 이미 선언된 lastSnapDateStr을 그대로 재사용)
        lastSnapDateStr = res.S[res.S.length - 1]; 
        startLoopIdx = bDates.findIndex(d => formatDateNY(d) > lastSnapDateStr);
        if (startLoopIdx === -1) startLoopIdx = bDates.length;
      }
    }

    let full_c = mainDataAll.close, rsi_m = 'SF';
    function t2(v) {
      if (v === null || v === undefined || isNaN(v)) return 0.0;
      return Math.trunc((v + 0.00001) * 100) / 100.0;
    }
    function t2_pl(v) {
      if (v === null || v === undefined || isNaN(v)) return 0.0;
      let sign_v = (v > 0 ? 1 : (v < 0 ? -1 : 0));
      return Math.trunc((v + sign_v * 0.00001) * 100) / 100.0;
    }
    function c2(v) {
      if (v === null || v === undefined || isNaN(v)) return 0.0;
      return Math.ceil((v * 100) - 0.00001) / 100.0;
    }
    function truncPct5(v) { return v; }

    // 워밍업 로직: 데이터 시작점(인덱스 0)부터 rsi_m 전이 상태를 추적하여 파이썬 정합성을 확보
    for (let wI = 0; wI < (startIndex + startLoopIdx); wI++) {
      let dtStrObj = mainDataAll.dates[wI];
      if (!dtStrObj) continue;
      let dtStr = formatDateNY(dtStrObj);
      let rv = wRsiMap[dtStr] ? wRsiMap[dtStr].dR : 50, rrv = wRsiMap[dtStr] ? wRsiMap[dtStr].dRR : 50;
      if (rv !== 0) {
        if (rrv <= 35 && rrv < rv) rsi_m = 'AG';
        else if (rrv >= 40 && rrv < 50 && rrv > rv) rsi_m = 'SF';
        else if (rrv <= 50 && rv > 50) rsi_m = 'AG';
        else if (rrv >= 50 && rv < 50) rsi_m = 'SF';
        else if (rrv >= 50 && rrv < 60 && rrv < rv) rsi_m = 'AG';
        else if (rrv > 65 && rrv > rv) rsi_m = 'SF';
      }
    }

    for (let i = startLoopIdx; i < bDates.length; i++) {
      let idx = startIndex + i, close = full_c[idx], dtStr = formatDateNY(bDates[i]), prev = (idx === 0) ? firstPrevClose : full_c[idx - 1];
      if (res.S.includes(dtStr)) continue;

      let current_daily_profits = 0; // 당일 실현 수익 합계용
      let daily_trades_temp = [];    // 당일 매매건 임시 보관

      let rv = wRsiMap[dtStr] ? wRsiMap[dtStr].dR : 50, rrv = wRsiMap[dtStr] ? wRsiMap[dtStr].dRR : 50;
      if (rv !== 0) {
        if (rrv <= 35 && rrv < rv) rsi_m = 'AG';
        else if (rrv >= 40 && rrv < 50 && rrv > rv) rsi_m = 'SF';
        else if (rrv <= 50 && rv > 50) rsi_m = 'AG';
        else if (rrv >= 50 && rv < 50) rsi_m = 'SF';
        else if (rrv >= 50 && rrv < 60 && rrv < rv) rsi_m = 'AG';
        else if (rrv > 65 && rrv > rv) rsi_m = 'SF';
      }

      let is3Drop = (idx >= 4) && (truncPct5((full_c[idx - 3] - full_c[idx - 4]) / full_c[idx - 4]) <= cDn3) && (truncPct5((full_c[idx - 2] - full_c[idx - 3]) / full_c[idx - 3]) <= cDn2) && (truncPct5((full_c[idx - 1] - full_c[idx - 2]) / full_c[idx - 2]) <= cDn1);
      let isPlunge = (truncPct5((full_c[idx - 1] - full_c[idx - 2]) / full_c[idx - 2]) <= dLimit);
      let applied_m = null;
      if (is3Drop) {
        if (rsi_m === 'SF' && useMid1) applied_m = 'Middle';
        else if (rsi_m === 'AG' && useMid3) applied_m = 'Middle3';
      }
      if (!applied_m && isPlunge && useMid2) {
        applied_m = 'Middle2';
      }
      let curr_m = applied_m || rsi_m;

      let t = inv.length + 1;
      if (tierAssign === '최소(빈자리)' || tierAssign === '최소') {
        let used = inv.map(p => p.tier); t = 1; while (used.indexOf(t) !== -1) t++;
      }

      let b_qty = 0, b_tgt = 0, seed = 0.0;
      if (MODES[curr_m] && t <= MODES[curr_m].weight.length) {
        let w_val = MODES[curr_m].weight[t - 1];
        seed = t2(Math.min(base * w_val, cash));
        b_tgt = t2(prev * (1 + MODES[curr_m].buy[t - 1]));
        if (b_tgt > 0 && close <= b_tgt) b_qty = Math.floor(seed / (b_tgt * (1 + fBuy)) + 0.00001);
      }

      let d_sell_net = 0.0, d_buy_cost = 0.0, d_cf = 0.0, d_pl = 0.0, n_inv = [];
      for (let p_idx = 0; p_idx < inv.length; p_idx++) {
        let p_inv = inv[p_idx]; p_inv.days++;
        let p_mode = MODES[p_inv.mode]; if (!p_mode) continue;
        let tIdx = Math.min(p_inv.tier - 1, p_mode.sell.length - 1);
        let sellRate = p_mode.sell[tIdx] || 0;
        let s_tgt = c2(p_inv.buy_price * (1 + sellRate));
        let hIdx = Math.min(p_inv.tier - 1, p_mode.hold.length - 1);
        let h_limit = p_mode.hold[hIdx] || 1;

        if (close >= s_tgt || p_inv.days >= h_limit) {
          let net = (p_inv.qty * close) * (1 - fSellT);

          let trade_pl = net - p_inv.cost;
          d_pl += trade_pl; d_cf += net;
          d_sell_net += net; d_buy_cost += p_inv.cost;

          current_daily_profits += trade_pl;
          daily_trades_temp.push({
            buyDate: p_inv.buyDate,
            sellDate: dtStr,
            mode: p_inv.mode,
            tier: p_inv.tier,
            buyPrice: p_inv.buy_price,
            sellPrice: close,
            qty: p_inv.qty
          });
        } else n_inv.push(p_inv);
      }
      inv = n_inv;
      if (b_qty > 0) {
        let totalBC = (b_qty * close) * (1 + fBuy);

        if (totalBC <= cash) {
          d_cf -= totalBC;
          inv.push({ buy_price: close, qty: b_qty, cost: totalBC, mode: curr_m, tier: t, days: 0, buyDate: dtStr });
        }
      }

      cash = t2(cash + d_cf);
      let pl_f = t2_pl(d_pl);

      if (pl_f > 0) {
        base += pl_f * compR;
      } else if (pl_f < 0) {
        base += pl_f * lossR;
      }
      base = t2(base);

      cumulativeRealizedProfit += pl_f;

      let evalVal = t2(inv.reduce((s, p_i) => s + p_i.qty, 0) * close);
      let totalBalance = t2(cash + evalVal); prev_total = totalBalance; if (totalBalance > peak) peak = totalBalance;
      let currentMdd = peak > 0 ? truncPct5((totalBalance - peak) / peak) : 0;

      res.dailyStates.push({
        date: dtStr,
        asset: totalBalance,
        inout: cumulativeInOut,
        json: JSON.stringify({
          cash: fixFloat(cash),
          base_principal: fixFloat(base),
          realPrincipal: fixFloat(trackingRealPrincipal), // ⭐️ JSON에 원금 포함
          holdings: inv.map(p => ({ ...p }))
        })
      });

      res.S.push(dtStr); res.BF.push(currentMdd); res.BA.push(totalBalance); res.AV.push(pl_f); res.INOUT.push(cumulativeInOut);

      if (daily_trades_temp.length > 0) {
        daily_trades_temp.forEach(t => {
          t.dailyProfitSum = current_daily_profits;
          t.totalBalance = totalBalance;
          t.renewCash = base;
          res.trades.push(t);
        });
      }
    }

    let rawOrderOutput = [], orderDateStr = "날짜 확인 불가";
    let nextOrderInfo = { tier: "-", mode: "-", weight: "-", qty: "-" };

    let tIdx = full_c.length;
    // 백테스트 매매 기록(res.S) 유무와 상관없이, 과거 데이터(tIdx)만 있으면 즉시 주문표 생성
    if (tIdx > 0) {
      const lastDateDaily = mainDataAll.dates[tIdx - 1];
      const lastDateNYStr = formatDateNY(lastDateDaily);
      const lp = lastDateNYStr.split('-');
      const lastDateNY = new Date(parseInt(lp[0]), parseInt(lp[1]) - 1, parseInt(lp[2]), 20);
      const dayOfWeekNY = lastDateNY.getDay();
      const lastFriTS = getFridayEnd(lastDateDaily);

      lastDateNY.setDate(lastDateNY.getDate() + (dayOfWeekNY === 5 ? 3 : 1));
      while (true) {
        const dateStr = formatDateNY(lastDateNY);
        const dow = lastDateNY.getDay();
        if (dow === 0 || dow === 6 || isUSMarketHoliday(dateStr)) {
          lastDateNY.setDate(lastDateNY.getDate() + 1);
        } else { break; }
      }
      const nextFriTS = getFridayEnd(lastDateNY);
      orderDateStr = (lastDateNY.getMonth() + 1) + "/" + lastDateNY.getDate();

      let today_m = 'SF';
      if (wRsiMap[lastDateNYStr]) {
        let base_rv = wRsiMap[lastDateNYStr].dR;
        let base_rrv = wRsiMap[lastDateNYStr].dRR;
        if (base_rv !== 0) {
          if (base_rrv <= 35 && base_rrv < base_rv) today_m = 'AG';
          else if (base_rrv >= 40 && base_rrv < 50 && base_rrv > base_rv) today_m = 'SF';
          else if (base_rrv <= 50 && base_rv > 50) today_m = 'AG';
          else if (base_rrv >= 50 && base_rv < 50) today_m = 'SF';
          else if (base_rrv >= 50 && base_rrv < 60 && base_rrv < base_rv) today_m = 'AG';
          else if (base_rrv > 65 && base_rrv > base_rv) today_m = 'SF';
        }
      }

      if (nextFriTS !== lastFriTS) {
        const lastBarInfo = wRsiMap[lastDateNYStr];
        if (lastBarInfo) {
          const rv = lastBarInfo.dCurrent;
          const rrv = lastBarInfo.dR;
          if (rv !== 0) {
            if (rrv <= 35 && rrv < rv) today_m = 'AG';
            else if (rrv >= 40 && rrv < 50 && rrv > rv) today_m = 'SF';
            else if (rrv <= 50 && rv > 50) today_m = 'AG';
            else if (rrv >= 50 && rv < 50) today_m = 'SF';
            else if (rrv >= 50 && rrv < 60 && rrv < rv) today_m = 'AG';
            else if (rrv > 65 && rrv > rv) today_m = 'SF';
          }
        }
      }

      let lastDataClose = full_c[tIdx - 1];
      let tp1_h = truncPct5((full_c[tIdx - 1] - (full_c[tIdx - 2] || full_c[tIdx - 1])) / (full_c[tIdx - 2] || full_c[tIdx - 1]));
      let tp2_h = truncPct5(((full_c[tIdx - 2] || full_c[tIdx - 1]) - (full_c[tIdx - 3] || full_c[tIdx - 2])) / (full_c[tIdx - 3] || full_c[tIdx - 2]));
      let tp3_h = truncPct5(((full_c[tIdx - 3] || full_c[tIdx - 2]) - (full_c[tIdx - 4] || full_c[tIdx - 3])) / (full_c[tIdx - 4] || full_c[tIdx - 3]));

      if (tIdx >= 5) {
        let is3Drop_t = (tp1_h <= cDn1 && tp2_h <= cDn2 && tp3_h <= cDn3);
        let isPlunge_t = (tp1_h <= dLimit);
        let applied_m_t = null;
        if (is3Drop_t) {
          if (today_m === 'SF' && useMid1) applied_m_t = 'Middle';
          else if (today_m === 'AG' && useMid3) applied_m_t = 'Middle3';
        }
        if (!applied_m_t && isPlunge_t && useMid2) {
          applied_m_t = 'Middle2';
        }
        if (applied_m_t) today_m = applied_m_t;
      }

      let tTier = inv.length + 1; if (tierAssign === '최소(빈자리)' || tierAssign === '최소') { let used = inv.map(p_i => p_i.tier); tTier = 1; while (used.indexOf(tTier) !== -1) tTier++; }
      let currentW = MODES[today_m].weight[tTier - 1] || 0;

      // 🎯 [순수 백테스트 반영] 시작일부터 누적/계산되어 온 백테스트 최종 갱신금(base) 기준
      let tSeed = t2(Math.min(base * currentW, cash));

      let bTgtVal = MODES[today_m].buy[tTier - 1] || 0;
      let tTgt = t2(lastDataClose * (1 + bTgtVal));
      let todayBuyQty = (tTgt > 0 && currentW > 0) ? Math.floor((tSeed / (tTgt * (1 + fBuy))) + 0.00001) : 0;
      if (todayBuyQty > 0) rawOrderOutput.push(["매수", "LOC", tTgt, todayBuyQty]);

      inv.forEach(p_i => {
        let p_mode = MODES[p_i.mode] || MODES['SF'];
        let sellRate = p_mode.sell[p_i.tier - 1] || p_mode.sell[0] || 0;
        let s_tgt = c2(p_i.buy_price * (1 + sellRate));
        rawOrderOutput.push(["매도", "LOC", s_tgt, p_i.qty]);
      });

      nextOrderInfo = { tier: tTier, mode: today_m, weight: (currentW * 100).toFixed(1), qty: todayBuyQty };
    }

    let lastIdx = res.BA.length - 1, tAssets = res.BA[lastIdx];
    let totalRealizedProfit = fixFloat(cumulativeRealizedProfit);
    let tQty = inv.reduce((s, p) => s + p.qty, 0), avgPrice = tQty > 0 ? fixFloat(inv.reduce((s, p) => s + p.cost, 0) / tQty) : 0;
    let currPrice = full_c.length > 0 ? full_c[full_c.length - 1] : 0;
    let evalVal = fixFloat(inv.reduce((s, p_i) => s + (p_i.qty * currPrice), 0));
    let realPrincipal = fixFloat(trackingRealPrincipal); // ⭐️ 설정창 값 대신 시트(C129 기준)에서 확정된 원금 강제 유지
    let totalProfit = fixFloat(tAssets - realPrincipal);

    if (totalProfit === 0 && base !== tAssets) {
      totalProfit = fixFloat(tAssets - base);
    }

    let yrs = (endDate - startDate) / (1000 * 60 * 60 * 24 * 365);
    let cagr = yrs > 0 ? (Math.pow((tAssets / realPrincipal), (1 / yrs)) - 1) : 0;
    let oMdd = res.BF.length > 0 ? Math.min(...res.BF) : 0;

    let summary = {
      totalAssets: tAssets,
      yield: (realPrincipal > 0) ? (tAssets - realPrincipal) / realPrincipal : 0,
      cagr: cagr,
      mdd: oMdd, calmar: oMdd !== 0 ? Math.abs(cagr / oMdd) : 0,
      totalProfit: totalProfit,
      realizedProfit: fixFloat(tAssets - base),
      qty: tQty, avgPrice: avgPrice, evalReturn: tQty > 0 ? (currPrice - avgPrice) / avgPrice : 0,
      evalVal: evalVal, cash: cash, depletion: tAssets > 0 ? (evalVal / tAssets) : 0,
      currPrice: currPrice, currentMdd: res.BF[lastIdx],
      base: base, inout: cumulativeInOut, realPrincipal: realPrincipal, peak: peak
    };

    let finalOrders = run_tungchigi_master(rawOrderOutput);

    return {
      status: "success",
      inv: inv,
      trades: res.trades,
      orders: finalOrders,
      orderDateStr: orderDateStr,
      summary: summary,
      chartDates: res.S,
      chartBalances: res.BA,
      chartMdd: res.BF,
      monthlyData: calculateMonthlyData(res.S, res.BA, res.BF, res.INOUT),
      yearlyData: calculateYearlyData(res.S, res.BA, res.BF, res.INOUT),
      currentStrat: curStrat,
      nextOrderInfo: nextOrderInfo,
      dailyStates: res.dailyStates,
      chartInout: res.INOUT,
      isSynced: false // ⭐️ 엔진 결과는 동기화 전 상태임
    };
  } catch (e) { return { status: "error", message: e.toString() }; }
}

function calculateMonthlyData(dates, balances, mdds, inouts) {
  if (!dates || dates.length === 0) return [];
  let monthly = [];
  let currentMonth = dates[0].substring(0, 7);

  let monthStartBalance = balances[0];
  let monthStartInout = (inouts && inouts.length > 0) ? inouts[0] : 0;
  let currentMonthMinMdd = mdds[0];

  for (let i = 0; i < dates.length; i++) {
    let monthKey = dates[i].substring(0, 7);
    let dMdd = mdds[i];

    if (monthKey !== currentMonth) {
      let endBalance = balances[i - 1];
      let endInout = inouts ? inouts[i - 1] : 0;

      // 월간 순입출금 및 수익금 계산
      let inoutForPeriod = endInout - monthStartInout;
      let monthProfit = endBalance - monthStartBalance - inoutForPeriod;
      let basis = monthStartBalance + inoutForPeriod;

      monthly.push({
        period: currentMonth,
        asset: endBalance,
        rate: basis > 0 ? monthProfit / basis : 0,
        profit: monthProfit,
        mdd: currentMonthMinMdd
      });

      currentMonth = monthKey;
      monthStartBalance = endBalance;
      monthStartInout = endInout;
      currentMonthMinMdd = dMdd;
    } else {
      if (dMdd < currentMonthMinMdd) currentMonthMinMdd = dMdd;
    }

    if (i === dates.length - 1) {
      let endBalance = balances[i];
      let endInout = inouts ? inouts[i] : 0;

      let inoutForPeriod = endInout - monthStartInout;
      let monthProfit = endBalance - monthStartBalance - inoutForPeriod;
      let basis = monthStartBalance + inoutForPeriod;

      monthly.push({
        period: currentMonth,
        asset: endBalance,
        rate: basis > 0 ? monthProfit / basis : 0,
        profit: monthProfit,
        mdd: currentMonthMinMdd
      });
    }
  }
  return monthly;
}

function calculateYearlyData(dates, balances, mdds, inouts) {
  if (!dates || dates.length === 0) return [];
  let yearly = [];
  let currentYear = dates[0].substring(0, 4);

  let yearStartBalance = balances[0];
  let yearStartInout = (inouts && inouts.length > 0) ? inouts[0] : 0;
  let currentYearMinMdd = mdds[0];

  for (let i = 0; i < dates.length; i++) {
    let yearKey = dates[i].substring(0, 4);
    let dMdd = mdds[i];

    if (yearKey !== currentYear) {
      let endBalance = balances[i - 1];
      let endInout = inouts ? inouts[i - 1] : 0;

      // 연간 순입출금 및 수익금 계산
      let inoutForPeriod = endInout - yearStartInout;
      let yearProfit = endBalance - yearStartBalance - inoutForPeriod;
      let basis = yearStartBalance + inoutForPeriod;

      yearly.push({
        period: currentYear,
        asset: endBalance,
        rate: basis > 0 ? yearProfit / basis : 0,
        profit: yearProfit,
        mdd: currentYearMinMdd
      });

      currentYear = yearKey;
      yearStartBalance = endBalance;
      yearStartInout = endInout;
      currentYearMinMdd = dMdd;
    } else {
      if (dMdd < currentYearMinMdd) currentYearMinMdd = dMdd;
    }

    if (i === dates.length - 1) {
      let endBalance = balances[i];
      let endInout = inouts ? inouts[i] : 0;

      let inoutForPeriod = endInout - yearStartInout;
      let yearProfit = endBalance - yearStartBalance - inoutForPeriod;
      let basis = yearStartBalance + inoutForPeriod;

      yearly.push({
        period: currentYear,
        asset: endBalance,
        rate: basis > 0 ? yearProfit / basis : 0,
        profit: yearProfit,
        mdd: currentYearMinMdd
      });
    }
  }
  return yearly;
}

// 🌐 실전 데이터 처리 (Real Log Data)
function processRealLogData(d, currentStrat, userInitialCash) {
  if (!d || !d.logs || d.logs.length === 0) return null;
  const logs = d.logs; const meta = d.meta;
  let restoredInv = []; let restoredBase = 0; let realizedProfit = fixFloat(meta.realizedProfit) || 0; let cash = fixFloat(meta.currentCash) || 0; let serverQty = fixFloat(meta.qty) || 0; let serverAvg = fixFloat(meta.avgPrice) || 0;
  let restoredRealPrincipal = 0; // ⭐️ JSON에서 원금 추출용 변수
  if (d.json && d.json.trim() !== "") { try { const parsed = JSON.parse(d.json); if (parsed.holdings) restoredInv = parsed.holdings; if (parsed.base_principal !== undefined) { restoredBase = fixFloat(parsed.base_principal); } else if (parsed.base !== undefined) { restoredBase = fixFloat(parsed.base); } if (parsed.realizedProfit !== undefined) realizedProfit = fixFloat(parsed.realizedProfit); if (parsed.cash !== undefined) cash = fixFloat(parsed.cash); if (parsed.realPrincipal !== undefined) restoredRealPrincipal = fixFloat(parsed.realPrincipal); } catch (e) { console.error("JSON 파싱 실패", e); } }
  let qty = 0, totalCost = 0; restoredInv.forEach(item => { qty += item.qty; totalCost += item.cost; }); let avgPrice = qty > 0 ? fixFloat(totalCost / qty) : 0;
  const parseAndFormatYYMMDD = (ds) => {
    if (!ds) return null;
    let str = String(ds).trim();
    str = str.replace(/[^0-9.\-\/]/g, '');
    str = str.replace(/[.\/]/g, '-');
    let p = str.split('-');
    if (p.length === 1 && str.length >= 6) { let y = str.slice(0, 4); let m = str.slice(4, 6); let d = str.slice(6, 8) || "01"; return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`; }
    if (p.length >= 3) { let y = p[0]; if (y.length === 2) y = "20" + y; let m = p[1].padStart(2, '0'); let d = p[2].padStart(2, '0'); return `${y}-${m}-${d}`; }
    else if (p.length === 2) { let y = p[0]; if (y.length === 2) y = "20" + y; let m = p[1].padStart(2, '0'); return `${y}-${m}-01`; }
    return str;
  };
  let rawLogs = []; for (let i = 0; i < logs.length; i++) { let r = logs[i]; let dateStr = r[0]; let asset = fixFloat(String(r[1]).replace(/[^0-9.-]+/g, "")) || 0; if (dateStr && asset > 0) { let exactDate = parseAndFormatYYMMDD(dateStr); let inoutValue = fixFloat(String(r[2]).replace(/[^0-9.-]+/g, "")) || 0; /* ⭐️ r[3]을 r[2]로 변경 */ rawLogs.push({ date: exactDate, asset: asset, inout: inoutValue, raw: r }); } }
  
  if (rawLogs.length === 0) {
    // ⭐️ [신규 시작 케이스] 시트에 기록이 아예 없다면?
    // 설정창에 입력된 초기자산(C9)을 원금의 시작점으로 잡습니다.
    const calculatedPrincipal = fixFloat(userInitialCash);
    return {
      summary: { realPrincipal: calculatedPrincipal, totalAssets: userInitialCash, cash: userInitialCash, inout: 0, base: userInitialCash },
      status: "success",
      chartDates: [],
      chartBalances: [],
      chartMdd: [],
      isSynced: true
    };
  }
  rawLogs.sort((a, b) => (a.date > b.date ? 1 : -1));

  const originalFirstDate = rawLogs[0].date;
  const trueStartDateStr = originalFirstDate;

  // ⭐️ [원금 공식 강제 통일] 시트 첫 기록 자산(C129 등) + D열(입출금) 전체 합산
  let totalInoutSum = 0;
  for (let i = 1; i < rawLogs.length; i++) {
    totalInoutSum += (rawLogs[i].inout || 0);
  }
  
  // 시트의 첫 번째 줄(C129) 자산값을 가져옵니다.
  const sheetStartingAsset = rawLogs.length > 0 ? rawLogs[0].asset : userInitialCash;
  
  // 💰 원금 정답 = C129 + SUM(D129:D)
  const calculatedPrincipal = fixFloat(sheetStartingAsset + totalInoutSum);

  // 🗓️ [전체 타임라인 생성] 실제 로그는 필터링 없이 전체 기록을 그대로 사용합니다
  let chartDates = [], chartBalances = [], chartMdd = [], chartInout = [];
  let peak = -Infinity; let runningInout = 0;

  rawLogs.forEach(r => {
    chartDates.push(r.date);
    chartBalances.push(r.asset);
    runningInout = fixFloat(runningInout + r.inout);
    chartInout.push(runningInout);
    if (r.asset > peak) peak = r.asset;
    chartMdd.push(peak > 0 ? (r.asset - peak) / peak : 0);
  });

  // 테이블 계산용 Full 데이터 필드도 동일하게 유지
  let chartDatesFull = [...chartDates], chartBalancesFull = [...chartBalances], chartInoutFull = [...chartInout], chartMddFull = [...chartMdd];


  const lastAsset = chartBalances[chartBalances.length - 1] || 0;
  const minMdd = chartMdd.length > 0 ? Math.min(...chartMdd) : 0;

  // 💰 [정합성 고정] 
  // calculatedPrincipal: 시트 로직 원금 (성과 분석용)
  // finalPrincipal: JSON/설정에서 복원된 기준금 (매수/매도 시드 기록용)
  const finalPrincipal = restoredBase > 0 ? restoredBase : calculatedPrincipal;

  // 💰 성과 지표는 '절대 원금'을 기준으로 일관되게 계산
  const totalProfit = fixFloat(lastAsset - calculatedPrincipal);
  const simpleYield = calculatedPrincipal > 0 ? totalProfit / calculatedPrincipal : 0;
  const evalVal = fixFloat(lastAsset - cash); const depletion = lastAsset > 0 ? (evalVal / lastAsset) : 0; const investPrincipal = fixFloat(qty * avgPrice); const evalReturn = investPrincipal > 0 ? (evalVal - investPrincipal) / investPrincipal : 0; const currPrice = parseFloat(meta.tickerPrice) || (qty > 0 ? evalVal / qty : 0);

  // 📊 CAGR 계산: 구글 시트 공식 완벽 동기화 (trueStartDateStr 사용)
  let cagr = 0;
  const effectivePrincipal = (calculatedPrincipal > 0) ? calculatedPrincipal : (restoredBase > 0 ? restoredBase : 0);

  if (chartDates.length > 0 && effectivePrincipal > 0 && lastAsset > 0) {
    const toDateObj = (str) => {
      let p = str.split('-');
      let year = parseInt(p[0], 10);
      if (year < 100) year += 2000;
      return new Date(year, parseInt(p[1], 10) - 1, parseInt(p[2], 10));
    };

    // ⭐️ 시작일: 필터링 전의 진짜 시작일(S6) 사용
    const sDateForCagr = toDateObj(trueStartDateStr);
    const eDateForCagr = toDateObj(chartDates[chartDates.length - 1]);

    // DATEDIF(S6, 끝, "d") 에 해당
    let diffDays = Math.max(1, Math.round((eDateForCagr - sDateForCagr) / (1000 * 60 * 60 * 24)));

    const effProfit = fixFloat(lastAsset - effectivePrincipal);
    const effYield = effectivePrincipal > 0 ? effProfit / effectivePrincipal : 0;

    // 시트 공식: =POWER(1+수익률, 365/일수) - 1
    let calcValue = Math.pow(1 + effYield, 365 / diffDays) - 1;
    cagr = (isFinite(calcValue) && !isNaN(calcValue)) ? calcValue : effYield;
  }
  const calcPeriod = (type) => {
    // ⭐️ 테이블은 차트 필터링과 무관하게 전체 히스토리(Full)를 사용
    if (chartDatesFull.length === 0) return [];
    let periods = {};
    for (let i = 0; i < chartDatesFull.length; i++) {
      let parts = chartDatesFull[i].split('-');
      let periodKey = type === 'month' ? `${parts[0]}-${parts[1]}` : parts[0];
      if (!periods[periodKey]) { periods[periodKey] = { startIdx: i, endIdx: i, indices: [] }; }
      periods[periodKey].endIdx = i; periods[periodKey].indices.push(i);
    }
    let result = []; let pKeys = Object.keys(periods).sort();
    for (let i = 0; i < pKeys.length; i++) {
      let key = pKeys[i]; let pData = periods[key];
      let startAsset = 0; let startInout = 0;
      if (i === 0) {
        startAsset = chartBalancesFull[0]; startInout = chartInoutFull[0] || 0;
      } else {
        const prevEndIdx = periods[pKeys[i - 1]].endIdx;
        startAsset = chartBalancesFull[prevEndIdx];
        startInout = chartInoutFull[prevEndIdx] || 0;
      }
      let endAsset = chartBalancesFull[pData.endIdx];
      let endInout = chartInoutFull[pData.endIdx] || 0;
      let inoutForPeriod = endInout - startInout;
      let profit = endAsset - startAsset - inoutForPeriod;
      let profitBasis = startAsset + inoutForPeriod;
      let minMddVal = 0;
      for (let idx of pData.indices) { if (chartMddFull[idx] < minMddVal) minMddVal = chartMddFull[idx]; }
      result.push({ period: key, asset: endAsset, rate: profitBasis > 0 ? profit / profitBasis : 0, profit: profit, mdd: minMddVal });
    } return result.reverse();
  };

  let finalEffPrincipal = (calculatedPrincipal > 0) ? calculatedPrincipal : (restoredBase > 0 ? restoredBase : 0);
  let finalProfit = fixFloat(lastAsset - finalEffPrincipal);
  let finalYield = finalEffPrincipal > 0 ? finalProfit / finalEffPrincipal : 0;

  // ⭐️ summary 객체 생성 시 시트의 값을 그대로 매핑
  let summary = { 
    totalAssets: lastAsset, // 시트 C열 값
    yield: finalYield, 
    cagr: cagr, 
    mdd: minMdd, 
    calmar: minMdd !== 0 ? Math.abs(cagr / minMdd) : 0, 
    totalProfit: finalProfit, 
    realizedProfit: realizedProfit, 
    qty: serverQty, 
    avgPrice: serverAvg, 
    evalReturn: evalReturn, 
    evalVal: evalVal, 
    cash: cash, // 시트 JSON의 cash 값
    depletion: depletion, 
    currPrice: currPrice, 
    currentMdd: chartMdd[chartMdd.length - 1], 
    base: finalPrincipal, // 시트 JSON의 base_principal 값
    inout: totalInoutSum, 
    realPrincipal: calculatedPrincipal, // 우리가 계산한 진짜 원금
    trueStartDate: trueStartDateStr 
  };
  let rawOrderOutput = []; let M_STRAT_T = MASTER_STRATEGIES[currentStrat] || MASTER_STRATEGIES["2M3D1-1P"]; let MODES_T = M_STRAT_T.modes; function c2_T(v) { return Math.ceil((v * 100) - 0.0000001) / 100.0; }
  if (restoredInv.length > 0) { restoredInv.forEach(p_i => { let modeData = MODES_T[p_i.mode] || MODES_T['SF']; let sellRate = modeData.sell[p_i.tier - 1] || modeData.sell[0] || 0; let s_tgt = c2_T(p_i.buy_price * (1 + sellRate)); rawOrderOutput.push(["매도", "LOC", s_tgt, p_i.qty]); }); }
  const finalOrders = rawOrderOutput.sort((a, b) => b[2] - a[2]);
  return {
    status: "success",
    S: chartDates,
    BA: chartBalances,
    BF: chartMdd,
    inv: restoredInv,
    orders: finalOrders,
    orderDateStr: chartDates[chartDates.length - 1] + " (동기화됨)",
    summary: summary,
    chartDates: chartDates,
    chartBalances: chartBalances,
    chartMdd: chartMdd,
    chartInout: chartInout,
    // ⭐️ 종합 테이블 합산을 위한 전체 데이터 필드 추가
    chartDatesFull: chartDatesFull,
    chartBalancesFull: chartBalancesFull,
    chartInoutFull: chartInoutFull,
    monthlyData: calcPeriod('month'),
    yearlyData: calcPeriod('year'),
    currentStrat: currentStrat,
    isSynced: true // ⭐️ 시트 데이터 기반 결과는 동기화됨
  };
}

// 🧠 [engine.js] 다중 슬롯 종합 계산 로직
function calculateCombinedSummaryEngine(activeResults) {
  if (!activeResults || activeResults.length === 0) return null;
  if (activeResults.length === 1) return activeResults[0].summary;

  let tAssets = 0, evalVal = 0, totalProfit = 0, realizedProfit = 0, cash = 0, qty = 0;
  let currPriceSum = 0, avgPriceSum = 0, sumRealPrincipal = 0, sumBase = 0;
  let count = activeResults.length;

  // 1. 기초 지표 및 합산 원금 계산
  for (const r of activeResults) {
    const s = r.summary || {};
    tAssets += (s.totalAssets || 0);
    evalVal += (s.evalVal || 0);
    totalProfit += (s.totalProfit || 0);
    realizedProfit += (s.realizedProfit || 0);
    cash += (s.cash || 0);
    qty += (s.qty || 0);
    currPriceSum += (s.currPrice || 0);
    avgPriceSum += ((s.avgPrice || 0) * (s.qty || 0));

    // ⭐️ 원금과 갱신금을 각각 독립적으로 단순 합산
    sumRealPrincipal += (s.realPrincipal || 0);
    sumBase += (s.base || 0);
  }

  // 2. MDD 합산 (타임라인 병합)
  let combinedMdd = 0, combinedCurrentMdd = 0;
  let allDates = new Set();
  activeResults.forEach(r => { if (r.chartDates) r.chartDates.forEach(date => allDates.add(date)); });
  let sortedDates = Array.from(allDates).sort();

  if (sortedDates.length > 0) {
    let peak = 0, minDraw = 0;
    sortedDates.forEach((dt, i) => {
      let dayAsset = 0;
      activeResults.forEach(r => {
        if (r.chartDates && r.chartBalances) {
          let idx = r.chartDates.indexOf(dt);
          if (idx !== -1) dayAsset += r.chartBalances[idx];
          else {
            let lastIdx = -1;
            for (let j = 0; j < r.chartDates.length; j++) { if (r.chartDates[j] <= dt) lastIdx = j; }
            if (lastIdx !== -1) dayAsset += r.chartBalances[lastIdx];
          }
        }
      });
      if (dayAsset > peak) peak = dayAsset;
      let draw = peak > 0 ? (dayAsset - peak) / peak : 0;
      if (draw < minDraw) minDraw = draw;
      if (i === sortedDates.length - 1) combinedCurrentMdd = draw;
    });
    combinedMdd = minDraw;
  }

  // 3. 수익률 및 CAGR 계산 (사용자 원칙 적용)
  const totalProfitSum = totalProfit; // ⭐️ 슬롯별 summary.totalProfit을 루프에서 이미 합산함
  const totalYieldCombined = sumRealPrincipal > 0 ? totalProfitSum / sumRealPrincipal : 0;

  const toDateObj = (str) => {
    if (!str) return new Date();
    let s = String(str).trim().replace(/[.\/]/g, '-');
    let p = s.split('-');
    if (p.length < 3) return new Date();
    let year = parseInt(p[0], 10);
    if (year < 100) year += 2000;
    return new Date(year, parseInt(p[1], 10) - 1, parseInt(p[2], 10));
  };

  // ⭐️ 기간 기준: 각 투자법 중 가장 운용 기간이 긴 값(maxDays) 사용
  let maxDays = 1;
  activeResults.forEach(r => {
    const sDateStr = (r.summary && r.summary.trueStartDate) ? r.summary.trueStartDate : (r.chartDates && r.chartDates[0]);
    if (sDateStr && r.chartDates && r.chartDates.length > 0) {
      const s = toDateObj(sDateStr);
      const e = toDateObj(r.chartDates[r.chartDates.length - 1]);
      const d = Math.max(1, Math.round((e - s) / 86400000));
      if (d > maxDays) maxDays = d;
    }
  });

  const cagrVal = Math.pow(1 + totalYieldCombined, 365 / maxDays) - 1;
  const finalCagr = (isFinite(cagrVal) && !isNaN(cagrVal)) ? cagrVal : totalYieldCombined;

  return {
    totalAssets: tAssets,
    yield: totalYieldCombined,
    cagr: finalCagr,
    mdd: combinedMdd,
    calmar: combinedMdd !== 0 ? Math.abs(finalCagr / combinedMdd) : 0,
    totalProfit: totalProfitSum,
    realizedProfit: realizedProfit,
    evalVal: evalVal,
    cash: cash,
    evalReturn: avgPriceSum > 0 ? (evalVal - avgPriceSum) / avgPriceSum : 0,
    qty: qty,
    currPrice: currPriceSum / count,
    avgPrice: qty > 0 ? avgPriceSum / qty : (avgPriceSum / count),
    base: sumBase,
    currentMdd: combinedCurrentMdd,
    realPrincipal: sumRealPrincipal
  };
}

// 다중 슬롯 종합 월별/년별 차트 데이터 병합 계산
function generateCombinedPeriodDataEngine(activeResults) {
  if (!activeResults || activeResults.length === 0) return { monthly: [], yearly: [] };
  if (activeResults.length === 1) return { monthly: activeResults[0].monthlyData, yearly: activeResults[0].yearlyData };

  // 1. 모든 날짜 통합
  let allDatesSet = new Set();
  activeResults.forEach(r => { if (r.chartDates) r.chartDates.forEach(d => allDatesSet.add(d)); });
  let sortedDates = Array.from(allDatesSet).sort();

  // 2. 통합 일별 자산 및 입출금 타임라인 생성
  let combinedBalances = [];
  let combinedInouts = [];
  let combinedMdds = [];
  let peak = 0;

  sortedDates.forEach(dt => {
    let dayAsset = 0;
    let dayInout = 0;

    activeResults.forEach(r => {
      if (r.chartDates && r.chartBalances) {
        let idx = r.chartDates.indexOf(dt);
        let slotInoutVal = 0;
        let currentAsset = 0;

        if (idx !== -1) {
          currentAsset = r.chartBalances[idx];
          if (r.isSynced) {
            // ⭐️ 실전 시트 데이터: chartInout[0]에 이미 초기 원금이 포함되어 있으므로 차이만 계산하여 더함 (더블 카운팅 방지!)
            let firstAsset = r.chartBalances[0] || 0;
            let firstInout = r.chartInout ? r.chartInout[0] : 0;
            let currInout = r.chartInout ? r.chartInout[idx] : 0;
            slotInoutVal = firstAsset + (currInout - firstInout);
          } else {
            // ⭐️ 수동 백테스트 데이터: chartInout이 0부터 시작하므로 초기 원금을 명시적으로 더함
            let initialCash = r.summary && r.summary.realPrincipal ? (r.summary.realPrincipal - (r.summary.inout || 0)) : (r.chartBalances[0] || 0);
            slotInoutVal = initialCash + (r.chartInout ? r.chartInout[idx] : 0);
          }
        } else {
          // 해당 날짜 없는 경우 이전 종가 사용 (Back-fill)
          let lastI = -1;
          for (let j = 0; j < r.chartDates.length; j++) { if (r.chartDates[j] <= dt) lastI = j; }
          if (lastI !== -1) {
            currentAsset = r.chartBalances[lastI];
            if (r.isSynced) {
              let firstAsset = r.chartBalances[0] || 0;
              let firstInout = r.chartInout ? r.chartInout[0] : 0;
              let currInout = r.chartInout ? r.chartInout[lastI] : 0;
              slotInoutVal = firstAsset + (currInout - firstInout);
            } else {
              let initialCash = r.summary && r.summary.realPrincipal ? (r.summary.realPrincipal - (r.summary.inout || 0)) : (r.chartBalances[0] || 0);
              slotInoutVal = initialCash + (r.chartInout ? r.chartInout[lastI] : 0);
            }
          }
        }

        dayAsset += currentAsset;
        dayInout += slotInoutVal;
      }
    });

    combinedBalances.push(dayAsset);
    combinedInouts.push(dayInout);

    // 3. 통합 MDD 계산
    if (dayAsset > peak) peak = dayAsset;
    combinedMdds.push(peak > 0 ? (dayAsset - peak) / peak : 0);
  });

  // 4. 기존 chunking 함수 재활용하여 결과 도출
  return {
    monthly: calculateMonthlyData(sortedDates, combinedBalances, combinedMdds, combinedInouts).reverse(),
    yearly: calculateYearlyData(sortedDates, combinedBalances, combinedMdds, combinedInouts).reverse()
  };
}
