// strategy.js?먯꽌 蹂묓빀??
const MASTER_STRATEGIES = {
  "1M": {
    config: { compR: 0.824, lossR: 0.329, dLimit: -0.048, cDn3: 0.0, cDn2: 0.008, cDn1: 0.0, tierMethod: '蹂댁쑀', useMid1: false, useMid2: false, useMid3: false },
    modes: {
      SF: {
        buy: [0.034, 0.034, 0.034, 0.034, 0.034, 0.034],
        sell: [0.023, 0.023, 0.023, 0.023, 0.023, 0.023],
        hold: [7, 7, 7, 7, 7, 7],
        weight: [0.08, 0.055, 0.06, 0.285, 0.084, 0.064]
      },
      Middle: {
        buy: [0.034, 0.034, 0.034, 0.034, 0.034, 0.034],
        sell: [0.023, 0.023, 0.023, 0.023, 0.023, 0.023],
        hold: [7, 7, 7, 7, 7, 7],
        weight: [0.08, 0.055, 0.06, 0.285, 0.084, 0.064]
      },
      AG: {
        buy: [0.034, 0.034, 0.034, 0.034, 0.034, 0.034],
        sell: [0.023, 0.023, 0.023, 0.023, 0.023, 0.023],
        hold: [7, 7, 7, 7, 7, 7],
        weight: [0.08, 0.055, 0.06, 0.285, 0.084, 0.064]
      },
      Middle2: {
        buy: [0.034, 0.034, 0.034, 0.034, 0.034, 0.034],
        sell: [0.023, 0.023, 0.023, 0.023, 0.023, 0.023],
        hold: [7, 7, 7, 7, 7, 7],
        weight: [0.08, 0.055, 0.06, 0.285, 0.084, 0.064]
      },
      Middle3: {
        buy: [0.034, 0.034, 0.034, 0.034, 0.034, 0.034],
        sell: [0.023, 0.023, 0.023, 0.023, 0.023, 0.023],
        hold: [7, 7, 7, 7, 7, 7],
        weight: [0.08, 0.055, 0.06, 0.285, 0.084, 0.064]
      }
    }
  },
  "2M3D2(2.1)": {
    config: { compR: 0.939, lossR: 0.699, dLimit: -0.048, cDn3: 0.0, cDn2: 0.008, cDn1: 0.0, tierMethod: '蹂댁쑀', useMid1: true, useMid2: false, useMid3: true },
    modes: {
      SF: {
        buy: [0.051, 0.051, 0.051, 0.051, 0.051, 0.051, 0.051, 0.051],
        sell: [0.017, 0.017, 0.017, 0.017, 0.017, 0.017, 0.017, 0.017],
        hold: [35, 35, 35, 35, 35, 35, 35, 35],
        weight: [0.05, 0.052, 0.291, 0.055, 0.226, 0.051, 0.3, 0.053]
      },
      Middle: {
        buy: [0.032, 0.032, 0.032, 0.032, 0.032, 0.032, 0.032],
        sell: [0.001, 0.001, 0.001, 0.001, 0.001, 0.001, 0.001],
        hold: [20, 20, 20, 20, 20, 20, 20],
        weight: [0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3]
      },
      AG: {
        buy: [0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025],
        sell: [0.032, 0.032, 0.032, 0.032, 0.032, 0.032, 0.032, 0.032],
        hold: [8, 8, 8, 8, 8, 8, 8, 8],
        weight: [0.061, 0.3, 0.05, 0.05, 0.242, 0.3, 0.295, 0.292]
      },
      Middle2: {
        buy: [0.044, 0.044, 0.044, 0.044, 0.044, 0.044, 0.044, 0.044, 0.044],
        sell: [0.005, 0.005, 0.005, 0.005, 0.005, 0.005, 0.005, 0.005, 0.005],
        hold: [12, 12, 12, 12, 12, 12, 12, 12, 12],
        weight: [0.127, 0.127, 0.127, 0.127, 0.127, 0.127, 0.127, 0.127, 0.127]
      },
      Middle3: {
        buy: [0.044, 0.044, 0.044, 0.044, 0.044, 0.044, 0.044, 0.044, 0.044],
        sell: [0.005, 0.005, 0.005, 0.005, 0.005, 0.005, 0.005, 0.005, 0.005],
        hold: [12, 12, 12, 12, 12, 12, 12, 12, 12],
        weight: [0.127, 0.127, 0.127, 0.127, 0.127, 0.127, 0.127, 0.127, 0.127]
      }
    }
  },
  "2M3D1-1P": {
    config: { compR: 0.818, lossR: 0.282, dLimit: -0.048, cDn3: 0.0, cDn2: 0.008, cDn1: 0.0, tierMethod: '蹂댁쑀', useMid1: true, useMid2: true, useMid3: true },
    modes: {
      SF: {
        buy: [0.046, 0.046, 0.046, 0.046, 0.046, 0.046],
        sell: [0.018, 0.018, 0.018, 0.018, 0.018, 0.018],
        hold: [34, 34, 34, 34, 34, 34],
        weight: [0.13, 0.116, 0.289, 0.05, 0.273, 0.05]
      },
      Middle: {
        buy: [0.043, 0.043, 0.043, 0.043, 0.043, 0.043],
        sell: [0.014, 0.014, 0.014, 0.014, 0.014, 0.014],
        hold: [6, 6, 6, 6, 6, 6],
        weight: [0.3, 0.3, 0.3, 0.3, 0.3, 0.3]
      },
      AG: {
        buy: [0.034, 0.034, 0.034, 0.034, 0.034, 0.034],
        sell: [0.022, 0.022, 0.022, 0.022, 0.022, 0.022],
        hold: [7, 7, 7, 7, 7, 7],
        weight: [0.17, 0.08, 0.052, 0.3, 0.072, 0.247]
      },
      Middle2: {
        buy: [0.025, 0.025, 0.025, 0.025, 0.025, 0.025],
        sell: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
        hold: [12, 12, 12, 12, 12, 12],
        weight: [0.05, 0.05, 0.05, 0.05, 0.05, 0.05]
      },
      Middle3: {
        buy: [0.043, 0.043, 0.043, 0.043, 0.043, 0.043],
        sell: [0.014, 0.014, 0.014, 0.014, 0.014, 0.014],
        hold: [6, 6, 6, 6, 6, 6],
        weight: [0.3, 0.3, 0.3, 0.3, 0.3, 0.3]
      }
    }
  },
  "2M3D2(2.0)": {
    config: { compR: 0.814, lossR: 0.286, dLimit: -0.048, cDn3: 0.0, cDn2: 0.008, cDn1: 0.0, tierMethod: '蹂댁쑀', useMid1: true, useMid2: false, useMid3: true },
    modes: {
      SF: {
        buy: [0.036, 0.036, 0.036, 0.036, 0.036, 0.036, 0.036, 0.036],
        sell: [0.016, 0.016, 0.016, 0.016, 0.016, 0.016, 0.016, 0.016],
        hold: [35, 35, 35, 35, 35, 35, 35, 35],
        weight: [0.046, 0.143, 0.23, 0.046, 0.115, 0.161, 0.31, 0.001]
      },
      Middle: {
        buy: [0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03],
        sell: [0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003],
        hold: [20, 20, 20, 20, 20, 20, 20],
        weight: [0.355, 0.355, 0.355, 0.355, 0.355, 0.355, 0.355]
      },
      AG: {
        buy: [0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025],
        sell: [0.031, 0.031, 0.031, 0.031, 0.031, 0.031, 0.031, 0.031],
        hold: [8, 8, 8, 8, 8, 8, 8, 8],
        weight: [0.047, 0.39, 0.042, 0.043, 0.217, 0.22, 0.31, 0.45]
      },
      Middle2: {
        buy: [0.039, 0.039, 0.039, 0.039, 0.039, 0.039, 0.039, 0.039, 0.039, 0.039],
        sell: [0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003],
        hold: [12, 12, 12, 12, 12, 12, 12, 12, 12, 12],
        weight: [0.131, 0.131, 0.131, 0.131, 0.131, 0.131, 0.131, 0.131, 0.131, 0.131]
      },
      Middle3: {
        buy: [0.039, 0.039, 0.039, 0.039, 0.039, 0.039, 0.039, 0.039, 0.039, 0.039],
        sell: [0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003],
        hold: [12, 12, 12, 12, 12, 12, 12, 12, 12, 12],
        weight: [0.131, 0.131, 0.131, 0.131, 0.131, 0.131, 0.131, 0.131, 0.131, 0.131]
      }
    }
  },
  "2M3D2(1.2)": {
    config: { compR: 0.814, lossR: 0.293, dLimit: -0.048, cDn3: 0.0, cDn2: 0.008, cDn1: 0.0, tierMethod: '蹂댁쑀', useMid1: true, useMid2: false, useMid3: true },
    modes: {
      SF: {
        buy: [0.035, 0.035, 0.035, 0.035, 0.035, 0.035, 0.035, 0.035],
        sell: [0.016, 0.016, 0.016, 0.016, 0.016, 0.016, 0.016, 0.016],
        hold: [35, 35, 35, 35, 35, 35, 35, 35],
        weight: [0.046, 0.143, 0.23, 0.046, 0.115, 0.161, 0.31, 0.046]
      },
      Middle: {
        buy: [0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03],
        sell: [0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003],
        hold: [21, 21, 21, 21, 21, 21, 21, 21],
        weight: [0.352, 0.352, 0.352, 0.352, 0.352, 0.352, 0.352, 0.352]
      },
      AG: {
        buy: [0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025],
        sell: [0.032, 0.032, 0.032, 0.032, 0.032, 0.032, 0.032, 0.032],
        hold: [8, 8, 8, 8, 8, 8, 8, 8],
        weight: [0.049, 0.216, 0.043, 0.043, 0.216, 0.216, 0.12, 0.096]
      },
      Middle2: {
        buy: [0.038, 0.038, 0.038, 0.038, 0.038, 0.038, 0.038, 0.038],
        sell: [0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003],
        hold: [13, 13, 13, 13, 13, 13, 13, 13],
        weight: [0.129, 0.129, 0.129, 0.129, 0.129, 0.129, 0.129, 0.129]
      },
      Middle3: {
        buy: [0.038, 0.038, 0.038, 0.038, 0.038, 0.038, 0.038, 0.038],
        sell: [0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003],
        hold: [13, 13, 13, 13, 13, 13, 13, 13],
        weight: [0.129, 0.129, 0.129, 0.129, 0.129, 0.129, 0.129, 0.129]
      }
    }
  },
  "2M3D2(1.0)": {
    config: { compR: 0.814, lossR: 0.293, dLimit: -0.048, cDn3: 0.0, cDn2: 0.008, cDn1: 0.0, tierMethod: '蹂댁쑀', useMid1: true, useMid2: false, useMid3: true },
    modes: {
      SF: {
        buy: [0.035, 0.035, 0.035, 0.035, 0.035, 0.035, 0.035, 0.035],
        sell: [0.016, 0.016, 0.016, 0.016, 0.016, 0.016, 0.016, 0.016],
        hold: [35, 35, 35, 35, 35, 35, 35, 35],
        weight: [0.046, 0.143, 0.23, 0.046, 0.115, 0.143, 0.23, 0.040]
      },
      Middle: {
        buy: [0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03],
        sell: [0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003],
        hold: [12, 12, 12, 12, 12, 12, 12, 12],
        weight: [0.129, 0.129, 0.129, 0.129, 0.129, 0.129, 0.129, 0.129]
      },
      AG: {
        buy: [0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025],
        sell: [0.032, 0.032, 0.032, 0.032, 0.032, 0.032, 0.032, 0.032],
        hold: [8, 8, 8, 8, 8, 8, 8, 8],
        weight: [0.049, 0.216, 0.043, 0.043, 0.216, 0.216, 0.12, 0.096]
      },
      Middle2: {
        buy: [0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03],
        sell: [0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003],
        hold: [12, 12, 12, 12, 12, 12, 12, 12],
        weight: [0.129, 0.129, 0.129, 0.129, 0.129, 0.129, 0.129, 0.129]
      },
      Middle3: {
        buy: [0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03],
        sell: [0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003],
        hold: [12, 12, 12, 12, 12, 12, 12, 12],
        weight: [0.129, 0.129, 0.129, 0.129, 0.129, 0.129, 0.129, 0.129]
      }
    }
  },
  "3M3D1-R": {
    config: { compR: 0.9, lossR: 0.304, dLimit: -0.048, cDn3: 0.0, cDn2: 0.008, cDn1: 0.0, tierMethod: '蹂댁쑀', useMid1: true, useMid2: false, useMid3: true },
    modes: {
      SF: {
        buy: [0.033, 0.028, 0.028, 0.028, 0.028, 0.028, 0.028, 0.028],
        sell: [0.026, 0.027, 0.027, 0.027, 0.027, 0.027, 0.027, 0.027],
        hold: [35, 19, 19, 19, 19, 19, 19, 19],
        weight: [0.052, 0.238, 0.056, 0.3, 0.297, 0.294, 0.08, 0.26]
      },
      DEF: {
        buy: [0.032, 0.039, 0.039, 0.039, 0.039, 0.039, 0.039, 0.039],
        sell: [0.074, 0.046, 0.046, 0.046, 0.046, 0.046, 0.046, 0.046],
        hold: [5, 5, 5, 5, 5, 5, 5, 5],
        weight: [0.097, 0.297, 0.11, 0.193, 0.244, 0.051, 0.296, 0.066]
      },
      AG: {
        buy: [0.09, 0.049, 0.049, 0.049, 0.049, 0.049, 0.049, 0.049],
        sell: [0.026, 0.024, 0.024, 0.024, 0.024, 0.024, 0.024, 0.024],
        hold: [35, 35, 35, 35, 35, 35, 35, 35],
        weight: [0.062, 0.051, 0.052, 0.299, 0.129, 0.217, 0.051, 0.217]
      },
      Middle: {
        buy: [0.044, 0.044, 0.044, 0.044, 0.044, 0.044, 0.044, 0.044],
        sell: [0.014, 0.014, 0.014, 0.014, 0.014, 0.014, 0.014, 0.014],
        hold: [5, 5, 5, 5, 5, 5, 5, 5],
        weight: [0.179, 0.179, 0.179, 0.179, 0.179, 0.179, 0.179, 0.179]
      },
      Middle3: {
        buy: [0.044, 0.044, 0.044, 0.044, 0.044, 0.044, 0.044, 0.044],
        sell: [0.014, 0.014, 0.014, 0.014, 0.014, 0.014, 0.014, 0.014],
        hold: [5, 5, 5, 5, 5, 5, 5, 5],
        weight: [0.179, 0.179, 0.179, 0.179, 0.179, 0.179, 0.179, 0.179]
      },
      Middle2: {
        buy: [0.025, 0.025, 0.025, 0.025, 0.025, 0.025],
        sell: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
        hold: [12, 12, 12, 12, 12, 12],
        weight: [0.05, 0.05, 0.05, 0.05, 0.05, 0.05]
      }
    }
  }
};

// engine.js (肄붿뼱 諛깊뀒?ㅽ듃 ?붿쭊 諛??곸튂湲??좏떥由ы떚)

const GAS_URL = "https://script.google.com/macros/s/AKfycbz5oD4M9ninAUdnr4jexbjKvoQsvX6OCDJZgE5eUAi3zTC14tqhfYYAIGgf1CSFZmToMA/exec";
const CF_WORKER_URL = "https://autumn-limit-001e.smw594.workers.dev";

// ?썳截?IndexedDB (罹먯떛 諛??곗씠??愿由?
const DB_NAME = "VTotalDB_Cache"; const DB_VERSION = 2; const STORE_NAME = "YahooDataStore";
const yahooCache = {}; const pendingFetches = {};

// ?썳截?湲濡쒕쾶 ?곹깭 諛??섏쑉 愿由?
let isCurrencyKRW = false;
let currentFXRate = 1450;

function parsePriceChartPayload(ticker, payload, rnd = true) {
  if (!payload || payload.error) throw new Error(payload?.error || `${ticker} ?곗씠?곌? ?놁뒿?덈떎.`);
  if (!payload.chart || !payload.chart.result || !payload.chart.result[0]) throw new Error("Invalid Data Format");
  const r = payload.chart.result[0];
  const ts = r.timestamp || [];
  const quote = r.indicators && r.indicators.quote && r.indicators.quote[0] ? r.indicators.quote[0] : {};
  const cls = quote.close || [];
  const ops = quote.open || [];
  const dates = [];
  const close = [];
  const open = [];
  let lastDay = "";
  for (let i = 0; i < ts.length; i++) {
    if (cls[i] === null || cls[i] === undefined || isNaN(cls[i])) continue;
    const dateObj = new Date(ts[i] * 1000);
    const dayStr = normalizeDateKey(dateObj);
    const cVal = rnd ? pyRound2(cls[i]) : cls[i];
    const oVal = rnd ? pyRound2(ops[i] ?? cls[i]) : (ops[i] ?? cls[i]);
    if (dayStr !== lastDay) {
      dates.push(dateFromKey(dayStr));
      close.push(cVal);
      open.push(oVal);
      lastDay = dayStr;
    } else {
      close[close.length - 1] = cVal;
      open[open.length - 1] = oVal;
    }
  }
  return { ticker, dates, close, open };
}

async function applyPricePayloadToCache(ticker, payload, rnd = true) {
  const incoming = parsePriceChartPayload(ticker, payload, rnd);
  let cached = await getDB(ticker);
  if (!cached) cached = { ticker, dates: [], close: [], open: [] };
  cached = mergePriceSeries(cached, incoming, ticker);
  await setDB(cached);
  _sessionFetched[ticker] = true;
  localStorage.setItem(`vtotal_last_fetch_${ticker}`, Date.now().toString());
  localStorage.setItem(`vtotal_price_cache_repair_v2_${ticker}`, "1");
  return cached;
}

async function updateCurrentFXRate(callback = null) {
  // 癒쇱? localStorage????λ맂 留덉?留??섏쑉媛믪씠 ?덉쑝硫?湲곕낯媛?????곸슜
  try {
    const savedRate = parseFloat(localStorage.getItem('vtotal_last_fx_rate'));
    if (savedRate && !isNaN(savedRate) && savedRate > 0) currentFXRate = savedRate;
  } catch(e) {}

  try {
    const cachedFx = await getDB("KRW=X");
    const normalizedFx = normalizePriceSeries(cachedFx, "KRW=X");
    if (normalizedFx.close.length > 0) {
      const latestRate = normalizedFx.close[normalizedFx.close.length - 1];
      if (latestRate && !isNaN(latestRate)) {
        currentFXRate = latestRate;
        localStorage.setItem("vtotal_last_fx_rate", currentFXRate.toString());
        if (callback) callback(currentFXRate);
        return;
      }
    }
  } catch(e) {}

  try {
    const nowTs = Math.floor(Date.now() / 1000);
    const pastTs = nowTs - (86400 * 30);
    const yUrl = `${CF_WORKER_URL}/api/prices?t=KRW=X&p1=${pastTs}&p2=${nowTs}`;
    const response = await fetch(yUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const res = await response.json();
    if (!res.error && res.chart && res.chart.result[0]) {
      const cls = res.chart.result[0].indicators.quote[0].close;
      let latestRate = currentFXRate;
      for (let i = cls.length - 1; i >= 0; i--) {
        if (cls[i] !== null && !isNaN(cls[i])) {
          latestRate = cls[i];
          break;
        }
      }
      currentFXRate = latestRate;
      localStorage.setItem('vtotal_last_fx_rate', currentFXRate.toString());
      console.log(`[FX] updated: ${currentFXRate.toFixed(2)}`);
      if (callback) callback(currentFXRate);
    }
  } catch (e) {
    console.warn(`[FX] fetch failed: ${currentFXRate.toFixed(0)}`, e.message);
  }
}

async function openDB() { return new Promise((resolve, reject) => { const req = indexedDB.open(DB_NAME, DB_VERSION); req.onupgradeneeded = e => { const db = e.target.result; if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "ticker" }); }; req.onsuccess = e => resolve(e.target.result); req.onerror = e => reject(e.target.error); }); }
async function getDB(tk) { try { const db = await openDB(); return new Promise((resolve, reject) => { const tx = db.transaction(STORE_NAME, "readonly"); const req = tx.objectStore(STORE_NAME).get(tk); req.onsuccess = () => resolve(req.result); req.onerror = () => resolve(null); }); } catch (e) { return null; } }
async function setDB(data) { try { const db = await openDB(); const tx = db.transaction(STORE_NAME, "readwrite"); tx.objectStore(STORE_NAME).put(data); } catch (e) { } }

// ?썳截?湲덉쑖 怨꾩궛 諛??좏떥由ы떚 ?⑥닔 紐⑥쓬
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

  match = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (match) {
    return `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
  }

  const d = new Date(value);
  return isNaN(d.getTime()) ? raw : normalizeDateKey(d);
}
function dateFromKey(dateKey) {
  return new Date(`${dateKey}T12:00:00Z`);
}
function normalizePriceSeries(series, ticker) {
  const map = new Map();
  if (series && series.dates && Array.isArray(series.dates)) {
    for (let i = 0; i < series.dates.length; i++) {
      const key = normalizeDateKey(series.dates[i]);
      if (!key || series.close[i] === null || series.close[i] === undefined) continue;
      map.set(key, {
        date: dateFromKey(key),
        close: series.close[i],
        open: series.open ? series.open[i] : series.close[i]
      });
    }
  }

  const keys = Array.from(map.keys()).sort();
  return {
    ticker: ticker || (series && series.ticker) || "",
    dates: keys.map(k => map.get(k).date),
    close: keys.map(k => map.get(k).close),
    open: keys.map(k => map.get(k).open)
  };
}
function mergePriceSeries(base, incoming, ticker) {
  const merged = normalizePriceSeries(base, ticker);
  const fresh = normalizePriceSeries(incoming, ticker);
  const map = new Map();

  for (let i = 0; i < merged.dates.length; i++) {
    map.set(normalizeDateKey(merged.dates[i]), {
      date: merged.dates[i],
      close: merged.close[i],
      open: merged.open[i]
    });
  }
  for (let i = 0; i < fresh.dates.length; i++) {
    map.set(normalizeDateKey(fresh.dates[i]), {
      date: fresh.dates[i],
      close: fresh.close[i],
      open: fresh.open[i]
    });
  }

  const keys = Array.from(map.keys()).filter(Boolean).sort();
  return {
    ticker,
    dates: keys.map(k => dateFromKey(k)),
    close: keys.map(k => map.get(k).close),
    open: keys.map(k => map.get(k).open)
  };
}
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
// ?뙋 ?곗씠???섏쭛 (Cloudflare Worker DB)
// ?몄뀡 ???곗빱蹂?CF ?뚯빱 ?몄텧??1?뚮줈 ?쒗븳?섏뿬 以묐났 ?ㅽ듃?뚰겕 ?붿껌???먯쿇 李⑤떒?⑸땲??
const _sessionFetched = {};
const _tickerPending = {};

async function fetchBatchPriceData(tickers, p1, p2, rnd = true, force = false) {
  const uniqueTickers = Array.from(new Set((tickers || []).map(t => String(t || "").trim()).filter(Boolean)));
  if (uniqueTickers.length === 0) return {};
  const fetchP2 = p2 + (86400 * 3);
  const url = `${CF_WORKER_URL}/api/prices?symbols=${encodeURIComponent(uniqueTickers.join(","))}&p1=${p1}&p2=${fetchP2}${force ? "&force=true" : ""}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
  const resultMap = payload.result || {};
  const cachedMap = {};
  await Promise.all(uniqueTickers.map(async (ticker) => {
    const item = resultMap[ticker];
    if (!item || item.error) {
      console.warn(`[CF DB 諛곗튂 ?꾨씫] ${ticker}: ${item?.error || "?곗씠???놁쓬"}`);
      return;
    }
    cachedMap[ticker] = await applyPricePayloadToCache(ticker, item, rnd);
  }));
  const krwSeries = cachedMap["KRW=X"];
  if (krwSeries && krwSeries.close && krwSeries.close.length > 0) {
    const latestRate = krwSeries.close[krwSeries.close.length - 1];
    if (latestRate && !isNaN(latestRate)) {
      currentFXRate = latestRate;
      localStorage.setItem("vtotal_last_fx_rate", currentFXRate.toString());
    }
  }
  return cachedMap;
}

async function fetchYahooData(t, p1, p2, rnd, force = false) {
  if (!t) throw new Error("?곗빱媛 鍮꾩뼱?덉뒿?덈떎.");
  const memKey = `${t}_${p1}_${p2}`;
  if (!force && yahooCache[memKey]) return yahooCache[memKey];

  // ?숈씪 ?곗빱??????ㅽ듃?뚰겕 ?붿껌???대? 吏꾪뻾 以묒씠硫?洹?寃곌낵瑜?湲곕떎由???IndexedDB?먯꽌 ?꾪꽣留?
  if (_tickerPending[t]) {
    await _tickerPending[t];
    return _buildResultFromDB(t, p1, p2, rnd);
  }
  if (pendingFetches[memKey]) return await pendingFetches[memKey];

  const fetchPromise = (async () => {
    let cached = await getDB(t);
    if (!cached) { cached = { ticker: t, dates: [], close: [], open: [] }; }
    cached = normalizePriceSeries(cached, t);
    const requestedStart = p1 * 1000, requestedEnd = p2 * 1000;
    const lastCachedTs = cached.dates.length > 0 ? (new Date(cached.dates[cached.dates.length - 1])).getTime() : 0;
    const firstCachedTs = cached.dates.length > 0 ? (new Date(cached.dates[0])).getTime() : Infinity;
    let fetchP1 = p1, fetchP2 = p2, isDelta = false;
    const now = Date.now();
    const enoughOld = (firstCachedTs <= requestedStart + 43200000);
    const cacheRepairKey = 'vtotal_price_cache_repair_v2_' + t;
    const needsCacheRepair = localStorage.getItem(cacheRepairKey) !== '1';

    // ?대쾲 ?몄뀡?먯꽌 ?대? ???곗빱瑜?CF DB濡쒕???諛쏆븘?붿쑝硫?IndexedDB 罹먯떆留??ъ슜 (?ㅽ듃?뚰겕 ?붿껌 ?앸왂)
    const alreadyFetchedThisSession = !!_sessionFetched[t];
    const cacheCloseEnough = lastCachedTs > 0 && (requestedEnd - lastCachedTs <= 86400000 * 5);
    const needsNetworkFetch = cached.dates.length === 0 || !enoughOld || ((!alreadyFetchedThisSession || !cacheCloseEnough) && (force || needsCacheRepair || !cacheCloseEnough));

    if (needsNetworkFetch) {
      if (!force && !needsCacheRepair && enoughOld && lastCachedTs > 0) {
        fetchP1 = Math.floor(lastCachedTs / 1000) + 86400;
        isDelta = true;
      } else {
        fetchP1 = p1;
        isDelta = false;
      }
      fetchP2 = p2 + (86400 * 3);
      const yUrl = `${CF_WORKER_URL}/api/prices?t=${t}&p1=${fetchP1}&p2=${fetchP2}`;

      // ???곗빱??????ㅽ듃?뚰겕 ?몄텧 吏꾪뻾 ?뚮옒洹몃? ?몄썙 ?숈씪 ?곗빱???꾩냽 ?몄텧???湲고븯?꾨줉 ?⑸땲??
      let resolveTickerPending;
      _tickerPending[t] = new Promise(r => { resolveTickerPending = r; });

      try {
        const response = await fetch(yUrl);
        const res = await response.json();
        if (res.error) throw new Error(res.error);
        if (!res.chart || !res.chart.result || !res.chart.result[0]) throw new Error("Invalid Data Format");
        const tsCheck = res.chart.result[0].timestamp;
        if (['SOXL', 'QQQ', 'SOXX', 'TQQQ'].includes(t.toUpperCase()) && (!tsCheck || tsCheck.length === 0)) throw new Error(`${t} Data Empty`);

        const incoming = parsePriceChartPayload(t, res, rnd);
        const newDates = incoming.dates;
        const newClose = incoming.close;
        const newOpen = incoming.open;
        const previousCached = cached;
        if (isDelta) {
          const lastStr = formatDateNY(new Date(lastCachedTs));
          const freshIdx = newDates.findIndex(d => formatDateNY(d) > lastStr);
          if (freshIdx !== -1) { cached.dates = cached.dates.concat(newDates.slice(freshIdx)); cached.close = cached.close.concat(newClose.slice(freshIdx)); cached.open = cached.open.concat(newOpen.slice(freshIdx)); }
        } else {
          let existingLastStr = cached.dates.length > 0 ? formatDateNY(new Date(cached.dates[cached.dates.length - 1])) : "1900-01-01";
          let newLastStr = newDates.length > 0 ? formatDateNY(newDates[newDates.length - 1]) : "1900-01-01";
          if (existingLastStr > newLastStr) { console.warn(`?곗씠???꾨씫 媛먯?! 湲곗〈 罹먯떆 蹂댄샇.`); } else { cached.dates = newDates; cached.close = newClose; cached.open = newOpen; }
        }
        cached = mergePriceSeries(previousCached, incoming, t);
        const todayNYStr = normalizeDateKey(new Date()); const nowNY = new Date(); const nyHour = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }).format(nowNY));
        if (cached.dates.length > 0) { const lastDayNY = normalizeDateKey(cached.dates[cached.dates.length - 1]); if (lastDayNY === todayNYStr) { if (nyHour < 17) { cached.dates.pop(); cached.close.pop(); cached.open.pop(); } } }
        await setDB(cached); localStorage.setItem('vtotal_last_fetch_' + t, now.toString()); localStorage.setItem(cacheRepairKey, '1');
        _sessionFetched[t] = true;
        console.log(`[CF DB ?숆린???꾨즺] ${t}: ${cached.dates.length}嫄?(?ㅽ듃?뚰겕 1??`);
      } catch (e) {
        // CF ?뚯빱 ?ㅽ뙣 ??IndexedDB 罹먯떆???곗씠?곌? ?덉쑝硫?洹몃?濡??ъ슜 (?ㅽ봽?쇱씤 諛⑹뼱)
        if (cached.dates.length > 0) {
          console.warn(`[CF DB ?섏쭛 ?ㅽ뙣] ${t} - IndexedDB 罹먯떆 ?ъ슜: ` + e.message);
          _sessionFetched[t] = true;
        } else {
          resolveTickerPending(); delete _tickerPending[t];
          throw new Error("?곗씠???섏쭛 ?ㅽ뙣: " + e.message);
        }
      } finally {
        resolveTickerPending(); delete _tickerPending[t];
      }
    }
    const finalResult = { dates: [], close: [], open: [] }; const reqS = requestedStart, reqE = requestedEnd;
    for (let i = 0, len = cached.dates.length; i < len; i++) { const key = normalizeDateKey(cached.dates[i]); const ts = dateFromKey(key).getTime(); if (ts >= reqS && ts <= reqE + (86400 * 1000 * 5)) { finalResult.dates.push(dateFromKey(key)); finalResult.close.push(cached.close[i]); finalResult.open.push(cached.open[i]); } }
    yahooCache[memKey] = finalResult; return finalResult;
  })();
  pendingFetches[memKey] = fetchPromise; const result = await fetchPromise; delete pendingFetches[memKey]; return result;
}

// IndexedDB?먯꽌 ?곗씠?곕? ?쎌뼱 ?붿껌 踰붿쐞濡??꾪꽣留곹븯???ы띁 (?몄뀡 ??以묐났 ?ㅽ듃?뚰겕 ?몄텧 諛⑹???
async function _buildResultFromDB(t, p1, p2, rnd) {
  let cached = await getDB(t);
  if (!cached) { cached = { ticker: t, dates: [], close: [], open: [] }; }
  cached = normalizePriceSeries(cached, t);
  const reqS = p1 * 1000, reqE = p2 * 1000;
  const finalResult = { dates: [], close: [], open: [] };
  for (let i = 0, len = cached.dates.length; i < len; i++) {
    const key = normalizeDateKey(cached.dates[i]); const ts = dateFromKey(key).getTime();
    if (ts >= reqS && ts <= reqE + (86400 * 1000 * 5)) { finalResult.dates.push(dateFromKey(key)); finalResult.close.push(cached.close[i]); finalResult.open.push(cached.open[i]); }
  }
  const memKey = `${t}_${p1}_${p2}`;
  yahooCache[memKey] = finalResult;
  return finalResult;
}

// ?뱢 ?듭떖 ?ъ옄 濡쒖쭅 ?⑥닔??
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

// ?㎜ ?곸튂湲?(Order Matcher) - ?뚯씠???먮낯 濡쒖쭅 100% ?댁떇 諛?MOC 踰꾧렇 ?섏젙
function run_tungchigi_master(paramsArr) {
  if (!paramsArr || paramsArr.length === 0) return [];
  const MAX_ORDERS = 500;

  let g = new Float64Array(MAX_ORDERS), h = new Float64Array(MAX_ORDERS);
  let i_p = new Float64Array(MAX_ORDERS), j = new Float64Array(MAX_ORDERS);
  let k = new Array(MAX_ORDERS).fill(false);

  for (let idx = 0; idx < paramsArr.length; idx++) {
    if (idx >= MAX_ORDERS) break;
    let side = paramsArr[idx][0];
    let method = String(paramsArr[idx][1] || "").trim();
    let price = parseFloat(paramsArr[idx][2]);
    let qty = parseFloat(paramsArr[idx][3]);

    if (side === '매수') {
      g[idx] = price; h[idx] = qty;
    } else {
      i_p[idx] = price; j[idx] = qty;
      if (method.toUpperCase() === 'MOC') k[idx] = true;
    }
  }

  // [?ㅻ쪟 ?섏젙] ?뚯씠?ъ쓽 np.concatenate ?ы쁽
  let u_g = Array.from(new Set(Array.from(g).filter(v => v > 0)));
  let adj_sell = Array.from(i_p).map((val, i) => k[i] ? 0.01 : val);
  let u_i = Array.from(new Set(adj_sell.filter(v => v > 0)));

  let m_prices = [...u_g, ...u_i].sort((a, b) => b - a);
  let m_col = new Array(MAX_ORDERS).fill(NaN);
  m_prices.forEach((val, i) => m_col[i] = val);

  let n_col = new Float64Array(MAX_ORDERS), o_col = new Float64Array(MAX_ORDERS);
  for (let idx = 0; idx < MAX_ORDERS; idx++) {
    if (isNaN(m_col[idx])) continue;
    let mv = m_col[idx];
    
    // COUNTIF ?꾨꼍 ?ы쁽
    let count_m = m_col.slice(0, idx + 1).filter(v => v === mv).length;
    
    if (count_m > 1) {
      n_col[idx] = 0;
    } else {
      let sum_h = 0;
      for (let x = 0; x < MAX_ORDERS; x++) if (g[x] === mv) sum_h += h[x];
      n_col[idx] = sum_h;
    }

    // O??매도 濡쒖쭅 諛?MOC ?⑹궛
    if (n_col[idx] > 0) {
      o_col[idx] = 0;
    } else if (mv === 0.01) {
      let sum_j = 0;
      for (let x = 0; x < MAX_ORDERS; x++) if (k[x]) sum_j += j[x];
      o_col[idx] = -sum_j;
    } else {
      let sum_j = 0;
      for (let x = 0; x < MAX_ORDERS; x++) if (!k[x] && i_p[x] === mv) sum_j += j[x];
      o_col[idx] = -sum_j;
    }
  }

  let p_col = new Float64Array(MAX_ORDERS), cumsum_n = 0;
  for (let idx = 0; idx < MAX_ORDERS - 1; idx++) {
    cumsum_n += n_col[idx];
    p_col[idx + 1] = cumsum_n;
  }

  let q_col = new Float64Array(MAX_ORDERS), cumsum_o = 0;
  for (let idx = MAX_ORDERS - 2; idx >= 0; idx--) {
    cumsum_o += o_col[idx];
    q_col[idx] = cumsum_o;
  }

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

  let y_sorted = y_raw.sort((a, b) => b - a), z_sorted = z_raw.sort((a, b) => b - a);
  let y_final = new Array(MAX_ORDERS).fill(NaN), z_final = new Array(MAX_ORDERS).fill(NaN);
  for (let i = 0; i < z_sorted.length; i++) z_final[i] = z_sorted[i];
  for (let i = 0; i < y_sorted.length; i++) if (i + 1 < MAX_ORDERS) y_final[i + 1] = y_sorted[i];

  let grouped = {};
  for (let idx = 0; idx < MAX_ORDERS; idx++) {
    let s = s_col[idx]; if (s === 0) continue;
    let side = s > 0 ? "매수" : "매도", price = s > 0 ? y_final[idx] : z_final[idx];
    if (isNaN(price) || price <= 0) continue;
    
    // 遺?숈냼?섏젏 ?ㅼ감濡??명빐 MOC媛 LOC濡??먮퀎?섎뒗 踰꾧렇 ?먯쿇 李⑤떒
    let method = (Math.abs(price - 0.01) < 0.0001 && side === "매도") ? "MOC" : "LOC";
    let key = side + "|" + method + "|" + price.toFixed(4);
    
    if (!grouped[key]) grouped[key] = { side: side, method: method, price: price, qty: Math.abs(s) };
    else grouped[key].qty += Math.abs(s);
  }

  const sortOrder = localStorage.getItem(`vtotal_sort_order_${window.myUserId || ""}`) || "asc";
  const mult = sortOrder === "desc" ? -1 : 1;
  return Object.values(grouped).sort((a, b) => (a.price - b.price) * mult).map(r => {
    if (r.method === "MOC") {
      // ?렞 MOC 異쒕젰 ??媛寃⑹쓣 鍮덉뭏("")?쇰줈 蹂寃쏀븯??援ш? ?쒗듃 ?먮윭 ?먯쿇 李⑤떒
      return ["매도", "MOC", "", r.qty]; 
    } else {
      return [r.side, r.method, r.price, r.qty];
    }
  });
}

// ?쭬 諛깊뀒?ㅽ듃 ?붿쭊 硫붿씤 ?꾨줈?몄뒪
async function runBacktestMemory(params, force = false, slotNum = null, overrideSnap = null) {
  try {
    let ticker = params.basics.ticker.toString().trim(), startDate = new Date(params.basics.startDate);
    let endDateInput = params.basics.endDate;
    let endDate = (endDateInput && endDateInput.trim() !== "") ? new Date(endDateInput) : new Date();
    endDate.setHours(23, 59, 59, 999);

    function n(val, def) { return (val === "" || isNaN(val)) ? def : parseFloat(val); }
    function p(val) { const num = parseFloat(val); return isNaN(num) ? 0.0 : (num / 100.0); }

    const realTimePrincipal = n(params.basics.initialCash, 10000);
    const realTimeRenew = n(params.basics.renewCash, realTimePrincipal);

    let initialCash = fixFloat(realTimePrincipal);
    let basePrincipal = fixFloat(realTimeRenew);

    let curStrat = params.basics.strategy || '2M3D1-1P';
    if (curStrat === 'RSI 3M') curStrat = '3M3D1-R';
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
    if (slotNum) {
      if (!window.globalMainDataSlot) window.globalMainDataSlot = {};
      window.globalMainDataSlot[slotNum] = mainDataAll;
    }
    let startIndex = mainDataAll.dates.findIndex(d => { const dTs = (d instanceof Date) ? d.getTime() : new Date(d).getTime(); return dTs >= startDate.getTime(); }); if (startIndex === -1) startIndex = mainDataAll.dates.length;
    let firstPrevClose = (startIndex > 0) ? mainDataAll.close[startIndex - 1] : mainDataAll.open[0], wRsiMap = calculateWRSI_WFRI(qqqData);

    let cash = initialCash, prev_total = initialCash, peak = initialCash, base = basePrincipal, inv = [];
    let cumulativeInOut = 0;
    let cumulativeRealizedProfit = 0;
    let trackingRealPrincipal = initialCash; 
    let res = { S: [], BA: [], BF: [], AV: [], INOUT: [], dailyStates: [], trades: [] };

    let activeSlot = slotNum || activeSettingsTab;
    let bDates = mainDataAll.dates.filter(d => { const dTs = (d instanceof Date) ? d.getTime() : new Date(d).getTime(); return dTs <= endDate.getTime() && dTs >= startDate.getTime(); });
    const snapKey = `vtotal_snap${activeSlot}_` + myUserId;
    const snapStr = localStorage.getItem(snapKey);
    let startLoopIdx = 0;
    let maxBuyDate = "";

    let snapToUse = null;
    if (overrideSnap) {
      snapToUse = overrideSnap;
    } else if (!isManualBacktestMode && !force && snapStr) {
      try { snapToUse = JSON.parse(snapStr); } catch (e) { }
    }

    if (snapToUse) {
      let snap = snapToUse;
      if (snap.currentStrat === curStrat && snap.chartDates && snap.chartDates.length > 0) {
        res.S = snap.chartDates.slice();
        res.BA = snap.chartBalances.slice();
        res.BF = snap.chartMdd.slice();
        res.INOUT = (snap.chartInout || []).slice();
        res.trades = snap.trades || [];

        inv = snap.inv || [];
        inv.forEach(h => { if (h.buyDate > maxBuyDate) maxBuyDate = h.buyDate; });
        let lastSnapDateStr = res.S[res.S.length - 1];
        if (lastSnapDateStr > maxBuyDate) maxBuyDate = lastSnapDateStr;

        cash = fixFloat(snap.summary.cash);
        peak = snap.summary.peak || (res.BA.length > 0 ? Math.max(...res.BA) : initialCash);
        cumulativeRealizedProfit = snap.summary.realizedProfit || 0;

        let oldBase = fixFloat(snap.summary.base || initialCash);
        trackingRealPrincipal = snap.summary.realPrincipal || initialCash;
        cumulativeInOut = fixFloat(snap.summary.inout || 0);

        base = oldBase;

        lastSnapDateStr = res.S[res.S.length - 1];
        startLoopIdx = bDates.findIndex(d => formatDateNY(d) > lastSnapDateStr);
        if (startLoopIdx === -1) startLoopIdx = bDates.length;
      }
    }

    let full_c = mainDataAll.close, rsi_m = 'SF';
    function t2(v) { return (v === null || v === undefined || isNaN(v)) ? 0.0 : Math.trunc((v + 0.00001) * 100) / 100.0; }
    function t2_pl(v) { let sign_v = (v > 0 ? 1 : (v < 0 ? -1 : 0)); return (v === null || v === undefined || isNaN(v)) ? 0.0 : Math.trunc((v + sign_v * 0.00001) * 100) / 100.0; }
    function c2(v) { return (v === null || v === undefined || isNaN(v)) ? 0.0 : Math.ceil((v * 100) - 0.00001) / 100.0; }
    function truncPct5(v) { return v; }

    for (let wI = 0; wI < (startIndex + startLoopIdx); wI++) {
      let dtStrObj = mainDataAll.dates[wI];
      if (!dtStrObj) continue;
      let dtStr = formatDateNY(dtStrObj);
      let rv = wRsiMap[dtStr] ? wRsiMap[dtStr].dR : 50, rrv = wRsiMap[dtStr] ? wRsiMap[dtStr].dRR : 50;
      if (rv !== 0) {
        if (curStrat === '3M3D1-R') {
          if (rv >= 65.2) rsi_m = 'AG';
          else if (rv <= 45.6) rsi_m = 'SF';
          else rsi_m = 'DEF';
        } else {
          if (rrv <= 35 && rrv < rv) rsi_m = 'AG';
          else if (rrv >= 40 && rrv < 50 && rrv > rv) rsi_m = 'SF';
          else if (rrv <= 50 && rv > 50) rsi_m = 'AG';
          else if (rrv >= 50 && rv < 50) rsi_m = 'SF';
          else if (rrv >= 50 && rrv < 60 && rrv < rv) rsi_m = 'AG';
          else if (rrv > 65 && rrv > rv) rsi_m = 'SF';
        }
      }
    }

    for (let i = startLoopIdx; i < bDates.length; i++) {
      let idx = startIndex + i, close = full_c[idx], dtStr = formatDateNY(bDates[i]), prev = (idx === 0) ? firstPrevClose : full_c[idx - 1];
      if (res.S.includes(dtStr)) continue;

      let current_daily_profits = 0; 
      let daily_trades_temp = [];    

      let rv = wRsiMap[dtStr] ? wRsiMap[dtStr].dR : 50, rrv = wRsiMap[dtStr] ? wRsiMap[dtStr].dRR : 50;
      if (rv !== 0) {
        if (curStrat === '3M3D1-R') {
          if (rv >= 65.2) rsi_m = 'AG';
          else if (rv <= 45.6) rsi_m = 'SF';
          else rsi_m = 'DEF';
        } else {
          if (rrv <= 35 && rrv < rv) rsi_m = 'AG';
          else if (rrv >= 40 && rrv < 50 && rrv > rv) rsi_m = 'SF';
          else if (rrv <= 50 && rv > 50) rsi_m = 'AG';
          else if (rrv >= 50 && rv < 50) rsi_m = 'SF';
          else if (rrv >= 50 && rrv < 60 && rrv < rv) rsi_m = 'AG';
          else if (rrv > 65 && rrv > rv) rsi_m = 'SF';
        }
      }

      let is3Drop = (idx >= 4) && (truncPct5((full_c[idx - 3] - full_c[idx - 4]) / full_c[idx - 4]) <= cDn3) && (truncPct5((full_c[idx - 2] - full_c[idx - 3]) / full_c[idx - 3]) <= cDn2) && (truncPct5((full_c[idx - 1] - full_c[idx - 2]) / full_c[idx - 2]) <= cDn1);
      let isPlunge = (truncPct5((full_c[idx - 1] - full_c[idx - 2]) / full_c[idx - 2]) <= dLimit);
      let applied_m = null;
      if (is3Drop) {
        if (rsi_m === 'SF' && useMid1) applied_m = 'Middle';
        else if (rsi_m === 'AG' && useMid3) applied_m = 'Middle3';
        else if (rsi_m === 'DEF' && curStrat === '3M3D1-R') applied_m = 'Middle';
      }
      if (!applied_m && isPlunge && useMid2) {
        applied_m = 'Middle2';
      }
      let curr_m = applied_m || rsi_m;

      let t = inv.length + 1;
      if (tierAssign === '理쒖냼(鍮덉옄由?' || tierAssign === '理쒖냼') {
        let used = inv.map(p => p.tier); t = 1; while (used.indexOf(t) !== -1) t++;
      }

      let b_qty = 0, b_tgt = 0, seed = 0.0;
      if (MODES[curr_m] && t <= MODES[curr_m].weight.length) {
        let w_val = MODES[curr_m].weight[t - 1];
        seed = t2(Math.min(base * w_val, cash));
        b_tgt = t2(prev * (1 + MODES[curr_m].buy[t - 1]));
        if (b_tgt > 0 && close <= b_tgt) b_qty = Math.floor(seed / (b_tgt * (1 + fBuy)) + 0.0001);
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
            qty: p_inv.qty,
            profit: fixFloat(trade_pl)
          });
        } else n_inv.push(p_inv);
      }
      inv = n_inv;
      if (b_qty > 0) {
        let totalBC = (b_qty * close) * (1 + fBuy);

        if (totalBC <= cash) {
          d_cf -= totalBC;
          inv.push({ buy_price: close, qty: b_qty, cost: fixFloat(totalBC), mode: curr_m, tier: t, days: 0, buyDate: dtStr });
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
          realPrincipal: fixFloat(trackingRealPrincipal), 
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

    if (res.S.length === 0) {
      peak = Math.max(peak, initialCash);
      prev_total = initialCash;
    }

    let rawOrderOutput = [], orderDateStr = "날짜 확인 불가";
    let nextOrderInfo = { tier: "-", mode: "-", weight: "-", qty: "-" };

    let tIdx = full_c.length;
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

      let today_m = rsi_m;

      if (nextFriTS !== lastFriTS) {
        const lastBarInfo = wRsiMap[lastDateNYStr];
        if (lastBarInfo) {
          const rv = lastBarInfo.dCurrent;
          const rrv = lastBarInfo.dR;
          if (rv !== 0) {
            if (curStrat === '3M3D1-R') {
              if (rv >= 65.2) today_m = 'AG';
              else if (rv <= 45.6) today_m = 'SF';
              else today_m = 'DEF';
            } else {
              if (rrv <= 35 && rrv < rv) today_m = 'AG';
              else if (rrv >= 40 && rrv < 50 && rrv > rv) today_m = 'SF';
              else if (rrv <= 50 && rv > 50) today_m = 'AG';
              else if (rrv >= 50 && rv < 50) today_m = 'SF';
              else if (rrv >= 50 && rrv < 60 && rrv < rv) today_m = 'AG';
              else if (rrv > 65 && rrv > rv) today_m = 'SF';
            }
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
          else if (today_m === 'DEF' && curStrat === '3M3D1-R') applied_m_t = 'Middle';
        }
        if (!applied_m_t && isPlunge_t && useMid2) {
          applied_m_t = 'Middle2';
        }
        if (applied_m_t) today_m = applied_m_t;
      }

      let tTier = inv.length + 1; if (tierAssign === '理쒖냼(鍮덉옄由?' || tierAssign === '理쒖냼') { let used = inv.map(p_i => p_i.tier); tTier = 1; while (used.indexOf(tTier) !== -1) tTier++; }
      let currentW = MODES[today_m].weight[tTier - 1] || 0;

      let tSeed = t2(Math.min(base * currentW, cash));

      let bTgtVal = MODES[today_m].buy[tTier - 1] || 0;
      let tTgt = t2(lastDataClose * (1 + bTgtVal));
      let todayBuyQty = (tTgt > 0 && currentW > 0) ? Math.floor((tSeed / (tTgt * (1 + fBuy))) + 0.0001) : 0;
      if (todayBuyQty > 0) rawOrderOutput.push(["매수", "LOC", tTgt, todayBuyQty]);

      inv.forEach(p_i => {
        let p_mode = MODES[p_i.mode] || MODES['SF'];
        let sellRate = p_mode.sell[p_i.tier - 1] || p_mode.sell[0] || 0;
        let s_tgt = c2(p_i.buy_price * (1 + sellRate));
        let hIdx = Math.min(p_i.tier - 1, p_mode.hold.length - 1);
        let h_limit = p_mode.hold[hIdx] || 1;

        if (p_i.days >= h_limit - 1) {
            rawOrderOutput.push(["매도", "MOC", 0.01, p_i.qty]);
        } else {
            rawOrderOutput.push(["매도", "LOC", s_tgt, p_i.qty]);
        }
      });

      nextOrderInfo = { tier: tTier, mode: today_m, weight: (currentW * 100).toFixed(1), qty: todayBuyQty };
    }

    let lastIdx = res.BA.length - 1, tAssets = lastIdx >= 0 ? res.BA[lastIdx] : initialCash;
    let totalRealizedProfit = fixFloat(cumulativeRealizedProfit);
    let tQty = inv.reduce((s, p) => s + p.qty, 0), avgPrice = tQty > 0 ? fixFloat(inv.reduce((s, p) => s + p.cost, 0) / tQty) : 0;
    let currPrice = full_c.length > 0 ? full_c[full_c.length - 1] : 0;
    let evalVal = fixFloat(inv.reduce((s, p_i) => s + (p_i.qty * currPrice), 0));
    let realPrincipal = fixFloat(trackingRealPrincipal); 
    let totalProfit = fixFloat(tAssets - realPrincipal);

    if (totalProfit === 0 && base !== tAssets) {
      totalProfit = fixFloat(tAssets - base);
    }

    let yrs = (endDate - startDate) / (1000 * 60 * 60 * 24 * 365.25);
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
      currPrice: currPrice, currentMdd: lastIdx >= 0 ? res.BF[lastIdx] : 0,
      base: base, inout: cumulativeInOut, realPrincipal: realPrincipal, peak: peak
    };

    let finalOrders = run_tungchigi_master(rawOrderOutput);

    return {
      status: "success",
      inv: inv,
      trades: res.trades,
      orders: finalOrders,
      rawOrders: rawOrderOutput,
      orderDateStr: orderDateStr,
      summary: summary,
      chartDates: res.S,
      chartBalances: res.BA,
      chartMdd: res.BF,
      monthlyData: calculateMonthlyData(res.S, res.BA, res.BF, res.INOUT),
      yearlyData: calculateYearlyData(res.S, res.BA, res.BF, res.INOUT),
      dailyData: calculateDailyData(res.S, res.BA, res.BF, res.INOUT),
      currentStrat: curStrat,
      nextOrderInfo: nextOrderInfo,
      dailyStates: res.dailyStates,
      chartInout: res.INOUT,
      isSynced: false 
    };
  } catch (e) {
    console.error("runBacktestMemory error:", e);
    return { status: "error", message: e.toString() };
  }
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
      let endInout = (inouts && inouts[i - 1] !== undefined) ? inouts[i - 1] : 0;

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
      let endInout = (inouts && inouts[i] !== undefined) ? inouts[i] : 0;

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
      let endInout = (inouts && inouts[i - 1] !== undefined) ? inouts[i - 1] : 0;

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
      let endInout = (inouts && inouts[i] !== undefined) ? inouts[i] : 0;

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

function calculateDailyData(dates, balances, mdds, inouts) {
  if (!dates || dates.length === 0) return [];
  let daily = [];

  let startBalance = balances[0];
  let startInout = (inouts && inouts.length > 0) ? inouts[0] : 0;

  for (let i = 0; i < dates.length; i++) {
    let dayKey = dates[i];
    let endBalance = balances[i];
    let endInout = (inouts && inouts[i] !== undefined) ? inouts[i] : 0;

    let prevBalance = i > 0 ? balances[i - 1] : startBalance;
    let prevInout = i > 0 ? inouts[i - 1] : startInout;

    let inoutForPeriod = endInout - prevInout;
    let dayProfit = endBalance - prevBalance - inoutForPeriod;
    let basis = prevBalance + inoutForPeriod;

    daily.push({
      period: dayKey,
      asset: endBalance,
      rate: basis > 0 ? dayProfit / basis : 0,
      profit: dayProfit,
      mdd: mdds[i]
    });
  }
  return daily;
}


// ?뙋 ?ㅼ쟾 ?곗씠??泥섎━ (Real Log Data)
function processRealLogData(d, currentStrat, userInitialCash) {
  if (!d || !d.logs || d.logs.length === 0) return null;
  const logs = d.logs; const meta = d.meta;
  let restoredInv = []; let restoredBase = 0; let realizedProfit = fixFloat(meta.realizedProfit) || 0; let cash = fixFloat(meta.currentCash) || 0; let serverQty = fixFloat(meta.qty) || 0; let serverAvg = fixFloat(meta.avgPrice) || 0;
  let restoredRealPrincipal = 0; 
  if (d.json && d.json.trim() !== "") { try { const parsed = JSON.parse(d.json);         if (parsed.holdings) {
          restoredInv = parsed.holdings.map(h => {
            const rawBp = h.buy_price !== undefined ? h.buy_price : (h.buyPrice || 0);
            const cleanBp = typeof rawBp === 'number' ? rawBp : parseFloat(String(rawBp).replace(/[^0-9.-]/g, "")) || 0;
            const rawCost = h.cost !== undefined ? h.cost : 0;
            const cleanCost = typeof rawCost === 'number' ? rawCost : parseFloat(String(rawCost).replace(/[^0-9.-]/g, "")) || 0;
            return { ...h, buy_price: fixFloat(cleanBp), cost: fixFloat(cleanCost) };
          });
        } if (parsed.base_principal !== undefined) { restoredBase = fixFloat(parsed.base_principal); } else if (parsed.base !== undefined) { restoredBase = fixFloat(parsed.base); } if (parsed.realizedProfit !== undefined) realizedProfit = fixFloat(parsed.realizedProfit); if (parsed.cash !== undefined) cash = fixFloat(parsed.cash); if (parsed.realPrincipal !== undefined) restoredRealPrincipal = fixFloat(parsed.realPrincipal); } catch (e) { console.error("JSON ?뚯떛 ?ㅽ뙣", e); } }
  let qty = 0, totalCost = 0; restoredInv.forEach(item => { const itemQty = fixFloat(item.qty) || 0; const itemCost = fixFloat(item.cost) || (fixFloat(item.buy_price) * itemQty); qty += itemQty; totalCost += itemCost; }); let avgPrice = qty > 0 ? fixFloat(totalCost / qty) : 0;
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
  let rawLogs = []; for (let i = 0; i < logs.length; i++) { let r = logs[i]; let dateStr = r[0]; let asset = fixFloat(String(r[1]).replace(/[^0-9.-]+/g, "")) || 0; if (dateStr && asset > 0) { let exactDate = parseAndFormatYYMMDD(dateStr); let inoutValue = fixFloat(String(r[2]).replace(/[^0-9.-]+/g, "")) || 0; /* 狩먲툘 r[3]??r[2]濡?蹂寃?*/ rawLogs.push({ date: exactDate, asset: asset, inout: inoutValue, raw: r }); } }

  if (rawLogs.length === 0) {
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

  let totalInoutSum = 0;
  for (let i = 1; i < rawLogs.length; i++) {
    totalInoutSum += (rawLogs[i].inout || 0);
  }

  const sheetStartingAsset = rawLogs.length > 0 ? rawLogs[0].asset : userInitialCash;
  const calculatedPrincipal = fixFloat(sheetStartingAsset + totalInoutSum);

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

  let chartDatesFull = [...chartDates], chartBalancesFull = [...chartBalances], chartInoutFull = [...chartInout], chartMddFull = [...chartMdd];

  const lastAsset = chartBalances[chartBalances.length - 1] || 0;
  const minMdd = chartMdd.length > 0 ? Math.min(...chartMdd) : 0;

  const principalFromState = restoredRealPrincipal > 0 ? restoredRealPrincipal : (restoredBase > 0 ? restoredBase : calculatedPrincipal);
  const finalPrincipal = principalFromState;
  const totalProfit = fixFloat(lastAsset - principalFromState);
  const simpleYield = principalFromState > 0 ? totalProfit / principalFromState : 0;
  const evalVal = fixFloat(lastAsset - cash); const depletion = lastAsset > 0 ? (evalVal / lastAsset) : 0; const investPrincipal = fixFloat(qty * avgPrice); const evalReturn = investPrincipal > 0 ? (evalVal - investPrincipal) / investPrincipal : 0; const currPrice = parseFloat(meta.tickerPrice) || 0;

  let cagr = 0;
  const effectivePrincipal = principalFromState;

  if (chartDates.length > 0 && effectivePrincipal > 0 && lastAsset > 0) {
    const toDateObj = (str) => {
      let p = str.split('-');
      let year = parseInt(p[0], 10);
      if (year < 100) year += 2000;
      return new Date(year, parseInt(p[1], 10) - 1, parseInt(p[2], 10));
    };

    const sDateForCagr = toDateObj(trueStartDateStr);
    const eDateForCagr = toDateObj(chartDates[chartDates.length - 1]);

    let diffDays = Math.max(1, Math.round((eDateForCagr - sDateForCagr) / (1000 * 60 * 60 * 24)));

    const effProfit = fixFloat(lastAsset - effectivePrincipal);
    const effYield = effectivePrincipal > 0 ? effProfit / effectivePrincipal : 0;

    let calcValue = Math.pow(1 + effYield, 365 / diffDays) - 1;
    cagr = (isFinite(calcValue) && !isNaN(calcValue)) ? calcValue : effYield;
  }
  const calcPeriod = (type) => {
    if (chartDatesFull.length === 0) return [];
    let periods = {};
    for (let i = 0; i < chartDatesFull.length; i++) {
      let parts = chartDatesFull[i].split('-');
      let periodKey = type === 'month' ? `${parts[0]}-${parts[1]}` : (type === 'year' ? parts[0] : chartDatesFull[i]);
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

  let finalEffPrincipal = principalFromState;
  let finalProfit = fixFloat(lastAsset - finalEffPrincipal);
  let finalYield = finalEffPrincipal > 0 ? finalProfit / finalEffPrincipal : 0;

  let summary = {
    totalAssets: lastAsset, 
    yield: finalYield,
    cagr: cagr,
    mdd: minMdd,
    calmar: minMdd !== 0 ? Math.abs(cagr / minMdd) : 0,
    totalProfit: finalProfit,
    realizedProfit: realizedProfit,
    qty: serverQty > 0 ? serverQty : qty,
    avgPrice: serverAvg > 0 ? serverAvg : avgPrice,
    evalReturn: evalReturn,
    evalVal: evalVal,
    cash: cash, 
    depletion: depletion,
    currPrice: currPrice,
    currentMdd: chartMdd[chartMdd.length - 1],
    base: finalPrincipal, 
    inout: totalInoutSum,
    realPrincipal: principalFromState, 
    trueStartDate: trueStartDateStr
  };

  let rawOrderOutput = [];
  let targetStrat = currentStrat;
  if (targetStrat === 'RSI 3M') targetStrat = '3M3D1-R';
  let M_STRAT_T = MASTER_STRATEGIES[targetStrat] || MASTER_STRATEGIES["2M3D1-1P"];
  let MODES_T = M_STRAT_T.modes;
  function c2_T(v) { return Math.ceil((v * 100) - 0.0000001) / 100.0; }
  
  if (restoredInv.length > 0) { 
    restoredInv.forEach(p_i => { 
      let modeData = MODES_T[p_i.mode] || MODES_T['SF']; 
      let sellRate = modeData.sell[p_i.tier - 1] || modeData.sell[0] || 0; 
      let s_tgt = c2_T(p_i.buy_price * (1 + sellRate)); 

      // ?렞 ?쒗듃?먯꽌 遺덈윭???곗씠?곕룄 蹂댁쑀 ?쒓퀎??寃???곸슜 (??뼱?곌린 諛⑹?)
      let hIdx = Math.min(p_i.tier - 1, modeData.hold.length - 1);
      let h_limit = modeData.hold[hIdx] || 1;

      if (p_i.days !== undefined && p_i.days >= h_limit - 1) {
          // ?렞 ?쒗듃 ?쒓린瑜??꾪빐 MOC??媛寃⑹쓣 鍮덉뭏("")?쇰줈 蹂寃쏀븯??援ш??쒗듃 ?곕룞 ?먮윭 ?먯쿇 李⑤떒
          rawOrderOutput.push(["매도", "MOC", "", p_i.qty]);
      } else {
          rawOrderOutput.push(["매도", "LOC", s_tgt, p_i.qty]); 
      }
    }); 
  }
  
  const sortOrder = localStorage.getItem(`vtotal_sort_order_${window.myUserId || ""}`) || "asc";
  const mult = sortOrder === "desc" ? -1 : 1;
  // ?뺣젹 ??媛寃⑹씠 ""(鍮덉뭏)??寃쎌슦 0?쇰줈 痍④툒?섏뿬 ?먮윭 諛⑹?
  const finalOrders = rawOrderOutput.sort((a, b) => ((a[2] === "" ? 0 : a[2]) - (b[2] === "" ? 0 : b[2])) * mult);

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
    chartDatesFull: chartDatesFull,
    chartBalancesFull: chartBalancesFull,
    chartInoutFull: chartInoutFull,
    monthlyData: calcPeriod('month'),
    yearlyData: calcPeriod('year'),
    dailyData: calcPeriod('day'),
    currentStrat: currentStrat,
    isSynced: true 
  };
}

// ?쭬 [engine.js] ?ㅼ쨷 ?щ’ 醫낇빀 怨꾩궛 濡쒖쭅
function calculateCombinedSummaryEngine(activeResults) {
  if (!activeResults || activeResults.length === 0) return null;
  if (activeResults.length === 1) return activeResults[0].summary;

  let tAssets = 0, evalVal = 0, totalProfit = 0, realizedProfit = 0, cash = 0, qty = 0;
  let currPriceSum = 0, avgPriceSum = 0, sumRealPrincipal = 0, sumBase = 0;
  let count = activeResults.length;

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

    sumRealPrincipal += (s.realPrincipal || 0);
    sumBase += (s.base || 0);
  }

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

  const totalProfitSum = totalProfit; 
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
    realPrincipal: sumRealPrincipal,
    depletion: tAssets > 0 ? (evalVal / tAssets) : 0
  };
}

function generateCombinedPeriodDataEngine(activeResults) {
  if (!activeResults || activeResults.length === 0) return { monthly: [], yearly: [], daily: [] };
  if (activeResults.length === 1) return { monthly: activeResults[0].monthlyData, yearly: activeResults[0].yearlyData, daily: activeResults[0].dailyData };

  let allDatesSet = new Set();
  activeResults.forEach(r => { if (r.chartDates) r.chartDates.forEach(d => allDatesSet.add(d)); });
  let sortedDates = Array.from(allDatesSet).sort();

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
            let firstAsset = r.chartBalances[0] || 0;
            let firstInout = r.chartInout ? r.chartInout[0] : 0;
            let currInout = r.chartInout ? r.chartInout[idx] : 0;
            slotInoutVal = firstAsset + (currInout - firstInout);
          } else {
            let initialCash = r.summary && r.summary.realPrincipal ? (r.summary.realPrincipal - (r.summary.inout || 0)) : (r.chartBalances[0] || 0);
            slotInoutVal = initialCash + (r.chartInout ? r.chartInout[idx] : 0);
          }
        } else {
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

    if (dayAsset > peak) peak = dayAsset;
    combinedMdds.push(peak > 0 ? (dayAsset - peak) / peak : 0);
  });

  return {
    monthly: calculateMonthlyData(sortedDates, combinedBalances, combinedMdds, combinedInouts).reverse(),
    yearly: calculateYearlyData(sortedDates, combinedBalances, combinedMdds, combinedInouts).reverse(),
    daily: calculateDailyData(sortedDates, combinedBalances, combinedMdds, combinedInouts).reverse()
  };
}




