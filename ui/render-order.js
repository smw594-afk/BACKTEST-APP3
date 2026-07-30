// ── 주문표 실시간 증권사/VM 예약 상태 관리 ──
window.orderStatusCache = window.orderStatusCache || {
  vmSaved: false,
  vmOrders: [],
  unfilledOrders: [],
  filledOrders: [],
  lastUpdated: 0
};

async function refreshOrderStatusCache() {
  try {
    const userId = window.myUserId || localStorage.getItem('vtotal3_id') || '';
    if (!userId) return;

    // ⚠️ 2026-07-31까지 이 함수가 lastUpdated를 갱신하지 않아 refreshOrderViewUI()의
    // 60초 쓰로틀(Date.now() - lastUpdated > 60000)이 항상 통과했다 — renderOrderViewSlot()이
    // 슬롯마다 매 렌더링 시 refreshOrderViewUI()를 호출하는 구조라, 초당 여러 번 재조회가
    // 나가서 LS COSAQ00102/키움 ust21150이 유량 초과(429)에 걸렸다(사용자 실증).
    // 시작 시점에 찍어야 느린/실패 응답 중에도 중복 재진입을 막는다.
    window.orderStatusCache.lastUpdated = Date.now();

    let base = window.BROKER_API_BASE;
    if (!base || typeof base !== 'string' || !base.startsWith('http')) {
      base = (window.BrokerService && typeof window.BrokerService.getApiBase === 'function')
        ? window.BrokerService.getApiBase()
        : (window.WORKER3_URL || "https://autumn-limit-001e-3.smw594.workers.dev");
    }

    // VM에 예약된 주문표(자동주문 대기분) — "(예약)" 배지의 근거.
    if (window.BrokerService && typeof window.BrokerService.fetchPendingOrders === 'function') {
      try {
        const resP = await window.BrokerService.fetchPendingOrders();
        if (resP && resP.ok) {
          window.orderStatusCache.vmOrders = Array.isArray(resP.orders) ? resP.orders : [];
          window.orderStatusCache.vmSaved = window.orderStatusCache.vmOrders.length > 0;
          // 생성 창이 지났는데도 주문표가 없으면 "아직 생성 전"이 아니라 실패다.
          window.orderStatusCache.vmOverdue = !!(resP.backtest && resP.backtest.overdue);
        }
      } catch (e) {}
    }

    // 증권사 미체결/체결 내역 조회 (100% try-catch)
    if (window.BrokerService) {
      const activeBr = (typeof window.BrokerService.activeBroker === 'string' && window.BrokerService.activeBroker.length > 1)
        ? window.BrokerService.activeBroker
        : 'kiwoom';

      try {
        const res1 = await window.BrokerService.fetchUnfilledOrders(activeBr);
        if (res1 && res1.success && Array.isArray(res1.unfilled)) {
          window.orderStatusCache.unfilledOrders = res1.unfilled;
        }
      } catch (e) {}

      try {
        const res2 = await window.BrokerService.fetchOverseasFills(activeBr);
        if (res2 && res2.success && Array.isArray(res2.executions)) {
          window.orderStatusCache.filledOrders = res2.executions;
        }
      } catch (e) {}
    }
  } catch (e) {
    // Top-level error boundary
  }
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

// 앱 통합 주문표의 한 줄이 GCP 봇에 예약된 주문과 같은지 표시한다.
// 앱을 켰을 때 눈으로 바로 확인되므로 별도 경고 팝업이 필요 없다.
// order: [side('매수'/'매도'), mode('LOC'/'MOC'), price, qty]
function getVmMatchMarkup(order) {
  const cache = window.orderStatusCache || {};
  const vm = Array.isArray(cache.vmOrders) ? cache.vmOrders : null;
  if (!vm || vm.length === 0) {
    // 생성 창이 이미 지났는데도 비어 있으면 봇이 주문표를 못 만든 것이다 — 빨갛게 알린다.
    if (cache.vmOverdue) {
      return `<span style="color:#ef4444; font-size:9px; font-weight:800;" title="GCP 봇이 오늘 주문표를 만들지 못했습니다(시트 종가 미반영 등). 자동주문이 나가지 않습니다.">미생성</span>`;
    }
    // 아직 생성 시각 전이면 정상이므로 판정하지 않는다 — 섣불리 겁주지 않는다.
    return `<span style="color:#64748b; font-size:9px;" title="아직 GCP 주문표 생성 전">-</span>`;
  }
  const side = order[0] === '매수' ? 'buy' : 'sell';
  const ordType = String(order[1] || '').toUpperCase() === 'MOC' ? 'MOC' : 'LOC';
  const price = Math.round((parseFloat(order[2]) || 0) * 100) / 100;
  const qty = parseInt(order[3], 10) || 0;

  const hit = vm.find(v =>
    String(v.side).toLowerCase() === side &&
    String(v.ordType || '').toUpperCase() === ordType &&
    Number(v.qty) === qty &&
    (ordType === 'MOC' || Math.abs(Number(v.price) - price) < 0.005));

  if (hit) {
    return `<span style="color:#10b981; font-size:9px; font-weight:800;" title="GCP 봇 예약분과 일치">일치</span>`;
  }
  // 같은 방향·유형인데 값이 다른 게 있으면 무엇이 다른지 알려준다.
  const near = vm.find(v => String(v.side).toLowerCase() === side && String(v.ordType || '').toUpperCase() === ordType);
  const detail = near
    ? `GCP: ${near.qty}주 @$${Number(near.price).toFixed(2)} / 앱: ${qty}주 @$${price.toFixed(2)}`
    : `GCP 예약에 ${ordType}${order[0]} 없음`;
  return `<span style="color:#ef4444; font-size:9px; font-weight:800;" title="${detail}">불일치</span>`;
}

// 통합/슬롯 주문표의 행은 [방향, 유형, 가격, 수량] 4개뿐이라 종목명이 없다.
// 통합 주문표는 티커 불일치 검사로 단일 종목이 보장되므로 활성 슬롯에서 끌어온다.
// (심볼을 못 구하면 배지를 못 붙이는데, 그러면 예약/주문/체결이 전부 사라진다.)
function getSoleActiveTicker() {
  const set = new Set();
  const max = window.MAX_SLOTS || 6;
  for (let i = 1; i <= max; i++) {
    if (typeof window.isSlotActive === 'function' && !window.isSlotActive(i)) continue;
    const tk = String(window.slotConfigs?.[i]?.basics?.ticker || "").toUpperCase();
    if (tk) set.add(tk);
  }
  return set.size === 1 ? Array.from(set)[0] : "";
}

function getOrderStatusBadgeMarkup(order) {
  // order: [side('매수'/'매도'), mode('MOC'/'LOC'등), price, qty, symbol?, slot?]
  if (!order) return "";
  const side = order[0] === '매수' ? 'buy' : 'sell';
  const qty = parseInt(order[3], 10) || 0;
  const symbol = String(order[4] || "").toUpperCase() || getSoleActiveTicker();
  if (!symbol) return ""; // 종목을 특정할 수 없으면 대조하지 않는다(과거엔 전부 매칭됐다)

  const cache = window.orderStatusCache || {};
  const sideOf = (v) => String(v || "").toLowerCase();
  const targetDate = orderTableDateStr(); // 주문표가 겨냥하는 거래일(= 다음 세션)

  // 1) 체결 — "주문표 대상 거래일"의 체결만 인정한다.
  //    대상일을 못 구하면 아예 판정하지 않는다(엉뚱한 날 체결을 붙이느니 무표시가 낫다).
  if (targetDate && Array.isArray(cache.filledOrders)) {
    const hit = cache.filledOrders.find(f =>
      String(f.symbol || f.stk_cd || "").toUpperCase() === symbol &&
      sideOf(f.side).includes(side) &&
      String(f.marketDate || "") === targetDate);
    if (hit) {
      return `<span style="color:#4ade80 !important; font-size:9px; font-weight:800; margin-left:3px;" title="증권사 체결 완료 (${targetDate})">(체결)</span>`;
    }
  }

  // 2) 주문 — 증권사에 접수되어 미체결로 남아 있을 때.
  if (Array.isArray(cache.unfilledOrders)) {
    const hit = cache.unfilledOrders.find(u =>
      String(u.symbol || u.stk_cd || "").toUpperCase() === symbol &&
      sideOf(u.side).includes(side));
    if (hit) {
      return `<span style="color:#60a5fa !important; font-size:9px; font-weight:800; margin-left:3px;" title="증권사 접수 완료 (미체결)">(주문)</span>`;
    }
  }

  // 3) 예약 — VM(GCP)에 오늘 주문표가 저장되어 자동주문을 기다리는 상태.
  //    실제 저장분과 대조한다. 예전엔 무조건 "(예약)"을 반환해서, 올라가지도 않은
  //    주문이 예약된 것처럼 보였다.
  if (Array.isArray(cache.vmOrders)) {
    const ordType = String(order[1] || "").toUpperCase() === "MOC" ? "MOC" : "LOC";
    const hit = cache.vmOrders.find(v =>
      String(v.symbol || "").toUpperCase() === symbol &&
      sideOf(v.side) === side &&
      String(v.ordType || "").toUpperCase() === ordType &&
      (!qty || Number(v.qty) === qty));
    if (hit) {
      return `<span style="color:#fbbf24 !important; font-size:9px; font-weight:800; margin-left:3px;" title="GCP 자동주문 예약 완료 (개장 10분 전 발주)">(예약)</span>`;
    }
  }

  // 어디에도 없으면 배지를 붙이지 않는다(= 아직 예약 전).
  return "";
}

// ui/render-order.js - 주문표 렌더링만 담당
// 필요한 데이터는 매개변수로 받음, 전역은 window에서 읽음

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
    if (i === 1 && !currentDate) currentDate = res.orderDateStr || "";
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
    if (!viewCacheKey) return false;
    try {
      const cachedView = JSON.parse(localStorage.getItem(viewCacheKey) || 'null');
      if (cachedView?.html && isFreshCombinedSnapshot(cachedView)) {
        tbody.innerHTML = cachedView.html;
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

  tbody.innerHTML = sortedOrders.map(o => {
    const cls = o[0] === '매수' ? 'buy' : 'sell';
    const statusBadge = getOrderStatusBadgeMarkup(o);
    const sideText = ((o[1] === 'MOC' || o[1] === 'LOC') ? o[1] + o[0] : o[0]) + statusBadge;
    const m = getVmMatchMarkup(o);
    return `<tr><td style="width:18%; text-align:center;">${m}</td><td class="${cls}" style="width:33%; text-align:center;">${sideText}</td><td class="${cls}" style="width:28%; text-align:center;">$${Number(o[2]).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td><td class="${cls}" style="width:21%; text-align:center;">${o[3]}주</td></tr>`;
  }).join('');

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
      if (window.isSlotActive(i)) {
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
    const statusBadge = getOrderStatusBadgeMarkup(o);
    const sideText = ((o[1] === 'MOC' || o[1] === 'LOC') ? o[1] + o[0] : o[0]) + statusBadge;
    return `<tr><td class="${cls}" style="width:40%; text-align:center;">${sideText}</td><td class="${cls}" style="width:34%; text-align:center;">$${Number(o[2]).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td><td class="${cls}" style="width:26%; text-align:center;">${o[3]}주</td></tr>`;
  }).join('')
    // 📤 App3: per-slot REST submit row (kiwoom slots 1~3 / LS slots 4~6 via BrokerService)
    // ⚠️ 이 버튼이 주문이 나가는 유일한 경로다. 비우면 주문 전송 수단이 사라진다.
    + (window.BrokerService ? `<tr><td colspan="3" style="padding:6px 4px; text-align:center;">
        <button onclick="window.submitSlotOrdersToBroker(${slotNum})"
          style="width:100%; padding:6px 8px; border:none; border-radius:6px; cursor:pointer;
                 background:linear-gradient(135deg, ${Number(slotNum) <= 3 ? '#10b981, #047857' : '#a855f7, #7e22ce'});
                 color:#fff; font-size:11px; font-weight:800; letter-spacing:0.2px;">
          📤 ${Number(slotNum) <= 3 ? '키움' : 'LS'} 슬롯${slotNum} 주문전송
        </button>
      </td></tr>` : '');
}

function renderOrderViewSlot(res, slotNum) {
  if (!res) {
    renderOrderTableSlot([], slotNum);
    window.UI?.holdings?.renderTableSlot?.([], "", slotNum);
    const nameEl = document.getElementById('orderSlot' + slotNum + 'Name');
    if (nameEl) nameEl.innerHTML = "";
    const holdingsNameEl = document.getElementById('holdingsSlot' + slotNum + 'Name');
    if (holdingsNameEl) holdingsNameEl.innerHTML = "";
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

  if (res.nextOrderInfo) {
    const modeMap = { 'Middle': 'Mid1', 'Middle2': 'Mid2', 'Middle3': 'Mid3', 'SF': 'SF', 'AG': 'AG' };
    const elTier = document.getElementById('tierCountVal' + slotNum);
    const elMode = document.getElementById('modeCountVal' + slotNum);
    const elWeight = document.getElementById('weightCountVal' + slotNum);
    const elQty = document.getElementById('qtyCountVal' + slotNum);

    if (elTier) elTier.innerText = res.nextOrderInfo.tier;
    if (elMode) elMode.innerText = modeMap[res.nextOrderInfo.mode] || res.nextOrderInfo.mode;
    if (elWeight) elWeight.innerText = res.nextOrderInfo.weight + '%';
    if (elQty) elQty.innerText = res.nextOrderInfo.qty;

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
  }

  const orderDate = res.orderDateStr || "";
  if (slotNum === 1) window.currentOrderDate = orderDate;
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

  const brokerLabel = Number(slotNum) <= 3 ? "키움" : "LS증권";
  const broker = Number(slotNum) <= 3 ? "kiwoom" : "ls";

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