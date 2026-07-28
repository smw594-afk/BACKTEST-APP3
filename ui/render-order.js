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

    let base = window.BROKER_API_BASE;
    if (!base || typeof base !== 'string' || !base.startsWith('http')) {
      base = (window.BrokerService && typeof window.BrokerService.getApiBase === 'function')
        ? window.BrokerService.getApiBase()
        : (window.WORKER3_URL || "https://autumn-limit-001e-3.smw594.workers.dev");
    }

    // VM 프록시 예약 상태 조회는 Worker3에 미구현 → 요청 생략

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

function getOrderStatusBadgeMarkup(order) {
  // order: [side('매수'/'매도'), mode('MOC'/'LOC'등), price, qty, symbol, slot]
  if (!order) return "";
  const side = order[0] === '매수' ? 'buy' : 'sell';
  const price = parseFloat(order[2]) || 0;
  const qty = parseInt(order[3], 10) || 0;
  const symbol = String(order[4] || "").toUpperCase();

  const cache = window.orderStatusCache || {};

  // 1. 체결 완료 확인 (증권사 당일 체결 내역)
  if (Array.isArray(cache.filledOrders) && cache.filledOrders.length > 0) {
    const matchedFill = cache.filledOrders.find(f => {
      const fSym = String(f.symbol || f.stk_cd || "").toUpperCase();
      const fSide = String(f.side || "").toLowerCase();
      return (fSym === symbol || !symbol) && (fSide.includes(side) || fSide === side);
    });
    if (matchedFill) {
      return `<span style="color:#4ade80 !important; font-size:9px; font-weight:800; margin-left:3px;" title="증권사 체결 완료">(체결)</span>`;
    }
  }

  // 2. 주문 완료 / 미체결 확인 (증권사 미체결 잔고)
  if (Array.isArray(cache.unfilledOrders) && cache.unfilledOrders.length > 0) {
    const matchedUnfilled = cache.unfilledOrders.find(u => {
      const uSym = String(u.symbol || u.stk_cd || "").toUpperCase();
      const uSide = String(u.side || "").toLowerCase();
      return (uSym === symbol || !symbol) && (uSide.includes(side) || uSide === side);
    });
    if (matchedUnfilled) {
      return `<span style="color:#60a5fa !important; font-size:9px; font-weight:800; margin-left:3px;" title="증권사 접수 완료 (미체결)">(주문)</span>`;
    }
  }

  // 3. 예약 완료 확인 (VM 프록시 21:50 예약 저장소)
  if (cache.vmSaved) {
    return `<span style="color:#fbbf24 !important; font-size:9px; font-weight:800; margin-left:3px;" title="21:50 KST 자동주문 예약 완료">(예약)</span>`;
  }

  // 기본값 (21:40 전 앱 실행 시 자동 예약 전송되므로 예약완료 표시)
  return `<span style="color:#fbbf24 !important; font-size:9px; font-weight:700; margin-left:3px;" title="자동주문 예약 상태">(예약)</span>`;
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
  for (let i = 1; i <= window.MAX_SLOTS; i++) {
    if (!window.isSlotActive(i)) continue;
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
  const activeTickers = [];
  for (let i = 1; i <= window.MAX_SLOTS; i++) {
    if (window.isSlotActive(i)) {
      const tk = window.slotConfigs[i]?.basics?.ticker || "";
      if (tk) activeTickers.push(tk);
    }
  }
  const uniqueTickers = Array.from(new Set(activeTickers));
  if (uniqueTickers.length > 1) {
    tbody.innerHTML = "<tr><td colspan='3' style='padding:20px; color:#ef4444; text-align:center; font-weight:bold;'>⚠️ 티커 불일치 오류</td></tr>";
    const buyQtyEl = document.getElementById('combinedBuyQtyVal');
    const sellQtyEl = document.getElementById('combinedSellQtyVal');
    const pgEl = document.getElementById('combinedProgressVal');
    if (buyQtyEl) buyQtyEl.textContent = "0";
    if (sellQtyEl) sellQtyEl.textContent = "0";
    if (pgEl) pgEl.textContent = "-";
    return;
  }

  const cacheUserId = window.myUserId || localStorage.getItem('vtotal3_id') || '';
  const cacheKey = cacheUserId ? `vtotal3_snap_combined_orders_${cacheUserId}` : '';
  const viewCacheKey = cacheUserId ? `vtotal3_combined_order_view_${cacheUserId}` : '';

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
    tbody.innerHTML = "<tr><td colspan='3' style='padding:20px; color:#64748b; text-align:center;'>통합 주문 내역이 없습니다</td></tr>";
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
    return `<tr><td class="${cls}" style="width:40%; text-align:center;">${sideText}</td><td class="${cls}" style="width:34%; text-align:center;">$${Number(o[2]).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td><td class="${cls}" style="width:26%; text-align:center;">${o[3]}주</td></tr>`;
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
    + (window.BrokerService ? `<tr><td colspan="3" style="padding:6px 4px;">
        
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