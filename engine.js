// strategy.js에서 병합됨
const MASTER_STRATEGIES = {
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
      SF: { buy: [0.035, 0.035, 0.035, 0.035, 0.035, 0.035, 0.035, 0.035], sell: [0.016, 0.016, 0.016, 0.016, 0.016, 0.016, 0.016, 0.016], hold: [35, 35, 35, 35, 35, 35, 35, 35], weight: [0.046, 0.143, 0.23, 0.046, 0.115, 0.143, 0.23, 0.046] },
      Middle: { buy: [0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03], sell: [0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003], hold: [12, 12, 12, 12, 12, 12, 12, 12], weight: [0.129, 0.129, 0.129, 0.129, 0.129, 0.129, 0.129, 0.129] },
      AG: { buy: [0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025], sell: [0.032, 0.032, 0.032, 0.032, 0.032, 0.032, 0.032, 0.032], hold: [8, 8, 8, 8, 8, 8, 8, 8], weight: [0.049, 0.216, 0.043, 0.043, 0.216, 0.216, 0.12, 0.096] },
      Middle2: { buy: [0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03], sell: [0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003], hold: [12, 12, 12, 12, 12, 12, 12, 12], weight: [0.129, 0.129, 0.129, 0.129, 0.129, 0.129, 0.129, 0.129] },
      Middle3: { buy: [0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03], sell: [0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003], hold: [12, 12, 12, 12, 12, 12, 12, 12], weight: [0.129, 0.129, 0.129, 0.129, 0.129, 0.129, 0.129, 0.129] }
    }
  }
};

// engine.js (코어 백테스트 엔진 및 퉁치기 유틸리티)

const GAS_URL = "https://script.google.com/macros/s/AKfycbw1si6V_02Ua0trHlZdvT_EnFLDGA6-0hNtEaZhq2W-UGXMVo0e9K5mI3jH5IqQ4KOi9Q/exec";
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

// 🧮 퉁치기 (Order Matcher)
function run_tungchigi_master(paramsArr) {
  if (!paramsArr || paramsArr.length === 0) return [];
  let g = new Float64Array(100), h = new Float64Array(100), i_p = new Float64Array(100), j = new Float64Array(100), k = new Array(100).fill(false);
  for (let idx = 0; idx < paramsArr.length; idx++) { if (idx >= 100) break; let side = paramsArr[idx][0], method = paramsArr[idx][1], price = parseFloat(paramsArr[idx][2]), qty = parseFloat(paramsArr[idx][3]); if (side === '매수') { g[idx] = price; h[idx] = qty; } else { i_p[idx] = price; j[idx] = qty; if (method.toUpperCase() === 'MOC') k[idx] = true; } }
  let u_g = Array.from(g).filter(v => v > 0), adj_sell = Array.from(i_p).map((val, i) => k[i] ? 0.01 : val), u_i = adj_sell.filter(v => v > 0);
  let m_prices = [...new Set([...u_g, ...u_i])].sort((a, b) => b - a), m_col = new Array(100).fill(NaN); m_prices.forEach((val, i) => m_col[i] = val);
  let n_col = new Float64Array(100), o_col = new Float64Array(100);
  for (let idx = 0; idx < 100; idx++) { if (isNaN(m_col[idx])) continue; let mv = m_col[idx], count_m = m_col.slice(0, idx + 1).filter(v => v === mv).length; if (count_m > 1) { n_col[idx] = 0; } else { let sum_h = 0; for (let x = 0; x < 100; x++) if (g[x] === mv) sum_h += h[x]; n_col[idx] = sum_h; } if (n_col[idx] > 0) { o_col[idx] = 0; } else if (mv === 0.01) { let sum_j = 0; for (let x = 0; x < 100; x++) if (k[x]) sum_j += j[x]; o_col[idx] = -sum_j; } else { let sum_j = 0; for (let x = 0; x < 100; x++) if (!k[x] && i_p[x] === mv) sum_j += j[x]; o_col[idx] = -sum_j; } }
  let p_col = new Float64Array(100), cumsum_n = 0; for (let idx = 0; idx < 99; idx++) { cumsum_n += n_col[idx]; p_col[idx + 1] = cumsum_n; }
  let q_col = new Float64Array(100), cumsum_o = 0; for (let idx = 98; idx >= 0; idx--) { cumsum_o += o_col[idx]; q_col[idx] = cumsum_o; }
  let r_col = new Float64Array(100); for (let idx = 0; idx < 100; idx++) r_col[idx] = p_col[idx] + q_col[idx];
  let s_col = new Float64Array(100); for (let idx = 0; idx < 100; idx++) { let curr = r_col[idx], prev = idx > 0 ? r_col[idx - 1] : 0, nxt = idx < 99 ? r_col[idx + 1] : 0; if (curr === 0) s_col[idx] = 0; else if (curr < 0) s_col[idx] = (nxt < 0) ? (curr - nxt) : curr; else s_col[idx] = (prev < 0) ? curr : (curr - prev); }
  let y_raw = [], z_raw = []; for (let idx = 0; idx < 99; idx++) { let mv = m_col[idx]; if (isNaN(mv)) continue; y_raw.push(o_col[idx] < 0 ? mv - 0.01 : mv); z_raw.push(n_col[idx] > 0 ? mv + 0.01 : mv); }
  let y_sorted = y_raw.sort((a, b) => b - a), z_sorted = z_raw.sort((a, b) => b - a), y_final = new Array(100).fill(NaN), z_final = new Array(100).fill(NaN); for (let i = 0; i < z_sorted.length; i++) z_final[i] = z_sorted[i]; for (let i = 0; i < y_sorted.length; i++) if (i + 1 < 100) y_final[i + 1] = y_sorted[i];
  let grouped = {}; for (let idx = 0; idx < 100; idx++) { let s = s_col[idx]; if (s === 0) continue; let side = s > 0 ? "매수" : "매도", price = s > 0 ? y_final[idx] : z_final[idx]; if (isNaN(price) || price <= 0) continue; let method = (price === 0.01 && side === "매도") ? "MOC" : "LOC", key = side + "|" + method + "|" + price.toFixed(4); if (!grouped[key]) grouped[key] = { side: side, method: method, price: price, qty: Math.abs(s) }; else grouped[key].qty += Math.abs(s); }
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

    const pInput = (activeSettingsTab === slotNum) ? document.getElementById('initialCash') : null;
    const realTimePrincipal = pInput ? parseFloat(unformatComma(pInput.value)) : n(params.basics.initialCash, 10000);

    const rInput = (activeSettingsTab === slotNum) ? document.getElementById('renewCash') : null;
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
    let res = { S: [], BA: [], BF: [], AV: [], INOUT: [], dailyStates: [] };

    let activeSlot = slotNum || activeSettingsTab;
    let snapStr = localStorage.getItem(`vtotal_snap${activeSlot}_` + myUserId);
    let bDates = mainDataAll.dates.filter(d => d <= endDate && d >= startDate);
    let startLoopIdx = 0;
    let maxBuyDate = "";

    if (!force && snapStr) {
      let snap = JSON.parse(snapStr);
      if (snap.currentStrat === curStrat && snap.chartDates && snap.chartDates.length > 0) {
        res.S = snap.chartDates;
        res.BA = snap.chartBalances;
        res.BF = snap.chartMdd;

        inv = snap.inv || [];
        inv.forEach(h => { if (h.buyDate > maxBuyDate) maxBuyDate = h.buyDate; });
        let lastSnapDateStr = res.S[res.S.length - 1];
        if (lastSnapDateStr > maxBuyDate) maxBuyDate = lastSnapDateStr;

        cash = fixFloat(snap.summary.cash);
        peak = snap.summary.peak || (res.BA.length > 0 ? Math.max(...res.BA) : initialCash);
        cumulativeRealizedProfit = snap.summary.realizedProfit || 0;

        let oldBase = fixFloat(snap.summary.base || initialCash);
        cumulativeInOut = fixFloat(snap.summary.inout || 0);

        if (inv.length === 0 && cumulativeRealizedProfit === 0) {
          cash = initialCash;
          base = basePrincipal;
          cumulativeInOut = 0;
        } else {
          let pastTotalInjected = fixFloat(initialCash + cumulativeInOut);
          let principalDiff = fixFloat(basePrincipal - pastTotalInjected);
          if (Math.abs(principalDiff) > 0.01) {
            cash = fixFloat(cash + principalDiff);
            base = fixFloat(oldBase + principalDiff);
            cumulativeInOut = fixFloat(cumulativeInOut + principalDiff);
          } else {
            base = oldBase;
          }
        }

        startLoopIdx = bDates.findIndex(d => formatDateNY(d) > maxBuyDate);
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
          holdings: inv.map(p => ({ ...p }))
        })
      });

      res.S.push(dtStr); res.BF.push(currentMdd); res.BA.push(totalBalance); res.AV.push(pl_f); res.INOUT.push(cumulativeInOut);
    }

    let rawOrderOutput = [], orderDateStr = "날짜 확인 불가";
    let nextOrderInfo = { tier: "-", mode: "-", weight: "-", qty: "-" };

    let tIdx = full_c.length;
    if (tIdx > 0 && res.S.length > 0) {
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
    let realPrincipal = fixFloat(initialCash + cumulativeInOut);
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
      chartInout: res.INOUT
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
function processRealLogData(d, currentStrat, configStartDate) {
  if (!d || !d.logs || d.logs.length === 0) return null;
  const logs = d.logs; const meta = d.meta;
  let restoredInv = []; let restoredBase = 0; let realizedProfit = fixFloat(meta.realizedProfit) || 0; let cash = fixFloat(meta.currentCash) || 0; let serverQty = fixFloat(meta.qty) || 0; let serverAvg = fixFloat(meta.avgPrice) || 0;
  if (d.json && d.json.trim() !== "") { try { const parsed = JSON.parse(d.json); if (parsed.holdings) restoredInv = parsed.holdings; if (parsed.base_principal !== undefined) { restoredBase = fixFloat(parsed.base_principal); } else if (parsed.base !== undefined) { restoredBase = fixFloat(parsed.base); } if (parsed.realizedProfit !== undefined) realizedProfit = fixFloat(parsed.realizedProfit); if (parsed.cash !== undefined) cash = fixFloat(parsed.cash); } catch (e) { console.error("JSON 파싱 실패", e); } }
  let qty = 0, totalCost = 0; restoredInv.forEach(item => { qty += item.qty; totalCost += item.cost; }); let avgPrice = qty > 0 ? fixFloat(totalCost / qty) : 0;
  const parseAndFormatYYMMDD = (ds) => { if (!ds) return null; let str = String(ds).trim(); str = str.replace(/\([가-힣a-zA-Z]\)/g, "").trim(); str = str.replace(/[년월.\/]/g, '-').replace(/일/g, '').replace(/\s+/g, ''); if (str.endsWith('-')) str = str.slice(0, -1); if (str.includes('T')) str = str.split('T')[0]; let p = str.split('-'); if (p.length >= 3) { let y = p[0]; if (y.length === 2) y = "20" + y; let m = p[1].padStart(2, '0'); let d = p[2].padStart(2, '0'); return `${y}-${m}-${d}`; } else if (p.length === 2) { let y = p[0]; if (y.length === 2) y = "20" + y; let m = p[1].padStart(2, '0'); return `${y}-${m}-01`; } return str; };
  let rawLogs = []; for (let i = 0; i < logs.length; i++) { let r = logs[i]; let dateStr = r[0]; let asset = fixFloat(String(r[1]).replace(/[^0-9.-]+/g, "")) || 0; if (dateStr && asset > 0) { let exactDate = parseAndFormatYYMMDD(dateStr); let inoutValue = fixFloat(String(r[3]).replace(/[^0-9.-]+/g, "")) || 0; rawLogs.push({ date: exactDate, asset: asset, inout: inoutValue, raw: r }); } }
  if (rawLogs.length === 0) return null;
  rawLogs.sort((a, b) => (a.date > b.date ? 1 : -1));
  let chartDates = [], chartBalances = [], chartMdd = [], chartInout = []; let peak = -Infinity;
  let runningInout = 0;
  rawLogs.forEach(r => {
    chartDates.push(r.date);
    chartBalances.push(r.asset);
    runningInout = fixFloat(runningInout + r.inout);
    chartInout.push(runningInout);
    if (r.asset > peak) peak = r.asset;
    chartMdd.push(peak > 0 ? (r.asset - peak) / peak : 0);
  });

  const firstAsset = chartBalances[0] || 0; const totalInoutSum = runningInout;
  const calculatedPrincipal = fixFloat(firstAsset);
  const finalPrincipal = restoredBase > 0 ? restoredBase : calculatedPrincipal;
  const lastAsset = chartBalances[chartBalances.length - 1] || 0; const minMdd = chartMdd.length > 0 ? Math.min(...chartMdd) : 0;
  const totalProfit = fixFloat(lastAsset - finalPrincipal - (totalInoutSum - chartInout[0]));
  const simpleYield = finalPrincipal > 0 ? totalProfit / finalPrincipal : 0;
  const evalVal = fixFloat(lastAsset - cash); const depletion = lastAsset > 0 ? (evalVal / lastAsset) : 0; const investPrincipal = fixFloat(qty * avgPrice); const evalReturn = investPrincipal > 0 ? (evalVal - investPrincipal) / investPrincipal : 0; const currPrice = parseFloat(meta.tickerPrice) || (qty > 0 ? evalVal / qty : 0);

  let cagr = 0; if (chartDates.length > 1) { const toDateObj = (str) => { let p = str.split('-'); let year = parseInt(p[0], 10); if (year < 100) year += 2000; return new Date(year, parseInt(p[1], 10) - 1, parseInt(p[2], 10)); }; const sDate = toDateObj(chartDates[0]); const eDate = toDateObj(chartDates[chartDates.length - 1]); let days = Math.max(1, Math.round((eDate - sDate) / (1000 * 60 * 60 * 24)) - 1); let years = days / 365; if (years > 0) cagr = Math.pow(1 + simpleYield, 1 / years) - 1; }
  const calcPeriod = (type) => {
    if (chartDates.length === 0) return [];
    let periods = {};
    for (let i = 0; i < chartDates.length; i++) {
      let parts = chartDates[i].split('-');
      let periodKey = type === 'month' ? `${parts[0]}-${parts[1]}` : parts[0];
      if (!periods[periodKey]) { periods[periodKey] = { startIdx: i, endIdx: i, indices: [] }; }
      periods[periodKey].endIdx = i; periods[periodKey].indices.push(i);
    }
    let result = []; let pKeys = Object.keys(periods).sort();
    for (let i = 0; i < pKeys.length; i++) {
      let key = pKeys[i]; let pData = periods[key];
      let startAsset = 0; let startInout = 0;
      if (i === 0) {
        startAsset = chartBalances[0]; startInout = chartInout[0] || 0;
      } else {
        const prevEndIdx = periods[pKeys[i - 1]].endIdx;
        startAsset = chartBalances[prevEndIdx];
        startInout = chartInout[prevEndIdx] || 0;
      }
      let endAsset = chartBalances[pData.endIdx];
      let endInout = chartInout[pData.endIdx] || 0;
      let inoutForPeriod = endInout - startInout;
      let profit = endAsset - startAsset - inoutForPeriod;
      let profitBasis = startAsset + inoutForPeriod;
      let minMddVal = 0;
      for (let idx of pData.indices) { if (chartMdd[idx] < minMddVal) minMddVal = chartMdd[idx]; }
      result.push({ period: key, asset: endAsset, rate: profitBasis > 0 ? profit / profitBasis : 0, profit: profit, mdd: minMddVal });
    } return result.reverse();
  };

  const summary = { totalAssets: lastAsset, yield: simpleYield, cagr: cagr, mdd: minMdd, calmar: minMdd !== 0 ? Math.abs(cagr / minMdd) : 0, totalProfit: totalProfit, realizedProfit: realizedProfit, qty: serverQty, avgPrice: serverAvg, evalReturn: evalReturn, evalVal: evalVal, cash: cash, depletion: depletion, currPrice: currPrice, currentMdd: chartMdd[chartMdd.length - 1], base: finalPrincipal, inout: totalInoutSum, realPrincipal: calculatedPrincipal };
  let rawOrderOutput = []; let M_STRAT_T = MASTER_STRATEGIES[currentStrat] || MASTER_STRATEGIES["2M3D1-1P"]; let MODES_T = M_STRAT_T.modes; function c2_T(v) { return Math.ceil((v * 100) - 0.0000001) / 100.0; }
  if (restoredInv.length > 0) { restoredInv.forEach(p_i => { let modeData = MODES_T[p_i.mode] || MODES_T['SF']; let sellRate = modeData.sell[p_i.tier - 1] || modeData.sell[0] || 0; let s_tgt = c2_T(p_i.buy_price * (1 + sellRate)); rawOrderOutput.push(["매도", "LOC", s_tgt, p_i.qty]); }); }
  const finalOrders = rawOrderOutput.sort((a, b) => b[2] - a[2]);
  return { status: "success", S: chartDates, BA: chartBalances, BF: chartMdd, inv: restoredInv, orders: finalOrders, orderDateStr: chartDates[chartDates.length - 1] + " (동기화됨)", summary: summary, chartDates: chartDates, chartBalances: chartBalances, chartMdd: chartMdd, monthlyData: calcPeriod('month'), yearlyData: calcPeriod('year'), currentStrat: currentStrat };
}

// ==========================================
// 🧠 [engine.js 추가] 다중 슬롯 종합 계산 로직
// ==========================================

// 다중 슬롯 종합 Summary 계산
function calculateCombinedSummaryEngine(activeResults) {
  if (!activeResults || activeResults.length === 0) return null;
  if (activeResults.length === 1) return activeResults[0].summary;

  let tAssets = 0, base = 0, evalVal = 0, totalProfit = 0, realizedProfit = 0, cash = 0, qty = 0, sumRealPrincipal = 0;
  let currPriceSum = 0, avgPriceSum = 0;
  let count = activeResults.length;

  for (const r of activeResults) {
    const s = r.summary || {};
    base += (s.base || 0);
    sumRealPrincipal += (s.realPrincipal || s.base || 0);
    tAssets += (s.totalAssets || 0);
    evalVal += (s.evalVal || 0);
    totalProfit += (s.totalProfit || 0);
    realizedProfit += (s.realizedProfit || 0);
    cash += (s.cash || 0);
    qty += (s.qty || 0);
    currPriceSum += (s.currPrice || 0);
    avgPriceSum += ((s.avgPrice || 0) * (s.qty || 0));
  }

  let combinedMdd = 0;
  let combinedCurrentMdd = 0;
  const allDatesSet = new Set();

  const mappedResults = activeResults.map(r => {
    const dMap = new Map();
    if (r.chartDates && r.chartBalances) {
      r.chartDates.forEach((d, i) => { dMap.set(d, r.chartBalances[i]); allDatesSet.add(d); });
    }
    return dMap;
  });

  const sortedDates = Array.from(allDatesSet).sort();

  if (sortedDates.length > 0) {
    let peak = -Infinity;
    let minDraw = 0;
    sortedDates.forEach((date, i) => {
      let daySum = 0;
      mappedResults.forEach(dMap => { if (dMap.has(date)) daySum += dMap.get(date); });
      if (daySum > peak) peak = daySum;
      let draw = peak > 0 ? (daySum - peak) / peak : 0;
      if (draw < minDraw) minDraw = draw;
      if (i === sortedDates.length - 1) combinedCurrentMdd = draw;
    });
    combinedMdd = minDraw;
  }

  const calcTotalCAGR = () => {
    if (sumRealPrincipal <= 0 || tAssets <= 0) return 0;
    let earliest = Infinity, latest = -Infinity;
    activeResults.forEach(r => {
      if (r.chartDates && r.chartDates.length > 0) {
        const s = new Date(r.chartDates[0]).getTime();
        const e = new Date(r.chartDates[r.chartDates.length - 1]).getTime();
        if (s < earliest) earliest = s;
        if (e > latest) latest = e;
      }
    });
    if (isFinite(earliest) && isFinite(latest)) {
      const days = Math.max(1, Math.round((latest - earliest) / (1000 * 60 * 60 * 24)));
      const years = days / 365;
      const totalYield = (tAssets - sumRealPrincipal) / sumRealPrincipal;
      return years > 0 ? Math.pow(1 + totalYield, 1 / years) - 1 : totalYield;
    }
    return 0;
  };

  const cagrVal = calcTotalCAGR();

  return {
    totalAssets: tAssets,
    yield: sumRealPrincipal > 0 ? (tAssets - sumRealPrincipal) / sumRealPrincipal : 0,
    currentMdd: combinedCurrentMdd,
    depletion: tAssets > 0 ? (evalVal / tAssets) : 0,
    totalProfit: tAssets - sumRealPrincipal,
    realizedProfit: realizedProfit,
    evalVal: evalVal,
    cash: cash,
    evalReturn: avgPriceSum > 0 ? (evalVal - avgPriceSum) / avgPriceSum : 0,
    qty: qty,
    currPrice: currPriceSum / count,
    avgPrice: qty > 0 ? avgPriceSum / qty : (avgPriceSum / count),
    base: base,
    mdd: combinedMdd,
    cagr: cagrVal,
    calmar: combinedMdd !== 0 ? Math.abs(cagrVal / combinedMdd) : 0,
    realPrincipal: sumRealPrincipal
  };
}

// 다중 슬롯 종합 월별/년별 차트 데이터 병합 계산
function generateCombinedPeriodDataEngine(activeResults) {
  if (!activeResults || activeResults.length < 2) return { monthly: [], yearly: [] };

  const allDatesSet = new Set();
  const maps = activeResults.map(r => {
    const dateMap = new Map();
    r.chartDates.forEach((d, i) => { dateMap.set(d, i); allDatesSet.add(d); });
    const correctedInouts = [...(r.chartInout || new Array(r.chartDates.length).fill(0))];
    if (r.chartBalances && r.chartBalances.length > 0) {
      if (Math.abs(r.chartBalances[0] - (correctedInouts[0] || 0)) > 0.01) correctedInouts[0] = r.chartBalances[0];
    }
    return { map: dateMap, balances: r.chartBalances, inouts: correctedInouts };
  });

  const sortedDates = [...allDatesSet].sort();
  const combinedBalances = new Array(sortedDates.length).fill(0);
  const combinedMdd = new Array(sortedDates.length).fill(0);
  const combinedInout = new Array(sortedDates.length).fill(0);

  sortedDates.forEach((date, i) => {
    let daySum = 0, dayInout = 0;
    maps.forEach(obj => {
      const idx = obj.map.get(date);
      if (idx !== undefined) {
        daySum += obj.balances[idx];
        dayInout += (obj.inouts[idx] || 0);
      }
    });
    combinedBalances[i] = daySum;
    combinedInout[i] = dayInout;
  });

  let peak = -Infinity;
  combinedBalances.forEach((val, i) => {
    if (val > peak) peak = val;
    combinedMdd[i] = (peak > 0) ? (val - peak) / peak : 0;
  });

  const calc = (type) => {
    const periods = {};
    for (let i = 0; i < sortedDates.length; i++) {
      const d = sortedDates[i];
      const periodKey = type === 'month' ? d.substring(0, 7) : d.substring(0, 4);
      if (!periods[periodKey]) periods[periodKey] = { startIdx: i, endIdx: i, indices: [] };
      periods[periodKey].endIdx = i;
      periods[periodKey].indices.push(i);
    }

    return Object.keys(periods).sort().reverse().map((key, i, keys) => {
      const p = periods[key];
      const allPKeys = Object.keys(periods).sort();
      const prevKey = allPKeys[allPKeys.indexOf(key) - 1];
      const startAsset = prevKey ? combinedBalances[periods[prevKey].endIdx] : combinedBalances[0];
      const startInout = prevKey ? combinedInout[periods[prevKey].endIdx] : combinedInout[0];
      const endAsset = combinedBalances[p.endIdx];
      const endInout = combinedInout[p.endIdx];

      let profit = 0, basis = 0;
      let inoutForPeriod = endInout - startInout;

      if (!prevKey) {
        if (startInout > 0 && Math.abs(startAsset - startInout) < 10) {
          profit = endAsset - endInout; basis = endInout;
        } else {
          profit = endAsset - startAsset - inoutForPeriod; basis = startAsset + inoutForPeriod;
        }
      } else {
        profit = endAsset - startAsset - inoutForPeriod; basis = startAsset + inoutForPeriod;
      }

      let minMdd = 0;
      p.indices.forEach(idx => { if (combinedMdd[idx] < minMdd) minMdd = combinedMdd[idx]; });
      return { period: key, asset: endAsset, rate: basis > 0 ? profit / basis : 0, profit: profit, mdd: minMdd };
    });
  };

  return { monthly: calc('month'), yearly: calc('year') };
}
