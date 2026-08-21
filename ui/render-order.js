// ── 주문표 실시간 증권사/VM 예약 상태 관리 ──
window.orderStatusCache = window.orderStatusCache || {
  vmSaved: false,
  vmOrders: [],
  unfilledOrders: [],
  filledOrders: [],
  brokerOrdersChecked: false,
  lastUpdated: 0
};

let _roscInFlight = null;
async function refreshOrderStatusCache(force = false) {
  if (force && window.orderStatusCache) {
    window.orderStatusCache.lastUpdated = 0;
  }
  // ⚠️ 30초 이내 재호출 시 네트워크 요청 없이 반환 (pending/unfilled 중복 방지)
  const now = Date.now();
  if (!force && window.orderStatusCache.lastUpdated && now - window.orderStatusCache.lastUpdated < 30000) {
    return;
  }
  // inflight 중복 방지: 이미 진행 중이면 그 Promise를 공유
  if (_roscInFlight) return _roscInFlight;
  _roscInFlight = _refreshOrderStatusCacheInner(force);
  try { await _roscInFlight; } finally { _roscInFlight = null; }
}
async function _refreshOrderStatusCacheInner(force) {
  try {
    const userId = window.myUserId || localStorage.getItem('vtotal3_id') || '';
    if (!userId) return;

    window.orderStatusCache.lastUpdated = Date.now();
    window.orderStatusCache.brokerOrdersChecked = false;
    window.__forceOrderViewReRender = true;

    const BS = window.BrokerService;
    const BR = window.BrokerReconcile;
    const activeBr = (BS && typeof BS.activeBroker === 'string' && BS.activeBroker.length > 1) ? BS.activeBroker : 'kiwoom';
    const phase = typeof nyMarketPhaseForOrderCompare === 'function' ? nyMarketPhaseForOrderCompare() : 'reserved';
    const shouldCheckBroker = phase === 'order' || phase === 'closed' || force;

    // 1. VM 예약 주문 (가장 먼저 가볍게 조회)
    if (BS && typeof BS.fetchPendingOrders === 'function') {
      try {
        const resP = await BS.fetchPendingOrders();
        if (resP && resP.ok) {
          window.orderStatusCache.vmOrders = Array.isArray(resP.orders) ? resP.orders : [];
          window.orderStatusCache.vmSaved = window.orderStatusCache.vmOrders.length > 0;
          window.orderStatusCache.vmOverdue = !!(resP.backtest && resP.backtest.overdue);
          if (typeof window.refreshOrderViewUI === 'function') window.refreshOrderViewUI();
        }
      } catch (e) {}
    }

    // 2. 증권사 데이터 조회 (예약 시간대에는 불필요한 미체결/체결 조회를 생략하여 네트워크 낭비 및 지연 방지)
    const brokerTasks = [];

    if (shouldCheckBroker) {
      if (BS && typeof BS.fetchUnfilledOrders === 'function') {
        brokerTasks.push(
          BS.fetchUnfilledOrders(activeBr).then(res1 => {
            if (res1 && res1.success && Array.isArray(res1.unfilled)) {
              window.orderStatusCache.unfilledOrders = res1.unfilled;
            }
          }).catch(() => {})
        );
      }

      const fetchFillsTask = async () => {
        let resFills = null;
        if (BR && typeof BR.getFills === 'function') resFills = await BR.getFills(activeBr);
        else if (BS && typeof BS.fetchOverseasFills === 'function') resFills = await BS.fetchOverseasFills(activeBr);
        if (resFills && resFills.success !== false) {
          const list = Array.isArray(resFills.executions) ? resFills.executions : (Array.isArray(resFills.rows) ? resFills.rows : []);
          if (list) window.orderStatusCache.filledOrders = list;
        }
      };
      brokerTasks.push(fetchFillsTask().catch(() => {}));
    }

    // 잔고 조회
    const fetchBalTask = async () => {
      let resBal = null;
      if (BR && typeof BR.getBalance === 'function') resBal = await BR.getBalance(activeBr);
      else if (BS && typeof BS.fetchOverseasBalance === 'function') resBal = await BS.fetchOverseasBalance(activeBr);
      if (resBal && resBal.success !== false) {
        window.orderStatusCache.balance = resBal;
        if (typeof window.UI !== 'undefined' && window.UI.stats && typeof window.UI.stats.refreshStatsTable === 'function') {
          window.UI.stats.refreshStatsTable();
        }
      }
    };
    brokerTasks.push(fetchBalTask().catch(() => {}));

    if (brokerTasks.length > 0) {
      await Promise.all(brokerTasks);
    }

    window.orderStatusCache.brokerOrdersChecked = true;
    window.orderStatusCache.lastPhase = phase;
    if (typeof window.refreshOrderViewUI === 'function') window.refreshOrderViewUI();

  } catch(e) {}
}
window.refreshOrderStatusCache = refreshOrderStatusCache;

// 오늘의 뉴욕 거래일(YYYY-MM-DD). 체결내역은 여러 날치를 받아오므로
// 반드시 당일분만 걸러야 한다 — 안 그러면 며칠 전 체결이 오늘 주문 행을
// "(체결)"로 물들인다(2026-07-29 증상: 매수 전부 체결, 매도 전부 예약).
function nyTodayStr() {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date());
  return p; // en-CA → YYYY-MM-DD
}

// 주문표가 겨냥하는 거래일(YYYY-MM-DD).
// ⚠️ "오늘"이 아니다. 주문표는 마감 후 만들어져 **다음 세션**을 겨냥한다.
//    오늘 날짜로 체결을 대조하면, 방금 마감된 세션의 체결이 아직 내지도 않은
//    다음 세션 주문에 (체결)로 붙는다(2026-07-29 실제 증상: LOC매수가 체결로 표시).
// window.currentOrderDate 는 엔진이 준 "M/D" 문자열(render-order.js에서 세팅).
function orderTableDateStr() {
  const raw = String(window.currentOrderDate || "").replace(/\s*\(.*$/, "").trim();
  const m = raw.match(/(\d{1,2})\s*\/\s*(\d{1,2})/);
  if (!m) return "";
  const today = nyTodayStr();                 // YYYY-MM-DD
  const year = Number(today.slice(0, 4));
  const mm = String(m[1]).padStart(2, "0");
  const dd = String(m[2]).padStart(2, "0");
  let cand = `${year}-${mm}-${dd}`;
  // 연말·연초 경계 보정: 대상일이 오늘보다 반년 이상 과거로 보이면 다음 해다.
  if (cand < today && (new Date(today) - new Date(cand)) / 86400000 > 180) {
    cand = `${year + 1}-${mm}-${dd}`;
  }
  return cand;
}

function nyMarketPhaseForOrderCompare() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", hour12: false, hour: "2-digit", minute: "2-digit"
  }).formatToParts(new Date());
  const hh = Number((parts.find(p => p.type === "hour") || {}).value || 0) % 24;
  const mm = Number((parts.find(p => p.type === "minute") || {}).value || 0);
  const mins = hh * 60 + mm;

  // 1. 주문/장중 시간: VM 주문 후 ~ 장 마감 전 (09:20 ~ 16:00 ET)
  if (mins >= 9 * 60 + 20 && mins < 16 * 60) return "order";

  // 2. 장마감 후 ~ 주문표 생성 전 공백기 (16:00 ~ 17:00 ET): 체결 대조
  if (mins >= 16 * 60 && mins < 17 * 60) return "closed";

  // 3. 예약 시간: VM 주문표 생성 후 ~ VM 주문 전 (17:00 ~ 익일 09:20 ET)
  return "reserved";
}

function shouldCompareBrokerOrdersNow() {
  const phase = nyMarketPhaseForOrderCompare();
  return phase === "order" || phase === "closed";
}

function todayStrForTimeZone(timeZone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date());
}

function brokerCompareDateSet() {
  return new Set([orderTableDateStr(), nyTodayStr(), todayStrForTimeZone("Asia/Seoul")].filter(Boolean));
}

function normalizeOrderSide(value) {
  const s = String(value || "").toLowerCase();
  if (s.includes("buy") || s.includes("매수") || s === "02" || s === "2") return "buy";
  if (s.includes("sell") || s.includes("매도") || s === "01" || s === "1") return "sell";
  return "";
}

function normalizeOrderType(value) {
  const s = String(value || "").toUpperCase().trim();
  if (s.includes("MOC") || s === "33" || s === "M4") return "MOC";
  if (s.includes("LOC") || s === "30" || s === "M2" || s === "00") return "LOC";
  if (s === "03" || s === "M1" || s === "M3") return "MKT";
  return "";
}

function normalizeBrokerOrderDate(row) {
  if (!row) return "";
  if (window.BrokerReconcile && typeof window.BrokerReconcile.normalizeMarketDate === "function") {
    const d = window.BrokerReconcile.normalizeMarketDate(row);
    if (d) return d;
  }
  const raw = row.marketDate || row.date || row.orderDate || row.ordDate || row.trdDate || row.time || row.timestamp || "";
  const digits = String(raw).replace(/[^0-9]/g, "");
  if (digits.length >= 8) return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  return "";
}

function brokerOrderSymbol(row) {
  return String(row?.symbol || row?.ticker || row?.stk_cd || row?.stockCode || row?.code || row?.IsuNo || row?.ShtnIsuNo || "").toUpperCase();
}

function brokerOrderQty(row) {
  return Math.abs(Number(row?.qty ?? row?.filledQty ?? row?.unfilledQty ?? row?.remainingQty ?? row?.orderQty ?? row?.ordQty ?? row?.OrdQty ?? row?.ExecQty ?? row?.cntr_qty ?? row?.ord_qty ?? row?.rmn_qty ?? 0) || 0);
}

function brokerOrderPrice(row) {
  return Math.round(Math.abs(Number(row?.orderPrice ?? row?.ordPrice ?? row?.limitPrice ?? row?.price ?? row?.filledPrice ?? row?.ord_uv ?? row?.cntr_uv ?? row?.OvrsOrdPrc ?? row?.ExecPrc ?? 0) || 0) * 100) / 100;
}

function getBrokerOrderMatchMarkup(order, slotNum) {
  const cache = window.orderStatusCache || {};
  const currentPhase = typeof nyMarketPhaseForOrderCompare === 'function' ? nyMarketPhaseForOrderCompare() : 'unknown';
  
  if (!cache.lastPhase) {
    return '<span style="color:#f59e0b; font-size:9px; font-weight:800;" title="최초 데이터 조회 중">확인중</span>';
  }

  const side = normalizeOrderSide(order[0]);
  const ordType = String(order[1] || '').toUpperCase() === 'MOC' ? 'MOC' : 'LOC';
  const price = Math.round((parseFloat(order[2]) || 0) * 100) / 100;
  const qty = parseInt(order[3], 10) || 0;
  const symbol = String(order[4] || '').toUpperCase() || getSoleActiveTicker();
  const compareDates = brokerCompareDateSet();
  const activeBr = window.BrokerService ? window.BrokerService.activeBroker : 'kiwoom';

  const unfilled = Array.isArray(cache.unfilledOrders) ? cache.unfilledOrders : [];
  const fills = Array.isArray(cache.filledOrders) ? cache.filledOrders : [];

  const filterRow = (row) => {
    if (!row) return false;
    if (row.broker && String(row.broker).toLowerCase() !== activeBr) return false;
    const rowSym = brokerOrderSymbol(row);
    if (symbol && rowSym && rowSym !== symbol) return false;
    const rowDate = normalizeBrokerOrderDate(row);
    if (rowDate && compareDates.size > 0 && !compareDates.has(rowDate)) return false;
    return true;
  };

  const activeUnfilled = unfilled.filter(filterRow);
  const activeFilled = fills.filter(filterRow);

  // ⭐️ 1. 체결시간대 (16:00 ~ 17:00 ET / 한국 05:00 ~ 06:00):
  if (currentPhase === 'closed') {
    if (side === 'buy') {
      const filledBuyQty = activeFilled.reduce((sum, f) => {
        const s = String(f.side || '').toUpperCase();
        return sum + (s.includes('BUY') || s.includes('매수') ? (Number(f.filledQty || f.qty) || 0) : 0);
      }, 0);
      if (filledBuyQty >= qty && qty > 0) {
        return '<span style="color:#10b981; font-size:9px; font-weight:800;" title="증권사 정상 체결완료 (x' + filledBuyQty + '주)">일치</span>';
      }
      if (filledBuyQty > 0) {
        return '<span style="color:#f59e0b; font-size:9px; font-weight:800;" title="부분 체결 (' + filledBuyQty + '/' + qty + '주)">부분체결</span>';
      }
      return '<span style="color:#ef4444; font-size:9px; font-weight:800;" title="증권사 체결 미확인">불일치(미체결)</span>';
    } else {
      // 매도 주문: 당일 체결되었는지 또는 미체결로 마감되었는지 확인
      const matchingSellFill = activeFilled.find(f => {
        const s = String(f.side || '').toUpperCase();
        return (s.includes('SELL') || s.includes('매도')) && Math.abs(Number(f.filledQty || f.qty) - qty) === 0;
      });
      if (matchingSellFill) {
        return '<span style="color:#10b981; font-size:9px; font-weight:800;" title="증권사 매도 체결완료">일치(체결)</span>';
      }
      // 매도 목표가 미도달로 정상 미체결 마감
      return '<span style="color:#10b981; font-size:9px; font-weight:800;" title="가격 미도달로 정상 미체결 마감">일치</span>';
    }
  }

  // ⭐️ 2. 장중 시간대 (09:20 ~ 16:00 ET):
  // 미체결 주문 + 체결 주문 퉁치기 대조
  const allBrokerOrders = [...activeUnfilled, ...activeFilled];
  const tungFn = typeof window.run_tungchigi_master === 'function' ? window.run_tungchigi_master : null;
  
  let combinedBroker = [];
  if (tungFn && allBrokerOrders.length > 0) {
    try {
      const rawTuples = allBrokerOrders.map(row => [
        normalizeOrderSide(row?.side || row?.orderSide || row?.ordSide || row?.bsnTp || row?.OrdPtnCode) === 'buy' ? '매수' : '매도',
        normalizeOrderType(row?.ordType || row?.orderType || row?.type || row?.trde_tp || row?.OrdprcPtnCode) === 'MOC' ? 'MOC' : 'LOC',
        brokerOrderPrice(row),
        brokerOrderQty(row)
      ]);
      const sanitized = rawTuples.map(o => {
        const c = [...o];
        if (c[2] !== undefined && c[2] !== '' && !isNaN(c[2])) c[2] = Math.round(parseFloat(c[2]) * 100) / 100;
        return c;
      });
      combinedBroker = tungFn(sanitized) || [];
    } catch (e) {
      combinedBroker = allBrokerOrders;
    }
  } else {
    combinedBroker = allBrokerOrders;
  }

  const hit = combinedBroker.find(v =>
    String(v[0] || v.side || '').toLowerCase().includes(side) &&
    Math.round(Number(v[3] || v.qty)) === Math.round(qty) &&
    (ordType === 'MOC' || Math.abs(Number(v[2] || v.price) - price) < 0.5 || side === 'buy')
  );

  if (hit) {
    return '<span style="color:#3b82f6; font-size:9px; font-weight:800;" title="증권사 주문과 일치">일치</span>';
  }

  return '<span style="color:#ef4444; font-size:9px; font-weight:800;" title="증권사 주문 미확인">불일치(미접수)</span>';
}

// 앱 통합 주문표의 한 줄이 GCP 봇에 예약된 주문과 같은지 표시한다.
// order: [side('매수'/'매도'), mode('LOC'/'MOC'), price, qty]
function getVmMatchMarkup(order, slotNum) {
  if (shouldCompareBrokerOrdersNow()) {
    return getBrokerOrderMatchMarkup(order, slotNum);
  }

  const cache = window.orderStatusCache || {};
  let rawVm = Array.isArray(cache.vmOrders) ? cache.vmOrders : null;
  
  if (!cache.lastUpdated || cache.lastUpdated === 0) {
    return '<span style="color:#64748b; font-size:9px;">-</span>';
  }
  
  if (!rawVm || rawVm.length === 0) {
    if (cache.vmOverdue) {
      return '<span style="color:#ef4444; font-size:9px; font-weight:800;" title="' + decodeURIComponent('GCP%20%EB%B4%87%20%EC%A3%BC%EB%AC%B8%ED%91%9C%20%EB%AF%B8%EC%83%9D%EC%84%B1') + '">' + decodeURIComponent('%EB%AF%B8%EC%83%9D%EC%84%B1') + '</span>';
    }
    return '<span style="color:#64748b; font-size:9px;" title="' + decodeURIComponent('GCP%20%EC%A3%BC%EB%AC%B8%ED%91%9C%20%EB%8C%80%EA%B8%B0') + '">-</span>';
  }

  const activeBr = window.BrokerService ? window.BrokerService.activeBroker : 'kiwoom';
  const vm = rawVm.filter(v => {
    const b = v.broker || (Number(v.slot) <= (window.BrokerService?.KIWOOM_MAX_SLOT || 6) ? 'kiwoom' : 'ls');
    if (b !== activeBr) return false;
    if (slotNum !== undefined && Number(v.slot) !== Number(slotNum)) return false;
    return true;
  });

  if (!vm || vm.length === 0) return '<span style="color:#64748b; font-size:9px;">-</span>';

  const side = (order[0] === decodeURIComponent('%EB%A7%A4%EC%88%98') || order[0] === 'buy') ? 'buy' : 'sell';
  const ordType = String(order[1] || '').toUpperCase() === 'MOC' ? 'MOC' : 'LOC';
  const price = Math.round((parseFloat(order[2]) || 0) * 100) / 100;
  const qty = parseInt(order[3], 10) || 0;

  // 통합 주문표인 경우(slotNum === undefined): VM 주문들을 퉁치기 변환 후 비교
  let compareTarget = vm;
  if (slotNum === undefined) {
    const tungFn = typeof window.run_tungchigi_master === 'function' ? window.run_tungchigi_master : (typeof combineOrders === 'function' ? combineOrders : null);
    if (vm.length > 1 && tungFn) {
      try {
        const rawVmTuples = vm.map(v => [
          v.side === 'buy' ? decodeURIComponent('%EB%A7%A4%EC%88%98') : decodeURIComponent('%EB%A7%A4%EB%8F%84'),
          v.ordType || 'LOC',
          v.price,
          v.qty
        ]);
        const sanitizedOrders = rawVmTuples.map(o => {
          const copy = [...o];
          if (copy[2] !== undefined && copy[2] !== '' && !isNaN(copy[2])) {
            copy[2] = Math.round(parseFloat(copy[2]) * 100) / 100;
          }
          return copy;
        });
        const combinedTuples = tungFn(sanitizedOrders);
        compareTarget = combinedTuples.map(t => ({
          side: (t[0] === decodeURIComponent('%EB%A7%A4%EC%88%98') || t[0] === 'buy') ? 'buy' : 'sell',
          ordType: String(t[1] || '').toUpperCase(),
          price: parseFloat(t[2]) || 0,
          qty: parseInt(t[3], 10) || 0
        }));
      } catch(e) {}
    }
  }

  const hit = compareTarget.find(v =>
    String(v.side).toLowerCase() === side &&
    String(v.ordType || '').toUpperCase() === ordType &&
    Math.round(Number(v.qty)) === Math.round(qty) &&
    (ordType === 'MOC' || Math.abs(Number(v.price) - price) < 0.1));

  if (hit) {
    return '<span style="color:#3b82f6; font-size:9px; font-weight:800;" title="' + decodeURIComponent('GCP%20%EB%B4%87%20%EC%98%88%EC%95%BD%EB%B6%84%EA%B3%BC%20%EC%9D%BC%EC%B9%98') + '">' + decodeURIComponent('%EC%9D%BC%EC%B9%98') + '</span>';
  }
  return '<span style="color:#ef4444; font-size:9px; font-weight:800;" title="' + decodeURIComponent('GCP%20%EC%98%88%EC%95%BD%EA%B3%BC%20%EB%B6%88%EC%9D%BC%EC%B9%98') + '">' + decodeURIComponent('%EB%B6%88%EC%9D%BC%EC%B9%98') + '</span>';
}

function getSoleActiveTicker() {
  const set = new Set();
  const max = window.MAX_SLOTS || 12;
  for (let i = 1; i <= max; i++) {
    if (typeof window.isSlotActive === 'function' && !window.isSlotActive(i)) continue;
    if (window.BrokerService && typeof window.BrokerService.isSlotForBroker === 'function' && !window.BrokerService.isSlotForBroker(i)) continue;
    const tk = String(window.slotConfigs?.[i]?.basics?.ticker || "").toUpperCase();
    if (tk) set.add(tk);
  }
  return set.size === 1 ? Array.from(set)[0] : "";
}

function getOrderStatusBadgeMarkup(order, slotNum) {
  if (!order || !order[0]) return "";
  const side = (order[0] === decodeURIComponent('%EB%A7%A4%EC%88%98') || order[0] === "buy") ? "buy" : "sell";
  const qty = parseInt(order[3], 10) || 0;
  const price = parseFloat(order[2]) || 0;
  const symbol = String(order[4] || "").toUpperCase() || getSoleActiveTicker();
  if (!symbol) return "";

  const cache = window.orderStatusCache || {};
  const sideOf = (v) => String(v || "").toLowerCase();
  const targetDate = orderTableDateStr();
  const compareDates = brokerCompareDateSet();
  const activeBr = window.BrokerService ? window.BrokerService.activeBroker : "kiwoom";
  const currentPhase = typeof nyMarketPhaseForOrderCompare === 'function' ? nyMarketPhaseForOrderCompare() : 'reserved';

  // ⭐️ 1. 예약 시간대 (17:00 ~ 익일 09:20 ET):
  // 다음 세션을 위한 예약 주문 단계이므로 증권사 과거 체결/미체결을 대조하지 않고 VM 예약 여부만 표시
  if (currentPhase === 'reserved') {
    if (cache.lastUpdated > 0 && Array.isArray(cache.vmOrders) && cache.vmOrders.length > 0) {
      const activeVmOrders = cache.vmOrders.filter(v => {
        const b = v.broker || (Number(v.slot) <= (window.BrokerService?.KIWOOM_MAX_SLOT || 6) ? "kiwoom" : "ls");
        if (b !== activeBr) return false;
        if (slotNum !== undefined && Number(v.slot) !== Number(slotNum)) return false;
        return true;
      });
      if (activeVmOrders.length > 0) {
        return '<span style="color:#a855f7 !important; font-size:9px; font-weight:800; margin-left:3px;" title="' + decodeURIComponent('GCP%20%EB%B4%87%EC%97%90%20%EC%98%88%EC%95%BD%20%EC%A3%BC%EB%AC%B8%20%EC%A0%80%EC%9E%A5%EB%90%A8') + '">' + decodeURIComponent('(%EC%98%88%EC%95%BD)') + '</span>';
      }
    }
    return "";
  }

  // ⭐️ 2. 장마감/체결확인 시간대 (16:00 ~ 17:00 ET): 당일 체결 여부 대조
  if (currentPhase === 'closed') {
    if (Array.isArray(cache.filledOrders) && cache.filledOrders.length > 0) {
      const matchingFilled = cache.filledOrders.filter(f => {
        if (f.broker && String(f.broker).toLowerCase() !== activeBr) return false;
        const fSym = brokerOrderSymbol(f);
        const fSide = sideOf(f.side || f.orderSide || f.ordSide || f.bsnTp || f.OrdPtnCode);
        const fDate = normalizeBrokerOrderDate(f);
        return (fSym === symbol || !symbol) && fSide.includes(side) && (!fDate || !targetDate || fDate === targetDate || compareDates.has(fDate));
      });
      if (matchingFilled.length > 0) {
        return '<span style="color:#4ade80 !important; font-size:9px; font-weight:800; margin-left:3px;" title="증권사 체결 완료">(체결)</span>';
      }
    }
    // 체결되지 않은 주문은 (미체결) 배지 부여
    return '<span style="color:#94a3b8 !important; font-size:9px; font-weight:800; margin-left:3px;" title="목표가 미도달로 정상 미체결 마감">(미체결)</span>';
  }

  // ⭐️ 3. 주문/장중 시간대 (09:20 ~ 16:00 ET): 증권사 미체결/체결 대조
  if (currentPhase === 'order') {
    if (Array.isArray(cache.unfilledOrders) && cache.unfilledOrders.length > 0) {
      const matchingUnfilled = cache.unfilledOrders.filter(u => {
        if (u.broker && String(u.broker).toLowerCase() !== activeBr) return false;
        const uSym = brokerOrderSymbol(u);
        const uSide = sideOf(u.side || u.orderSide || u.ordSide || u.bsnTp || u.OrdPtnCode);
        return (uSym === symbol || !symbol) && uSide.includes(side);
      });
      if (matchingUnfilled.length > 0) {
        return '<span style="color:#60a5fa !important; font-size:9px; font-weight:800; margin-left:3px;" title="' + decodeURIComponent('%EC%A6%9D%EA%B6%8C%EC%82%AC%20%EC%A0%91%EC%88%98%20%EC%99%84%EB%A3%8C%20(%EB%AF%B8%EC%B2%B4%EA%B2%B0)') + '">' + decodeURIComponent('(%EC%A3%BC%EB%AC%B8)') + '</span>';
      }
    }

    if (targetDate && Array.isArray(cache.filledOrders) && cache.filledOrders.length > 0) {
      const matchingFilled = cache.filledOrders.filter(f => {
        if (f.broker && String(f.broker).toLowerCase() !== activeBr) return false;
        const fSym = brokerOrderSymbol(f);
        const fSide = sideOf(f.side || f.orderSide || f.ordSide || f.bsnTp || f.OrdPtnCode);
        const fDate = normalizeBrokerOrderDate(f);
        return (fSym === symbol || !symbol) && fSide.includes(side) && (fDate === targetDate || compareDates.has(fDate));
      });
      if (matchingFilled.length > 0) {
        return '<span style="color:#4ade80 !important; font-size:9px; font-weight:800; margin-left:3px;" title="' + decodeURIComponent('%EC%A6%9D%EA%B6%8C%EC%82%AC%20%EC%B2%B4%EA%B2%B0%20%EC%99%84%EB%A3%8C%20(') + targetDate + ')">' + decodeURIComponent('(%EC%B2%B4%EA%B2%B0)') + '</span>';
      }
    }

    return '<span style="color:#60a5fa !important; font-size:9px; font-weight:800; margin-left:3px;" title="미국장 주문 시간대 — 증권사 주문/체결 내역 대조">' + decodeURIComponent('(%EC%A3%BC%EB%AC%B8)') + '</span>';
  }

  return "";
}

function buildCombinedOrderSignature(orders, orderDate = "") {
  const list = Array.isArray(orders) ? orders : [];
  return `${orderDate}::${list.map(o => [o?.[0] || "", o?.[1] || "", Number(o?.[2] || 0).toFixed(2), Number(o?.[3] || 0)].join('|')).join('||')}`;
}

function collectCurrentCombinedOrders() {
  const orders = [];
  let currentDate = "";
  // ⚠️ 2026-07-31부터 "통합 주문표"도 활성 브로커(키움 슬롯1~3 / LS 슬롯4~6)만 필터링한다.
  for (let i = 1; i <= window.MAX_SLOTS; i++) {
    if (!window.isSlotActive(i)) continue;
    if (window.BrokerService && !window.BrokerService.isSlotForBroker(i)) continue;
    const res = window.getBestResult(window.lastBTResults[i], i);
    if (!res) continue;
    if (!currentDate && res.orderDateStr) currentDate = res.orderDateStr;
    if (Array.isArray(res.rawOrders) && res.rawOrders.length > 0) orders.push(...res.rawOrders);
    else if (Array.isArray(res.orders) && res.orders.length > 0) orders.push(...res.orders);
  }
  return { orders, orderDate: currentDate, signature: buildCombinedOrderSignature(orders, currentDate) };
}

function getMarketDateMarkup(dateValue) {
  const cleaned = String(dateValue || "").replace(/\s*\(동기화됨\)\s*$/, "");
  return window.dateHelpers?.formatOrderDateWithMarketStatus
    ? window.dateHelpers.formatOrderDateWithMarketStatus(cleaned)
    : cleaned;
}

function getMarketStatusBadgeMarkup() {
  return window.dateHelpers?.getOrderHeaderMarketStatusBadge
    ? window.dateHelpers.getOrderHeaderMarketStatusBadge()
    : "";
}

function renderCombinedOrderBook(allRawOrders, alreadyCombined = false) {
  const tbody = document.getElementById('combinedOrderBody');
  if (!tbody) return;

  // ⚠️ Check for ticker mismatch. If active slots have different tickers, show error and display no orders.
  // 2026-07-31: 활성 브로커(키움 1~3 / LS 4~6) 슬롯만 대상으로 한다.
  const activeTickers = [];
  for (let i = 1; i <= window.MAX_SLOTS; i++) {
    if (window.isSlotActive(i) && (!window.BrokerService || window.BrokerService.isSlotForBroker(i))) {
      const tk = window.slotConfigs[i]?.basics?.ticker || "";
      if (tk) activeTickers.push(tk);
    }
  }
  const uniqueTickers = Array.from(new Set(activeTickers));
  if (uniqueTickers.length > 1) {
    tbody.innerHTML = "<tr><td colspan='4' style='padding:20px; color:#ef4444; text-align:center; font-weight:bold;'>⚠️ 티커 불일치 오류</td></tr>";
    const buyQtyEl = document.getElementById('combinedBuyQtyVal');
    const sellQtyEl = document.getElementById('combinedSellQtyVal');
    const pgEl = document.getElementById('combinedProgressVal');
    if (buyQtyEl) buyQtyEl.textContent = "0";
    if (sellQtyEl) sellQtyEl.textContent = "0";
    if (pgEl) pgEl.textContent = "-";
    return;
  }

  // ⚠️ 2026-07-31 실증: 캐시 키가 브로커 구분 없이 userId만으로 잡혀 있으면, LS로 전환해
  // 활성 슬롯이 0개(current.orders.length===0)가 됐을 때 isFreshCombinedSnapshot()가
  // "아직 데이터 로딩 전"이라고 오판해 기본값 true를 반환 — 키움의 예전 스냅샷을 "최신"으로
  // 착각해 그대로 복원해버렸다. 캐시 키 자체에 브로커를 넣어 완전히 분리한다.
  const cacheUserId = window.myUserId || localStorage.getItem('vtotal3_id') || '';
  const cacheBroker = (window.BrokerService && window.BrokerService.activeBroker) || 'kiwoom';
  const cacheKey = cacheUserId ? `vtotal3_snap_combined_orders_${cacheUserId}_${cacheBroker}` : '';
  const viewCacheKey = cacheUserId ? `vtotal3_combined_order_view_${cacheUserId}_${cacheBroker}` : '';

  const isFreshCombinedSnapshot = (snapshot) => {
    if (!snapshot) return false;
    const snapshotSig = snapshot.orderSignature || buildCombinedOrderSignature(snapshot.orders || [], snapshot.sourceOrderDate || "");
    const current = collectCurrentCombinedOrders();
    if (current.orders.length > 0) return snapshotSig === current.signature;
    if (typeof window.isFreshCombinedOrderSnapshot === 'function') {
      try { return window.isFreshCombinedOrderSnapshot(snapshot, cacheUserId); } catch (e) { }
    }
    return true;
  };

  const restoreRenderedView = () => {
    if (!viewCacheKey || window.__forceOrderViewReRender) return false;
    try {
      const cachedView = JSON.parse(localStorage.getItem(viewCacheKey) || 'null');
      if (cachedView?.html && isFreshCombinedSnapshot(cachedView)) {
        tbody.innerHTML = cachedView.html.replace(/<span[^>]*>[\(?](?:\uCCB4\uACB0|\uC8FC\uBB38|\uC608\uC57D|\?\?)[\)?]<\/span>/g, "");
        const buyQtyEl = document.getElementById('combinedBuyQtyVal');
        const sellQtyEl = document.getElementById('combinedSellQtyVal');
        const pgEl = document.getElementById('combinedProgressVal');
        if (buyQtyEl && cachedView.buyQty !== undefined) buyQtyEl.textContent = Number(cachedView.buyQty).toLocaleString();
        if (sellQtyEl && cachedView.sellQty !== undefined) sellQtyEl.textContent = Number(cachedView.sellQty).toLocaleString();
        if (pgEl && cachedView.progress !== undefined) pgEl.textContent = cachedView.progress;
        return true;
      }
    } catch (e) { }
    return false;
  };

  // 매개변수가 없으면 lastBTResults에서 수집
  if (!allRawOrders) {
    const current = collectCurrentCombinedOrders();
    if (current.orders.length > 0) {
      allRawOrders = current.orders;
    } else {
      // 활성 슬롯 데이터가 아직 없을 때만 통합 주문표 스냅샷을 사용한다.
      try {
        const cached = cacheKey ? localStorage.getItem(cacheKey) : null;
        const parsed = cached ? JSON.parse(cached) : null;
        if (parsed && parsed.type === 'final' && Array.isArray(parsed.orders) && parsed.orders.length > 0 && isFreshCombinedSnapshot(parsed)) {
          allRawOrders = parsed.orders;
          alreadyCombined = true;
        } else if (parsed && parsed.type === 'raw' && Array.isArray(parsed.orders) && parsed.orders.length > 0 && isFreshCombinedSnapshot(parsed)) {
          allRawOrders = parsed.orders;
        } else if (Array.isArray(parsed) && parsed.length > 0 && isFreshCombinedSnapshot(parsed)) {
          allRawOrders = parsed;
        }
      } catch (e) { }
    }
  }

  // ⚠️ 수집/스냅샷 복원이 전부 비었을 때(신규 기기 첫 로그인 등) undefined인 채로
  //    아래 .map()에 도달하면 크래시가 나서 앱 초기화 전체가 끊긴다. 빈 배열로 안전 처리.
  if (!Array.isArray(allRawOrders)) allRawOrders = [];

  // 실제 주문 원본을 확보한 즉시 저장한다. 서버 동기화가 끝나는 시점까지 기다리지 않는다.
  if (cacheKey && Array.isArray(allRawOrders) && allRawOrders.length > 0 && !alreadyCombined) {
    try { localStorage.setItem(cacheKey, JSON.stringify({ type: 'raw', orders: allRawOrders })); } catch (e) { }
  }

  let finalCombinedOrders = allRawOrders;
  if (!alreadyCombined && typeof window.run_tungchigi_master === 'function') {
    // ℹ️ Clean up floating point precision errors to ensure '===' matches correctly in run_tungchigi_master.
    const sanitizedOrders = allRawOrders.map(o => {
      const copy = [...o];
      if (copy[2] !== undefined && copy[2] !== "" && !isNaN(copy[2])) {
        copy[2] = Math.round(parseFloat(copy[2]) * 100) / 100;
      }
      return copy;
    });
    finalCombinedOrders = window.run_tungchigi_master(sanitizedOrders);
  }

  if (!finalCombinedOrders || finalCombinedOrders.length === 0) {
    // 초기 로딩 중 빈 메모리 결과가 마지막 정상 주문표를 덮지 않게 한다.
    if (restoreRenderedView()) return;
    tbody.innerHTML = "<tr><td colspan='4' style='padding:20px; color:#64748b; text-align:center;'>통합 주문 내역이 없습니다</td></tr>";
    // ⚠️ 2026-07-31: BUY/SELL/PG 카운터도 같이 리셋한다 — 안 그러면 브로커를 바꿔 주문표가
    // 비어도 이전 브로커의 수량이 그대로 남아 있었다.
    const buyQtyElEmpty = document.getElementById('combinedBuyQtyVal');
    const sellQtyElEmpty = document.getElementById('combinedSellQtyVal');
    const pgElEmpty = document.getElementById('combinedProgressVal');
    if (buyQtyElEmpty) buyQtyElEmpty.textContent = "-";
    if (sellQtyElEmpty) sellQtyElEmpty.textContent = "-";
    if (pgElEmpty) pgElEmpty.textContent = "-";
    return;
  }

  let sortedOrders = [...finalCombinedOrders];
  const orderSortOrder = localStorage.getItem(`vtotal3_sort_order_${window.myUserId}`) || 'asc';
  sortedOrders.sort((a, b) => {
    let pA = parseFloat(a[2]) || 0;
    let pB = parseFloat(b[2]) || 0;
    return orderSortOrder === 'desc' ? (pB - pA) : (pA - pB);
  });

  const buyQty = sortedOrders.reduce((sum, o) => {
    const qty = Number(o?.[3] || 0) || 0;
    return sum + (o?.[0] === '매수' ? qty : 0);
  }, 0);
  const sellQty = sortedOrders.reduce((sum, o) => {
    const qty = Number(o?.[3] || 0) || 0;
    return sum + (o?.[0] === '매도' ? qty : 0);
  }, 0);

  window.__latestCombinedOrders = sortedOrders;

  tbody.innerHTML = sortedOrders.map(o => {
    const cls = o[0] === '매수' ? 'buy' : 'sell';
    const statusBadge = getOrderStatusBadgeMarkup(o);
    const sideText = ((o[1] === 'MOC' || o[1] === 'LOC') ? o[1] + o[0] : o[0]) + statusBadge;
    const m = getVmMatchMarkup(o);
    return `<tr><td style="width:18%; text-align:center;">${m}</td><td class="${cls}" style="width:33%; text-align:center;">${sideText}</td><td class="${cls}" style="width:28%; text-align:center;">${Number(o[2]).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td><td class="${cls}" style="width:21%; text-align:center;">${o[3]}주</td></tr>`;
  }).join('')
    // 📤 App3: 통합 주문 전송 버튼 (활성 브로커 키움 1~6 / LS 7~12 기준)
    + (window.BrokerService && sortedOrders.length > 0 ? (() => {
      const isKiwoom = window.BrokerService.activeBroker === 'kiwoom';
      const brokerName = isKiwoom ? '키움' : 'LS';
      return `<tr><td colspan="4" style="padding:8px 4px; text-align:center;">
        <button id="btnSubmitCombinedOrders" onclick="window.submitCombinedOrdersToBroker()"
          style="width:100%; padding:8px 10px; border:none; border-radius:8px; cursor:pointer;
                 background:linear-gradient(135deg, ${isKiwoom ? '#10b981, #047857' : '#a855f7, #7e22ce'});
                 color:#fff; font-size:12px; font-weight:800; letter-spacing:0.2px; box-shadow:0 2px 6px rgba(0,0,0,0.3);">
          📤 ${brokerName} 통합주문 전송 (총 ${sortedOrders.length}건)
        </button>
      </td></tr>`;
    })() : '');

  const buyQtyEl = document.getElementById('combinedBuyQtyVal');
  const sellQtyEl = document.getElementById('combinedSellQtyVal');
  if (buyQtyEl) buyQtyEl.textContent = Number(buyQty).toLocaleString();
  if (sellQtyEl) sellQtyEl.textContent = Number(sellQty).toLocaleString();

  // ℹ️ Update the combined progress (PG) value representing the asset depletion percentage.
  const pgEl = document.getElementById('combinedProgressVal');
  let depletionVal = "0.0%";
  if (pgEl) {
    const combSummary = typeof window.calculateCombinedSummary === 'function' ? window.calculateCombinedSummary() : null;
    const baseDepVal = combSummary ? ((combSummary.depletion || 0) * 100).toFixed(1) + '%' : "0.0%";

    const activeSlotPgs = [];
    for (let i = 1; i <= window.MAX_SLOTS; i++) {
      if (window.isSlotActive(i) && (!window.BrokerService || window.BrokerService.isSlotForBroker(i))) {
        const slotRes = window.getBestResult(window.lastBTResults[i], i);
        const statusData = window.UI?.stats?.getDisplayStatusData ? window.UI.stats.getDisplayStatusData(slotRes, i) : null;
        let slotPgStr = "-";
        if (statusData && statusData.depletion !== undefined && statusData.depletion !== null) {
          slotPgStr = (Math.abs(Number(statusData.depletion || 0)) * 100).toFixed(1) + "%";
        }
        activeSlotPgs.push(slotPgStr);
      }
    }

    let slotPgsStr = "";
    if (activeSlotPgs.length > 0) {
      slotPgsStr = `<span style="color: var(--text) !important; font-weight: 700; opacity: 0.95; margin-left: 2px;">(${activeSlotPgs.join(', ')})</span>`;
    }

    depletionVal = `${baseDepVal}${activeSlotPgs.length > 0 ? `(${activeSlotPgs.join(', ')})` : ''}`;
    pgEl.innerHTML = `<span style="color:#fbbf24 !important; font-weight:800;">${baseDepVal}</span>${slotPgsStr}`;
  }

  updateCombinedPerfRatesUI();
  // 마지막으로 실제 표시된 표를 계산 캐시와 분리해 보관한다.
  // 이 키는 런타임 임시 캐시 정리 대상이 아니므로 다음 시작 때 즉시 복원된다.
  if (viewCacheKey) {
    try {
      localStorage.setItem(viewCacheKey, JSON.stringify({
        html: tbody.innerHTML,
        buyQty,
        sellQty,
        progress: depletionVal,
        savedAt: Date.now(),
        sourceOrderDate: window.currentOrderDate || "",
        orderSignature: buildCombinedOrderSignature(sortedOrders, window.currentOrderDate || "")
      }));
    } catch (e) { }
  }
}

function renderOrderTableSlot(orders, slotNum) {
  const tbody = document.getElementById('orderBody' + slotNum);
  if (!tbody) return;
  // Keep the latest per-slot ticket for the REST submit button below.
  window.__slotOrdersForBroker = window.__slotOrdersForBroker || {};
  window.__slotOrdersForBroker[slotNum] = Array.isArray(orders) ? [...orders] : [];
  if (!orders || orders.length === 0) {
    tbody.innerHTML = "<tr><td colspan='3' style='padding:20px; color:#64748b;'>주문 없음</td></tr>";
    return;
  }

  let sortedOrders = [...orders];
  const orderSortOrder = localStorage.getItem(`vtotal3_sort_order_${window.myUserId}`) || 'asc';
  sortedOrders.sort((a, b) => {
    let pA = parseFloat(a[2]) || 0;
    let pB = parseFloat(b[2]) || 0;
    return orderSortOrder === 'desc' ? (pB - pA) : (pA - pB);
  });

  tbody.innerHTML = sortedOrders.map(o => {
    const cls = o[0] === '매수' ? 'buy' : 'sell';
    const statusBadge = getOrderStatusBadgeMarkup(o, slotNum);
    const sideText = ((o[1] === 'MOC' || o[1] === 'LOC') ? o[1] + o[0] : o[0]) + statusBadge;
    return `<tr><td class="${cls}" style="width:40%; text-align:center;">${sideText}</td><td class="${cls}" style="width:34%; text-align:center;">$${Number(o[2]).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td><td class="${cls}" style="width:26%; text-align:center;">${o[3]}주</td></tr>`;
  }).join('')
    // 📤 App3: per-slot REST submit row (키움 슬롯1~6 / LS 슬롯7~12 — BrokerService가 판정)
    // ⚠️ 이 버튼이 주문이 나가는 유일한 경로다. 비우면 주문 전송 수단이 사라진다.
    + (window.BrokerService ? (() => {
      const isKiwoom = window.BrokerService.brokerForSlot(slotNum) === 'kiwoom';
      return `<tr><td colspan="3" style="padding:6px 4px; text-align:center;">
        <button onclick="window.submitSlotOrdersToBroker(${slotNum})"
          style="width:100%; padding:6px 8px; border:none; border-radius:6px; cursor:pointer;
                 background:linear-gradient(135deg, ${isKiwoom ? '#10b981, #047857' : '#a855f7, #7e22ce'});
                 color:#fff; font-size:11px; font-weight:800; letter-spacing:0.2px;">
          📤 ${isKiwoom ? '키움' : 'LS'} 슬롯${slotNum} 주문전송
        </button>
      </td></tr>`;
    })() : '');
}

function renderOrderViewSlot(res, slotNum) {
  if (!res) {
    renderOrderTableSlot([], slotNum);
    window.UI?.holdings?.renderTableSlot?.([], "", slotNum);
    const nameEl = document.getElementById('orderSlot' + slotNum + 'Name');
    if (nameEl) nameEl.innerHTML = "";
    const holdingsNameEl = document.getElementById('holdingsSlot' + slotNum + 'Name');
    if (holdingsNameEl) holdingsNameEl.innerHTML = "";
    const elTier = document.getElementById('tierCountVal' + slotNum);
    const elMode = document.getElementById('modeCountVal' + slotNum);
    const elWeight = document.getElementById('weightCountVal' + slotNum);
    const elQty = document.getElementById('qtyCountVal' + slotNum);
    const elPg = document.getElementById('progressVal' + slotNum);
    if (elTier) elTier.innerText = "-";
    if (elMode) elMode.innerText = "-";
    if (elWeight) elWeight.innerText = "-";
    if (elQty) elQty.innerText = "-";
    if (elPg) elPg.innerText = "-";
    refreshOrderViewUI();
    return;
  }

  renderOrderTableSlot(res.orders, slotNum);
  window.UI?.holdings?.renderTableSlot?.(res.inv || [], res.currentStrat, slotNum);

  // ℹ️ Append the ticker name (e.g. SOXL) to the strategy name in the header
  const ticker = window.slotConfigs[slotNum]?.basics?.ticker || "";
  const tickerSuffix = ticker ? ` (${ticker})` : "";

  const nameEl = document.getElementById('orderSlot' + slotNum + 'Name');
  if (nameEl) nameEl.innerHTML = window.formatStrategyNameWithSmallParentheses(res.currentStrat || "") + tickerSuffix;
  const holdingsNameEl = document.getElementById('holdingsSlot' + slotNum + 'Name');
  if (holdingsNameEl) holdingsNameEl.innerHTML = window.formatStrategyNameWithSmallParentheses(res.currentStrat || "") + tickerSuffix;

  const modeMap = { 'Middle': 'Mid1', 'Middle2': 'Mid2', 'Middle3': 'Mid3', 'SF': 'SF', 'AG': 'AG' };
  const elTier = document.getElementById('tierCountVal' + slotNum);
  const elMode = document.getElementById('modeCountVal' + slotNum);
  const elWeight = document.getElementById('weightCountVal' + slotNum);
  const elQty = document.getElementById('qtyCountVal' + slotNum);

  const t = res.nextOrderInfo?.tier ?? res.currentT ?? '-';
  const rawMode = res.nextOrderInfo?.mode ?? res.currentM ?? '-';
  const m = modeMap[rawMode] || rawMode || '-';
  const rawW = res.nextOrderInfo?.weight ?? res.currentW ?? '-';
  let w = '-';
  if (rawW !== '-' && rawW !== null && rawW !== undefined && rawW !== '') {
    w = typeof rawW === 'number' ? rawW + '%' : (String(rawW).includes('%') ? rawW : rawW + '%');
  }
  const q = res.nextOrderInfo?.qty ?? res.currentQ ?? '-';

  if (elTier) elTier.innerText = (t !== '' && t !== undefined) ? t : '-';
  if (elMode) elMode.innerText = (m !== '' && m !== undefined) ? m : '-';
  if (elWeight) elWeight.innerText = w;
  if (elQty) elQty.innerText = (q !== '' && q !== undefined) ? q : '-';

  const elPg = document.getElementById('progressVal' + slotNum);
  if (elPg) {
    let slotPgVal = "-";
    const statusData = window.UI?.stats?.getDisplayStatusData ? window.UI.stats.getDisplayStatusData(res, slotNum) : null;
    if (statusData && statusData.depletion !== undefined && statusData.depletion !== null) {
      const rawDep = Number(statusData.depletion || 0);
      slotPgVal = (Math.abs(rawDep) * 100).toFixed(1) + "%";
    }
    elPg.innerText = slotPgVal;
  }

  const orderDate = res.orderDateStr || "";
  if (!window.currentOrderDate || (window.BrokerService && window.BrokerService.isSlotForBroker(slotNum))) window.currentOrderDate = orderDate;
  refreshOrderViewUI();
}

function refreshOrderViewUI() {
  if (typeof refreshOrderStatusCache === 'function' && Date.now() - (window.orderStatusCache?.lastUpdated || 0) > 60000) {
    refreshOrderStatusCache();
  }
  const date1 = window.lastBTResults[1]?.orderDateStr || window.currentOrderDate || "";
  const currentCombined = collectCurrentCombinedOrders();

  // 내역모드에서는 isOrderView를 false로 강제 (보유현황 표시)
  if (window.isStatsMode) {
    window.isOrderView = false;
  }

  for (let i = 1; i <= window.MAX_SLOTS; i++) {
    if (window.isSlotActive(i)) {
      const v = document.getElementById('orderView' + i);
      const h = document.getElementById('holdingsView' + i);
      const f = document.getElementById('tierFooter' + i);
      if (v) v.style.display = window.isOrderView ? 'block' : 'none';
      if (h) h.style.display = window.isOrderView ? 'none' : 'block';
      if (f) f.style.display = window.isOrderView ? 'flex' : 'none';
    }
  }

  // 슬롯 전체의 가시성(display: flex/none) 일괄 갱신
  if (typeof window.updateSlotsVisibility === 'function') {
    window.updateSlotsVisibility();
  }

  const dualContainer = document.getElementById('dualOrderContainer');
  const orderTitle = document.getElementById('orderTitle');

  if (dualContainer) dualContainer.style.display = 'flex';

  const co = document.getElementById('combinedOrderView');
  const ch = document.getElementById('combinedHoldingsView');
  const cf = document.getElementById('combinedTierFooter');
  if (co) co.style.display = window.isOrderView ? 'block' : 'none';
  if (ch) ch.style.display = window.isOrderView ? 'none' : 'block';
  if (cf) cf.style.display = window.isOrderView ? 'flex' : 'none';

  // 1fr/40px 동적 min-width 조정을 위해 클래스 적용
  const grid = document.getElementById('mainGrid');
  if (grid) {
    if (window.isOrderView) {
      grid.classList.add('order-view-active');
      grid.classList.remove('holdings-view-active');
    } else {
      grid.classList.add('holdings-view-active');
      grid.classList.remove('order-view-active');
    }
  }

  // 통합 보유현황 요약 표시: 통합 보유현황 모드(!isOrderView && !showIndividualHoldings)일 때만
  const holdingSummaryEl = document.getElementById('combinedHoldingsSummary');
  if (holdingSummaryEl) {
    holdingSummaryEl.style.display = (!window.isOrderView && !window.showIndividualHoldings) ? 'flex' : 'none';
    if (!window.isOrderView && !window.showIndividualHoldings) {
      if (typeof window.UI.holdings.updateCombinedHoldingsSummary === 'function') {
        window.UI.holdings.updateCombinedHoldingsSummary();
      }
    }
  }

  // 확대 아이콘 제어: 보유현황 모드(!window.isOrderView)일 때는 전체적으로 숨김
  const btnExpand = document.getElementById('btnExpandOrder');
  if (btnExpand) {
    if (!window.isOrderView) {
      btnExpand.style.display = 'none';
    } else {
      btnExpand.style.display = '';
    }
  }

  const currentUserId = window.myUserId || localStorage.getItem('vtotal3_id') || '';
  const combinedMode = localStorage.getItem(`vtotal3_combined_mode_${currentUserId}`) || 'combined';

  // 통합 주문표 제목은 티커/오류 상태와 관계없이 동일하게 표시한다.
  // 티커 불일치 오류는 주문표 본문에서 별도로 안내한다.
  const combinedPanelTitleEl = document.getElementById('combinedOrderPanelTitle');
  if (combinedPanelTitleEl) {
    combinedPanelTitleEl.textContent = "통합 주문표";
  }

  if (combinedMode === 'combined') {
    if (window.isOrderView) {
      if (typeof window.UI.order.renderCombinedOrderBook === 'function') {
        window.UI.order.renderCombinedOrderBook(currentCombined.orders.length > 0 ? currentCombined.orders : undefined, false);
      }
    } else {
      if (window.showIndividualHoldings) {
        for (let i = 1; i <= window.MAX_SLOTS; i++) {
          if (window.isSlotActive(i) && window.lastBTResults[i]) {
            if (typeof window.UI.holdings.renderTableSlot === 'function') {
              window.UI.holdings.renderTableSlot(window.lastBTResults[i].inv || [], window.lastBTResults[i].currentStrat, i);
            }
          }
        }
      } else {
        if (typeof window.UI.holdings.renderCombinedHoldings === 'function') {
          window.UI.holdings.renderCombinedHoldings();
        }
      }
    }
  } else if (combinedMode === 'combined_normal') {
    // 통합+일반 모드
    if (window.isOrderView) {
      if (typeof window.UI.order.renderCombinedOrderBook === 'function') {
        window.UI.order.renderCombinedOrderBook(currentCombined.orders.length > 0 ? currentCombined.orders : undefined, false);
      }
    } else {
      if (window.showIndividualHoldings) {
        for (let i = 1; i <= window.MAX_SLOTS; i++) {
          if (window.isSlotActive(i) && window.lastBTResults[i]) {
            if (typeof window.UI.holdings.renderTableSlot === 'function') {
              window.UI.holdings.renderTableSlot(window.lastBTResults[i].inv || [], window.lastBTResults[i].currentStrat, i);
            }
          }
        }
      } else {
        if (typeof window.UI.holdings.renderCombinedHoldings === 'function') {
          window.UI.holdings.renderCombinedHoldings();
        }
      }
    }
  } else {
    // 일반 모드
    if (window.isOrderView) {
      // 일반 모드일 때는 굳이 통합 주문표 렌더링을 하지 않아도 됨
    } else {
      if (window.showIndividualHoldings) {
        for (let i = 1; i <= window.MAX_SLOTS; i++) {
          if (window.isSlotActive(i) && window.lastBTResults[i]) {
            if (typeof window.UI.holdings.renderTableSlot === 'function') {
              window.UI.holdings.renderTableSlot(window.lastBTResults[i].inv || [], window.lastBTResults[i].currentStrat, i);
            }
          }
        }
      } else {
        if (typeof window.UI.holdings.renderCombinedHoldings === 'function') {
          window.UI.holdings.renderCombinedHoldings();
        }
      }
    }
  }

  // ⭐️ orderTitle 강제 덮어쓰기 로직을 전면 제거하고, 
  // 대신 window.UI.toggles.updateOrderHeaderUI() 가 헤더 타이틀 및 랭킹/설정 버튼 상태를 전담 통제하도록 위임합니다.
  if (window.UI?.toggles?.updateOrderHeaderUI) {
    window.UI.toggles.updateOrderHeaderUI();
  }
}

// 글로벌 window.UI에 등록
if (!window.UI) window.UI = {};
if (!window.UI.order) window.UI.order = {};
window.UI.order.renderCombinedOrderBook = renderCombinedOrderBook;
window.UI.order.renderOrderTableSlot = renderOrderTableSlot;
window.UI.order.renderOrderViewSlot = renderOrderViewSlot;
window.UI.order.refreshOrderViewUI = refreshOrderViewUI;

function updateCombinedPerfRatesUI() {
  const container = document.getElementById('combinedPerfRatesGroup');
  if (!container) return;

  const grid = document.getElementById('mainGrid');
  const currentMode = localStorage.getItem(`vtotal3_combined_mode_${window.myUserId}`) || 'combined';
  const isExpanded = grid ? grid.classList.contains('order-expanded') : false;
  const isOrderView = window.isOrderView !== false;
  const isStatsMode = window.isStatsMode === true;

  // 통합 주문표 화면에서 확장일 때만 표시하고, 통합+일반 주문표나 일반 주문표에서는 숨김
  const shouldShow = (currentMode === 'combined') && isExpanded && isOrderView && !isStatsMode;

  if (!shouldShow) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'flex';

  if (typeof window.calculateChartRatesDataEngine === 'function') {
    window.calculateChartRatesDataEngine();
  } else if (!window._isUpdatingChartRates && typeof window.updateChartRatesDisplay === 'function') {
    window.updateChartRatesDisplay();
  }
  let rates = window.chartRatesData;

  const getColor = (val) => {
    if (val > 0) return '#3b82f6'; // +면 파란색
    if (val < 0) return '#ef4444'; // -면 빨간색
    return 'var(--text)'; // 0이면 기본 색상
  };

  const formatProfitWithRateHtml = (profit, rate) => {
    const isKRW = window.isCurrencyKRW === true;
    const fx = isKRW ? (window.currentFXRate || 1450) : 1;
    const absP = Math.abs(profit);
    const signP = profit < 0 ? '-' : '';
    const moneyStr = isKRW
      ? signP + Math.round(absP * fx / 10000).toLocaleString() + '만'
      : signP + '$' + Math.round(absP).toLocaleString();
    const rateStr = rate.toFixed(1) + '%';
    const colorVal = getColor(rate);
    return `<span style="color:var(--text) !important; font-weight:700;">${moneyStr}</span><span style="color:${colorVal} !important; font-weight:800;">(${rateStr})</span>`;
  };

  const applyHtml = (el, htmlStr) => {
    if (!el) return;
    el.innerHTML = htmlStr;
  };

  const yRate = rates ? Number(rates.y || 0) : 0;
  const mRate = rates ? Number(rates.m || 0) : 0;
  const dRate = rates ? Number(rates.d || 0) : 0;
  const ddRate = rates ? Number(rates.dd || 0) : 0;

  const yProfit = rates ? Number(rates.yProfit || 0) : 0;
  const mProfit = rates ? Number(rates.mProfit || 0) : 0;
  const dProfit = rates ? Number(rates.dProfit || 0) : 0;

  let ddFormattedStr = ddRate.toFixed(1) + '%';
  if (Math.abs(ddRate) < 0.05) ddFormattedStr = '0.0%';
  const ddColor = getColor(ddRate);
  const ddHtml = `<span style="color:${ddColor} !important; font-weight:800;">${ddFormattedStr}</span>`;

  const yEl = document.getElementById('combinedYVal');
  const mEl = document.getElementById('combinedMVal');
  const dEl = document.getElementById('combinedDVal');
  const ddEl = document.getElementById('combinedDDVal');

  applyHtml(yEl, formatProfitWithRateHtml(yProfit, yRate));
  applyHtml(mEl, formatProfitWithRateHtml(mProfit, mRate));
  applyHtml(dEl, formatProfitWithRateHtml(dProfit, dRate));
  applyHtml(ddEl, ddHtml);
}

// App 3: submit one slot's whole order ticket to the broker proxy (kiwoom/LS by slot range).
// Order row shape: [side('매수'|'매도'), type(''|'LOC'|'MOC'), price, qty]
window.submitSlotOrdersToBroker = async function (slotNum) {
  const orders = (window.__slotOrdersForBroker || {})[slotNum] || [];
  if (!orders.length) { alert("전송할 주문이 없습니다."); return; }
  if (!window.BrokerService) { alert("BrokerService가 로드되지 않았습니다."); return; }

  const symbol = window.slotConfigs?.[slotNum]?.basics?.ticker || "";
  if (!symbol) { alert("슬롯 티커를 찾을 수 없습니다. 설정을 확인하세요."); return; }

  // ⚠️ 실제 발주 브로커 결정 — BrokerService.brokerForSlot이 단일 진실 공급원이다.
  //    서버(broker3-proxy의 sanitizeOrders3)도 slot 번호로 같은 판정을 하므로 경계가 어긋나면
  //    화면과 다른 계좌로 주문이 나간다.
  const broker = window.BrokerService.brokerForSlot(slotNum);
  const brokerLabel = broker === "kiwoom" ? "키움" : "LS증권";

  // 실전/모의를 주문 직전에 서버에서 확인해 팝업에 명시한다.
  // 실전이면 이 확인 팝업이 유일한 안전장치이므로(자동주문 스케줄러 없음) 문구를 강하게.
  let modeLine = "";
  try {
    const st = await window.BrokerService.keyStatus(broker);
    if (st && st.success !== false) {
      if (!st.hasKey && !st.registered) {
        alert(`[${brokerLabel}] API 키가 등록되지 않았습니다.\n설정 → 🔐 브로커 API 키에서 먼저 등록하세요.`);
        return;
      }
      modeLine = String(st.paperMode) === "1"
        ? "🟡 모의투자 — 실제 체결되지 않습니다\n\n"
        : "🔴 실전 계좌 — 실제로 체결되어 돈이 나갑니다\n\n";
    }
  } catch (e) { modeLine = "⚠️ 실전/모의 확인 실패 — 실전일 수 있습니다\n\n"; }

  const totalUsd = orders.reduce((s, o) => s + (Number(o[2]) || 0) * (Number(o[3]) || 0), 0);
  const summary = orders.map(o =>
    `${o[0]}${o[1] ? `(${o[1]})` : ""} ${symbol} ${o[3]}주 @ $${Number(o[2]).toFixed(2)}`).join("\n");
  if (!confirm(`${modeLine}[${brokerLabel}] 슬롯${slotNum} 주문 ${orders.length}건 전송\n총 체결금액(예상): $${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}\n\n${summary}\n\n전송하시겠습니까?`)) return;

  const results = [];
  for (const o of orders) {
    const side = o[0] === '매수' ? 'BUY' : 'SELL';
    try {
      const res = await window.BrokerService.sendOverseasOrder({
        slot: slotNum, symbol, qty: Number(o[3]) || 0,
        price: Number(o[2]) || 0, side, ordType: o[1] || ""
      });
      results.push(`${side} $${Number(o[2]).toFixed(2)} x${o[3]} → ${res && res.success ? "✅ " + (res.message || "OK") : "❌ " + (res && (res.error || res.message) || "실패")}`);
    } catch (e) {
      results.push(`${side} $${Number(o[2]).toFixed(2)} x${o[3]} → ❌ ${e.message}`);
    }
  }
  alert(`[${brokerLabel}] 슬롯${slotNum} 전송 결과\n\n` + results.join("\n"));
};

window.compareOrderBookManual = async function() {
  const cache = window.orderStatusCache || {};
  const currentPhase = typeof nyMarketPhaseForOrderCompare === 'function' ? nyMarketPhaseForOrderCompare() : 'reserved';
  const isBrokerPhase = currentPhase === 'order' || currentPhase === 'closed';
  const isClosedPhase = currentPhase === 'closed';
  const activeBr = window.BrokerService ? window.BrokerService.activeBroker : 'kiwoom';
  const symbol = getSoleActiveTicker();
  const compareDates = typeof brokerCompareDateSet === 'function' ? brokerCompareDateSet() : new Set();
  
  const tungFn = typeof window.run_tungchigi_master === 'function' ? window.run_tungchigi_master : (typeof combineOrders === 'function' ? combineOrders : null);
  if (!tungFn) {
    alert("퉁치기 알고리즘을 찾을 수 없습니다.");
    return;
  }

  // Calculate dynamic KST offsets
  const now = new Date();
  const nowEtStr = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour12: false, hour: "2-digit" }).format(now);
  const nowKstStr = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", hour12: false, hour: "2-digit" }).format(now);
  const diffHours = (Number(nowKstStr) - Number(nowEtStr) + 24) % 24;

  const fmtTime = (h, m) => `${String((h + diffHours) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  const kstOrderStr = `${fmtTime(9, 20)} ~ ${fmtTime(16, 0)}`;
  const kstClosedStr = `${fmtTime(16, 0)} ~ ${fmtTime(17, 0)}`;
  const kstReservedStr = `${fmtTime(17, 0)} ~ ${fmtTime(9, 20)}`;

  // 1. App Orders (앱 통합 주문표)
  let appRaw = [];
  let appCombined = [];
  if (typeof collectCurrentCombinedOrders === 'function') {
    appRaw = collectCurrentCombinedOrders().orders || [];
    try {
      const sanitizedApp = appRaw.map(o => {
        const c = [...o];
        if (c[2] !== undefined && c[2] !== '' && !isNaN(c[2])) c[2] = Math.round(parseFloat(c[2]) * 100) / 100;
        return c;
      });
      appCombined = tungFn(sanitizedApp);
    } catch(e) {
      appCombined = appRaw;
    }
  }
  const appMap = {};
  (appCombined || []).forEach(o => {
    const s = (o[0] === '매수' || o[0] === 'buy') ? 'buy' : 'sell';
    const t = String(o[1] || '').toUpperCase() === 'MOC' ? 'MOC' : 'LOC';
    const p = t === 'MOC' ? '0.00' : Number(o[2]).toFixed(2);
    appMap[`${s}|${t}|${p}`] = (appMap[`${s}|${t}|${p}`] || 0) + Number(o[3]);
  });

  // 2. VM Orders
  const vmRawOrders = (Array.isArray(cache.vmOrders) ? cache.vmOrders : []).filter(v => {
    if (!v) return false;
    const b = v.broker || (Number(v.slot) <= (window.BrokerService?.KIWOOM_MAX_SLOT || 6) ? 'kiwoom' : 'ls');
    return b === activeBr;
  });
  let vmCombined = [];
  try {
    const rawTuples = vmRawOrders.map(row => [
      normalizeOrderSide(row?.side || row?.orderSide || row[0]) === 'buy' ? '매수' : '매도',
      normalizeOrderType(row?.ordType || row?.orderType || row[1]) === 'MOC' ? 'MOC' : 'LOC',
      (row && row.price !== undefined) ? row.price : (row ? row[2] : 0),
      (row && row.qty !== undefined) ? row.qty : (row ? row[3] : 0)
    ]);
    vmCombined = tungFn(rawTuples.map(o => { const c=[...o]; if(c[2]!==undefined && c[2]!=="") c[2]=Math.round(parseFloat(c[2])*100)/100; return c; }));
  } catch(e) {
    vmCombined = vmRawOrders.map(row => [
      normalizeOrderSide(row?.side || row?.orderSide || row[0]) === 'buy' ? '매수' : '매도',
      normalizeOrderType(row?.ordType || row?.orderType || row[1]) === 'MOC' ? 'MOC' : 'LOC',
      (row && row.price !== undefined) ? row.price : (row ? row[2] : 0),
      (row && row.qty !== undefined) ? row.qty : (row ? row[3] : 0)
    ]);
  }
  
  const vmMap = {};
  (vmCombined || []).forEach(o => {
    const s = (o[0] === '매수' || o[0] === 'buy') ? 'buy' : 'sell';
    const t = String(o[1] || '').toUpperCase() === 'MOC' ? 'MOC' : 'LOC';
    const p = t === 'MOC' ? '0.00' : Number(o[2]).toFixed(2);
    vmMap[`${s}|${t}|${p}`] = (vmMap[`${s}|${t}|${p}`] || 0) + Number(o[3]);
  });

  // 3. Broker Orders
  const unfilled = Array.isArray(cache.unfilledOrders) ? cache.unfilledOrders : [];
  const fills = Array.isArray(cache.filledOrders) ? cache.filledOrders : [];
  const filterRow = (row) => {
    if (!row) return false;
    if (row.broker && String(row.broker).toLowerCase() !== activeBr) return false;
    const rowSym = brokerOrderSymbol(row);
    if (symbol && rowSym && rowSym !== symbol) return false;
    const rowDate = normalizeBrokerOrderDate(row);
    if (rowDate && compareDates.size > 0 && !compareDates.has(rowDate)) return false;
    return true;
  };
  const activeUnfilled = unfilled.filter(filterRow);
  const activeFilled = fills.filter(filterRow);
  
  const filledBuyQty = activeFilled.reduce((sum, f) => {
    const s = String(f.side || "").toUpperCase();
    return sum + (s.includes("BUY") || s.includes("매수") ? (Number(f.filledQty || f.qty) || 0) : 0);
  }, 0);
  const filledSellQty = activeFilled.reduce((sum, f) => {
    const s = String(f.side || "").toUpperCase();
    return sum + (s.includes("SELL") || s.includes("매도") ? (Number(f.filledQty || f.qty) || 0) : 0);
  }, 0);

  const brMap = {};
  if (isBrokerPhase) {
    if (isClosedPhase) {
      // ⭐️ 체결시간대에는 실제 체결이 발생한 항목만 매핑
      (appCombined || []).forEach(o => {
        const s = (o[0] === '매수' || o[0] === 'buy') ? 'buy' : 'sell';
        const t = String(o[1] || '').toUpperCase() === 'MOC' ? 'MOC' : 'LOC';
        const p = t === 'MOC' ? '0.00' : Number(o[2]).toFixed(2);
        const k = `${s}|${t}|${p}`;
        if (s === 'buy' && filledBuyQty > 0) {
          brMap[k] = filledBuyQty;
        } else if (s === 'sell' && filledSellQty > 0) {
          brMap[k] = filledSellQty;
        }
      });
    } else {
      const allBrokerOrders = [...activeUnfilled, ...activeFilled];
      try {
        const rawTuples = allBrokerOrders.map(row => [
          normalizeOrderSide(row?.side || row?.orderSide || row?.ordSide || row?.bsnTp || row?.OrdPtnCode) === 'buy' ? '매수' : '매도',
          normalizeOrderType(row?.ordType || row?.orderType || row?.type || row?.trde_tp || row?.OrdprcPtnCode) === 'MOC' ? 'MOC' : 'LOC',
          brokerOrderPrice(row),
          brokerOrderQty(row)
        ]);
        const brokerCombined = tungFn ? tungFn(rawTuples.map(o => { const c=[...o]; if(c[2]!==undefined && c[2]!=="") c[2]=Math.round(parseFloat(c[2])*100)/100; return c; })) : rawTuples;
        (brokerCombined || []).forEach(o => {
          const s = (o[0] === '매수' || o[0] === 'buy') ? 'buy' : 'sell';
          const t = String(o[1] || '').toUpperCase() === 'MOC' ? 'MOC' : 'LOC';
          const p = t === 'MOC' ? '0.00' : Number(o[2]).toFixed(2);
          brMap[`${s}|${t}|${p}`] = (brMap[`${s}|${t}|${p}`] || 0) + Number(o[3]);
        });
      } catch(e) {}
    }
  }

  // ⭐️ 체결시간대(isClosedPhase)에는 "실제 체결이 발생한 체결 항목만" 비교 목록에 포함
  let allKeys = [];
  if (isClosedPhase) {
    allKeys = Object.keys(brMap);
  } else {
    allKeys = Array.from(new Set([...Object.keys(appMap), ...Object.keys(vmMap), ...(isBrokerPhase ? Object.keys(brMap) : [])]));
  }
  
  // Sort keys descending by price
  allKeys.sort((a, b) => {
    const pA = Number(a.split('|')[2]);
    const pB = Number(b.split('|')[2]);
    return pB - pA;
  });

  let tbodyHtml = '';
  let allMatched = true;

  if (allKeys.length === 0) {
    if (isClosedPhase) {
      tbodyHtml = '<tr><td colspan="5" style="padding:16px; color:var(--text-muted, #94a3b8); font-size:12px; text-align:center;">당일 체결 내역이 없습니다 (전량 목표가 미도달로 미체결 마감)</td></tr>';
    } else {
      tbodyHtml = '<tr><td colspan="5" style="padding:10px; color:var(--text-muted, #94a3b8);">비교할 주문 내역이 없습니다.</td></tr>';
    }
  } else {
    allKeys.forEach(k => {
      const parts = k.split('|');
      const sideStr = parts[0] === 'buy' ? '<span style="color:#ef4444">매수</span>' : '<span style="color:#3b82f6">매도</span>';
      const priceDisplay = parts[1] === 'MOC' ? '<span style="font-size:11px; color:var(--text-muted);">시장가</span>' : '$' + Number(parts[2]).toFixed(2);
      const label = `${parts[1]} ${sideStr} ${priceDisplay}`;
      
      const vQty = vmMap[k] || 0;
      const aQty = appMap[k] || 0;
      const bQty = isBrokerPhase ? (brMap[k] || 0) : 0;
      
      let matched = (vQty === aQty) && (aQty === bQty);
      if (!matched) allMatched = false;

      tbodyHtml += `
        <tr style="border-bottom:1px solid var(--card-border, rgba(255,255,255,0.07)); height:32px;">
          <td style="text-align:left; padding-left:12px;">${label}</td>
          <td style="font-weight:bold; color:${vQty > 0 ? 'var(--text)' : 'var(--text-muted)'}">${vQty}</td>
          <td style="font-weight:bold; color:${aQty > 0 ? 'var(--text)' : 'var(--text-muted)'}">${aQty}</td>
          ${isBrokerPhase ? `<td style="font-weight:bold; color:${bQty > 0 ? '#10b981' : 'var(--text-muted)'}">${bQty}</td>` : '<td style="color:var(--text-muted); font-size:11px;">-</td>'}
          <td>
            ${matched ? '<span style="color:#10b981; font-weight:bold;">일치</span>' : '<span style="color:#ef4444; font-weight:bold;">불일치</span>'}
          </td>
        </tr>
      `;
    });
  }

  // Phase Badge & Broker Column Title
  let phaseBadge = '';
  let brokerColTitle = '증권사';
  if (currentPhase === 'closed') {
    phaseBadge = '<span style="font-size:11px; background:#10b981; color:#fff; padding:2px 6px; border-radius:4px; font-weight:600;">체결확인 (VM/앱/증권사체결)</span>';
    brokerColTitle = '증권사(체결)';
  } else if (currentPhase === 'order') {
    phaseBadge = '<span style="font-size:11px; background:#0ea5e9; color:#fff; padding:2px 6px; border-radius:4px; font-weight:600;">주문중 (VM/앱/증권사)</span>';
    brokerColTitle = '증권사';
  } else {
    phaseBadge = '<span style="font-size:11px; background:#f59e0b; color:#fff; padding:2px 6px; border-radius:4px; font-weight:600;">예약중 (VM/앱)</span>';
    brokerColTitle = '<span style="color:var(--text-muted); font-weight:normal;">증권사 (-)</span>';
  }

  // Inject Modal (Original Clean HTML Structure)
  const modalId = 'orderCompareManualModal';
  let existing = document.getElementById(modalId);
  if (existing) existing.remove();

  const modalHtml = `
    <div id="${modalId}" style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.6); z-index:99999; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(3px);">
      <div style="background:var(--card, #1e293b); color:var(--text, #fff); width:100%; max-width:600px; max-height:90vh; border-radius:12px; display:flex; flex-direction:column; box-shadow:0 10px 25px rgba(0,0,0,0.5); overflow:hidden; border:1px solid var(--card-border, rgba(255,255,255,0.1));">
        <div style="padding:14px 20px; border-bottom:1px solid var(--card-border, rgba(255,255,255,0.1)); display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:8px;">
            <h3 style="margin:0; font-size:16px; color:var(--primary, #8b5cf6);">✅ 일치확인 (수동 대조)</h3>
            <button onclick="window.openSheetVerificationModal && window.openSheetVerificationModal()" style="background:linear-gradient(135deg, #6366f1, #4338ca); color:#fff; border:none; border-radius:6px; padding:4px 10px; font-size:11px; font-weight:800; cursor:pointer; display:flex; align-items:center; gap:4px; box-shadow:0 2px 5px rgba(0,0,0,0.3);">
              📊 시트 1:1 검증
            </button>
          </div>
          ${phaseBadge}
        </div>
        
        <!-- 시간대 안내 카드 -->
        <div style="padding:10px 16px 4px 16px;">
          <div style="background:var(--bg, #0f172a); border:1px solid var(--card-border, rgba(255,255,255,0.1)); border-radius:8px; padding:8px 12px; font-size:11px;">
            <div style="font-weight:bold; color:var(--text, #fff); margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
              <span>🕒 상태별 비교 시간대 안내</span>
              <span style="font-size:10px; color:var(--text-muted);">기준: 뉴욕(ET) / 한국(KST)</span>
            </div>
            <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:6px; text-align:center;">
              <div style="background:${currentPhase === 'order' ? 'rgba(14,165,233,0.15)' : 'transparent'}; border:1px solid ${currentPhase === 'order' ? '#0ea5e9' : 'var(--card-border, rgba(255,255,255,0.07))'}; border-radius:6px; padding:5px 2px;">
                <div style="font-weight:bold; color:#0ea5e9; font-size:11px;">1. 주문시간</div>
                <div style="font-size:10px; color:var(--text, #fff); margin-top:2px;">09:20 ~ 16:00 ET</div>
                <div style="font-size:10px; color:var(--text-muted); font-weight:600;">(한국 ${kstOrderStr})</div>
              </div>
              <div style="background:${currentPhase === 'closed' ? 'rgba(16,185,129,0.15)' : 'transparent'}; border:1px solid ${currentPhase === 'closed' ? '#10b981' : 'var(--card-border, rgba(255,255,255,0.07))'}; border-radius:6px; padding:5px 2px;">
                <div style="font-weight:bold; color:#10b981; font-size:11px;">2. 체결시간</div>
                <div style="font-size:10px; color:var(--text, #fff); margin-top:2px;">16:00 ~ 17:00 ET</div>
                <div style="font-size:10px; color:var(--text-muted); font-weight:600;">(한국 ${kstClosedStr})</div>
              </div>
              <div style="background:${currentPhase === 'reserved' ? 'rgba(245,158,11,0.15)' : 'transparent'}; border:1px solid ${currentPhase === 'reserved' ? '#f59e0b' : 'var(--card-border, rgba(255,255,255,0.07))'}; border-radius:6px; padding:5px 2px;">
                <div style="font-weight:bold; color:#f59e0b; font-size:11px;">3. 예약시간</div>
                <div style="font-size:10px; color:var(--text, #fff); margin-top:2px;">17:00 ~ 09:20 ET</div>
                <div style="font-size:10px; color:var(--text-muted); font-weight:600;">(한국 ${kstReservedStr})</div>
              </div>
            </div>
          </div>
        </div>

        <div style="padding:8px 16px 0 16px; overflow-y:auto; flex:1;">
          <table style="width:100%; border-collapse:collapse; text-align:center; font-size:12px;">
            <thead style="background:var(--bg, #020617); position:sticky; top:0;">
              <tr style="height:36px; border-bottom:1px solid var(--card-border, rgba(255,255,255,0.1));">
                <th style="width:30%; text-align:left; padding-left:12px;">주문</th>
                <th style="width:15%;">VM</th>
                <th style="width:15%;">앱</th>
                <th style="width:20%;">${brokerColTitle}</th>
                <th style="width:20%;">결과</th>
              </tr>
            </thead>
            <tbody>
              ${tbodyHtml}
            </tbody>
          </table>
        </div>

        <div style="padding:12px 20px; border-top:1px solid var(--card-border, rgba(255,255,255,0.1)); display:flex; justify-content:space-between; align-items:center; background:var(--bg, #020617);">
          <div style="font-size:11px; color:var(--text-muted);">
            <span style="color:#0ea5e9;">ℹ️</span> 모든 주문표는 <b>퉁치기(상계/합산)</b>하여 표기 및 비교합니다.
          </div>
          <button onclick="document.getElementById('${modalId}').remove()" style="background:var(--card, #334155); color:var(--text, #fff); border:1px solid var(--card-border, rgba(255,255,255,0.15)); border-radius:6px; padding:6px 16px; font-size:12px; font-weight:bold; cursor:pointer;">닫기</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
};


window.openSheetVerificationModal = async function() {
  const modalId = 'sheetVerificationModal';
  let existing = document.getElementById(modalId);
  if (existing) existing.remove();

  // Create loading modal
  const initialModalHtml = `
    <div id="${modalId}" style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.7); z-index:999999; display:flex; align-items:center; justify-content:center; padding:16px; backdrop-filter:blur(4px);">
      <div style="background:var(--card, #1e293b); color:var(--text, #fff); width:100%; max-width:860px; max-height:92vh; border-radius:14px; display:flex; flex-direction:column; box-shadow:0 12px 30px rgba(0,0,0,0.6); overflow:hidden; border:1px solid var(--card-border, rgba(255,255,255,0.12)); font-family:inherit;">
        <!-- Header -->
        <div style="padding:14px 20px; border-bottom:1px solid var(--card-border, rgba(255,255,255,0.12)); display:flex; justify-content:space-between; align-items:center; background:var(--bg, #0f172a);">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:18px;">📊</span>
            <h3 style="margin:0; font-size:16px; font-weight:800; color:var(--text, #fff); letter-spacing:-0.3px;">시트 데이터 & JSON 꾸러미 1:1 정밀 검증 (앱 vs VM)</h3>
          </div>
          <button onclick="document.getElementById('${modalId}').remove()" style="background:transparent; border:none; color:var(--text-muted, #94a3b8); font-size:20px; font-weight:700; cursor:pointer; line-height:1; padding:2px 6px;">✕</button>
        </div>

        <!-- Body -->
        <div id="${modalId}_body" style="padding:20px; overflow-y:auto; flex:1;">
          <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px 20px; gap:12px;">
            <div style="width:36px; height:36px; border:3px solid rgba(99,102,241,0.2); border-top-color:#6366f1; border-radius:50%; animation:spin 1s linear infinite;"></div>
            <div style="font-size:13px; font-weight:700; color:var(--text, #fff);">VM 백엔드에서 시트 최신 계산 및 JSON 꾸러미 데이터를 수집 중입니다...</div>
            <div style="font-size:11px; color:var(--text-muted, #94a3b8);">시트 전날 데이터 기준 금일 10대 항목 + 매수티어별 JSON 1:1 대조</div>
          </div>
        </div>

        <!-- Footer -->
        <div style="padding:12px 20px; border-top:1px solid var(--card-border, rgba(255,255,255,0.1)); display:flex; justify-content:space-between; align-items:center; background:var(--bg, #0f172a);">
          <div style="font-size:11px; color:var(--text-muted, #94a3b8);">
            ℹ️ 시트의 전날 종가/스냅샷을 기반으로 생성된 금일 데이터와 JSON 매수티어별 내역을 실시간 비교합니다.
          </div>
          <button onclick="document.getElementById('${modalId}').remove()" style="background:var(--card, #334155); color:var(--text, #fff); border:1px solid var(--card-border, rgba(255,255,255,0.15)); border-radius:6px; padding:7px 18px; font-size:12px; font-weight:700; cursor:pointer;">닫기</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', initialModalHtml);

  // Fetch VM Data and Render Content
  try {
    const vmRes = await (window.BrokerService?.fetchSheetVerification ? window.BrokerService.fetchSheetVerification() : fetch(`${window.WORKER3_URL || 'https://autumn-limit-001e-3.smw594.workers.dev'}/api/orders/verify-sheet?userId=${encodeURIComponent(window.myUserId || '')}`).then(r => r.json()));
    
    if (!vmRes || !vmRes.ok || !Array.isArray(vmRes.slotStates)) {
      throw new Error(vmRes?.reason || vmRes?.error || "VM 응답 데이터 형식이 올바르지 않습니다.");
    }

    // Extract App States
    const appStates = [];
    for (let i = 1; i <= (window.MAX_SLOTS || 12); i++) {
      const isActive = typeof window.isSlotActive === "function" ? window.isSlotActive(i) : true;
      const conf = window.slotConfigs ? window.slotConfigs[i] : null;
      if (!isActive || !conf || !conf.basics || conf.basics.strategy === "정지" || conf.basics.strategy === "-- 선택 안 함 --") {
        appStates.push({ slot: i, active: false, ticker: conf?.basics?.ticker || "-", strategy: "정지", holdings: [] });
        continue;
      }
      const res = typeof window.getBestResult === "function" ? window.getBestResult(window.lastBTResults?.[i], i) : window.lastBTResults?.[i];
      const dailyStates = Array.isArray(res?.dailyStates) ? res.dailyStates : [];
      const lastState = dailyStates.length > 0 ? dailyStates[dailyStates.length - 1] : null;
      let parsed = {};
      if (lastState?.json) {
        try { parsed = JSON.parse(lastState.json); } catch(e){}
      }
      const rawOrders = Array.isArray(res?.rawOrders) ? res.rawOrders : (Array.isArray(res?.orders) ? res.orders : []);
      const buyOrder = rawOrders.find(o => {
        const s = String(o[0] || o.side || "").toLowerCase();
        return s.includes("매수") || s.includes("buy");
      });
      const noi = res?.nextOrderInfo;
      
      const sheetLastDate = typeof window.normalizeSheetStateDate === "function" 
        ? window.normalizeSheetStateDate(localStorage.getItem(`vtotal3_sheet_last_date_${i}_${window.myUserId}`)) 
        : (localStorage.getItem(`vtotal3_sheet_last_date_${i}_${window.myUserId}`) || "");
      const slotDate = (lastState?.date ? String(lastState.date).slice(0, 10) : "") || (sheetLastDate !== "1900-01-01" ? sheetLastDate : "") || (res?.summary?.date || "");

      const activeHoldings = (Array.isArray(res?.inv) && res.inv.length > 0)
        ? res.inv
        : (Array.isArray(parsed.holdings) && parsed.holdings.length > 0 ? parsed.holdings : []);

      const normalizedHoldings = activeHoldings.map(h => ({
        mode: h.mode || "-",
        tier: h.tier !== undefined ? h.tier : "-",
        qty: Number(h.qty || 0),
        buy_price: Number(h.buy_price || h.price || 0),
        buyDate: h.buyDate || ""
      }));

      appStates.push({
        slot: i,
        active: true,
        ticker: String(conf.basics.ticker || "").toUpperCase(),
        strategy: String(res?.currentStrat || conf.basics.strategy || ""),
        date: slotDate,
        asset: lastState ? Number(lastState.asset || 0) : Number(res?.summary?.totalAssets || 0),
        inout: lastState ? Number(lastState.inout || 0) : Number(res?.summary?.inout || 0),
        cash: Number(parsed.cash ?? res?.summary?.cash ?? 0),
        base: Number(parsed.base_principal ?? parsed.base ?? res?.summary?.base ?? 0),
        realPrincipal: Number(parsed.realPrincipal ?? res?.summary?.realPrincipal ?? 0),
        mode: noi?.mode || res?.currentM || "-",
        tier: (noi?.tier !== undefined && noi?.tier !== null) ? noi.tier : (res?.currentT || "-"),
        weight: noi?.weight ? (String(noi.weight).replace('%', '') + '%') : "-",
        buyQty: buyOrder ? Number(buyOrder[3] || buyOrder.qty || 0) : 0,
        buyPrice: buyOrder ? Number(buyOrder[2] || buyOrder.price || 0) : 0,
        orders: rawOrders,
        holdings: normalizedHoldings,
        rawJson: lastState?.json || ""
      });
    }

    // Render Slots Comparison
    const bodyEl = document.getElementById(`${modalId}_body`);
    if (!bodyEl) return;

    let overallAllMatched = true;
    let activeSlotsHtml = "";
    let activeCount = 0;

    const fmtMoney = (v) => `$${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const isMoneyMatch = (a, b) => Math.abs(Number(a || 0) - Number(b || 0)) < 0.05;
    const isExactMatch = (a, b) => String(a ?? "").trim() === String(b ?? "").trim();

    const formatHoldingsHtml = (hList) => {
      if (!Array.isArray(hList) || hList.length === 0) {
        return '<span style="color:var(--text-muted, #94a3b8); font-size:11px;">(보유 티어 없음)</span>';
      }
      const totalQty = hList.reduce((s, h) => s + Number(h.qty || 0), 0);
      const itemsHtml = hList.map(h => `
        <div style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); border-radius:4px; padding:2px 6px; margin:2px 0; font-size:10.5px; display:flex; justify-content:space-between; align-items:center;">
          <span style="font-weight:700; color:var(--primary, #a78bfa);">[${h.mode} ${h.tier}T]</span>
          <span style="font-weight:700; color:var(--text, #fff); margin:0 4px;">${h.qty}주 @ $${Number(h.buy_price || 0).toFixed(2)}</span>
          <span style="color:var(--text-muted, #94a3b8); font-size:9.5px;">(${h.buyDate ? String(h.buyDate).slice(5) : '-'})</span>
        </div>
      `).join('');

      return `
        <div style="text-align:left;">
          <div style="font-weight:800; color:var(--text, #fff); font-size:11.5px; margin-bottom:2px;">총 ${totalQty}주 (${hList.length}건)</div>
          ${itemsHtml}
        </div>
      `;
    };

    const isHoldingsMatch = (arr1, arr2) => {
      if (!Array.isArray(arr1) || !Array.isArray(arr2)) return false;
      if (arr1.length !== arr2.length) return false;
      for (let idx = 0; idx < arr1.length; idx++) {
        const h1 = arr1[idx];
        const h2 = arr2[idx];
        if (String(h1.mode) !== String(h2.mode)) return false;
        if (String(h1.tier) !== String(h2.tier)) return false;
        if (Number(h1.qty) !== Number(h2.qty)) return false;
        if (Math.abs(Number(h1.buy_price) - Number(h2.buy_price)) >= 0.05) return false;
      }
      return true;
    };

    for (let slot = 1; slot <= (window.MAX_SLOTS || 12); slot++) {
      const app = appStates[slot - 1];
      const vm = vmRes.slotStates.find(s => s.slot === slot) || { slot, active: false, holdings: [] };

      if (!app.active && !vm.active) continue;
      activeCount++;

      const isKiwoom = slot <= (window.BrokerService?.KIWOOM_MAX_SLOT || 6);
      const brokerTag = isKiwoom ? `<span style="background:rgba(16,185,129,0.2); color:#10b981; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:800;">키움</span>` : `<span style="background:rgba(168,85,247,0.2); color:#c084fc; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:800;">LS</span>`;

      const holdingsMatch = isHoldingsMatch(app.holdings, vm.holdings);

      // 11대 검증 항목 정의
      const items = [
        { label: "1. 기준 거래일자 (시트 상태일)", appVal: app.date || "-", vmVal: vm.date || "-", match: isExactMatch(app.date, vm.date), format: v => v },
        { label: "2. 총자산 ($)", appVal: app.asset, vmVal: vm.asset, match: isMoneyMatch(app.asset, vm.asset), format: fmtMoney },
        { label: "3. 누적 입출금 ($)", appVal: app.inout, vmVal: vm.inout, match: isMoneyMatch(app.inout, vm.inout), format: fmtMoney },
        { label: "4. 예수금 / 현금 ($)", appVal: app.cash, vmVal: vm.cash, match: isMoneyMatch(app.cash, vm.cash), format: fmtMoney },
        { label: "5. 갱신금 / 갱신원금 ($)", appVal: app.base, vmVal: vm.base, match: isMoneyMatch(app.base, vm.base), format: fmtMoney },
        { label: "6. 실전 투입원금 ($)", appVal: app.realPrincipal, vmVal: vm.realPrincipal, match: isMoneyMatch(app.realPrincipal, vm.realPrincipal), format: fmtMoney },
        { label: "7. 진입 모드 (Mode)", appVal: app.mode, vmVal: vm.mode, match: isExactMatch(app.mode, vm.mode), format: v => v },
        { label: "8. 매수 티어 (Tier)", appVal: app.tier, vmVal: vm.tier, match: isExactMatch(app.tier, vm.tier), format: v => v },
        { label: "9. 금일 매수예정 수량", appVal: app.buyQty, vmVal: vm.buyQty, match: Number(app.buyQty) === Number(vm.buyQty), format: v => `${v}주` },
        { label: "10. 금일 매수예정 단가", appVal: app.buyPrice, vmVal: vm.buyPrice, match: isMoneyMatch(app.buyPrice, vm.buyPrice), format: fmtMoney },
        { label: "11. 매수티어별 보유내역 (JSON holdings)", appVal: app.holdings, vmVal: vm.holdings, match: holdingsMatch, isCustom: true }
      ];

      const slotAllMatch = items.every(it => it.match);
      if (!slotAllMatch) overallAllMatched = false;

      const rowsHtml = items.map(it => {
        const badge = it.match 
          ? `<span style="color:#10b981; font-weight:800; font-size:11px;">✓ 일치</span>`
          : `<span style="color:#ef4444; font-weight:800; font-size:11px; background:rgba(239,68,68,0.15); padding:2px 6px; border-radius:4px;">✗ 불일치</span>`;
        const rowBg = it.match ? "transparent" : "background:rgba(239,68,68,0.08);";

        if (it.isCustom) {
          const appHoldingsHtml = formatHoldingsHtml(it.appVal);
          const vmHoldingsHtml = formatHoldingsHtml(it.vmVal);
          return `
            <tr style="border-bottom:1px solid var(--card-border, rgba(255,255,255,0.06)); ${rowBg}">
              <td style="text-align:left; padding:8px 12px; font-weight:700; color:var(--text, #fff); font-size:11.5px; vertical-align:top;">${it.label}</td>
              <td style="padding:6px 8px; vertical-align:top;">${appHoldingsHtml}</td>
              <td style="padding:6px 8px; vertical-align:top;">${vmHoldingsHtml}</td>
              <td style="text-align:center; vertical-align:top; padding-top:8px;">${badge}</td>
            </tr>
          `;
        }

        const appDisplay = it.format(it.appVal);
        const vmDisplay = it.format(it.vmVal);

        return `
          <tr style="border-bottom:1px solid var(--card-border, rgba(255,255,255,0.06)); height:30px; ${rowBg}">
            <td style="text-align:left; padding-left:12px; font-weight:600; color:var(--text-muted, #94a3b8); font-size:11.5px;">${it.label}</td>
            <td style="font-weight:700; color:var(--text, #fff); font-size:12px;">${appDisplay}</td>
            <td style="font-weight:700; color:var(--text, #fff); font-size:12px;">${vmDisplay}</td>
            <td style="text-align:center;">${badge}</td>
          </tr>
        `;
      }).join('');

      const slotBadge = slotAllMatch
        ? `<span style="background:rgba(16,185,129,0.15); border:1px solid #10b981; color:#10b981; font-size:11px; font-weight:800; padding:3px 8px; border-radius:6px;">✓ 11개 항목 모두 일치</span>`
        : `<span style="background:rgba(239,68,68,0.15); border:1px solid #ef4444; color:#ef4444; font-size:11px; font-weight:800; padding:3px 8px; border-radius:6px;">⚠️ 불일치 발생</span>`;

      activeSlotsHtml += `
        <div style="background:var(--bg, #0f172a); border:1px solid ${slotAllMatch ? 'var(--card-border, rgba(255,255,255,0.1))' : 'rgba(239,68,68,0.5)'}; border-radius:10px; margin-bottom:16px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.2);">
          <div style="padding:10px 14px; background:rgba(255,255,255,0.03); border-bottom:1px solid var(--card-border, rgba(255,255,255,0.08)); display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:8px;">
              ${brokerTag}
              <span style="font-weight:800; font-size:13px; color:var(--text, #fff);">슬롯 #${slot}</span>
              <span style="font-size:12px; color:var(--primary, #8b5cf6); font-weight:700;">${app.ticker || vm.ticker}</span>
              <span style="font-size:11px; color:var(--text-muted, #94a3b8);">(${app.strategy || vm.strategy})</span>
            </div>
            ${slotBadge}
          </div>
          <table style="width:100%; border-collapse:collapse; text-align:center;">
            <thead>
              <tr style="height:28px; background:rgba(0,0,0,0.2); border-bottom:1px solid var(--card-border, rgba(255,255,255,0.08)); color:var(--text-muted, #94a3b8); font-size:10.5px; font-weight:700;">
                <th style="width:34%; text-align:left; padding-left:12px;">검증 항목</th>
                <th style="width:23%;">앱 (브라우저)</th>
                <th style="width:23%;">VM (GCP 서버)</th>
                <th style="width:20%;">판정</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      `;
    }

    bodyEl.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; padding:0 2px;">
        <div style="font-size:12px; color:var(--text, #fff); font-weight:700;">
          총 <span style="color:var(--primary, #8b5cf6); font-weight:800;">${activeCount}</span>개 활성 슬롯 정밀 대조 결과:
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          ${overallAllMatched 
            ? '<span style="background:rgba(16,185,129,0.2); color:#10b981; border:1px solid #10b981; padding:4px 10px; border-radius:6px; font-size:12px; font-weight:800;">🎉 모든 활성 슬롯 100% 일치</span>'
            : '<span style="background:rgba(239,68,68,0.2); color:#ef4444; border:1px solid #ef4444; padding:4px 10px; border-radius:6px; font-size:12px; font-weight:800;">⚠️ 불일치 항목 확인 필요</span>'
          }
          <button onclick="window.openSheetVerificationModal()" style="background:var(--card, #334155); color:var(--text, #fff); border:1px solid var(--card-border, rgba(255,255,255,0.2)); border-radius:6px; padding:4px 8px; font-size:11px; font-weight:700; cursor:pointer;">🔄 다시 검증</button>
        </div>
      </div>
      ${activeSlotsHtml || '<div style="text-align:center; padding:30px; color:var(--text-muted);">활성화된 슬롯이 없습니다.</div>'}
    `;

  } catch (err) {
    const bodyEl = document.getElementById(`${modalId}_body`);
    if (bodyEl) {
      bodyEl.innerHTML = `
        <div style="padding:30px 20px; text-align:center; color:#ef4444;">
          <div style="font-size:28px; margin-bottom:10px;">⚠️</div>
          <div style="font-weight:800; font-size:14px; margin-bottom:6px;">시트 검증 데이터 수집 실패</div>
          <div style="font-size:12px; color:var(--text-muted); margin-bottom:16px;">${err.message}</div>
          <button onclick="window.openSheetVerificationModal()" style="background:var(--primary, #6366f1); color:#fff; border:none; border-radius:6px; padding:6px 16px; font-weight:700; cursor:pointer;">🔄 재시도</button>
        </div>
      `;
    }
  }
};


// 📤 App3: 통합 주문표의 전체 통합 주문을 활성 브로커(키움/LS)로 일괄 전송
window.submitCombinedOrdersToBroker = async function() {
  let orders = window.__latestCombinedOrders;
  
  // Fallback: If __latestCombinedOrders is not populated yet, collect from active slots
  if (!orders || !orders.length) {
    const rawOrders = [];
    const maxSlots = window.MAX_SLOTS || 12;
    for (let i = 1; i <= maxSlots; i++) {
      if (typeof window.isSlotActive === 'function' && !window.isSlotActive(i)) continue;
      if (window.BrokerService && typeof window.BrokerService.isSlotForBroker === 'function' && !window.BrokerService.isSlotForBroker(i)) continue;
      const res = typeof window.getBestResult === 'function' ? window.getBestResult(window.lastBTResults?.[i], i) : window.lastBTResults?.[i];
      if (res && Array.isArray(res.orders)) {
        rawOrders.push(...res.orders);
      }
    }
    const tungFn = typeof window.run_tungchigi_master === 'function' ? window.run_tungchigi_master : null;
    if (tungFn && rawOrders.length > 0) {
      orders = tungFn(rawOrders);
    } else {
      orders = rawOrders;
    }
  }

  if (!orders || !orders.length) {
    alert("전송할 통합 주문이 없습니다.");
    return;
  }
  if (!window.BrokerService) {
    alert("BrokerService가 로드되지 않았습니다.");
    return;
  }

  const broker = window.BrokerService.activeBroker || 'kiwoom';
  const isKiwoom = broker === 'kiwoom';
  const brokerLabel = isKiwoom ? '키움증권' : 'LS증권';
  const slotRange = isKiwoom ? '1~6' : '7~12';

  const symbol = (typeof getSoleActiveTicker === 'function' ? getSoleActiveTicker() : '') || 'SOXL';

  // 실전/모의 계좌 상태 확인
  let modeLine = "";
  try {
    const st = await window.BrokerService.keyStatus(broker);
    if (st && st.success !== false) {
      if (!st.hasKey && !st.registered) {
        alert(`[${brokerLabel}] API 키가 등록되지 않았습니다.\n설정 → 🔐 브로커 API 키에서 먼저 등록하세요.`);
        return;
      }
      modeLine = String(st.paperMode) === "1"
        ? "🟡 모의투자 — 실제 체결되지 않습니다\n\n"
        : "🔴 실전 계좌 — 실제로 체결되어 돈이 나갑니다\n\n";
    }
  } catch (e) {
    modeLine = "⚠️ 실전/모의 확인 실패 — 실전일 수 있습니다\n\n";
  }

  const totalUsd = orders.reduce((s, o) => s + (Number(o[2]) || 0) * (Number(o[3]) || 0), 0);
  const summary = orders.map((o, idx) =>
    `${idx + 1}. ${o[0]}${o[1] ? `(${o[1]})` : ""} ${symbol} ${o[3]}주 @ $${Number(o[2]).toFixed(2)}`
  ).join("\n");

  const confirmMsg = `${modeLine}🏛️ [${brokerLabel} 통합 주문 전송]\n슬롯 범위: 슬롯 ${slotRange}\n총 주문 건수: ${orders.length}건\n총 예상 대금: $${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}\n\n[주문 상세 목록]\n${summary}\n\n위 통합 주문을 ${brokerLabel}에 지금 전송하시겠습니까?`;

  if (!confirm(confirmMsg)) return;

  const btn = document.getElementById('btnSubmitCombinedOrders');
  const orgText = btn ? btn.innerHTML : "";
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `⏳ ${brokerLabel} 주문 전송 중...`;
  }

  const results = [];
  try {
    for (let i = 0; i < orders.length; i++) {
      const o = orders[i];
      const side = o[0] === '매수' ? 'BUY' : 'SELL';
      const ordType = o[1] || 'LOC';
      const price = Number(o[2]) || 0;
      const qty = Number(o[3]) || 0;

      try {
        const res = await window.BrokerService.sendOverseasOrder({
          broker,
          symbol,
          qty,
          price,
          side,
          ordType
        });
        const ok = res && (res.success || res.orderId || res.rsp_cd === "00000" || res.return_code === 0);
        const ordNo = res?.orderId || res?.ord_no || res?.OrdNo || "";
        const ordNoStr = ordNo ? ` (주문번호: ${ordNo})` : "";
        const errMsg = res?.error || res?.reason || res?.rsp_msg || res?.message || "실패";
        results.push(`[${i + 1}/${orders.length}] ${side}(${ordType}) $${price.toFixed(2)} x${qty}주 → ${ok ? '✅ 접수완료' + ordNoStr : '❌ ' + errMsg}`);
      } catch (err) {
        results.push(`[${i + 1}/${orders.length}] ${side}(${ordType}) $${price.toFixed(2)} x${qty}주 → ❌ ${err.message}`);
      }
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = orgText;
    }
  }

  // 주문 전송 후 캐시 무효화 및 화면 갱신
  try {
    if (window.BrokerReconcile && typeof window.BrokerReconcile.invalidate === 'function') {
      window.BrokerReconcile.invalidate();
    }
    if (typeof window.refreshOrderStatusCache === 'function') {
      window.refreshOrderStatusCache(true);
    }
  } catch (e) {
    console.warn("Status refresh error after submit:", e);
  }

  alert(`[${brokerLabel} 통합 주문 전송 결과]\n\n` + results.join("\n"));
};
