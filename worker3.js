/**
 * 🌐 V-TOTAL MASTER3.0 V3.20 Cloudflare Worker Backend
 * 
 * [바인딩 요구사항]:
 * 1. D1 Database 바인딩: 변수명 `DB` -> 생성한 D1 데이터베이스 바인딩
 * 2. KV Namespace 바인딩: 변수명 `VTOTAL_KV` -> 생성한 KV 네임스페이스 바인딩
 */

const MASTER_STRATEGIES = {
  "1M": {
    config: { compR: 0.824, lossR: 0.329, dLimit: -0.048, cDn3: 0.0, cDn2: 0.008, cDn1: 0.0, tierMethod: '보유', useMid1: false, useMid2: false, useMid3: false },
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
    config: { compR: 0.939, lossR: 0.699, dLimit: -0.048, cDn3: 0.0, cDn2: 0.008, cDn1: 0.0, tierMethod: '보유', useMid1: true, useMid2: false, useMid3: true },
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
    config: { compR: 0.818, lossR: 0.282, dLimit: -0.048, cDn3: 0.0, cDn2: 0.008, cDn1: 0.0, tierMethod: '보유', useMid1: true, useMid2: true, useMid3: true },
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
    config: { compR: 0.814, lossR: 0.286, dLimit: -0.048, cDn3: 0.0, cDn2: 0.008, cDn1: 0.0, tierMethod: '보유', useMid1: true, useMid2: false, useMid3: true },
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
    config: { compR: 0.814, lossR: 0.293, dLimit: -0.048, cDn3: 0.0, cDn2: 0.008, cDn1: 0.0, tierMethod: '보유', useMid1: true, useMid2: false, useMid3: true },
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
    config: { compR: 0.814, lossR: 0.293, dLimit: -0.048, cDn3: 0.0, cDn2: 0.008, cDn1: 0.0, tierMethod: '보유', useMid1: true, useMid2: false, useMid3: true },
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
    config: { compR: 0.9, lossR: 0.304, dLimit: -0.048, cDn3: 0.0, cDn2: 0.008, cDn1: 0.0, tierMethod: '보유', useMid1: true, useMid2: false, useMid3: true },
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

function pyRound2(num) {
  let factor = 100, temp = num * factor, rounded = Math.round(temp);
  if (Math.abs(temp % 1) === 0.5) rounded = (Math.floor(temp) % 2 === 0) ? Math.floor(temp) : Math.ceil(temp);
  return rounded / factor;
}

const formatterNY = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  year: 'numeric', month: '2-digit', day: '2-digit'
});

function formatDateNY(dateObj) {
  if (typeof dateObj === 'string') {
    let s = dateObj.replace(/\//g, '-');
    if (s.length >= 10 && s.charAt(4) === '-' && s.charAt(7) === '-') {
      return s.substring(0, 10);
    }
  }
  const dObj = (dateObj instanceof Date) ? dateObj : new Date(dateObj);
  if (isNaN(dObj.getTime())) return '';
  const parts = formatterNY.formatToParts(dObj);
  let y = "", m = "", d = "";
  for (const p of parts) {
    if (p.type === 'year') y = p.value;
    else if (p.type === 'month') m = p.value;
    else if (p.type === 'day') d = p.value;
  }
  return `${y}-${m}-${d}`;
}

function normalizeStockDate(dateValue) {
  if (!dateValue) return '';
  const raw = String(dateValue).trim();
  if (!raw) return '';

  const asFormatted = formatDateNY(raw);
  if (asFormatted && asFormatted.length === 10 && asFormatted.includes('-')) {
    const parts = asFormatted.split('-');
    if (parts.length === 3) {
      const y = parts[0].padStart(4, '0');
      const m = parts[1].padStart(2, '0');
      const d = parts[2].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  const cleaned = raw.replace(/\./g, '-').replace(/\//g, '-');
  const parts = cleaned.split('-').filter(Boolean);
  if (parts.length >= 3) {
    let y = parts[0];
    if (y.length === 2) y = `20${y}`;
    const m = parts[1].padStart(2, '0');
    const d = parts[2].padStart(2, '0');
    return `${y.padStart(4, '0')}-${m}-${d}`;
  }

  return asFormatted || raw;
}


function getStockTickerAliases(ticker) {
  const normalized = String(ticker || "").trim().toUpperCase();
  if (normalized === "KRW=X" || normalized === "USDKRW" || normalized === "USD/KRW" || normalized === "USD-KRW") {
    return ["KRW=X", "USDKRW", "USD/KRW", "USD-KRW"];
  }
  return [normalized];
}

async function queryStockPrices(env, ticker, startDate, endDate) {
  const aliases = getStockTickerAliases(ticker);
  const placeholders = aliases.map(() => "?").join(", ");
  const start = normalizeStockDate(startDate);
  const end = normalizeStockDate(endDate);
  const sql = "SELECT date, open, close FROM stock_prices WHERE UPPER(ticker) IN (" + placeholders + ") AND date >= ? AND date <= ? ORDER BY date ASC";
  const ranged = await env.DB.prepare(sql).bind(...aliases, start, end).all();
  if (ranged.results && ranged.results.length > 0) return ranged;

  const fallbackSql = "SELECT date, open, close FROM stock_prices WHERE UPPER(ticker) IN (" + placeholders + ") AND date <= ? ORDER BY date DESC LIMIT 1";
  const fallback = await env.DB.prepare(fallbackSql).bind(...aliases, end).all();
  if (fallback.results && fallback.results.length > 0) {
    fallback.results = fallback.results.slice().reverse();
  }
  return fallback;
}

async function queryAllStockPrices(env, ticker) {
  const aliases = getStockTickerAliases(ticker);
  const placeholders = aliases.map(() => "?").join(", ");
  const sql = "SELECT date, open, close FROM stock_prices WHERE UPPER(ticker) IN (" + placeholders + ") ORDER BY date ASC";
  return env.DB.prepare(sql).bind(...aliases).all();
}

let stockPriceDateNormalizationPromise = null;

async function normalizeStoredStockPrices(env) {
  if (stockPriceDateNormalizationPromise) return stockPriceDateNormalizationPromise;

  stockPriceDateNormalizationPromise = (async () => {
    const rows = await env.DB.prepare(
      "SELECT ticker, date, open, close FROM stock_prices"
    ).all();

    if (!rows.results || rows.results.length === 0) return;

    const statements = [];
    for (const row of rows.results) {
      const normalizedDate = normalizeStockDate(row.date);
      if (!normalizedDate || normalizedDate === row.date) continue;

      statements.push(
        env.DB.prepare(
          "INSERT OR REPLACE INTO stock_prices (ticker, date, open, close) VALUES (?, ?, ?, ?)"
        ).bind(row.ticker, normalizedDate, row.open, row.close)
      );
      statements.push(
        env.DB.prepare(
          "DELETE FROM stock_prices WHERE ticker = ? AND date = ?"
        ).bind(row.ticker, row.date)
      );
    }

    if (statements.length > 0) {
      await env.DB.batch(statements);
    }
  })().catch(err => {
    console.error("[Stock Date Normalize] failed:", err);
  }).finally(() => {
    stockPriceDateNormalizationPromise = null;
  });

  return stockPriceDateNormalizationPromise;
}

function getFridayEnd(d) {
  let date = new Date(d);
  let day = date.getDay();
  let diff = (day <= 5) ? (5 - day) : (5 + 7 - day);
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function isUSMarketHoliday(dateStr) {
  const parts = dateStr.split('-');
  const y = parseInt(parts[0]), m = parseInt(parts[1]), d = parseInt(parts[2]);
  const targetDate = new Date(y, m - 1, d);
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
  const hols = [getObs(y, 1, 1), getNth(y, 1, 1, 3), getNth(y, 2, 1, 3), getGF(y), getNth(y, 5, 1, -1), getObs(y, 6, 19), getObs(y, 7, 4), getNth(y, 9, 1, 1), getNth(y, 11, 4, 4), getObs(y, 12, 25)];
  return hols.includes(dateStr);
}

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
  for (let i = 0; i < dD.length; i++) {
    let ds = formatDateNY(dD[i]), friEnd = getFridayEnd(dD[i]), wIdx = sortedFri.indexOf(friEnd.toString());
    wRMap[ds] = { dR: (wIdx >= 1) ? wRsi[wIdx - 1] : 50, dRR: (wIdx >= 2) ? wRsi[wIdx - 2] : 50, dCurrent: wRsi[wIdx] };
  }
  return wRMap;
}

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

function fixFloat(value) {
  if (value === null || value === undefined || isNaN(value)) return 0;
  return Math.round(Number(value) * 100) / 100;
}

// === [2. 여기서부터 아래의 calculateOrderInternal 직전까지 통째로 교체합니다] ===
async function getTickerDataInternal(ticker, p1, p2, force, env, ctx) {
  await normalizeStoredStockPrices(env);
  const cacheKey = `yahoo_v2_${ticker}_${p1}_${p2}`;
  let cachedData = (!force && env.VTOTAL_KV) ? await env.VTOTAL_KV.get(cacheKey) : null;
  
  let resultJSON = null;
  if (cachedData) {
    resultJSON = JSON.parse(cachedData);
  } else {
    try {
      const padStr = (n) => String(n).padStart(2, '0');
      const getYYYYMMDD = (tsSec) => {
        const d = new Date(tsSec * 1000);
        return `${d.getUTCFullYear()}-${padStr(d.getUTCMonth() + 1)}-${padStr(d.getUTCDate())}`;
      };
      const sDateStr = getYYYYMMDD(p1);
      const eDateStr = getYYYYMMDD(Number(p2) + (86400 * 3));

      // ⭐️ 오전 6시 스케줄러가 적재해둔 DB(stock_prices)에서만 안전하게 조회합니다.
      const dbResult = await queryStockPrices(env, ticker, sDateStr, eDateStr);

      if (dbResult.results && dbResult.results.length > 0) {
        const timestamp = [];
        const open = [];
        const close = [];

        dbResult.results.forEach(row => {
          const ts = Math.floor(new Date(row.date + "T12:00:00Z").getTime() / 1000);
          timestamp.push(ts);
          open.push(Math.round(Number(row.open) * 100) / 100);
          close.push(Math.round(Number(row.close) * 100) / 100);
        });

        const lastClose = close.length > 0 ? close[close.length - 1] : 0;
        const prevClose = close.length > 1 ? close[close.length - 2] : lastClose;

        resultJSON = {
          chart: {
            result: [
              {
                meta: { 
                  ticker: ticker,
                  symbol: ticker,
                  regularMarketPrice: lastClose,
                  chartPreviousClose: prevClose
                },
                timestamp: timestamp,
                indicators: {
                  quote: [
                    {
                      open: open,
                      close: close
                    }
                  ]
                }
              }
            ],
            error: null
          }
        };

        if (env.VTOTAL_KV) {
          ctx.waitUntil(env.VTOTAL_KV.put(cacheKey, JSON.stringify(resultJSON), { expirationTtl: 1800 }));
        }
      }
    } catch (dbFallbackErr) {
      console.error("D1 DB 조회 오류:", dbFallbackErr);
    }
  }

  if (resultJSON && resultJSON.chart && resultJSON.chart.result && resultJSON.chart.result[0]) {
    const r = resultJSON.chart.result[0];
    const ts = r.timestamp || [];
    const cls = r.indicators.quote[0].close || [];
    const ops = r.indicators.quote[0].open || [];
    
    const dates = [];
    const open = [];
    const close = [];
    
    for (let i = 0; i < ts.length; i++) {
      if (cls[i] !== null && ops[i] !== null) {
        dates.push(new Date(ts[i] * 1000));
        open.push(ops[i]);
        close.push(cls[i]);
      }
    }
    return { dates, open, close };
  }
  
  throw new Error(`${ticker} 주가 데이터를 가져오는 데 실패했습니다. (DB 데이터 없음)`);
}

async function calculateOrderInternal(config, state, env, ctx, force = false) {
  const ticker = config.basics.ticker.toString().trim();
  const curStrat = config.basics.strategy || '2M3D1-1P';
  const M_STRAT = MASTER_STRATEGIES[curStrat];
  if (!M_STRAT) throw new Error(`존재하지 않는 전략입니다: ${curStrat}`);
  const cfg = M_STRAT.config;
  const MODES = M_STRAT.modes;
  
  const fBase = (parseFloat(config.basics.fBase) || 0) / 100.0;
  const fSec = (parseFloat(config.basics.fSec) || 0) / 100.0;
  const fBuy = fBase;
  
  const tierAssign = cfg.tierMethod, dLimit = cfg.dLimit, cDn3 = cfg.cDn3, cDn2 = cfg.cDn2, cDn1 = cfg.cDn1;
  const useMid1 = cfg.useMid1, useMid2 = cfg.useMid2, useMid3 = cfg.useMid3;

  const todayFixed = new Date();
  todayFixed.setHours(23, 59, 59, 999);
  const endTs = Math.floor(todayFixed.getTime() / 1000);
  const startTs = endTs - (365 * 86400);

  const [mainDataAll, qqqData] = await Promise.all([
    getTickerDataInternal(ticker, startTs, endTs, force, env, ctx),
    getTickerDataInternal("QQQ", startTs, endTs, force, env, ctx)
  ]);

  const tIdx = mainDataAll.close.length;
  if (tIdx === 0) throw new Error("주가 데이터가 비어있습니다.");

  const full_c = mainDataAll.close;
  const wRsiMap = calculateWRSI_WFRI(qqqData);

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
  const orderDateStr = (lastDateNY.getMonth() + 1) + "/" + lastDateNY.getDate();

  let rsi_m = 'SF';
  for (let wI = 0; wI < tIdx; wI++) {
    const ds = formatDateNY(mainDataAll.dates[wI]);
    const rv = wRsiMap[ds] ? wRsiMap[ds].dR : 50;
    const rrv = wRsiMap[ds] ? wRsiMap[ds].dRR : 50;
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
  let tp1_h = (full_c[tIdx - 1] - (full_c[tIdx - 2] || full_c[tIdx - 1])) / (full_c[tIdx - 2] || full_c[tIdx - 1]);
  let tp2_h = ((full_c[tIdx - 2] || full_c[tIdx - 1]) - (full_c[tIdx - 3] || full_c[tIdx - 2])) / (full_c[tIdx - 3] || full_c[tIdx - 2]);
  let tp3_h = ((full_c[tIdx - 3] || full_c[tIdx - 2]) - (full_c[tIdx - 4] || full_c[tIdx - 3])) / (full_c[tIdx - 4] || full_c[tIdx - 3]);

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

  const inv = state.holdings || [];
  let tTier = inv.length + 1;
  if (tierAssign === '최소(빈자리)' || tierAssign === '최소') {
    let used = inv.map(p_i => p_i.tier);
    tTier = 1;
    while (used.indexOf(tTier) !== -1) tTier++;
  }

  const currentW = MODES[today_m].weight[tTier - 1] || 0;
  const base = parseFloat(state.base_principal || state.base || 0);
  const cash = parseFloat(state.cash || 0);
  const tSeed = t2(Math.min(base * currentW, cash));

  const bTgtVal = MODES[today_m].buy[tTier - 1] || 0;
  const tTgt = t2(lastDataClose * (1 + bTgtVal));
  const todayBuyQty = (tTgt > 0 && currentW > 0) ? Math.floor((tSeed / (tTgt * (1 + fBuy))) + 0.0001) : 0;

  const rawOrderOutput = [];
  if (todayBuyQty > 0) {
    rawOrderOutput.push(["매수", "LOC", tTgt, todayBuyQty]);
  }

  inv.forEach(p_i => {
    let p_mode = MODES[p_i.mode] || MODES['SF'];
    let sellRate = p_mode.sell[p_i.tier - 1] || p_mode.sell[0] || 0;
    let s_tgt = c2(p_i.buy_price * (1 + sellRate));
    rawOrderOutput.push(["매도", "LOC", s_tgt, p_i.qty]);
  });

  const nextOrderInfo = { tier: tTier, mode: today_m, weight: (currentW * 100).toFixed(1), qty: todayBuyQty };

  return {
    status: "success",
    orders: rawOrderOutput,
    nextOrderInfo: nextOrderInfo,
    orderDateStr: orderDateStr,
    currentStrat: curStrat,
    inv: inv
  };
}

async function runAutoMatchingForUserSlot(userId, slotNum, configJson, env, ctx) {
  try {
    const config = JSON.parse(configJson);
    const ticker = config.basics.ticker.toString().trim();
    const curStrat = config.basics.strategy || '2M3D1-1P';
    const M_STRAT = MASTER_STRATEGIES[curStrat];
    if (!M_STRAT) return;

    const lastStateRes = await env.DB.prepare(
      "SELECT * FROM daily_states WHERE user_id = ? AND slot_num = ? ORDER BY date DESC LIMIT 1"
    ).bind(userId, slotNum).first();

    if (!lastStateRes) return;

    const lastDate = lastStateRes.date;
    let parsedState = {};
    try {
      parsedState = JSON.parse(lastStateRes.state_json);
    } catch (e) {
      console.error(`[스케줄러] state_json 파싱 실패:`, e);
      return;
    }

    const newDatesResult = await env.DB.prepare(
      "SELECT DISTINCT date FROM stock_prices WHERE ticker = ? AND date > ? ORDER BY date ASC"
    ).bind(ticker, lastDate).all();

    if (!newDatesResult.results || newDatesResult.results.length === 0) return;

    const newTradingDates = newDatesResult.results.map(r => r.date);
    console.log(`[스케줄러] User: ${userId}, Slot: ${slotNum} 에 대해 ${newTradingDates.length}일의 누락된 거래일 발견: ${newTradingDates.join(', ')}`);

    let currentCash = parseFloat(parsedState.cash || 0);
    let currentBase = parseFloat(parsedState.base_principal || parsedState.base || 0);
    let currentRealPrincipal = parseFloat(parsedState.realPrincipal || currentBase);
    let currentHoldings = (parsedState.holdings || []).map(h => ({ ...h }));
    let cumulativeInOut = parseFloat(lastStateRes.inout || 0);

    const fBase = (parseFloat(config.basics.fBase) || 0) / 100.0;
    const fSec = (parseFloat(config.basics.fSec) || 0) / 100.0;
    const fBuy = fBase;
    const fSellT = fBase + fSec;

    const cfg = M_STRAT.config;
    const MODES = M_STRAT.modes;
    const tierAssign = cfg.tierMethod, dLimit = cfg.dLimit, cDn3 = cfg.cDn3, cDn2 = cfg.cDn2, cDn1 = cfg.cDn1;
    const useMid1 = cfg.useMid1, useMid2 = cfg.useMid2, useMid3 = cfg.useMid3;

    const statements = [];

    for (let dayIdx = 0; dayIdx < newTradingDates.length; dayIdx++) {
      const dtStr = newTradingDates[dayIdx];

      const mainPrices = await env.DB.prepare(
        "SELECT date, open, close FROM stock_prices WHERE ticker = ? AND date <= ? ORDER BY date DESC LIMIT 260"
      ).bind(ticker, normalizeStockDate(dtStr)).all();

      const qqqPrices = await env.DB.prepare(
        "SELECT date, open, close FROM stock_prices WHERE ticker = 'QQQ' AND date <= ? ORDER BY date DESC LIMIT 260"
      ).bind(normalizeStockDate(dtStr)).all();

      if (!mainPrices.results || mainPrices.results.length < 5 || !qqqPrices.results || qqqPrices.results.length < 15) {
        continue;
      }

      const mainRows = mainPrices.results.reverse();
      const qqqRows = qqqPrices.results.reverse();

      const mainDataAll = {
        dates: mainRows.map(r => new Date(r.date + "T12:00:00Z")),
        open: mainRows.map(r => r.open),
        close: mainRows.map(r => r.close)
      };

      const qqqData = {
        dates: qqqRows.map(r => new Date(r.date + "T12:00:00Z")),
        open: qqqRows.map(r => r.open),
        close: qqqRows.map(r => r.close)
      };

      const tIdx = mainDataAll.close.length;
      const full_c = mainDataAll.close;
      const wRsiMap = calculateWRSI_WFRI(qqqData);

      let rsi_m = 'SF';
      for (let wI = 0; wI < tIdx - 1; wI++) {
        const ds = formatDateNY(mainDataAll.dates[wI]);
        const rv = wRsiMap[ds] ? wRsiMap[ds].dR : 50;
        const rrv = wRsiMap[ds] ? wRsiMap[ds].dRR : 50;
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

      let today_m = rsi_m;
      const lastDateDaily = mainDataAll.dates[tIdx - 2] || mainDataAll.dates[tIdx - 1];
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

      let prev = full_c[tIdx - 2] || full_c[tIdx - 1];
      let tp1_h = (full_c[tIdx - 2] - (full_c[tIdx - 3] || full_c[tIdx - 2])) / (full_c[tIdx - 3] || full_c[tIdx - 2]);
      let tp2_h = ((full_c[tIdx - 3] || full_c[tIdx - 2]) - (full_c[tIdx - 4] || full_c[tIdx - 3])) / (full_c[tIdx - 4] || full_c[tIdx - 3]);
      let tp3_h = ((full_c[tIdx - 4] || full_c[tIdx - 3]) - (full_c[tIdx - 5] || full_c[tIdx - 4])) / (full_c[tIdx - 5] || full_c[tIdx - 4]);

      if (tIdx >= 6) {
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

      let close = full_c[tIdx - 1];

      let tTier = currentHoldings.length + 1;
      if (tierAssign === '최소(빈자리)' || tierAssign === '최소') {
        let used = currentHoldings.map(p => p.tier);
        tTier = 1;
        while (used.indexOf(tTier) !== -1) tTier++;
      }

      let b_qty = 0, b_tgt = 0, seed = 0.0;
      if (MODES[today_m] && tTier <= MODES[today_m].weight.length) {
        let w_val = MODES[today_m].weight[tTier - 1];
        seed = t2(Math.min(currentBase * w_val, currentCash));
        b_tgt = t2(prev * (1 + MODES[today_m].buy[tTier - 1]));
        if (b_tgt > 0 && close <= b_tgt) {
          b_qty = Math.floor(seed / (b_tgt * (1 + fBuy)) + 0.0001);
        }
      }

      let d_cf = 0.0, d_pl = 0.0, nextHoldings = [];
      let evalVal = t2(currentHoldings.reduce((s, p) => s + p.qty, 0) * close);

      for (let p_idx = 0; p_idx < currentHoldings.length; p_idx++) {
        let p_inv = currentHoldings[p_idx];
        p_inv.days++;
        let p_mode = MODES[p_inv.mode];
        if (!p_mode) { nextHoldings.push(p_inv); continue; }
        let tIdxTier = Math.min(p_inv.tier - 1, p_mode.sell.length - 1);
        let sellRate = p_mode.sell[tIdxTier] || 0;
        let s_tgt = c2(p_inv.buy_price * (1 + sellRate));
        let hIdx = Math.min(p_inv.tier - 1, p_mode.hold.length - 1);
        let h_limit = p_mode.hold[hIdx] || 1;

        if (close >= s_tgt || p_inv.days >= h_limit) {
          let net = (p_inv.qty * close) * (1 - fSellT);
          let trade_pl = net - p_inv.cost;
          d_cf += net;
          d_pl += trade_pl;

          const tradeId = `${userId}_${slotNum}_${p_inv.buyDate}_${dtStr}_${p_inv.qty}`;
          statements.push(
            env.DB.prepare(
              "INSERT OR REPLACE INTO trade_history (id, user_id, slot_num, buy_date, sell_date, mode, tier, buy_price, sell_price, qty, profit, total_balance, renew_cash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            ).bind(
              tradeId, userId, slotNum, p_inv.buyDate, dtStr, p_inv.mode, p_inv.tier,
              fixFloat(p_inv.buy_price), fixFloat(close), fixFloat(p_inv.qty), fixFloat(trade_pl), fixFloat(currentCash + d_cf + evalVal), fixFloat(currentBase)
            )
          );
        } else {
          nextHoldings.push(p_inv);
        }
      }

      currentHoldings = nextHoldings;

      if (b_qty > 0) {
        let totalBC = (b_qty * close) * (1 + fBuy);
        if (totalBC <= currentCash) {
          d_cf -= totalBC;
          currentHoldings.push({
            buy_price: close,
            qty: b_qty,
            cost: fixFloat(totalBC),
            mode: today_m,
            tier: tTier,
            days: 0,
            buyDate: dtStr
          });
        }
      }

      currentCash = t2(currentCash + d_cf);
      let pl_f = t2_pl(d_pl);

      if (pl_f > 0) {
        currentBase += pl_f * cfg.compR;
      } else if (pl_f < 0) {
        currentBase += pl_f * cfg.lossR;
      }
      currentBase = t2(currentBase);

      evalVal = t2(currentHoldings.reduce((s, p) => s + p.qty, 0) * close);
      let totalBalance = t2(currentCash + evalVal);

      const stateJson = JSON.stringify({
        cash: fixFloat(currentCash),
        base_principal: fixFloat(currentBase),
        realPrincipal: fixFloat(currentRealPrincipal),
        holdings: currentHoldings
      });

      statements.push(
        env.DB.prepare(
          "INSERT OR REPLACE INTO daily_states (user_id, slot_num, date, asset, inout, state_json) VALUES (?, ?, ?, ?, ?, ?)"
        ).bind(userId, slotNum, dtStr, totalBalance, cumulativeInOut, stateJson)
      );
    }

    if (statements.length > 0) {
      const batchSize = 50;
      for (let i = 0; i < statements.length; i += batchSize) {
        await env.DB.batch(statements.slice(i, i + batchSize));
      }
      console.log(`[스케줄러] User: ${userId}, Slot: ${slotNum}의 자산 로그 및 매매 일지 ${newTradingDates.length}일치 갱신 완료`);
    }

  } catch (err) {
    console.error(`[스케줄러] User: ${userId}, Slot: ${slotNum} 자동 매칭 연산 실패:`, err);
  }
}

async function runAutoMatchingForAllUsers(env, ctx) {
  try {
    const activeSlots = await env.DB.prepare(
      "SELECT user_id, slot_num, config_json FROM user_configs"
    ).all();

    if (activeSlots.results && activeSlots.results.length > 0) {
      console.log(`[스케줄러] 총 ${activeSlots.results.length}개의 활성 유저 슬롯 자동 체결 매칭 가동`);
      const tasks = activeSlots.results.map(row => 
        runAutoMatchingForUserSlot(row.user_id, row.slot_num, row.config_json, env, ctx)
      );
      await Promise.all(tasks);
      console.log(`[스케줄러] 모든 활성 유저 슬롯 자동 체결 판정 완료!`);
    }
  } catch (err) {
    console.error("[스케줄러] 전체 유저 자동 체결 매칭 중 심각한 오류 발생:", err);
  }
}

export default {

  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // 🛡️ CORS 헤더 설정
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // 📈 1-0. 신규: 실시간 주문표 계산 API (POST /api/calculate-order)
      if (url.pathname === "/api/calculate-order" && request.method === "POST") {
        const body = await request.json();
        let config = body.config;
        let state = body.state;
        const userId = body.id;
        const slot = body.slot;

        if ((!config || !state) && userId && slot) {
          const [configRow, stateRow] = await Promise.all([
            env.DB.prepare("SELECT config_json FROM user_configs WHERE user_id = ? AND slot_num = ?").bind(userId, slot).first(),
            env.DB.prepare("SELECT state_json FROM daily_states WHERE user_id = ? AND slot_num = ? ORDER BY date DESC LIMIT 1").bind(userId, slot).first()
          ]);

          if (configRow) {
            config = JSON.parse(configRow.config_json);
          }
          if (stateRow) {
            state = JSON.parse(stateRow.state_json);
          }
        }

        if (!config || !state) {
          return new Response(JSON.stringify({ error: "계산에 필요한 설정 또는 자산 상태 정보가 없습니다." }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }

        try {
          const result = await calculateOrderInternal(config, state, env, ctx, false);
          return new Response(JSON.stringify(result), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        } catch (err) {
          console.error("주문표 계산 API 오류:", err);
          return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
      }
// 📈 1. 야후 파이낸스 주가 수집 프록시 API (기존 Vercel 기능 고속 흡수)
      if (url.pathname === "/api/prices" && url.searchParams.get("symbols")) {
        const symbols = url.searchParams.get("symbols").split(",").map(s => s.trim()).filter(Boolean);
        const p1 = url.searchParams.get("p1");
        const p2 = url.searchParams.get("p2");
        const force = url.searchParams.get("force") === "true";

        if (symbols.length === 0 || !p1 || !p2) {
          return new Response(JSON.stringify({ error: "필수 파라미터가 누락되었습니다." }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }

        const entries = await Promise.all(symbols.map(async (symbol) => {
          try {
            const data = await getTickerDataInternal(symbol, p1, p2, force, env, ctx);
            const timestamp = data.dates.map(d => Math.floor(d.getTime() / 1000));
            const lastClose = data.close.length > 0 ? data.close[data.close.length - 1] : 0;
            const prevClose = data.close.length > 1 ? data.close[data.close.length - 2] : lastClose;
            return [symbol, {
              chart: {
                result: [{
                  meta: { ticker: symbol, symbol: symbol, regularMarketPrice: lastClose, chartPreviousClose: prevClose },
                  timestamp: timestamp,
                  indicators: { quote: [{ open: data.open, close: data.close }] }
                }],
                error: null
              }
            }];
          } catch (err) {
            return [symbol, { error: err.message }];
          }
        }));

        const result = Object.fromEntries(entries);
        return new Response(JSON.stringify({ result: result }), {
          headers: { "Content-Type": "application/json", "X-Cache": "HIT-DB-BATCH", ...corsHeaders }
        });
      }

      if (url.pathname === "/api/yahoo" || url.pathname === "/api/prices") {
        const ticker = url.searchParams.get("t");
        const p1 = url.searchParams.get("p1");
        const p2 = url.searchParams.get("p2");
        const force = url.searchParams.get("force") === "true";

        if (!ticker || !p1 || !p2) {
          return new Response(JSON.stringify({ error: "필수 파라미터가 누락되었습니다." }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }

        try {
          // DB에서 정상적으로 272.5가 포함된 배열을 꺼내옵니다.
          const data = await getTickerDataInternal(ticker, p1, p2, force, env, ctx);
          const timestamp = data.dates.map(d => Math.floor(d.getTime() / 1000));
          
          // ⭐️ [핵심 수정] 프론트엔드로 데이터를 쏴주기 직전, 배열 맨 끝에 있는 272.5를 빼서 청산가로 세팅!
          const lastClose = data.close.length > 0 ? data.close[data.close.length - 1] : 0;
          const prevClose = data.close.length > 1 ? data.close[data.close.length - 2] : lastClose;

          const mockResult = {
            chart: {
              result: [
                {
                  meta: { 
                    ticker: ticker,
                    symbol: ticker,
                    regularMarketPrice: lastClose, // <- 스크립트가 애타게 찾던 금일 청산가 272.5
                    chartPreviousClose: prevClose
                  },
                  timestamp: timestamp,
                  indicators: {
                    quote: [
                      {
                        open: data.open,
                        close: data.close
                      }
                    ]
                  }
                }
              ],
              error: null
            }
          };
          return new Response(JSON.stringify(mockResult), {
            headers: { "Content-Type": "application/json", "X-Cache": "HIT-DB-DIRECT", ...corsHeaders }
          });
        } catch (err) {
          const status = String(err.message || "").includes("DB 데이터 없음") ? 404 : 502;
          return new Response(JSON.stringify({ error: err.message }), {
            status: status,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
      }
      // 📈 1-1. 주가 수동 업데이트 API (단일/대량 복수 등록 대응 및 KV 캐시 즉시 리셋)
      if (url.pathname === "/api/update-price" && request.method === "POST") {
        const body = await request.json();
        const items = Array.isArray(body) ? body : [body];

        if (items.length === 0) {
          return new Response(JSON.stringify({ error: "데이터가 비어있습니다." }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }

        const statements = [];
        const tickersToClear = new Set();

        for (const item of items) {
          const { ticker, date, open, close } = item;
          if (!ticker || !date || open === undefined || close === undefined) {
            return new Response(JSON.stringify({ error: "필수 파라미터가 누락되었습니다." }), {
              status: 400,
              headers: { "Content-Type": "application/json", ...corsHeaders }
            });
          }
          statements.push(
            env.DB.prepare("INSERT OR REPLACE INTO stock_prices (ticker, date, open, close) VALUES (?, ?, ?, ?)")
              .bind(ticker, normalizeStockDate(date), Math.round(Number(open) * 100) / 100, Math.round(Number(close) * 100) / 100)
          );
          tickersToClear.add(ticker);
        }

        if (statements.length > 0) {
          await env.DB.batch(statements);
        }

        // KV 캐시 무효화
        if (env.VTOTAL_KV) {
          for (const ticker of tickersToClear) {
            try {
              const list = await env.VTOTAL_KV.list({ prefix: `yahoo_${ticker}` });
              for (const key of list.keys) {
                await env.VTOTAL_KV.delete(key.name);
              }
              console.log(`[KV 캐시 무효화 완료] ${ticker} 관련 캐시 ${list.keys.length}건 삭제`);
            } catch (kvErr) {
              console.error(`KV 캐시 무효화 실패 (${ticker}):`, kvErr);
            }
          }
        }

        return new Response(JSON.stringify({ status: "success", message: `주가 수동 업데이트 완료: ${items.length}건` }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      // 🗑️ 임시 TESTUSER 데이터 삭제 API
      if (url.pathname === "/api/delete-testuser") {
        await env.DB.prepare("DELETE FROM user_configs WHERE LOWER(user_id) = 'testuser'").run();
        await env.DB.prepare("DELETE FROM daily_states WHERE LOWER(user_id) = 'testuser'").run();
        await env.DB.prepare("DELETE FROM trade_history WHERE LOWER(user_id) = 'testuser'").run();
        return new Response(JSON.stringify({ status: "success", message: "All testUser records deleted from D1 Database!" }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      // 🔧 DB 주가 소수점 2자리 일괄 반올림 (기존 데이터 정리용 API)
      if (url.pathname === "/api/fix-decimals") {
        await env.DB.prepare("UPDATE stock_prices SET open = ROUND(open, 2), close = ROUND(close, 2)").run();
        return new Response(JSON.stringify({ status: "success", message: "DB 기존 데이터 소수점 2자리 반올림 완료!" }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      // 1-2. DB 주가 데이터 확인 API
      if (url.pathname === "/api/init-history") {
        const ticker = url.searchParams.get("t");
        if (!ticker) {
          return new Response(JSON.stringify({ error: "t (ticker) 파라미터가 필요합니다." }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }

        try {
          const rows = await queryAllStockPrices(env, ticker);

          if (!rows.results || rows.results.length === 0) {
            return new Response(JSON.stringify({ error: "DB에 저장된 주가 데이터가 없습니다." }), {
              status: 404,
              headers: { "Content-Type": "application/json", ...corsHeaders }
            });
          }

          const first = rows.results[0].date;
          const last = rows.results[rows.results.length - 1].date;
          return new Response(JSON.stringify({
            status: "success",
            message: `${ticker} DB 주가 데이터 조회 성공`,
            count: rows.results.length,
            firstDate: first,
            lastDate: last
          }), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });

        } catch (err) {
          return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
      }

      // 🔄 2. 에지 데이터 초고속 동기화 API (D1에서 밀리초 단위 복원)
      if (url.pathname === "/api/sync" && request.method === "GET") {
        const userId = url.searchParams.get("id");
        if (!userId) {
          return new Response(JSON.stringify({ error: "User ID가 누락되었습니다." }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }

        // D1에서 유저의 활성화된 설정 및 일별 자산 로그 데이터 쿼리
        const [configRows, stateRows, tradeRows] = await Promise.all([
          env.DB.prepare("SELECT * FROM user_configs WHERE user_id = ?").bind(userId).all(),
          env.DB.prepare("SELECT * FROM daily_states WHERE user_id = ? ORDER BY date ASC").bind(userId).all(),
          env.DB.prepare("SELECT * FROM trade_history WHERE user_id = ? ORDER BY buy_date ASC").bind(userId).all()
        ]);

        const result = {
          status: "success",
          configs: configRows.results || [],
          states: stateRows.results || [],
          trades: tradeRows.results || []
        };

        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      // 💾 3. 에지 데이터 저장 및 비동기 시트 백업 API (ctx.waitUntil 기술의 꽃)
      if (url.pathname === "/api/save" && request.method === "POST") {
        const body = await request.json();
        const { id, slot, config, states, trades, gasUrl } = body;

        if (!id || !slot) {
          return new Response(JSON.stringify({ error: "필수 파라미터가 누락되었습니다." }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }

        // 1. 에지 DB (D1)에 설정값 실시간 업서트 (Upsert) 또는 삭제 (Delete)
        if (config) {
          const configJson = JSON.stringify(config);
          await env.DB.prepare(
            "INSERT OR REPLACE INTO user_configs (user_id, slot_num, ticker, strategy, config_json) VALUES (?, ?, ?, ?, ?)"
          )
          .bind(id, slot, config.basics?.ticker || "", config.basics?.strategy || "", configJson)
          .run();
        } else {
          // config가 null인 경우 해당 슬롯 비활성화(삭제)를 의미하므로 관련된 모든 테이블에서 해당 슬롯 데이터 삭제
          await env.DB.prepare("DELETE FROM user_configs WHERE user_id = ? AND slot_num = ?").bind(id, slot).run();
          await env.DB.prepare("DELETE FROM daily_states WHERE user_id = ? AND slot_num = ?").bind(id, slot).run();
          await env.DB.prepare("DELETE FROM trade_history WHERE user_id = ? AND slot_num = ?").bind(id, slot).run();
          
          // 삭제 완료 후 즉시 응답 반환 (더 이상 저장할 상태나 매매 내역이 없으므로)
          const okResponse = new Response(JSON.stringify({ status: "success", message: "Edge DB 슬롯 데이터 삭제 완료!" }), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
          
          if (gasUrl) {
            ctx.waitUntil(backupToGoogleSheets(gasUrl, id, slot, config, states));
          }
          return okResponse;
        }

        // 2. 에지 DB (D1)에 일별 누적 자산 로그들 일괄 등록
        const chunkSize = 50;
        console.log(`🗂️ Saving ${states ? states.length : 0} daily states in chunks of ${chunkSize}`);
        if (states && states.length > 0) {
          // ⭐️ [극강의 안정성] D1 Batch Limit 에러 방지를 위해 50개씩 쪼개어 청크 단위로 안전하게 삽입합니다!
          const statements = states.map(s => {
            let parsed = s || {};
            if (s.json && typeof s.json === 'string') {
              try { 
                const temp = JSON.parse(s.json); 
                if (temp && typeof temp === 'object') parsed = temp;
              } catch(e) {}
            }
            const stateJson = JSON.stringify({
              cash: Math.round((Number(parsed.cash) || 0) * 100) / 100,
              base_principal: Math.round((Number(parsed.base_principal || parsed.base) || 0) * 100) / 100,
              realPrincipal: Math.round((Number(parsed.realPrincipal) || 0) * 100) / 100,
              holdings: parsed.holdings || []
            });
            return env.DB.prepare(
              "INSERT OR REPLACE INTO daily_states (user_id, slot_num, date, asset, inout, state_json) VALUES (?, ?, ?, ?, ?, ?)"
            ).bind(id, slot, s.date, Math.round((Number(s.asset) || 0) * 100) / 100, Math.round((Number(s.inout) || 0) * 100) / 100, stateJson);
          });
          
          const chunkSize = 50;
          for (let i = 0; i < statements.length; i += chunkSize) {
            await env.DB.batch(statements.slice(i, i + chunkSize));
          }
        }

        // 3. 에지 DB (D1)에 매매 기록 업서트
        if (trades && trades.length > 0) {
          const statements = [];
          
          // ⭐️ [중복 데이터 방지] 저장 시 기존 매매 내역을 먼저 싹 비우고, 전달받은 정확한 역산 내역으로 새로 채웁니다.
          statements.push(
            env.DB.prepare("DELETE FROM trade_history WHERE user_id = ? AND slot_num = ?").bind(id, slot)
          );

          trades.forEach(t => {
            const tradeId = `${id}_${slot}_${t.buyDate}_${t.sellDate}_${t.qty}`;
            statements.push(
              env.DB.prepare(
                "INSERT OR REPLACE INTO trade_history (id, user_id, slot_num, buy_date, sell_date, mode, tier, buy_price, sell_price, qty, profit, total_balance, renew_cash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
              ).bind(
                tradeId, id, slot, t.buyDate, t.sellDate, t.mode, t.tier, 
                Math.round((Number(t.buyPrice || t.buy_price) || 0) * 100) / 100, 
                Math.round((Number(t.sellPrice || t.sell_price) || 0) * 100) / 100, 
                Math.round((Number(t.qty) || 0) * 100) / 100, 
                Math.round((Number(t.profit) || 0) * 100) / 100, 
                Math.round((Number(t.totalBalance) || 0) * 100) / 100, 
                Math.round((Number(t.renewCash) || 0) * 100) / 100
              )
            );
          });

          const chunkSize = 50;
          for (let i = 0; i < statements.length; i += chunkSize) {
            await env.DB.batch(statements.slice(i, i + chunkSize));
          }
        }

        // 🚨 [에지 캐싱의 혁신]: 사용자에게 즉시 응답을 전송하여 '로딩 프리' 구현 (0.05초 소요)
        const okResponse = new Response(JSON.stringify({ status: "success", message: "Edge DB 저장 완료! 시트 백업이 백그라운드에서 실행됩니다." }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });

        // 4. 구글 시트로 비동기 백업 큐 전송 (클라이언트 응답 전송 후 백그라운드 백로그 처리!)
        if (gasUrl) {
          ctx.waitUntil(
            backupToGoogleSheets(gasUrl, id, slot, config, states)
          );
        }

        return okResponse;
      }

      return new Response(JSON.stringify({ error: "경로를 찾을 수 없습니다." }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });

    } catch (e) {
      const errMsg = e.message || "";
      // 🛡️ D1 데이터베이스 테이블 자동 복구 및 자가 치유(Self-Healing) 마이그레이션 엔진
      if (errMsg.includes("no such table") && env.DB) {
        try {
          console.log("[Auto-Migration] 'no such table' detected. Creating D1 Tables...");
          
          await env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS user_configs (
              user_id TEXT NOT NULL,
              slot_num INTEGER NOT NULL,
              ticker TEXT DEFAULT '',
              strategy TEXT DEFAULT '',
              config_json TEXT NOT NULL,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (user_id, slot_num)
            )
          `).run();
          
          await env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS daily_states (
              user_id TEXT NOT NULL,
              slot_num INTEGER NOT NULL,
              date TEXT NOT NULL,
              asset REAL NOT NULL,
              inout REAL DEFAULT 0.0,
              state_json TEXT NOT NULL,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (user_id, slot_num, date)
            )
          `).run();
          
          await env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS trade_history (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              slot_num INTEGER NOT NULL,
              buy_date TEXT NOT NULL,
              sell_date TEXT NOT NULL,
              mode TEXT NOT NULL,
              tier INTEGER NOT NULL,
              buy_price REAL NOT NULL,
              sell_price REAL NOT NULL,
              qty REAL NOT NULL,
              profit REAL NOT NULL,
              total_balance REAL NOT NULL,
              renew_cash REAL NOT NULL
            )
          `).run();

          await env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS stock_prices (
              ticker TEXT NOT NULL,
              date TEXT NOT NULL,
              open REAL NOT NULL,
              close REAL NOT NULL,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (ticker, date)
            )
          `).run();
          
          await env.DB.prepare(`
            CREATE INDEX IF NOT EXISTS idx_daily_states_query ON daily_states(user_id, slot_num, date)
          `).run();
          
          await env.DB.prepare(`
            CREATE INDEX IF NOT EXISTS idx_trade_history_query ON trade_history(user_id, slot_num)
          `).run();
          
          console.log("[Auto-Migration] All D1 tables and indexes created successfully!");
          
          return new Response(JSON.stringify({ 
            status: "success", 
            message: "D1 데이터베이스 테이블이 자동 생성되었습니다! 새로고침하여 동기화를 진행해 주세요." 
          }), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        } catch (initErr) {
          console.error("[Auto-Migration Failed]", initErr);
          return new Response(JSON.stringify({ 
            error: `Auto-Migration failed: ${initErr.message}. Original error: ${errMsg}` 
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
      }

      return new Response(JSON.stringify({ error: errMsg }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  },
  async scheduled(controller, env, ctx) {
    // 주가와 환율은 Cloudflare DB에 저장된 값을 사용한다.
    const runAll = async () => {
      await runAutoMatchingForAllUsers(env, ctx);
    };
    ctx.waitUntil(runAll());
  }
};

/**
 * 큐 동기화 전용 구글 시트 백그라운드 백업 헬퍼 함수
 */
async function backupToGoogleSheets(gasUrl, id, slot, config, states) {
  try {
    console.log(`[시트 백업 스케줄러 실행] User: ${id}, Slot: ${slot}`);
    
    // 시트 구조 규격에 맞게 포맷팅
    // 기존 시트는 C열에 자산, D열에 입출금(증액/감액) 기록, E열에 상태 백업 JSON을 저장함
    const sheetLogs = (states || []).map(s => {
      const stateObj = typeof s.json === 'string' ? JSON.parse(s.json) : s;
      return [
        s.date,
        s.asset,
        0.0,
        JSON.stringify({
          cash: stateObj.cash,
          base_principal: stateObj.base_principal || stateObj.base,
          realPrincipal: stateObj.realPrincipal,
          holdings: stateObj.holdings || []
        })
      ];
    });

    const payload = {
      action: "BACKUP_AND_SAVE_V4",
      id: id,
      logs: sheetLogs,
      // 백업 시에는 다른 슬롯 설정을 간섭하지 않도록 단일 슬롯 단위 동기화로 구조 단순화
      [`params${slot === 1 ? '' : slot}`]: config
    };

    const response = await fetch(gasUrl, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      console.log(`[시트 백업 완료] User: ${id}, Slot: ${slot} 백그라운드 저장 완료`);
    } else {
      console.warn(`[시트 백업 경고] 서버 응답 오류: ${response.statusText}`);
    }
  } catch (err) {
    console.error(`[시트 백업 실패] 네트워크 오류:`, err);
  }
}
