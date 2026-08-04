// ui/render-toggles.js - UI 토글 및 표시 모드 변경 함수들

function toggleSettings() {
  const screen = document.getElementById('settingsScreen');
  const isVisible = screen.style.display === 'flex';
  if (!isVisible) updateSettingsTabButtons();
  screen.style.display = isVisible ? 'none' : 'flex';
}

function togglePeriodDisplayModeYearly(skipChildren = false) {
  yearlyDisplayMode = (yearlyDisplayMode === 'chart') ? 'table' : 'chart';
  try {
    if (myUserId) localStorage.setItem(`vtotal3_yearly_display_mode_${myUserId}`, yearlyDisplayMode);
  } catch(e) {}

  const chartC = document.getElementById('perfYearlyChartContainer');
  const tableC = document.getElementById('perfYearlyTableContainer');
  const btn = document.getElementById('btnPeriodModeYearly');

  if (yearlyDisplayMode === 'chart') {
    if (chartC) chartC.style.display = 'block';
    if (tableC) tableC.style.display = 'none';
    if (btn) btn.innerHTML = '<span>🔢</span>';
    if (typeof renderPeriodBarChartRaw === 'function') {
      renderPeriodBarChartRaw('perfYearlyBarChart', 1);
    }
  } else {
    if (chartC) chartC.style.display = 'none';
    if (tableC) tableC.style.display = 'block';
    if (btn) btn.innerHTML = '<span>📊</span>';
    for (let i = 1; i <= MAX_SLOTS; i++) {
      if (isSlotActive(i) && (!window.BrokerService || window.BrokerService.isSlotForBroker(i))) window.UI.performance.renderPeriodTableTextRaw(i, 1, "Yearly");
    }
    window.UI.performance.renderPeriodTableTextRaw('Combined', 1, "Yearly");
    window.UI.performance.renderPeriodTableTextRaw(0, 1, "Yearly");
  }

  if (!skipChildren) {
    if (monthlyDisplayMode !== yearlyDisplayMode) togglePeriodDisplayModeMonthly();
    if (dailyDisplayMode !== yearlyDisplayMode) togglePeriodDisplayModeDaily();
  }
}

function togglePeriodDisplayModeMonthly() {
  monthlyDisplayMode = (monthlyDisplayMode === 'chart') ? 'table' : 'chart';
  try {
    if (myUserId) localStorage.setItem(`vtotal3_monthly_display_mode_${myUserId}`, monthlyDisplayMode);
  } catch(e) {}

  const chartC = document.getElementById('perfMonthlyChartContainer');
  const tableC = document.getElementById('perfMonthlyTableContainer');
  const btn = document.getElementById('btnPeriodModeMonthly');

  if (monthlyDisplayMode === 'chart') {
    if (chartC) chartC.style.display = 'block';
    if (tableC) tableC.style.display = 'none';
    if (btn) btn.innerHTML = '<span>🔢</span>';
    if (typeof renderPeriodBarChartRaw === 'function') renderPeriodBarChartRaw('perfMonthlyBarChart', 0);
  } else {
    if (chartC) chartC.style.display = 'none';
    if (tableC) tableC.style.display = 'block';
    if (btn) btn.innerHTML = '<span>📊</span>';
    for (let i = 1; i <= MAX_SLOTS; i++) {
      if (isSlotActive(i) && (!window.BrokerService || window.BrokerService.isSlotForBroker(i))) window.UI.performance.renderPeriodTableTextRaw(i, 0, "Monthly");
    }
    window.UI.performance.renderPeriodTableTextRaw('Combined', 0, "Monthly");
    window.UI.performance.renderPeriodTableTextRaw(0, 0, "Monthly");
  }
}

function togglePeriodDisplayModeDaily() {
  dailyDisplayMode = (dailyDisplayMode === 'chart') ? 'table' : 'chart';
  try {
    if (myUserId) localStorage.setItem(`vtotal3_daily_display_mode_${myUserId}`, dailyDisplayMode);
  } catch(e) {}

  const chartC = document.getElementById('perfDailyChartContainer');
  const tableC = document.getElementById('perfDailyTableContainer');
  const btn = document.getElementById('btnPeriodModeDaily');

  if (dailyDisplayMode === 'chart') {
    if (chartC) chartC.style.display = 'block';
    if (tableC) tableC.style.display = 'none';
    if (btn) btn.innerHTML = '<span>🔢</span>';
    if (typeof renderPeriodBarChartRaw === 'function') renderPeriodBarChartRaw('perfDailyBarChart', 2);
  } else {
    if (chartC) chartC.style.display = 'none';
    if (tableC) tableC.style.display = 'block';
    if (btn) btn.innerHTML = '<span>📊</span>';
    for (let i = 1; i <= MAX_SLOTS; i++) {
      if (isSlotActive(i) && (!window.BrokerService || window.BrokerService.isSlotForBroker(i))) window.UI.performance.renderPeriodTableTextRaw(i, 2, "Daily");
    }
    window.UI.performance.renderPeriodTableTextRaw('Combined', 2, "Daily");
    window.UI.performance.renderPeriodTableTextRaw(0, 2, "Daily");
  }
}

function toggleOrderView(dir) {
  // 1. 주문표 상태(window.isOrderView === true)일 때 타이틀 클릭 ➔ 주문표 모드만 무한 루프 순환
  if (window.isOrderView) {
    const currentUserId = myUserId || localStorage.getItem('vtotal3_id') || '';
    const currentMode = localStorage.getItem(`vtotal3_combined_mode_${currentUserId}`) || 'combined';
    let nextMode = 'combined';

    const modes = ['combined', 'combined_normal', 'normal'];
    let idx = modes.indexOf(currentMode);
    if (idx === -1) idx = 0;

    if (dir === 'left') {
      nextMode = modes[(idx + 1) % modes.length];
    } else if (dir === 'right') {
      nextMode = modes[(idx - 1 + modes.length) % modes.length];
    } else {
      nextMode = modes[(idx + 1) % modes.length];
    }

    // 로컬스토리지 저장 및 UI 셀렉트박스 동기화
    localStorage.setItem(`vtotal3_combined_mode_${myUserId}`, nextMode);
    const combinedModeSelect = document.getElementById('combinedModeSelect');
    if (combinedModeSelect) combinedModeSelect.value = nextMode;

    showToast(`주문표 모드가 ${nextMode === 'combined' ? '통합' : (nextMode === 'normal' ? '일반' : '통합+일반')}으로 전환되었습니다.`);

    updateSlotsVisibility();
    window.UI.order.refreshOrderViewUI();
    updateOrderHeaderUI();
    return;
  }

  // 2. 보유현황 상태(window.isOrderView === false)일 때 타이틀 클릭 ➔ 보유현황 모드만 무한 루프 순환
  const activeSlots = [];
  for (let i = 1; i <= window.MAX_SLOTS; i++) {
    if (typeof isSlotActive === 'function' && isSlotActive(i) && (!window.BrokerService || window.BrokerService.isSlotForBroker(i))) {
      activeSlots.push(i);
    }
  }
  
  // 순환 모드 리스트 구성: ['combined', 'slot1', 'slot2', ...]
  const modes = ['combined', ...activeSlots.map(num => 'slot' + num)];
  
  if (!window.currentHoldingsViewMode) window.currentHoldingsViewMode = 'combined';
  let idx = modes.indexOf(window.currentHoldingsViewMode);
  if (idx === -1) idx = 0;
  
  if (dir === 'left') {
    idx = (idx + 1) % modes.length; // 손가락을 왼쪽으로 쓸어넘길 때 -> 다음 보유현황
  } else if (dir === 'right') {
    idx = (idx - 1 + modes.length) % modes.length; // 손가락을 오른쪽으로 쓸어넘길 때 -> 이전 보유현황
  } else {
    idx = (idx + 1) % modes.length; // 클릭 시
  }
  
  window.currentHoldingsViewMode = modes[idx];
  window.showIndividualHoldings = (window.currentHoldingsViewMode !== 'combined');

  if (typeof showIndividualHoldings !== 'undefined') {
    showIndividualHoldings = window.showIndividualHoldings;
  }
  if (typeof isOrderView !== 'undefined') {
    isOrderView = window.isOrderView;
  }
  
  updateSlotsVisibility();
  window.UI.order.refreshOrderViewUI();
  updateOrderHeaderUI();

  if (typeof showToast === 'function') {
    const viewName = window.currentHoldingsViewMode === 'combined'
      ? '통합 보유현황'
      : `투자법 ${window.currentHoldingsViewMode.replace('slot', '')} 보유현황`;
    showToast(`📦 ${viewName}`);
  }
}

function updateOrderHeaderUI() {
  const titleEl = document.getElementById('orderTitle');
  const statusEl = document.getElementById('orderStatusText');
  const rankingLiveBtn = document.getElementById('btnOrderRankingLive');
  const rankingBTBtn = document.getElementById('btnOrderRankingBacktest');
  const settingsBtn = document.getElementById('btnSettings');

  if (!titleEl || !statusEl) return;

  const currentMode = localStorage.getItem(`vtotal3_combined_mode_${myUserId}`) || 'combined';
  const orderDateRaw = lastBTResults[1]?.orderDateStr || window.currentOrderDate || '';
  const orderDate = String(orderDateRaw).replace(/\s*\(동기화됨\)\s*$/, '');
  const marketDateHtml = window.dateHelpers?.formatOrderDateWithMarketStatus
    ? window.dateHelpers.formatOrderDateWithMarketStatus(orderDate)
    : orderDate;
  const marketBadgeHtml = window.dateHelpers?.getOrderHeaderMarketStatusBadge
    ? window.dateHelpers.getOrderHeaderMarketStatusBadge()
    : "";
  let titleText = currentMode === 'combined' ? '⚡ 통합 주문표' : (currentMode === 'combined_normal' ? '⚡ 통합+일반 주문표' : '⚡ 주문표');
  let statusText = '';
  let showRankingBtns = true;

  if (window.isStatsMode) {
    titleText = '📦 보유현황';
    // 내역 모드(isStatsMode)이면서 보유현황 모드(isOrderView=false)인 상황에 대한 동적 갱신 처리
    if (!window.isOrderView) {
      const viewMode = window.currentHoldingsViewMode || 'combined';
      if (viewMode === 'combined') {
        titleText = '📦 통합 보유현황';
      } else {
        const slotNum = parseInt(viewMode.replace('slot', ''), 10);
        const stratName = (window.slotConfigs && window.slotConfigs[slotNum]?.basics?.strategy) || `투자법 ${slotNum}`;
        titleText = `📦 ${stratName} 보유현황`;
      }
    }
    statusText = ''; // ⭐️ 보유현황 상태 글자 제거
    showRankingBtns = false;
  } else if (!window.isOrderView) {
    const viewMode = window.currentHoldingsViewMode || 'combined';
    if (viewMode === 'combined') {
      titleText = '📦 통합 보유현황';
    } else {
      const slotNum = parseInt(viewMode.replace('slot', ''), 10);
      const stratName = (window.slotConfigs && window.slotConfigs[slotNum]?.basics?.strategy) || `투자법 ${slotNum}`;
      titleText = `📦 ${stratName} 보유현황`;
    }
    statusText = ''; // ⭐️ 보유현황 상태 글자 제거
    showRankingBtns = false;
  }

  const dateText = !window.isStatsMode && window.isOrderView && orderDate
    ? ` <span style="font-size:0.75em; font-weight:normal; opacity:0.6; margin-left:8px;">(${marketDateHtml})</span>${marketBadgeHtml}`
    : '';
  titleEl.innerHTML = titleText + dateText;
  statusEl.innerHTML = statusText;

  if (rankingLiveBtn) rankingLiveBtn.style.display = showRankingBtns ? 'flex' : 'none';
  if (rankingBTBtn) rankingBTBtn.style.display = showRankingBtns ? 'flex' : 'none';
  if (settingsBtn) settingsBtn.style.display = (!window.isStatsMode && window.isOrderView) ? 'flex' : 'none';

  // ⭐️ 보유현황일 때는 우측 상단의 확대(화살표 2개) 아이콘을 완벽하게 없앤다 (showRankingBtns와 동일하게 제어)
  const btnExpand = document.getElementById('btnExpandOrder');
  if (btnExpand) {
    btnExpand.style.display = 'none';
  }
  if (typeof window.updateCombinedPerfRatesUI === 'function') window.updateCombinedPerfRatesUI();
}

function getOrderExpansionPreferenceKey() {
  const userId = window.myUserId || (typeof myUserId !== 'undefined' ? myUserId : '') || localStorage.getItem('vtotal3_id') || '';
  return `vtotal3_order_expanded_${userId}`;
}

function applyOrderExpansionPreference() {
  const grid = document.getElementById('mainGrid');
  const btn = document.getElementById('btnExpandOrder');
  if (!grid || !btn) return;
  const isExpanded = localStorage.getItem(getOrderExpansionPreferenceKey()) === '1';
  grid.classList.toggle('order-expanded', isExpanded);
  btn.classList.toggle('active', isExpanded);
  if (typeof window.updateCombinedPerfRatesUI === 'function') window.updateCombinedPerfRatesUI();
  if (isExpanded) grid.classList.remove('monthly-expanded');
  else if (periodViewState === 2) grid.classList.add('monthly-expanded');
}

function toggleOrderExpansion() {
  const grid = document.getElementById('mainGrid');
  const btn = document.getElementById('btnExpandOrder');
  if (!grid || !btn) return;
  const isExpanded = grid.classList.toggle('order-expanded');
  localStorage.setItem(getOrderExpansionPreferenceKey(), isExpanded ? '1' : '0');
  if (typeof window.updateCombinedPerfRatesUI === 'function') window.updateCombinedPerfRatesUI();
  if (isExpanded) { btn.classList.add('active'); grid.classList.remove('monthly-expanded'); }
  else { btn.classList.remove('active'); if (periodViewState === 2) grid.classList.add('monthly-expanded'); }
  if (myChart) setTimeout(() => { try { if (typeof safeChartResize === 'function') safeChartResize(myChart); else if (myChart) myChart.resize(); } catch(e){} }, 100);
}

function toggleChartView() {
  // ⚠️ 2026-07-31: 성과추이 순환도 활성 브로커(키움 1~3 / LS 4~6) 슬롯만 대상으로 한다(사용자 요청).
  const chartSlotOk = (i) => isSlotActive(i) && (!window.BrokerService || window.BrokerService.isSlotForBroker(i));
  let activeCount = 0;
  for (let i = 1; i <= MAX_SLOTS; i++) if (chartSlotOk(i)) activeCount++;
  if (activeCount === 0) return;

  // ⭐️ 안전한 순환 로직: 무한루프 방지 및 비어있는 슬롯 자동 건너뛰기
  do {
    chartViewMode = (chartViewMode + 1) % (MAX_SLOTS + 2);
  } while (chartViewMode >= 2 && chartViewMode <= MAX_SLOTS + 1 && !chartSlotOk(chartViewMode - 1));

  try { localStorage.setItem(`vtotal3_chart_view_mode_${myUserId}`, chartViewMode); } catch (e) { }
  renderChartAll();
}

// 실시간 운영현황 토글 (표 <-> 차트)
function toggleStatsDisplayMode() {
  const grid = document.getElementById('mainGrid');
  if (grid && grid.classList.contains('perf-tab-layout')) {
    perfStatsMode = perfStatsMode === 'stats' ? 'realtime' : 'stats';
    savePerfStatsMode();
    const statsTitle = document.getElementById('statsTitle');
    if (statsTitle) statsTitle.innerHTML = perfStatsMode === 'realtime' ? '📡 실시간 운영현황' : '📄 성과 지표';
    statsDisplayMode = "table";

    const tableContainer = document.getElementById('statsTableContainer');
    const chartContainer = document.getElementById('statsChartContainer');
    const selector = document.getElementById('statsMetricSelector');
    const actionArea = document.getElementById('statsActionArea');
    const table = document.getElementById('statsTable');

    if (tableContainer) tableContainer.style.display = 'block';
    if (chartContainer) chartContainer.style.display = 'none';
    if (selector) selector.style.display = 'none';
    if (actionArea) actionArea.style.display = 'flex';
    if (table) {
      if (perfStatsMode === 'realtime') {
        window.UI.stats.renderRealtimeStatusTable(table);
      } else {
        window.UI.stats.renderOriginalStatsTable(table);
      }
    }
    return;
  }
  if (grid && grid.classList.contains('backtest-view-layout')) {
    backtestStatsMode = backtestStatsMode === 'performance' ? 'realtime' : (backtestStatsMode === 'realtime' ? 'asset' : 'performance');
    (window.UI?.stats?.refreshStatsTable ? window.UI.stats.refreshStatsTable() : (window.refreshStatsTable ? window.refreshStatsTable() : null));
    return;
  }
  statsDisplayMode = statsDisplayMode === 'table' ? 'chart' : 'table';
  saveStatsDisplayMode();
  updateStatsTitleByMode();
  const tableContainer = document.getElementById('statsTableContainer');
  const chartContainer = document.getElementById('statsChartContainer');
  const selector = document.getElementById('statsMetricSelector');
  const actionArea = document.getElementById('statsActionArea');

  if (statsDisplayMode === 'chart') {
    if (tableContainer) tableContainer.style.display = 'none';
    if (chartContainer) chartContainer.style.display = 'flex';
    if (selector) selector.style.display = 'block';
    if (actionArea) actionArea.style.display = 'none';
    setTimeout(() => {
      updateStatsPieChart();
    }, 60);
  } else {
    if (tableContainer) tableContainer.style.display = 'block';
    if (chartContainer) chartContainer.style.display = 'none';
    if (selector) selector.style.display = 'none';
    if (actionArea) actionArea.style.display = 'flex';
  }
}

function togglePeriodDisplayMode() {
  periodDisplayMode = (periodDisplayMode === 'chart') ? 'table' : 'chart';
  try { localStorage.setItem(`vtotal3_period_display_mode_${myUserId}`, periodDisplayMode); } catch (e) { }
  initPeriodDisplayModeUI();
}

function togglePeriodView() {
  const grid = document.getElementById('mainGrid');
  const isPerfTabLayout = grid && grid.classList.contains('perf-tab-layout');
  if (isPerfTabLayout) return; // 성과 탭 레이아웃에서는 타이틀 클릭 동작을 막음

  periodViewState = (periodViewState + 1) % 3;
  try { localStorage.setItem(`vtotal3_period_view_state_${myUserId}`, periodViewState); } catch (e) { }
  updatePeriodTitle();

  if (isPerfTabLayout || periodDisplayMode !== 'chart') {
    const TH_STYLE = "white-space:nowrap; padding:0 4px !important; text-align:center; vertical-align:middle; height:16px !important; line-height:16px !important; box-sizing:border-box !important; overflow:hidden;";
    let head0Str = "";
    if (periodViewState === 0) head0Str = `<th style="${TH_STYLE} width:1%;">년월</th>`;
    else if (periodViewState === 1) head0Str = `<th style="${TH_STYLE} width:1%;">연도</th>`;
    else head0Str = `<th style="${TH_STYLE} width:1%;">일자</th>`;
    const h0 = document.getElementById('periodTableHead0');
    if (h0) h0.innerHTML = head0Str;

    const headDataStr = `<th style="${TH_STYLE}">수익금</th><th style="${TH_STYLE}">수익률</th><th class="hide-on-cover" style="${TH_STYLE}">MDD</th>`;

    for (let i = 1; i <= MAX_SLOTS; i++) {
      const h = document.getElementById('periodTableHead' + i);
      if (h) h.innerHTML = headDataStr;
    }
    const hc = document.getElementById('periodTableHeadCombined');
    if (hc) hc.innerHTML = headDataStr;

    window.UI.performance.renderPeriodTableText(0);
    for (let i = 1; i <= MAX_SLOTS; i++) {
      if (isSlotActive(i) && (!window.BrokerService || window.BrokerService.isSlotForBroker(i))) window.UI.performance.renderPeriodTableText(i);
    }
    window.UI.performance.renderPeriodTableText('Combined');
  }

  if (isPerfTabLayout || periodDisplayMode === 'chart') {
    renderPeriodBarChart();
  }
  if (myChart) setTimeout(() => { try { if (typeof safeChartResize === 'function') safeChartResize(myChart); else if (myChart) myChart.resize(); } catch(e){} }, 100);
}

function toggleCurrencyMode() {
  isCurrencyKRW = !isCurrencyKRW;
  window.isCurrencyKRW = isCurrencyKRW;  // ⚠️ 2026-08-04: window 객체에도 동기화 (render-trade-history.js가 window.isCurrencyKRW를 참조함)
  const val = isCurrencyKRW ? 'KRW' : 'USD';
  if (myUserId) {
    localStorage.setItem(`vtotal3_pref_currency_${myUserId}`, val);
  }
  const defaultCurrSelect = document.getElementById('defaultCurrency');
  if (defaultCurrSelect) {
    defaultCurrSelect.value = val;
  }
  syncCurrencyUI();
  refreshAllUI();
  if (typeof updatePerformanceSummary === 'function') {
    updatePerformanceSummary();
  }

  // ⭐️ 성과 분석 패널은 refreshAllUI()가 다시 그리지 않으므로, 열려있을 때만 별도로 재렌더링한다.
  const analysisCard = document.getElementById('panelAnalysisView');
  if (analysisCard && !analysisCard.classList.contains('hidden') && window.UI && window.UI.performance && window.UI.performance.renderAnalysisView) {
    window.UI.performance.renderAnalysisView();
  }

  // ⚠️ 2026-08-04: 실전 매도 내역(진입가/청산가/수익금)도 통화 전환 시 다시 렌더링해야 한다.
  // 여기서 renderDBTradeHistory를 호출하지 않으면 화면에 이미 그려진 값이 그대로 남아
  // KRW/USD 버튼을 눌러도 실전 매도 내역만 바뀌지 않는 것처럼 보인다(사용자 반복 지적).
  lastTradeHistoryRenderSignature = '';
  if (typeof renderDBTradeHistory === 'function') {
    renderDBTradeHistory();
  }
}

function toggleSortOrder() {
  const currentUserId = window.myUserId || localStorage.getItem('vtotal3_id') || '';
  const current = localStorage.getItem(`vtotal3_sort_order_${currentUserId}`) || 'asc';
  const nextVal = current === 'asc' ? 'desc' : 'asc';
  localStorage.setItem(`vtotal3_sort_order_${currentUserId}`, nextVal);

  // 설정창의 셀렉트 박스 동기화
  const sortSelect = document.getElementById('sortOrderSelect');
  if (sortSelect) sortSelect.value = nextVal;

  if (typeof showToast === 'function') {
    showToast(`주문표 정렬이 ${nextVal === 'asc' ? '상승(▲)' : '하강(▼)'}으로 토글되었습니다.`);
  }

  if (typeof window.UI.order.renderCombinedOrderBook === 'function') {
    window.UI.order.renderCombinedOrderBook();
  }
  
  const maxSlots = window.MAX_SLOTS || 5;
  for (let i = 1; i <= maxSlots; i++) {
    if (window.lastBTResults && window.lastBTResults[i] && window.lastBTResults[i].orders) {
      if (window.UI.order && typeof window.UI.order.renderOrderTableSlot === 'function') {
        window.UI.order.renderOrderTableSlot(window.lastBTResults[i].orders, i);
      }
    }
  }
}

function refreshAllUI() {
  window.UI.performance.calculateCombinedPeriodData();
  if (periodDisplayMode === 'chart') {
    renderPeriodBarChart();
  } else {
    for (let i = 1; i <= MAX_SLOTS; i++) {
      if (isSlotActive(i) && (!window.BrokerService || window.BrokerService.isSlotForBroker(i))) window.UI.performance.renderPeriodTableText(i);
    }
    window.UI.performance.renderPeriodTableText('Combined');
    window.UI.performance.renderPeriodTableText(0);
  }

  // 성과 탭 활성화 여부 확인 후 성과 테이블 렌더링
  const grid = document.getElementById('mainGrid');
  if (grid && grid.classList.contains('perf-tab-layout')) {
    window.UI.performance.renderPerfTables();
    if (typeof renderPeriodBarChartRaw === 'function') {
      if (yearlyDisplayMode === 'chart') renderPeriodBarChartRaw('perfYearlyBarChart', 1);
      if (monthlyDisplayMode === 'chart') renderPeriodBarChartRaw('perfMonthlyBarChart', 0);
      if (dailyDisplayMode === 'chart') renderPeriodBarChartRaw('perfDailyBarChart', 2);
    }
  }
  renderChartAll();
  (window.UI?.stats?.refreshStatsTable ? window.UI.stats.refreshStatsTable() : (window.refreshStatsTable ? window.refreshStatsTable() : null));
  window.UI.order.refreshOrderViewUI();
  if (isStatsMode) {
    window.UI.tradeHistory.renderDBTradeHistory();
    window.UI.misc?.updateHistorySummary?.();
  }
}

// 글로벌 window.UI에 등록
if (!window.UI) window.UI = {};
if (!window.UI.toggles) window.UI.toggles = {};
window.UI.toggles.toggleSettings = toggleSettings;
window.UI.toggles.togglePeriodDisplayModeYearly = togglePeriodDisplayModeYearly;
window.UI.toggles.togglePeriodDisplayModeMonthly = togglePeriodDisplayModeMonthly;
window.UI.toggles.togglePeriodDisplayModeDaily = togglePeriodDisplayModeDaily;
window.UI.toggles.toggleOrderView = toggleOrderView;
window.UI.toggles.updateOrderHeaderUI = updateOrderHeaderUI;
window.UI.toggles.toggleOrderExpansion = toggleOrderExpansion;
window.UI.toggles.applyOrderExpansionPreference = applyOrderExpansionPreference;
window.UI.toggles.toggleChartView = toggleChartView;
window.UI.toggles.togglePeriodDisplayMode = togglePeriodDisplayMode;
window.UI.toggles.togglePeriodView = togglePeriodView;
window.UI.toggles.toggleCurrencyMode = toggleCurrencyMode;
window.UI.toggles.toggleSortOrder = toggleSortOrder;
window.UI.toggles.refreshAllUI = refreshAllUI;
window.UI.toggles.toggleStatsDisplayMode = toggleStatsDisplayMode;
