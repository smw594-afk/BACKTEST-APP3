// ui/render-misc.js - 기타 UI 함수들 (최종 분리 - 마지막 단계)
// 2024년 분리된 대형 UI 함수 모음

// 🔧 폴리필: script.js가 로드되기 전에 호출되는 함수들 보호
if (typeof setLED === 'undefined') {
  var setLED = (status) => {
    // script.js 로드 전 호출 시 무시
  };
}

// 💰 소수점 오차 방지: 금액을 2자리로 반올림 (10999.9999999998 → 11000.00)
function roundToTwoDecimals(num) {
  if (typeof num !== 'number') return num;
  return Math.round(num * 100) / 100;
}

// 🔢 스냅샷의 모든 금액 필드를 소수점 2자리로 반올림
function normalizeSnapAmounts(snap) {
  if (!snap) return snap;
  const normalized = { ...snap };
  if (normalized.summary) {
    normalized.summary = { ...normalized.summary };
    ['totalAssets', 'cash', 'base', 'base_principal', 'realPrincipal', 'currPrice', 'totalProfit', 'dailyProfit', 'yield'].forEach(key => {
      if (typeof normalized.summary[key] === 'number') {
        normalized.summary[key] = roundToTwoDecimals(normalized.summary[key]);
      }
    });
  }
  if (Array.isArray(normalized.chartBalances)) {
    normalized.chartBalances = normalized.chartBalances.map(b => roundToTwoDecimals(b));
  }
  if (Array.isArray(normalized.chartInout)) {
    normalized.chartInout = normalized.chartInout.map(i => roundToTwoDecimals(i));
  }
  if (Array.isArray(normalized.dailyData)) {
    normalized.dailyData = normalized.dailyData.map(d => ({ ...d, profit: roundToTwoDecimals(d.profit), balance: roundToTwoDecimals(d.balance) }));
  }
  if (Array.isArray(normalized.monthlyData)) {
    normalized.monthlyData = normalized.monthlyData.map(d => ({ ...d, profit: roundToTwoDecimals(d.profit), balance: roundToTwoDecimals(d.balance) }));
  }
  if (Array.isArray(normalized.yearlyData)) {
    normalized.yearlyData = normalized.yearlyData.map(d => ({ ...d, profit: roundToTwoDecimals(d.profit), balance: roundToTwoDecimals(d.balance) }));
  }
  return normalized;
}

function getLatestSlotSnapshotSavedAt(userId) {
  if (!userId) return 0;
  let latest = 0;
  for (let i = 1; i <= MAX_SLOTS; i++) {
    try {
      const snapStr = localStorage.getItem(`vtotal3_snap${i}_${userId}`);
      if (!snapStr) continue;
      const parsed = JSON.parse(snapStr);
      const savedAt = Number(parsed?.savedAt || 0);
      if (savedAt > latest) latest = savedAt;
    } catch (e) { }
  }
  return latest;
}

function isFreshCombinedOrderSnapshot(snapshot, userId) {
  if (!snapshot || !userId) return false;
  const combinedSavedAt = Number(snapshot.savedAt || 0);
  const latestSlotSavedAt = getLatestSlotSnapshotSavedAt(userId);
  const snapshotSig = snapshot.orderSignature || "";
  if (snapshotSig) {
    try {
      let currentOrders = [];
      let currentDate = "";
      for (let i = 1; i <= MAX_SLOTS; i++) {
        const slotStr = localStorage.getItem(`vtotal3_snap${i}_${userId}`);
        if (!slotStr) continue;
        const slotSnap = JSON.parse(slotStr);
        if (i === 1 && !currentDate) currentDate = slotSnap.orderDateStr || "";
        if (Array.isArray(slotSnap?.rawOrders) && slotSnap.rawOrders.length > 0) currentOrders.push(...slotSnap.rawOrders);
        else if (Array.isArray(slotSnap?.orders) && slotSnap.orders.length > 0) currentOrders.push(...slotSnap.orders);
      }
      const currentSig = `${currentDate}::${currentOrders.map(o => [o?.[0] || "", o?.[1] || "", Number(o?.[2] || 0).toFixed(2), Number(o?.[3] || 0)].join('|')).join('||')}`;
      return snapshotSig === currentSig;
    } catch (e) {
      return true;
    }
  }
  if (!combinedSavedAt) return true;
  return combinedSavedAt >= latestSlotSavedAt;
}

// 1. DOM 동적 생성
function generateDynamicDOM() {
  const orderContainer = document.getElementById('dualOrderContainer');
  const tableContainer = document.getElementById('periodTableFlex');

  if (orderContainer) {
    let orderHtml = `
      <div id="combinedOrderSlot" class="order-slot-container" style="display:none; border-right: 1px solid rgba(255,255,255,0.1); padding-right: 4px;">
        <div class="order-scroll-area slim-scroll">
          <div id="combinedOrderView" class="view-pane-active">
            <div id="combinedOrderPanelTitle" class="slot-title slot-title-sm" style="color:#fbbf24; cursor:pointer; font-size:calc(var(--app-font-size, 10.5px) + 2px);" onclick="window.UI.toggles.toggleSortOrder()" title="클릭하여 오름/내림 정렬 토글">통합 주문표</div>
            <table class="data-table">
              <thead><tr><th style="width:18%; text-align:center;" title="앱 주문표와 GCP 봇 예약분이 같은지">일치</th><th style="width:33%; text-align:center;">종류</th><th style="width:28%; text-align:center;">가격</th><th style="width:21%; text-align:center;">수량</th></tr></thead>
              <tbody id="combinedOrderBody"><tr><td colspan="4" class="table-empty-cell">주문 없음</td></tr></tbody>
            </table>
          </div>
          <div id="combinedHoldingsView" class="view-pane-hidden">
            <div class="slot-title slot-title-sm" style="color:#fbbf24;">통합 보유 현황</div>
            <table class="data-table">
              <thead><tr><th style="width:52px;">일치</th><th>투자법</th><th>진입일</th><th>청산일</th><th>모드/T</th><th>진입가</th><th>청산가</th><th>수량</th><th>T수익금</th></tr></thead>
              <tbody id="combinedHoldingsBody"><tr><td colspan="9" class="table-empty-cell">보유 없음</td></tr></tbody>
            </table>
          </div>
        </div>
        <div class="tier-footer" id="combinedTierFooter" style="display:flex; flex-direction:column; align-items:center; gap:4px; min-height:20px; padding-top:4px;">
          <div id="combinedOrderSummaryRow1" style="display:flex; justify-content:center; gap:8px; width:100%; font-weight:700;">
            <div>BUY: <span id="combinedBuyQtyVal" style="color:var(--danger) !important; font-weight:800;">-</span></div>
            <div>SELL: <span id="combinedSellQtyVal" style="color:var(--success) !important; font-weight:800;">-</span></div>
            <div>PG: <span id="combinedProgressVal" style="color:#fbbf24 !important; font-weight:800;">-</span></div>
          </div>
          <div id="combinedPerfRatesGroup" style="display:none; justify-content:center; gap:8px; flex-wrap:wrap; width:100%; font-weight:700;">
            <div>Y: <span id="combinedYVal" style="font-weight:800;">-</span></div>
            <div>M: <span id="combinedMVal" style="font-weight:800;">-</span></div>
            <div>D: <span id="combinedDVal" style="font-weight:800;">-</span></div>
            <div>DD: <span id="combinedDDVal" style="font-weight:800;">-</span></div>
          </div>
        </div>
      </div>`;
    for (let i = 1; i <= MAX_SLOTS; i++) {
      const borderClass = i > 1 ? ' has-border-left' : '';
      orderHtml += `
        <div id="orderSlot${i}" class="order-slot-container${borderClass}">
          <div id="orderScroll${i}" class="order-scroll-area slim-scroll">
            <div id="orderView${i}" class="${window.isOrderView === false ? 'view-pane-hidden' : 'view-pane-active'}">
              <div class="slot-title slot-title-sm" id="orderSlot${i}Name" style="color:${SLOT_COLORS[(i - 1) % SLOT_COLORS.length]}; cursor:pointer;" onclick="window.UI.toggles.toggleSortOrder()" title="클릭하여 오름/내림 정렬 토글"></div>
              <table class="data-table">
                <thead><tr><th style="width:40%; text-align:center;">구분</th><th style="width:34%; text-align:center;">가격</th><th style="width:26%; text-align:center;">수량</th></tr></thead>
                <tbody id="orderBody${i}"><tr><td colspan="3" class="table-empty-cell">데이터 대기 중...</td></tr></tbody>
              </table>
            </div>
            <div id="holdingsView${i}" class="${window.isOrderView === false ? 'view-pane-active' : 'view-pane-hidden'}">
              <div class="slot-title slot-title-sm" id="holdingsSlot${i}Name" style="color:${SLOT_COLORS[(i - 1) % SLOT_COLORS.length]};"></div>
              <table class="data-table">
                <thead><tr><th>투자법</th><th>진입일</th><th>청산일</th><th>모드/T</th><th>진입가</th><th>청산가</th><th>수량</th><th>T수익금</th></tr></thead>
                <tbody id="holdingsBody${i}"><tr><td colspan="8" class="table-empty-cell">데이터 대기 중...</td></tr></tbody>
              </table>
            </div>
          </div>
          <div class="tier-footer" id="tierFooter${i}">
            <div>T: <span id="tierCountVal${i}" class="tier-footer-val">-</span></div>
            <div>M: <span id="modeCountVal${i}" class="tier-footer-val">-</span></div>
            <div>W: <span id="weightCountVal${i}" class="tier-footer-val">-</span></div>
            <div>Q: <span id="qtyCountVal${i}" class="tier-footer-val">-</span></div>
            <div class="tier-footer-pg">PG: <span id="progressVal${i}" class="tier-footer-val" style="color:#fbbf24 !important; font-weight:800;">-</span></div>
          </div>
        </div>`;
    }
    orderContainer.innerHTML = orderHtml;

    // 통합 모드의 주문표 컨테이너는 서버/엔진 로딩을 기다리지 않고 먼저 노출한다.
    // 기존에는 inline display:none 상태로 만들어진 뒤 updateSlotsVisibility()가
    // 늦게 실행되어, 캐시가 있어도 통합 주문표 전체가 로딩 완료 후에만 보였다.
    try {
      const bootUserId = window.myUserId || localStorage.getItem('vtotal3_id') || '';
      const bootCombinedMode = bootUserId
        ? (localStorage.getItem(`vtotal3_combined_mode_${bootUserId}`) || 'combined')
        : 'combined';
      const combinedSlot = document.getElementById('combinedOrderSlot');
      if (combinedSlot && (bootCombinedMode === 'combined' || bootCombinedMode === 'combined_normal')) {
        combinedSlot.style.display = 'flex';
      }
    } catch (e) { }

    // 로그인/서버 초기화보다 먼저 통합 주문표 캐시를 DOM에 주입한다.
    // 전용 캐시가 아직 없으면 기존 슬롯 스냅샷에서 즉시 승격한다.
    // ⚠️ 2026-07-31: 캐시 키에 브로커를 포함시킨다(render-order.js의 renderCombinedOrderBook과
    // 동일 규칙) — 안 그러면 LS 전환 직후 이 조기 주입이 키움의 옛 스냅샷을 그대로 밀어넣는다.
    try {
      const cachedUserId = window.myUserId || localStorage.getItem('vtotal3_id') || '';
      const cachedBroker = (window.BrokerService && window.BrokerService.activeBroker) || 'kiwoom';
      const combinedBody = document.getElementById('combinedOrderBody');
      const viewStr = cachedUserId ? localStorage.getItem(`vtotal3_combined_order_view_${cachedUserId}_${cachedBroker}`) : null;
      const cachedView = viewStr ? JSON.parse(viewStr) : null;
      if (combinedBody && cachedView?.html && isFreshCombinedOrderSnapshot(cachedView, cachedUserId)) combinedBody.innerHTML = cachedView.html;

      let cachedOrders = null;
      let cachedOrdersAlreadyCombined = false;
      let cachedCombinedSnapshot = null;
      if (cachedUserId) {
        const combinedStr = localStorage.getItem(`vtotal3_snap_combined_orders_${cachedUserId}_${cachedBroker}`);
        const combinedParsed = combinedStr ? JSON.parse(combinedStr) : null;
        if (combinedParsed?.type === 'final' && Array.isArray(combinedParsed.orders) && combinedParsed.orders.length > 0 && isFreshCombinedOrderSnapshot(combinedParsed, cachedUserId)) {
          cachedOrders = combinedParsed.orders;
          cachedOrdersAlreadyCombined = true;
          cachedCombinedSnapshot = combinedParsed;
        } else if (combinedParsed?.type === 'raw' && Array.isArray(combinedParsed.orders) && combinedParsed.orders.length > 0 && isFreshCombinedOrderSnapshot(combinedParsed, cachedUserId)) {
          cachedOrders = combinedParsed.orders;
          cachedCombinedSnapshot = combinedParsed;
        } else if (Array.isArray(combinedParsed) && combinedParsed.length > 0 && isFreshCombinedOrderSnapshot(combinedParsed, cachedUserId)) {
          cachedOrders = combinedParsed;
          cachedCombinedSnapshot = combinedParsed;
        }

        if (!cachedOrders) {
          cachedOrders = [];
          for (let i = 1; i <= MAX_SLOTS; i++) {
            if (window.BrokerService && !window.BrokerService.isSlotForBroker(i, cachedBroker)) continue;
            const slotStr = localStorage.getItem(`vtotal3_snap${i}_${cachedUserId}`);
            if (!slotStr) continue;
            const slotSnap = JSON.parse(slotStr);
            cachedOrders.push(...(slotSnap.rawOrders || slotSnap.orders || []));
          }
        }

        const useCachedCombined = cachedOrders.length > 0 && (!cachedCombinedSnapshot || isFreshCombinedOrderSnapshot(cachedCombinedSnapshot, cachedUserId));
        if (useCachedCombined) {
          const sourceOrderDate = window.currentOrderDate || window.lastBTResults[1]?.orderDateStr || "";
          const orderSignature = `${sourceOrderDate}::${cachedOrders.map(o => [o?.[0] || "", o?.[1] || "", Number(o?.[2] || 0).toFixed(2), Number(o?.[3] || 0)].join('|')).join('||')}`;
          localStorage.setItem(`vtotal3_snap_combined_orders_${cachedUserId}_${cachedBroker}`, JSON.stringify({
            type: cachedOrdersAlreadyCombined ? 'final' : 'raw',
            orders: cachedOrders,
            savedAt: Date.now(),
            sourceOrderDate,
            orderSignature
          }));
          window.UI?.order?.renderCombinedOrderBook?.(cachedOrders, cachedOrdersAlreadyCombined);
        }
      }
    } catch (e) {
      console.warn('통합 주문표 선복원 실패:', e);
    }
  }

  if (tableContainer) {
    generatePeriodTableDOM('periodTableFlex', '', periodViewState);
  }

  // 성과 탭 전용 테이블들 동적 생성
  generatePeriodTableDOM('perfYearlyTableFlex', 'Yearly', 1);
  generatePeriodTableDOM('perfMonthlyTableFlex', 'Monthly', 0);
  generatePeriodTableDOM('perfDailyTableFlex', 'Daily', 2);
}

function showOrderView() {
  restoreFromPerfLayout();

  // ⭐️ 수동 백테스트 중이었다면 다른 화면이나 홈 이동 시 원래 실전 설정과 캐시로 즉시 복귀
  if (isManualBacktestMode || window.isManualBacktestMode) {
    if (typeof restoreLocalCache === 'function') restoreLocalCache();
    showToast("실전 데이터 모드로 복귀했습니다.", "🔄");
  }

  isStatsMode = false;
  window.isStatsMode = false;
  window.isOrderView = true;  // 명시적으로 window 객체에 설정
  isOrderView = true;  // 지역 참조도 함께 설정
  window.showIndividualHoldings = false;  // 보유현황 모드 초기화 (홈은 항상 주문표)

  const orderView = document.getElementById('panelOrder');
  const statsView = document.getElementById('panelStats');
  const perfView = document.getElementById('panelMonthly');
  const perfChart1 = document.getElementById('panelMonthlyChart');
  const perfChart2 = document.getElementById('panelDailyChart');
  const panelHistory = document.getElementById('panelHistory');
  const panelChart = document.getElementById('panelChart');
  const panelAnalysis = document.getElementById('panelAnalysisView');

  // 홈화면: 상단 주문표(panelOrder), 중단 년별자산증감(panelMonthly), 하단 성과추이(panelChart) 표시
  if (orderView) {
    orderView.classList.remove('hidden');
    orderView.style.display = '';
  }
  if (perfView) {
    perfView.classList.remove('hidden');
    perfView.style.display = '';
  }
  if (panelChart) {
    panelChart.classList.remove('hidden');
    panelChart.style.display = '';
  }

  if (statsView) {
    statsView.classList.add('hidden');
    statsView.style.display = 'none';
  }
  if (panelHistory) {
    panelHistory.classList.add('hidden');
    panelHistory.style.display = 'none';
  }
  if (perfChart1) {
    perfChart1.classList.add('hidden');
    perfChart1.style.display = 'none';
  }
  if (perfChart2) {
    perfChart2.classList.add('hidden');
    perfChart2.style.display = 'none';
  }
  if (panelAnalysis) {
    panelAnalysis.classList.add('hidden');
    panelAnalysis.style.display = 'none';
  }

  const grid = document.getElementById('mainGrid');
  if (grid) {
    grid.classList.remove('perf-metrics-layout', 'backtest-view-layout', 'perf-tab-layout', 'price-info-expanded', 'analysis-expanded');
    if (isViewingHistory) {
      grid.classList.add('backtest-view-layout');
    }
  }
  const priceInfoCard = document.getElementById('panelPriceInfo');
  if (priceInfoCard) priceInfoCard.style.display = 'none';
  const btnPrice = document.getElementById('btnPriceInfo');
  if (btnPrice) btnPrice.classList.remove('active');
  const statsTitle = document.getElementById('statsTitle');
  if (statsTitle) {
    statsTitle.innerHTML = isViewingHistory ? '📄 성과 지표' : (statsDisplayMode === 'chart' ? '💼 자산현황' : '📡 계좌 정보');
  }

  // 성과 분석 패널 숨기기
  if (panelAnalysis) {
    panelAnalysis.classList.add('hidden');
    panelAnalysis.style.display = 'none';
  }
  const analysisCurrencyBtn = document.getElementById('btnCurrencyToggleAnalysis');
  if (analysisCurrencyBtn) analysisCurrencyBtn.style.display = 'none';
  if (window.UI && window.UI.performance && window.UI.performance.destroyAnalysisCharts) {
    window.UI.performance.destroyAnalysisCharts();
  }
  const btnAnalysis = document.getElementById('btnAnalysis');
  if (btnAnalysis) btnAnalysis.classList.remove('active');

  // 홈화면에서 요약 정보 표시
  const perfSummaryHome = document.getElementById('performanceSummary');
  if (perfSummaryHome) {
    perfSummaryHome.style.display = 'grid';
    updatePerformanceSummary();
  }

  const btnStats = document.getElementById('btnStatsShow');
  if (btnStats) btnStats.classList.remove('active');
  const btnPerf = document.getElementById('btnPerfShow');
  if (btnPerf) btnPerf.classList.remove('active');
  const btnInstant = document.getElementById('btnInstant');
  if (btnInstant) btnInstant.classList.add('active');

  const shouldAutoRefresh = () => {
    if (typeof window.shouldAutoRefresh === 'function') {
      return window.shouldAutoRefresh();
    }
    return false;
  };

  renderChartAll();
  if (shouldAutoRefresh()) handleInstantOrder();
  else window.UI.order.refreshOrderViewUI();
  window.UI.toggles?.applyOrderExpansionPreference?.();
  updateOrderHeaderUI();
}

function showStatsView() {
  restoreFromPerfLayout();
  resetOrderExpansion();

  // ⭐️ 수동 백테스트 중이었다면 다른 화면 전환 시 원래 실전 설정과 캐시로 즉시 복귀
  if (isManualBacktestMode || window.isManualBacktestMode) {
    if (typeof restoreLocalCache === 'function') restoreLocalCache();
    showToast("실전 데이터 모드로 복귀했습니다.", "🔄");
  }

  // ⭐️ 내역 모드 및 화면 전환 시 스크롤 위치 초기화 (정상 위치 맨 위 복귀)
  window.scrollTo(0, 0);
  if (document.documentElement) document.documentElement.scrollTop = 0;
  if (document.body) document.body.scrollTop = 0;

  const scrollSelectors = [
    '#dualOrderContainer',
    '#panelOrder',
    '#combinedHoldingsView',
    '#holdingsViewContainer',
    '#statsViewContainer',
    '#mainGrid',
    '.order-scroll-area',
    '.data-table-container'
  ];

  scrollSelectors.forEach(sel => {
    try {
      const els = document.querySelectorAll(sel);
      els.forEach(el => {
        if (el) {
          el.scrollTop = 0;
          el.scrollLeft = 0;
        }
      });
    } catch (e) {}
  });

  isStatsMode = true;
  window.isStatsMode = true;
  window.isOrderView = false;  // 명시적으로 window 객체에 설정
  isOrderView = false;  // 지역 참조도 함께 설정
  window.showIndividualHoldings = false;  // 내역 모드 진입 시 항상 통합 보유현황으로 표시
  window.currentHoldingsViewMode = 'combined'; // ⭐️ 내역모드 클릭 시 항상 통합 보유현황 고정
  statsDisplayMode = 'table'; // 내역모드 기본: 📡 계좌 정보 고정

  const orderView = document.getElementById('panelOrder');
  const statsView = document.getElementById('panelStats');
  const perfView = document.getElementById('panelMonthly');
  const perfChart1 = document.getElementById('panelMonthlyChart');
  const perfChart2 = document.getElementById('panelDailyChart');
  const panelHistory = document.getElementById('panelHistory');
  const panelChart = document.getElementById('panelChart');
  const panelAnalysis = document.getElementById('panelAnalysisView');

  // 내역모드: 상단 자산현황(panelStats), 중단 보유현황(panelOrder), 하단 매도내역(panelHistory) 표시
  if (statsView) statsView.classList.remove('hidden');
  if (orderView) orderView.classList.remove('hidden');
  if (panelHistory) {
    panelHistory.classList.remove('hidden');
    panelHistory.style.display = 'flex';
  }
  if (perfView) perfView.classList.add('hidden');
  if (perfChart1) perfChart1.classList.add('hidden');
  if (perfChart2) perfChart2.classList.add('hidden');
  if (panelChart) panelChart.classList.add('hidden');
  if (panelAnalysis) {
    panelAnalysis.classList.add('hidden');
    panelAnalysis.style.display = 'none';
  }

  // (수동 백테스트 모드는 사용자가 명시적으로 '실전 데이터 복원'을 누를 때까지 유지됨)

  const statsTitle = document.getElementById('statsTitle');
  // App3 내역모드: 실시간 운영현황 대신 브로커 계좌 정보(App1 스타일)
  if (statsTitle) statsTitle.innerHTML = '📡 계좌 정보' + (window.lastAccountNo ? ` (${window.lastAccountNo})` : ''); // 내역모드 기본 고정

  const grid = document.getElementById('mainGrid');
  if (grid) {
    grid.classList.add('perf-metrics-layout');
    grid.classList.remove('force-3-col', 'force-2-col', 'order-expanded', 'monthly-expanded', 'price-info-expanded', 'analysis-expanded');
    grid.classList.remove('backtest-view-layout', 'perf-tab-layout');
  }
  const btnStats = document.getElementById('btnStatsShow');
  if (btnStats) btnStats.classList.add('active');
  const btnPerf = document.getElementById('btnPerfShow');
  if (btnPerf) btnPerf.classList.remove('active');
  const btnInstant = document.getElementById('btnInstant');
  if (btnInstant) btnInstant.classList.remove('active');

  const analysisCurrencyBtn = document.getElementById('btnCurrencyToggleAnalysis');
  if (analysisCurrencyBtn) analysisCurrencyBtn.style.display = 'none';
  if (window.UI && window.UI.performance && window.UI.performance.destroyAnalysisCharts) {
    window.UI.performance.destroyAnalysisCharts();
  }
  const btnAnalysis = document.getElementById('btnAnalysis');
  if (btnAnalysis) btnAnalysis.classList.remove('active');

  // 데이터가 정상적으로 있으면 종합 데이터 및 차트만 리렌더링
  window.UI.performance.calculateCombinedPeriodData();
  renderChartAll();
  if (typeof updateChartRatesDisplay === 'function') updateChartRatesDisplay();
  (window.UI?.stats?.refreshStatsTable ? window.UI.stats.refreshStatsTable() : (window.refreshStatsTable ? window.refreshStatsTable() : null));

  if (window.UI.tradeHistory.resetToStrategyHistory) {
    window.UI.tradeHistory.resetToStrategyHistory();
  } else {
    window.UI.tradeHistory.renderDBTradeHistory();
  }

  // 매도 내역 요약 업데이트
  updateHistorySummary();

  // 내역모드에서 자산현황, 통합 보유현황, 실전 매도 내역이 항상 보이도록 가시성 및 UI 새로고침
  updateSlotsVisibility();
  window.UI.order.refreshOrderViewUI();
  updateOrderHeaderUI();
}

function updateHistorySummary() {
  const summaryEl = document.getElementById('historySummary');
  if (!summaryEl) return;

  let allTrades = [];
  // ⚠️ 2026-07-31: 실전 매도 내역 요약도 활성 브로커(키움 1~3 / LS 4~6)만 필터링한다(사용자 요청).
  for (let i = 1; i <= window.MAX_SLOTS; i++) {
    if (window.isSlotActive(i) && (!window.BrokerService || window.BrokerService.isSlotForBroker(i))) {
      const res = window.getBestResult(window.lastBTResults[i], i);
      if (res && Array.isArray(res.trades)) {
        allTrades = allTrades.concat(res.trades.map(t => ({ ...t, slotNum: i })));
      }
    }
  }

  if (allTrades.length === 0) {
    summaryEl.innerHTML = '';
    return;
  }

  // 기준 날짜 결정: 최신 데이터 날짜 (보유현황과 동일한 기준)
  let summaryBaseDate = '';
  const mainData = window.globalMainDataSlot?.[1] || window.globalMainData;
  if (mainData && mainData.dates && mainData.dates.length > 0) {
    const lastDate = mainData.dates[mainData.dates.length - 1];
    summaryBaseDate = window.formatDateNY(lastDate);
  }

  if (!summaryBaseDate) {
    summaryEl.innerHTML = '';
    return;
  }

  // 해당 날짜의 매도 정보 계산
  const matchedTrades = allTrades.filter(t => {
    const tDate = String(t.sellDate || t.sell_date || '');
    return tDate === summaryBaseDate;
  });

  const soldQty = matchedTrades.reduce((sum, t) => sum + (parseFloat(t.qty) || 0), 0);
  const profit = matchedTrades.reduce((sum, t) => sum + (parseFloat(t.profit) || 0), 0);

  const profitSign = profit < 0 ? '-' : '';
  const profitText = window.isCurrencyKRW
    ? `${profitSign}${Math.round(Math.abs(profit) * window.currentFXRate / 10000).toLocaleString()}만`
    : `${profitSign}$${Math.round(Math.abs(profit)).toLocaleString()}`;

  // 배지 형식 생성
  const formatDate = (dateStr) => {
    if (!dateStr) return '기준일 없음';
    const parts = String(dateStr).split('-');
    if (parts.length >= 3) return `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}일`;
    return String(dateStr);
  };

  const createBadge = (label, value, color) => {
    return `<span style="display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:999px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); white-space:nowrap;"><span>${label}</span><strong style="color:${color};">${value}</strong></span>`;
  };

  summaryEl.innerHTML = `${createBadge(`${formatDate(summaryBaseDate)} 매도`, `${Math.round(soldQty).toLocaleString()}개`, '#fbbf24')} ${createBadge('T수익금', profitText, profit >= 0 ? '#3b82f6' : '#ef4444')}`;
}

function showPerfView() {
  resetOrderExpansion();

  // ⭐️ 수동 백테스트 중이었다면 다른 화면 전환 시 원래 실전 설정과 캐시로 즉시 복귀
  if (isManualBacktestMode || window.isManualBacktestMode) {
    if (typeof restoreLocalCache === 'function') restoreLocalCache();
    showToast("실전 데이터 모드로 복귀했습니다.", "🔄");
  }

  // 주가 정보 확장 해제 및 카드 숨김
  const priceInfoCard = document.getElementById('panelPriceInfo');
  if (priceInfoCard) priceInfoCard.style.display = 'none';
  const btnPrice = document.getElementById('btnPriceInfo');
  if (btnPrice) btnPrice.classList.remove('active');
  const grid = document.getElementById('mainGrid');
  if (grid) {
    grid.classList.remove('price-info-expanded');
  }

  // 성과 분석 패널 숨기기
  const perfAnalysisCard = document.getElementById('panelAnalysisView');
  if (perfAnalysisCard) {
    perfAnalysisCard.classList.add('hidden');
    perfAnalysisCard.style.display = 'none';
  }
  const analysisCurrencyBtn = document.getElementById('btnCurrencyToggleAnalysis');
  if (analysisCurrencyBtn) analysisCurrencyBtn.style.display = 'none';
  if (window.UI && window.UI.performance && window.UI.performance.destroyAnalysisCharts) {
    window.UI.performance.destroyAnalysisCharts();
  }

  // 매도 내역 패널 숨기기
  const panelHistory = document.getElementById('panelHistory');
  if (panelHistory) {
    panelHistory.classList.add('hidden');
    panelHistory.style.display = 'none';
  }

  // 성과 모드에서 요약 정보 숨기기
  const perfSummary = document.getElementById('performanceSummary');
  if (perfSummary) {
    perfSummary.style.display = 'none';
  }

  isStatsMode = false;
  window.isStatsMode = false;
  window.isOrderView = false;  // 명시적으로 window 객체에 설정
  isOrderView = false;  // 지역 참조도 함께 설정
  // statsDisplayMode는 내역모드 전용 — showPerfView에서 절대 건드리지 않음
  perfStatsMode = loadPerfStatsMode();

  const orderView = document.getElementById('panelOrder');
  const holdingsView = null;
  const statsView = document.getElementById('panelStats');
  const perfView = document.getElementById('panelMonthly');
  const perfChart1 = document.getElementById('panelMonthlyChart');
  const perfChart2 = document.getElementById('panelDailyChart');
  if (orderView) orderView.classList.add('hidden');
  if (holdingsView) holdingsView.classList.add('hidden');
  if (statsView) statsView.classList.add('hidden');
  if (perfView) perfView.classList.remove('hidden');
  if (perfChart1) perfChart1.classList.remove('hidden');
  if (perfChart2) perfChart2.classList.remove('hidden');
  const ph = document.getElementById('panelHistory'); if (ph) ph.classList.add('hidden');
  const pa = document.getElementById('panelAnalysisView'); if (pa) pa.classList.add('hidden');
  const pc = document.getElementById('panelChart'); if (pc) pc.classList.add('hidden');

  // (수동 백테스트 모드는 사용자가 명시적으로 '실전 데이터 복원'을 누를 때까지 유지됨)

  const statsTitle = document.getElementById('statsTitle');
  if (statsTitle) statsTitle.innerHTML = perfStatsMode === 'realtime' ? '📡 실시간 운영현황' : '📄 성과 지표';

  if (grid) {
    grid.classList.add('perf-tab-layout');
    grid.classList.remove('perf-metrics-layout', 'backtest-view-layout', 'price-info-expanded', 'analysis-expanded');
  }

  // 성과 탭 전용 DOM 이동 레이아웃 준비
  preparePerfLayout();

  const btnPerf = document.getElementById('btnPerfShow');
  if (btnPerf) btnPerf.classList.add('active');
  const btnStats = document.getElementById('btnStatsShow');
  if (btnStats) btnStats.classList.remove('active');
  const btnInstant = document.getElementById('btnInstant');
  if (btnInstant) btnInstant.classList.remove('active');
  const btnAnalysis = document.getElementById('btnAnalysis');
  if (btnAnalysis) btnAnalysis.classList.remove('active');

  // 데이터가 정상적으로 있으면 종합 데이터 및 차트만 리렌더링
  window.UI.performance.calculateCombinedPeriodData();
  renderChartAll();
  (window.UI?.stats?.refreshStatsTable ? window.UI.stats.refreshStatsTable() : (window.refreshStatsTable ? window.refreshStatsTable() : null));

  // 월별 성과 테이블 텍스트 렌더링 호출
  for (let i = 1; i <= MAX_SLOTS; i++) {
    if (isSlotActive(i) && (!window.BrokerService || window.BrokerService.isSlotForBroker(i))) window.UI.performance.renderPeriodTableText(i);
  }
  window.UI.performance.renderPeriodTableText('Combined');
  window.UI.performance.renderPeriodTableText(0);

  window.UI.order.refreshOrderViewUI();
  updateOrderHeaderUI();

  if (window.myChart) {
    setTimeout(() => {
      try { if (typeof safeChartResize === 'function') safeChartResize(window.myChart); else if (window.myChart) window.myChart.resize(); } catch(e){}
    }, 50);
  }
  if (window.myPeriodChart) {
    setTimeout(() => {
      try { if (typeof safeChartResize === 'function') safeChartResize(window.myPeriodChart); else if (window.myPeriodChart) window.myPeriodChart.resize(); } catch(e){}
    }, 50);
  }
}

function updatePerformanceSummary() {
  const holdingsQtyEl = document.getElementById('perfSummaryHoldingsQty');
  const holdingsTotalEl = document.getElementById('perfSummaryHoldingsTotal');
  const tradesQtyEl = document.getElementById('perfSummaryTradesQty');
  const tradesProfitEl = document.getElementById('perfSummaryTradesProfit');

  if (!holdingsQtyEl || !holdingsTotalEl || !tradesQtyEl || !tradesProfitEl) return;

  // 보유현황/매도내역 화면에서 쓰는 것과 동일한 배지를 그대로 생성한 뒤,
  // 각 배지를 한 줄씩 좌측 정렬로 분리해서 복사한다.
  if (typeof window.UI?.holdings?.updateCombinedHoldingsSummary === 'function') {
    window.UI.holdings.updateCombinedHoldingsSummary();
  }
  updateHistorySummary();

  const combinedHoldingsSummaryEl = document.getElementById('combinedHoldingsSummary');
  const historySummaryEl = document.getElementById('historySummary');

  const holdingsBadges = combinedHoldingsSummaryEl ? Array.from(combinedHoldingsSummaryEl.children) : [];
  const tradesBadges = historySummaryEl ? Array.from(historySummaryEl.children) : [];

  holdingsQtyEl.innerHTML = holdingsBadges[0] ? holdingsBadges[0].outerHTML : '';
  holdingsTotalEl.innerHTML = holdingsBadges[1] ? holdingsBadges[1].outerHTML : '';
  tradesQtyEl.innerHTML = tradesBadges[0] ? tradesBadges[0].outerHTML : '';
  tradesProfitEl.innerHTML = tradesBadges[1] ? tradesBadges[1].outerHTML : '';
}

function updateSlotsVisibility() {
  const currentUserId = myUserId || localStorage.getItem('vtotal3_id') || '';
  const combinedMode = localStorage.getItem(`vtotal3_combined_mode_${currentUserId}`) || 'combined';
  let activeCount = 0;

  // ⭐️ 로컬 변수 스코프 꼬임 방지를 위해 window 상태를 동기화
  const isOrderView = window.isOrderView;

  // currentHoldingsViewMode 상태 변수 기본값 처리
  if (!window.currentHoldingsViewMode) window.currentHoldingsViewMode = 'combined';
  const viewMode = window.currentHoldingsViewMode;

  // ⚠️ 2026-07-31부터 개별 슬롯 표시(주문표/일별수익)도 활성 브로커(키움 1~3 / LS 4~6)만
  // 필터링한다(사용자 요청) — isSlotActive(백테스트 활성 여부)에 브로커 필터를 더한다.
  for (let i = 1; i <= MAX_SLOTS; i++) {
    const active = isSlotActive(i) && (!window.BrokerService || window.BrokerService.isSlotForBroker(i));
    if (active) activeCount++;
    const v = document.getElementById('orderSlot' + i);
    if (v) {
      if (!isOrderView) {
        // 보유현황 모드(!isOrderView)일 때의 개별 슬롯 가시성
        if (viewMode === 'combined') {
          v.style.display = 'none';
        } else {
          const targetSlotNum = parseInt(viewMode.replace('slot', ''), 10);
          v.style.display = (active && targetSlotNum === i) ? 'flex' : 'none';
        }
      } else {
        if (combinedMode === 'combined') {
          // 통합 모드이면 개별 주문표는 항상 숨김
          v.style.display = 'none';
        } else if (combinedMode === 'combined_normal') {
          // 통합+일반 모드이면 개별 주문표는 항상 노출
          v.style.display = active ? 'flex' : 'none';
        } else {
          // 일반 모드이면, 토글 상태(isCombinedOrderMode)에 따라 분기
          if (isCombinedOrderMode) {
            v.style.display = 'none';
          } else {
            v.style.display = active ? 'flex' : 'none';
          }
        }
      }
    }
    const m = document.getElementById('monthlySlot' + i);
    if (m) m.style.display = active ? 'block' : 'none';

    // ⭐️ 성과 탭 전용 슬롯 가시성 제어 추가
    ['Yearly', 'Monthly', 'Daily'].forEach(suffix => {
      const ms = document.getElementById('monthlySlot' + i + suffix);
      if (ms) ms.style.display = active ? 'block' : 'none';
    });
  }

  const combinedSlot = document.getElementById('combinedOrderSlot');
  if (combinedSlot) {
    if (!isOrderView) {
      // 보유현황 모드(!isOrderView)일 때의 통합 슬롯 가시성
      combinedSlot.style.display = (viewMode === 'combined') ? 'flex' : 'none';
    } else {
      if (combinedMode === 'combined') {
        combinedSlot.style.display = 'flex';
      } else if (combinedMode === 'combined_normal') {
        combinedSlot.style.display = 'flex';
      } else {
        combinedSlot.style.display = isCombinedOrderMode ? 'flex' : 'none';
      }
    }
  }

  const m0 = document.getElementById('monthlySlot0');
  if (m0) m0.style.display = (activeCount > 0) ? 'block' : 'none';

  const mCombo = document.getElementById('monthlySlotCombined');
  if (mCombo) mCombo.style.display = (activeCount >= 2) ? 'block' : 'none';

  // ⭐️ 성과 탭 전용 Combined 및 0번 슬롯 가시성 제어 추가
  ['Yearly', 'Monthly', 'Daily'].forEach(suffix => {
    const m0s = document.getElementById('monthlySlot0' + suffix);
    if (m0s) m0s.style.display = (activeCount > 0) ? 'block' : 'none';

    const mCombos = document.getElementById('monthlySlotCombined' + suffix);
    if (mCombos) mCombos.style.display = (activeCount >= 2) ? 'block' : 'none';
  });

  const panel = document.getElementById('panelMonthly');
  if (panel) {
    if (activeCount >= 2) panel.classList.add('dual-active');
    else panel.classList.remove('dual-active');
  }

  updatePeriodTitle();
  (window.UI?.stats?.refreshStatsTable ? window.UI.stats.refreshStatsTable() : (window.refreshStatsTable ? window.refreshStatsTable() : null));
}

// 통합 주문표도 성과추이와 동일하게 독립 스냅샷으로 보관한다.
// 다음 앱 시작에서는 슬롯/서버 동기화가 끝나기 전에도 이 값을 바로 표시한다.
function saveCombinedOrderSnapshot() {
  if (!myUserId) return;
  const rawOrders = [];
  // ⚠️ 2026-07-31: 활성 브로커(키움 1~3 / LS 4~6) 슬롯만 저장한다 — 안 그러면 이 스냅샷이
  // 저장될 때의 activeBroker와 무관하게 항상 전 슬롯이 섞여 들어가, 브로커를 바꿔도
  // 통합 주문표가 다른 브로커의 주문을 계속 보여주는 원인이 된다(사용자 실증).
  for (let i = 1; i <= MAX_SLOTS; i++) {
    if (!isSlotActive(i)) continue;
    if (window.BrokerService && !window.BrokerService.isSlotForBroker(i)) continue;
    const res = lastBTResults[i];
    if (res?.rawOrders?.length) rawOrders.push(...res.rawOrders);
    else if (res?.orders?.length) rawOrders.push(...res.orders);
  }
  // 초기화 경합 중 만들어진 빈 배열이 기존 정상 캐시를 덮지 않도록 한다.
  if (rawOrders.length === 0) return;
  try {
    // ℹ️ Clean up floating point precision errors to ensure '===' matches correctly in run_tungchigi_master.
    const sanitizedOrders = rawOrders.map(o => {
      const copy = [...o];
      if (copy[2] !== undefined && copy[2] !== "" && !isNaN(copy[2])) {
        copy[2] = Math.round(parseFloat(copy[2]) * 100) / 100;
      }
      return copy;
    });

    const finalOrders = typeof window.run_tungchigi_master === 'function'
      ? window.run_tungchigi_master(sanitizedOrders)
      : sanitizedOrders;
    const sourceOrderDate = window.currentOrderDate || window.lastBTResults[1]?.orderDateStr || "";
    const orderSignature = `${sourceOrderDate}::${(Array.isArray(finalOrders) ? finalOrders : []).map(o => [o?.[0] || "", o?.[1] || "", Number(o?.[2] || 0).toFixed(2), Number(o?.[3] || 0)].join('|')).join('||')}`;
    const saveBroker = (window.BrokerService && window.BrokerService.activeBroker) || 'kiwoom';
    localStorage.setItem(`vtotal3_snap_combined_orders_${myUserId}_${saveBroker}`, JSON.stringify({
      type: 'final',
      orders: finalOrders,
      savedAt: Date.now(),
      sourceOrderDate,
      orderSignature
    }));
  } catch (e) {
    console.warn("통합 주문표 스냅샷 저장 실패:", e);
  }
}

async function handleLogin() {
  const id = document.getElementById('loginId').value.trim(), pw = document.getElementById('loginPw').value.trim(), btn = document.getElementById('loginBtn');
  if (!id || !pw) return alert("아이디와 비밀번호를 입력하세요"); btn.innerText = "서버 통신 중..."; btn.disabled = true;
  try {
    // ⚡ 중복 요청 제거: 로그인 완료 후 enterAppDirectly()에서 GET_ALL_INIT(우선순위 Worker2)을 통해
    // 최신 설정을 어차피 전부 받아와 세팅하므로, 구글 앱스 스크립트(GAS) 부하를 줄이기 위해 GET_INIT 호출 제거
    const loginResp = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: "LOGIN_OR_REGISTER", id: id, pw: pw }) });
    const res = await loginResp.json();
    if (res.result === "success") {
      localStorage.setItem('vtotal3_auth', 'true'); localStorage.setItem('vtotal3_id', id); if (typeof myUserId !== 'undefined') myUserId = id; window.myUserId = id;
      enterAppDirectly();
    }
    else { alert(res.msg); btn.innerText = "로그인"; btn.disabled = false; }
  } catch (e) { alert("서버 연결 실패. 네트워크를 확인하세요."); btn.innerText = "로그인"; btn.disabled = false; }
}

async function enterAppDirectly() {
  // ℹ️ Sync user state and globals when logging in or entering directly.
  const currentId = localStorage.getItem('vtotal3_id') || '';
  if (currentId) {
    window.myUserId = currentId;
    if (typeof myUserId !== 'undefined') myUserId = currentId;
  }
  if (typeof window.syncGlobalsToWindow === 'function') {
    window.syncGlobalsToWindow();
  }

  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('topBar').classList.remove('hidden');
  document.getElementById('mainGrid').classList.remove('hidden');
  detectLayout();

  // 🚀 병렬 로드: 로컬 슬롯 복원(동기 작업)과 동시에 서버 동기화를 미리 시작해둔다.
  // 아래쪽 GET_ALL_INIT 단계에서 이 promise를 그대로 재사용한다.
  window.initDataFuture = checkAndSyncWithServer(!slotConfigs[1]);

    window.UI.priceInfo.preloadCorePriceTickers()
      .catch(e => console.warn("주가 선로딩 실패:", e))
      .finally(() => {
        if (window.currencyService) {
          window.currencyService.updateCurrentFXRate();
        }
      });

    // ⚠️ 로그인/앱 실행 시점에 활성 브로커(키움/LS) 계좌정보 및 체결내역을 백그라운드로 미리 조회해둔다.
    // 사용자가 내역모드 화면으로 이동하거나 "계좌 정보"를 누를 때 지연 없이 즉시 열리도록 memory cache를 채운다.
    if (window.BrokerReconcile) {
      const activeBr = (window.BrokerService && window.BrokerService.activeBroker)
        || localStorage.getItem("vtotal3_active_broker")
        || "kiwoom";
      if (typeof window.BrokerReconcile.getBalance === 'function') {
        window.BrokerReconcile.getBalance(activeBr)
          .catch(e => console.warn("계좌정보 선조회 실패:", e.message))
          .finally(() => {
            if (typeof window.BrokerReconcile.refreshFills === 'function') {
              window.BrokerReconcile.refreshFills().catch(e => console.warn("체결내역 선조회 실패:", e.message));
            }
          });
      } else if (typeof window.BrokerReconcile.refreshFills === 'function') {
        window.BrokerReconcile.refreshFills().catch(e => console.warn("체결내역 선조회 실패:", e.message));
      }
    }

  const userHeader = document.getElementById('userDisplayHeader');
  if (userHeader) userHeader.innerText = myUserId + ' (로딩중...)';
  if (document.getElementById('loginVersion')) document.getElementById('loginVersion').innerText = `v${APP_VERSION}`;
  if (document.getElementById('settingsVersion')) document.getElementById('settingsVersion').innerText = APP_VERSION;

  if (localStorage.getItem(`vtotal3_pref_currency_${myUserId}`) === null) {
    localStorage.setItem(`vtotal3_pref_currency_${myUserId}`, "USD");
  }
  if (localStorage.getItem(`vtotal3_pref_theme_${myUserId}`) === null) {
    localStorage.setItem(`vtotal3_pref_theme_${myUserId}`, "light");
  }
  if (localStorage.getItem(`vtotal3_sort_order_${myUserId}`) === null) {
    localStorage.setItem(`vtotal3_sort_order_${myUserId}`, "asc");
  }
  if (localStorage.getItem(`vtotal3_combined_mode_${myUserId}`) === null) {
    localStorage.setItem(`vtotal3_combined_mode_${myUserId}`, "combined");
  }

  const prefCurrency = localStorage.getItem(`vtotal3_pref_currency_${myUserId}`) || "USD";
  isCurrencyKRW = (prefCurrency === "KRW");
  const defaultCurrSelect = document.getElementById('defaultCurrency');
  if (defaultCurrSelect) defaultCurrSelect.value = prefCurrency;
  syncCurrencyUI();

  const prefTheme = localStorage.getItem(`vtotal3_pref_theme_${myUserId}`) || "light";
  const themeSelect = document.getElementById('themeSelect');
  if (themeSelect) themeSelect.value = prefTheme;
  if (prefTheme === 'light') document.body.classList.add('light-mode');
  else document.body.classList.remove('light-mode');

  const prefSort = localStorage.getItem(`vtotal3_sort_order_${myUserId}`) || "asc";
  const sortSelect = document.getElementById('sortOrderSelect');
  if (sortSelect) sortSelect.value = prefSort;

  const prefCombinedMode = localStorage.getItem(`vtotal3_combined_mode_${myUserId}`) || "combined";
  const combinedModeSelect = document.getElementById('combinedModeSelect');
  if (combinedModeSelect) combinedModeSelect.value = prefCombinedMode;

  if (localStorage.getItem(`vtotal3_font_size_${myUserId}`) === null) {
    localStorage.setItem(`vtotal3_font_size_${myUserId}`, "10.5px");
  }
  const prefFontSize = localStorage.getItem(`vtotal3_font_size_${myUserId}`) || "10.5px";
  const fontSizeSelect = document.getElementById('fontSizeSelect');
  if (fontSizeSelect) fontSizeSelect.value = prefFontSize;
  document.documentElement.style.setProperty('--app-font-size', prefFontSize);

  // ⭐️ 성과 추이 그래프 마지막 선택 모드 복원
  if (localStorage.getItem(`vtotal3_chart_view_mode_${myUserId}`) === null) {
    localStorage.setItem(`vtotal3_chart_view_mode_${myUserId}`, "0");
  }
  chartViewMode = Number(localStorage.getItem(`vtotal3_chart_view_mode_${myUserId}`) || "0");

  // ⭐️ 연도별/월별/일별 성과 추이 선택 모드 복원
  if (localStorage.getItem(`vtotal3_period_view_state_${myUserId}`) === null) {
    localStorage.setItem(`vtotal3_period_view_state_${myUserId}`, "0");
  }
  periodViewState = Number(localStorage.getItem(`vtotal3_period_view_state_${myUserId}`) || "0");

  // ⭐️ 연도별/월별/일별 성과 추이 표시 모드 복원 (기본값 'table')
  if (localStorage.getItem(`vtotal3_period_display_mode_${myUserId}`) === null) {
    localStorage.setItem(`vtotal3_period_display_mode_${myUserId}`, "table");
  }
  periodDisplayMode = localStorage.getItem(`vtotal3_period_display_mode_${myUserId}`) || "table";

  if (localStorage.getItem(`vtotal3_yearly_display_mode_${myUserId}`) === null) {
    localStorage.setItem(`vtotal3_yearly_display_mode_${myUserId}`, "table");
  }
  yearlyDisplayMode = localStorage.getItem(`vtotal3_yearly_display_mode_${myUserId}`) || "table";

  if (localStorage.getItem(`vtotal3_monthly_display_mode_${myUserId}`) === null) {
    localStorage.setItem(`vtotal3_monthly_display_mode_${myUserId}`, "table");
  }
  monthlyDisplayMode = localStorage.getItem(`vtotal3_monthly_display_mode_${myUserId}`) || "table";

  if (localStorage.getItem(`vtotal3_daily_display_mode_${myUserId}`) === null) {
    localStorage.setItem(`vtotal3_daily_display_mode_${myUserId}`, "table");
  }
  dailyDisplayMode = localStorage.getItem(`vtotal3_daily_display_mode_${myUserId}`) || "table";

  // 슬롯 데이터 복원
  window.skipChartRendering = true;
  // 통합 주문표는 성과추이처럼 독립 스냅샷을 최우선으로 즉시 복원한다.
  let cachedRawOrders = [];
  let hasCombinedOrderSnapshot = false;
  let cachedCombinedAlreadyCombined = false;
  try {
    const initBroker = (window.BrokerService && window.BrokerService.activeBroker) || 'kiwoom';
    const combinedOrderStr = localStorage.getItem(`vtotal3_snap_combined_orders_${myUserId}_${initBroker}`);
    if (combinedOrderStr) {
      const parsed = JSON.parse(combinedOrderStr);
      if (parsed?.type === 'final' && Array.isArray(parsed.orders) && parsed.orders.length > 0) {
        cachedRawOrders = parsed.orders;
        hasCombinedOrderSnapshot = true;
        cachedCombinedAlreadyCombined = true;
      } else if (parsed?.type === 'raw' && Array.isArray(parsed.orders) && parsed.orders.length > 0) {
        cachedRawOrders = parsed.orders;
        hasCombinedOrderSnapshot = true;
      } else if (Array.isArray(parsed) && parsed.length > 0) {
        cachedRawOrders = parsed;
        hasCombinedOrderSnapshot = true;
      }
    }
  } catch (e) {
    console.warn("통합 주문표 스냅샷 복원 실패:", e);
  }
  for (let i = 1; i <= MAX_SLOTS; i++) {
    const savedStr = localStorage.getItem(`vtotal3_conf${i}_${myUserId}`);
    if (savedStr) {
      try {
        let parsed = JSON.parse(savedStr);
        if (parsed && parsed.basics && parsed.basics.strategy === 'RSI 3M') {
          parsed.basics.strategy = '3M3D1-R';
          localStorage.setItem(`vtotal3_conf${i}_${myUserId}`, JSON.stringify(parsed));
        }
        slotConfigs[i] = parsed;
      } catch (e) { }
    }

    // 호환성: 1번 슬롯 예전 키 처리
    if (i === 1 && !savedStr) {
      const oldStr = localStorage.getItem(`vtotal3_conf_${myUserId}`);
      if (oldStr) { try { slotConfigs[1] = JSON.parse(oldStr); } catch (e) { } }
    }

    const snapStr = localStorage.getItem(`vtotal3_snap${i}_${myUserId}`);
    if (snapStr && isSlotActive(i)) {
      try {
        const snap = JSON.parse(snapStr);
        lastBTResults[i] = snap;
        globalMonthlyDataArr[i] = snap.monthlyData;
        globalYearlyDataArr[i] = snap.yearlyData;
        globalDailyDataArr[i] = snap.dailyData;
        // ⚠️ 2026-07-31: 통합 주문표 스냅샷 승격은 활성 브로커(키움 1~3 / LS 4~6) 슬롯만 포함한다
        // — 안 그러면 LS 전환 직후에도 키움 슬롯의 원시 주문이 섞여 들어가 통합 주문표가
        // 브로커를 안 가리고 그대로 보였다(사용자 실증). 슬롯별 나머지 복원(설정/차트 등)은
        // 그대로 전 슬롯 대상으로 둔다 — updateSlotsVisibility() 등에서 별도로 걸러진다.
        if (!hasCombinedOrderSnapshot && (!window.BrokerService || window.BrokerService.isSlotForBroker(i))) {
          cachedRawOrders.push(...(snap.rawOrders || snap.orders || []));
        }
        if (i === 1) {
          initData(slotConfigs[1]);
          document.getElementById('mainGrid').classList.remove('hide-order-panel');
          const op = document.getElementById('panelOrder'); if (op) op.classList.remove('hidden');
        }
        window.UI.order.renderOrderViewSlot(snap, i);
        window.UI.performance.renderPeriodTableSlot(i);
      } catch (e) { console.error(`⚠️ 슬롯${i} 로컬 스냅샷 복원 실패:`, e); }
    }
  }
  // 이번 버전 이전에 저장된 개별 슬롯 스냅샷도 즉시 통합 주문표 스냅샷으로 승격한다.
  if (!hasCombinedOrderSnapshot && cachedRawOrders.length > 0) {
    try {
      const sourceOrderDate = window.currentOrderDate || window.lastBTResults[1]?.orderDateStr || "";
      const orderSignature = `${sourceOrderDate}::${cachedRawOrders.map(o => [o?.[0] || "", o?.[1] || "", Number(o?.[2] || 0).toFixed(2), Number(o?.[3] || 0)].join('|')).join('||')}`;
      const promoBroker = (window.BrokerService && window.BrokerService.activeBroker) || 'kiwoom';
      localStorage.setItem(`vtotal3_snap_combined_orders_${myUserId}_${promoBroker}`, JSON.stringify({
        type: 'raw',
        orders: cachedRawOrders,
        savedAt: Date.now(),
        sourceOrderDate,
        orderSignature
      }));
      hasCombinedOrderSnapshot = true;
    } catch (e) { }
  }
  window.skipChartRendering = false;
  // ⭐️ [버그 수정] 아래 렌더링 호출 중 하나라도 예외를 던지면(예: 백테스트/새로고침 경합으로 인한
  // Chart.js "ownerDocument" 에러) 그 아래 실제 서버 동기화(initDataFuture await, 주문표/월별성과를
  // 최종적으로 채우는 로직)까지 도달하지 못하고 앱 초기화가 통째로 멈춰버린다.
  // 로컬 스냅샷 렌더링 실패가 서버 동기화를 막지 않도록 try/catch로 격리한다.
  try {
    renderChartAll();
    initPeriodDisplayModeUI();

    updateSlotsVisibility();
    if (typeof window.UI?.order?.refreshOrderViewUI === 'function') window.UI.order.refreshOrderViewUI();
    // refreshOrderViewUI가 활성 슬롯 기준으로 빈 표를 덮어쓸 수 있으므로,
    // 그 직후 로컬 스냅샷의 원시 주문을 넣어 통합 주문표를 즉시 표시한다.
    // 이후 서버 동기화가 끝나면 최신 계산 결과로 한 번 더 갱신된다.
    if ((hasCombinedOrderSnapshot || cachedRawOrders.length > 0) && typeof window.UI?.order?.renderCombinedOrderBook === 'function') {
      window.UI.order.renderCombinedOrderBook(cachedRawOrders, cachedCombinedAlreadyCombined);
    }
    updatePeriodTitle();
    (window.UI?.stats?.refreshStatsTable ? window.UI.stats.refreshStatsTable() : (window.refreshStatsTable ? window.refreshStatsTable() : null));
    if (isStatsMode) window.UI.tradeHistory.renderDBTradeHistory();

    // 🟢 [버그 수정 2] 앱 초기 로딩 시 무조건 활성화된 탭의 데이터를 화면에 뿌려줌
    loadSlotToForm(activeSettingsTab);

    const cachedCombined = localStorage.getItem(`vtotal3_snap_combined_${myUserId}`);
    if (cachedCombined) {
      try {
        const c = JSON.parse(cachedCombined);
        globalCombinedMonthlyData = c.m || [];
        globalCombinedYearlyData = c.y || [];
        globalCombinedDailyData = c.d || [];
        if (c.stats) window.cachedCombinedStats = c.stats;
        window.UI.performance.renderPeriodTableText('Combined');
      } catch (e) { }
    }

    renderChartAll();
    initPeriodDisplayModeUI();
  } catch (e) {
    console.error("⚠️ 로컬 스냅샷 초기 렌더링 실패(서버 동기화는 계속 진행됨):", e);
  }

  window.UI.toggles?.applyOrderExpansionPreference?.();

  // 🚀 병렬 로드: Chart.js 로드 + GET_ALL_INIT 요청 동시 진행
  // 이미 script.js에서 시작된 checkAndSyncWithServer()를 재사용 (중복 호출 방지)
  try {
    const initPromise = window.initDataFuture || (() => {
      console.warn('[병렬로드] ⚠️ window.initDataFuture 미리 시작 안 됨, 새로 시작');
      return checkAndSyncWithServer(!slotConfigs[1]);
    })();

    await Promise.all([
      window.ensureChartLoaded(),
      initPromise
    ]);
    // 서버 동기화·주가 로드·엔진 결과가 모두 끝난 뒤 한 번만 최종 렌더링한다.
    // 초기 스냅샷 렌더링과 환율 로드 순서에 따라 KRW 값이 달라지는 경합을 방지한다.
    if (window.currencyService) await window.currencyService.updateCurrentFXRate();
    if (typeof window.UI?.toggles?.refreshAllUI === 'function') {
      window.UI.toggles.refreshAllUI();
    }
    // ⭐️ 성과추이 및 통합 보유현황 확실한 최종 렌더링
    window.chartRatesData = null;
    if (window.UI?.performance?.calculateCombinedPeriodData) window.UI.performance.calculateCombinedPeriodData();
    if (typeof window.renderChartAll === "function") window.renderChartAll();
    if (typeof window.renderPeriodBarChart === "function") window.renderPeriodBarChart();
    if (typeof window.updateChartRatesDisplay === "function") window.updateChartRatesDisplay();
    if (window.UI?.holdings?.renderCombinedHoldings) window.UI.holdings.renderCombinedHoldings();
    if (window.UI?.holdings?.updateCombinedHoldingsSummary) window.UI.holdings.updateCombinedHoldingsSummary();
    console.log('[병렬로드] ✅ Chart.js + GET_ALL_INIT 동시 로드 완료');

    // ⭐️ 증권사 변경 후 새로고침된 경우, 직전에 보고 있던 마지막 화면으로 완벽 복원
    const lastViewAfterSwitch = localStorage.getItem('vtotal3_last_view_after_broker_switch');
    if (lastViewAfterSwitch) {
      localStorage.removeItem('vtotal3_last_view_after_broker_switch');
      try {
        if (lastViewAfterSwitch === 'holdings') {
          window.isStatsMode = false;
          window.isOrderView = false;
          if (typeof window.UI?.order?.refreshOrderViewUI === 'function') {
            window.UI.order.refreshOrderViewUI();
          }
          if (typeof window.UI?.holdings?.renderCombinedHoldings === 'function') {
            window.UI.holdings.renderCombinedHoldings();
          }
        } else if (lastViewAfterSwitch === 'stats') {
          if (typeof showStatsView === 'function') showStatsView();
        } else if (lastViewAfterSwitch === 'perf') {
          if (typeof showPerfView === 'function') showPerfView();
        } else if (lastViewAfterSwitch === 'analysis') {
          if (typeof showPerformanceAnalysisView === 'function') showPerformanceAnalysisView();
        } else if (lastViewAfterSwitch === 'price') {
          if (typeof showPriceInfoView === 'function') showPriceInfoView();
        } else if (lastViewAfterSwitch === 'settings') {
          if (typeof toggleSettings === 'function') toggleSettings();
        }
      } catch (e) {
        console.warn("증권사 변경 후 마지막 화면 복원 실패:", e);
      }
    }
  } catch (e) {
    console.error('[병렬로드] 병렬 로드 중 오류:', e);
    // 오류 발생해도 계속 진행
    try {
      if (!window.initDataFuture) {
        await checkAndSyncWithServer(!slotConfigs[1]);
      }
    } catch (e2) {
      console.error('[병렬로드] 서버 데이터 로드 재시도 실패:', e2);
    }
  }

  // ⭐️ [최종 안전망] 위쪽 렌더링 호출 중 일부가 경합/일시적 오류로 누락되어
  // 메모리(lastBTResults)에는 데이터가 있는데 화면(주문표/월별성과)에는 반영이 안 되는
  // 경우를 대비해, 초기화 마지막에 한 번 더 확실히 동기화한다.
  try {
    for (let i = 1; i <= MAX_SLOTS; i++) {
      if (isSlotActive(i) && lastBTResults[i]) {
        window.UI.order.renderOrderViewSlot(lastBTResults[i], i);
        window.UI.performance.renderPeriodTableSlot(i);
      }
    }
    renderChartAll();
    initPeriodDisplayModeUI();
    (window.UI?.stats?.refreshStatsTable ? window.UI.stats.refreshStatsTable() : (window.refreshStatsTable ? window.refreshStatsTable() : null));
  } catch (e) {
    console.error("⚠️ 최종 동기화 렌더링 실패:", e);
  }

  checkPendingSync();
  setLED('on');
  initInstantButtonEvents();
  initStatsButtonEvents();
  initBacktestLongPress();

  // 초기 active 탭 동기화
  const btnInstant = document.getElementById('btnInstant');
  const btnStats = document.getElementById('btnStatsShow');
  if (isStatsMode) {
    if (btnStats) btnStats.classList.add('active');
    if (btnInstant) btnInstant.classList.remove('active');
  } else {
    if (btnInstant) btnInstant.classList.add('active');
    if (btnStats) btnStats.classList.remove('active');
  }
}

function applyQuickConfig() {
  if (window.isServerSyncing || window.isBacktestRunning) {
    alert(window.isServerSyncing ? "데이터 로딩 중입니다. 로딩 완료 후 백테스트를 실행해주세요." : "백테스트 계산 중입니다. 완료 후 다시 실행해주세요.");
    return;
  }

  const t = document.getElementById('qTicker').value;
  const s = document.getElementById('qStartDate').value;
  const e = document.getElementById('qEndDate').value;
  const i = document.getElementById('qInitialCash').value;
  const r = document.getElementById('qRenewCash').value;
  const fb = document.getElementById('qFBase').value;
  const fs = document.getElementById('qFSec').value;

  saveQuickConfigToLocal(); // 설정값 저장

  const strategies = [];
  for (let k = 1; k <= MAX_SLOTS; k++) {
    const el = document.getElementById('qStrat' + k);
    strategies.push(el ? el.value : "");
  }

  if (strategies.every(st => st === "")) {
    alert("최소 한 개 이상의 투자법을 선택해주세요.");
    return;
  }

  isManualBacktestMode = true;
  window.isManualBacktestMode = true;
  isViewingHistory = true;
  // ⚠️ 배열 재할당 금지: window.lastBTResults 등이 옛 배열을 계속 참조하게 되어
  //    백테스트 모드에서 이전 실전 데이터가 보이는 문제가 생긴다. 제자리에서 비운다.
  lastBTResults.fill(null);
  globalMonthlyDataArr.fill(null);
  globalYearlyDataArr.fill(null);
  globalDailyDataArr.fill(null);
  globalCombinedMonthlyData = [];
  globalCombinedYearlyData = [];
  globalCombinedDailyData = [];
  window.cachedCombinedStats = null;
  window.currentChartSignature = '';
  if (window.barChartSignatures) window.barChartSignatures = {};

  strategies.forEach((st, idx) => {
    const slotNum = idx + 1;
    if (st === "") {
      simulationConfigs[slotNum] = null;
      // ⭐️ 수동 백테스트 실행 시 빈 슬롯은 기존 백테스트 결과를 확실하게 비워줌
      lastBTResults[slotNum] = null;
      globalMonthlyDataArr[slotNum] = null;
      globalYearlyDataArr[slotNum] = null;
      globalDailyDataArr[slotNum] = null;
    } else {
      simulationConfigs[slotNum] = {
        basics: {
          ticker: t, startDate: s, endDate: e, strategy: st,
          initialCash: unformatComma(i), renewCash: unformatComma(r),
          fBase: fb, fSec: fs
        }
      };
    }
  });

  document.getElementById('quickConfigOverlay').style.display = 'none';
  showToast("수동 백테스트 모드로 다중 슬롯을 실행합니다. (원본 설정 유지됨)", "🚀");

  window.isBacktestRunning = true;
  Promise.resolve(runEngine())
    .catch(err => {
      console.error("백테스트 실행 오류:", err);
      alert("백테스트 실행 중 오류가 발생했습니다.");
    })
    .finally(() => {
      window.isBacktestRunning = false;
    });
}

window.checkAndSyncWithServer = checkAndSyncWithServer;
async function checkAndSyncWithServer(isInitial, forceSync = false, skipAutoSave = false) {
  if (forceSync) {
    try { localStorage.removeItem(`vtotal3_sheet_perf_cache_${myUserId}`); localStorage.removeItem(`vtotal3_sheet_perf_cache_v2_${myUserId}`); } catch (e) {}
  }
  window.isServerSyncing = true;
  setLED('loading');
  const userHeader = document.getElementById('userDisplayHeader');
  if (userHeader) userHeader.innerText = myUserId + ' (로딩중...)';

  try {
    const parseDateStr = (ds) => {
      if (!ds) return formatDateNY(new Date());
      let str = String(ds).trim().replace(/\([^)]+\)/g, "").trim();
      str = str.replace(/[년월.\/]/g, '-').replace(/일/g, '').replace(/\s+/g, '');
      if (str.endsWith('-')) str = str.slice(0, -1);
      if (str.includes('T')) str = str.split('T')[0];
      let p = str.split('-');
      if (p.length >= 3) {
        let y = p[0]; if (y.length === 2) y = "20" + y;
        let m = p[1].padStart(2, '0'); let d = p[2].padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
      return str;
    };

    const getSheetPerfCacheKey = () => `vtotal3_sheet_perf_cache_v2_${myUserId}`;

    const getCachedSheetPerf = () => {
      try { return JSON.parse(localStorage.getItem(getSheetPerfCacheKey()) || "null"); } catch (e) { return null; }
    };

    const getLatestPerfDate = (slotPerf) => {
      const logs = slotPerf && Array.isArray(slotPerf.logs) ? slotPerf.logs : [];
      let latest = "";
      logs.forEach(row => {
        const dt = parseDateStr(row && row[0]);
        if (dt && dt > latest) latest = dt;
      });
      return latest;
    };

    const mergeSheetPerf = (basePerf, incomingPerf) => {
      if (!basePerf || !incomingPerf) return incomingPerf || basePerf;
      const merged = { ...basePerf, ...incomingPerf };
      for (let i = 1; i <= MAX_SLOTS; i++) {
        const key = `strat${i}`;
        const baseSlot = basePerf[key] || { logs: [] };
        const incomingSlot = incomingPerf[key] || { logs: [] };
        const byDate = new Map();
        (baseSlot.logs || []).forEach(row => { const dt = parseDateStr(row && row[0]); if (dt) byDate.set(dt, row); });
        (incomingSlot.logs || []).forEach(row => { const dt = parseDateStr(row && row[0]); if (dt) byDate.set(dt, row); });
        const logs = Array.from(byDate.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(entry => entry[1]);
        const hasIncomingMeta = incomingSlot.meta && Object.keys(incomingSlot.meta).length > 0;
        merged[key] = {
          ...baseSlot,
          ...incomingSlot,
          logs: logs,
          json: incomingSlot.json || baseSlot.json || "{}",
          meta: hasIncomingMeta ? incomingSlot.meta : (baseSlot.meta || {})
        };
      }
      return merged;
    };

    const runFastEngine = async (cfg, isActive, slotNum, priceData) => {
      if (!isActive) return null;
      const res = await runBacktestMemory(cfg, priceData, slotNum);
      if (res && res.status !== "error") {
        window.UI.updates.updateUIWithResult(res, cfg, slotNum, true);
        return res;
      }
      return null;
    };

    const loadSheetData = async () => {
      const fetchWithTimeout = (url, options = {}, timeoutMs = 15000) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        return fetch(url, { ...options, signal: controller.signal })
          .finally(() => clearTimeout(timer));
      };

      // ⚡ index.html에서 HTML 파싱 직후 미리 쏴둔 GET_ALL_INIT 요청을 재사용
      // (RAM의 Promise를 그대로 소비 — 새 요청 발생 안 함, 중복 방지)
      let dataAll = null;
      if (window.__earlyFetch && window.__earlyFetch.initPromise) {
        dataAll = await window.__earlyFetch.initPromise;
        window.__earlyFetch.initPromise = null; // 1회 소비, 재동기화 시엔 새로 요청
      }

      if (!dataAll) {
        // 프리페치가 없었거나 실패한 경우 폴백: 지금 바로 요청
        // 읽기는 Worker3(GCP Sheets API 통로)를 우선 시도하고, 실패 시 GAS로 폴백한다.
        try {
          const currentUid = myUserId || window.myUserId || localStorage.getItem("vtotal3_id") || "smw594";
          const workerInitUrl = `${window.WORKER3_URL || "https://autumn-limit-001e-3.smw594.workers.dev"}/api/backtest-log-init?id=${encodeURIComponent(currentUid)}&spreadsheetId=${encodeURIComponent(BACKTEST_LOG_SPREADSHEET_ID)}`;
          const resWorker = await fetchWithTimeout(workerInitUrl);
          if (!resWorker.ok) throw new Error('worker http ' + resWorker.status);
          const workerData = await resWorker.json();
          // hasSheet:false는 워커가 시트/탭을 못 읽었을 때도 정상 200으로 오므로(GAS와 동일 계약),
          // 별도로 걸러서 GAS로 폴백시켜야 "빈 응답을 성공으로 오인"하는 걸 막을 수 있다.
          if (!workerData || workerData.error || workerData.hasSheet === false) {
            throw new Error((workerData && (workerData.error || (workerData.perf && workerData.perf.message))) || 'worker init empty/hasSheet=false');
          }
          console.log('[GET_ALL_INIT] ✅ Worker(GCP) 응답:', workerData);
          dataAll = workerData;
        } catch (e) {
          console.warn('[GET_ALL_INIT] Worker(GCP) 읽기 실패, GAS로 폴백:', e);
        }

        if (!dataAll) {
          let allInitUrl = `${GAS_URL}?action=GET_ALL_INIT&id=${myUserId}`;
          for (let i = 1; i <= MAX_SLOTS; i++) {
            const sName = slotConfigs[i]?.basics?.strategy || "";
            allInitUrl += `&strat${i}=${encodeURIComponent(sName)}`;
          }
          const resAll = await fetchWithTimeout(allInitUrl);
          dataAll = await resAll.json();
        }
      }

      // 데이터 구조 매핑: GET_ALL_INIT 응답을 GET_INIT, GET_MY_PERF 형식으로 분리
      const dataInit = { hasSheet: dataAll.hasSheet };
      for (let i = 1; i <= MAX_SLOTS; i++) {
        const key = i === 1 ? 'config' : `config${i}`;
        dataInit[key] = dataAll[key];
      }

      const dataPerf = dataAll.perf || {};

      return { dataInit, dataPerf };
    };

    // 📊 시트에서 주가 데이터 로드
    let priceData = null;
    console.log("🔍 priceLoader 객체 확인:", typeof window.priceLoader, window.priceLoader);

    if (!window.priceLoader || !window.priceLoader.loadAllSheetPrices) {
      console.error("❌ ERROR: priceLoader가 로드되지 않았습니다! price_loader.js 확인 필요");
    } else {
      try {
        console.log("🔄 초기화: 구글 시트에서 주가 데이터 로드 중...");
        priceData = await window.priceLoader.loadAllSheetPrices();
        console.log("✅ 초기화: 주가 데이터 로드 완료", priceData);
      } catch (err) {
        console.warn("⚠️ 초기화: 주가 데이터 로드 실패:", err.message);
        console.warn("⚠️ 스택:", err.stack);
      }
    }

    window.skipChartRendering = true;
    // 슬롯별 계산은 서로 독립적이므로 순차 대기하지 않고 병렬 실행한다.
    // 로컬 스냅샷은 이미 위에서 먼저 렌더링되어 주문표가 즉시 보이고,
    // 여기서는 최신 주가 기준 결과만 병렬로 갱신한다.
    await Promise.all(
      Array.from({ length: MAX_SLOTS }, (_, i) => i + 1)
        .map(i => runFastEngine(slotConfigs[i], isSlotActive(i), i, priceData))
    );

    // 최신 주가 계산이 끝난 즉시 오늘 주문표를 로컬에 확정한다.
    // 시트 저장/재조회는 아래에서 계속 진행하되, 사용자는 그 완료를 기다리지 않는다.
    for (let i = 1; i <= MAX_SLOTS; i++) {
      if (isSlotActive(i) && lastBTResults[i]) {
        saveSnapshot(normalizeSnapAmounts(lastBTResults[i]), i, myUserId);
      }
    }
    saveCombinedOrderSnapshot();
    // ⭐️ [자동 동기화] 로컬 계산이 완료되면 GCP 자동주문 서버에도 최신 주문표를 자동 전송하여 화면과 GCP 간 일치 유도
    if (typeof window.pushTodayOrders === 'function') {
      window.pushTodayOrders().then(() => {
        if (typeof window.refreshOrderStatusCache === 'function') {
          window.refreshOrderStatusCache(false).then(() => {
            if (typeof window.UI?.order?.refreshOrderViewUI === 'function') {
              window.UI.order.refreshOrderViewUI();
            }
          });
        }
      }).catch(e => console.warn('GCP 자동 주문 전송 실패:', e));
    }
    // ⭐️ [버그 수정] 모든 슬롯 동기화가 완전히 끝난 시점에 통합 주문표를 최신 데이터로 강제 최종 갱신
    if (typeof window.UI?.order?.refreshOrderViewUI === 'function') {
      window.UI.order.refreshOrderViewUI();
    }
    window.UI.order.refreshOrderViewUI();

    // 이번 로그인에서 이미 최신 주가로 계산했으므로 장 마감 후 자동 갱신 표식만 소비한다.
    // 서버 동기화 완료 뒤 handleInstantOrder()로 같은 계산을 다시 반복하지 않는다.
    if (typeof shouldAutoRefresh === 'function') shouldAutoRefresh();

    window.skipChartRendering = false;
    initPeriodDisplayModeUI();

    const track2Promise = (async () => {
      try {
        return await loadSheetData();
      } catch (e) {
        console.error("Sheet Sync Error:", e);
        return null;
      }
    })();

    restoreFromPerfLayout();
    updateSlotsVisibility();
    renderChartAll();

    isStatsMode = false;
    window.isStatsMode = false;
    isOrderView = true;
    window.isOrderView = true;
    const grid = document.getElementById('mainGrid');
    if (grid) {
      grid.classList.remove('perf-metrics-layout', 'backtest-view-layout', 'perf-tab-layout');
    }
    const btnStats = document.getElementById('btnStatsShow');
    if (btnStats) btnStats.classList.remove('active');
    const btnPerf = document.getElementById('btnPerfShow');
    if (btnPerf) btnPerf.classList.remove('active');
    const btnInstant = document.getElementById('btnInstant');
    if (btnInstant) btnInstant.classList.add('active');
    window.UI.order.refreshOrderViewUI();
    // ⭐️ 서버 동기화(track2Promise)가 끝나기 전, 로컬 엔진 결과/캐시로 요약을 먼저 채워 즉시 노출
    updatePerformanceSummary();

    // if (userHeader) userHeader.innerText = myUserId + ' (동기화 중...)';

    const serverResult = await track2Promise;
    if (!serverResult) throw new Error("Server Sync Failed");
    const { dataInit, dataPerf } = serverResult;

    lastMyPerfData = dataPerf;
    perfLastCheckTime = new Date().getTime();

    const syncSlotWithSheet = async (confData, perfSlotData, slotNum, priceData) => {
      if (isSlotLocallyDisabled(slotNum)) {
        const localStopped = localStorage.getItem(`vtotal3_conf${slotNum}_${myUserId}`);
        if (localStopped) {
          try { slotConfigs[slotNum] = JSON.parse(localStopped); } catch (e) { }
        } else {
          slotConfigs[slotNum] = { basics: { strategy: "정지" } };
          localStorage.setItem(`vtotal3_conf${slotNum}_${myUserId}`, JSON.stringify(slotConfigs[slotNum]));
        }
        localStorage.removeItem(`vtotal3_snap${slotNum}_${myUserId}`);
        localStorage.removeItem(`vtotal3_sheet_last_date_${slotNum}_${myUserId}`);
        localStorage.removeItem(`vtotal3_sheet_existing_dates_${slotNum}_${myUserId}`);
        lastBTResults[slotNum] = null;
          globalMonthlyDataArr[slotNum] = null;
        globalYearlyDataArr[slotNum] = null;
        globalDailyDataArr[slotNum] = null;
        return;
      }

      if (!confData || !confData.basics || !confData.basics.strategy) {
        localStorage.removeItem(`vtotal3_conf${slotNum}_${myUserId}`);
        localStorage.removeItem(`vtotal3_snap${slotNum}_${myUserId}`);
        localStorage.removeItem(`vtotal3_sheet_last_date_${slotNum}_${myUserId}`);
        localStorage.removeItem(`vtotal3_sheet_existing_dates_${slotNum}_${myUserId}`);
        localStorage.removeItem(getSheetConfigSnapshotKey(slotNum));
        // ⭐️ 서버에 정보가 없으면 메모리의 이전 흔적도 깨끗이 비워줌
        slotConfigs[slotNum] = null;
        lastBTResults[slotNum] = null;
        globalMonthlyDataArr[slotNum] = null;
        globalYearlyDataArr[slotNum] = null;
        globalDailyDataArr[slotNum] = null;
        return;
      }

      // 호환성 처리: 시트에 저장된 구버전 전략명 마이그레이션
      applySheetConfigToSlot(slotNum, confData);

      let sheetLastDate = "1900-01-01";
      let existingDates = [];

      if (perfSlotData && perfSlotData.logs && perfSlotData.logs.length > 0) {
        perfSlotData.logs.forEach(r => {
          let dt = parseDateStr(r[0]);
          let asset = parseFloat(String(r[1]).replace(/[^0-9.-]+/g, "")) || 0;
          if (dt && asset > 0) {
            existingDates.push(dt);
            if (dt > sheetLastDate) sheetLastDate = dt;
          }
        });
        localStorage.setItem(`vtotal3_sheet_last_date_${slotNum}_${myUserId}`, sheetLastDate);
        localStorage.setItem(`vtotal3_sheet_existing_dates_${slotNum}_${myUserId}`, existingDates.join(","));

        // ⭐️ [버그 수정] 설정창의 '진짜 초기자산(C9)'을 엔진으로 넘겨줌
        const realData = processRealLogData(perfSlotData, confData.basics.strategy, confData.basics.initialCash);

        if (realData) {
          // 163주 튕김 방지 및 최신 증액/출금 내역을 엔진에 반영하기 위해 realData 기반으로 이어서 계산
          const pureEngineRes = await runBacktestMemory(confData, priceData, slotNum, realData);
          const isEngOk = (pureEngineRes && pureEngineRes.summary);

          // ⭐️ 엔진의 가상 계산값을 버리고, 시트 꾸러미(JSON)의 진짜 갱신금을 추출
          const realJsonBase = realData.summary.base;

          // ⭐️ [원금 원천 방지] 시트의 실전 원금 데이터(입출금 포함) 추출
          const trueRealPrincipal = realData.summary.realPrincipal;

          // 1. 설정 꾸러미(conf) 업데이트 및 저장
          localStorage.setItem(`vtotal3_conf${slotNum}_${myUserId}`, JSON.stringify({ basics: confData.basics }));
          rememberSheetConfigSnapshot(slotNum, confData);
          slotConfigs[slotNum] = confData;

          // 2. 스냅샷 꾸러미(snap) 구성 및 저장
          // ⭐️ [퉁치기 핵심 수정] 엔진의 orders는 이미 퉁치기된 결과라 매수가 사라져 있을 수 있음.
          // 따라서 nextOrderInfo + 전략 설정으로 원시(raw) 매수 주문을 직접 재구성합니다.
          let combinedForTung = [...(realData.orders || [])]; // 시트의 원시 매도 주문들

          let syncedNextInfo = isEngOk ? { ...pureEngineRes.nextOrderInfo } : null;

          if (isEngOk && syncedNextInfo && syncedNextInfo.qty > 0) {
            // 엔진의 nextOrderInfo에서 원시 매수 정보 추출
            const noi = syncedNextInfo;
            const curStrat = confData.basics.strategy || '2M3D1-1P';
            const M_STRAT = MASTER_STRATEGIES[curStrat];
            if (M_STRAT && M_STRAT.modes[noi.mode]) {
              const buyRate = M_STRAT.modes[noi.mode].buy[noi.tier - 1] || 0;
              const lastClose = pureEngineRes.summary.currPrice;
              const rawBuyPrice = Math.trunc((lastClose * (1 + buyRate) + 0.00001) * 100) / 100;
              // 시트의 실제 갱신금/예수금 기준으로 수량 재계산
              const fBuy = (parseFloat(confData.basics.fBase) || 0) / 100;
              const currentW = parseFloat(noi.weight) / 100;
              const tSeed = Math.min(realData.summary.base * currentW, realData.summary.cash);
              const correctBuyQty = (rawBuyPrice > 0 && currentW > 0) ? Math.floor((tSeed / (rawBuyPrice * (1 + fBuy))) + 0.00001) : 0;

              if (correctBuyQty > 0) {
                combinedForTung.push(["매수", "LOC", rawBuyPrice, correctBuyQty]);
                syncedNextInfo.qty = correctBuyQty;
              }
            }
          }

          // ⭐️ 시트의 매도 + 재구성된 원시 매수를 합쳐서 퉁치기 수행
          let finalSyncedOrders = typeof run_tungchigi_master === 'function' ? run_tungchigi_master(combinedForTung) : combinedForTung;

          let isEngineNewer = false;
          if (isEngOk) {
            const lastEngDate = pureEngineRes.chartDates && pureEngineRes.chartDates.length > 0 ? pureEngineRes.chartDates[pureEngineRes.chartDates.length - 1] : "";
            const lastRealDate = realData.chartDates && realData.chartDates.length > 0 ? realData.chartDates[realData.chartDates.length - 1] : "";
            if (lastEngDate > lastRealDate) {
              isEngineNewer = true;
            }
          }

          const sheetTrades = window.UI.tradeHistory.reconstructRealTrades(perfSlotData.logs, slotNum);

          let mergedSnap = {
            ...realData,
            summary: isEngineNewer ? { ...pureEngineRes.summary, realPrincipal: realData.summary.realPrincipal } : realData.summary,
            inv: isEngineNewer ? pureEngineRes.inv : realData.inv,
            trades: sheetTrades,
            tradesFromSheet: true,
            orders: finalSyncedOrders.length > 0 ? finalSyncedOrders : (pureEngineRes.orders || []),
            rawOrders: combinedForTung,
            nextOrderInfo: syncedNextInfo,
            orderDateStr: isEngOk ? pureEngineRes.orderDateStr : realData.orderDateStr,
            dailyStates: isEngOk ? pureEngineRes.dailyStates : realData.dailyStates,
            chartDates: realData.chartDates,
            chartBalances: realData.chartBalances,
            chartMdd: realData.chartMdd,
            chartInout: realData.chartInout,
            monthlyData: realData.monthlyData,
            yearlyData: realData.yearlyData,
            dailyData: realData.dailyData,
            isSynced: true
          };

          // ⭐️ [버그 수정] 엔진이 더 최신이면 시트의 히스토리와 엔진의 최신분을 정교하게 병합 (Smart Merge)
          if (isEngineNewer && pureEngineRes.chartDates && pureEngineRes.chartDates.length > 0) {
            const lastRealDate = realData.chartDates[realData.chartDates.length - 1];
            const newIndices = [];
            for (let i = 0; i < pureEngineRes.chartDates.length; i++) {
              if (pureEngineRes.chartDates[i] > lastRealDate) newIndices.push(i);
            }

            if (newIndices.length > 0) {
              mergedSnap.chartDates = realData.chartDates.concat(newIndices.map(i => pureEngineRes.chartDates[i]));
              mergedSnap.chartBalances = realData.chartBalances.concat(newIndices.map(i => pureEngineRes.chartBalances[i]));
              mergedSnap.chartInout = realData.chartInout.concat(newIndices.map(i => pureEngineRes.chartInout[i] || 0));

              // MDD 전체 재계산 (Peak 추적 일관성 유지)
              let peak = -Infinity;
              mergedSnap.chartMdd = mergedSnap.chartBalances.map(b => {
                if (b > peak) peak = b;
                return peak > 0 ? (b - peak) / peak : 0;
              });

              // 성과 분석 데이터 재계산
              mergedSnap.monthlyData = calculateMonthlyData(mergedSnap.chartDates, mergedSnap.chartBalances, mergedSnap.chartMdd, mergedSnap.chartInout);
              mergedSnap.yearlyData = calculateYearlyData(mergedSnap.chartDates, mergedSnap.chartBalances, mergedSnap.chartMdd, mergedSnap.chartInout);
              mergedSnap.dailyData = calculateDailyData(mergedSnap.chartDates, mergedSnap.chartBalances, mergedSnap.chartMdd, mergedSnap.chartInout);
            }
          }

          // ⭐️ [근본 원인 해결] 엔진이 생성한 dailyStates JSON의 과거값을 보정합니다.
          if (mergedSnap.dailyStates && mergedSnap.dailyStates.length > 0) {
            mergedSnap.dailyStates = mergedSnap.dailyStates.map((state, idx, arr) => {
              try {
                let parsed = JSON.parse(state.json);
                parsed.realPrincipal = trueRealPrincipal;

                // ⭐️ [증액 누락 차단 로직 개선]
                // 마지막 데이터(오늘)에 대해, 시트에 이미 기록된 날짜라면 시트 값을 우선하되,
                // 시트에 아직 없는 '오늘'의 계산값이라면 엔진의 값을 보존합니다.
                if (idx === arr.length - 1) {
                  const sheetLastDate = normalizeSheetStateDate(localStorage.getItem(`vtotal3_sheet_last_date_${slotNum}_${myUserId}`));
                  if (normalizeSheetStateDate(state.date) <= sheetLastDate) {
                    // 시트에 이미 저장된 날짜인 경우에만 시트 값으로 동기화 (박제)
                    state.asset = realData.summary.totalAssets;
                    parsed.cash = realData.summary.cash;
                    parsed.base_principal = realData.summary.base;
                    parsed.base = realData.summary.base;
                  } else {
                    // 시트에 아직 없는 최신 날짜(오늘)라면 엔진의 계산값(매수 후 예수금 등)을 유지
                    // 단, 원금 정보 등은 시트 기준 정보를 따름
                    parsed.realPrincipal = trueRealPrincipal;
                  }
                }

                return { ...state, json: JSON.stringify(parsed) };
              } catch (e) { return state; }
            });
            const stateTrades = window.UI.tradeHistory.reconstructRealTrades(window.UI.tradeHistory.buildTradeLogsFromDailyStates(mergedSnap.dailyStates), slotNum);
            if (!mergedSnap.tradesFromSheet && stateTrades.length >= (mergedSnap.trades || []).length) {
              mergedSnap.trades = stateTrades;
            }
          }

          const normalizedMerged = normalizeSnapAmounts(mergedSnap);
          saveSnapshot(normalizedMerged, slotNum, myUserId); // 📦 최적화된 저장 (필요필드만)
          lastBTResults[slotNum] = normalizedMerged;
          window.UI.updates.updateUIWithResult(mergedSnap, confData, slotNum, false);
        }
      } else {
        // ⭐️ [시트 내용이 비워졌거나 신규 슬롯인 경우] 브라우저 날짜 캐시를 깨끗이 비워 첫날부터 자동생성 보장
        localStorage.removeItem(`vtotal3_sheet_last_date_${slotNum}_${myUserId}`);
        localStorage.removeItem(`vtotal3_sheet_existing_dates_${slotNum}_${myUserId}`);

        // ⭐️ [신규 슬롯 자동저장 지원] 시트에 기록이 없는 슬롯도 엔진을 돌려서 dailyStates를 생성
        // 이렇게 해야 checkAndRunAutoSave에서 해당 슬롯 데이터가 자동으로 시트에 저장됨
        if (confData.basics.ticker && confData.basics.startDate) {
          const newSlotRes = await runBacktestMemory(confData, priceData, slotNum);
          if (newSlotRes && newSlotRes.status !== "error") {
            // ⭐️ [첫 기록 보장] 스냅샷을 localStorage에 저장하여 checkAndRunAutoSave가 찾을 수 있게 함
            const normalizedNew = normalizeSnapAmounts(newSlotRes);
            saveSnapshot(normalizedNew, slotNum, myUserId); // 📦 최적화된 저장 (필요필드만)
            lastBTResults[slotNum] = normalizedNew;
            window.UI.updates.updateUIWithResult(newSlotRes, confData, slotNum, false);
          }
        }
      }
    };

    // ⭐️ [청산가 정확도 개선 - 백그라운드/비파괴적] 실전 매도 내역(reconstructRealTrades)이
    // 참조할 주가가 기본 450일 범위보다 오래된 거래를 포함하면, 그 시작일부터 주가를 넓게
    // 재조회해 priceLoader 캐시를 보강한다. 단, 아래 조건으로 기존 핵심 기능(매수 주문/
    // 주가 정보 등)에 쓰이는 priceData 변수는 절대 건드리지 않는다:
    //  - 유효한 YYYY-MM-DD 날짜가 아니면 시도하지 않음
    //  - await하지 않고 백그라운드로만 실행(앱 로딩 지연 없음)
    //  - 실패/빈 응답이면 조용히 무시(기존 캐시 유지, 어떤 것도 덮어쓰지 않음)
    const earliestLogDateCandidate = (() => {
      let earliest = "";
      for (let i = 1; i <= MAX_SLOTS; i++) {
        const logs = (dataPerf[`strat${i}`] && dataPerf[`strat${i}`].logs) || [];
        logs.forEach(row => {
          const dt = parseDateStr(row && row[0]);
          if (dt && (!earliest || dt < earliest)) earliest = dt;
        });
      }
      return earliest;
    })();
    if (/^\d{4}-\d{2}-\d{2}$/.test(earliestLogDateCandidate)) {
      const earliestDateObj = new Date(`${earliestLogDateCandidate}T12:00:00Z`);
      if (!isNaN(earliestDateObj.getTime())) {
        const cachedSOXL = window.priceLoader.priceDataCache && window.priceLoader.priceDataCache['SOXL'];
        const cachedEarliest = (cachedSOXL && cachedSOXL.dates && cachedSOXL.dates.length > 0)
          ? formatDateNY(cachedSOXL.dates[0]) : "";
        if (!cachedEarliest || earliestLogDateCandidate < cachedEarliest) {
          // 결과를 기다리지 않고(await 없이) 백그라운드로만 캐시를 보강한다.
          window.priceLoader.fetchSheetValues(earliestDateObj)
            .then(rows => {
              if (!rows || rows.length === 0) return;
              const tickers = ["SOXL", "SOXX", "TQQQ", "QQQ", "KRW=X"];
              tickers.forEach(ticker => {
                const parsed = window.priceLoader.parseSheetData(rows, ticker);
                if (parsed && parsed.dates && parsed.dates.length > 0) {
                  window.priceLoader.priceDataCache[ticker] = parsed;
                }
              });
            })
            .catch(e => console.warn("⚠️ 매도내역 청산가 계산용 주가 확장 로드 실패(무시됨):", e));
        }
      }
    }

    // 🆕 신규 사용자(LOG_{userId} 탭이 아예 없는 경우): 1번 슬롯만 기본 설정 채움
    if (dataInit && dataInit.hasSheet === false) {
      console.log("🆕 신규 사용자 탭 개설 진행 중: 1번 슬롯 기본 설정 초기화");
      if (!dataInit.config || !dataInit.config.basics || !dataInit.config.basics.ticker) {
        dataInit.config = {
          basics: {
            ticker: 'SOXL',
            startDate: '2020-01-01',
            endDate: '',
            initialCash: 10000,
            renewCash: 10000,
            strategy: '2M3D2',
            fBase: 0,
            fSec: 0
          }
        };
      }
    }

    for (let i = 1; i <= MAX_SLOTS; i++) {
      let pName = i === 1 ? 'config' : `config${i}`;
      let sName = `strat${i}`;
      await syncSlotWithSheet(dataInit[pName], dataPerf[sName], i, priceData);
    }

    saveCombinedOrderSnapshot();
    if (typeof window.UI?.order?.refreshOrderViewUI === 'function') {
      window.UI.order.refreshOrderViewUI();
    }

    renderChartAll();
    window.UI.performance.calculateCombinedPeriodData();
    window.UI.tradeHistory.renderDBTradeHistory();
    // ⭐️ 최초 로그인/서버 동기화 완료 시점에도 홈화면 요약이 바로 반영되도록 갱신
    updatePerformanceSummary();

    // 🟢 [버그 수정 1] 서버 동기화 완료 후 현재 탭의 설정값을 화면 입력창에 강제로 채워넣음
    loadSlotToForm(activeSettingsTab);
    updateSettingsTabButtons();

    if (dataInit.hasSheet && !skipAutoSave) checkAndRunAutoSave();

  } catch (e) {
    console.error("초기 통신 에러 (엔진 결과로 폴백):", e);
    for (let i = 1; i <= MAX_SLOTS; i++) {
      if (lastBTResults[i]) window.UI.updates.updateUIWithResult(lastBTResults[i], slotConfigs[i], i, false);
    }
    updatePerformanceSummary();
    setLED('error');
  } finally {
    updateHeaderDisplay();
    // 주가 데이터가 없거나 비어있는 경우 LED를 error(빨간색)로 표시, 정상일 경우만 on(녹색)
    const currentSOXLCheck = window.priceLoader && window.priceLoader.getPriceSeries ? window.priceLoader.getPriceSeries('SOXL') : null;
    const isPriceLoaded = currentSOXLCheck && currentSOXLCheck.dates && currentSOXLCheck.dates.length > 0;
    setLED(isPriceLoaded ? 'on' : 'error');
    window.isServerSyncing = false;
  }
}

function triggerOptimisticSave() {
  const currentParams = gatherParams();
  saveCurrentFormToSlot(activeSettingsTab);
  const targetSlot = activeSettingsTab;

  slotConfigs[targetSlot] = currentParams;

  if (isSlotActive(targetSlot)) {
    // 📊 이미 로드된 캐시 데이터 사용 (priceLoader.priceDataCache)
    const cachedPriceData = window.priceLoader && window.priceLoader.priceDataCache ?
      window.priceLoader.priceDataCache : {};
    try {
      const res = runBacktestMemory(currentParams, cachedPriceData, targetSlot);
      if (res && res.status !== "error") {
        window.UI.updates.updateUIWithResult(res, currentParams, targetSlot);
      }
    } catch (e) {
      console.warn("triggerOptimisticSave runBacktestMemory error:", e);
    }
  } else {
    // ⭐️ 설정 드롭다운을 비활성화하는 즉시 로컬 캐시와 이전 성과 메모리를 완벽히 청소
    localStorage.removeItem(`vtotal3_snap${targetSlot}_${myUserId}`);
    localStorage.removeItem(`vtotal3_sheet_last_date_${targetSlot}_${myUserId}`);
    localStorage.removeItem(`vtotal3_sheet_existing_dates_${targetSlot}_${myUserId}`);
    lastBTResults[targetSlot] = null;
    globalMonthlyDataArr[targetSlot] = null;
    globalYearlyDataArr[targetSlot] = null;
    globalDailyDataArr[targetSlot] = null;
    updateSlotsVisibility();
    window.UI.performance.calculateCombinedPeriodData();
    renderChartAll();
    (window.UI?.stats?.refreshStatsTable ? window.UI.stats.refreshStatsTable() : (window.refreshStatsTable ? window.refreshStatsTable() : null));
  }
  updateSlotsVisibility();
}

function setupCashAutoFill(initialCashValue = "", renewCashValue = "") {
  const pInput = document.getElementById('initialCash');
  const rInput = document.getElementById('renewCash');
  if (!pInput || !rInput) return;
  const initialRaw = unformatComma(initialCashValue || "");
  const renewRaw = unformatComma(renewCashValue || "");
  rInput.dataset.manual = renewRaw && renewRaw !== initialRaw ? "1" : "0";
  pInput.oninput = function () {
    pInput.value = formatComma(pInput.value);
    if (rInput.dataset.manual !== "1" || !unformatComma(rInput.value)) {
      rInput.dataset.manual = "0";
      rInput.value = pInput.value;
    }
  };
  rInput.oninput = function () {
    rInput.value = formatComma(rInput.value);
    const nextRenew = unformatComma(rInput.value);
    const nextInitial = unformatComma(pInput.value);
    rInput.dataset.manual = nextRenew && nextRenew !== nextInitial ? "1" : "0";
  };
}

function initData(d) {
  if (!d || !d.basics) return; const b = d.basics;
  document.getElementById('ticker').value = b.ticker || 'SOXL';
  document.getElementById('startDate').value = b.startDate || '';
  document.getElementById('endDate').value = b.endDate || '';
  document.getElementById('initialCash').value = formatComma(b.initialCash || '');
  document.getElementById('renewCash').value = formatComma(b.renewCash || '');

  const strategySelect = document.getElementById('strategySelect');
  if (strategySelect) {
    strategySelect.value = b.strategy || '';
    strategySelect.dataset.prev = b.strategy || '';
  }

  document.getElementById('fBase').value = b.fBase !== undefined ? b.fBase : '';
  document.getElementById('fSec').value = b.fSec !== undefined ? b.fSec : '';

  setupCashAutoFill(b.initialCash || "", b.renewCash || "");
  window.UI.updates.updateCurrentStatusUI(activeSettingsTab);
}

function handleStrategyChange(strategyName) {
  const strategySelect = document.getElementById('strategySelect');
  const prevStrategy = strategySelect.dataset.prev || '';

  if (!strategyName || strategyName === '정지' || strategyName === prevStrategy || !prevStrategy) {
    strategySelect.value = strategyName;
    strategySelect.dataset.prev = strategyName;
    triggerOptimisticSave();
    return;
  }

  // ⭐️ 정지 상태에서 다시 다른 투자법으로 변경(활성화)을 시도하는 경우
  if (prevStrategy === '정지') {
    strategySelect.value = prevStrategy; // 시트 불러오기 완료 전까지 이전 값 유지

    (async function() {
      setLED('loading');
      showToast("🔄 이전 설정 복원: 구글 시트에서 기존 투자법 설정을 가져오는 중...");
      try {
        const slotNum = activeSettingsTab;

        // 1. 로컬 정지 플래그 해제
        setSlotLocallyDisabled(slotNum, false);

        // 2. 구글 시트 동기화 강제 수행 (시트 설정 복원)
        await checkAndSyncWithServer(true, true);

        setLED('on');
        showToast("✅ 시트 데이터 및 기존 투자법 복원이 완료되었습니다.");
      } catch (e) {
        console.error("시트 복원 실패:", e);
        setLED('error');
        // 복원 실패 시 다시 정지 상태 플래그 복구
        setSlotLocallyDisabled(activeSettingsTab, true);
        showToast("❌ 복원 실패: 우측 하단의 '시트에서 불러오기'를 이용해주세요.", "⚠️");
      }
    })();
    return;
  }

  const currentSlot = activeSettingsTab || 1;
  const currentRes = (lastBTResults && lastBTResults[currentSlot]) || null;
  const currentCfg = (slotConfigs && slotConfigs[currentSlot]?.basics) || null;

  const elDate = document.getElementById('statDate');
  const elTotal = document.getElementById('statTotal');
  const elRenew = document.getElementById('statRenew');

  let statDate = elDate?.innerText?.trim() || '-';
  let statTotal = elTotal?.innerText?.trim() || '-';
  let statRenew = elRenew?.innerText?.trim() || '-';

  if ((statDate === '-' || !statDate) && currentRes?.dailyStates?.length) {
    statDate = currentRes.dailyStates[currentRes.dailyStates.length - 1].date || '-';
  }
  if ((statTotal === '-' || statTotal === '$0.00') && currentRes?.summary?.totalAssets) {
    statTotal = '$' + Number(currentRes.summary.totalAssets).toLocaleString(undefined, { minimumFractionDigits: 2 });
  } else if ((statTotal === '-' || statTotal === '$0.00') && currentCfg?.initialCash) {
    statTotal = '$' + Number(currentCfg.initialCash).toLocaleString(undefined, { minimumFractionDigits: 2 });
  }
  if ((statRenew === '-' || statRenew === '$0.00') && currentRes?.summary?.renewCash) {
    statRenew = '$' + Number(currentRes.summary.renewCash).toLocaleString(undefined, { minimumFractionDigits: 2 });
  } else if ((statRenew === '-' || statRenew === '$0.00') && currentCfg?.renewCash) {
    statRenew = '$' + Number(currentCfg.renewCash).toLocaleString(undefined, { minimumFractionDigits: 2 });
  }

  const nextDateStr = getNextDateStr(statDate);

  document.getElementById('popPrevStrategy').innerText = prevStrategy || '선택 안 함';
  document.getElementById('popNextStrategy').innerText = strategyName;
  document.getElementById('popStatDateText').innerText = statDate;
  document.getElementById('popNextDateText').innerText = nextDateStr;
  document.getElementById('popStatTotalText').innerText = statTotal;
  document.getElementById('popStatRenewText').innerText = statRenew;

  const overlay = document.getElementById('strategyChangeOverlay');
  if (overlay) overlay.style.display = 'flex';

  const btnApply = document.getElementById('btnApplyStrategyChange');
  const btnConfirm = document.getElementById('btnConfirmStrategyChange');

  if (btnApply) {
    btnApply.onclick = async function() {
      strategySelect.value = strategyName;
      strategySelect.dataset.prev = strategyName;

      if (nextDateStr && nextDateStr !== '-') {
        document.getElementById('startDate').value = nextDateStr;
      }

      const parsedTotal = parseFloat(statTotal.replace(/[^0-9.-]/g, ''));
      if (!isNaN(parsedTotal) && parsedTotal > 0) {
        document.getElementById('initialCash').value = formatComma(parsedTotal);
      }

      const parsedRenew = parseFloat(statRenew.replace(/[^0-9.-]/g, ''));
      if (!isNaN(parsedRenew) && parsedRenew > 0) {
        document.getElementById('renewCash').value = formatComma(parsedRenew);
      }

      setupCashAutoFill(parsedTotal > 0 ? parsedTotal : undefined, parsedRenew > 0 ? parsedRenew : undefined);

      if (overlay) overlay.style.display = 'none';

      saveCurrentFormToSlot(activeSettingsTab);
      triggerOptimisticSave();

      if (window.UI?.updates?.updateCurrentStatusUI) {
        window.UI.updates.updateCurrentStatusUI(activeSettingsTab);
      }
      if (typeof updateSettingsTabButtons === 'function') {
        updateSettingsTabButtons();
      }

      showToast(`[투자법 ${activeSettingsTab}] 투자법이 '${strategyName}'(으)로 변경되었습니다.`, "✅");

      // ⭐️ 시트에 반영까지 같이 진행
      try {
        if (typeof handleSave === 'function') {
          await handleSave();
        }
      } catch (e) {
        console.error("자동 시트 저장 실패:", e);
      }
    };
  }

  if (btnConfirm) {
    btnConfirm.onclick = function() {
      strategySelect.value = prevStrategy;
      strategySelect.dataset.prev = prevStrategy;
      if (overlay) overlay.style.display = 'none';
    };
  }
}

async function runEngine() {
  let ticker, startDate;
  if (isManualBacktestMode) {
    const firstActive = Object.values(simulationConfigs).find(c => c && c.basics && c.basics.ticker);
    ticker = firstActive?.basics?.ticker;
    startDate = firstActive?.basics?.startDate;
  } else {
    ticker = document.getElementById('ticker').value;
    startDate = document.getElementById('startDate').value;
  }

  if (!ticker || !startDate) return alert("데이터를 완전히 불러온 후 실행해주세요.");

  const restoreBtn = setBtnLoading('runBtnSettings', '계산 중...');
  isViewingHistory = true;
  updateHeaderDisplay();

  // 성과모드/성과분석화면에서 넘어오는 경우, 백테스트 실행 전 레이아웃 및 패널을 미리 완벽 초기화
  // (렌더링 도중 perf-tab-layout 또는 analysis-expanded가 남아 차트/패널이 왼쪽으로 쏠리는 문제 방지)
  restoreFromPerfLayout();
  const gridInit = document.getElementById('mainGrid');
  if (gridInit) {
    gridInit.classList.remove('perf-metrics-layout', 'perf-tab-layout', 'order-expanded', 'price-info-expanded', 'analysis-expanded');
  }

  // 성과 분석 패널 숨기기
  const perfAnalysisCardInit = document.getElementById('panelAnalysisView');
  if (perfAnalysisCardInit) {
    perfAnalysisCardInit.classList.add('hidden');
    perfAnalysisCardInit.style.display = 'none';
  }
  const analysisCurrencyBtnInit = document.getElementById('btnCurrencyToggleAnalysis');
  if (analysisCurrencyBtnInit) analysisCurrencyBtnInit.style.display = 'none';
  if (window.UI && window.UI.performance && window.UI.performance.destroyAnalysisCharts) {
    window.UI.performance.destroyAnalysisCharts();
  }

  // 상단 탭 버튼 상태 업데이트 (주문표/백테스트 뷰로 활성화)
  const btnAnalysisInit = document.getElementById('btnAnalysis');
  if (btnAnalysisInit) btnAnalysisInit.classList.remove('active');
  const btnPerfInit = document.getElementById('btnPerfShow');
  if (btnPerfInit) btnPerfInit.classList.remove('active');
  const btnStatsInit = document.getElementById('btnStatsShow');
  if (btnStatsInit) btnStatsInit.classList.remove('active');
  const btnInstantInit = document.getElementById('btnInstant');
  if (btnInstantInit) btnInstantInit.classList.add('active');

  // 📊 현재 메모리에 캐시된 주가의 시작일이 사용자가 설정한 '시작일(startDate)'보다 최신인지 검사
  // 시작일 이전 데이터가 없다면 전체 히스토리(2010-01-01부터)를 다시 읽어온다.
  let forceFullRange = isManualBacktestMode;
  const currentSOXL = priceLoader.getPriceSeries('SOXL');
  if (currentSOXL && currentSOXL.dates.length > 0) {
    const oldestCachedDate = currentSOXL.dates[0];
    const targetStartDate = new Date(`${startDate}T12:00:00Z`);
    if (targetStartDate < oldestCachedDate) {
      console.log(`💡 [백테스트] 시작일(${startDate})이 캐시 시작일(${oldestCachedDate.toISOString().split('T')[0]})보다 과거이므로 전체 주가를 로드합니다.`);
      forceFullRange = true;
    }
  } else {
    forceFullRange = true;
  }

  let priceData = (window.priceLoader && window.priceLoader.priceDataCache && window.priceLoader.priceDataCache['SOXL'] && window.priceLoader.priceDataCache['SOXL'].dates.length > 0)
    ? window.priceLoader.priceDataCache
    : null;

  if (!priceData) {
    try {
      console.log(forceFullRange ? "🔄 구글 시트에서 전체 기간 주가 데이터 로드 중..." : "🔄 구글 시트에서 캐시된 주가 데이터 로드 중...");
      priceData = await priceLoader.loadAllSheetPrices(forceFullRange);
      console.log("✅ 주가 데이터 로드 완료:", Object.keys(priceData));
    } catch (err) {
      console.error("❌ 주가 데이터 로드 실패:", err);
      restoreBtn();
      return alert("주가 데이터를 불러올 수 없습니다: " + err.message);
    }
  } else {
    console.log("⚡ [메모리 캐시 사용] 이미 로드된 주가 데이터를 사용하여 백테스트를 즉시 실행합니다.");
  }
  const executeSlot = async (cfg, isActive, slotNum) => {
    if (isManualBacktestMode) {
      cfg = simulationConfigs[slotNum];
      isActive = (cfg && cfg.basics && cfg.basics.strategy !== "");
    }
    if (isActive) {
      const res = await runBacktestMemory(cfg, priceData, slotNum);
      if (res.status !== "error") {
        lastBTResults[slotNum] = res;
        window.UI.updates.updateUIWithResult(res, cfg, slotNum, true);
      }
    } else {
      lastBTResults[slotNum] = null;
      globalMonthlyDataArr[slotNum] = null;
      globalYearlyDataArr[slotNum] = null;
      globalDailyDataArr[slotNum] = null;
    }
  };

  await Promise.all(
    Array.from({ length: MAX_SLOTS }, (_, i) => i + 1).map(i => executeSlot(slotConfigs[i], isSlotActive(i), i))
  );

  restoreBtn();
  triggerIconAnim('icoRun');

  restoreFromPerfLayout();
  updateSlotsVisibility();

  // ⭐️ 백테스트 완료 시 어느 화면에서 실행했든 홈 백테스트 뷰로 100% 완벽하게 전환
  const orderView = document.getElementById('panelOrder');
  const monthlyPanel = document.getElementById('panelMonthly');
  const panelChart = document.getElementById('panelChart');
  const statsView = document.getElementById('panelStats');
  const panelHistory = document.getElementById('panelHistory');
  const perfMonthlyChart = document.getElementById('panelMonthlyChart');
  const perfDailyChart = document.getElementById('panelDailyChart');
  const perfAnalysisCard = document.getElementById('panelAnalysisView');
  const priceInfoCard = document.getElementById('panelPriceInfo');

  if (orderView) { orderView.classList.remove('hidden'); orderView.style.display = ''; }
  if (monthlyPanel) { monthlyPanel.classList.remove('hidden'); monthlyPanel.style.display = ''; }
  if (panelChart) { panelChart.classList.remove('hidden'); panelChart.style.display = ''; }

  if (statsView) { statsView.classList.add('hidden'); statsView.style.display = 'none'; }
  if (panelHistory) { panelHistory.classList.add('hidden'); panelHistory.style.display = 'none'; }
  if (perfMonthlyChart) { perfMonthlyChart.classList.add('hidden'); perfMonthlyChart.style.display = 'none'; }
  if (perfDailyChart) { perfDailyChart.classList.add('hidden'); perfDailyChart.style.display = 'none'; }
  if (perfAnalysisCard) { perfAnalysisCard.classList.add('hidden'); perfAnalysisCard.style.display = 'none'; }
  if (priceInfoCard) { priceInfoCard.style.display = 'none'; }

  const analysisCurrencyBtn = document.getElementById('btnCurrencyToggleAnalysis');
  if (analysisCurrencyBtn) analysisCurrencyBtn.style.display = 'none';
  if (window.UI?.performance?.destroyAnalysisCharts) window.UI.performance.destroyAnalysisCharts();

  const btnInstant = document.getElementById('btnInstant');
  if (btnInstant) btnInstant.classList.add('active');
  const btnPerf = document.getElementById('btnPerfShow');
  if (btnPerf) btnPerf.classList.remove('active');
  const btnStats = document.getElementById('btnStatsShow');
  if (btnStats) btnStats.classList.remove('active');
  const btnAnalysis = document.getElementById('btnAnalysis');
  if (btnAnalysis) btnAnalysis.classList.remove('active');
  const btnPrice = document.getElementById('btnPriceInfo');
  if (btnPrice) btnPrice.classList.remove('active');

  isStatsMode = false;
  window.isStatsMode = false;
  isOrderView = true;
  window.isOrderView = true;
  window.showIndividualHoldings = false;
  isViewingHistory = true;
  isManualBacktestMode = true;
  window.isManualBacktestMode = true;
  backtestStatsMode = "performance";

  restoreFromPerfLayout();
  const grid = document.getElementById('mainGrid');
  if (grid) {
    grid.classList.remove('perf-metrics-layout', 'perf-tab-layout', 'order-expanded', 'monthly-expanded', 'analysis-expanded', 'price-info-expanded');
    grid.classList.add('backtest-view-layout');
  }

  const statsTitle = document.getElementById('statsTitle');
  if (statsTitle) statsTitle.innerHTML = '📄 성과 지표';

  if (window.UI?.toggles?.updateOrderHeaderUI) window.UI.toggles.updateOrderHeaderUI();
  updateSlotsVisibility();

  window.UI.performance.calculateCombinedPeriodData();
  renderChartAll();
  (window.UI?.stats?.refreshStatsTable ? window.UI.stats.refreshStatsTable() : (window.refreshStatsTable ? window.refreshStatsTable() : null));

  for (let i = 1; i <= MAX_SLOTS; i++) {
    if (isSlotActive(i) && (!window.BrokerService || window.BrokerService.isSlotForBroker(i))) window.UI.performance.renderPeriodTableText(i);
  }
  window.UI.performance.renderPeriodTableText('Combined');

  const settingsScreen = document.getElementById('settingsScreen');
  if (settingsScreen && !settingsScreen.classList.contains('hidden')) {
    settingsScreen.classList.add('hidden');
  }
  const quickConfigOverlay = document.getElementById('quickConfigOverlay');
  if (quickConfigOverlay) quickConfigOverlay.style.display = 'none';

  if (window.myChart) setTimeout(() => { try { if (typeof safeChartResize === 'function') safeChartResize(window.myChart); else if (window.myChart) window.myChart.resize(); } catch(e){} }, 50);
  if (window.myPeriodChart) setTimeout(() => { try { if (typeof safeChartResize === 'function') safeChartResize(window.myPeriodChart); else if (window.myPeriodChart) window.myPeriodChart.resize(); } catch(e){} }, 50);

  showToast("백테스트 엔진 실행 완료");
}

async function handleInstantOrder() {
  if (window.isServerSyncing) {
    console.log("서버 동기화 진행 중이므로 수동 갱신을 보류합니다.");
    return;
  }
  restoreFromPerfLayout();
  const grid = document.getElementById('mainGrid');
  if (grid) grid.classList.remove('hide-order-panel', 'perf-metrics-layout', 'backtest-view-layout', 'perf-tab-layout');
  isViewingHistory = false;
  isManualBacktestMode = false;
  updateHeaderDisplay();
  const restoreBtn = setBtnLoading('btnInstant', '계산 중...');

  // 📊 시트에서 주가 데이터 로드
  // handleInstantOrder는 "강제 갱신"(홈 아이콘 길게 누르기 포함) 진입점이므로
  // 세션 캐시를 무시하고 항상 최신 데이터를 새로 받는다.
  priceLoader._loadAllPricesPromise = null;
  let priceData;
  try {
    priceData = await priceLoader.loadAllSheetPrices();
  } catch (err) {
    console.error("❌ 주가 데이터 로드 실패:", err);
    restoreBtn();
    return;
  }

  const executeSlot = async (cfg, isActive, slotNum) => {
    if (isActive) {
      const res = await runBacktestMemory(cfg, priceData, slotNum);
      if (res && res.status !== "error") {
        window.UI.updates.updateUIWithResult(res, cfg, slotNum);
      }
    } else {
      lastBTResults[slotNum] = null;
      globalMonthlyDataArr[slotNum] = null;
      globalYearlyDataArr[slotNum] = null;
      globalDailyDataArr[slotNum] = null;
    }
  };

  await Promise.all(
    Array.from({ length: MAX_SLOTS }, (_, i) => i + 1).map(i => executeSlot(slotConfigs[i], isSlotActive(i), i))
  );

  updateSlotsVisibility();
  renderChartAll();
  saveCombinedOrderSnapshot();
  restoreBtn();
  triggerIconAnim('icoInstant');
  showToast("실전 주문표 최신화 완료");
  window.UI.order.refreshOrderViewUI();
  window.UI.tradeHistory.renderDBTradeHistory();
  // 최초 로딩 시에도 요약이 즉시 반영되도록 데이터 로드 완료 시점에 갱신
  updatePerformanceSummary();
}

// 네임스페이스 등록
if (!window.UI) window.UI = {};
if (!window.UI.misc) window.UI.misc = {};

window.UI.misc.generateDynamicDOM = generateDynamicDOM;
window.UI.misc.showOrderView = showOrderView;
window.UI.misc.showStatsView = showStatsView;
window.UI.misc.showPerfView = showPerfView;
window.UI.misc.updateHistorySummary = updateHistorySummary;
window.UI.misc.updateSlotsVisibility = updateSlotsVisibility;
window.UI.misc.handleLogin = handleLogin;
window.UI.misc.enterAppDirectly = enterAppDirectly;
window.UI.misc.applyQuickConfig = applyQuickConfig;
window.UI.misc.checkAndSyncWithServer = checkAndSyncWithServer;
window.UI.misc.triggerOptimisticSave = triggerOptimisticSave;
window.UI.misc.setupCashAutoFill = setupCashAutoFill;
window.UI.misc.initData = initData;
window.UI.misc.handleStrategyChange = handleStrategyChange;
window.UI.misc.runEngine = runEngine;
window.UI.misc.handleInstantOrder = handleInstantOrder;

// 직접 window에도 할당 (다른 UI 모듈에서 쉽게 접근하도록)
window.updateSlotsVisibility = updateSlotsVisibility;

// 📌 GET_ALL_INIT은 enterAppDirectly()에서 시작됨
// (안정성 확보)
