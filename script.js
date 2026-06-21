// script.js (UI 컨트롤, 데이터 통신 및 차트 렌더링 - 6슬롯 무한 확장 버전)

const APP_VERSION = "3.38";
const MAX_SLOTS = 6;

function formatStrategyNameWithSmallParentheses(name) {
  if (!name) return '';
  return name.replace(/\(([^)]+)\)/g, '<span class="stats-profit-rate">($1)</span>');
}

// 글로벌 상태 변수
let myUserId = "";
let myChart = null;
let currentOrderDate = "";
let isOrderView = true;
let isCombinedOrderMode = false;
let isStatsMode = false;
let isViewingHistory = false;
let lastMyPerfData = null;
let perfLastCheckTime = 0;
let activeSettingsTab = 1;
let periodViewState = 0;
let periodDisplayMode = 'chart';
let yearlyDisplayMode = 'chart'; // 'chart' 또는 'table'
let monthlyDisplayMode = 'chart'; // 'chart' 또는 'table'
let dailyDisplayMode = 'chart'; // 'chart' 또는 'table'
let isManualBacktestMode = false;
let chartViewMode = 0;
let showIndividualHoldings = false;
let statsDisplayMode = "chart";
let perfStatsMode = "performance";
let backtestStatsMode = "performance";
let statsPieChartInstance = null;

function getStatsDisplayModeKey() {
  return `vtotal_stats_display_mode_${myUserId || 'guest'}`;
}

function getPerfStatsModeKey() {
  return `vtotal_perf_stats_mode_${myUserId || 'guest'}`;
}

function loadStatsDisplayMode() {
  const saved = localStorage.getItem(getStatsDisplayModeKey());
  return saved === 'table' ? 'table' : 'chart';
}

function loadPerfStatsMode() {
  const saved = localStorage.getItem(getPerfStatsModeKey());
  return saved === 'realtime' ? 'realtime' : 'performance';
}

function saveStatsDisplayMode() {
  localStorage.setItem(getStatsDisplayModeKey(), statsDisplayMode);
}

function savePerfStatsMode() {
  localStorage.setItem(getPerfStatsModeKey(), perfStatsMode);
}

function normalizeHighlightDate(dateValue) {
  if (!dateValue || dateValue === "-") return "";
  const normalized = parseDateStr(dateValue);
  if (!normalized || normalized === "-") return "";
  return normalized.length === 10 ? normalized.substring(2) : normalized;
}

function getPrimaryStrategyDisplayDate() {
  const res = getBestResult(lastBTResults[1], 1);
  const rawDate = getDisplaySheetDate(1, res, slotConfigs[1]);
  return normalizeHighlightDate(rawDate);
}

function isPrimaryStrategyDate(dateValue) {
  const primaryDate = getPrimaryStrategyDisplayDate();
  return primaryDate && normalizeHighlightDate(dateValue) === primaryDate;
}

function getDateHighlightClass(dateValue) {
  return isPrimaryStrategyDate(dateValue) ? ' class="date-sync-highlight"' : '';
}

function applyPrimaryDateHighlight() {
  const primaryDate = getPrimaryStrategyDisplayDate();
  if (!primaryDate) return;
  const selectors = [
    '#combinedHoldingsBody tr td:nth-child(2)',
    '[id^="holdingsBody"] tr td:nth-child(2)',
    '#historyTableBody tr td:nth-child(3)'
  ];
  document.querySelectorAll(selectors.join(',')).forEach((cell) => {
    const row = cell.closest('tr');
    if (row) row.classList.toggle('date-sync-highlight-row', normalizeHighlightDate(cell.textContent) === primaryDate);
  });
}

function resetOrderExpansion() {
  const grid = document.getElementById('mainGrid');
  const btn = document.getElementById('btnExpandOrder');
  if (grid) {
    grid.classList.remove('order-expanded');
    if (periodViewState === 2) grid.classList.add('monthly-expanded');
  }
  if (btn) btn.classList.remove('active');
}

// 개별 보유현황 토글 함수
function toggleIndividualHoldings(event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  showIndividualHoldings = !showIndividualHoldings;
  updateSlotsVisibility();
  refreshOrderViewUI();
}
window.toggleIndividualHoldings = toggleIndividualHoldings;

// 동적 상태 관리 배열 (인덱스 1부터 사용하기 위해 MAX_SLOTS + 1 크기로 생성)
let slotConfigs = Array(MAX_SLOTS + 1).fill(null);
let simulationConfigs = Array(MAX_SLOTS + 1).fill(null);
let lastBTResults = Array(MAX_SLOTS + 1).fill(null);
let globalMonthlyDataArr = Array(MAX_SLOTS + 1).fill(null);
let globalYearlyDataArr = Array(MAX_SLOTS + 1).fill(null);
let globalDailyDataArr = Array(MAX_SLOTS + 1).fill(null);
let globalCombinedMonthlyData = [];
let globalCombinedYearlyData = [];
let globalCombinedDailyData = [];

// 슬롯별 테마 색상 (반복 순환)
const SLOT_COLORS = ['#6366f1', '#10b981', '#fbbf24', '#f43f5e', '#8b5cf6', '#06b6d4', '#eab308'];

// 년별/월별 성과 테이블 구조 동적 생성 헬퍼 함수
function generatePeriodTableDOM(containerId, suffix, viewState) {
  const tableContainer = document.getElementById(containerId);
  if (!tableContainer) return;

  const TH_STYLE = "white-space:nowrap; padding:0 4px !important; text-align:center; vertical-align:middle; height:16px !important; line-height:16px !important; box-sizing:border-box !important; overflow:hidden;";
  
  let head0Text = "";
  if (viewState === 0) head0Text = "년월";
  else if (viewState === 1) head0Text = "연도";
  else head0Text = "일자";

  let tableHtml = `
    <div id="monthlySlot0${suffix}" class="monthly-slot-0">
      <div class="slot-title">구분</div>
      <table class="data-table period-table-0" id="periodTable0${suffix}">
        <thead><tr id="periodTableHead0${suffix}"><th style="${TH_STYLE} width:1%;">${head0Text}</th></tr></thead>
        <tbody id="periodBody0${suffix}"><tr><td>-</td></tr></tbody>
      </table>
    </div>`;

  const headDataStr = `<th style="${TH_STYLE}">수익금</th><th style="${TH_STYLE}">수익률</th><th class="hide-on-cover" style="${TH_STYLE}">MDD</th>`;

  // 1) 종합(Combined) 슬롯을 첫 번째(구분 뒤)에 배치하며 일반 3개 컬럼 적용
  tableHtml += `
    <div id="monthlySlotCombined${suffix}" class="monthly-slot-combined">
      <div class="slot-title swipe-handler" style="color:rgba(168, 85, 247, 0.9);">종합</div>
      <table class="data-table" id="periodTableCombined${suffix}">
        <thead><tr id="periodTableHeadCombined${suffix}">${headDataStr}</tr></thead>
        <tbody id="periodBodyCombined${suffix}"><tr><td colspan="3" class="table-empty-cell">데이터 대기 중...</td></tr></tbody>
      </table>
    </div>`;

  // 2) 개별 투자법 슬롯들 배치하며 일반 3개 컬럼 적용
  for (let i = 1; i <= MAX_SLOTS; i++) {
    tableHtml += `
      <div id="monthlySlot${i}${suffix}" class="monthly-slot-item">
        <div class="slot-title swipe-handler" style="color:${SLOT_COLORS[(i - 1) % SLOT_COLORS.length]};" id="slot${i}TableName${suffix}">V-QUANT 2-${i}</div>
        <table class="data-table" id="periodTable${i}${suffix}">
          <thead><tr id="periodTableHead${i}${suffix}">${headDataStr}</tr></thead>
          <tbody id="periodBody${i}${suffix}"><tr><td colspan="3" class="table-empty-cell">데이터 대기 중...</td></tr></tbody>
        </table>
      </div>`;
  }

  tableContainer.innerHTML = tableHtml;
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
            <div class="slot-title slot-title-sm" style="color:#fbbf24; cursor:pointer;" onclick="toggleSortOrder()" title="클릭하여 오름/내림 정렬 토글">통합 퉁치기 주문표</div>
            <table class="data-table">
              <thead><tr><th style="width:15%;">종류</th><th style="width:25%;">가격</th><th style="width:20%;">수량</th></tr></thead>
              <tbody id="combinedOrderBody"><tr><td colspan="3" class="table-empty-cell">주문 없음</td></tr></tbody>
            </table>
          </div>
          <div id="combinedHoldingsView" class="view-pane-hidden">
            <div class="slot-title slot-title-sm" style="color:#fbbf24; cursor:pointer;" onclick="toggleIndividualHoldings(event)" title="클릭하여 개별 보유현황 토글">통합 보유 현황</div>
            <table class="data-table">
              <thead><tr><th style="cursor:pointer; text-decoration:underline;" onclick="toggleIndividualHoldings(event)" title="클릭하여 개별 보유현황 토글">투자법</th><th>진입일</th><th>청산일</th><th>모드/T</th><th>진입가</th><th>청산가</th><th>수량</th><th>수익금</th></tr></thead>
              <tbody id="combinedHoldingsBody"><tr><td colspan="8" class="table-empty-cell">보유 없음</td></tr></tbody>
            </table>
          </div>
        </div>
        <div class="tier-footer" style="justify-content:center;">
          <div style="color:#fbbf24;">Combined</div>
        </div>
      </div>`;
    for (let i = 1; i <= MAX_SLOTS; i++) {
      const borderClass = i > 1 ? ' has-border-left' : '';
      orderHtml += `
        <div id="orderSlot${i}" class="order-slot-container${borderClass}">
          <div id="orderScroll${i}" class="order-scroll-area slim-scroll">
            <div id="orderView${i}" class="view-pane-active">
              <div class="slot-title slot-title-sm" id="orderSlot${i}Name" style="color:${SLOT_COLORS[(i - 1) % SLOT_COLORS.length]}; cursor:pointer;" onclick="toggleSortOrder()" title="클릭하여 오름/내림 정렬 토글"></div>
              <table class="data-table">
                <thead><tr><th>구분</th><th class="hidden">방식</th><th>가격</th><th>수량</th></tr></thead>
                <tbody id="orderBody${i}"><tr><td colspan="3" class="table-empty-cell">데이터 대기 중...</td></tr></tbody>
              </table>
            </div>
            <div id="holdingsView${i}" class="view-pane-hidden">
              <div class="slot-title slot-title-sm" id="holdingsSlot${i}Name" style="color:${SLOT_COLORS[(i - 1) % SLOT_COLORS.length]}; cursor:pointer;" onclick="toggleIndividualHoldings(event)" title="클릭하여 통합 보유현황 토글"></div>
              <table class="data-table">
                <thead><tr><th style="cursor:pointer; text-decoration:underline;" onclick="toggleIndividualHoldings(event)" title="클릭하여 통합 보유현황 토글">투자법</th><th>진입일</th><th>청산일</th><th>모드/T</th><th>진입가</th><th>청산가</th><th>수량</th><th>수익금</th></tr></thead>
                <tbody id="holdingsBody${i}"><tr><td colspan="8" class="table-empty-cell">데이터 대기 중...</td></tr></tbody>
              </table>
            </div>
          </div>
          <div class="tier-footer" id="tierFooter${i}">
            <div>T: <span id="tierCountVal${i}" class="tier-footer-val">-</span></div>
            <div>M: <span id="modeCountVal${i}" class="tier-footer-val">-</span></div>
            <div>W: <span id="weightCountVal${i}" class="tier-footer-val">-</span></div>
            <div>Q: <span id="qtyCountVal${i}" class="tier-footer-val">-</span></div>
          </div>
        </div>`;
    }
    orderContainer.innerHTML = orderHtml;
  }

  if (tableContainer) {
    generatePeriodTableDOM('periodTableFlex', '', periodViewState);
  }

  // 성과 탭 전용 테이블들 동적 생성
  generatePeriodTableDOM('perfYearlyTableFlex', 'Yearly', 1);
  generatePeriodTableDOM('perfMonthlyTableFlex', 'Monthly', 0);
  generatePeriodTableDOM('perfDailyTableFlex', 'Daily', 2);
}

// 2. 초기 로드 및 편의 함수
window.addEventListener('DOMContentLoaded', generateDynamicDOM);

function forceUpdateApp() {
  if (confirm(`현재 버전: ${APP_VERSION}\n앱 데이터를 강제로 초기화할까요?`)) {
    try { indexedDB.deleteDatabase(DB_NAME); localStorage.clear(); } catch (e) { }
    window.location.reload();
  }
}

function toggleSettings() {
  const screen = document.getElementById('settingsScreen');
  const isVisible = screen.style.display === 'flex';
  if (!isVisible) updateSettingsTabButtons();
  screen.style.display = isVisible ? 'none' : 'flex';
}

function setLED(status) {
  const lamp = document.getElementById('ledLamp');
  if (!lamp) return;
  lamp.className = 'led-lamp';
  if (status === 'on') lamp.classList.add('led-on');
  else if (status === 'loading') lamp.classList.add('led-loading');
  else if (status === 'off' || status === 'error') { lamp.style.background = '#ef4444'; lamp.style.boxShadow = '0 0 10px #ef4444'; }
}

async function restoreRealAccountMode() {
  if (!confirm("🔄 실전 데이터 모드로 복원하시겠습니까?\n\n현재 화면의 백테스트 결과가 사라지고 구글 시트 데이터로 교체됩니다.")) return;
  isViewingHistory = false;
  isManualBacktestMode = false;
  updateHeaderDisplay();
  setLED('loading');
  await checkAndSyncWithServer(true, true);
  setLED('on');
  showToast("✅ 실전 데이터로 복원되었습니다.");
}

// 🔄 수동 백테스트 해제 및 기존 로컬 캐시 복원 함수
function restoreLocalCache() {
  isManualBacktestMode = false;
  isViewingHistory = false;
  updateHeaderDisplay();

  // 슬롯별로 localStorage에 저장된 실제 실전 캐시(snap) 데이터를 메모리에 다시 복원
  for (let i = 1; i <= MAX_SLOTS; i++) {
    const snapStr = localStorage.getItem(`vtotal_snap${i}_${myUserId}`);
    // isManualBacktestMode가 false가 되었으므로 isSlotActive는 원래의 slotConfigs를 바라봄
    if (snapStr && isSlotActive(i)) {
      try {
        const snap = JSON.parse(snapStr);
        lastBTResults[i] = snap;
        globalMonthlyDataArr[i] = snap.monthlyData;
        globalYearlyDataArr[i] = snap.yearlyData;
        globalDailyDataArr[i] = snap.dailyData;

        if (i === 1) initData(slotConfigs[1]); // 1번 슬롯 폼 복원
        renderOrderViewSlot(snap, i);
        renderPeriodTableSlot(i);
      } catch (e) { }
    } else {
      lastBTResults[i] = null;
    }
  }

  // UI 및 차트, 종합 데이터 재계산 렌더링
  updateSlotsVisibility();
  calculateCombinedPeriodData();
  renderChartAll();
  refreshStatsTable();
  updateCurrentStatusUI(activeSettingsTab);
}

function preparePerfLayout() {
  const chartC = document.getElementById('periodChartContainer');
  const tableC = document.getElementById('periodTableContainer');
  const perfMonthlyChartCard = document.getElementById('panelMonthlyChart');
  const perfDailyChartCard = document.getElementById('panelDailyChart');

  const perfYearlyC = document.getElementById('perfYearlyChartContainer');
  const perfYearlyTableC = document.getElementById('perfYearlyTableContainer');
  const perfMonthlyC = document.getElementById('perfMonthlyChartContainer');
  const perfMonthlyTableC = document.getElementById('perfMonthlyTableContainer');
  const perfDailyC = document.getElementById('perfDailyChartContainer');
  const perfDailyTableC = document.getElementById('perfDailyTableContainer');

  const periodTitle = document.getElementById('periodTitle');
  const periodChartTitle = document.getElementById('periodChartTitle');
  const periodDailyTitle = document.getElementById('periodDailyTitle');
  const btnPeriodMode = document.getElementById('btnPeriodMode');
  const btnPeriodModeYearly = document.getElementById('btnPeriodModeYearly');
  const btnPeriodModeMonthly = document.getElementById('btnPeriodModeMonthly');
  const btnPeriodModeDaily = document.getElementById('btnPeriodModeDaily');
  const currencyBtns = document.querySelectorAll('.btn-currency-toggle');

  // 패널 타이틀 고정
  if (periodTitle) periodTitle.innerHTML = '📅 년별 성과 그래프';
  if (periodChartTitle) periodChartTitle.innerHTML = '📅 월별 성과 그래프';
  if (periodDailyTitle) periodDailyTitle.innerHTML = '📅 일별 성과 그래프';

  // 홈화면용 토글 버튼은 숨김
  if (btnPeriodMode) btnPeriodMode.style.display = 'none';

  // 성과 탭용 토글 버튼들 표시
  if (btnPeriodModeYearly) btnPeriodModeYearly.style.display = 'flex';
  if (btnPeriodModeMonthly) btnPeriodModeMonthly.style.display = 'none';
  if (btnPeriodModeDaily) btnPeriodModeDaily.style.display = 'none';

  // 원래 홈화면용 차트 및 테이블 숨김
  if (chartC) chartC.style.display = 'none';
  if (tableC) tableC.style.display = 'none';

  // 월별/일별 패널 카드 활성화
  if (perfMonthlyChartCard) perfMonthlyChartCard.classList.remove('hidden');
  if (perfDailyChartCard) perfDailyChartCard.classList.remove('hidden');

  // 년별 보기 모드에 따라 컨테이너 제어
  if (yearlyDisplayMode === 'chart') {
    if (perfYearlyC) perfYearlyC.style.display = 'block';
    if (perfYearlyTableC) perfYearlyTableC.style.display = 'none';
    if (btnPeriodModeYearly) btnPeriodModeYearly.innerHTML = '<span>🔢</span>';
  } else {
    if (perfYearlyC) perfYearlyC.style.display = 'none';
    if (perfYearlyTableC) perfYearlyTableC.style.display = 'block';
    if (btnPeriodModeYearly) btnPeriodModeYearly.innerHTML = '<span>📊</span>';
  }

  // 월별 보기 모드에 따라 컨테이너 제어
  if (monthlyDisplayMode === 'chart') {
    if (perfMonthlyC) perfMonthlyC.style.display = 'block';
    if (perfMonthlyTableC) perfMonthlyTableC.style.display = 'none';
    if (btnPeriodModeMonthly) btnPeriodModeMonthly.innerHTML = '<span>🔢</span>';
  } else {
    if (perfMonthlyC) perfMonthlyC.style.display = 'none';
    if (perfMonthlyTableC) perfMonthlyTableC.style.display = 'block';
    if (btnPeriodModeMonthly) btnPeriodModeMonthly.innerHTML = '<span>📊</span>';
  }

  // 일별 보기 모드에 따라 컨테이너 제어
  if (dailyDisplayMode === 'chart') {
    if (perfDailyC) perfDailyC.style.display = 'block';
    if (perfDailyTableC) perfDailyTableC.style.display = 'none';
    if (btnPeriodModeDaily) btnPeriodModeDaily.innerHTML = '<span>🔢</span>';
  } else {
    if (perfDailyC) perfDailyC.style.display = 'none';
    if (perfDailyTableC) perfDailyTableC.style.display = 'block';
    if (btnPeriodModeDaily) btnPeriodModeDaily.innerHTML = '<span>📊</span>';
  }

  currencyBtns.forEach(btn => { btn.style.display = 'none'; });
  const dailyCurrencyBtn = document.getElementById('btnCurrencyToggleDaily');
  if (dailyCurrencyBtn) dailyCurrencyBtn.style.display = 'flex';
  const chartCurrencyBtn = document.getElementById('btnCurrencyToggleChart');
  if (chartCurrencyBtn) chartCurrencyBtn.style.display = 'none';

  const statsCurrencyBtn = document.getElementById('statsCurrencyToggle');
  if (statsCurrencyBtn) statsCurrencyBtn.style.display = 'flex';

  if (typeof syncCurrencyUI === 'function') syncCurrencyUI();

  renderPerfTabCharts();
  renderPerfTables();
}

function restoreFromPerfLayout() {
  const chartC = document.getElementById('periodChartContainer');
  const tableC = document.getElementById('periodTableContainer');
  const perfMonthlyChartCard = document.getElementById('panelMonthlyChart');
  const perfDailyChartCard = document.getElementById('panelDailyChart');
  const priceInfoCard = document.getElementById('panelPriceInfo');

  if (priceInfoCard) priceInfoCard.style.display = 'none';
  const grid = document.getElementById('mainGrid');
  if (grid) grid.classList.remove('price-info-expanded');
  const btnPrice = document.getElementById('btnPriceInfo');
  if (btnPrice) btnPrice.classList.remove('active');

  const perfYearlyC = document.getElementById('perfYearlyChartContainer');
  const perfYearlyTableC = document.getElementById('perfYearlyTableContainer');
  const perfMonthlyC = document.getElementById('perfMonthlyChartContainer');
  const perfMonthlyTableC = document.getElementById('perfMonthlyTableContainer');
  const perfDailyC = document.getElementById('perfDailyChartContainer');
  const perfDailyTableC = document.getElementById('perfDailyTableContainer');

  const btnPeriodMode = document.getElementById('btnPeriodMode');
  const btnPeriodModeYearly = document.getElementById('btnPeriodModeYearly');
  const btnPeriodModeMonthly = document.getElementById('btnPeriodModeMonthly');
  const btnPeriodModeDaily = document.getElementById('btnPeriodModeDaily');
  const currencyBtns = document.querySelectorAll('.btn-currency-toggle');

  if (btnPeriodMode) btnPeriodMode.style.display = 'flex';
  if (btnPeriodModeYearly) btnPeriodModeYearly.style.display = 'none';
  if (btnPeriodModeMonthly) btnPeriodModeMonthly.style.display = 'none';
  if (btnPeriodModeDaily) btnPeriodModeDaily.style.display = 'none';

  if (perfYearlyC) perfYearlyC.style.display = 'none';
  if (perfYearlyTableC) perfYearlyTableC.style.display = 'none';
  if (perfMonthlyC) perfMonthlyC.style.display = 'none';
  if (perfMonthlyTableC) perfMonthlyTableC.style.display = 'none';
  if (perfDailyC) perfDailyC.style.display = 'none';
  if (perfDailyTableC) perfDailyTableC.style.display = 'none';

  if (perfMonthlyChartCard) perfMonthlyChartCard.classList.add('hidden');
  if (perfDailyChartCard) perfDailyChartCard.classList.add('hidden');

  currencyBtns.forEach(btn => { btn.style.display = 'none'; });
  const dailyCurrencyBtn = document.getElementById('btnCurrencyToggleDaily');
  if (dailyCurrencyBtn) dailyCurrencyBtn.style.display = 'none';
  const chartCurrencyBtn = document.getElementById('btnCurrencyToggleChart');
  if (chartCurrencyBtn) chartCurrencyBtn.style.display = 'flex';

  const statsCurrencyBtn = document.getElementById('statsCurrencyToggle');
  if (statsCurrencyBtn) statsCurrencyBtn.style.display = 'none';

  updatePeriodTitle();

  const ico = document.getElementById('icoPeriodMode');
  if (periodDisplayMode === 'chart') {
    if (chartC) chartC.style.display = 'flex';
    if (tableC) tableC.style.display = 'none';
    if (ico) ico.innerHTML = '🔢';
    if (typeof renderPeriodBarChart === 'function') renderPeriodBarChart();
  } else {
    if (chartC) chartC.style.display = 'none';
    if (tableC) tableC.style.display = 'block';
    if (ico) ico.innerHTML = '📊';
  }
}

function ensureBacktestChartPanelsVisible() {
  const monthlyPanel = document.getElementById('panelMonthly');
  const chartPanel = document.getElementById('panelChart');
  const chartC = document.getElementById('periodChartContainer');
  const tableC = document.getElementById('periodTableContainer');
  const perfMonthlyChartCard = document.getElementById('panelMonthlyChart');
  const perfDailyChartCard = document.getElementById('panelDailyChart');

  if (monthlyPanel) {
    monthlyPanel.classList.remove('hidden');
    monthlyPanel.style.display = '';
  }
  if (chartPanel) {
    chartPanel.classList.remove('hidden');
    chartPanel.style.display = '';
  }
  if (perfMonthlyChartCard) perfMonthlyChartCard.classList.add('hidden');
  if (perfDailyChartCard) perfDailyChartCard.classList.add('hidden');

  if (periodDisplayMode === 'chart') {
    if (chartC) chartC.style.display = 'flex';
    if (tableC) tableC.style.display = 'none';
  } else {
    if (chartC) chartC.style.display = 'none';
    if (tableC) tableC.style.display = 'block';
  }
}

function resetBacktestChartRenderCache() {
  window.currentChartSignature = "";
  if (window.barChartSignatures) window.barChartSignatures.periodBarChart = "";
}

function renderPerfTabCharts() {
  const grid = document.getElementById('mainGrid');
  if (grid && grid.classList.contains('perf-tab-layout')) {
    if (typeof renderPeriodBarChartRaw === 'function') {
      if (yearlyDisplayMode === 'chart') renderPeriodBarChartRaw('perfYearlyBarChart', 1);
      if (monthlyDisplayMode === 'chart') renderPeriodBarChartRaw('perfMonthlyBarChart', 0);
      if (dailyDisplayMode === 'chart') renderPeriodBarChartRaw('perfDailyBarChart', 2);
    }
  }
}

function togglePeriodDisplayModeYearly() {
  yearlyDisplayMode = (yearlyDisplayMode === 'chart') ? 'table' : 'chart';
  
  // 3단(Monthly)과 4단(Daily)도 2단(Yearly)과 동일한 뷰 상태로 동기화합니다.
  monthlyDisplayMode = (yearlyDisplayMode === 'chart') ? 'table' : 'chart';
  dailyDisplayMode = (yearlyDisplayMode === 'chart') ? 'table' : 'chart';
  
  togglePeriodDisplayModeMonthly();
  togglePeriodDisplayModeDaily();

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
    // 년별 성과 테이블 렌더링
    for (let i = 1; i <= MAX_SLOTS; i++) {
      if (isSlotActive(i)) renderPeriodTableTextRaw(i, 1, "Yearly");
    }
    renderPeriodTableTextRaw('Combined', 1, "Yearly");
    renderPeriodTableTextRaw(0, 1, "Yearly");
  }
}

function togglePeriodDisplayModeMonthly() {
  monthlyDisplayMode = (monthlyDisplayMode === 'chart') ? 'table' : 'chart';
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
      if (isSlotActive(i)) renderPeriodTableTextRaw(i, 0, "Monthly");
    }
    renderPeriodTableTextRaw('Combined', 0, "Monthly");
    renderPeriodTableTextRaw(0, 0, "Monthly");
  }
}

function togglePeriodDisplayModeDaily() {
  dailyDisplayMode = (dailyDisplayMode === 'chart') ? 'table' : 'chart';
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
      if (isSlotActive(i)) renderPeriodTableTextRaw(i, 2, "Daily");
    }
    renderPeriodTableTextRaw('Combined', 2, "Daily");
    renderPeriodTableTextRaw(0, 2, "Daily");
  }
}

function showOrderView() {
  restoreFromPerfLayout();
  // ⭐️ 수동 백테스트 중이었다면 원래 설정과 캐시로 즉시 복귀
  if (isManualBacktestMode) {
    restoreLocalCache();
    showToast("실전 데이터 모드로 복귀했습니다.", "🔄");
  }

  isStatsMode = false;
  isOrderView = true;
  const grid = document.getElementById('mainGrid');
  if (grid) {
    grid.classList.remove('perf-metrics-layout', 'backtest-view-layout', 'perf-tab-layout', 'price-info-expanded');
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
    statsTitle.innerHTML = isViewingHistory ? '📄 성과 지표' : (statsDisplayMode === 'chart' ? '💼 자산현황' : '📡 실시간 운영현황');
  }

  const btnStats = document.getElementById('btnStatsShow');
  if (btnStats) btnStats.classList.remove('active');
  const btnPerf = document.getElementById('btnPerfShow');
  if (btnPerf) btnPerf.classList.remove('active');
  const btnInstant = document.getElementById('btnInstant');
  if (btnInstant) btnInstant.classList.add('active');
  if (shouldAutoRefresh()) handleInstantOrder();
  else refreshOrderViewUI();
}

function shouldAutoRefresh() {
  if (!myUserId) return false;
  const now = new Date();
  const nyTimeStr = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
  const nyDateStr = formatDateNY(now);
  const lastDate = localStorage.getItem('vtotal_last_auto_ny_' + myUserId);
  
  const nyDateObj = new Date(nyTimeStr);
  const nyHour = nyDateObj.getHours();
  const nyMin = nyDateObj.getMinutes();
  
  // 뉴욕 장 마감(16:00) 이후부터 다음 장 시작(09:30) 전까지 자동 갱신 허용
  const isMarketClosedTime = (nyHour >= 16 || nyHour < 9 || (nyHour === 9 && nyMin < 30));
  
  if (isMarketClosedTime) {
    if (lastDate !== nyDateStr) {
      localStorage.setItem('vtotal_last_auto_ny_' + myUserId, nyDateStr);
      return true;
    }
  }
  return false;
}

function updateStatsTitleByMode() {
  const statsTitle = document.getElementById('statsTitle');
  if (!statsTitle) return;
  statsTitle.innerHTML = statsDisplayMode === 'chart' ? '💼 자산현황' : '📡 실시간 운영현황';
}

function showStatsView() {
  restoreFromPerfLayout();
  resetOrderExpansion();
  // ⭐️ 수동 백테스트 중이었다면 원래 설정과 캐시로 즉시 복귀
  if (isManualBacktestMode) {
    restoreLocalCache();
    showToast("실전 데이터 모드로 복귀했습니다.", "🔄");
  }

  isStatsMode = true;
  isOrderView = false;
  statsDisplayMode = loadStatsDisplayMode();
  
  const statsTitle = document.getElementById('statsTitle');
  if (statsTitle) statsTitle.innerHTML = statsDisplayMode === 'chart' ? '💼 자산현황' : '📡 실시간 운영현황';

  const grid = document.getElementById('mainGrid');
  if (grid) {
    grid.classList.add('perf-metrics-layout');
    grid.classList.remove('backtest-view-layout', 'perf-tab-layout');
  }
  const btnStats = document.getElementById('btnStatsShow');
  if (btnStats) btnStats.classList.add('active');
  const btnPerf = document.getElementById('btnPerfShow');
  if (btnPerf) btnPerf.classList.remove('active');
  const btnInstant = document.getElementById('btnInstant');
  if (btnInstant) btnInstant.classList.remove('active');

  // 데이터가 정상적으로 있으면 종합 데이터 및 차트만 리렌더링
  calculateCombinedPeriodData();
  renderChartAll();
  refreshStatsTable();
  refreshOrderViewUI();
  renderDBTradeHistory();
}

function showPerfView() {
  resetOrderExpansion();
  
  // 주가 정보 확장 해제 및 카드 숨김
  const priceInfoCard = document.getElementById('panelPriceInfo');
  if (priceInfoCard) priceInfoCard.style.display = 'none';
  const btnPrice = document.getElementById('btnPriceInfo');
  if (btnPrice) btnPrice.classList.remove('active');
  const grid = document.getElementById('mainGrid');
  if (grid) {
    grid.classList.remove('price-info-expanded');
  }

  // ⭐️ 수동 백테스트 중이었다면 원래 설정과 캐시로 즉시 복귀
  if (isManualBacktestMode) {
    restoreLocalCache();
    showToast("실전 데이터 모드로 복귀했습니다.", "🔄");
  }

  isStatsMode = false;
  isOrderView = false;
  statsDisplayMode = "table";
  perfStatsMode = loadPerfStatsMode();
  
  const statsTitle = document.getElementById('statsTitle');
  if (statsTitle) statsTitle.innerHTML = perfStatsMode === 'realtime' ? '📡 실시간 운영현황' : '📄 성과 지표';

  if (grid) {
    grid.classList.add('perf-tab-layout');
    grid.classList.remove('perf-metrics-layout', 'backtest-view-layout', 'price-info-expanded');
  }

  // 성과 탭 전용 DOM 이동 레이아웃 준비
  preparePerfLayout();

  const btnPerf = document.getElementById('btnPerfShow');
  if (btnPerf) btnPerf.classList.add('active');
  const btnStats = document.getElementById('btnStatsShow');
  if (btnStats) btnStats.classList.remove('active');
  const btnInstant = document.getElementById('btnInstant');
  if (btnInstant) btnInstant.classList.remove('active');

  // 데이터가 정상적으로 있으면 종합 데이터 및 차트만 리렌더링
  calculateCombinedPeriodData();
  renderChartAll();
  refreshStatsTable();
  
  // 월별 성과 테이블 텍스트 렌더링 호출
  for (let i = 1; i <= MAX_SLOTS; i++) {
    if (isSlotActive(i)) renderPeriodTableText(i);
  }
  renderPeriodTableText('Combined');
  renderPeriodTableText(0);

  refreshOrderViewUI();

  if (window.myChart) {
    setTimeout(() => {
      window.myChart.resize();
    }, 50);
  }
  if (window.myPeriodChart) {
    setTimeout(() => {
      window.myPeriodChart.resize();
    }, 50);
  }
}

function toggleOrderView(dir) {
  // 보유현황 모드(!isOrderView)일 때는 개별 보유현황 토글 처리
  if (!isOrderView) {
    if (dir === 'left') {
      showIndividualHoldings = true;
    } else if (dir === 'right') {
      showIndividualHoldings = false;
    } else {
      showIndividualHoldings = !showIndividualHoldings;
    }
    updateSlotsVisibility();
    refreshOrderViewUI();
    return;
  }

  // 내역 화면(실시간 운영현황 모드)일 때는 클릭 시 무반응
  if (isStatsMode) {
    return;
  }

  const currentMode = localStorage.getItem(`vtotal_combined_mode_${myUserId}`) || 'combined';
  let nextMode = 'combined';

  const modes = ['combined', 'normal', 'combined_normal'];
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
  localStorage.setItem(`vtotal_combined_mode_${myUserId}`, nextMode);
  const combinedModeSelect = document.getElementById('combinedModeSelect');
  if (combinedModeSelect) combinedModeSelect.value = nextMode;

  showToast(`주문표 모드가 ${nextMode === 'combined' ? '통합' : (nextMode === 'normal' ? '일반' : '통합+일반')}으로 전환되었습니다.`);

  updateSlotsVisibility();
  refreshOrderViewUI();
}

function renderCombinedOrderBook() {
  const tbody = document.getElementById('combinedOrderBody');
  if (!tbody) return;

  let allRawOrders = [];
  for (let i = 1; i <= MAX_SLOTS; i++) {
    if (isSlotActive(i)) {
      const res = getBestResult(lastBTResults[i], i);
      if (res && res.rawOrders) {
        allRawOrders = allRawOrders.concat(res.rawOrders);
      } else if (res && res.orders) {
        allRawOrders = allRawOrders.concat(res.orders);
      }
    }
  }

  let finalCombinedOrders = [];
  if (typeof run_tungchigi_master === 'function') {
    finalCombinedOrders = run_tungchigi_master(allRawOrders);
  } else {
    finalCombinedOrders = allRawOrders;
  }

  if (!finalCombinedOrders || finalCombinedOrders.length === 0) {
    tbody.innerHTML = "<tr><td colspan='3' style='padding:20px; color:#64748b; text-align:center;'>통합 주문 내역이 없습니다</td></tr>";
    return;
  }
  
  let sortedOrders = [...finalCombinedOrders];
  const orderSortOrder = localStorage.getItem(`vtotal_sort_order_${myUserId}`) || 'desc';
  sortedOrders.sort((a, b) => {
    let pA = parseFloat(a[2]) || 0;
    let pB = parseFloat(b[2]) || 0;
    return orderSortOrder === 'desc' ? (pB - pA) : (pA - pB);
  });

  tbody.innerHTML = sortedOrders.map(o => {
    const cls = o[0] === '매수' ? 'buy' : 'sell';
    const sideText = (o[1] === 'MOC' || o[1] === 'LOC') ? o[1] + o[0] : o[0];
    return `<tr><td class="${cls}">${sideText}</td><td class="${cls}">$${Number(o[2]).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td><td class="${cls}">${o[3]}주</td></tr>`;
  }).join('');
}

function renderCombinedHoldings() {
  const tbody = document.getElementById('combinedHoldingsBody');
  if (!tbody) return;

  let allHoldings = [];
  for (let i = 1; i <= MAX_SLOTS; i++) {
    if (isSlotActive(i)) {
      const res = getBestResult(lastBTResults[i], i);
      if (res && res.inv) {
        const stratName = res.currentStrat || slotConfigs[i]?.basics?.strategy || "";
        let currPrice = 0;
        const mainData = window.globalMainDataSlot?.[i] || window.globalMainData;
        if (mainData && mainData.close && mainData.close.length > 0) {
          currPrice = mainData.close[mainData.close.length - 1] || 0;
        }
        res.inv.forEach(h => {
          allHoldings.push({
            ...h,
            stratName: stratName,
            slotNum: i,
            currPrice: currPrice
          });
        });
      }
    }
  }

  if (allHoldings.length === 0) {
    tbody.innerHTML = "<tr><td colspan='8' style='padding:20px; color:#64748b; text-align:center;'>통합 보유 현황이 없습니다</td></tr>";
    return;
  }

  allHoldings.sort((a, b) => {
    const dA = String(a.buyDate || a.buy_date || "");
    const dB = String(b.buyDate || b.buy_date || "");
    if (dA !== dB) return dB.localeCompare(dA);
    const slotA = parseInt(a.slotNum, 10) || 0;
    const slotB = parseInt(b.slotNum, 10) || 0;
    if (slotA !== slotB) return slotA - slotB;
    const pA = parseFloat(a.buy_price || a.buyPrice) || 0;
    const pB = parseFloat(b.buy_price || b.buyPrice) || 0;
    return pB - pA;
  });

  const modeMap = { 'Middle': 'Mid1', 'Middle2': 'Mid2', 'Middle3': 'Mid3', 'SF': 'SF', 'AG': 'AG' };

  tbody.innerHTML = allHoldings.map(o => {
    let sellPriceStr = "-", stopDateStr = "-";
    try {
      const modeData = MASTER_STRATEGIES[o.stratName].modes[o.mode];
      const sellPct = modeData.sell[o.tier - 1] || modeData.sell[0];
      const rawSellPrice = (Math.ceil((o.buy_price * (1 + sellPct) * 100) - 0.000001) / 100);
      if (isCurrencyKRW) {
        sellPriceStr = "₩" + Math.round(rawSellPrice * currentFXRate).toLocaleString();
      } else {
        sellPriceStr = "$" + rawSellPrice.toLocaleString(undefined, { minimumFractionDigits: 2 });
      }
      let holdLimit = modeData.hold[o.tier - 1] || modeData.hold[0];
      if (o.buyDate && window.globalMainData && window.globalMainData.dates) {
        const bIdx = window.globalMainData.dates.findIndex(d => formatDateNY(d) === o.buyDate);
        if (bIdx !== -1) {
          let curr = new Date(window.globalMainData.dates[bIdx]); let dCount = 0;
          while (dCount < holdLimit) {
            curr.setDate(curr.getDate() + 1); const dStr = formatDateNY(curr); const dow = curr.getDay();
            if (dow !== 0 && dow !== 6 && !isUSMarketHoliday(dStr)) dCount++;
          }
          const yy = String(curr.getFullYear()).slice(-2);
          const mm = String(curr.getMonth() + 1).padStart(2, '0');
          const dd = String(curr.getDate()).padStart(2, '0');
          stopDateStr = `${yy}-${mm}-${dd}`;
        }
      }
    } catch (e) { }

    let buyDateStr = "-";
    if (o.buyDate) {
      const parts = o.buyDate.split('-');
      if (parts.length === 3) {
        const yy = parts[0].slice(-2);
        buyDateStr = `${yy}-${parts[1]}-${parts[2]}`;
      } else {
        buyDateStr = o.buyDate;
      }
    }

    const displayMode = modeMap[o.mode] || o.mode;

    let profitStr = "-";
    let profitClass = "";
    if (o.currPrice > 0) {
      const buyPrice = parseFloat(String(o.buy_price || o.buyPrice || "0").replace(/[^0-9.-]/g, "")) || 0;
      const qty = parseFloat(o.qty) || 0;
      const profit = (o.currPrice - buyPrice) * qty;
      const sign = profit < 0 ? "-" : "";
      if (isCurrencyKRW) {
        profitStr = sign + "₩" + Math.round(Math.abs(profit) * currentFXRate).toLocaleString();
      } else {
        profitStr = sign + "$" + Math.abs(profit).toLocaleString(undefined, { minimumFractionDigits: 2 });
      }
      profitClass = profit > 0 ? "profit-plus" : (profit < 0 ? "profit-minus" : "");
    }

    let buyPriceStr = "";
    if (isCurrencyKRW) {
      buyPriceStr = "₩" + Math.round(Number(o.buy_price) * currentFXRate).toLocaleString();
    } else {
      buyPriceStr = "$" + Number(o.buy_price).toLocaleString(undefined, { minimumFractionDigits: 2 });
    }

    return `<tr><td style="cursor:pointer; text-decoration:underline; color:${SLOT_COLORS[(o.slotNum - 1) % SLOT_COLORS.length]};" onclick="toggleIndividualHoldings(event)" title="클릭하여 개별 보유현황 토글">#${o.slotNum}</td><td class="buy-price">${buyDateStr}</td><td>${stopDateStr}</td><td>${displayMode}/T${o.tier}</td><td class="buy-price">${buyPriceStr}</td><td class="hide-on-cover">${sellPriceStr}</td><td>${o.qty}</td><td class="${profitClass}">${profitStr}</td></tr>`;
  }).join('');
}

function toggleOrderExpansion() {
  const grid = document.getElementById('mainGrid');
  const btn = document.getElementById('btnExpandOrder');
  if (!grid || !btn) return;
  const isExpanded = grid.classList.toggle('order-expanded');
  if (isExpanded) { btn.classList.add('active'); grid.classList.remove('monthly-expanded'); }
  else { btn.classList.remove('active'); if (periodViewState === 2) grid.classList.add('monthly-expanded'); }
  if (myChart) setTimeout(() => myChart.resize(), 100);
}

function toggleChartView() {
  let activeCount = 0;
  for (let i = 1; i <= MAX_SLOTS; i++) if (isSlotActive(i)) activeCount++;
  if (activeCount === 0) return;

  // ⭐️ 안전한 순환 로직: 무한루프 방지 및 비어있는 슬롯 자동 건너뛰기
  do {
    chartViewMode = (chartViewMode + 1) % (MAX_SLOTS + 2);
  } while (chartViewMode >= 2 && chartViewMode <= MAX_SLOTS + 1 && !isSlotActive(chartViewMode - 1));

  try { localStorage.setItem(`vtotal_chart_view_mode_${myUserId}`, chartViewMode); } catch (e) { }
  renderChartAll();
}

// 3. 탭 및 설정 관리
function switchSettingsTab(tabNum) {
  saveCurrentFormToSlot(activeSettingsTab);
  activeSettingsTab = tabNum;
  loadSlotToForm(tabNum);
  updateSettingsTabButtons();
  updateCurrentStatusUI(tabNum);
  for (let i = 1; i <= MAX_SLOTS; i++) {
    const btn = document.getElementById('tabSlot' + i);
    if (btn) btn.style.background = (tabNum === i) ? `linear-gradient(135deg, ${SLOT_COLORS[(i - 1) % SLOT_COLORS.length]}, #4f46e5)` : 'rgba(51,65,85,0.8)';
  }
}

function updateSettingsTabButtons() {
  for (let i = 1; i <= MAX_SLOTS; i++) {
    const btn = document.getElementById('tabSlot' + i);
    if (btn) btn.innerText = slotConfigs[i]?.basics?.strategy || `투자법 ${i}`;
  }
}

function getSlotDisabledKey(slotNum, userId = myUserId) {
  return `vtotal_slot_disabled_${slotNum}_${userId || ""}`;
}

function isSlotLocallyDisabled(slotNum, userId = myUserId) {
  return localStorage.getItem(getSlotDisabledKey(slotNum, userId)) === "1";
}

function setSlotLocallyDisabled(slotNum, disabled, userId = myUserId) {
  const key = getSlotDisabledKey(slotNum, userId);
  if (disabled) localStorage.setItem(key, "1");
  else localStorage.removeItem(key);
}

function saveCurrentFormToSlot(slotNum) {
  const cfg = gatherParams();
  slotConfigs[slotNum] = cfg;
  localStorage.setItem(`vtotal_conf${slotNum}_${myUserId}`, JSON.stringify(cfg));
  setSlotLocallyDisabled(slotNum, cfg?.basics?.strategy === "정지");
}

function applySheetConfigToSlot(slotNum, confData) {
  if (!confData || !confData.basics) return;
  if (confData.basics.strategy === 'RSI 3M') confData.basics.strategy = '3M3D1-R';

  slotConfigs[slotNum] = { basics: { ...confData.basics } };
  localStorage.setItem(`vtotal_conf${slotNum}_${myUserId}`, JSON.stringify(slotConfigs[slotNum]));
  rememberSheetConfigSnapshot(slotNum, slotConfigs[slotNum]);

  if (slotNum === activeSettingsTab) {
    initData(slotConfigs[slotNum]);
  }
}

function loadSlotToForm(slotNum) {
  const cfg = slotConfigs[slotNum];
  if (cfg && cfg.basics) {
    initData(cfg);
  } else {
    ['ticker', 'startDate', 'endDate', 'initialCash', 'renewCash', 'strategySelect', 'fBase', 'fSec'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.value = '';
        if (id === 'strategySelect') el.dataset.prev = '';
      }
    });
  }
}

function isSlotActive(num) {
  const cfg = isManualBacktestMode ? simulationConfigs[num] : slotConfigs[num];
  if (cfg && cfg.basics && cfg.basics.strategy === "정지") return false;
  return !!(cfg && cfg.basics && cfg.basics.strategy && cfg.basics.strategy !== "");
}

function getSlotConfig(num) {
  const cfg = isManualBacktestMode ? simulationConfigs[num] : slotConfigs[num];
  if (cfg && cfg.basics && cfg.basics.strategy === "정지") return null;
  return cfg;
}

function updateSlotsVisibility() {
  const combinedMode = localStorage.getItem(`vtotal_combined_mode_${myUserId}`) || 'combined';
  let activeCount = 0;
  
  for (let i = 1; i <= MAX_SLOTS; i++) {
    const active = isSlotActive(i);
    if (active) activeCount++;
    const v = document.getElementById('orderSlot' + i);
    if (v) {
      if (!isOrderView && !showIndividualHoldings) {
        v.style.display = 'none';
      } else if (!isOrderView && showIndividualHoldings) {
        v.style.display = active ? 'flex' : 'none';
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
      if (showIndividualHoldings) {
        combinedSlot.style.display = 'none';
      } else {
        combinedSlot.style.display = 'flex';
      }
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
  refreshStatsTable();
}

// 4. 앱 초기화 및 로그인
window.onload = function () {
  generateDynamicDOM();
  const isAuth = localStorage.getItem('vtotal_auth'); const savedId = localStorage.getItem('vtotal_id');
  if (isAuth === 'true' && savedId) { myUserId = savedId; enterAppDirectly(); }
  else { document.getElementById('loginScreen').classList.remove('hidden'); }
};

async function handleLogin() {
  const id = document.getElementById('loginId').value.trim(), pw = document.getElementById('loginPw').value.trim(), btn = document.getElementById('loginBtn');
  if (!id || !pw) return alert("아이디와 비밀번호를 입력하세요"); btn.innerText = "서버 통신 중..."; btn.disabled = true;
  try {
    const [loginResp, initResp] = await Promise.all([
      fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: "LOGIN_OR_REGISTER", id: id, pw: pw }) }),
      fetch(`${GAS_URL}?action=GET_INIT&id=${id}`).catch(() => null)
    ]);
    const res = await loginResp.json();
    if (res.result === "success") {
      localStorage.setItem('vtotal_auth', 'true'); localStorage.setItem('vtotal_id', id); myUserId = id;
      if (initResp) {
        try {
          const initData = await initResp.json();
          for (let i = 1; i <= MAX_SLOTS; i++) {
            const prop = i === 1 ? 'config' : `config${i}`;
            if (initData[prop] && !isSlotLocallyDisabled(i, id)) {
              localStorage.setItem(`vtotal_conf${i}_${id}`, JSON.stringify(initData[prop]));
            }
          }
        } catch (e) { }
      }
      enterAppDirectly();
    }
    else { alert(res.msg); btn.innerText = "로그인"; btn.disabled = false; }
  } catch (e) { alert("서버 연결 실패. 네트워크를 확인하세요."); btn.innerText = "로그인"; btn.disabled = false; }
}

function enterAppDirectly() {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('topBar').classList.remove('hidden');
  document.getElementById('mainGrid').classList.remove('hidden');
  detectLayout();

  preloadCorePriceTickers()
    .catch(e => console.warn("주가 선로딩 실패:", e))
    .finally(() => updateCurrentFXRate(() => { if (isCurrencyKRW) refreshAllUI(); }));

  const userHeader = document.getElementById('userDisplayHeader');
  if (userHeader) userHeader.innerText = myUserId + ' (로딩중...)';
  if (document.getElementById('loginVersion')) document.getElementById('loginVersion').innerText = `v${APP_VERSION}`;
  if (document.getElementById('settingsVersion')) document.getElementById('settingsVersion').innerText = APP_VERSION;

  if (localStorage.getItem(`vtotal_pref_currency_${myUserId}`) === null) {
    localStorage.setItem(`vtotal_pref_currency_${myUserId}`, "USD");
  }
  if (localStorage.getItem(`vtotal_pref_theme_${myUserId}`) === null) {
    localStorage.setItem(`vtotal_pref_theme_${myUserId}`, "light");
  }
  if (localStorage.getItem(`vtotal_sort_order_${myUserId}`) === null) {
    localStorage.setItem(`vtotal_sort_order_${myUserId}`, "desc");
  }
  if (localStorage.getItem(`vtotal_combined_mode_${myUserId}`) === null) {
    localStorage.setItem(`vtotal_combined_mode_${myUserId}`, "combined");
  }

  const prefCurrency = localStorage.getItem(`vtotal_pref_currency_${myUserId}`) || "USD";
  isCurrencyKRW = (prefCurrency === "KRW");
  const defaultCurrSelect = document.getElementById('defaultCurrency');
  if (defaultCurrSelect) defaultCurrSelect.value = prefCurrency;
  syncCurrencyUI();

  const prefTheme = localStorage.getItem(`vtotal_pref_theme_${myUserId}`) || "light";
  const themeSelect = document.getElementById('themeSelect');
  if (themeSelect) themeSelect.value = prefTheme;
  if (prefTheme === 'light') document.body.classList.add('light-mode');
  else document.body.classList.remove('light-mode');

  const prefSort = localStorage.getItem(`vtotal_sort_order_${myUserId}`) || "desc";
  const sortSelect = document.getElementById('sortOrderSelect');
  if (sortSelect) sortSelect.value = prefSort;

  const prefCombinedMode = localStorage.getItem(`vtotal_combined_mode_${myUserId}`) || "combined";
  const combinedModeSelect = document.getElementById('combinedModeSelect');
  if (combinedModeSelect) combinedModeSelect.value = prefCombinedMode;

  if (localStorage.getItem(`vtotal_font_size_${myUserId}`) === null) {
    localStorage.setItem(`vtotal_font_size_${myUserId}`, "10.5px");
  }
  const prefFontSize = localStorage.getItem(`vtotal_font_size_${myUserId}`) || "10.5px";
  const fontSizeSelect = document.getElementById('fontSizeSelect');
  if (fontSizeSelect) fontSizeSelect.value = prefFontSize;
  document.documentElement.style.setProperty('--app-font-size', prefFontSize);

  // ⭐️ 성과 추이 그래프 마지막 선택 모드 복원
  if (localStorage.getItem(`vtotal_chart_view_mode_${myUserId}`) === null) {
    localStorage.setItem(`vtotal_chart_view_mode_${myUserId}`, "0");
  }
  chartViewMode = Number(localStorage.getItem(`vtotal_chart_view_mode_${myUserId}`) || "0");

  // ⭐️ 연도별/월별/일별 성과 추이 선택 모드 복원
  if (localStorage.getItem(`vtotal_period_view_state_${myUserId}`) === null) {
    localStorage.setItem(`vtotal_period_view_state_${myUserId}`, "0");
  }
  periodViewState = Number(localStorage.getItem(`vtotal_period_view_state_${myUserId}`) || "0");

  // ⭐️ 연도별/월별/일별 성과 추이 표시 모드 복원
  if (localStorage.getItem(`vtotal_period_display_mode_${myUserId}`) === null) {
    localStorage.setItem(`vtotal_period_display_mode_${myUserId}`, "chart");
  }
  periodDisplayMode = localStorage.getItem(`vtotal_period_display_mode_${myUserId}`) || "chart";

  // 슬롯 데이터 복원
  window.skipChartRendering = true;
  for (let i = 1; i <= MAX_SLOTS; i++) {
    const savedStr = localStorage.getItem(`vtotal_conf${i}_${myUserId}`);
    if (savedStr) {
      try {
        let parsed = JSON.parse(savedStr);
        if (parsed && parsed.basics && parsed.basics.strategy === 'RSI 3M') {
          parsed.basics.strategy = '3M3D1-R';
          localStorage.setItem(`vtotal_conf${i}_${myUserId}`, JSON.stringify(parsed));
        }
        slotConfigs[i] = parsed;
      } catch (e) { }
    }

    // 호환성: 1번 슬롯 예전 키 처리
    if (i === 1 && !savedStr) {
      const oldStr = localStorage.getItem(`vtotal_conf_${myUserId}`);
      if (oldStr) { try { slotConfigs[1] = JSON.parse(oldStr); } catch (e) { } }
    }

    const snapStr = localStorage.getItem(`vtotal_snap${i}_${myUserId}`);
    if (snapStr && isSlotActive(i)) {
      try {
        const snap = JSON.parse(snapStr);
        lastBTResults[i] = snap;
        globalMonthlyDataArr[i] = snap.monthlyData;
        globalYearlyDataArr[i] = snap.yearlyData;
        globalDailyDataArr[i] = snap.dailyData;
        if (i === 1) {
          initData(slotConfigs[1]);
          document.getElementById('mainGrid').classList.remove('hide-order-panel');
          const op = document.getElementById('panelOrder'); if (op) op.classList.remove('hidden');
        }
        renderOrderViewSlot(snap, i);
        renderPeriodTableSlot(i);
      } catch (e) { }
    }
  }
  window.skipChartRendering = false;
  renderChartAll();
  initPeriodDisplayModeUI();

  updateSlotsVisibility();
  updatePeriodTitle();
  refreshStatsTable();
  if (isStatsMode) renderDBTradeHistory();

  // 🟢 [버그 수정 2] 앱 초기 로딩 시 무조건 활성화된 탭의 데이터를 화면에 뿌려줌
  loadSlotToForm(activeSettingsTab);

  const cachedCombined = localStorage.getItem(`vtotal_snap_combined_${myUserId}`);
  if (cachedCombined) {
    try {
      const c = JSON.parse(cachedCombined);
      globalCombinedMonthlyData = c.m || [];
      globalCombinedYearlyData = c.y || [];
      if (c.stats) window.cachedCombinedStats = c.stats;
      renderPeriodTableText('Combined');
    } catch (e) { }
  }

  renderChartAll();
  initPeriodDisplayModeUI();
  checkAndSyncWithServer(!slotConfigs[1]);
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

function updateHeaderDisplay() {
  const header = document.getElementById('userDisplayHeader');
  if (!header) return;

  if (!isViewingHistory) {
    header.innerText = myUserId;
    return;
  }

  header.innerText = myUserId + " (백테스트)";
}

function selectQuickStrat(btn, stratName) {
  const btns = document.querySelectorAll('.q-strat-btn');
  btns.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('qStrategy').value = stratName;
}

function initStatsButtonEvents() {
  const btn = document.getElementById('btnStatsShow');
  if (!btn) return;
  let pressTimer, isLongPress = false;
  const start = (e) => {
    isLongPress = false;
    pressTimer = setTimeout(() => {
      isLongPress = true;
      if (navigator.vibrate) navigator.vibrate(40);
      restoreRealAccountMode();
    }, 800);
  };
  const cancel = () => clearTimeout(pressTimer);
  const click = (e) => { if (isLongPress) return; showStatsView(); };
  btn.addEventListener('mousedown', start);
  btn.addEventListener('touchstart', start, { passive: true });
  btn.addEventListener('mouseup', cancel);
  btn.addEventListener('touchend', cancel);
  btn.addEventListener('mouseleave', cancel);
  btn.onclick = click;
}

function initInstantButtonEvents() {
  const btn = document.getElementById('btnInstant');
  if (!btn) return;
  let pressTimer, isLongPress = false;
  const start = (e) => {
    isLongPress = false;
    pressTimer = setTimeout(() => {
      isLongPress = true;
      if (navigator.vibrate) navigator.vibrate(40);
      handleInstantOrder();
    }, 800);
  };
  const cancel = () => clearTimeout(pressTimer);
  const click = (e) => { if (isLongPress) return; showOrderView(); };
  btn.addEventListener('mousedown', start);
  btn.addEventListener('touchstart', start, { passive: true });
  btn.addEventListener('mouseup', cancel);
  btn.addEventListener('touchend', cancel);
  btn.addEventListener('click', click);
}

function initBacktestLongPress() {
  const btn = document.getElementById('runBtnSettings');
  if (!btn) return;
  btn.onclick = () => openQuickConfig();
}

function openQuickConfig() {
  const overlay = document.getElementById('quickConfigOverlay');
  if (!overlay) return;

  loadQuickConfigFromLocal();
  overlay.style.display = 'flex';
}

function saveQuickConfigToLocal() {
  if (!myUserId) return;
  const strats = [];
  for (let k = 1; k <= MAX_SLOTS; k++) {
    const el = document.getElementById('qStrat' + k);
    strats.push(el ? el.value : "");
  }

  const config = {
    strats: strats,
    ticker: document.getElementById('qTicker').value,
    startDate: document.getElementById('qStartDate').value,
    endDate: document.getElementById('qEndDate').value,
    initialCash: document.getElementById('qInitialCash').value,
    renewCash: document.getElementById('qRenewCash').value,
    fBase: document.getElementById('qFBase').value,
    fSec: document.getElementById('qFSec').value
  };

  localStorage.setItem(`vtotal_quick_config_${myUserId}`, JSON.stringify(config));
}

function loadQuickConfigFromLocal() {
  const saved = localStorage.getItem(`vtotal_quick_config_${myUserId}`);
  if (saved) {
    try {
      const config = JSON.parse(saved);
      if (config.strats) {
        config.strats.forEach((st, idx) => {
          const el = document.getElementById('qStrat' + (idx + 1));
          if (el) el.value = st;
        });
      }
      if (config.ticker !== undefined) document.getElementById('qTicker').value = config.ticker;
      if (config.startDate !== undefined) document.getElementById('qStartDate').value = config.startDate;
      if (config.endDate !== undefined) document.getElementById('qEndDate').value = config.endDate;
      if (config.initialCash !== undefined) document.getElementById('qInitialCash').value = config.initialCash;
      if (config.renewCash !== undefined) document.getElementById('qRenewCash').value = config.renewCash;
      if (config.fBase !== undefined) document.getElementById('qFBase').value = config.fBase;
      if (config.fSec !== undefined) document.getElementById('qFSec').value = config.fSec;
      return;
    } catch (e) { console.error("Failed to load quick config", e); }
  }

  // 기본값 (저장된 데이터가 없을 경우)
  if (document.getElementById('qStrat1')) document.getElementById('qStrat1').value = '1M';
  if (document.getElementById('qStrat2')) document.getElementById('qStrat2').value = '2M3D2(1.0)';
  if (document.getElementById('qStrat3')) document.getElementById('qStrat3').value = '2M3D2(1.2)';
  if (document.getElementById('qStrat4')) document.getElementById('qStrat4').value = '2M3D1-1P';
  if (document.getElementById('qStrat5')) document.getElementById('qStrat5').value = '2M3D2(2.0)';
  if (document.getElementById('qStrat6')) document.getElementById('qStrat6').value = '2M3D2(2.1)';

  document.getElementById('qTicker').value = 'SOXL';
  document.getElementById('qStartDate').value = '2026-01-01';
  document.getElementById('qEndDate').value = '';
  document.getElementById('qInitialCash').value = formatComma('40000');
  document.getElementById('qRenewCash').value = formatComma('40000');

  document.getElementById('qFBase').value = document.getElementById('fBase').value || '0.08';
  document.getElementById('qFSec').value = document.getElementById('fSec').value || '0.00278';
  if (document.getElementById('qBatchRaw')) document.getElementById('qBatchRaw').value = '';
}

function handleQuickBatchParse(val) {
  if (!val) return;
  const parts = val.trim().split(/[\s,\|]+/).filter(v => v !== "");
  if (parts.length >= 1 && parts[0].match(/^\d{4}-\d{2}-\d{2}$/)) document.getElementById('qStartDate').value = parts[0];
  if (parts.length >= 2 && parts[1].match(/^\d{4}-\d{2}-\d{2}$/)) document.getElementById('qEndDate').value = parts[1];
  if (parts.length >= 3) document.getElementById('qInitialCash').value = parts[2];
  if (parts.length >= 4) document.getElementById('qRenewCash').value = parts[3];
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
  isViewingHistory = true;
  lastBTResults = Array(MAX_SLOTS + 1).fill(null);
  globalMonthlyDataArr = Array(MAX_SLOTS + 1).fill(null);
  globalYearlyDataArr = Array(MAX_SLOTS + 1).fill(null);
  globalDailyDataArr = Array(MAX_SLOTS + 1).fill(null);
  globalCombinedMonthlyData = null;
  globalCombinedYearlyData = null;
  globalCombinedDailyData = null;
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

// 5. 서버 동기화 및 백테스트 실행
async function checkAndSyncWithServer(isInitial, forceSync = false) {
  if (forceSync) {
    try { localStorage.removeItem(`vtotal_sheet_perf_cache_${myUserId}`); } catch (e) {}
  }
  window.isServerSyncing = true;
  setLED('loading');
  const userHeader = document.getElementById('userDisplayHeader');
  if (userHeader) userHeader.innerText = myUserId + ' (로딩중...)';

  try {
    const parseDateStr = (ds) => {
      if (!ds) return formatDateNY(new Date());
      let str = String(ds).trim().replace(/\([가-힣a-zA-Z]\)/g, "").trim();
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

    const getSheetPerfCacheKey = () => `vtotal_sheet_perf_cache_${myUserId}`;

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

    const runFastEngine = async (cfg, isActive, slotNum) => {
      if (!isActive) return null;
      const res = await runBacktestMemory(cfg, false, slotNum);
      if (res && res.status !== "error") {
        updateUIWithResult(res, cfg, slotNum, true);
        return res;
      }
      return null;
    };

    const loadSheetData = async () => {
      try {
        const cachedPerf = getCachedSheetPerf();
        const sinceParams = [];
        if (cachedPerf) {
          for (let i = 1; i <= MAX_SLOTS; i++) {
            const latest = getLatestPerfDate(cachedPerf[`strat${i}`]);
            if (latest) sinceParams.push(`since${i}=${encodeURIComponent(latest)}`);
          }
        }
        const allUrl = `${GAS_URL}?action=GET_ALL_INIT&id=${myUserId}${sinceParams.length ? `&${sinceParams.join('&')}` : ''}`;
        const res = await fetch(allUrl);
        const data = await res.json();
        
        if (data && data.perf) {
          const dataInit = {
            config: data.config,
            config2: data.config2,
            config3: data.config3,
            config4: data.config4,
            config5: data.config5,
            config6: data.config6,
            hasSheet: data.hasSheet
          };
          const dataPerf = cachedPerf ? mergeSheetPerf(cachedPerf, data.perf) : data.perf;
          try { localStorage.setItem(getSheetPerfCacheKey(), JSON.stringify(dataPerf)); } catch (e) {}
          return { dataInit, dataPerf };
        }
      } catch (e) {
        console.warn("GET_ALL_INIT 실패, 기존 폴백 방식으로 데이터 로드 시도:", e);
      }

      // [폴백] 새 Code.gs 매크로가 반영되지 않았을 때를 위한 하위 호환용 병렬 처리
      const initUrl = `${GAS_URL}?action=GET_INIT&id=${myUserId}`;
      let perfUrl = `${GAS_URL}?action=GET_MY_PERF&id=${myUserId}`;
      for (let i = 1; i <= MAX_SLOTS; i++) {
        perfUrl += `&strat${i}=1`;
      }

      const [resInit, resPerf] = await Promise.all([
        fetch(initUrl),
        fetch(perfUrl)
      ]);

      const [dataInit, dataPerf] = await Promise.all([
        resInit.json(),
        resPerf.json()
      ]);

      dataInit.hasSheet = true;
      try { localStorage.setItem(getSheetPerfCacheKey(), JSON.stringify(dataPerf)); } catch (e) {}
      return { dataInit, dataPerf };
    };

    window.skipChartRendering = true;
    for (let i = 1; i <= MAX_SLOTS; i++) {
      await runFastEngine(slotConfigs[i], isSlotActive(i), i);
    }
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
    isOrderView = true;
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
    refreshOrderViewUI();

    // if (userHeader) userHeader.innerText = myUserId + ' (동기화 중...)';

    const serverResult = await track2Promise;
    if (!serverResult) throw new Error("Server Sync Failed");
    const { dataInit, dataPerf } = serverResult;

    lastMyPerfData = dataPerf;
    perfLastCheckTime = new Date().getTime();

    const syncSlotWithSheet = async (confData, perfSlotData, slotNum) => {
      if (isSlotLocallyDisabled(slotNum)) {
        const localStopped = localStorage.getItem(`vtotal_conf${slotNum}_${myUserId}`);
        if (localStopped) {
          try { slotConfigs[slotNum] = JSON.parse(localStopped); } catch (e) { }
        } else {
          slotConfigs[slotNum] = { basics: { strategy: "정지" } };
          localStorage.setItem(`vtotal_conf${slotNum}_${myUserId}`, JSON.stringify(slotConfigs[slotNum]));
        }
        localStorage.removeItem(`vtotal_snap${slotNum}_${myUserId}`);
        localStorage.removeItem(`vtotal_sheet_last_date_${slotNum}_${myUserId}`);
        localStorage.removeItem(`vtotal_sheet_existing_dates_${slotNum}_${myUserId}`);
        lastBTResults[slotNum] = null;
          globalMonthlyDataArr[slotNum] = null;
        globalYearlyDataArr[slotNum] = null;
        globalDailyDataArr[slotNum] = null;
        return;
      }

      if (!confData || !confData.basics || !confData.basics.strategy) {
        localStorage.removeItem(`vtotal_conf${slotNum}_${myUserId}`);
        localStorage.removeItem(`vtotal_snap${slotNum}_${myUserId}`);
        localStorage.removeItem(`vtotal_sheet_last_date_${slotNum}_${myUserId}`);
        localStorage.removeItem(`vtotal_sheet_existing_dates_${slotNum}_${myUserId}`);
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
        localStorage.setItem(`vtotal_sheet_last_date_${slotNum}_${myUserId}`, sheetLastDate);
        localStorage.setItem(`vtotal_sheet_existing_dates_${slotNum}_${myUserId}`, existingDates.join(","));

        // ⭐️ [버그 수정] 설정창의 '진짜 초기자산(C9)'을 엔진으로 넘겨줌
        const realData = processRealLogData(perfSlotData, confData.basics.strategy, confData.basics.initialCash);

        if (realData) {
          // 163주 튕김 방지 및 최신 증액/출금 내역을 엔진에 반영하기 위해 realData 기반으로 이어서 계산
          const pureEngineRes = await runBacktestMemory(confData, true, slotNum, realData);
          const isEngOk = (pureEngineRes && pureEngineRes.summary);

          // ⭐️ 엔진의 가상 계산값을 버리고, 시트 꾸러미(JSON)의 진짜 갱신금을 추출
          const realJsonBase = realData.summary.base;

          // ⭐️ [원금 원천 방지] 시트의 실전 원금 데이터(입출금 포함) 추출
          const trueRealPrincipal = realData.summary.realPrincipal;

          // 1. 설정 꾸러미(conf) 업데이트 및 저장
          localStorage.setItem(`vtotal_conf${slotNum}_${myUserId}`, JSON.stringify({ basics: confData.basics }));
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

          const sheetTrades = reconstructRealTrades(perfSlotData.logs, slotNum);

          let mergedSnap = {
            ...realData,
            summary: isEngineNewer ? { ...pureEngineRes.summary, realPrincipal: realData.summary.realPrincipal } : realData.summary,
            inv: isEngineNewer ? pureEngineRes.inv : realData.inv,
            trades: sheetTrades,
            orders: isEngineNewer ? pureEngineRes.orders : finalSyncedOrders,
            rawOrders: isEngineNewer ? pureEngineRes.rawOrders : combinedForTung,
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
                  const sheetLastDate = normalizeSheetStateDate(localStorage.getItem(`vtotal_sheet_last_date_${slotNum}_${myUserId}`));
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
            const stateTrades = reconstructRealTrades(buildTradeLogsFromDailyStates(mergedSnap.dailyStates), slotNum);
            if (stateTrades.length >= (mergedSnap.trades || []).length) {
              mergedSnap.trades = stateTrades;
            }
          }

          localStorage.setItem(`vtotal_snap${slotNum}_${myUserId}`, JSON.stringify(mergedSnap));
          lastBTResults[slotNum] = mergedSnap;
          updateUIWithResult(mergedSnap, confData, slotNum, false);
        }
      } else {
        // ⭐️ [신규 슬롯 자동저장 지원] 시트에 기록이 없는 슬롯도 엔진을 돌려서 dailyStates를 생성
        // 이렇게 해야 checkAndRunAutoSave에서 해당 슬롯 데이터가 자동으로 시트에 저장됨
        if (confData.basics.ticker && confData.basics.startDate) {
          const newSlotRes = await runBacktestMemory(confData, true, slotNum);
          if (newSlotRes && newSlotRes.status !== "error") {
            // ⭐️ [첫 기록 보장] 스냅샷을 localStorage에 저장하여 checkAndRunAutoSave가 찾을 수 있게 함
            localStorage.setItem(`vtotal_snap${slotNum}_${myUserId}`, JSON.stringify(newSlotRes));
            lastBTResults[slotNum] = newSlotRes;
            updateUIWithResult(newSlotRes, confData, slotNum, false);
          }
        }
      }
    };

    for (let i = 1; i <= MAX_SLOTS; i++) {
      let pName = i === 1 ? 'config' : `config${i}`;
      let sName = `strat${i}`;
      await syncSlotWithSheet(dataInit[pName], dataPerf[sName], i);
    }

    renderChartAll();
    calculateCombinedPeriodData();
    renderDBTradeHistory();

    // 🟢 [버그 수정 1] 서버 동기화 완료 후 현재 탭의 설정값을 화면 입력창에 강제로 채워넣음
    loadSlotToForm(activeSettingsTab);
    updateSettingsTabButtons();

    if (dataInit.hasSheet) checkAndRunAutoSave();

    // 서버 동기화 완료 후 비동기 충돌 없이 안전하게 자동 갱신 체크 및 실행
    if (typeof shouldAutoRefresh === 'function' && shouldAutoRefresh()) {
      handleInstantOrder();
    }

  } catch (e) {
    console.error("초기 통신 에러 (엔진 결과로 폴백):", e);
    for (let i = 1; i <= MAX_SLOTS; i++) {
      if (lastBTResults[i]) updateUIWithResult(lastBTResults[i], slotConfigs[i], i, false);
    }
    setLED('error');
  } finally {
    updateHeaderDisplay();
    setLED('on');
    window.isServerSyncing = false;
  }
}

function normalizeSheetStateDate(value) {
  if (!value) return "";
  let text = String(value).trim();
  text = text.replace(/\s*\(.*?\)\s*/g, "");
  text = text.replace(/[년월일.\/,_]/g, "-");
  text = text.replace(/\s+/g, "");
  if (text.endsWith("-")) text = text.slice(0, -1);

  const parts = text.split("-");
  if (parts.length >= 3) {
    let year = parts[0];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
  }

  return text.split("T")[0];
}

function sortSheetStates(states) {
  return (states || [])
    .filter(state => state && normalizeSheetStateDate(state.date))
    .slice()
    .sort((a, b) => normalizeSheetStateDate(a.date).localeCompare(normalizeSheetStateDate(b.date)));
}

function buildSheetSavePayload(slot, config, states) {
  const payload = {
    action: "AUTO_DAILY_SAVE",
    id: myUserId
  };

  if (config) {
    payload[slot === 1 ? "params" : `params${slot}`] = config;
  }

  const sortedStates = sortSheetStates(states);
  let previousCumulativeInout = sortedStates.length > 0 ? (Number(sortedStates[0].inout) || 0) : 0;

  payload.logs = sortedStates.map((state, index) => {
    const currentCumulativeInout = Number(state.inout) || 0;
    const dailyInout = index === 0 ? 0 : currentCumulativeInout - previousCumulativeInout;
    previousCumulativeInout = currentCumulativeInout;

    const row = { date: normalizeSheetStateDate(state.date) };
    row[`s${slot}`] = {
      asset: state.asset,
      inout: dailyInout,
      json: state.json
    };
    return row;
  });

  return payload;
}

function getSheetConfigSnapshotKey(slot) {
  return `vtotal_sheet_conf_snapshot_${slot}_${myUserId}`;
}

function normalizeConfigForCompare(config) {
  return JSON.stringify(config?.basics || {});
}

function hasSheetConfigChanged(slot, config) {
  const saved = localStorage.getItem(getSheetConfigSnapshotKey(slot));
  if (!saved) return false;
  return saved !== normalizeConfigForCompare(config);
}

function rememberSheetConfigSnapshot(slot, config) {
  if (config) localStorage.setItem(getSheetConfigSnapshotKey(slot), normalizeConfigForCompare(config));
}

function buildInitialSheetState(config) {
  const basics = config && config.basics ? config.basics : {};
  const startDate = basics.startDate || formatDateNY(new Date());
  const initialCash = Number(unformatComma(basics.initialCash || basics.renewCash || 0)) || 0;
  if (!startDate || initialCash <= 0) return null;

  return {
    date: startDate,
    asset: initialCash,
    inout: 0,
    json: JSON.stringify({
      cash: initialCash,
      base_principal: initialCash,
      base: initialCash,
      realPrincipal: initialCash,
      realizedProfit: 0,
      holdings: []
    })
  };
}

function getDisplaySheetDate(slotNum, res = null, config = null) {
  const rawDate = localStorage.getItem(`vtotal_sheet_last_date_${slotNum}_${myUserId}`) || "";
  if (rawDate && rawDate !== "-" && rawDate !== "1900-01-01") return rawDate;
  return config?.basics?.startDate || res?.chartDates?.[0] || res?.dailyStates?.[0]?.date || "-";
}

async function saveSlotToSheet(slot, config, states) {
  const payload = buildSheetSavePayload(slot, config, states);
  await fetch(GAS_URL, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  return { status: "success" };
}

function validateSheetAppendWindow(slot, config, sheetLastDate, options = {}) {
  if (!sheetLastDate || sheetLastDate === "1900-01-01") return true;
  const startDate = config?.basics?.startDate || "";
  if (!startDate || startDate >= sheetLastDate) return true;
  if (!options.enforceStartDate) return true;

  const msg = `저장 차단: 투자법 ${slot}의 시작일(${startDate})이 시트 마지막 날짜(${sheetLastDate})보다 과거입니다.\n\n기존 시트 기록 보호를 위해 시트에 반영하지 않았습니다.`;
  if (options.alert) alert(msg);
  else if (!options.silent) showToast(msg, "⚠️");
  console.warn(msg);
  return false;
}

function checkAndRunAutoSave() {
  for (let i = 1; i <= MAX_SLOTS; i++) {
    const res = lastBTResults[i];
    if (!res || !res.dailyStates) continue;
    
    const sheetLastDate = normalizeSheetStateDate(localStorage.getItem(`vtotal_sheet_last_date_${i}_${myUserId}`)) || "1900-01-01";
    if (!validateSheetAppendWindow(i, slotConfigs[i], sheetLastDate, { silent: true })) continue;

    const existingDatesStr = localStorage.getItem(`vtotal_sheet_existing_dates_${i}_${myUserId}`) || "";
    const existingDatesSet = new Set(existingDatesStr ? existingDatesStr.split(",") : []);
    let newLogs = res.dailyStates.filter(s => !existingDatesSet.has(normalizeSheetStateDate(s.date)));
    if (sheetLastDate !== "1900-01-01") {
      newLogs = newLogs.filter(s => normalizeSheetStateDate(s.date) > sheetLastDate);
    }
    newLogs = sortSheetStates(newLogs);
    if (newLogs.length === 0) continue;
    
    setLED('loading');
    
    saveSlotToSheet(i, slotConfigs[i], newLogs)
    .then(data => {
      if (data.status === "success") {
        const maxDate = newLogs.reduce((max, s) => {
          const date = normalizeSheetStateDate(s.date);
          return date > max ? date : max;
        }, "1900-01-01");
        localStorage.setItem(`vtotal_sheet_last_date_${i}_${myUserId}`, maxDate);
        
        newLogs.forEach(s => existingDatesSet.add(normalizeSheetStateDate(s.date)));
        localStorage.setItem(`vtotal_sheet_existing_dates_${i}_${myUserId}`, Array.from(existingDatesSet).join(","));
        
        setLED('on');
        const header = document.getElementById('userDisplayHeader');
        if (header) {
          header.innerText = myUserId + " (시트 자동 누계 완료!)";
          setTimeout(() => { if (header.innerText.includes("자동 누계")) header.innerText = myUserId; }, 3000);
        }
      }
    })
    .catch(() => { setLED('off'); });
  }
}

function triggerOptimisticSave() {
  const currentParams = gatherParams();
  saveCurrentFormToSlot(activeSettingsTab);
  const targetSlot = activeSettingsTab;

  slotConfigs[targetSlot] = currentParams;

  if (isSlotActive(targetSlot)) {
    runBacktestMemory(currentParams, false, targetSlot).then(res => {
      if (res.status !== "error") updateUIWithResult(res, currentParams, targetSlot);
    });
  } else {
    // ⭐️ 설정 드롭다운을 비활성화하는 즉시 로컬 캐시와 이전 성과 메모리를 완벽히 청소
    localStorage.removeItem(`vtotal_snap${targetSlot}_${myUserId}`);
    localStorage.removeItem(`vtotal_sheet_last_date_${targetSlot}_${myUserId}`);
    localStorage.removeItem(`vtotal_sheet_existing_dates_${targetSlot}_${myUserId}`);
    lastBTResults[targetSlot] = null;
    globalMonthlyDataArr[targetSlot] = null;
    globalYearlyDataArr[targetSlot] = null;
    globalDailyDataArr[targetSlot] = null;
    updateSlotsVisibility();
    calculateCombinedPeriodData();
    renderChartAll();
    refreshStatsTable();
  }
  updateSlotsVisibility();
}

async function handleSave() {
  const targetSlot = activeSettingsTab;
  const btn = document.getElementById('btnSaveTop');
  const orgText = btn ? btn.innerHTML : "";
  if (btn) btn.innerText = '준비 중...';

  try {
    saveCurrentFormToSlot(targetSlot);

    if (!isSlotActive(targetSlot)) {
      localStorage.removeItem(`vtotal_snap${targetSlot}_${myUserId}`);
      localStorage.removeItem(`vtotal_sheet_last_date_${targetSlot}_${myUserId}`);
      localStorage.removeItem(`vtotal_sheet_existing_dates_${targetSlot}_${myUserId}`);
      const stoppedConfig = slotConfigs[targetSlot] || { basics: { strategy: "정지" } };
      stoppedConfig.basics.strategy = "정지";
      slotConfigs[targetSlot] = stoppedConfig;
      localStorage.setItem(`vtotal_conf${targetSlot}_${myUserId}`, JSON.stringify(stoppedConfig));
      setSlotLocallyDisabled(targetSlot, true);
      lastBTResults[targetSlot] = null;
      globalMonthlyDataArr[targetSlot] = null;
      globalYearlyDataArr[targetSlot] = null;
      globalDailyDataArr[targetSlot] = null;

      if (navigator.onLine) {
        await saveSlotToSheet(targetSlot, null, []);
        showToast(`[V-QUANT 2-${targetSlot}] 비활성화 설정이 시트에 반영되었습니다.`, "✅");
      } else {
        handleOfflineSave(buildSheetSavePayload(targetSlot, null, []));
      }

      updateSlotsVisibility();
      calculateCombinedPeriodData();
      renderChartAll();
      refreshStatsTable();
      updateCurrentStatusUI(targetSlot);

      if (btn) btn.innerHTML = orgText;
      return;
    }

    const sheetLastDate = normalizeSheetStateDate(localStorage.getItem(`vtotal_sheet_last_date_${targetSlot}_${myUserId}`)) || "1900-01-01";
    const existingDatesStr = localStorage.getItem(`vtotal_sheet_existing_dates_${targetSlot}_${myUserId}`) || "";
    const existingDatesSet = new Set(existingDatesStr ? existingDatesStr.split(",") : []);
    const isFirstSheetSetup = sheetLastDate === "1900-01-01" && existingDatesSet.size === 0;

    const configChangedFromSheet = !isFirstSheetSetup && hasSheetConfigChanged(targetSlot, slotConfigs[targetSlot]);

    if (!validateSheetAppendWindow(targetSlot, slotConfigs[targetSlot], sheetLastDate, { alert: true, enforceStartDate: configChangedFromSheet })) {
      if (btn) btn.innerHTML = orgText;
      return;
    }

    if (configChangedFromSheet) {
      const ok = confirm("시트에 기록이 있는 상태에서 설정값이 변경되었습니다.\n\n다시 한번 확인해주세요.\n\n확인을 누르면 변경된 설정값을 시트에 반영합니다.");
      if (!ok) {
        if (btn) btn.innerHTML = orgText;
        return;
      }
    }

    let targetRes = await runBacktestMemory(slotConfigs[targetSlot], false, targetSlot);
    if (!targetRes || targetRes.status === "error") {
      console.warn("시트 반영 전 계산 실패:", targetRes?.message || targetRes);
      if (sheetLastDate === "1900-01-01") {
        const initialState = buildInitialSheetState(slotConfigs[targetSlot]);
        const parsed = initialState ? JSON.parse(initialState.json) : { cash: 0, base_principal: 0, realPrincipal: 0 };
        targetRes = {
          status: "success",
          inv: [],
          trades: [],
          dailyStates: [],
          chartDates: [],
          chartBalances: [],
          chartMdd: [],
          chartInout: [],
          summary: {
            totalAssets: parsed.cash,
            cash: parsed.cash,
            base: parsed.base_principal,
            realPrincipal: parsed.realPrincipal,
            totalProfit: 0,
            realizedProfit: 0,
            qty: 0,
            evalVal: 0,
            currPrice: 0,
            currentMdd: 0,
            inout: 0
          }
        };
      } else {
        showToast("❌ 계산 중 오류가 발생했습니다.");
        if (btn) btn.innerHTML = orgText;
        return;
      }
    }

    let newLogs;
    if (sheetLastDate === "1900-01-01") {
      newLogs = targetRes.dailyStates || [];
    } else {
      newLogs = targetRes.dailyStates.filter(s => !existingDatesSet.has(normalizeSheetStateDate(s.date)));
      newLogs = newLogs.filter(s => normalizeSheetStateDate(s.date) > sheetLastDate);
    }
    newLogs = sortSheetStates(newLogs);

    if (newLogs.length === 0) {
      if (isFirstSheetSetup) {
        if (!confirm("시트에 데이터가 없습니다.\n\n확인을 누르시면 설정값만 시트에 전송하여 첫 설정을 마치겠습니다.\n\n매매기록은 종가 데이터가 있는 날짜부터 저장됩니다.")) {
          if (btn) btn.innerHTML = orgText;
          return;
        }
        newLogs = [];
      } else if (confirm("시트에 새로 반영할 기록이 없습니다.\n\n시트의 설정값은 그대로 두고, 앱의 동기화 날짜 정보만 초기화하여 계산된 기록을 다시 전송하시겠습니까?")) {
        newLogs = sortSheetStates(targetRes.dailyStates || []);
        localStorage.setItem(`vtotal_sheet_last_date_${targetSlot}_${myUserId}`, "1900-01-01");
        localStorage.removeItem(`vtotal_sheet_existing_dates_${targetSlot}_${myUserId}`);
      } else {
        if (btn) btn.innerHTML = orgText;
        return;
      }
    } else if (isFirstSheetSetup && !confirm("시트에 데이터가 없습니다.\n\n확인을 누르시면 설정값만 시트에 전송하여 첫 설정을 마치겠습니다.\n\n매매기록은 종가 데이터가 있는 날짜부터 저장됩니다.")) {
      if (btn) btn.innerHTML = orgText;
      return;
    }

    if (btn) btn.innerText = '저장 중...';

    if (navigator.onLine) {
      await saveSlotToSheet(targetSlot, slotConfigs[targetSlot], newLogs);
      rememberSheetConfigSnapshot(targetSlot, slotConfigs[targetSlot]);

      if (newLogs.length > 0) {
        let maxDate = sheetLastDate;
        const existingDatesStr = localStorage.getItem(`vtotal_sheet_existing_dates_${targetSlot}_${myUserId}`) || "";
        const existingDatesSet = new Set(existingDatesStr ? existingDatesStr.split(",") : []);

        newLogs.forEach(s => {
          const date = normalizeSheetStateDate(s.date);
          if (date > maxDate) maxDate = date;
          existingDatesSet.add(date);
        });

        localStorage.setItem(`vtotal_sheet_last_date_${targetSlot}_${myUserId}`, maxDate);
        localStorage.setItem(`vtotal_sheet_existing_dates_${targetSlot}_${myUserId}`, Array.from(existingDatesSet).join(","));
      }

      showToast(newLogs.length > 0 ? `${newLogs.length}일치의 기록이 시트에 반영되었습니다.` : "설정값이 시트에 반영되었습니다. 매매기록은 종가 데이터가 있는 날짜부터 저장됩니다.", "✅");
    } else {
      handleOfflineSave(buildSheetSavePayload(targetSlot, slotConfigs[targetSlot], newLogs));
    }
  } catch (err) {
    console.error("Save Error:", err);
    alert("저장 중 오류 발생: " + err.message);
  } finally {
    if (btn) btn.innerHTML = orgText;
  }
}

function resetSyncDates() {
  if (!confirm("🔄 모든 투자법의 시트 동기화 날짜 정보를 초기화하시겠습니까?\n\n(설정값은 지워지지 않으며, 다음 번 '시트에 반영' 클릭 시 누락된 모든 날짜가 시트로 다시 전송됩니다.)")) return;
  for (let i = 1; i <= MAX_SLOTS; i++) {
    localStorage.setItem(`vtotal_sheet_last_date_${i}_${myUserId}`, "1900-01-01");
    localStorage.removeItem(`vtotal_sheet_existing_dates_${i}_${myUserId}`);
  }
  showToast("동기화 정보가 초기화되었습니다. 시트 반영을 시도하세요.", "✅");
}

function handleOfflineSave(payload) {
  localStorage.setItem('vtotal_pending_sync', JSON.stringify(payload));
  alert("현재 오프라인입니다.\n데이터는 앱에 우선 저장되며 인터넷이 연결되면 다시 반영할수 있도록 안내해 드립니다.");
  showToast("오프라인: 앱에 우선 저장됨", "📴");
}

function checkPendingSync() {
  const pendingData = localStorage.getItem('vtotal_pending_sync');
  if (pendingData && navigator.onLine) {
    if (confirm("오프라인 상태에서 저장된 최신 데이터가 있습니다. 지금 시트에 반영하시겠습니까?")) {
      const payload = JSON.parse(pendingData);
      fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      .then(r => r.json())
      .then(data => {
        if (data.status === "success" || data.status === "ok") {
          localStorage.removeItem('vtotal_pending_sync');
          showToast("보류중인 데이터가 시트에 성공적으로 반영되었습니다.");
        }
      }).catch(e => {
        showToast("서버 오류로 반영이 지연되었습니다.", "❌");
      });
    }
  }
}
window.addEventListener('online', checkPendingSync);

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
  updateCurrentStatusUI(activeSettingsTab);
}

function getNextDateStr(dateStr) {
  if (!dateStr || dateStr === '-') {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }
  const clean = dateStr.replace(/[^0-9-]/g, '-').replace(/\./g, '-');
  const parts = clean.split('-');
  if (parts.length >= 3) {
    let year = parseInt(parts[0], 10);
    if (year < 100) year += 2000;
    const d = new Date(year, parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    d.setDate(d.getDate() + 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function handleStrategyChange(strategyName) {
  const strategySelect = document.getElementById('strategySelect');
  const prevStrategy = strategySelect.dataset.prev || '';
  
  if (!strategyName || strategyName === '정지' || strategyName === prevStrategy || !prevStrategy) {
    strategySelect.value = strategyName;
    strategySelect.dataset.prev = strategyName;
    if (strategyName) {
      document.getElementById('fBase').value = 0;
      document.getElementById('fSec').value = 0;
    }
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

  const statDate = document.getElementById('statDate')?.innerText || '-';
  const statTotal = document.getElementById('statTotal')?.innerText || '$0.00';
  const statRenew = document.getElementById('statRenew')?.innerText || '$0.00';

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
      
      document.getElementById('startDate').value = nextDateStr;
      
      const cleanTotal = parseFloat(statTotal.replace(/[^0-9.-]/g, '')) || 0;
      document.getElementById('initialCash').value = formatComma(cleanTotal);
      
      const cleanRenew = parseFloat(statRenew.replace(/[^0-9.-]/g, '')) || 0;
      document.getElementById('renewCash').value = formatComma(cleanRenew);
      
      document.getElementById('fBase').value = 0;
      document.getElementById('fSec').value = 0;

      setupCashAutoFill(cleanTotal, cleanRenew);
      
      triggerOptimisticSave();
      if (overlay) overlay.style.display = 'none';

      // ⭐️ 시트에 반영까지 같이 진행
      try {
        await handleSave();
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

function gatherParams() {
  return {
    basics: {
      ticker: document.getElementById('ticker').value,
      startDate: document.getElementById('startDate').value,
      endDate: document.getElementById('endDate').value,
      initialCash: unformatComma(document.getElementById('initialCash').value),
      strategy: document.getElementById('strategySelect').value,
      renewCash: unformatComma(document.getElementById('renewCash').value),
      fBase: document.getElementById('fBase').value,
      fSec: document.getElementById('fSec').value
    }
  };
}

function updateCurrentStatusUI(slotNum) {
  const panel = document.getElementById('settingsStatusPanel');
  if (!panel) return;

  let res = lastBTResults[slotNum];

  if (isManualBacktestMode) {
    const snapStr = localStorage.getItem(`vtotal_snap${slotNum}_${myUserId}`);
    if (snapStr) {
      try {
        res = JSON.parse(snapStr);
      } catch (e) {
        res = null;
      }
    } else {
      res = null;
    }
  }

  const elDate = document.getElementById('statDate');
  const elTotal = document.getElementById('statTotal');
  const elRenew = document.getElementById('statRenew');
  const elPrincipal = document.getElementById('statPrincipal');
  const elCash = document.getElementById('statCash');

  if (!res || !res.summary) {
    if (elDate) elDate.innerText = "-";
    if (elTotal) elTotal.innerText = "-";
    if (elRenew) elRenew.innerText = "-";
    if (elPrincipal) elPrincipal.innerText = "-";
    if (elCash) elCash.innerText = "-";
    const elHoldings = document.getElementById('statHoldings');
    if (elHoldings) elHoldings.innerHTML = '<span class="holdings-empty">보유 주식 없음</span>';
    return;
  }

  const s = res.summary;
  const sheetDate = getDisplaySheetDate(slotNum, res, slotConfigs[slotNum]);
  const fmt = (val) => "$" + Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });

  // ⭐️ [시트 값 통일] 현황판 출력 기준
  let displayTotal = s.totalAssets;
  let displayBase = s.base;
  let displayPrincipal = s.realPrincipal || s.base;
  let displayCash = s.cash;
  let displayHoldings = [];

  // ⭐️ [운영현황 증액 보장] 동기화된 데이터(isSynced)는 무조건 summary(시트 최신값)를 사용!
  if (res.isSynced) {
    displayHoldings = res.inv || [];
  } else if (res.dailyStates && res.dailyStates.length > 0) {
    const lastState = res.dailyStates[res.dailyStates.length - 1];
    displayTotal = lastState.asset;
    try {
      const lastJson = JSON.parse(lastState.json);
      displayCash = lastJson.cash;
      displayBase = lastJson.base_principal;
      displayPrincipal = lastJson.realPrincipal || displayPrincipal;
      displayHoldings = lastJson.holdings || [];
    } catch (e) { /* JSON 파싱 실패 시 summary 값 사용 */ }
  } else if (res.inv) {
    displayHoldings = res.inv;
  }

  if (elDate) elDate.innerText = sheetDate;
  if (elTotal) elTotal.innerText = fmt(displayTotal);
  if (elRenew) elRenew.innerText = fmt(displayBase);
  if (elPrincipal) elPrincipal.innerText = fmt(displayPrincipal);
  if (elCash) elCash.innerText = fmt(displayCash);

  // 📦 보유 주식 (시트 꾸러미 데이터 - 꾸러미에 실제 저장되는 필드만 표시)
  const elHoldings = document.getElementById('statHoldings');
  if (elHoldings) {
    if (displayHoldings.length === 0) {
      elHoldings.innerHTML = '<span class="holdings-empty">보유 주식 없음</span>';
    } else {
      let html = displayHoldings.map((h) => {
        const m = h.mode || '-';
        const t = h.tier || '-';
        const bp = Number(h.buy_price || 0).toFixed(2);
        const q = h.qty || 0;
        const cost = Number(h.cost || 0).toFixed(2);
        const d = h.days || 0;
        const bd = h.buyDate || '-';
        return `<div class="holdings-grid-row">` +
          `<span style="color:#6366f1;">T${t}</span>` +
          `<span style="color:#fbbf24;">${m}</span>` +
          `<span style="color:#64748b;">$${Number(bp).toFixed(2)}</span>` +
          `<span style="color:#10b981;">${q}주</span>` +
          `<span style="color:#f97316;">$${Number(cost).toFixed(2)}</span>` +
          `<span style="color:#94a3b8;">${d}일</span>` +
          `<span style="color:#64748b;">${bd.split('-').slice(1).join('-')}</span>` +
          `</div>`;
      }).join('');
      elHoldings.innerHTML = html;
    }
  }
}

function updateUIWithResult(resBT, config, slotNum, skipSave = false) {
  const existing = lastBTResults[slotNum];
  let finalRes = resBT;

  // ⭐️ [거울 로직] 시트와 동기화된 데이터(existing)가 있더라도,
  // 엔진이 계산한 '오늘'의 새로운 매매나 상태가 있다면 이를 우선 반영하도록 개선
  if (existing && existing.isSynced && !resBT.isSynced) {
    // 엔진 결과(resBT)의 마지막 날짜가 시트 데이터(existing)의 마지막 날짜보다 크다면 엔진 데이터 사용
    const lastExistingDate = existing.chartDates && existing.chartDates.length > 0 ? existing.chartDates[existing.chartDates.length - 1] : "";
    const lastBTDate = resBT.chartDates && resBT.chartDates.length > 0 ? resBT.chartDates[resBT.chartDates.length - 1] : "";

    if (lastBTDate > lastExistingDate) {
      // ⭐️ [Smart Merge] 엔진이 더 최신이면 기존 시트 데이터 뒤에 엔진의 새로운 날짜들만 붙임
      const newIndices = [];
      for (let i = 0; i < resBT.chartDates.length; i++) {
        if (resBT.chartDates[i] > lastExistingDate) newIndices.push(i);
      }

      if (newIndices.length > 0) {
        const mergedDates = existing.chartDates.concat(newIndices.map(i => resBT.chartDates[i]));
        const mergedBalances = existing.chartBalances.concat(newIndices.map(i => resBT.chartBalances[i]));
        const mergedInout = (existing.chartInout || []).concat(newIndices.map(i => (resBT.chartInout ? resBT.chartInout[i] : 0)));
        
        let peak = -Infinity;
        const mergedMdd = mergedBalances.map(b => {
          if (b > peak) peak = b;
          return peak > 0 ? (b - peak) / peak : 0;
        });

        finalRes = {
          ...existing,
          orders: resBT.orders,
          nextOrderInfo: resBT.nextOrderInfo,
          orderDateStr: resBT.orderDateStr,
          currentStrat: resBT.currentStrat,
          chartDates: mergedDates,
          chartBalances: mergedBalances,
          chartInout: mergedInout,
          chartMdd: mergedMdd,
          monthlyData: calculateMonthlyData(mergedDates, mergedBalances, mergedMdd, mergedInout),
          yearlyData: calculateYearlyData(mergedDates, mergedBalances, mergedMdd, mergedInout),
          dailyData: calculateDailyData(mergedDates, mergedBalances, mergedMdd, mergedInout),
          dailyStates: (existing.dailyStates || []).concat(resBT.dailyStates || [])
        };
      } else {
        // 날짜가 같거나 뒤처지면 기존 데이터 구조 유지
        finalRes = {
          ...existing,
          orders: resBT.orders,
          nextOrderInfo: resBT.nextOrderInfo,
          orderDateStr: resBT.orderDateStr,
          currentStrat: resBT.currentStrat
        };
      }
    } else {
      // 날짜가 같거나 시트가 더 최신이면 기존처럼 시트 데이터 구조 유지
      finalRes = {
        ...existing,
        orders: resBT.orders,
        nextOrderInfo: resBT.nextOrderInfo,
        orderDateStr: resBT.orderDateStr,
        currentStrat: resBT.currentStrat
      };
    }
  }

  // ⭐️ [매매 내역 복원 오염 차단] 
  // 실제 서버와 동기화된 실전 슬롯인 경우에 한하여, 엔진 구동 후 생성된 가상 trades 데이터를 
  // 실제 자산 holdings 로그(dailyStates)의 변동 기록을 역추적한 정확한 실전 매매 내역으로 덮어씁니다.
  if (finalRes.isSynced && finalRes.dailyStates && finalRes.dailyStates.length > 0) {
    const logsFormat = finalRes.dailyStates.map(state => [
      state.date,
      state.asset,
      state.inout || 0,
      state.json
    ]);
    finalRes.trades = reconstructRealTrades(logsFormat, slotNum);
  }

  lastBTResults[slotNum] = finalRes;
  globalMonthlyDataArr[slotNum] = finalRes.monthlyData;
  globalYearlyDataArr[slotNum] = finalRes.yearlyData;
  globalDailyDataArr[slotNum] = finalRes.dailyData;

  if (slotNum === 1) {
    currentActiveConfigStr = JSON.stringify(config);
    const op = document.getElementById('panelOrder'); if (op) op.classList.remove('hidden');
  }

  renderOrderViewSlot(finalRes, slotNum);
  renderPeriodTableSlot(slotNum);
  renderMetrics(finalRes.summary, finalRes.chartDates ? finalRes.chartDates.length : 0, slotNum);
  if (slotNum === activeSettingsTab) updateCurrentStatusUI(slotNum);
  calculateCombinedPeriodData();
  if (isStatsMode) renderDBTradeHistory();
}

function confirmLogout() {
  if (confirm("로그아웃 하시겠습니까?")) {
    localStorage.removeItem('vtotal_auth');
    localStorage.removeItem('vtotal_id');
    location.reload();
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

  const executeSlot = async (cfg, isActive, slotNum) => {
    if (isManualBacktestMode) {
      cfg = simulationConfigs[slotNum];
      isActive = (cfg && cfg.basics && cfg.basics.strategy !== "");
    }
    if (isActive) {
      const res = await runBacktestMemory(cfg, true, slotNum);
      if (res.status !== "error") {
        lastBTResults[slotNum] = res;
        updateUIWithResult(res, cfg, slotNum, true);
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

  restoreFromPerfLayout();
  updateSlotsVisibility();
  renderChartAll();

  const grid = document.getElementById('mainGrid');
  if (grid) {
    grid.classList.add('backtest-view-layout');
    grid.classList.remove('perf-metrics-layout', 'perf-tab-layout', 'order-expanded');
  }
  const statsTitle = document.getElementById('statsTitle');
  if (statsTitle) statsTitle.innerHTML = '📄 성과 지표';
  backtestStatsMode = "performance";

  isStatsMode = false;
  isOrderView = true;

  const btnInstant = document.getElementById('btnInstant');
  if (btnInstant) btnInstant.classList.add('active');
  const btnPerf = document.getElementById('btnPerfShow');
  if (btnPerf) btnPerf.classList.remove('active');
  const btnStats = document.getElementById('btnStatsShow');
  if (btnStats) btnStats.classList.remove('active');

  calculateCombinedPeriodData();
  renderChartAll();
  refreshStatsTable();
  
  for (let i = 1; i <= MAX_SLOTS; i++) {
    if (isSlotActive(i)) renderPeriodTableText(i);
  }
  renderPeriodTableText('Combined');

  toggleSettings();
  restoreBtn();
  triggerIconAnim('icoRun');
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

  const executeSlot = async (cfg, isActive, slotNum) => {
    if (isActive) {
      const res = await runBacktestMemory(cfg, false, slotNum);
      if (res && res.status !== "error") {
        updateUIWithResult(res, cfg, slotNum);
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
  restoreBtn();
  triggerIconAnim('icoInstant');
  showToast("실전 주문표 최신화 완료");
  refreshOrderViewUI();
  renderDBTradeHistory();
}

function calculateCombinedPeriodData() {
  const activeRes = [];
  for (let i = 1; i <= MAX_SLOTS; i++) {
    if (isSlotActive(i) && lastBTResults[i]) activeRes.push(getBestResult(lastBTResults[i], i));
  }

  const results = activeRes.filter(r => r != null && r.chartDates && r.chartDates.length > 0);

  if (results.length < 2) {
    globalCombinedMonthlyData = [];
    globalCombinedYearlyData = [];
    return;
  }

  const sigs = results.map(r => {
    const fDates = r.chartDatesFull || r.chartDates || [];
    return r.summary ? `${r.currentStrat}_${r.summary.totalAssets}_${fDates.length}` : "null";
  });
  const newSig = sigs.join('|') + "|" + isCurrencyKRW;
  if (window.lastMonthlySig === newSig) return;
  window.lastMonthlySig = newSig;

  const combinedData = generateCombinedPeriodDataEngine(results);
  globalCombinedMonthlyData = combinedData.monthly;
  globalCombinedYearlyData = combinedData.yearly;
  globalCombinedDailyData = combinedData.daily;

  if (periodDisplayMode === 'chart') {
    renderPeriodBarChart();
  } else {
    for (let i = 1; i <= MAX_SLOTS; i++) {
      if (isSlotActive(i)) renderPeriodTableText(i);
    }
    renderPeriodTableText('Combined');
    renderPeriodTableText(0);
  }

  if (myUserId) {
    localStorage.setItem(`vtotal_snap_combined_${myUserId}`, JSON.stringify({ m: globalCombinedMonthlyData, y: globalCombinedYearlyData, d: globalCombinedDailyData }));
  }
}

function renderOrderViewSlot(res, slotNum) {
  if (!res) {
    renderOrderTableSlot([], slotNum);
    renderHoldingsTableSlot([], "", slotNum);
    const nameEl = document.getElementById('orderSlot' + slotNum + 'Name');
    if (nameEl) nameEl.innerHTML = "";
    const holdingsNameEl = document.getElementById('holdingsSlot' + slotNum + 'Name');
    if (holdingsNameEl) holdingsNameEl.innerHTML = "";
    refreshOrderViewUI();
    return;
  }
  renderOrderTableSlot(res.orders, slotNum);
  renderHoldingsTableSlot(res.inv || [], res.currentStrat, slotNum);

  const nameEl = document.getElementById('orderSlot' + slotNum + 'Name');
  if (nameEl) nameEl.innerHTML = formatStrategyNameWithSmallParentheses(res.currentStrat || "");
  const holdingsNameEl = document.getElementById('holdingsSlot' + slotNum + 'Name');
  if (holdingsNameEl) holdingsNameEl.innerHTML = formatStrategyNameWithSmallParentheses(res.currentStrat || "");

  if (res.nextOrderInfo) {
    const modeMap = { 'Middle': 'Mid1', 'Middle2': 'Mid2', 'Middle3': 'Mid3', 'SF': 'SF', 'AG': 'AG' };
    const elTier = document.getElementById('tierCountVal' + slotNum);
    const elMode = document.getElementById('modeCountVal' + slotNum);
    const elWeight = document.getElementById('weightCountVal' + slotNum);
    const elQty = document.getElementById('qtyCountVal' + slotNum);

    if (elTier) elTier.innerText = res.nextOrderInfo.tier;
    if (elMode) elMode.innerText = modeMap[res.nextOrderInfo.mode] || res.nextOrderInfo.mode;
    if (elWeight) elWeight.innerText = res.nextOrderInfo.weight;
    if (elQty) elQty.innerText = res.nextOrderInfo.qty;
  }

  const orderDate = res.orderDateStr || "";
  if (slotNum === 1) currentOrderDate = orderDate;
  refreshOrderViewUI();
}

function refreshOrderViewUI() {
  const date1 = lastBTResults[1]?.orderDateStr || currentOrderDate || "";

  for (let i = 1; i <= MAX_SLOTS; i++) {
    if (isSlotActive(i)) {
      const v = document.getElementById('orderView' + i);
      const h = document.getElementById('holdingsView' + i);
      const f = document.getElementById('tierFooter' + i);
      if (v) v.style.display = isOrderView ? 'block' : 'none';
      if (h) h.style.display = isOrderView ? 'none' : 'block';
      if (f) f.style.display = isOrderView ? 'flex' : 'none';
    }
  }

  // 슬롯 전체의 가시성(display: flex/none) 일괄 갱신
  updateSlotsVisibility();

  const dualContainer = document.getElementById('dualOrderContainer');
  const orderTitle = document.getElementById('orderTitle');

  if (dualContainer) dualContainer.style.display = 'flex';

  const co = document.getElementById('combinedOrderView');
  const ch = document.getElementById('combinedHoldingsView');
  if (co) co.style.display = isOrderView ? 'block' : 'none';
  if (ch) ch.style.display = isOrderView ? 'none' : 'block';

  // 1fr/40px 동적 min-width 조정을 위해 클래스 적용
  const grid = document.getElementById('mainGrid');
  if (grid) {
    if (isOrderView) {
      grid.classList.add('order-view-active');
      grid.classList.remove('holdings-view-active');
    } else {
      grid.classList.add('holdings-view-active');
      grid.classList.remove('order-view-active');
    }
  }

  // 확대 아이콘 제어: 통합 보유현황(!isOrderView && !showIndividualHoldings)일 때는 숨기고, 통합주문표 등에서는 노출
  const btnExpand = document.getElementById('btnExpandOrder');
  if (btnExpand) {
    if (!isOrderView && !showIndividualHoldings) {
      btnExpand.style.display = 'none';
    } else {
      btnExpand.style.display = '';
    }
  }

  const combinedMode = localStorage.getItem(`vtotal_combined_mode_${myUserId}`) || 'combined';

  if (combinedMode === 'combined') {
    if (isOrderView) {
      renderCombinedOrderBook();
    } else {
      if (showIndividualHoldings) {
        for (let i = 1; i <= MAX_SLOTS; i++) {
          if (isSlotActive(i) && lastBTResults[i]) {
            renderHoldingsTableSlot(lastBTResults[i].inv || [], lastBTResults[i].currentStrat, i);
          }
        }
      } else {
        renderCombinedHoldings();
      }
    }
    if (orderTitle) {
      const titleText = isOrderView ? "🌐 통합 주문표" : (showIndividualHoldings ? "💼 개별 보유현황" : "💼 통합 보유현황");
      orderTitle.innerHTML = `${titleText} <span style="font-size:0.75em; font-weight:normal; opacity:0.6; margin-left:8px;">(${date1})</span>`;
    }
  } else if (combinedMode === 'combined_normal') {
    // 통합+일반 모드
    if (isOrderView) {
      renderCombinedOrderBook();
    } else {
      if (showIndividualHoldings) {
        for (let i = 1; i <= MAX_SLOTS; i++) {
          if (isSlotActive(i) && lastBTResults[i]) {
            renderHoldingsTableSlot(lastBTResults[i].inv || [], lastBTResults[i].currentStrat, i);
          }
        }
      } else {
        renderCombinedHoldings();
      }
    }
    if (orderTitle) {
      const titleText = isOrderView ? "⚡ 통합+일반 주문표" : (showIndividualHoldings ? "💼 개별 보유현황" : "💼 통합 보유현황");
      orderTitle.innerHTML = `${titleText} <span style="font-size:0.75em; font-weight:normal; opacity:0.6; margin-left:8px;">(${date1})</span>`;
    }
  } else {
    // 일반 모드
    if (isOrderView) {
      // 일반 모드일 때는 굳이 통합 주문표 렌더링을 하지 않아도 됨
    } else {
      if (showIndividualHoldings) {
        for (let i = 1; i <= MAX_SLOTS; i++) {
          if (isSlotActive(i) && lastBTResults[i]) {
            renderHoldingsTableSlot(lastBTResults[i].inv || [], lastBTResults[i].currentStrat, i);
          }
        }
      } else {
        renderCombinedHoldings();
      }
    }
    if (orderTitle) {
      const titleText = isOrderView ? "⚡ 일반 개별 주문표" : (showIndividualHoldings ? "💼 개별 보유현황" : "💼 통합 보유현황");
      orderTitle.innerHTML = `${titleText} <span style="font-size:0.75em; font-weight:normal; opacity:0.6; margin-left:8px;">(${date1})</span>`;
    }
  }

  let titleStr = orderTitle ? orderTitle.innerHTML : "";

  const now = new Date();
  const nyTimeStr = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
  const nyHour = new Date(nyTimeStr).getHours();
  let dForTag = now;
  if (nyHour >= 16) dForTag = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const checkDateStrForTag = formatDateNY(dForTag);
  const isHoliday = isUSMarketHoliday(checkDateStrForTag);
  const nyDayStr = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short' }).format(dForTag);
  const isWeekend = (nyDayStr === 'Sat' || nyDayStr === 'Sun');

  if (isHoliday || isWeekend) {
    const statusText = isHoliday ? "[휴장일]" : "[주말]";
    titleStr += ` <span style="color:var(--danger); font-size:0.75em; font-weight:700; margin-left:8px;">${statusText}</span>`;
  }

  const titleEl = document.getElementById('orderTitle');
  if (titleEl) titleEl.innerHTML = titleStr;

  applyPrimaryDateHighlight();

  for (let i = 1; i <= MAX_SLOTS; i++) {
    ['orderView', 'holdingsView'].forEach(prefix => {
      const el = document.getElementById(prefix + i);
      if (el) {
        el.classList.remove('view-transition');
        void el.offsetWidth;
        el.classList.add('view-transition');
      }
    });
  }
}

function renderHoldingsTableSlot(inv, stratName, slotNum) {
  const tbody = document.getElementById('holdingsBody' + slotNum);
  if (!tbody) return;
  if (!inv || inv.length === 0) { tbody.innerHTML = "<tr><td colspan='8' style='padding:20px; color:#64748b;'>보유 수량 없음</td></tr>"; return; }
  
  const res = getBestResult(lastBTResults[slotNum], slotNum);
  let currPrice = 0;
  const mainData = window.globalMainDataSlot?.[slotNum] || window.globalMainData;
  if (mainData && mainData.close && mainData.close.length > 0) {
    currPrice = mainData.close[mainData.close.length - 1] || 0;
  }
  const sortedInv = [...inv].sort((a, b) => {
    const dA = String(a.buyDate || a.buy_date || "");
    const dB = String(b.buyDate || b.buy_date || "");
    if (dA !== dB) return dB.localeCompare(dA);
    const slotA = parseInt(a.slotNum || slotNum, 10) || 0;
    const slotB = parseInt(b.slotNum || slotNum, 10) || 0;
    if (slotA !== slotB) return slotA - slotB;
    return (parseInt(a.tier, 10) || 0) - (parseInt(b.tier, 10) || 0);
  });

  const modeMap = { 'Middle': 'Mid1', 'Middle2': 'Mid2', 'Middle3': 'Mid3', 'SF': 'SF', 'AG': 'AG' };
  tbody.innerHTML = sortedInv.map(o => {
    let sellPriceStr = "-", stopDateStr = "-";
    try {
      const modeData = MASTER_STRATEGIES[stratName].modes[o.mode];
      const sellPct = modeData.sell[o.tier - 1] || modeData.sell[0];
      const rawSellPrice = (Math.ceil((o.buy_price * (1 + sellPct) * 100) - 0.000001) / 100);
      if (isCurrencyKRW) {
        sellPriceStr = "₩" + Math.round(rawSellPrice * currentFXRate).toLocaleString();
      } else {
        sellPriceStr = "$" + rawSellPrice.toLocaleString(undefined, { minimumFractionDigits: 2 });
      }
      let holdLimit = modeData.hold[o.tier - 1] || modeData.hold[0];
      if (o.buyDate && window.globalMainData && window.globalMainData.dates) {
        const bIdx = window.globalMainData.dates.findIndex(d => formatDateNY(d) === o.buyDate);
        if (bIdx !== -1) {
          let curr = new Date(window.globalMainData.dates[bIdx]); let dCount = 0;
          while (dCount < holdLimit) {
            curr.setDate(curr.getDate() + 1); const dStr = formatDateNY(curr); const dow = curr.getDay();
            if (dow !== 0 && dow !== 6 && !isUSMarketHoliday(dStr)) dCount++;
          }
          const yy = String(curr.getFullYear()).slice(-2);
          const mm = String(curr.getMonth() + 1).padStart(2, '0');
          const dd = String(curr.getDate()).padStart(2, '0');
          stopDateStr = `${yy}-${mm}-${dd}`;
        }
      }
    } catch (e) { }

    let buyDateStr = "-";
    if (o.buyDate) {
      const parts = o.buyDate.split('-');
      if (parts.length === 3) {
        const yy = parts[0].slice(-2);
        buyDateStr = `${yy}-${parts[1]}-${parts[2]}`;
      } else {
        buyDateStr = o.buyDate;
      }
    }

    const displayMode = modeMap[o.mode] || o.mode;

    let profitStr = "-";
    let profitClass = "";
    if (currPrice > 0) {
      const buyPrice = parseFloat(String(o.buy_price || o.buyPrice || "0").replace(/[^0-9.-]/g, "")) || 0;
      const qty = parseFloat(o.qty) || 0;
      const profit = (currPrice - buyPrice) * qty;
      const sign = profit < 0 ? "-" : "";
      if (isCurrencyKRW) {
        profitStr = sign + "₩" + Math.round(Math.abs(profit) * currentFXRate).toLocaleString();
      } else {
        profitStr = sign + "$" + Math.abs(profit).toLocaleString(undefined, { minimumFractionDigits: 2 });
      }
      profitClass = profit > 0 ? "profit-plus" : (profit < 0 ? "profit-minus" : "");
    }

    let buyPriceStr = "";
    if (isCurrencyKRW) {
      buyPriceStr = "₩" + Math.round(Number(o.buy_price) * currentFXRate).toLocaleString();
    } else {
      buyPriceStr = "$" + Number(o.buy_price).toLocaleString(undefined, { minimumFractionDigits: 2 });
    }

    return `<tr><td style="cursor:pointer; text-decoration:underline;" onclick="toggleIndividualHoldings(event)" title="클릭하여 통합 보유현황 토글">#${slotNum}</td><td class="buy-price">${buyDateStr}</td><td>${stopDateStr}</td><td>${displayMode}/T${o.tier}</td><td class="buy-price">${buyPriceStr}</td><td class="hide-on-cover">${sellPriceStr}</td><td>${o.qty}</td><td class="${profitClass}">${profitStr}</td></tr>`;
  }).join('');
}

function renderOrderTableSlot(orders, slotNum) {
  const tbody = document.getElementById('orderBody' + slotNum);
  if (!tbody) return;
  if (!orders || orders.length === 0) { tbody.innerHTML = "<tr><td colspan='3' style='padding:20px; color:#64748b;'>주문 없음</td></tr>"; return; }

  let sortedOrders = [...orders];
  const orderSortOrder = localStorage.getItem(`vtotal_sort_order_${myUserId}`) || 'desc';
  sortedOrders.sort((a, b) => {
    let pA = parseFloat(a[2]) || 0;
    let pB = parseFloat(b[2]) || 0;
    return orderSortOrder === 'desc' ? (pB - pA) : (pA - pB);
  });

  tbody.innerHTML = sortedOrders.map(o => {
    const sideText = (o[1] === 'MOC' || o[1] === 'LOC') ? o[1] + o[0] : o[0];
    const cls = o[0] === '매수' ? 'buy' : 'sell';
    return `<tr><td class="${cls}">${sideText}</td><td class="hidden">${o[1]}</td><td class="${cls}">$${Number(o[2]).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td><td class="${cls}">${o[3]}주</td></tr>`;
  }).join('');
}

function updatePeriodTitle() {
  const grid = document.getElementById('mainGrid');
  const isPerfTabLayout = grid && grid.classList.contains('perf-tab-layout');
  if (isPerfTabLayout) {
    const periodTitle = document.getElementById('periodTitle');
    if (periodTitle) periodTitle.innerHTML = '📅 년별 성과 그래프';
    return;
  }

  const periodTitle = document.getElementById('periodTitle');
  const periodChartTitle = document.getElementById('periodChartTitle');
  if (!periodTitle) return;
  const smallStyle = 'style="font-size:0.85em; font-weight:normal; opacity:0.8; margin-left:2px;"';
  
  let titleText = "";
  let chartTitleText = "";
  if (periodViewState === 0) {
    titleText = `📅 월별 성과 <span ${smallStyle}>(종합)</span>`;
    chartTitleText = `📅 월별 성과 그래프`;
  } else if (periodViewState === 1) {
    titleText = `📅 년별 성과 <span ${smallStyle}>(종합)</span>`;
    chartTitleText = `📅 년별 성과 그래프`;
  } else {
    titleText = `📅 일별 성과 <span ${smallStyle}>(종합)</span>`;
    chartTitleText = `📅 일별 성과 그래프`;
  }
  
  periodTitle.innerHTML = titleText;
  if (periodChartTitle) periodChartTitle.innerHTML = chartTitleText;
}

function initPeriodDisplayModeUI() {
  const chartC = document.getElementById('periodChartContainer');
  const tableC = document.getElementById('periodTableContainer');
  const ico = document.getElementById('icoPeriodMode');
  if (periodDisplayMode === 'chart') {
    if (chartC) chartC.style.display = 'block';
    if (tableC) tableC.style.display = 'none';
    if (ico) ico.innerHTML = '🔢';
    renderPeriodBarChart();
  } else {
    if (chartC) chartC.style.display = 'none';
    if (tableC) tableC.style.display = 'block';
    if (ico) ico.innerHTML = '📊';
    for (let i = 1; i <= MAX_SLOTS; i++) {
      if (isSlotActive(i)) renderPeriodTableText(i);
    }
    renderPeriodTableText('Combined');
    renderPeriodTableText(0);
  }
}

function togglePeriodDisplayMode() {
  periodDisplayMode = (periodDisplayMode === 'chart') ? 'table' : 'chart';
  try { localStorage.setItem(`vtotal_period_display_mode_${myUserId}`, periodDisplayMode); } catch (e) { }
  initPeriodDisplayModeUI();
}

function togglePeriodView() {
  const grid = document.getElementById('mainGrid');
  const isPerfTabLayout = grid && grid.classList.contains('perf-tab-layout');
  if (isPerfTabLayout) return; // 성과 탭 레이아웃에서는 타이틀 클릭 동작을 막음

  periodViewState = (periodViewState + 1) % 3;
  try { localStorage.setItem(`vtotal_period_view_state_${myUserId}`, periodViewState); } catch (e) { }
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

    renderPeriodTableText(0);
    for (let i = 1; i <= MAX_SLOTS; i++) {
      if (isSlotActive(i)) renderPeriodTableText(i);
    }
    renderPeriodTableText('Combined');
  }

  if (isPerfTabLayout || periodDisplayMode === 'chart') {
    renderPeriodBarChart();
  }
  if (myChart) setTimeout(() => myChart.resize(), 100);
}

function renderPeriodTableTextRaw(slotNum, viewStateOverride, suffix = "") {
  const tbodyStr = slotNum === 'Combined' ? `periodBodyCombined${suffix}` : `periodBody${slotNum}${suffix}`;
  const tbody = document.getElementById(tbodyStr);
  if (!tbody) return;

  const CELL_STYLE = "vertical-align:middle; height:16px !important; line-height:16px !important; padding:0 4px !important; box-sizing:border-box !important; white-space:nowrap; overflow:hidden;";

  if (slotNum === 0) {
    let dataCandidate = [];
    let mapArr = viewStateOverride === 1 ? [...globalYearlyDataArr, globalCombinedYearlyData] : (viewStateOverride === 2 ? [...globalDailyDataArr, globalCombinedDailyData] : [...globalMonthlyDataArr, globalCombinedMonthlyData]);
    for (let d of mapArr) if (d && d.length > (dataCandidate.length || 0)) dataCandidate = d;

    if (!dataCandidate || dataCandidate.length === 0) {
      tbody.innerHTML = `<tr><td style="${CELL_STYLE} text-align:center;">-</td></tr>`;
      return;
    }

    let sortedData = [...dataCandidate];
    if (viewStateOverride === 2) {
      sortedData = sortedData.filter(row => row.period && row.period.includes('-') && row.period.length >= 8);
    }
    sortedData.sort((a, b) => b.period.localeCompare(a.period));

    tbody.innerHTML = sortedData.map(row => {
      let d = row.period;
      if (viewStateOverride === 2 && d.includes('-')) { const p = d.split('-'); d = p[1] + '/' + p[2]; }
      else if (d.includes('-')) { const p = d.split('-'); d = p[0].substring(2) + '/' + p[1]; }
      else if (d.length === 4) { d = d.substring(2); }
      return `<tr><td style="${CELL_STYLE} width:1%; text-align:center;">${d}</td></tr>`;
    }).join('');
    return;
  }

  if (slotNum !== 'Combined') {
    const titleEl = document.getElementById(`slot${slotNum}TableName${suffix}`);
    if (titleEl) titleEl.innerHTML = formatStrategyNameWithSmallParentheses(getSlotConfig(slotNum)?.basics?.strategy || `V-QUANT 2-${slotNum}`);
  }

  const mData = slotNum === 'Combined' ? globalCombinedMonthlyData : globalMonthlyDataArr[slotNum];
  const yData = slotNum === 'Combined' ? globalCombinedYearlyData : globalYearlyDataArr[slotNum];
  const dData = slotNum === 'Combined' ? globalCombinedDailyData : globalDailyDataArr[slotNum];
  let data = viewStateOverride === 1 ? yData : (viewStateOverride === 2 ? dData : mData);

  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan='4' style="${CELL_STYLE} text-align:center;">데이터가 없습니다.</td></tr>`;
    return;
  }

  let filteredData = [...data];
  if (viewStateOverride === 2) {
    filteredData = filteredData.filter(row => row.period && row.period.includes('-') && row.period.length >= 8);
  }
  filteredData.sort((a, b) => b.period.localeCompare(a.period));

  const fmtRate = (r) => { const v = (r * 100); return (v < 0 ? '-' : '') + Math.abs(v).toFixed(1) + '%'; };
  const fmtProfit = (p) => {
    if (isCurrencyKRW) {
      let val = Math.round((p * currentFXRate) / 10000);
      return (val < 0 ? '-' : '') + Math.abs(val).toLocaleString() + '만';
    } else {
      let val = Math.round(p);
      return (val < 0 ? '-$' : '$') + Math.abs(val).toLocaleString();
    }
  };
  const fmtAsset = (a) => {
    if (isCurrencyKRW) { return Math.round((a * currentFXRate) / 10000).toLocaleString() + '만'; }
    else { return '$' + Math.round(a).toLocaleString(); }
  };
  const fmtMdd = (m) => (m * 100).toFixed(1) + '%';
  const cls = (v) => v > 0 ? 'val-plus' : 'val-minus';

  tbody.innerHTML = filteredData.map(row => {
    let html = "";
    html += `<td class='${cls(row.profit)}' style='${CELL_STYLE}'>${fmtProfit(row.profit)}</td>`;
    html += `<td class='${cls(row.rate)}' style='${CELL_STYLE}'>${fmtRate(row.rate)}</td>`;
    html += `<td class='hide-on-cover ${(row.mdd < 0 ? 'val-minus' : '')}' style='${CELL_STYLE}'>${fmtMdd(row.mdd)}</td>`;
    return `<tr>${html}</tr>`;
  }).join('');
}

function renderPeriodTableText(slotNum) {
  renderPeriodTableTextRaw(slotNum, periodViewState, "");
}

function renderPerfTables() {
  // 년별 테이블 (viewStateOverride = 1, suffix = "Yearly")
  for (let i = 1; i <= MAX_SLOTS; i++) {
    if (isSlotActive(i)) renderPeriodTableTextRaw(i, 1, "Yearly");
  }
  renderPeriodTableTextRaw('Combined', 1, "Yearly");
  renderPeriodTableTextRaw(0, 1, "Yearly");

  // 월별 테이블 (viewStateOverride = 0, suffix = "Monthly")
  for (let i = 1; i <= MAX_SLOTS; i++) {
    if (isSlotActive(i)) renderPeriodTableTextRaw(i, 0, "Monthly");
  }
  renderPeriodTableTextRaw('Combined', 0, "Monthly");
  renderPeriodTableTextRaw(0, 0, "Monthly");

  // 일별 테이블 (viewStateOverride = 2, suffix = "Daily")
  for (let i = 1; i <= MAX_SLOTS; i++) {
    if (isSlotActive(i)) renderPeriodTableTextRaw(i, 2, "Daily");
  }
  renderPeriodTableTextRaw('Combined', 2, "Daily");
  renderPeriodTableTextRaw(0, 2, "Daily");
}

function refreshAllUI() {
  calculateCombinedPeriodData();
  if (periodDisplayMode === 'chart') {
    renderPeriodBarChart();
  } else {
    for (let i = 1; i <= MAX_SLOTS; i++) {
      if (isSlotActive(i)) renderPeriodTableText(i);
    }
    renderPeriodTableText('Combined');
    renderPeriodTableText(0);
  }
  
  // 성과 탭 활성화 여부 확인 후 성과 테이블 렌더링
  const grid = document.getElementById('mainGrid');
  if (grid && grid.classList.contains('perf-tab-layout')) {
    renderPerfTables();
    if (typeof renderPeriodBarChartRaw === 'function') {
      if (yearlyDisplayMode === 'chart') renderPeriodBarChartRaw('perfYearlyBarChart', 1);
      if (monthlyDisplayMode === 'chart') renderPeriodBarChartRaw('perfMonthlyBarChart', 0);
      if (dailyDisplayMode === 'chart') renderPeriodBarChartRaw('perfDailyBarChart', 2);
    }
  }
  renderChartAll();
  refreshStatsTable();
  refreshOrderViewUI();
  if (isStatsMode) renderDBTradeHistory();
}

function toggleCurrencyMode() {
  isCurrencyKRW = !isCurrencyKRW;
  const val = isCurrencyKRW ? 'KRW' : 'USD';
  if (myUserId) {
    localStorage.setItem(`vtotal_pref_currency_${myUserId}`, val);
  }
  const defaultCurrSelect = document.getElementById('defaultCurrency');
  if (defaultCurrSelect) {
    defaultCurrSelect.value = val;
  }
  syncCurrencyUI();
  refreshAllUI();
}

function syncCurrencyUI() {
  const btns = document.querySelectorAll('.btn-currency-toggle, #btnCurrencyToggle');
  const ICON_USD = `<img src="https://flagcdn.com/w40/us.png" style="width:16px; height:12px; border-radius:2px; margin-right:5px; flex-shrink:0; box-shadow: 0 0 2px rgba(0,0,0,0.5);">`;
  const ICON_KRW = `<img src="https://flagcdn.com/w40/kr.png" style="width:16px; height:12px; border-radius:2px; margin-right:5px; flex-shrink:0; box-shadow: 0 0 2px rgba(0,0,0,0.5);">`;
  
  btns.forEach(btn => {
    btn.style.alignItems = "center"; btn.style.justifyContent = "center";
    btn.style.minWidth = "70px"; btn.style.padding = "4px 8px"; btn.style.marginLeft = "auto"; btn.style.marginRight = "0px";
    btn.innerHTML = isCurrencyKRW ? `${ICON_KRW} KRW` : `${ICON_USD} USD`;
    btn.style.color = 'var(--text)'; btn.style.border = 'none'; btn.style.outline = 'none'; btn.style.boxShadow = 'none'; btn.style.background = 'none'; btn.style.fontWeight = 'bold';
  });
}

function updateDefaultCurrency(val) {
  isCurrencyKRW = (val === 'KRW');
  if (myUserId) {
    localStorage.setItem(`vtotal_pref_currency_${myUserId}`, val);
    showToast(`기본 통화가 ${val === 'KRW' ? '원화' : '달러'}로 설정되었습니다.`);
  }
  syncCurrencyUI();
  refreshAllUI();
}

function updateTheme(val) {
  // 테마 클래스 즉시 적용 (로그인 여부와 상관없이 항상 동작해야 함)
  if (val === 'light') document.body.classList.add('light-mode');
  else document.body.classList.remove('light-mode');
  if (periodDisplayMode === 'chart') renderPeriodBarChart();
  
  // 브라우저 렌더링 사이클을 고려해 setTimeout으로 차트 즉시 강제 리렌더링
  setTimeout(() => {
    if (window.statsPieChartInstance && typeof updateStatsPieChart === 'function') {
      updateStatsPieChart();
    }
    if (window.myChart) {
      if (typeof renderChartAll === 'function') renderChartAll();
      else window.myChart.update();
    }
  }, 30);

  if (myUserId) {
    localStorage.setItem(`vtotal_pref_theme_${myUserId}`, val);
    showToast(`테마가 ${val === 'light' ? '라이트' : '다크'}로 설정되었습니다.`);
  }
}

function updateSortOrder(val) {
  if (myUserId) {
    localStorage.setItem(`vtotal_sort_order_${myUserId}`, val);
    showToast(`주문표 정렬이 ${val === 'asc' ? '상승(▲)' : '하강(▼)'}으로 즉시 설정되었습니다.`);
    if (typeof renderCombinedOrderBook === 'function') renderCombinedOrderBook();
    for (let i = 1; i <= MAX_SLOTS; i++) {
      if (lastBTResults[i] && lastBTResults[i].orders) {
        renderOrderTableSlot(lastBTResults[i].orders, i);
      }
    }
  }
}

function updateCombinedMode(val) {
  if (myUserId) {
    localStorage.setItem(`vtotal_combined_mode_${myUserId}`, val);
    showToast(`통합주문서 모드가 ${val === 'combined' ? '통합주문' : '일반'}으로 설정되었습니다.`);
    updateSlotsVisibility();
    refreshOrderViewUI();
  }
}

function updateFontSize(val) {
  if (myUserId) {
    localStorage.setItem(`vtotal_font_size_${myUserId}`, val);
    document.documentElement.style.setProperty('--app-font-size', val);
    showToast(`기본 폰트 크기가 ${val}로 변경되었습니다.`);
    if (typeof renderChartAll === 'function') renderChartAll();
    if (typeof renderPeriodBarChart === 'function') renderPeriodBarChart();
    if (typeof updateStatsPieChart === 'function') updateStatsPieChart();
  }
}

function toggleSortOrder() {
  if (myUserId) {
    const current = localStorage.getItem(`vtotal_sort_order_${myUserId}`) || 'desc';
    const nextVal = current === 'asc' ? 'desc' : 'asc';
    localStorage.setItem(`vtotal_sort_order_${myUserId}`, nextVal);
    
    // 설정창의 셀렉트 박스 동기화
    const sortSelect = document.getElementById('sortOrderSelect');
    if (sortSelect) sortSelect.value = nextVal;
    
    showToast(`주문표 정렬이 ${nextVal === 'asc' ? '상승(▲)' : '하강(▼)'}으로 토글되었습니다.`);
    
    if (typeof renderCombinedOrderBook === 'function') renderCombinedOrderBook();
    for (let i = 1; i <= MAX_SLOTS; i++) {
      if (lastBTResults[i] && lastBTResults[i].orders) {
        renderOrderTableSlot(lastBTResults[i].orders, i);
      }
    }
  }
}

function renderPeriodTableSlot(slotNum) {
  if (periodDisplayMode === 'chart') {
    renderPeriodBarChart();
  } else {
    renderPeriodTableText(slotNum);
    renderPeriodTableText('Combined');
    renderPeriodTableText(0);
  }
}



function getBestResult(currentRes, slotNum) {
  if (isViewingHistory) return currentRes;
  if (currentRes && currentRes.isSynced) return currentRes;
  const cachedStr = localStorage.getItem(`vtotal_snap${slotNum}_` + myUserId);
  if (cachedStr) {
    try {
      const snap = JSON.parse(cachedStr);
      if (snap.isSynced && (!currentRes || snap.currentStrat === currentRes.currentStrat)) return snap;
    } catch (e) { }
  }
  return currentRes;
}


function calculateCombinedSummary() {
  const activeRes = [];
  for (let i = 1; i <= MAX_SLOTS; i++) {
    if (isSlotActive(i)) {
      const b = getBestResult(lastBTResults[i], i);
      if (b) activeRes.push(b);
    }
  }
  return calculateCombinedSummaryEngine(activeRes);
}

function refreshStatsTable() {
  const table = document.getElementById('statsTable');
  const actionArea = document.getElementById('statsActionArea');
  if (!table || !actionArea) return;

  // 버튼 초기화
  actionArea.innerHTML = '';

  // 수동 백테스트 모드일 때만 엑셀 버튼 생성
  if (isManualBacktestMode && isViewingHistory) {
    const btn = document.createElement('button');
    btn.className = 'top-icon-btn';
    btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    btn.style.borderRadius = '6px';
    btn.style.padding = '4px 10px';
    btn.style.color = 'white';
    btn.style.fontSize = '11px';
    btn.innerHTML = '📊 엑셀 저장';
    btn.onclick = exportTradeHistoryToCSV;
    actionArea.appendChild(btn);
  }

  const grid = document.getElementById('mainGrid');
  const tableContainer = document.getElementById('statsTableContainer');
  const chartContainer = document.getElementById('statsChartContainer');
  const selector = document.getElementById('statsMetricSelector');

  if (grid && grid.classList.contains('backtest-view-layout')) {
    const rankBtn = document.createElement('button');
    rankBtn.className = 'top-icon-btn';
    rankBtn.style.background = 'linear-gradient(135deg, #fbbf24, #d97706)';
    rankBtn.style.borderRadius = '6px';
    rankBtn.style.padding = '4px 10px';
    rankBtn.style.color = 'white';
    rankBtn.style.fontSize = '11px';
    rankBtn.style.fontWeight = 'bold';
    rankBtn.style.cursor = 'pointer';
    rankBtn.style.marginLeft = '4px';
    rankBtn.innerHTML = '🏆 랭킹';
    rankBtn.onclick = showRankingModal;
    actionArea.appendChild(rankBtn);
  }

  if (grid && grid.classList.contains('perf-metrics-layout')) {
    // 내역 뷰: 마지막으로 본 자산현황/실시간 운영현황 표시 상태를 유지
    const statsTitle = document.getElementById('statsTitle');
    if (statsTitle) statsTitle.innerHTML = statsDisplayMode === 'chart' ? '💼 자산현황' : '📡 실시간 운영현황';
    if (statsDisplayMode === 'chart') {
      if (tableContainer) tableContainer.style.display = 'none';
      if (chartContainer) chartContainer.style.display = 'flex';
      if (selector) selector.style.display = 'block';
      if (actionArea) actionArea.style.display = 'none';
      setTimeout(() => updateStatsPieChart(), 60);
    } else {
      if (tableContainer) tableContainer.style.display = 'block';
      if (chartContainer) chartContainer.style.display = 'none';
      if (selector) selector.style.display = 'none';
      if (actionArea) actionArea.style.display = 'flex';
    }
    renderRealtimeStatusTable(table);
  } else if (grid && grid.classList.contains('perf-tab-layout')) {
    // 성과 뷰: 제목 클릭으로 성과 지표와 실시간 운영현황을 전환
    const statsTitle = document.getElementById('statsTitle');
    if (statsTitle) statsTitle.innerHTML = perfStatsMode === 'realtime' ? '📡 실시간 운영현황' : '📄 성과 지표';
    if (tableContainer) tableContainer.style.display = 'block';
    if (chartContainer) chartContainer.style.display = 'none';
    if (selector) selector.style.display = 'none';
    if (actionArea) actionArea.style.display = 'flex';
    if (perfStatsMode === 'realtime') {
      renderRealtimeStatusTable(table);
    } else {
      renderOriginalStatsTable(table);
    }
  } else if (grid && grid.classList.contains('backtest-view-layout')) {
    // 백테스트 뷰: 제목 클릭으로 성과 지표, 실시간 운영현황, 자산현황을 전환
    const statsTitle = document.getElementById('statsTitle');
    if (backtestStatsMode === 'asset') {
      statsDisplayMode = 'chart';
      if (statsTitle) statsTitle.innerHTML = '💼 자산현황';
      if (tableContainer) tableContainer.style.display = 'none';
      if (chartContainer) chartContainer.style.display = 'flex';
      if (selector) selector.style.display = 'block';
      if (actionArea) actionArea.style.display = 'none';
      setTimeout(() => {
        updateStatsPieChart();
      }, 60);
    } else {
      statsDisplayMode = 'table';
      if (statsTitle) statsTitle.innerHTML = backtestStatsMode === 'realtime' ? '📡 실시간 운영현황' : '📄 성과 지표';
      if (tableContainer) tableContainer.style.display = 'block';
      if (chartContainer) chartContainer.style.display = 'none';
      if (selector) selector.style.display = 'none';
      if (actionArea) actionArea.style.display = 'flex';
      if (backtestStatsMode === 'realtime') {
        renderRealtimeStatusTable(table);
      } else {
        renderOriginalStatsTable(table);
      }
    }
  } else {
    // 실시간 운영현황 뷰: statsDisplayMode 상태를 따름
    if (statsDisplayMode === 'chart') {
      if (tableContainer) tableContainer.style.display = 'none';
      if (chartContainer) chartContainer.style.display = 'flex';
      if (selector) selector.style.display = 'block';
      if (actionArea) actionArea.style.display = 'none';
    } else {
      if (tableContainer) tableContainer.style.display = 'block';
      if (chartContainer) chartContainer.style.display = 'none';
      if (selector) selector.style.display = 'none';
      if (actionArea) actionArea.style.display = 'flex';
    }
    renderRealtimeStatusTable(table);
  }
}

function renderOriginalStatsTable(table) {
  const rows = [];
  let activeCount = 0;
  const grid = document.getElementById('mainGrid');
  const isBacktestStatsView = !!(grid && grid.classList.contains('backtest-view-layout'));

  for (let i = 1; i <= MAX_SLOTS; i++) {
    if (isSlotActive(i)) {
      activeCount++;
      rows.push({
        res: getBestResult(lastBTResults[i], i),
        slotNum: i,
        name: getSlotConfig(i)?.basics?.strategy || `V-QUANT 2-${i}`,
        color: SLOT_COLORS[(i - 1) % SLOT_COLORS.length]
      });
    }
  }

  // ⭐️ 백테스트 성과 지표 및 실시간 운영현황 표에서 개별 투자법들을 수익률 내림차순으로 정렬 (안전 장치 추가)
  const getYieldVal = (r) => {
    try {
      const displaySummary = r.res ? (isBacktestStatsView ? r.res.summary : getDisplayStatusData(r.res, r.slotNum)) : null;
      if (!displaySummary) return -Infinity;
      const tAssets = displaySummary.totalAssets !== undefined ? displaySummary.totalAssets : (displaySummary.total_assets || 0);
      const rPrincipal = displaySummary.realPrincipal !== undefined ? displaySummary.realPrincipal : (displaySummary.base || displaySummary.base_principal || 0);
      const yVal = rPrincipal > 0 ? (tAssets - rPrincipal) / rPrincipal : 0;
      return (typeof yVal === 'number' && !isNaN(yVal) && isFinite(yVal)) ? yVal : -Infinity;
    } catch (e) {
      console.warn("getYieldVal 정렬 연산 중 예외 무시 (초기 동기화 중일 수 있음):", e);
      return -Infinity;
    }
  };

  rows.sort((a, b) => getYieldVal(b) - getYieldVal(a));

  if (activeCount >= 2) {
    const comb = calculateCombinedSummary();
    rows.push({ res: { summary: comb, isSynced: true }, name: '합산', color: 'var(--secondary)' });
    if (myUserId && comb) {
      const existing = localStorage.getItem(`vtotal_snap_combined_${myUserId}`);
      let cData = existing ? JSON.parse(existing) : { m: [], y: [] };
      cData.stats = comb;
      localStorage.setItem(`vtotal_snap_combined_${myUserId}`, JSON.stringify(cData));
    }
  } else if (activeCount === 0 && window.cachedCombinedStats) {
    rows.push({ res: { summary: window.cachedCombinedStats, isSynced: true }, name: '합산', color: 'var(--secondary-muted, #94a3b8)' });
  }

  if (rows.length === 0) {
    table.innerHTML = '<tr><td style="text-align:center; padding:20px; color:#94a3b8;">데이터가 없습니다.</td></tr>';
    return;
  }

  const isValid = (v) => v !== undefined && v !== null && !isNaN(v) && isFinite(v);
  const fmtValue = (sObj, m, isCombo) => {
    if (!sObj) return '-';
    const tAssets = sObj.totalAssets !== undefined ? sObj.totalAssets : (sObj.total_assets || 0);
    const rPrincipal = sObj.realPrincipal !== undefined ? sObj.realPrincipal : (sObj.base || sObj.base_principal || 0);
    let v = sObj[m.key];
    if (m.key === 'realPrincipal') v = rPrincipal;
    if (m.key === 'totalAssets') v = tAssets;
    if (m.key === 'totalProfit') v = tAssets - rPrincipal;
    if (m.key === 'yield') v = rPrincipal > 0 ? (tAssets - rPrincipal) / rPrincipal : 0;
    if (v === undefined || v === null) v = sObj[m.key] || 0;
    if (!isValid(v)) v = 0;

    const fx = isCurrencyKRW ? currentFXRate : 1450;
    if (m.type === 'fmt') {
      if (isCurrencyKRW) return Math.round(Number(v) * fx / 10000).toLocaleString() + '만';
      return '$' + Math.round(Number(v)).toLocaleString();
    }
    if (m.type === 'color') {
      let num = Number(v);
      if (m.pct) {
        let str = (Math.abs(num) * 100).toFixed(1) + '%';
        return num > 0 ? `<span class="val-plus">${str}</span>` : (num < 0 ? `<span class="val-minus">-${str}</span>` : `<span>${str}</span>`);
      } else {
        let str = isCurrencyKRW ? Math.round(Math.abs(num) * fx / 10000).toLocaleString() + '만' : '$' + Math.round(Math.abs(num)).toLocaleString();
        return num > 0 ? `<span class="val-plus">${str}</span>` : (num < 0 ? `<span class="val-minus">-${str}</span>` : `<span>${str}</span>`);
      }
    }
    if (m.type === 'profitWithYield') {
      const profit = Number(v);
      const rate = Number(sObj.yield || 0);
      const sign = profit < 0 ? '-' : '';
      const money = isCurrencyKRW
        ? sign + Math.round(Math.abs(profit) * fx / 10000).toLocaleString() + '만'
        : sign + '$' + Math.round(Math.abs(profit)).toLocaleString();
      const pct = Math.round(rate * 100).toLocaleString() + '%';
      const display = `${money}<span class="stats-profit-rate">(${pct})</span>`;
      const cls = profit > 0 ? 'val-plus' : (profit < 0 ? 'val-minus' : '');
      return cls ? `<span class="${cls}">${display}</span>` : display;
    }
    if (m.type === 'price') return '$' + Number(v).toFixed(2);
    if (m.type === 'raw') return (m.key === 'calmar' ? Number(v).toFixed(2) : v) + (m.suffix || '');
    return v;
  };

  const metricsList = [
    { key: 'totalAssets', label: '총자산', type: 'fmt' },
    { key: 'realPrincipal', label: '원금', type: 'fmt' },
    { key: 'yield', label: '수익률', type: 'color', pct: true },
    { key: 'currentMdd', label: '현재 MDD', type: 'color', pct: true },
    { key: 'depletion', label: '진행도', type: 'color', pct: true },
    { key: 'totalProfit', label: '총수익금', type: 'color' },
    { key: 'evalVal', label: '평가액', type: 'fmt' },
    { key: 'evalReturn', label: '평가수익', type: 'color', pct: true },
    { key: 'qty', label: '주식수', type: 'raw', suffix: '주' },
    { key: 'mdd', label: '전체 MDD', type: 'color', pct: true },
    { key: 'cagr', label: 'CAGR', type: 'color', pct: true },
    { key: 'calmar', label: '칼마비율', type: 'raw' },
    { key: 'cash', label: '예수금', type: 'fmt' },
    { key: 'base', label: '갱신금', type: 'fmt' },
    { key: 'avgPrice', label: '평균단가', type: 'price' }
  ];

  let html = '<div style="display:flex; flex-direction:column; gap:1px; padding:2px; box-sizing:border-box; width:100%;">';
  html += '<div style="display:flex; align-items:center; gap:1px; padding:2px 3px 2px 0px; box-sizing:border-box; line-height:1; height:18px; border-bottom:1px solid rgba(255,255,255,0.1); width:100%;">';
  html += '<div style="font-size:11px; font-weight:700; letter-spacing:-0.2px; line-height:1; width:56px; min-width:56px; max-width:56px; flex-shrink:0; color:var(--text-muted); display:flex; align-items:center; justify-content:flex-start; text-align:left; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">구분</div>';
  metricsList.forEach(m => {
    const minWidth = (m.key === 'totalAssets') ? '72px' : '50px';
    html += `<div style="flex:1; min-width:${minWidth}; font-size:10px; font-weight:700; letter-spacing:-0.2px; line-height:1; display:flex; align-items:center; justify-content:center; text-align:center; color:var(--text-muted); white-space:nowrap;">${m.label}</div>`;
  });
  html += '</div>';
 
  rows.forEach((r) => {
    const isCombo = (r.name === '합산');
    const displaySummary = r.res ? ((isCombo || isBacktestStatsView) ? r.res.summary : getDisplayStatusData(r.res, r.slotNum)) : null;
    html += `<div class="stats-row" style="display:flex; align-items:center; gap:1px; border-radius:3px; padding:2px 3px 2px 0px; box-sizing:border-box; line-height:1; min-height:18px; width:100%;">`;
    html += `<div style="font-size:11px; font-weight:700; letter-spacing:-0.2px; line-height:1; width:56px; min-width:56px; max-width:56px; flex-shrink:0; color:${r.color}; display:flex; align-items:center; justify-content:flex-start; text-align:left; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${formatStrategyNameWithSmallParentheses(r.name)}</div>`;
    metricsList.forEach(m => {
      let cellVal = fmtValue(displaySummary, m, isCombo);
      const minWidth = (m.key === 'totalAssets') ? '72px' : '50px';
      const isPrincipal = (m.key === 'realPrincipal');
      const cellClass = isPrincipal ? 'class="stats-asset-principal-val"' : '';
      html += `<div ${cellClass} style="flex:1; min-width:${minWidth}; font-size:var(--app-font-size, 10.5px); font-weight:${isPrincipal ? '700' : '400'}; display:flex; align-items:center; justify-content:center; text-align:center; line-height:1; white-space:nowrap;">${cellVal}</div>`;
    });
    html += '</div>';
  });
  html += '</div>';
  table.innerHTML = html;
}

// ⭐️ [전역] 슬롯 데이터를 화면 표시용 오브젝트로 변환 (도넛 차트/표 공용)
function getDisplayStatusData(res, slotNum) {
  if (!res || !res.summary) return null;
  const s = res.summary;
  let sheetDate = "-";
  if (slotNum === 'Combined') {
    let firstActiveDate = null;
    for (let i = 1; i <= MAX_SLOTS; i++) {
      if (isSlotActive(i)) {
        const d = localStorage.getItem(`vtotal_sheet_last_date_${i}_${myUserId}`);
        if (d && d !== "-" && d !== "1900-01-01") {
          firstActiveDate = d;
          break;
        }
      }
    }
    sheetDate = firstActiveDate || "-";
  } else {
    sheetDate = getDisplaySheetDate(slotNum, res, slotConfigs[slotNum]);
  }
  
  let displayTotal = s.totalAssets !== undefined ? s.totalAssets : (s.total_assets || 0);
  let displayBase = s.base !== undefined ? s.base : (s.base_principal || 0);
  let displayPrincipal = s.realPrincipal !== undefined ? s.realPrincipal : (s.base || 0);
  let displayCash = s.cash !== undefined ? s.cash : 0;
  let displayEval = s.evalVal !== undefined ? s.evalVal : 0;
  let displayQty = s.qty !== undefined ? s.qty : 0;
  let displayCurrentMdd = s.currentMdd !== undefined ? s.currentMdd : 0;
  let displayMdd = s.mdd !== undefined ? s.mdd : displayCurrentMdd;
  let displayYield = displayPrincipal > 0 ? (displayTotal - displayPrincipal) / displayPrincipal : 0;
  let displayEvalReturn = s.evalReturn !== undefined ? s.evalReturn : 0;
  let displayDepletion = s.depletion !== undefined ? s.depletion : 0;
  let displayAvgPrice = s.avgPrice !== undefined ? s.avgPrice : 0;
  let displayCagr = s.cagr !== undefined ? s.cagr : 0;
  let displayCalmar = s.calmar !== undefined ? s.calmar : 0;
  const applyHoldingsFallback = (jsonData) => {
    const holdings = Array.isArray(jsonData?.holdings) ? jsonData.holdings : [];
    if (holdings.length === 0) return;
    let hQty = 0;
    let hCost = 0;
    holdings.forEach(h => {
      const q = parseFloat(h.qty || 0) || 0;
      const cost = parseFloat(h.cost || 0) || ((parseFloat(h.buy_price || h.buyPrice || 0) || 0) * q);
      hQty += q;
      hCost += cost;
    });
    if (hQty > 0 && (!displayQty || displayQty <= 0)) displayQty = hQty;
    if (hQty > 0 && (!displayAvgPrice || displayAvgPrice <= 0)) displayAvgPrice = hCost > 0 ? hCost / hQty : displayAvgPrice;
  };

  
  if (slotNum !== 'Combined') {
    if (res.isSynced) {
      // sync
    } else if (res.dailyStates && res.dailyStates.length > 0) {
      const lastState = res.dailyStates[res.dailyStates.length - 1];
      displayTotal = lastState.asset;
      try {
        const lastJson = JSON.parse(lastState.json);
        displayCash = lastJson.cash;
        displayBase = lastJson.base_principal;
        displayPrincipal = lastJson.realPrincipal || displayPrincipal;
        displayEval = lastJson.evalVal !== undefined ? lastJson.evalVal : (displayTotal - displayCash);
        displayQty = lastJson.qty !== undefined ? lastJson.qty : displayQty;
        displayYield = displayPrincipal > 0 ? (displayTotal - displayPrincipal) / displayPrincipal : 0;
        displayEvalReturn = lastJson.evalReturn !== undefined ? lastJson.evalReturn : displayEvalReturn;
        displayDepletion = lastJson.depletion !== undefined ? lastJson.depletion : displayDepletion;
        displayAvgPrice = lastJson.avgPrice !== undefined ? lastJson.avgPrice : displayAvgPrice;
        applyHoldingsFallback(lastJson);
        
        const assets = res.dailyStates.map(d => d.asset);
        const peak = assets.length > 0 ? Math.max(...assets) : 0;
        displayCurrentMdd = peak > 0 ? (displayTotal - peak) / peak : 0;
      } catch (e) {
        displayEval = displayTotal - displayCash;
      }
    }
  } else {
    displayEval = s.evalVal !== undefined ? s.evalVal : (displayTotal - displayCash);
  }
  
  const calcEvalProfit = (targetRes) => {
    const summary = targetRes?.summary || targetRes || {};
    const sEval = parseFloat(summary.evalVal || 0) || 0;
    const sQty = parseFloat(summary.qty || 0) || 0;
    const sAvg = parseFloat(summary.avgPrice || 0) || 0;
    const currPrice = parseFloat(summary.currPrice || targetRes?.currPrice || 0) || 0;

    if (targetRes?.inv && currPrice > 0) {
      return targetRes.inv.reduce((sum, h) => {
        const buyPrice = parseFloat(h.buy_price || h.buyPrice || 0) || 0;
        const qty = parseFloat(h.qty || 0) || 0;
        return sum + ((currPrice - buyPrice) * qty);
      }, 0);
    }

    if (sEval > 0 && sQty > 0 && sAvg > 0) return sEval - (sQty * sAvg);
    return null;
  };

  let displayTotalProfit = displayTotal - displayPrincipal;
  let displayEvalProfit = (displayEval > 0 && displayQty > 0 && displayAvgPrice > 0) ? (displayEval - (displayQty * displayAvgPrice)) : calcEvalProfit(res);
  if (slotNum === 'Combined') {
    displayEvalProfit = 0;
    let hasHoldingsProfit = false;
    for (let i = 1; i <= MAX_SLOTS; i++) {
      if (!isSlotActive(i)) continue;
      const p = calcEvalProfit(getBestResult(lastBTResults[i], i));
      if (p !== null) {
        displayEvalProfit += p;
        hasHoldingsProfit = true;
      }
    }
    if (!hasHoldingsProfit) displayEvalProfit = null;
  }
  if (displayEvalProfit === null) displayEvalProfit = 0;
  
  return {
    date: sheetDate,
    totalAssets: displayTotal,
    base: displayBase,
    cash: displayCash,
    evalVal: displayEval,
    realPrincipal: displayPrincipal,
    qty: displayQty,
    currentMdd: displayCurrentMdd,
    mdd: displayMdd,
    yield: displayYield,
    evalReturn: displayEvalReturn,
    evalProfit: displayEvalProfit,
    totalProfit: displayTotalProfit,
    depletion: displayDepletion,
    avgPrice: displayAvgPrice,
    cagr: displayCagr,
    calmar: displayCalmar
  };
}

function renderRealtimeStatusTable(table) {
  const rows = [];
  let activeCount = 0;
  const slotRows = [];

  for (let i = 1; i <= MAX_SLOTS; i++) {
    if (isSlotActive(i)) {
      activeCount++;
      slotRows.push({
        res: getBestResult(lastBTResults[i], i),
        name: getSlotConfig(i)?.basics?.strategy ? `${getSlotConfig(i).basics.strategy}` : `투자법 ${i}`,
        color: SLOT_COLORS[(i - 1) % SLOT_COLORS.length],
        slotNum: i
      });
    }
  }

  if (activeCount >= 2) {
    const comb = calculateCombinedSummary();
    rows.push({ res: { summary: comb, isSynced: true }, name: '통합 합산', color: 'var(--secondary)', slotNum: 'Combined' });
  } else if (activeCount === 0 && window.cachedCombinedStats) {
    rows.push({ res: { summary: window.cachedCombinedStats, isSynced: true }, name: '통합 합산', color: 'var(--secondary-muted, #94a3b8)', slotNum: 'Combined' });
  }

  slotRows.forEach(sr => rows.push(sr));

  if (rows.length === 0) {
    table.innerHTML = '<tr><td style="text-align:center; padding:20px; color:#94a3b8;">데이터가 없습니다.</td></tr>';
    return;
  }

  // ⭐️ getDisplayStatusData는 전역 함수로 분리됨 (위 선언 참조)

  const getLatestPeriodMetricRow = (slotNum, kind) => {
    let rows = [];
    if (slotNum === 'Combined') {
      rows = kind === 'year' ? globalCombinedYearlyData : (kind === 'month' ? globalCombinedMonthlyData : globalCombinedDailyData);
    } else {
      rows = kind === 'year' ? globalYearlyDataArr[slotNum] : (kind === 'month' ? globalMonthlyDataArr[slotNum] : globalDailyDataArr[slotNum]);
    }
    if (!Array.isArray(rows) || rows.length === 0) return null;
    return [...rows].filter(row => row && row.period).sort((a, b) => String(b.period).localeCompare(String(a.period)))[0] || null;
  };

  const fmtPeriodProfit = (row) => {
    if (!row) return '-';
    const profit = Number(row.profit || 0);
    const rate = Number(row.rate || 0);
    const sign = profit < 0 ? '-' : '';
    const money = isCurrencyKRW
      ? sign + Math.round(Math.abs(profit) * currentFXRate / 10000).toLocaleString() + '만'
      : sign + '$' + Math.round(Math.abs(profit)).toLocaleString();
    const pct = (rate * 100).toFixed(1) + '%';
    const display = `${money}<span class="stats-profit-rate">(${pct})</span>`;
    const cls = profit > 0 ? 'val-plus' : (profit < 0 ? 'val-minus' : '');
    return cls ? `<span class="${cls}">${display}</span>` : display;
  };

  const fmtValueNew = (data, m, rowMeta) => {
    const fx = isCurrencyKRW ? currentFXRate : 1450;
    if (m.type === 'slotProfit') {
      if (rowMeta?.slotNum === 'Combined' || rowMeta?.slotNum === m.slotNum) {
        const targetRes = getBestResult(lastBTResults[m.slotNum], m.slotNum);
        const targetData = getDisplayStatusData(targetRes, m.slotNum);
        if (!targetData) return '-';
        const profit = Number(targetData.totalProfit || 0);
        const sign = profit < 0 ? '-' : '';
        const money = isCurrencyKRW
          ? sign + Math.round(Math.abs(profit) * fx / 10000).toLocaleString() + '만'
          : sign + '$' + Math.round(Math.abs(profit)).toLocaleString();
        const display = `${money}`;
        const cls = profit > 0 ? 'val-plus' : (profit < 0 ? 'val-minus' : '');
        return cls ? `<span class="${cls}">${display}</span>` : display;
      }
      return '-';
    }

    if (!data) return '-';
    if (m.type === 'period') {
      return fmtPeriodProfit(getLatestPeriodMetricRow(rowMeta?.slotNum, m.kind));
    }
    let v = data[m.key];
    if (v === undefined || v === null) return '-';
    
    if (m.key === 'date') return v;
    
    if (m.type === 'fmt') {
      const formattedValue = isCurrencyKRW
        ? Math.round(Number(v) * fx / 10000).toLocaleString() + '만'
        : '$' + Math.round(Number(v)).toLocaleString();
      if (m.key === 'evalVal') {
        const depletion = Number(data.depletion || 0);
        const progressText = (Math.abs(depletion) * 100).toFixed(1) + '%';
        return `<span class="stats-profit-value">${formattedValue}<span class="stats-profit-rate">(${progressText})</span></span>`;
      }
      return formattedValue;
    }
    if (m.type === 'color') {
      let num = Number(v);
      if (m.pct) {
        let str = (Math.abs(num) * 100).toFixed(1) + '%';
        return num > 0 ? `<span class="val-plus">${str}</span>` : (num < 0 ? `<span class="val-minus">-${str}</span>` : `<span>${str}</span>`);
      } else {
        let str = isCurrencyKRW ? Math.round(Math.abs(num) * fx / 10000).toLocaleString() + '만' : '$' + Math.round(Math.abs(num)).toLocaleString();
        return num > 0 ? `<span class="val-plus">${str}</span>` : (num < 0 ? `<span class="val-minus">-${str}</span>` : `<span>${str}</span>`);
      }
    }
    if (m.type === 'profitWithRate') {
      const profit = Number(v);
      const rate = Number(data[m.rateKey] || 0);
      const sign = profit < 0 ? '-' : '';
      const money = isCurrencyKRW
        ? sign + Math.round(Math.abs(profit) * fx / 10000).toLocaleString() + '만'
        : sign + '$' + Math.round(Math.abs(profit)).toLocaleString();
      const pct = Math.round(rate * 100).toLocaleString() + '%';
      const display = `${money}<span class="stats-profit-rate">(${pct})</span>`;
      const cls = profit > 0 ? 'val-plus' : (profit < 0 ? 'val-minus' : '');
      return cls ? `<span class="${cls}">${display}</span>` : display;
    }
    if (m.type === 'price') {
      return '$' + Number(v).toFixed(2);
    }
    if (m.type === 'raw') {
      if (m.key === 'calmar') return Number(v).toFixed(2);
      return v + (m.suffix || '');
    }
    return v;
  };

  const baseMetricsList = [
    { key: 'date', label: '날짜', type: 'raw' },
    { key: 'totalAssets', label: '총자산', type: 'fmt' },
    { key: 'totalProfit', label: '총 수익<span class="stats-profit-rate">(수익률)</span>', type: 'profitWithRate', rateKey: 'yield' },
    { key: 'yearProfit', label: '년 수익<span class="stats-profit-rate">(수익률)</span>', type: 'period', kind: 'year' },
    { key: 'monthProfit', label: '월 수익<span class="stats-profit-rate">(수익률)</span>', type: 'period', kind: 'month' },
    { key: 'dayProfit', label: '일 수익<span class="stats-profit-rate">(수익률)</span>', type: 'period', kind: 'day' },
    { key: 'evalProfit', label: '평가수익<span class="stats-profit-rate">(수익률)</span>', type: 'profitWithRate', rateKey: 'evalReturn' },
    { key: 'qty', label: '주식수', type: 'raw', suffix: '주' },
    { key: 'evalVal', label: '평가금<span class="stats-label-note">(진행)</span>', type: 'fmt' },
    { key: 'avgPrice', label: '평균단가', type: 'price' },
    { key: 'currentMdd', label: '현재 MDD', type: 'color', pct: true },
    { key: 'mdd', label: '전체 MDD', type: 'color', pct: true },
    { key: 'cagr', label: 'CAGR', type: 'color', pct: true },
    { key: 'calmar', label: '칼마비율', type: 'raw' },
    { key: 'realPrincipal', label: '원금', type: 'fmt' },
    { key: 'base', label: '갱신금', type: 'fmt' },
    { key: 'cash', label: '예수금', type: 'fmt' }
  ];

  const metricsList = [...baseMetricsList];

  const labelColStyle = `font-size:var(--app-font-size, 10.5px); font-weight:600; letter-spacing:-0.2px; line-height:1; width:72px; min-width:72px; max-width:72px; flex-shrink:0; color:var(--text-muted); display:flex; align-items:center; justify-content:flex-start; text-align:left; padding-left:2px;`;
  const sumWeights = 0.8 * rows.length + 0.4;
  const colWidth2 = `calc((100% - 72px) * 1.2 / ${sumWeights})`;
  const colWidthOthers = `calc((100% - 72px) * 0.8 / ${sumWeights})`;
  const dataColBaseStyle = `font-size:var(--app-font-size, 10.5px); letter-spacing:-0.2px; display:flex; align-items:center; justify-content:center; text-align:center; line-height:1; white-space:nowrap;`;

  let html = '<div style="display:flex; flex-direction:column; width:100%; gap:1px; padding:2px; box-sizing:border-box;">';
  
  // 첫 번째 헤더 행: 구분 | 통합 합산 | #1 투자법...
  html += '<div style="display:flex; align-items:center; gap:1px; padding:2px 3px; box-sizing:border-box; line-height:1; height:18px; border-bottom:1px solid rgba(255,255,255,0.1); width:100%;">';
  html += `<div style="${labelColStyle}">구분</div>`;
  rows.forEach((r, idx) => {
    const colWidth = (idx === 0) ? colWidth2 : colWidthOthers;
    html += `<div style="width:${colWidth}; min-width:60px; ${dataColBaseStyle} font-weight:600; color:${r.color};">${formatStrategyNameWithSmallParentheses(r.name)}</div>`;
  });
  html += '</div>';

  // 각 지표 행 생성
  metricsList.forEach(m => {
    html += `<div class="stats-row" style="display:flex; align-items:center; gap:1px; border-radius:3px; padding:2px 3px; box-sizing:border-box; line-height:1; min-height:18px; width:100%;">`;
    html += `<div style="${labelColStyle}">${m.label}</div>`;
    rows.forEach((r, idx) => {
      const colWidth = (idx === 0) ? colWidth2 : colWidthOthers;
      const data = getDisplayStatusData(r.res, r.slotNum);
      const cellVal = fmtValueNew(data, m, r);
      const isProfitValue = ['totalProfit', 'yearProfit', 'monthProfit', 'dayProfit', 'evalProfit'].includes(m.key);
      const profitClass = isProfitValue ? ' stats-profit-value' : '';
      const fontWeight = isProfitValue ? '500' : '400';
      html += `<div class="${profitClass.trim()}" style="width:${colWidth}; min-width:60px; ${dataColBaseStyle} font-weight:${fontWeight};">${cellVal}</div>`;
    });
    html += '</div>';
  });

  html += '</div>';
  table.innerHTML = html;
  if (statsDisplayMode === 'chart') {
    setTimeout(() => { updateStatsPieChart(); }, 50);
  }
}

function renderMetrics(s, days, slotNum) { refreshStatsTable(); }

function setupDragScrollX(elementId) {
  const el = document.getElementById(elementId);
  if (!el || el.dataset.dragScrollReady === "1") return;
  el.dataset.dragScrollReady = "1";
  let dragging = false;
  let startX = 0;
  let startLeft = 0;

  el.addEventListener('pointerdown', (e) => {
    if (el.scrollWidth <= el.clientWidth + 5) return;
    dragging = true;
    startX = e.clientX;
    startLeft = el.scrollLeft;
    el.classList.add('grabbing');
    el.setPointerCapture?.(e.pointerId);
  });
  el.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    e.preventDefault();
    el.scrollLeft = startLeft - (e.clientX - startX);
  });
  const stop = (e) => {
    dragging = false;
    el.classList.remove('grabbing');
    try { el.releasePointerCapture?.(e.pointerId); } catch (_) { }
  };
  el.addEventListener('pointerup', stop);
  el.addEventListener('pointercancel', stop);
  el.addEventListener('pointerleave', stop);
}



window.addEventListener('DOMContentLoaded', () => {
  const setupSwipe = (elementId, callback) => {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.style.touchAction = 'pan-y'; el.style.userSelect = 'none';
    const mc = new Hammer.Manager(el, { touchAction: 'pan-y', recognizers: [[Hammer.Pan, { direction: Hammer.DIRECTION_HORIZONTAL, threshold: 5 }]] });
    let activeScrollTarget = null; let initialScrollLeft = 0;
    mc.on('panstart', (ev) => {
      let target = ev.srcEvent?.target; activeScrollTarget = null;
      while (target && target !== el) {
        if (target.scrollWidth > target.clientWidth + 5) {
          const style = window.getComputedStyle(target);
          if (style.overflowX === 'auto' || style.overflowX === 'scroll' || style.overflow === 'auto' || style.overflow === 'scroll') {
            activeScrollTarget = target; initialScrollLeft = target.scrollLeft; break;
          }
        }
        target = target.parentElement;
      }
    });
    mc.on('panmove', (ev) => { if (activeScrollTarget) activeScrollTarget.scrollLeft = initialScrollLeft - ev.deltaX; });
    mc.on('panend', (ev) => {
      const absX = Math.abs(ev.deltaX); const absY = Math.abs(ev.deltaY);
      
      // ⭐️ 가로 스크롤 요소가 있더라도, 스크롤 끝단에 도달했다면 스와이프를 허용합니다.
      let isScrollAtEnd = false;
      if (activeScrollTarget) {
        const sl = activeScrollTarget.scrollLeft;
        const maxSl = activeScrollTarget.scrollWidth - activeScrollTarget.clientWidth;
        if (ev.deltaX > 0 && sl <= 2) {
          isScrollAtEnd = true; // 오른쪽으로 쓸어 넘기기 (이전 화면)
        } else if (ev.deltaX < 0 && sl >= maxSl - 2) {
          isScrollAtEnd = true; // 왼쪽으로 쓸어 넘기기 (다음 화면)
        }
      }

      if (activeScrollTarget && !isScrollAtEnd) return;
      if (absX > absY && absX > 30) { callback(ev.deltaX < 0 ? 'left' : 'right'); if (navigator.vibrate) navigator.vibrate(8); }
    });
  };

  const orderTitle = document.getElementById('orderTitle');
  if (orderTitle) {
    orderTitle.removeAttribute('onclick');
    const handleTitleClick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      toggleOrderView();
    };
    orderTitle.addEventListener('click', handleTitleClick);
    orderTitle.addEventListener('touchend', handleTitleClick);
  }

  setupSwipe('orderHeader', (dir) => toggleOrderView(dir));
  setupDragScrollX('dualOrderContainer');
  setupSwipe('monthlyHeader', () => togglePeriodView());

  // ⭐️ 안전한 순환 로직: 무한루프 방지 및 비어있는 슬롯 자동 건너뛰기
  setupSwipe('panelChart', (dir) => {
    let activeCount = 0;
    for (let i = 1; i <= MAX_SLOTS; i++) if (isSlotActive(i)) activeCount++;
    if (activeCount === 0) return;

    if (dir === 'left') {
      do {
        chartViewMode = (chartViewMode + 1) % (MAX_SLOTS + 2);
      } while (chartViewMode >= 2 && chartViewMode <= MAX_SLOTS + 1 && !isSlotActive(chartViewMode - 1));
    } else {
      do {
        chartViewMode = (chartViewMode - 1 + (MAX_SLOTS + 2)) % (MAX_SLOTS + 2);
      } while (chartViewMode >= 2 && chartViewMode <= MAX_SLOTS + 1 && !isSlotActive(chartViewMode - 1));
    }
    try { localStorage.setItem(`vtotal_chart_view_mode_${myUserId}`, chartViewMode); } catch (e) { }
    renderChartAll();
  });

  
  // 📈 주가 정보 화면 전용 다이렉트 touch/mouse 스와이프 리스너 (내부 스크롤 충돌 우회)
  const setupPriceInfoSwipeDirect = () => {
    const panel = document.getElementById('panelPriceInfo');
    if (!panel) return;

    let startX = 0;
    let startY = 0;
    let isDragging = false;

    panel.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });

    panel.addEventListener('touchend', (e) => {
      if (e.changedTouches.length === 0) return;
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      handleSwipe(startX, startY, endX, endY);
    }, { passive: true });

    panel.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'SELECT' || e.target.tagName === 'OPTION') return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
    });

    panel.addEventListener('mouseup', (e) => {
      if (!isDragging) return;
      isDragging = false;
      const endX = e.clientX;
      const endY = e.clientY;
      handleSwipe(startX, startY, endX, endY);
    });

    panel.addEventListener('mouseleave', () => {
      isDragging = false;
    });

    function handleSwipe(sX, sY, eX, eY) {
      const diffX = eX - sX;
      const diffY = eY - sY;
      
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
        const tickers = ['SOXL', 'TQQQ', 'QQQ', 'SOXX'];
        const currentTicker = window.priceInfoTicker || 'SOXL';
        let currentIndex = tickers.indexOf(currentTicker);
        if (currentIndex === -1) currentIndex = 0;

        if (diffX > 0) {
          let nextIndex = currentIndex - 1;
          if (nextIndex < 0) nextIndex = tickers.length - 1;
          changePriceInfoTicker(tickers[nextIndex]);
        } else {
          let nextIndex = currentIndex + 1;
          if (nextIndex >= tickers.length) nextIndex = 0;
          changePriceInfoTicker(tickers[nextIndex]);
        }
      }
    }
  };

  setupPriceInfoSwipeDirect();
});

function setBtnLoading(btnId, loadingText) {
  const btn = document.getElementById(btnId);
  if (!btn) return () => { };
  const orgHtml = btn.innerHTML;
  btn.innerHTML = loadingText;
  btn.disabled = true;
  return () => { btn.innerHTML = orgHtml; btn.disabled = false; };
}

function showToast(msg, icon = "🔔") {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>${icon}</span> ${msg}`;
  container.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 2500);
}

function triggerIconAnim(iconId) {
  const icon = document.getElementById(iconId);
  if (icon) { icon.classList.remove('icon-rotate'); void icon.offsetWidth; icon.classList.add('icon-rotate'); }
}

function handleDeposit() {
  const activeSlotName = slotConfigs[activeSettingsTab]?.basics?.strategy || `V-QUANT 2-${activeSettingsTab}`;
  let amountStr = prompt(`[${activeSlotName}] 얼마를 증액(입금)하시겠습니까?\n(달러 단위로 숫자만 입력하세요)`);
  if (!amountStr) return;
  let amount = parseFloat(amountStr.replace(/[^0-9.-]/g, ''));
  if (isNaN(amount) || amount === 0) return alert("올바른 금액을 입력하세요.");
  const isReduction = amount < 0;
  const actionName = isReduction ? "감액(출금)" : "증액(입금)";
  const absAmount = Math.abs(amount);
  const confirmMsg = `[${activeSlotName}]에서 $${absAmount.toLocaleString()}를 정말 ${actionName}하시겠습니까?\n\n※ 과거 수익률은 안전하게 보존되며, 예수금과 갱신금(원금)이 즉시 ${isReduction ? '감소' : '증가'}합니다.`;
  if (!confirm(confirmMsg)) return;
  const btn = document.getElementById('btnSaveTop');
  const orgText = btn ? btn.innerHTML : "";
  if (btn) btn.innerHTML = "⏳ 처리 중...";
  setLED('loading');
  fetch(GAS_URL, {
    method: 'POST', mode: 'no-cors',
    body: JSON.stringify({ action: "ADD_FUNDS", id: myUserId, slot: activeSettingsTab, amount: amount })
  }).then(async () => { // ⭐️ async 추가
    showToast(`$${amount.toLocaleString()} 처리 완료! 데이터를 다시 불러옵니다.`, "💰");
    if (btn) btn.innerHTML = orgText;
    await checkAndSyncWithServer(false, true); // 시트 데이터 강제 다시 불러오기
  }).catch(e => {
    alert("처리 실패: 네트워크를 확인하세요.");
    setLED('error');
    if (btn) btn.innerHTML = orgText;
  });
}

function scheduleNextAutoSave() {
  const now = new Date();
  const nyFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false
  });
  const parts = nyFormatter.formatToParts(now);
  const nyDate = {};
  parts.forEach(p => nyDate[p.type] = p.value);
  let targetNY = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  targetNY.setHours(17, 5, 0, 0);
  if (now.getTime() >= targetNY.getTime()) targetNY.setDate(targetNY.getDate() + 1);
  const delay = targetNY.getTime() - now.getTime();
  console.log(`[스케줄러] 다음 데이터 자동 백업 대기 중...`);
  setTimeout(() => {
    checkAndRunAutoSave();
    scheduleNextAutoSave();
  }, delay);
}

window.addEventListener('load', () => {
  setupCashAutoFill();
  scheduleNextAutoSave();
});

// 앱이 백그라운드에서 다시 활성화될 때 자동 갱신 확인
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    if (typeof shouldAutoRefresh === 'function' && shouldAutoRefresh()) {
      handleInstantOrder();
    }
  }
});

function renderDBTradeHistory() {
  console.log("[매매내역] 렌더링 시작...");
  const tbody = document.getElementById('historyTableBody');
  if (!tbody) {
    console.warn("[매매내역] historyTableBody 요소를 찾을 수 없습니다.");
    return;
  }

 try {
    let allTrades = [];
    for (let i = 1; i <= MAX_SLOTS; i++) {
      if (isSlotActive(i)) {
        const res = lastBTResults[i];
        if (res) {
          let trades = Array.isArray(res.trades) ? res.trades : [];
          if (res.isSynced && res.dailyStates && res.dailyStates.length > 0) {
            const reconstructedTrades = reconstructRealTrades(buildTradeLogsFromDailyStates(res.dailyStates), i);
            if (reconstructedTrades.length >= trades.length) {
              trades = reconstructedTrades;
              res.trades = reconstructedTrades;
            }
          }
          console.log(`[매매내역] 슬롯 #${i} 거래 데이터 수:`, trades.length);
          
         // 💡 [최종 핵심 수정] 존재하지 않는 변수 대신, 엔진 결과(res) 안에 이미 
          // 안전하게 저장되어 있는 '현재가(currPrice)'를 직접 꺼내어 덮어씌웁니다!
          const slotTrades = trades.map(t => {
            // 기존 매도가(sellPrice 또는 sell_price) 확인
            let finalPrice = parseFloat(t.sellPrice || t.sell_price) || 0;
            
            // 매도가가 비정상(0 또는 null)일 경우 방어 로직 발동
            if (finalPrice <= 0) {
              // res 객체의 summary 안에 들어있는 정확한 현재가(예: 272.5)를 추출합니다.
              const currentPrice = parseFloat(res.summary?.currPrice || res.currPrice) || 0;
              if (currentPrice > 0) {
                finalPrice = currentPrice;
              }
            }

            return {
              ...t,
              slotNum: i,
              sellPrice: finalPrice,   // 보정된 가격 강제 주입
              sell_price: finalPrice   // 어떤 변수명을 쓰더라도 정상 작동하도록 둘 다 세팅
            };
          });
          
          allTrades = allTrades.concat(slotTrades);
        } else {
          console.log(`[매매내역] 슬롯 #${i} 결과 없음 또는 trades 속성 없음`);
        }
      }
    }

    if (allTrades.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:#64748b;">매매 내역이 없습니다</td></tr>`;
      return;
    }

    // ⭐️ 1차 정렬: 청산일(sellDate) 기준 내림차순, 2차 정렬: 진입일(buyDate) 기준 내림차순 (최신순 정렬)
    allTrades.sort((a, b) => {
      const sellA = String(a.sellDate || a.sell_date || "");
      const sellB = String(b.sellDate || b.sell_date || "");
      if (sellA !== sellB) {
        return sellB.localeCompare(sellA);
      }
      const buyA = String(a.buyDate || a.buy_date || "");
      const buyB = String(b.buyDate || b.buy_date || "");
      return buyB.localeCompare(buyA);
    });

    const modeMap = { 'Middle': 'Mid1', 'Middle2': 'Mid2', 'Middle3': 'Mid3', 'SF': 'SF', 'AG': 'AG' };

    tbody.innerHTML = allTrades.map(t => {
      const slot = t.slotNum;
      let buyDate = parseDateStr(t.buyDate || t.buy_date || "-");
      let sellDate = parseDateStr(t.sellDate || t.sell_date || "-");

      if (buyDate && buyDate.includes('-') && buyDate.length === 10) {
        buyDate = buyDate.substring(2);
      }
      if (sellDate && sellDate.includes('-') && sellDate.length === 10) {
        sellDate = sellDate.substring(2);
      }

      const mode = modeMap[t.mode] || t.mode || "-";
      const tier = t.tier || "-";
      const buyPrice = Number(t.buy_price !== undefined ? t.buy_price : (t.buyPrice || 0));
      const sellPrice = Number(t.sell_price !== undefined ? t.sell_price : (t.sellPrice || 0));
      const qty = t.qty || 0;
      const profit = Number(t.profit !== undefined ? t.profit : 0);

      const profitClass = profit > 0 ? "profit-plus" : (profit < 0 ? "profit-minus" : "");
      const sign = profit < 0 ? "-" : "";
      let profitStr = "";
      if (isCurrencyKRW) {
        profitStr = sign + "₩" + Math.round(profit * currentFXRate).toLocaleString();
      } else {
        profitStr = sign + "$" + Math.abs(profit).toLocaleString(undefined, {minimumFractionDigits: 2});
      }

      let buyPriceStr = "";
      let sellPriceStr = "";
      if (isCurrencyKRW) {
        buyPriceStr = "₩" + Math.round(buyPrice * currentFXRate).toLocaleString();
        sellPriceStr = "₩" + Math.round(sellPrice * currentFXRate).toLocaleString();
      } else {
        buyPriceStr = "$" + buyPrice.toLocaleString(undefined, {minimumFractionDigits: 2});
        sellPriceStr = "$" + sellPrice.toLocaleString(undefined, {minimumFractionDigits: 2});
      }

      return `<tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.03);">
        <td style="width:12%; padding:2px 1px; text-align:center; color:${SLOT_COLORS[(slot-1)%SLOT_COLORS.length]}; font-weight:700; font-size:10px;">#${slot}</td>
        <td style="width:14%; padding:2px 1px; text-align:center; font-size:10px;">${buyDate}</td>
        <td class="sell-price" style="width:14%; padding:2px 1px; text-align:center; font-size:10px;">${sellDate}</td>
        <td style="width:12%; padding:2px 1px; text-align:center; font-size:10px;">${mode}/T${tier}</td>
        <td style="width:12%; padding:2px 1px; text-align:center; font-size:10px;">${buyPriceStr}</td>
        <td class="sell-price" style="width:12%; padding:2px 1px; text-align:center; font-size:10px;">${sellPriceStr}</td>
        <td style="width:12%; padding:2px 1px; text-align:center; font-size:10px;">${qty}</td>
        <td style="width:12%; padding:2px 1px; text-align:center; font-size:10px;" class="${profitClass}">${profitStr}</td>
      </tr>`;
    }).join('');
    applyPrimaryDateHighlight();
    console.log("[매매내역] 렌더링 완료. 총 거래 건수:", allTrades.length);
  } catch (e) {
    console.error("[매매내역] 렌더링 중 런타임 오류 발생:", e);
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:var(--danger);">매매 내역 로딩 중 오류가 발생했습니다. (콘솔 확인 요망)</td></tr>`;
  }
}

// ⭐️ [신규] holdings 상태 변화를 역추적하여 실제 체결된 실전 매매(청산) 내역을 복원해주는 알고리즘
function buildTradeLogsFromDailyStates(dailyStates) {
  return (dailyStates || []).map(state => [
    state.date,
    state.asset,
    state.inout || 0,
    state.json
  ]);
}

function reconstructRealTrades(logs, slotNum) {
  if (!logs || logs.length === 0) return [];
  
  const sortedLogs = logs.map(r => {
    let dt = parseDateStr(r[0]);
    let jsonStr = r[3] || "{}";
    let parsed = {};
    try { parsed = JSON.parse(jsonStr); } catch(e) {}
    return { date: dt, holdings: parsed.holdings || [] };
  }).filter(l => l.date).sort((a, b) => a.date.localeCompare(b.date));

  const reconstructed = [];
  
  const getBuyDate = (item) => item.buyDate || item.buy_date || "";
  const getMode = (item) => String(item.mode || "").trim();
  const getTier = (item) => String(item.tier || "").trim();
  
  for (let i = 0; i < sortedLogs.length - 1; i++) {
    const curLog = sortedLogs[i];
    const nextLog = sortedLogs[i+1];
    
    const curHoldings = curLog.holdings;
    const nextHoldings = nextLog.holdings;
    
    const curMap = {};
    curHoldings.forEach(item => {
      const k = `${getBuyDate(item)}_${getMode(item)}_${getTier(item)}`;
      if (!curMap[k]) {
        curMap[k] = {
          buyDate: getBuyDate(item),
          mode: item.mode,
          tier: item.tier,
          qty: 0,
          buy_price: parseFloat(item.buy_price || item.buyPrice || 0)
        };
      }
      curMap[k].qty += parseFloat(item.qty || 0);
    });

    const nextMap = {};
    nextHoldings.forEach(item => {
      const k = `${getBuyDate(item)}_${getMode(item)}_${getTier(item)}`;
      if (!nextMap[k]) {
        nextMap[k] = { qty: 0 };
      }
      nextMap[k].qty += parseFloat(item.qty || 0);
    });

    Object.keys(curMap).forEach(k => {
      const curItem = curMap[k];
      const nextItem = nextMap[k];
      
      const curQty = curItem.qty;
      const nextQty = nextItem ? nextItem.qty : 0;
      
      const soldQty = curQty - nextQty;
      
      if (soldQty > 0 && !isNaN(soldQty)) {
        const buyDate = curItem.buyDate || curLog.date;
        const sellDate = nextLog.date;
        
        let buyPrice = Number(getClosePriceOnDate(buyDate, slotNum) || curItem.buy_price || 0);
        let sellPrice = Number(getClosePriceOnDate(sellDate, slotNum) || 0);
        
        if (buyPrice === 0 || isNaN(buyPrice)) buyPrice = Number(curItem.buy_price || 0);
        if (sellPrice === 0 || isNaN(sellPrice)) {
          try {
            const stratName = slotConfigs[slotNum]?.basics?.strategy || "";
            const modeData = MASTER_STRATEGIES[stratName]?.modes[curItem.mode];
            if (modeData) {
              const sellPct = modeData.sell[curItem.tier - 1] || modeData.sell[0];
              sellPrice = Math.ceil((buyPrice * (1 + sellPct) * 100) - 0.000001) / 100;
            } else {
              sellPrice = buyPrice;
            }
          } catch(e) {
            sellPrice = buyPrice;
          }
        }
        
        const cfg = slotConfigs[slotNum];
        const fBuy = (cfg && cfg.basics) ? (parseFloat(cfg.basics.fBase) || 0) / 100 : 0.0008;
        const fSec = (cfg && cfg.basics) ? (parseFloat(cfg.basics.fSec) || 0) / 100 : 0.0000278;
        
        const safeFBuy = isNaN(fBuy) ? 0.0008 : fBuy;
        const safeFSec = isNaN(fSec) ? 0.0000278 : fSec;
        const safeFSell = safeFBuy + safeFSec;
        
        const buyCost = soldQty * buyPrice * (1 + safeFBuy);
        const sellNet = soldQty * sellPrice * (1 - safeFSell);
        let profit = sellNet - buyCost;
        if (isNaN(profit)) profit = 0;
        
        reconstructed.push({
          slotNum: slotNum,
          buyDate: buyDate,
          sellDate: sellDate,
          mode: curItem.mode,
          tier: curItem.tier,
          buyPrice: buyPrice,
          sellPrice: sellPrice,
          qty: soldQty,
          profit: profit
        });
      }
    });
  }
  
  return reconstructed;
}

function getClosePriceOnDate(dateStr, slotNum) {
  const mainData = (window.globalMainDataSlot && window.globalMainDataSlot[slotNum]) || window.globalMainData;
  if (!mainData || !mainData.dates) return null;
  const targetDate = parseDateStr(dateStr);
  
  let idx = mainData.dates.findIndex(d => parseDateStr(formatDateNY(d)) === targetDate);
  if (idx !== -1) {
    return mainData.close[idx];
  }
  
  let bestIdx = -1;
  for (let i = 0; i < mainData.dates.length; i++) {
    const dStr = parseDateStr(formatDateNY(mainData.dates[i]));
    if (dStr <= targetDate) {
      bestIdx = i;
    } else {
      break;
    }
  }
  if (bestIdx !== -1) {
    return mainData.close[bestIdx];
  }
  return null;
}

// ⭐️ [신규] 날짜 포맷 변환 및 파싱 전용 전역 함수 (모바일 기기 크래시 방지 및 전역 스코프 확보)
function parseDateStr(ds) {
  if (!ds) return formatDateNY(new Date());
  let str = String(ds).trim().replace(/\([가-힣a-zA-Z]\)/g, "").trim();
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
}

// 실시간 운영현황 토글 (표 <-> 차트)
function toggleStatsDisplayMode() {
  const grid = document.getElementById('mainGrid');
  if (grid && grid.classList.contains('perf-tab-layout')) {
    perfStatsMode = perfStatsMode === 'performance' ? 'realtime' : 'performance';
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
        renderRealtimeStatusTable(table);
      } else {
        renderOriginalStatsTable(table);
      }
    }
    return;
  }
  if (grid && grid.classList.contains('backtest-view-layout')) {
    backtestStatsMode = backtestStatsMode === 'performance' ? 'realtime' : (backtestStatsMode === 'realtime' ? 'asset' : 'performance');
    refreshStatsTable();
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
window.toggleStatsDisplayMode = toggleStatsDisplayMode;

// 🏆 전역 헬퍼 함수: 특정 슬롯의 가장 최신 주기별 성과 데이터 추출
function getSlotLatestPeriodRow(slotNum, kind) {
  const rows = kind === 'year' ? globalYearlyDataArr[slotNum] : (kind === 'month' ? globalMonthlyDataArr[slotNum] : globalDailyDataArr[slotNum]);
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return [...rows].filter(row => row && row.period).sort((a, b) => String(b.period).localeCompare(String(a.period)))[0] || null;
}

// 🏆 백테스트 투자법별 총수익률/년수익률/월수익률 랭킹 모달 생성 및 노출 함수
function showRankingModal() {
  try {
    const overlay = document.getElementById('rankingOverlay');
    const contentEl = document.getElementById('rankingModalContent');
    if (!overlay || !contentEl) return;

    const list = [];
    for (let i = 1; i <= MAX_SLOTS; i++) {
      if (isSlotActive(i)) {
        const res = getBestResult(lastBTResults[i], i);
        const displaySummary = res ? getDisplayStatusData(res, i) : null;
        if (!displaySummary) continue;

        const strategyName = getSlotConfig(i)?.basics?.strategy || `투자법 ${i}`;
        const slotColor = SLOT_COLORS[(i - 1) % SLOT_COLORS.length];

        // 1) 총수익률 계산
        const tAssets = displaySummary.totalAssets !== undefined ? displaySummary.totalAssets : (displaySummary.total_assets || 0);
        const rPrincipal = displaySummary.realPrincipal !== undefined ? displaySummary.realPrincipal : (displaySummary.base || displaySummary.base_principal || 0);
        const totalYield = rPrincipal > 0 ? (tAssets - rPrincipal) / rPrincipal : 0;

        // 2) 년수익률 계산
        const yRow = getSlotLatestPeriodRow(i, 'year');
        const yearlyRate = yRow ? Number(yRow.rate || 0) : null;

        // 3) 월수익률 계산
        const mRow = getSlotLatestPeriodRow(i, 'month');
        const monthlyRate = mRow ? Number(mRow.rate || 0) : null;

        // 4) MDD 데이터 수집 (총 MDD, 최근 년 MDD, 최근 월 MDD)
        const totalMdd = displaySummary.mdd !== undefined ? displaySummary.mdd : 0;
        const yearlyMdd = yRow ? Number(yRow.mdd || 0) : null;
        const monthlyMdd = mRow ? Number(mRow.mdd || 0) : null;

        // 5) 칼마비율 데이터 수집 (총 칼마, 년 칼마, 월 칼마)
        const totalCalmar = displaySummary.calmar !== undefined ? displaySummary.calmar : 0;
        const yearlyCalmar = (yRow && yRow.mdd && yRow.mdd !== 0) ? Math.abs(Number(yRow.rate || 0) / Number(yRow.mdd)) : null;
        const monthlyCalmar = (mRow && mRow.mdd && mRow.mdd !== 0) ? Math.abs(Number(mRow.rate || 0) / Number(mRow.mdd)) : null;

        list.push({
          slotNum: i,
          name: strategyName,
          color: slotColor,
          totalYield: totalYield,
          yearlyRate: yearlyRate,
          monthlyRate: monthlyRate,
          totalMdd: totalMdd,
          yearlyMdd: yearlyMdd,
          monthlyMdd: monthlyMdd,
          totalCalmar: totalCalmar,
          yearlyCalmar: yearlyCalmar,
          monthlyCalmar: monthlyCalmar
        });
      }
    }

    if (list.length === 0) {
      contentEl.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted);">백테스트가 실행된 활성 투자법이 없습니다.</div>`;
      overlay.style.display = 'flex';
      return;
    }

    // [정렬] 수익률 기준 내림차순 정렬
    const totalRank = [...list].sort((a, b) => b.totalYield - a.totalYield);
    const yearlyRank = [...list].sort((a, b) => {
      const rA = a.yearlyRate !== null ? a.yearlyRate : -Infinity;
      const rB = b.yearlyRate !== null ? b.yearlyRate : -Infinity;
      return rB - rA;
    });
    const monthlyRank = [...list].sort((a, b) => {
      const rA = a.monthlyRate !== null ? a.monthlyRate : -Infinity;
      const rB = b.monthlyRate !== null ? b.monthlyRate : -Infinity;
      return rB - rA;
    });

    // [정렬] MDD 기준 내림차순 정렬 (0%에 가까운, 즉 낙폭이 가장 작고 하락방어가 우수한 순서)
    const totalMddRank = [...list].sort((a, b) => {
      const vA = a.totalMdd !== null ? a.totalMdd : -Infinity;
      const vB = b.totalMdd !== null ? b.totalMdd : -Infinity;
      return vB - vA;
    });
    const yearlyMddRank = [...list].sort((a, b) => {
      const vA = a.yearlyMdd !== null ? a.yearlyMdd : -Infinity;
      const vB = b.yearlyMdd !== null ? b.yearlyMdd : -Infinity;
      return vB - vA;
    });
    const monthlyMddRank = [...list].sort((a, b) => {
      const vA = a.monthlyMdd !== null ? a.monthlyMdd : -Infinity;
      const vB = b.monthlyMdd !== null ? b.monthlyMdd : -Infinity;
      return vB - vA;
    });

    // [정렬] 칼마비율 기준 내림차순 정렬 (칼마비율이 높을수록 효율적인 투자법)
    const totalCalmarRank = [...list].sort((a, b) => {
      const vA = a.totalCalmar !== null ? a.totalCalmar : -Infinity;
      const vB = b.totalCalmar !== null ? b.totalCalmar : -Infinity;
      return vB - vA;
    });
    const yearlyCalmarRank = [...list].sort((a, b) => {
      const vA = a.yearlyCalmar !== null ? a.yearlyCalmar : -Infinity;
      const vB = b.yearlyCalmar !== null ? b.yearlyCalmar : -Infinity;
      return vB - vA;
    });
    const monthlyCalmarRank = [...list].sort((a, b) => {
      const vA = a.monthlyCalmar !== null ? a.monthlyCalmar : -Infinity;
      const vB = b.monthlyCalmar !== null ? b.monthlyCalmar : -Infinity;
      return vB - vA;
    });

    const getRankEmoji = (idx) => {
      if (idx === 0) return '🥇';
      if (idx === 1) return '🥈';
      if (idx === 2) return '🥉';
      return `<span style="opacity: 0.6; font-size: calc(var(--app-font-size, 10.5px) - 1.5px) !important;">${idx + 1}위</span>`;
    };

    const getRateText = (val, isBold = false) => {
      if (val === null || val === undefined || val === -Infinity) return `<span style="color:var(--text-muted);">-</span>`;
      const num = val * 100;
      const cls = num > 0 ? 'val-plus' : (num < 0 ? 'val-minus' : '');
      const prefix = num > 0 ? '+' : '';
      return `<span class="${cls}" style="font-weight: ${isBold ? '700' : '400'}; font-size: var(--app-font-size, 10.5px) !important;">${prefix}${num.toFixed(1)}%</span>`;
    };

    const getMddText = (val, isBold = false) => {
      if (val === null || val === undefined || val === -Infinity) return `<span style="color:var(--text-muted);">-</span>`;
      const num = val * 100;
      const cls = num < 0 ? 'val-minus' : '';
      return `<span class="${cls}" style="font-weight: ${isBold ? '700' : '400'}; font-size: var(--app-font-size, 10.5px) !important;">${num.toFixed(1)}%</span>`;
    };

    const getCalmarText = (val, isBold = false) => {
      if (val === null || val === undefined || val === -Infinity || isNaN(val)) return `<span style="color:var(--text-muted);">-</span>`;
      const cls = val > 1 ? 'val-plus' : (val < 0.5 ? 'val-minus' : '');
      return `<span class="${cls}" style="font-weight: ${isBold ? '700' : '400'}; font-size: var(--app-font-size, 10.5px) !important;">${val.toFixed(2)}</span>`;
    };

    const renderRankTable = (title, sortedList, key, showRank = false, valType = 'rate') => {
      const isLight = document.body.classList.contains('light-mode');
      const titleColor = isLight ? '#0f172a' : '#f8fafc';

      const flexStyle = showRank ? 'flex: 1.15 1 34%; min-width: 105px;' : 'flex: 0.92 1 28%; min-width: 90px;';
      const cardPadding = showRank ? '6px 6px 4.8px 6px' : '6px';
      const namePaddingRight = showRank ? '8px' : '4px';

      const defaultTextColor = isLight ? '#0f172a' : '#f8fafc';

      let rowsHtml = sortedList.map((item, idx) => {
        const val = item[key];
        const isBold = idx < 3;
        const fontWeightStyle = isBold ? '700' : '400';
        const nameColor = isBold ? item.color : defaultTextColor;

        const rankCol = showRank ? `
          <td style="padding: 4px 2px; text-align: center; font-weight: ${fontWeightStyle}; width: 22px; vertical-align: middle; font-size: var(--app-font-size, 10.5px) !important;">
            ${getRankEmoji(idx)}
          </td>
        ` : '';

        const displayValText = valType === 'calmar' ? getCalmarText(val, isBold) : (valType === 'mdd' ? getMddText(val, isBold) : getRateText(val, isBold));

        return `
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.03); height: 26px;">
            ${rankCol}
            <td style="padding: 4px ${namePaddingRight} 4px 4px; text-align: left; font-weight: ${fontWeightStyle}; color: ${nameColor}; font-size: var(--app-font-size, 10.5px) !important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; vertical-align: middle;" title="${item.name}">
              ${item.name}
            </td>
            <td style="padding: 4px 2px; text-align: right; font-size: var(--app-font-size, 10.5px) !important; font-weight: ${fontWeightStyle}; width: 55px; vertical-align: middle;">
              ${displayValText}
            </td>
          </tr>
        `;
      }).join('');

      return `
        <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: ${cardPadding}; box-sizing: border-box; ${flexStyle} max-width: 100%;">
          <h4 style="margin: 0 0 6px 0; font-size: calc(var(--app-font-size, 10.5px) + 0.5px) !important; font-weight: 700; color: ${titleColor}; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${title}</h4>
          <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      `;
    };

    let html = '';
    
    // 1행: 수익률 랭킹 영역
    html += '<div style="display:flex; flex-direction:row; flex-wrap:wrap; gap:4px; width:100%; justify-content:space-between; margin-bottom:3px;">';
    html += renderRankTable('📈 총수익률', totalRank, 'totalYield', true, 'rate');
    html += renderRankTable('📅 년수익률', yearlyRank, 'yearlyRate', false, 'rate');
    html += renderRankTable('🌙 월수익률', monthlyRank, 'monthlyRate', false, 'rate');
    html += '</div>';

    // 가로 구분선
    html += '<div style="width:100%; height:1px; background:rgba(255,255,255,0.08); margin:5px 0 5px 0; box-sizing:border-box;"></div>';

    // 2행: MDD 랭킹 영역
    html += '<div style="display:flex; flex-direction:row; flex-wrap:wrap; gap:4px; width:100%; justify-content:space-between; margin-bottom:3px;">';
    html += renderRankTable('📉 총 MDD', totalMddRank, 'totalMdd', true, 'mdd');
    html += renderRankTable('📅 년 MDD', yearlyMddRank, 'yearlyMdd', false, 'mdd');
    html += renderRankTable('🌙 월 MDD', monthlyMddRank, 'monthlyMdd', false, 'mdd');
    html += '</div>';

    // 가로 구분선
    html += '<div style="width:100%; height:1px; background:rgba(255,255,255,0.08); margin:5px 0 5px 0; box-sizing:border-box;"></div>';

    // 3행: 칼마비율 랭킹 영역
    html += '<div style="display:flex; flex-direction:row; flex-wrap:wrap; gap:4px; width:100%; justify-content:space-between;">';
    html += renderRankTable('⚖️ 총 칼마', totalCalmarRank, 'totalCalmar', true, 'calmar');
    html += renderRankTable('📅 년 칼마', yearlyCalmarRank, 'yearlyCalmar', false, 'calmar');
    html += renderRankTable('🌙 월 칼마', monthlyCalmarRank, 'monthlyCalmar', false, 'calmar');
    html += '</div>';

    contentEl.innerHTML = html;
    overlay.style.display = 'flex';
  } catch (e) {
    console.error("showRankingModal 실행 중 에러 발생:", e);
    showToast("랭킹 화면을 생성하는 중 에러가 발생했습니다.", "⚠️");
  }
}
window.showRankingModal = showRankingModal;

// 도넛 차트 업데이트 로직
window.updateStatsPieChart = function() {
  if (statsDisplayMode !== 'chart') return;
  const selector = document.getElementById('statsMetricSelector');
  if (!selector) return;

  const activeOptions = [{ value: 'combined', text: '통합' }];
  for (let i = 1; i <= MAX_SLOTS; i++) {
    if (isSlotActive(i)) {
      activeOptions.push({ value: String(i), text: getSlotConfig(i)?.basics?.strategy || `투자법 ${i}` });
    }
  }

  const previousValue = selector.value || 'combined';
  const nextHtml = activeOptions.map(opt => `<option value="${opt.value}">${opt.text}</option>`).join('');
  if (selector.innerHTML !== nextHtml) selector.innerHTML = nextHtml;
  selector.value = activeOptions.some(opt => opt.value === previousValue) ? previousValue : 'combined';

  const targetValue = selector.value || 'combined';
  let statusData = null;
  let targetLabel = '통합';

  if (targetValue === 'combined') {
    statusData = calculateCombinedSummary();
  } else {
    const slotNum = parseInt(targetValue, 10);
    statusData = getDisplayStatusData(getBestResult(lastBTResults[slotNum], slotNum), slotNum);
    targetLabel = getSlotConfig(slotNum)?.basics?.strategy || `투자법 ${slotNum}`;
  }

  if (!statusData) return;

  const totalAssets = Math.max(0, Number(statusData.totalAssets || statusData.total_assets || 0));
  const realPrincipal = Math.max(0, Number(statusData.realPrincipal || statusData.real_principal || statusData.realPrincipalUSD || 0));
  const totalProfit = Number(statusData.totalProfit !== undefined ? statusData.totalProfit : (totalAssets - realPrincipal));
  const cash = Math.max(0, Number(statusData.cash || 0));
  const evalVal = Math.max(0, Number(statusData.evalVal || Math.max(0, totalAssets - cash)));

  // 도넛 차트 구성 데이터를 동적으로 빌드 (통합 시 투자법별 총수익 분할 적용)
  let chartLabels = [];
  let chartData = [];
  let chartColors = [];

  if (targetValue === 'combined') {
    chartLabels.push('원금');
    chartData.push(realPrincipal);
    chartColors.push('#7c3aed'); // 합산 원금 색상

    for (let i = 1; i <= MAX_SLOTS; i++) {
      if (isSlotActive(i)) {
        const strategyName = getSlotConfig(i)?.basics?.strategy || `투자법 ${i}`;
        const slotRes = getBestResult(lastBTResults[i], i);
        const slotData = getDisplayStatusData(slotRes, i);
        
        let slotProfit = 0;
        if (slotData) {
          slotProfit = Number(slotData.totalProfit !== undefined ? slotData.totalProfit : (slotData.totalAssets - slotData.realPrincipal));
        }
        
        chartLabels.push(`${strategyName} 수익`);
        chartData.push(Math.max(0, slotProfit));
        chartColors.push(SLOT_COLORS[(i - 1) % SLOT_COLORS.length]);
      }
    }
  } else {
    chartLabels = ['원금', '총수익'];
    chartData = [realPrincipal, Math.max(0, totalProfit)];
    chartColors = ['#7c3aed', '#2563eb'];
  }

  const chartTotal = Math.max(0.0001, chartData.reduce((a, b) => a + b, 0));

  const formatChartMoney = (value, compact = false) => {
    const num = Number(value || 0);
    const sign = num < 0 ? '-' : '';
    const absNum = Math.abs(num);
    if (isCurrencyKRW) {
      const krw = absNum * currentFXRate;
      if (compact) return sign + Math.round(krw / 10000).toLocaleString() + '만';
      return sign + '₩' + Math.round(krw).toLocaleString();
    }
    return sign + '$' + (compact ? Math.round(absNum).toLocaleString() : absNum.toLocaleString(undefined, { maximumFractionDigits: 0 }));
  };

  const formatPct = (value, base, digits = 0) => {
    const safeBase = Math.abs(Number(base || 0));
    if (safeBase <= 0) return '0%';
    return (Number(value || 0) / safeBase * 100).toFixed(digits) + '%';
  };

  const getLatestPeriodRow = (kind) => {
    let rows = [];
    if (targetValue === 'combined') {
      rows = kind === 'year' ? globalCombinedYearlyData : (kind === 'month' ? globalCombinedMonthlyData : globalCombinedDailyData);
    } else {
      const slotNum = parseInt(targetValue, 10);
      rows = kind === 'year' ? globalYearlyDataArr[slotNum] : (kind === 'month' ? globalMonthlyDataArr[slotNum] : globalDailyDataArr[slotNum]);
    }
    if (!Array.isArray(rows) || rows.length === 0) return null;
    return [...rows].filter(row => row && row.period).sort((a, b) => String(b.period).localeCompare(String(a.period)))[0] || null;
  };

  const getSlotLatestPeriodRow = (slotNum, kind) => {
    const rows = kind === 'year' ? globalYearlyDataArr[slotNum] : (kind === 'month' ? globalMonthlyDataArr[slotNum] : globalDailyDataArr[slotNum]);
    if (!Array.isArray(rows) || rows.length === 0) return null;
    return [...rows].filter(row => row && row.period).sort((a, b) => String(b.period).localeCompare(String(a.period)))[0] || null;
  };

  const formatPeriodValue = (row) => {
    if (!row) return '-';
    return `${formatChartMoney(row.profit, true)}<span class="stats-profit-rate">(${(Number(row.rate || 0) * 100).toFixed(1)}%)</span>`;
  };

  const colorizeProfitValue = (valueText, rawValue) => {
    return valueText;
  };

  const formatPeriodLegendValue = (row) => {
    if (!row) return '-';
    return colorizeProfitValue(formatPeriodValue(row), Number(row.profit || 0));
  };

  const latestYearRow = getLatestPeriodRow('year');
  const latestMonthRow = getLatestPeriodRow('month');
  const latestDayRow = getLatestPeriodRow('day');

  const hexToRgba = (hex, alpha) => {
    let c = hex.substring(1);
    if (c.length === 3) {
      c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    }
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  let legendRows = [];
  if (targetValue === 'combined') {
    for (let i = 1; i <= MAX_SLOTS; i++) {
      if (isSlotActive(i)) {
        const strategyName = getSlotConfig(i)?.basics?.strategy || `투자법 ${i}`;
        const slotRes = getBestResult(lastBTResults[i], i);
        const slotData = getDisplayStatusData(slotRes, i);
        let slotProfit = 0;
        let slotPrincipal = 0;
        if (slotData) {
          slotProfit = Number(slotData.totalProfit !== undefined ? slotData.totalProfit : (slotData.totalAssets - slotData.realPrincipal));
          slotPrincipal = Number(slotData.realPrincipal || 0);
        }
        legendRows.push({
          label: formatStrategyNameWithSmallParentheses(strategyName),
          customValue: `${formatChartMoney(slotProfit, true)}`,
          tone: 'profit',
          color: SLOT_COLORS[(i - 1) % SLOT_COLORS.length]
        });
      }
    }
  }

  legendRows.push(
    { label: '원금', value: realPrincipal, tone: 'principal', color: '#7c3aed' },
    { 
      label: '총 수익<span class="stats-profit-rate">(수익률)</span>', 
      customValue: colorizeProfitValue(`${formatChartMoney(totalProfit, true)}<span class="stats-profit-rate">(${formatPct(totalProfit, realPrincipal, 1)})</span>`, totalProfit), 
      tone: 'profit' 
    },
    { label: '년 수익<span class="stats-profit-rate">(수익률)</span>', customValue: formatPeriodLegendValue(latestYearRow), tone: 'profit' },
    { label: '월 수익<span class="stats-profit-rate">(수익률)</span>', customValue: formatPeriodLegendValue(latestMonthRow), tone: 'profit' },
    { label: '일 수익<span class="stats-profit-rate">(수익률)</span>', customValue: formatPeriodLegendValue(latestDayRow), tone: 'profit' },
    { label: '평가금', value: evalVal, tone: 'eval' },
    { label: '예수금', value: cash, tone: 'cash' }
  );

  const legendContainer = document.getElementById('statsChartLegend');
  if (legendContainer) {
    legendContainer.innerHTML = legendRows.map(row => {
      if (row.isHeader) {
        return `
          <div class="stats-asset-legend-row stats-asset-header" style="display: flex; justify-content: space-between; align-items: center; width: 200px; min-width: 200px; padding: 2px 6px; box-sizing: border-box; border-bottom: 1px solid rgba(255,255,255,0.15); height: auto; margin-bottom: 4px; background: transparent; border-top: none; border-left: none; border-right: none; border-radius: 0;">
            <span style="font-weight: 800; font-size: var(--app-font-size, 10.5px); color: var(--text-muted); text-align: left; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${row.label}</span>
            <span style="font-weight: 800; font-size: var(--app-font-size, 10.5px); color: var(--text-muted); text-align: center; width: 110px; flex-shrink: 0; letter-spacing: -0.3px;">${row.customValue}</span>
          </div>
        `;
      }
      return `
        <div class="stats-asset-legend-row stats-asset-${row.tone || 'plain'}" style="display: flex; justify-content: space-between; align-items: center; width: 200px; min-width: 200px; padding: 2px 6px; box-sizing: border-box; height: auto; margin-bottom: 2px;">
          <div style="display: flex; align-items: center; gap: 4px; min-width: 0; flex: 1;">
            <span class="stats-asset-label" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: ${row.color || 'var(--text-muted)'}; font-size: var(--app-font-size, 10.5px); font-weight: 700; flex: 1; text-align: left;">${row.label}</span>
          </div>
          <b style="color: ${row.color || 'var(--text-muted)'}; font-size: var(--app-font-size, 10.5px); font-weight: 700; white-space: nowrap; margin-left: 4px; width: 110px; flex-shrink: 0; text-align: center; letter-spacing: -0.3px;">
            ${row.customValue || `${formatChartMoney(row.value, true)}${row.pctBase ? `(${formatPct(row.value, row.pctBase, row.pctDigits || 0)})` : ''}`}
          </b>
        </div>
      `;
    }).join('');
  }

  const subProfitEl = document.getElementById('statsSubStrategyProfitability');
  if (subProfitEl) {
    subProfitEl.innerHTML = '';
    subProfitEl.className = 'stats-sub-strat-profit-container hidden';
  }

  const canvas = document.getElementById('statsPieChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (statsPieChartInstance) {
    statsPieChartInstance.destroy();
  }

  const isDark = !document.body.classList.contains('light-mode');
  const appFontPx = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-font-size')) || 10.5;
  const centerTextPlugin = {
    id: 'centerText',
    afterDraw: function(chart) {
      // 툴팁 활성화 시 시인성 개선을 위해 중앙 총자산 텍스트를 그리지 않음
      if (chart.tooltip && (chart.tooltip.opacity > 0 || (chart.tooltip._active && chart.tooltip._active.length > 0))) {
        return;
      }
      const { ctx, chartArea: { left, right, top, bottom } } = chart;
      const centerX = (left + right) / 2;
      const centerY = (top + bottom) / 2;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // 실시간으로 CSS 변수 --text-muted의 계산된 컬러 값을 읽어옵니다 (자산현황 범례 글자 색상과 완벽 통일)
      const textMutedColor = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#94a3b8';
      
      // 총자산 금액 - --text-muted 색상으로 통일
      ctx.font = `700 ${Math.max(10, appFontPx + 2)}px Outfit, Inter, sans-serif`;
      ctx.fillStyle = textMutedColor;
      ctx.fillText(formatChartMoney(totalAssets, true), centerX, centerY - 4);
      
      // 총자산 라벨 - --text-muted 색상으로 통일
      ctx.font = `600 ${Math.max(9, appFontPx)}px Outfit, Inter, sans-serif`;
      ctx.fillStyle = textMutedColor;
      ctx.fillText('총자산', centerX, centerY + 13);
      
      ctx.restore();
    }
  };

  const doughnutLabelsPlugin = {
    id: 'doughnutLabels',
    afterDatasetsDraw: function(chart) {
      const { ctx } = chart;
      chart.data.datasets.forEach((dataset, i) => {
        const meta = chart.getDatasetMeta(i);
        if (meta.hidden) return;
        
        meta.data.forEach((element, index) => {
          const { x, y, startAngle, endAngle, innerRadius, outerRadius } = element;
          const value = dataset.data[index];
          const total = dataset.data.reduce((a, b) => a + b, 0);
          if (total <= 0 || value <= 0) return;
          const percentage = ((value / total) * 100).toFixed(0) + '%';
          
          // 4% 미만의 너무 좁은 영역은 글씨 생략 (가독성 목적)
          if ((value / total) < 0.04) return;
          
          const middleAngle = startAngle + (endAngle - startAngle) / 2;
          const middleRadius = innerRadius + (outerRadius - innerRadius) / 2;
          
          const textX = x + Math.cos(middleAngle) * middleRadius;
          const textY = y + Math.sin(middleAngle) * middleRadius;
          
          ctx.save();
          ctx.font = 'bold 9px Outfit, Inter, sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
          ctx.shadowBlur = 2;
          ctx.fillText(percentage, textX, textY);
          ctx.restore();
        });
      });
    }
  };

  statsPieChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: chartLabels,
      datasets: [{
        data: chartData,
        backgroundColor: chartColors,
        borderWidth: 0,
        borderColor: 'transparent',
        borderRadius: 0,
        hoverOffset: 5,
        spacing: 2
      }]
    },
    plugins: [centerTextPlugin, doughnutLabelsPlugin],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 8, bottom: 8, left: 8, right: 8 } },
      cutout: '55%',
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          callbacks: {
            title: function() {
              return '';
            },
            label: function(context) {
              const val = Number(context.raw || 0);
              const totalVal = chartData.reduce((a, b) => a + b, 0);
              const pct = totalVal > 0 ? (val / totalVal * 100).toFixed(1) : '0.0';
              return [
                context.label,
                `${formatChartMoney(val, true)} (${pct}%)`
              ];
            }
          }
        }
      }
    }
  });
};

// 📈 주가 정보 조회 뷰 기능 (대시보드 패널 연동)
function showPriceInfoView() {
  restoreFromPerfLayout();
  
  if (isManualBacktestMode) {
    restoreLocalCache();
    showToast("실전 데이터 모드로 복귀했습니다.", "🔄");
  }

  isStatsMode = false;
  isOrderView = false; // 주문표가 아님
  
  // 탑바 아이콘들의 활성화 탭 갱신
  const btnStats = document.getElementById('btnStatsShow');
  if (btnStats) btnStats.classList.remove('active');
  const btnPerf = document.getElementById('btnPerfShow');
  if (btnPerf) btnPerf.classList.remove('active');
  const btnInstant = document.getElementById('btnInstant');
  if (btnInstant) btnInstant.classList.remove('active');
  const btnPrice = document.getElementById('btnPriceInfo');
  if (btnPrice) btnPrice.classList.add('active');

  const grid = document.getElementById('mainGrid');
  if (grid) {
    // 기존 뷰 상태(레이아웃 및 확장상태) 모두 해제
    grid.classList.remove('perf-metrics-layout', 'backtest-view-layout', 'perf-tab-layout', 'order-expanded', 'monthly-expanded');
    // 주가 정보 확장 상태 클래스 추가 (화면에 주가 정보 패널만 가득 채움)
    grid.classList.add('price-info-expanded');
  }

  const priceInfoCard = document.getElementById('panelPriceInfo');
  if (priceInfoCard) {
    priceInfoCard.style.display = 'flex';
  }

  loadPriceInfoViewData();
}

// JSON으로 저장된 캐시 객체의 날짜 문자열들을 Date 객체로 복원하는 헬퍼 함수
function restoreCacheDates(cacheObj) {
  if (!cacheObj) return;
  if (cacheObj.latest && cacheObj.latest.date) cacheObj.latest.date = new Date(cacheObj.latest.date);
  if (cacheObj.day && cacheObj.day.date) cacheObj.day.date = new Date(cacheObj.day.date);
  if (cacheObj.week && cacheObj.week.date) cacheObj.week.date = new Date(cacheObj.week.date);
  if (cacheObj.month && cacheObj.month.date) cacheObj.month.date = new Date(cacheObj.month.date);
  if (cacheObj.year && cacheObj.year.date) cacheObj.year.date = new Date(cacheObj.year.date);
  if (cacheObj.lastYearEnd) cacheObj.lastYearEnd = new Date(cacheObj.lastYearEnd);
  if (cacheObj.rawDates && Array.isArray(cacheObj.rawDates)) {
    cacheObj.rawDates = cacheObj.rawDates.map(d => new Date(d));
  }
}


const CORE_PRICE_TICKERS = ['SOXL', 'QQQ', 'TQQQ', 'SOXX', 'KRW=X'];

async function preloadCorePriceTickers() {
  const now = new Date();
  const fullStart = new Date(now.getTime() - 450 * 24 * 60 * 60 * 1000);
  let earliestMissingTs = Infinity;
  let latestCachedTs = 0;

  for (const ticker of CORE_PRICE_TICKERS) {
    const cached = normalizePriceSeries(await getDB(ticker), ticker);
    if (!cached.dates.length) {
      earliestMissingTs = Math.min(earliestMissingTs, fullStart.getTime());
      continue;
    }
    const firstTs = cached.dates[0].getTime();
    const lastTs = cached.dates[cached.dates.length - 1].getTime();
    latestCachedTs = Math.max(latestCachedTs, lastTs);
    if (firstTs > fullStart.getTime() + 43200000) {
      earliestMissingTs = Math.min(earliestMissingTs, fullStart.getTime());
    }
  }

  let startTs;
  if (earliestMissingTs !== Infinity) {
    startTs = Math.floor(earliestMissingTs / 1000);
  } else if (latestCachedTs > 0) {
    startTs = Math.floor((latestCachedTs - 86400000 * 5) / 1000);
  } else {
    startTs = Math.floor(fullStart.getTime() / 1000);
  }

  const p2 = Math.floor(now.getTime() / 1000);
  await fetchBatchPriceData(CORE_PRICE_TICKERS, startTs, p2, true, false);
}

// 전역 주가 정보 티커 상태 (기본값 SOXL)
window.priceInfoTicker = window.priceInfoTicker || 'SOXL';

function changePriceInfoTicker(ticker) {
  window.priceInfoTicker = ticker;
  loadPriceInfoViewData();
}
window.changePriceInfoTicker = changePriceInfoTicker;

async function loadPriceInfoViewData() {
  const contentEl = document.getElementById('priceInfoViewContent');
  if (!contentEl) return;

  const ticker = window.priceInfoTicker || 'SOXL';
  
  // 타이틀 텍스트 동적 갱신
  const titleEl = document.getElementById('priceInfoTitle');
  if (titleEl) {
    titleEl.innerHTML = `📈 ${ticker} 주가 정보`;
  }

  // 우측 상단 셀렉터 동기화
  const selectorEl = document.getElementById('priceInfoTickerSelector');
  if (selectorEl) {
    selectorEl.value = ticker;
  }

  const now = new Date();
  const oneYearAgo = new Date(now.getTime() - 450 * 24 * 60 * 60 * 1000);
  const p1 = Math.floor(oneYearAgo.getTime() / 1000);
  const p2 = Math.floor(now.getTime() / 1000);

  // 티커별 캐시 키 지정
  const cacheKey = `cachedPriceData_${ticker}`;

  // 1) 전역 메모리 캐시가 존재하면 대기 없이 즉시 화면 렌더링
  window.cachedPriceMap = window.cachedPriceMap || {};
  if (window.cachedPriceMap[ticker]) {
    renderPriceInfoView(window.cachedPriceMap[ticker]);
  } else {
    // 2) 메모리 캐시가 없으면 localStorage 캐시를 로드하여 즉시 화면 렌더링 (Stale)
    try {
      const localCacheStr = localStorage.getItem(cacheKey);
      if (localCacheStr) {
        const localCache = JSON.parse(localCacheStr);
        restoreCacheDates(localCache);
        window.cachedPriceMap[ticker] = localCache;
        renderPriceInfoView(localCache);
      } else {
        contentEl.innerHTML = `<div style="text-align:center; padding:20px; color:#64748b;">${ticker} 주가 데이터를 불러오는 중...</div>`;
      }
    } catch (e) {
      console.error(`${ticker} 로컬 캐시 복원 중 오류 발생:`, e);
      contentEl.innerHTML = `<div style="text-align:center; padding:20px; color:#64748b;">${ticker} 주가 데이터를 불러오는 중...</div>`;
    }
  }

  try {
    const data = await fetchYahooData(ticker, p1, p2, true, false);
    if (!data || !data.close || data.close.length === 0) {
      if (!window.cachedPriceMap[ticker]) {
        contentEl.innerHTML = `<div style="text-align:center; padding:20px; color:#ef4444;">${ticker} 데이터가 없습니다.</div>`;
      }
      return;
    }

    const len = data.close.length;
    const latestPrice = data.close[len - 1];
    const latestDate = data.dates[len - 1];

    const findClosestPrice = (targetDate) => {
      const targetTime = targetDate.getTime();
      let closestIdx = 0;
      let minDiff = Infinity;
      for (let i = 0; i < len; i++) {
        const diff = Math.abs(data.dates[i].getTime() - targetTime);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      }
      return {
        price: data.close[closestIdx],
        date: data.dates[closestIdx]
      };
    };

    const oneDayAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const thisMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
    const lastWeekFriday = new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() - 3);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31);

    const dayAgo = (len >= 2) ? {
      price: data.close[len - 2],
      date: data.dates[len - 2]
    } : findClosestPrice(oneDayAgo);
    const weekAgo = findClosestPrice(lastWeekFriday);
    const monthAgo = findClosestPrice(lastMonthEnd);
    const yearAgo = findClosestPrice(lastYearEnd);

    const calcRate = (past, current) => {
      if (past === 0) return 0;
      return ((current - past) / past) * 100;
    };

    const dayRate = calcRate(dayAgo.price, latestPrice);
    const weekRate = calcRate(weekAgo.price, latestPrice);
    const monthRate = calcRate(monthAgo.price, latestPrice);
    const yearRate = calcRate(yearAgo.price, latestPrice);

    const viewData = {
      ticker: ticker,
      latest: { price: latestPrice, date: latestDate },
      day: { price: dayAgo.price, date: dayAgo.date, rate: dayRate },
      week: { price: weekAgo.price, date: weekAgo.date, rate: weekRate },
      month: { price: monthAgo.price, date: monthAgo.date, rate: monthRate },
      year: { price: yearAgo.price, date: yearAgo.date, rate: yearRate },
      rawDates: data.dates,
      rawClose: data.close,
      lastYearEnd: lastYearEnd
    };

    // 3) 전역 변수 메모리 및 로컬스토리지 영구 캐시 업데이트
    window.cachedPriceMap[ticker] = viewData;
    localStorage.setItem(cacheKey, JSON.stringify(viewData));

    // 4) 최신 정보로 렌더링 업데이트 (Revalidate)
    renderPriceInfoView(viewData);

  } catch (error) {
    console.error(error);
    if (!window.cachedPriceMap[ticker] && contentEl) {
      contentEl.innerHTML = `<div style="text-align:center; padding:20px; color:#ef4444;">오류 발생: ${error.message}</div>`;
    }
  }
}

function renderPriceInfoView(data) {
  const contentEl = document.getElementById('priceInfoViewContent');
  if (!contentEl) return;

  const { latest, day, week, month, year, rawDates, rawClose, lastYearEnd } = data;
  const ticker = data.ticker || 'SOXL';

  const getRateHtml = (rate) => {
    const isPositive = rate >= 0;
    const prefix = isPositive ? '+' : '';
    const color = isPositive ? '#3b82f6' : '#ef4444';
    return `<span style="color: ${color} !important; font-weight: 700;">${prefix}${rate.toFixed(2)}%</span>`;
  };

  const latestDateStr = formatDateNY(latest.date);
  const dayDateStr = formatDateNY(day.date);
  const weekDateStr = formatDateNY(week.date);
  const monthDateStr = formatDateNY(month.date);
  const yearDateStr = formatDateNY(year.date);

  const chartDates = [];
  const chartPrices = [];
  let maxPrice = -Infinity;
  let minPrice = Infinity;

  for (let i = 0; i < rawDates.length; i++) {
    const itemDate = new Date(rawDates[i]);
    if (itemDate >= lastYearEnd) {
      const dStr = formatDateNY(itemDate);
      chartDates.push(dStr.substring(5)); // 'MM-DD'
      const priceVal = rawClose[i];
      chartPrices.push(priceVal);
      if (priceVal > maxPrice) maxPrice = priceVal;
      if (priceVal < minPrice) minPrice = priceVal;
    }
  }


  if (chartDates.length === 0 && rawDates.length > 0) {
    const fallbackStart = Math.max(0, rawDates.length - 260);
    for (let i = fallbackStart; i < rawDates.length; i++) {
      const itemDate = new Date(rawDates[i]);
      const dStr = formatDateNY(itemDate);
      const priceVal = rawClose[i];
      if (!dStr || priceVal === null || priceVal === undefined || isNaN(priceVal)) continue;
      chartDates.push(dStr.substring(5));
      chartPrices.push(priceVal);
      if (priceVal > maxPrice) maxPrice = priceVal;
      if (priceVal < minPrice) minPrice = priceVal;
    }
  }
  const getTableRowsHtml = () => `
    <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
      <td style="padding:6px 4px; text-align:center; font-size:11px; vertical-align:middle;">
        1일 전<br><span style="font-size:9px; color:#64748b;">${dayDateStr}</span>
      </td>
      <td style="padding:6px 4px; text-align:center; font-weight:600; color:#3b82f6; vertical-align:middle;">$${day.price.toFixed(2)}</td>
      <td style="padding:6px 4px; text-align:center; font-weight:700; vertical-align:middle;">${getRateHtml(day.rate)}</td>
    </tr>
    <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
      <td style="padding:6px 4px; text-align:center; font-size:11px; vertical-align:middle;">
        1주<br><span style="font-size:9px; color:#64748b;">${weekDateStr}</span>
      </td>
      <td style="padding:6px 4px; text-align:center; font-weight:600; color:#3b82f6; vertical-align:middle;">$${week.price.toFixed(2)}</td>
      <td style="padding:6px 4px; text-align:center; font-weight:700; vertical-align:middle;">${getRateHtml(week.rate)}</td>
    </tr>
    <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
      <td style="padding:6px 4px; text-align:center; font-size:11px; vertical-align:middle;">
        한달<br><span style="font-size:9px; color:#64748b;">${monthDateStr}</span>
      </td>
      <td style="padding:6px 4px; text-align:center; font-weight:600; color:#3b82f6; vertical-align:middle;">$${month.price.toFixed(2)}</td>
      <td style="padding:6px 4px; text-align:center; font-weight:700; vertical-align:middle;">${getRateHtml(month.rate)}</td>
    </tr>
    <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
      <td style="padding:6px 4px; text-align:center; font-size:11px; vertical-align:middle;">
        1년<br><span style="font-size:9px; color:#64748b;">${yearDateStr}</span>
      </td>
      <td style="padding:6px 4px; text-align:center; font-weight:600; color:#3b82f6; vertical-align:middle;">$${year.price.toFixed(2)}</td>
      <td style="padding:6px 4px; text-align:center; font-weight:700; vertical-align:middle;">${getRateHtml(year.rate)}</td>
    </tr>
  `;

  const existingCanvas = document.getElementById('soxlPriceChart');
  const existingHeader = contentEl.querySelector('.price-info-header-block');

  if (existingCanvas && existingHeader) {
    const latestDateEl = contentEl.querySelector('.price-info-latest-date');
    const latestPriceEl = contentEl.querySelector('.price-info-latest-price');
    const tableBodyEl = contentEl.querySelector('.price-info-table-body');
    const chartTitleEl = contentEl.querySelector('.price-info-chart-title');

    if (latestDateEl) latestDateEl.innerHTML = `최근 종가 <span style="font-size: calc(100% - 2px); font-weight: inherit; opacity: 0.8; margin-left: 2px;">(${latestDateStr})</span>`;
    if (latestPriceEl) latestPriceEl.textContent = `$${latest.price.toFixed(2)}`;
    if (tableBodyEl) tableBodyEl.innerHTML = getTableRowsHtml();
    if (chartTitleEl) {
      if (maxPrice !== -Infinity && minPrice !== Infinity) {
        chartTitleEl.innerHTML = `📈 당해년도 주가 <span style="font-weight: normal; font-size: 10px; color: #94a3b8; margin-left: 6px;">(최고: $${maxPrice.toFixed(2)} / 최저: $${minPrice.toFixed(2)})</span>`;
      } else {
        chartTitleEl.innerHTML = `📈 당해년도 주가`;
      }
    }
  } else {
    let chartTitleHtml = `📈 당해년도 주가`;
    if (maxPrice !== -Infinity && minPrice !== Infinity) {
      chartTitleHtml = `📈 당해년도 주가 <span style="font-weight: normal; font-size: 10px; color: #94a3b8; margin-left: 6px;">(최고: $${maxPrice.toFixed(2)} / 최저: $${minPrice.toFixed(2)})</span>`;
    }

    contentEl.innerHTML = `
      <div class="price-info-header-block" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:12px; text-align:center;">
        <div class="price-info-latest-date" style="font-size:11px; color:#94a3b8; margin-bottom:4px;">최근 종가 <span style="font-size: calc(100% - 2px); font-weight: inherit; opacity: 0.8; margin-left: 2px;">(${latestDateStr})</span></div>
        <div class="price-info-latest-price" style="font-size:24px; font-weight:700; color:#ef4444;">$${latest.price.toFixed(2)}</div>
      </div>
      
      <table class="data-table" style="width:100%; border-collapse:collapse; margin-top:8px; table-layout:fixed;">
        <thead>
          <tr style="border-bottom:1px solid rgba(255,255,255,0.1); color:var(--text-muted); font-weight:700;">
            <th style="padding:6px 4px; text-align:center; font-size:11px; width:33.33%;">기간</th>
            <th style="padding:6px 4px; text-align:center; font-size:11px; width:33.33%;">과거 주가</th>
            <th style="padding:6px 4px; text-align:center; font-size:11px; width:33.33%;">현재 상승률</th>
          </tr>
        </thead>
        <tbody class="price-info-table-body">
          ${getTableRowsHtml()}
        </tbody>
      </table>
  
      <!-- 주가 그래프 영역 -->
      <div style="margin-top:16px; border-top:1px solid rgba(255,255,255,0.08); padding-top:12px; flex:1; display:flex; flex-direction:column;">
        <div class="price-info-chart-title" style="font-size:11px; color:#94a3b8; font-weight:600; margin-bottom:8px; text-align:left;">${chartTitleHtml}</div>
        <div style="flex:1; min-height:180px; position:relative; width:100%;">
          <canvas id="soxlPriceChart"></canvas>
        </div>
      </div>
    `;
  }

  const runChartDraw = () => {
    const ctx = document.getElementById('soxlPriceChart');
    if (!ctx) return;
    
    if (typeof Chart === 'undefined') {
      console.warn("Chart.js is not loaded yet.");
      return;
    }
    
    const isNasdaq = (ticker === 'QQQ' || ticker === 'TQQQ');
    const chartColor = isNasdaq ? '#6366f1' : '#ef4444';
    const chartBgColor = isNasdaq ? 'rgba(99, 102, 241, 0.05)' : 'rgba(239, 68, 68, 0.05)';
    
    const maxMinPlugin = {
      id: 'maxMinPlugin',
      afterDatasetsDraw(chart) {
        const { ctx, scales: { x, y } } = chart;
        const dataset = chart.data.datasets[0];
        if (!dataset || !dataset.data || dataset.data.length === 0) return;

        const data = dataset.data;
        let maxVal = -Infinity;
        let minVal = Infinity;
        let maxIdx = -1;
        let minIdx = -1;

        for (let i = 0; i < data.length; i++) {
          const val = data[i];
          if (val > maxVal) {
            maxVal = val;
            maxIdx = i;
          }
          if (val < minVal) {
            minVal = val;
            minIdx = i;
          }
        }

        if (maxIdx === -1 || minIdx === -1) return;

        ctx.save();
        ctx.font = 'bold 9px sans-serif';
        ctx.textBaseline = 'middle';

        const meta = chart.getDatasetMeta(0);
        if (meta && meta.data && meta.data[maxIdx]) {
          const maxX = meta.data[maxIdx].x;
          const maxY = meta.data[maxIdx].y;
          
          ctx.beginPath();
          ctx.arc(maxX, maxY, 4, 0, 2 * Math.PI);
          ctx.fillStyle = '#ef4444';
          ctx.fill();
          ctx.lineWidth = 1;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();

          ctx.fillStyle = '#ef4444';
          ctx.textAlign = 'center';
          ctx.fillText(`▲ $${maxVal.toFixed(2)}`, maxX, maxY - 10);
        }

        if (meta && meta.data && meta.data[minIdx]) {
          const minX = meta.data[minIdx].x;
          const minY = meta.data[minIdx].y;

          ctx.beginPath();
          ctx.arc(minX, minY, 4, 0, 2 * Math.PI);
          ctx.fillStyle = '#3b82f6';
          ctx.fill();
          ctx.lineWidth = 1;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();

          ctx.fillStyle = '#3b82f6';
          ctx.textAlign = 'center';
          ctx.fillText(`▼ $${minVal.toFixed(2)}`, minX, minY + 10);
        }

        ctx.restore();
      }
    };

    if (window.soxlPriceChartInstance && window.soxlPriceChartInstance.canvas === ctx) {
      const chartInstance = window.soxlPriceChartInstance;
      chartInstance.data.labels = chartDates;
      chartInstance.data.datasets[0].label = ticker;
      chartInstance.data.datasets[0].data = chartPrices;
      chartInstance.data.datasets[0].borderColor = chartColor;
      chartInstance.data.datasets[0].backgroundColor = chartBgColor;
      
      const plugins = chartInstance.config.plugins || [];
      if (!plugins.some(p => p.id === 'maxMinPlugin')) {
        plugins.push(maxMinPlugin);
        chartInstance.config.plugins = plugins;
      }
      
      chartInstance.update();
    } else {
      if (window.soxlPriceChartInstance) {
        try { window.soxlPriceChartInstance.destroy(); } catch (e) {}
      }
      window.soxlPriceChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: chartDates,
          datasets: [{
            label: ticker,
            data: chartPrices,
            borderColor: chartColor,
            backgroundColor: chartBgColor,
            borderWidth: 1.5,
            pointRadius: 0,
            pointHoverRadius: 4,
            fill: true,
            tension: 0.1
          }]
        },
        plugins: [maxMinPlugin],
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: {
            padding: { top: 15, bottom: 15, left: 8, right: 8 }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              mode: 'index',
              intersect: false,
              callbacks: {
                label: function(context) {
                  return `$${Number(context.raw).toFixed(2)}`;
                }
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              afterBuildTicks: function(scale) {
                const ticks = scale.ticks;
                if (!ticks || ticks.length === 0) return;
                const total = ticks.length;
                if (total <= 5) return;
                const step = Math.floor((total - 1) / 4);
                const targetIndices = [0, step, step * 2, step * 3, total - 1];
                scale.ticks = ticks.filter((t, idx) => targetIndices.includes(idx));
              },
              ticks: {
                color: '#64748b',
                font: { size: 9 }
              }
            },
            y: {
              grid: { color: 'rgba(255, 255, 255, 0.04)' },
              ticks: {
                maxTicksLimit: 4,
                color: '#64748b',
                font: { size: 9 },
                callback: function(value) {
                  return `$${value}`;
                }
              }
            }
          }
        }
      });
    }
  };

  if (existingCanvas && existingHeader) {
    runChartDraw();
  } else {
    setTimeout(runChartDraw, 100);
  }
}

window.showPriceInfoView = showPriceInfoView;
