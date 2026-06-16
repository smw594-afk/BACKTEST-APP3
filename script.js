// script.js (UI 컨트롤, 데이터 통신 및 차트 렌더링 - 6슬롯 무한 확장 버전)

const APP_VERSION = "3.35";
const MAX_SLOTS = 6;

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
let statsDisplayMode = "table";
let statsPieChartInstance = null;

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
            <div class="slot-title slot-title-sm" style="color:#fbbf24; cursor:pointer;" onclick="toggleSortOrder()" title="클릭하여 오름/내림 정렬 토글">🌐 통합 주문표</div>
            <table class="data-table">
              <thead><tr><th style="width:15%;">종류</th><th style="width:25%;">가격</th><th style="width:20%;">수량</th></tr></thead>
              <tbody id="combinedOrderBody"><tr><td colspan="3" class="table-empty-cell">주문 없음</td></tr></tbody>
            </table>
          </div>
          <div id="combinedHoldingsView" class="view-pane-hidden">
            <div class="slot-title slot-title-sm" style="color:#fbbf24; cursor:pointer;" onclick="toggleIndividualHoldings(event)" title="클릭하여 개별 보유현황 토글">🌐 통합 보유 현황</div>
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
  if (!confirm("🔄 실전 데이터 모드로 복원하시겠습니까?\n\n현재 화면의 백테스트 결과가 사라지고 구글 시트의 데이터가 D1 DB로 이관되어 교체됩니다.")) return;
  isViewingHistory = false;
  isManualBacktestMode = false;
  updateHeaderDisplay();
  setLED('loading');
  await checkAndSyncWithServer(true);
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

  // 기존 환율 버튼은 숨김 (statsTable 영역만 노출)
  currencyBtns.forEach(btn => { btn.style.display = 'none'; });

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
    grid.classList.remove('perf-metrics-layout', 'backtest-view-layout', 'perf-tab-layout');
    if (isViewingHistory) {
      grid.classList.add('backtest-view-layout');
    }
  }
  const statsTitle = document.getElementById('statsTitle');
  if (statsTitle) {
    statsTitle.innerHTML = isViewingHistory ? '📄 성과 지표' : '📡 실시간 운영현황';
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

function showStatsView() {
  restoreFromPerfLayout();
  // ⭐️ 수동 백테스트 중이었다면 원래 설정과 캐시로 즉시 복귀
  if (isManualBacktestMode) {
    restoreLocalCache();
    showToast("실전 데이터 모드로 복귀했습니다.", "🔄");
  }

  isStatsMode = true;
  isOrderView = false;
  
  const statsTitle = document.getElementById('statsTitle');
  if (statsTitle) statsTitle.innerHTML = '📡 실시간 운영현황';

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
  // ⭐️ 수동 백테스트 중이었다면 원래 설정과 캐시로 즉시 복귀
  if (isManualBacktestMode) {
    restoreLocalCache();
    showToast("실전 데이터 모드로 복귀했습니다.", "🔄");
  }

  isStatsMode = false;
  isOrderView = false;
  
  const statsTitle = document.getElementById('statsTitle');
  if (statsTitle) statsTitle.innerHTML = '📄 성과 지표';

  const grid = document.getElementById('mainGrid');
  if (grid) {
    grid.classList.add('perf-tab-layout');
    grid.classList.remove('perf-metrics-layout', 'backtest-view-layout');
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

function toggleOrderView() {
  // 보유현황 모드(!isOrderView)일 때는 메인 타이틀(또는 아이콘) 클릭 시 개별 보유현황 토글 처리
  if (!isOrderView) {
    toggleIndividualHoldings();
    return;
  }

  // 내역 화면(실시간 운영현황 모드)일 때는 클릭 시 무반응
  if (isStatsMode) {
    return;
  }

  const currentMode = localStorage.getItem(`vtotal_combined_mode_${myUserId}`) || 'combined';
  let nextMode = 'combined';

  if (currentMode === 'combined') {
    nextMode = 'normal';
  } else if (currentMode === 'normal') {
    nextMode = 'combined_normal';
  } else {
    nextMode = 'combined';
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
    return `<tr><td class="${cls}">${sideText}</td><td>$${Number(o[2]).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td><td>${o[3]}주</td></tr>`;
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
        const currPrice = parseFloat(res.summary?.currPrice || res.currPrice) || 0;
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

  const orderSortOrder = localStorage.getItem(`vtotal_sort_order_${myUserId}`) || 'desc';
  allHoldings.sort((a, b) => {
    let pA = parseFloat(a.buy_price || a.buyPrice) || 0;
    let pB = parseFloat(b.buy_price || b.buyPrice) || 0;
    return orderSortOrder === 'desc' ? (pB - pA) : (pA - pB);
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
      const buyPrice = parseFloat(o.buy_price || o.buyPrice) || 0;
      const qty = parseFloat(o.qty) || 0;
      const profit = (o.currPrice - buyPrice) * qty;
      const sign = profit < 0 ? "-" : "";
      if (isCurrencyKRW) {
        profitStr = sign + "₩" + Math.round(profit * currentFXRate).toLocaleString();
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

    return `<tr><td style="cursor:pointer; text-decoration:underline;" onclick="toggleIndividualHoldings(event)" title="클릭하여 개별 보유현황 토글">#${o.slotNum}</td><td>${buyDateStr}</td><td>${stopDateStr}</td><td>${displayMode}/T${o.tier}</td><td>${buyPriceStr}</td><td class="hide-on-cover sell-price" style="color:var(--danger);">${sellPriceStr}</td><td>${o.qty}</td><td class="${profitClass}" style="font-weight:700;">${profitStr}</td></tr>`;
  }).join('');
}

function toggleOrderExpansion() {
  const grid = document.getElementById('mainGrid');
  const btn = document.getElementById('btnExpandOrder');
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
    chartViewMode = (chartViewMode + 1) % (MAX_SLOTS + 1);
  } while (chartViewMode > 0 && !isSlotActive(chartViewMode));

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

function saveCurrentFormToSlot(slotNum) {
  const cfg = gatherParams();
  slotConfigs[slotNum] = cfg;
  localStorage.setItem(`vtotal_conf${slotNum}_${myUserId}`, JSON.stringify(cfg));
}

function loadSlotToForm(slotNum) {
  const cfg = slotConfigs[slotNum];
  if (cfg && cfg.basics) {
    initData(cfg);
  } else {
    ['ticker', 'startDate', 'endDate', 'initialCash', 'renewCash', 'strategySelect', 'fBase', 'fSec'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
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
            if (initData[prop]) {
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

  updateCurrentFXRate(() => { if (isCurrencyKRW) refreshAllUI(); });

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
  renderPeriodBarChart();

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
  if (typeof periodDisplayMode !== 'undefined' && periodDisplayMode === 'chart') renderPeriodBarChart();
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
  runEngine();
}

// 5. 서버 동기화 및 백테스트 실행
async function checkAndSyncWithServer(isInitial) {
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

    const runFastEngine = async (cfg, isActive, slotNum) => {
      if (!isActive) return null;
      const res = await runBacktestMemory(cfg, false, slotNum);
      if (res && res.status !== "error") {
        updateUIWithResult(res, cfg, slotNum, true);
        return res;
      }
      return null;
    };

    window.skipChartRendering = true;
    for (let i = 1; i <= MAX_SLOTS; i++) {
      await runFastEngine(slotConfigs[i], isSlotActive(i), i);
    }
    window.skipChartRendering = false;
    if (typeof periodDisplayMode !== 'undefined' && periodDisplayMode === 'chart') renderPeriodBarChart();

    const processSyncData = (syncData) => {
      let dataInit = { hasSheet: true };
      let dataPerf = {};
      if (syncData.configs) {
        syncData.configs.forEach(row => {
          const slotKey = row.slot_num === 1 ? 'config' : `config${row.slot_num}`;
          try {
            dataInit[slotKey] = JSON.parse(row.config_json);
          } catch(e) {
            console.error(`Config JSON Parse Error (Slot ${row.slot_num}):`, e);
          }
        });
      }
      for (let i = 1; i <= MAX_SLOTS; i++) {
        dataPerf[`strat${i}`] = { 
          logs: [],
          meta: { realizedProfit: 0, currentCash: 0, qty: 0, avgPrice: 0, tickerPrice: 0 },
          json: "",
          trades: []
        };
      }
      if (syncData.states) {
        const sortedStates = [...syncData.states].sort((a, b) => a.date.localeCompare(b.date));
        sortedStates.forEach(row => {
          const sKey = `strat${row.slot_num}`;
          if (dataPerf[sKey]) {
            dataPerf[sKey].logs.push([
              row.date,
              row.asset,
              row.inout || 0.0,
              row.state_json
            ]);
            
            try {
              const stateObj = JSON.parse(row.state_json);
              dataPerf[sKey].json = row.state_json;
              
              let totalQty = 0;
              let totalCost = 0;
              if (stateObj.holdings) {
                stateObj.holdings.forEach(h => {
                  totalQty += (h.qty || 0);
                  totalCost += (h.cost || (h.qty * (h.buy_price || h.buyPrice || 0)) || 0);
                });
              }
              
              dataPerf[sKey].meta = {
                realizedProfit: stateObj.realizedProfit || 0,
                currentCash: stateObj.cash || 0,
                qty: totalQty,
                avgPrice: totalQty > 0 ? (totalCost / totalQty) : 0,
                tickerPrice: 0
              };
            } catch(e) {}
          }
        });
      }
      if (syncData.trades) {
        syncData.trades.forEach(row => {
          const sKey = `strat${row.slot_num}`;
          if (dataPerf[sKey]) {
            dataPerf[sKey].trades.push({
              buyDate: row.buy_date,
              sellDate: row.sell_date,
              mode: row.mode,
              tier: row.tier,
              buy_price: row.buy_price,
              sell_price: row.sell_price,
              qty: row.qty,
              profit: row.profit,
              total_balance: row.total_balance,
              renew_cash: row.renew_cash
            });
          }
        });
      }
      return { dataInit, dataPerf };
    };

    const track2Promise = (async () => {
      try {
        const syncUrl = `${CF_WORKER_URL}/api/sync?id=${myUserId}`;
        const syncRes = await fetch(syncUrl);
        const syncData = await syncRes.json();
        
        if (isInitial || !syncData.configs || syncData.configs.length === 0) {
          console.log("[CF-D1] 데이터가 비어있거나 강제 복원이 격발되어 구글 시트 마이그레이션을 시작합니다...");
          showToast("📥 시트에서 DB로 데이터 이관 중...", "🔄");
          
          const resInit = await fetch(`${GAS_URL}?action=GET_INIT&id=${myUserId}`);
          const gasInit = await resInit.json();
          
          let perfUrl = `${GAS_URL}?action=GET_MY_PERF&id=${myUserId}`;
          for (let i = 1; i <= MAX_SLOTS; i++) {
            let pName = i === 1 ? 'config' : `config${i}`;
            let sName = gasInit[pName]?.basics?.strategy || slotConfigs[i]?.basics?.strategy || "";
            perfUrl += `&strat${i}=${encodeURIComponent(sName)}`;
          }
          const resPerf = await fetch(perfUrl);
          const gasPerf = await resPerf.json();
          
          for (let i = 1; i <= MAX_SLOTS; i++) {
            const pName = i === 1 ? 'config' : `config${i}`;
            const sName = `strat${i}`;
            const cfg = gasInit[pName];
            const perfSlot = gasPerf[sName];
            
            if (cfg && cfg.basics && cfg.basics.strategy) {
              let statesPayload = [];
              if (perfSlot && perfSlot.logs && perfSlot.logs.length > 0) {
                statesPayload = perfSlot.logs.map(r => {
                  return {
                    date: parseDateStr(r[0]),
                    asset: parseFloat(String(r[1]).replace(/[^0-9.-]+/g, "")) || 0,
                    inout: parseFloat(String(r[2]).replace(/[^0-9.-]+/g, "")) || 0,
                    json: r[3] || "{}"
                  };
                }).filter(s => s.date && s.asset > 0);
              }
              
              const realData = processRealLogData(perfSlot, cfg.basics.strategy, cfg.basics.initialCash);
              let tradesPayload = [];
              if (realData) {
                const engineRes = await runBacktestMemory(cfg, true, i, realData);
                if (engineRes && engineRes.trades) {
                  tradesPayload = engineRes.trades.map(t => ({
                    buyDate: t.buyDate || t.buy_date || "",
                    sellDate: t.sellDate || t.sell_date || "",
                    mode: t.mode || "SF",
                    tier: parseInt(t.tier || 1),
                    buyPrice: parseFloat(t.buyPrice || t.buy_price || 0),
                    sellPrice: parseFloat(t.sellPrice || t.sell_price || 0),
                    qty: parseFloat(t.qty || 0),
                    profit: parseFloat(t.profit || 0),
                    totalBalance: parseFloat(t.totalBalance || t.total_balance || 0),
                    renewCash: parseFloat(t.renewCash || t.renew_cash || 0)
                  }));
                }
              }
              
              const savePayload = {
                id: myUserId,
                slot: i,
                config: cfg,
                states: statesPayload,
                trades: tradesPayload,
                gasUrl: GAS_URL
              };
              
              await fetch(`${CF_WORKER_URL}/api/save`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(savePayload)
              });
            }
          }
          
          const retryRes = await fetch(syncUrl);
          const retryData = await retryRes.json();
          return processSyncData(retryData);
        } else {
          return processSyncData(syncData);
        }
      } catch (e) { 
        console.error("Track 2 D1 Sync Error:", e); 
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
      if (!confData || !confData.basics || !confData.basics.strategy) {
        localStorage.removeItem(`vtotal_conf${slotNum}_${myUserId}`);
        localStorage.removeItem(`vtotal_snap${slotNum}_${myUserId}`);
        localStorage.removeItem(`vtotal_sheet_last_date_${slotNum}_${myUserId}`);
        localStorage.removeItem(`vtotal_sheet_existing_dates_${slotNum}_${myUserId}`);
        // ⭐️ 서버에 정보가 없으면 메모리의 이전 흔적도 깨끗이 비워줌
        slotConfigs[slotNum] = null;
        lastBTResults[slotNum] = null;
        globalMonthlyDataArr[slotNum] = null;
        globalYearlyDataArr[slotNum] = null;
        globalDailyDataArr[slotNum] = null;
        return;
      }

      // 호환성 처리: 시트에 저장된 구버전 전략명 마이그레이션
      if (confData.basics.strategy === 'RSI 3M') {
        confData.basics.strategy = '3M3D1-R';
      }

      localStorage.setItem(`vtotal_conf${slotNum}_${myUserId}`, JSON.stringify({ basics: confData.basics }));
      slotConfigs[slotNum] = confData;

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
          // 🚨 설정창의 갱신금(renewCash)을 덮어쓰는 로직을 삭제하여 사용자의 설정값을 보존합니다.
          localStorage.setItem(`vtotal_conf${slotNum}_${myUserId}`, JSON.stringify({ basics: confData.basics }));
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

          let mergedSnap = {
            ...realData,
            summary: isEngineNewer ? { ...pureEngineRes.summary, realPrincipal: realData.summary.realPrincipal } : realData.summary,
            inv: isEngineNewer ? pureEngineRes.inv : realData.inv,
            trades: reconstructRealTrades(perfSlotData.logs, slotNum),
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
                  const sheetLastDate = localStorage.getItem(`vtotal_sheet_last_date_${slotNum}_${myUserId}`);
                  if (state.date <= sheetLastDate) {
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
    if (isStatsMode) renderDBTradeHistory();

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

function checkAndRunAutoSave() {
  for (let i = 1; i <= MAX_SLOTS; i++) {
    const res = lastBTResults[i];
    if (!res || !res.dailyStates) continue;
    
    const existingDatesStr = localStorage.getItem(`vtotal_sheet_existing_dates_${i}_${myUserId}`) || "";
    const existingDatesSet = new Set(existingDatesStr ? existingDatesStr.split(",") : []);
    const newLogs = res.dailyStates.filter(s => !existingDatesSet.has(s.date));
    
    if (newLogs.length === 0) continue;
    
    setLED('loading');
    
    const tradesPayload = (res.trades || []).map(t => {
      return {
        buyDate: t.buyDate || t[1] || "",
        sellDate: t.sellDate || t[2] || "",
        mode: t.mode || t[3] || "SF",
        tier: parseInt(t.tier || t[4] || 1),
        buyPrice: parseFloat(t.buyPrice || t[5] || 0),
        sellPrice: parseFloat(t.sellPrice || t[6] || 0),
        qty: parseFloat(t.qty || t[7] || 0),
        profit: parseFloat(t.profit || t[8] || 0),
        totalBalance: parseFloat(t.totalBalance || t[9] || 0),
        renewCash: parseFloat(t.renewCash || t[10] || 0)
      };
    });
    
    const payload = {
      id: myUserId,
      slot: i,
      config: slotConfigs[i],
      states: newLogs.map(s => ({
        date: s.date,
        asset: s.asset,
        inout: s.inout || 0,
        json: s.json
      })),
      trades: tradesPayload,
      gasUrl: GAS_URL
    };
    
    fetch(`${CF_WORKER_URL}/api/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
      if (data.status === "success") {
        const maxDate = newLogs.reduce((max, s) => s.date > max ? s.date : max, "1900-01-01");
        localStorage.setItem(`vtotal_sheet_last_date_${i}_${myUserId}`, maxDate);
        
        newLogs.forEach(s => existingDatesSet.add(s.date));
        localStorage.setItem(`vtotal_sheet_existing_dates_${i}_${myUserId}`, Array.from(existingDatesSet).join(","));
        
        setLED('on');
        const header = document.getElementById('userDisplayHeader');
        if (header) {
          header.innerText = myUserId + " (D1 DB 자동 누계 완료!)";
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
      localStorage.removeItem(`vtotal_conf${targetSlot}_${myUserId}`);
      localStorage.removeItem(`vtotal_snap${targetSlot}_${myUserId}`);
      localStorage.removeItem(`vtotal_sheet_last_date_${targetSlot}_${myUserId}`);
      localStorage.removeItem(`vtotal_sheet_existing_dates_${targetSlot}_${myUserId}`);
      slotConfigs[targetSlot] = null;
      lastBTResults[targetSlot] = null;
      globalMonthlyDataArr[targetSlot] = null;
      globalYearlyDataArr[targetSlot] = null;
      globalDailyDataArr[targetSlot] = null;

      const payload = {
        id: myUserId,
        slot: targetSlot,
        config: null,
        states: [],
        trades: [],
        gasUrl: GAS_URL
      };

      if (navigator.onLine) {
        await fetch(`${CF_WORKER_URL}/api/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        showToast(`[V-QUANT 2-${targetSlot}] 비활성화 설정이 D1 DB에 반영되었습니다.`, "✅");
      } else {
        handleOfflineSave(payload);
      }

      updateSlotsVisibility();
      calculateCombinedPeriodData();
      renderChartAll();
      refreshStatsTable();
      updateCurrentStatusUI(targetSlot);

      if (btn) btn.innerHTML = orgText;
      return;
    }

    const targetRes = await runBacktestMemory(slotConfigs[targetSlot], false, targetSlot);

    if (!targetRes || targetRes.status === "error") {
      showToast("❌ 계산 중 오류가 발생했습니다.");
      if (btn) btn.innerHTML = orgText;
      return;
    }

    const sheetLastDate = localStorage.getItem(`vtotal_sheet_last_date_${targetSlot}_${myUserId}`) || "1900-01-01";
    const existingDatesStr = localStorage.getItem(`vtotal_sheet_existing_dates_${targetSlot}_${myUserId}`) || "";
    const existingDatesSet = new Set(existingDatesStr ? existingDatesStr.split(",") : []);

    let newLogs;
    if (sheetLastDate === "1900-01-01") {
      newLogs = targetRes.dailyStates || [];
    } else {
      newLogs = targetRes.dailyStates.filter(s => !existingDatesSet.has(s.date));
    }

    if (newLogs.length === 0) {
      if (confirm("반영할 새로운 기록이 없습니다. \n\n만약 4/20일 등의 과거 기록이 D1 DB에서 누락되었다면, [확인]을 눌러 전체 데이터를 강제로 다시 전송하시겠습니까?")) {
        newLogs = targetRes.dailyStates || [];
        localStorage.setItem(`vtotal_sheet_last_date_${targetSlot}_${myUserId}`, "1900-01-01");
        localStorage.removeItem(`vtotal_sheet_existing_dates_${targetSlot}_${myUserId}`);
      } else {
        if (btn) btn.innerHTML = orgText;
        return;
      }
    }

    if (btn) btn.innerText = '저장 중...';

    const trueSnap = lastBTResults[targetSlot];
    if (trueSnap && trueSnap.summary && newLogs.length > 0) {
      const lastLog = newLogs[newLogs.length - 1];
      lastLog.asset = trueSnap.summary.totalAssets;
      let parsed = JSON.parse(lastLog.json);
      parsed.cash = trueSnap.summary.cash;
      parsed.base_principal = trueSnap.summary.base;
      parsed.realPrincipal = trueSnap.summary.realPrincipal;
      parsed.holdings = trueSnap.inv.map(p => ({ ...p }));
      lastLog.json = JSON.stringify(parsed);
    }

    const tradesPayload = (targetRes.trades || []).map(t => {
      return {
        buyDate: t.buyDate || t[1] || "",
        sellDate: t.sellDate || t[2] || "",
        mode: t.mode || t[3] || "SF",
        tier: parseInt(t.tier || t[4] || 1),
        buyPrice: parseFloat(t.buyPrice || t[5] || 0),
        sellPrice: parseFloat(t.sellPrice || t[6] || 0),
        qty: parseFloat(t.qty || t[7] || 0),
        profit: parseFloat(t.profit || t[8] || 0),
        totalBalance: parseFloat(t.totalBalance || t[9] || 0),
        renewCash: parseFloat(t.renewCash || t[10] || 0)
      };
    });

    const payload = {
      id: myUserId,
      slot: targetSlot,
      config: slotConfigs[targetSlot],
      states: newLogs.map(s => ({
        date: s.date,
        asset: s.asset,
        inout: s.inout || 0,
        json: s.json
      })),
      trades: tradesPayload,
      gasUrl: GAS_URL
    };

    if (navigator.onLine) {
      await fetch(`${CF_WORKER_URL}/api/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (newLogs.length > 0) {
        let maxDate = sheetLastDate;
        const existingDatesStr = localStorage.getItem(`vtotal_sheet_existing_dates_${targetSlot}_${myUserId}`) || "";
        const existingDatesSet = new Set(existingDatesStr ? existingDatesStr.split(",") : []);

        newLogs.forEach(s => {
          if (s.date > maxDate) maxDate = s.date;
          existingDatesSet.add(s.date);
        });

        localStorage.setItem(`vtotal_sheet_last_date_${targetSlot}_${myUserId}`, maxDate);
        localStorage.setItem(`vtotal_sheet_existing_dates_${targetSlot}_${myUserId}`, Array.from(existingDatesSet).join(","));
      }

      showToast(`${newLogs.length}일치의 기록이 D1 DB에 반영되었습니다.`, "✅");
    } else {
      handleOfflineSave(payload);
    }
  } catch (err) {
    console.error("Save Error:", err);
    alert("저장 중 오류 발생: " + err.message);
  } finally {
    if (btn) btn.innerHTML = orgText;
  }
}

function resetSyncDates() {
  if (!confirm("🔄 모든 투자법의 DB 동기화 날짜 정보를 초기화하시겠습니까?\n\n(설정값은 지워지지 않으며, 다음 번 'DB에 반영' 클릭 시 누락된 모든 날짜가 D1 DB로 다시 전송됩니다.)")) return;
  for (let i = 1; i <= MAX_SLOTS; i++) {
    localStorage.setItem(`vtotal_sheet_last_date_${i}_${myUserId}`, "1900-01-01");
    localStorage.removeItem(`vtotal_sheet_existing_dates_${i}_${myUserId}`);
  }
  showToast("동기화 정보가 초기화되었습니다. DB 반영을 시도하세요.", "✅");
}

function handleOfflineSave(payload) {
  localStorage.setItem('vtotal_pending_sync', JSON.stringify(payload));
  alert("현재 오프라인입니다.\n데이터는 앱에 우선 저장되며 인터넷이 연결되면 다시 반영할수 있도록 안내해 드립니다.");
  showToast("오프라인: 앱에 우선 저장됨", "📴");
}

function checkPendingSync() {
  const pendingData = localStorage.getItem('vtotal_pending_sync');
  if (pendingData && navigator.onLine) {
    if (confirm("오프라인 상태에서 저장된 최신 데이터가 있습니다. 지금 D1 DB에 반영하시겠습니까?")) {
      const payload = JSON.parse(pendingData);
      fetch(`${CF_WORKER_URL}/api/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(r => r.json())
      .then(data => {
        if (data.status === "success") {
          localStorage.removeItem('vtotal_pending_sync');
          showToast("보류중인 데이터가 D1 DB에 성공적으로 반영되었습니다.");
        }
      }).catch(e => {
        showToast("서버 오류로 반영이 지연되었습니다.", "❌");
      });
    }
  }
}
window.addEventListener('online', checkPendingSync);

function initData(d) {
  if (!d || !d.basics) return; const b = d.basics;
  document.getElementById('ticker').value = b.ticker || '';
  document.getElementById('startDate').value = b.startDate || '';
  document.getElementById('endDate').value = b.endDate || '';
  document.getElementById('initialCash').value = formatComma(b.initialCash || '');
  document.getElementById('renewCash').value = formatComma(b.renewCash || '');
  document.getElementById('strategySelect').value = b.strategy || '';
  document.getElementById('fBase').value = b.fBase !== undefined ? b.fBase : '';
  document.getElementById('fSec').value = b.fSec !== undefined ? b.fSec : '';

  const pInput = document.getElementById('initialCash');
  const rInput = document.getElementById('renewCash');
  if (pInput && rInput) {
    pInput.oninput = function () { pInput.value = formatComma(pInput.value); };
    rInput.oninput = function () { rInput.value = formatComma(rInput.value); };
  }
  updateCurrentStatusUI(activeSettingsTab);
}

function handleStrategyChange(strategyName) { document.getElementById('strategySelect').value = strategyName; triggerOptimisticSave(); }

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
    return;
  }

  const s = res.summary;
  const sheetDate = localStorage.getItem(`vtotal_sheet_last_date_${slotNum}_${myUserId}`) || "-";
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

const fetchCalculateOrderFromServer = async (config, slotNum) => {
  try {
    const snapStr = localStorage.getItem(`vtotal_snap${slotNum}_${myUserId}`);
    if (!snapStr) return null;
    const snap = JSON.parse(snapStr);
    
    const statePayload = {
      cash: snap.summary.cash,
      base_principal: snap.summary.base,
      realPrincipal: snap.summary.realPrincipal || snap.summary.base,
      holdings: snap.inv || []
    };
    
    const reqBody = {
      config: config,
      state: statePayload,
      id: myUserId,
      slot: slotNum
    };
    
    const response = await fetch(`${CF_WORKER_URL}/api/calculate-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reqBody)
    });
    
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    const data = await response.json();
    if (data && data.status === "success") {
      const mergedRes = {
        ...snap,
        orders: data.orders,
        rawOrders: data.orders,
        nextOrderInfo: data.nextOrderInfo,
        orderDateStr: data.orderDateStr,
        currentStrat: data.currentStrat,
        inv: data.inv,
        isSynced: true
      };
      return mergedRes;
    }
    return null;
  } catch (err) {
    console.warn(`[CF-Order] API 주문 연산 실패 (로컬 엔진 폴백):`, err);
    return null;
  }
};

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
      let res = await fetchCalculateOrderFromServer(cfg, slotNum);
      if (!res) {
        res = await runBacktestMemory(cfg, false, slotNum);
      }
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
  if (!res) return;
  renderOrderTableSlot(res.orders, slotNum);
  renderHoldingsTableSlot(res.inv || [], res.currentStrat, slotNum);

  const nameEl = document.getElementById('orderSlot' + slotNum + 'Name');
  if (nameEl) nameEl.innerText = res.currentStrat || "";
  const holdingsNameEl = document.getElementById('holdingsSlot' + slotNum + 'Name');
  if (holdingsNameEl) holdingsNameEl.innerText = res.currentStrat || "";

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
      const titleText = isOrderView ? "🌐 통합 주문표" : (showIndividualHoldings ? "💼 보유현황 (투자법)" : "💼 통합 보유현황");
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
      const titleText = isOrderView ? "⚡ 통합+일반 주문표" : (showIndividualHoldings ? "💼 보유현황 (투자법)" : "💼 통합 보유현황");
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
      const titleText = isOrderView ? "⚡ 일반 개별 주문표" : (showIndividualHoldings ? "💼 보유현황 (투자법)" : "💼 개별 보유현황");
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
  const currPrice = parseFloat(res?.summary?.currPrice || res?.currPrice) || 0;

  const modeMap = { 'Middle': 'Mid1', 'Middle2': 'Mid2', 'Middle3': 'Mid3', 'SF': 'SF', 'AG': 'AG' };
  tbody.innerHTML = inv.map(o => {
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
      const buyPrice = parseFloat(o.buy_price || o.buyPrice) || 0;
      const qty = parseFloat(o.qty) || 0;
      const profit = (currPrice - buyPrice) * qty;
      const sign = profit < 0 ? "-" : "";
      if (isCurrencyKRW) {
        profitStr = sign + "₩" + Math.round(profit * currentFXRate).toLocaleString();
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

    return `<tr><td style="cursor:pointer; text-decoration:underline;" onclick="toggleIndividualHoldings(event)" title="클릭하여 통합 보유현황 토글">#${slotNum}</td><td>${buyDateStr}</td><td>${stopDateStr}</td><td>${displayMode}/T${o.tier}</td><td>${buyPriceStr}</td><td class="hide-on-cover sell-price" style="color:var(--danger);">${sellPriceStr}</td><td>${o.qty}</td><td class="${profitClass}" style="font-weight:700;">${profitStr}</td></tr>`;
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
    return `<tr><td class="${o[0] === '매수' ? 'buy' : 'sell'}">${sideText}</td><td class="hidden">${o[1]}</td><td>$${Number(o[2]).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td><td>${o[3]}주</td></tr>`;
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

function togglePeriodDisplayMode() {
  periodDisplayMode = (periodDisplayMode === 'chart') ? 'table' : 'chart';
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

function togglePeriodView() {
  const grid = document.getElementById('mainGrid');
  const isPerfTabLayout = grid && grid.classList.contains('perf-tab-layout');
  if (isPerfTabLayout) return; // 성과 탭 레이아웃에서는 타이틀 클릭 동작을 막음

  periodViewState = (periodViewState + 1) % 3;
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
    if (titleEl) titleEl.innerText = getSlotConfig(slotNum)?.basics?.strategy || `V-QUANT 2-${slotNum}`;
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

  const fmtRate = (r) => { const v = (r * 100); return (v > 0 ? '+' : '') + v.toFixed(1) + '%'; };
  const fmtProfit = (p) => {
    if (isCurrencyKRW) {
      let val = Math.round((p * currentFXRate) / 10000);
      return (val > 0 ? '+' : (val < 0 ? '-' : '')) + Math.abs(val).toLocaleString() + '만';
    } else {
      let val = Math.round(p);
      return (val > 0 ? '+$' : (val < 0 ? '-$' : '$')) + Math.abs(val).toLocaleString();
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
  if (myUserId) {
    localStorage.setItem(`vtotal_pref_theme_${myUserId}`, val);
    if (val === 'light') document.body.classList.add('light-mode');
    else document.body.classList.remove('light-mode');
    if (periodDisplayMode === 'chart') renderPeriodBarChart();
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
  if (grid && grid.classList.contains('perf-tab-layout')) {
    const btn = document.createElement('button');
    btn.id = 'statsCurrencyToggle';
    btn.className = 'btn-currency-toggle';
    btn.onclick = toggleCurrencyMode;
    btn.style.marginLeft = "auto";
    btn.style.background = "none";
    btn.style.color = "var(--text)";
    btn.style.border = "none";
    btn.style.outline = "none";
    btn.style.padding = "4px";
    btn.style.fontSize = "11px";
    btn.style.fontWeight = "bold";
    btn.style.cursor = "pointer";
    btn.style.transition = "all 0.2s";
    btn.style.display = "flex";
    btn.style.alignItems = "center";
    btn.style.justifyContent = "center";
    btn.style.minWidth = "40px";
    btn.style.boxShadow = "none";
    actionArea.appendChild(btn);
    if (typeof syncCurrencyUI === 'function') syncCurrencyUI();
  }

  const tableContainer = document.getElementById('statsTableContainer');
  const chartContainer = document.getElementById('statsChartContainer');
  const selector = document.getElementById('statsMetricSelector');

  if (grid && (grid.classList.contains('perf-tab-layout') || grid.classList.contains('backtest-view-layout'))) {
    // 성과지표 또는 백테스트 뷰: 표 컨테이너 강제 표시, 차트/선택기 강제 숨김
    if (tableContainer) tableContainer.style.display = 'block';
    if (chartContainer) chartContainer.style.display = 'none';
    if (selector) selector.style.display = 'none';
    if (actionArea) actionArea.style.display = 'flex';
    renderOriginalStatsTable(table);
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

  for (let i = 1; i <= MAX_SLOTS; i++) {
    if (isSlotActive(i)) {
      activeCount++;
      rows.push({
        res: getBestResult(lastBTResults[i], i),
        name: getSlotConfig(i)?.basics?.strategy || `V-QUANT 2-${i}`,
        color: SLOT_COLORS[(i - 1) % SLOT_COLORS.length]
      });
    }
  }

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
        return num > 0 ? `<span class="val-plus">+${str}</span>` : (num < 0 ? `<span class="val-minus">-${str}</span>` : `<span>${str}</span>`);
      } else {
        let str = isCurrencyKRW ? Math.round(Math.abs(num) * fx / 10000).toLocaleString() + '만' : '$' + Math.round(Math.abs(num)).toLocaleString();
        return num > 0 ? `<span class="val-plus">+${str}</span>` : (num < 0 ? `<span class="val-minus">-${str}</span>` : `<span>${str}</span>`);
      }
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
    { key: 'currPrice', label: '현재가', type: 'price' },
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
    const displaySummary = r.res ? r.res.summary : null;
    html += `<div class="stats-row" style="display:flex; align-items:center; gap:1px; border-radius:3px; padding:2px 3px 2px 0px; box-sizing:border-box; line-height:1; min-height:18px; width:100%;">`;
    html += `<div style="font-size:11px; font-weight:700; letter-spacing:-0.2px; line-height:1; width:56px; min-width:56px; max-width:56px; flex-shrink:0; color:${r.color}; display:flex; align-items:center; justify-content:flex-start; text-align:left; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${r.name}</div>`;
    metricsList.forEach(m => {
      let cellVal = fmtValue(displaySummary, m, isCombo);
      const minWidth = (m.key === 'totalAssets') ? '72px' : '50px';
      html += `<div style="flex:1; min-width:${minWidth}; font-size:var(--app-font-size, 10.5px); font-weight:400; display:flex; align-items:center; justify-content:center; text-align:center; line-height:1; white-space:nowrap;">${cellVal}</div>`;
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
    sheetDate = localStorage.getItem(`vtotal_sheet_last_date_${slotNum}_${myUserId}`) || "-";
  }
  
  let displayTotal = s.totalAssets !== undefined ? s.totalAssets : (s.total_assets || 0);
  let displayBase = s.base !== undefined ? s.base : (s.base_principal || 0);
  let displayPrincipal = s.realPrincipal !== undefined ? s.realPrincipal : (s.base || 0);
  let displayCash = s.cash !== undefined ? s.cash : 0;
  let displayEval = s.evalVal !== undefined ? s.evalVal : 0;
  let displayQty = s.qty !== undefined ? s.qty : 0;
  let displayCurrentMdd = s.currentMdd !== undefined ? s.currentMdd : 0;
  let displayYield = displayPrincipal > 0 ? (displayTotal - displayPrincipal) / displayPrincipal : 0;
  let displayEvalReturn = s.evalReturn !== undefined ? s.evalReturn : 0;
  let displayDepletion = s.depletion !== undefined ? s.depletion : 0;
  let displayAvgPrice = s.avgPrice !== undefined ? s.avgPrice : 0;
  
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
  
  let displayTotalProfit = displayTotal - displayPrincipal;
  
  return {
    date: sheetDate,
    totalAssets: displayTotal,
    base: displayBase,
    cash: displayCash,
    evalVal: displayEval,
    realPrincipal: displayPrincipal,
    qty: displayQty,
    currentMdd: displayCurrentMdd,
    yield: displayYield,
    evalReturn: displayEvalReturn,
    totalProfit: displayTotalProfit,
    depletion: displayDepletion,
    avgPrice: displayAvgPrice
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

  const fmtValueNew = (data, m) => {
    if (!data) return '-';
    let v = data[m.key];
    if (v === undefined || v === null) return '-';
    
    const fx = isCurrencyKRW ? currentFXRate : 1450;
    
    if (m.key === 'date') return v;
    
    if (m.type === 'fmt') {
      if (isCurrencyKRW) return Math.round(Number(v) * fx / 10000).toLocaleString() + '만';
      return '$' + Math.round(Number(v)).toLocaleString();
    }
    if (m.type === 'color') {
      let num = Number(v);
      if (m.pct) {
        let str = (Math.abs(num) * 100).toFixed(1) + '%';
        return num > 0 ? `<span class="val-plus">+${str}</span>` : (num < 0 ? `<span class="val-minus">-${str}</span>` : `<span>${str}</span>`);
      } else {
        let str = isCurrencyKRW ? Math.round(Math.abs(num) * fx / 10000).toLocaleString() + '만' : '$' + Math.round(Math.abs(num)).toLocaleString();
        return num > 0 ? `<span class="val-plus">+${str}</span>` : (num < 0 ? `<span class="val-minus">-${str}</span>` : `<span>${str}</span>`);
      }
    }
    if (m.type === 'price') {
      return '$' + Number(v).toFixed(2);
    }
    if (m.type === 'raw') {
      return v + (m.suffix || '');
    }
    return v;
  };

  const metricsList = [
    { key: 'date', label: '날짜', type: 'raw' },
    { key: 'totalAssets', label: '총자산', type: 'fmt' },
    { key: 'base', label: '갱신금', type: 'fmt' },
    { key: 'cash', label: '예수금', type: 'fmt' },
    { key: 'evalVal', label: '평가금', type: 'fmt' },
    { key: 'realPrincipal', label: '원금', type: 'fmt' },
    { key: 'yield', label: '수익률', type: 'color', pct: true },
    { key: 'totalProfit', label: '수익금', type: 'color' },
    { key: 'evalReturn', label: '평가수익', type: 'color', pct: true },
    { key: 'qty', label: '주식수', type: 'raw', suffix: '주' },
    { key: 'avgPrice', label: '평균단가', type: 'price' },
    { key: 'currentMdd', label: '현재 MDD', type: 'color', pct: true },
    { key: 'depletion', label: '진행도', type: 'color', pct: true }
  ];

  let html = '<div style="display:flex; flex-direction:column; width:100%; gap:1px; padding:2px; box-sizing:border-box;">';
  
  // 첫 번째 헤더 행: 구분 | 통합 합산 | #1 투자법...
  html += '<div style="display:flex; align-items:center; gap:1px; padding:2px 3px; box-sizing:border-box; line-height:1; height:18px; border-bottom:1px solid rgba(255,255,255,0.1); width:100%;">';
  html += '<div style="font-size:10.5px; font-weight:700; letter-spacing:-0.2px; line-height:1; min-width:50px; flex-shrink:0; color:var(--text-muted); text-align:left; padding-left:2px;">구분</div>';
  rows.forEach(r => {
    html += `<div style="flex:1; min-width:80px; font-size:10.5px; font-weight:700; letter-spacing:-0.2px; line-height:1; text-align:center; color:${r.color}; white-space:nowrap;">${r.name}</div>`;
  });
  html += '</div>';

  // 각 지표 행 생성
  metricsList.forEach(m => {
    html += `<div class="stats-row" style="display:flex; align-items:center; gap:1px; border-radius:3px; padding:2px 3px; box-sizing:border-box; line-height:1; min-height:18px; width:100%;">`;
    html += `<div style="font-size:10.5px; font-weight:700; letter-spacing:-0.2px; line-height:1; min-width:50px; flex-shrink:0; color:var(--text-muted); display:flex; align-items:center; justify-content:flex-start; text-align:left; padding-left:2px;">${m.label}</div>`;
    rows.forEach(r => {
      const data = getDisplayStatusData(r.res, r.slotNum);
      const cellVal = fmtValueNew(data, m);
      html += `<div style="flex:1; min-width:80px; font-size:var(--app-font-size, 10.5px); font-weight:400; text-align:center; line-height:1; white-space:nowrap;">${cellVal}</div>`;
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
      if (activeScrollTarget) return;
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

  setupSwipe('orderHeader', () => toggleOrderView());
  setupSwipe('monthlyHeader', () => togglePeriodView());

  // ⭐️ 안전한 순환 로직: 무한루프 방지 및 비어있는 슬롯 자동 건너뛰기
  setupSwipe('panelChart', (dir) => {
    let activeCount = 0;
    for (let i = 1; i <= MAX_SLOTS; i++) if (isSlotActive(i)) activeCount++;
    if (activeCount === 0) return;

    if (dir === 'left') {
      do {
        chartViewMode = (chartViewMode + 1) % (MAX_SLOTS + 1);
      } while (chartViewMode > 0 && !isSlotActive(chartViewMode));
    } else {
      do {
        chartViewMode = (chartViewMode - 1 + (MAX_SLOTS + 1)) % (MAX_SLOTS + 1);
      } while (chartViewMode > 0 && !isSlotActive(chartViewMode));
    }
    renderChartAll();
  });

  setupSwipe('panelStats', () => showOrderView());
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
  const activeSlotName = (activeSettingsTab <= MAX_SLOTS) ? `V-QUANT 2-${activeSettingsTab}` : "V-QUANT 2";
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
    await checkAndSyncWithServer(false); // ⭐️ 서버 데이터 강제 다시 불러오기
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
        if (res && res.trades) {
          console.log(`[매매내역] 슬롯 #${i} 거래 데이터 수:`, res.trades.length);
          
         // 💡 [최종 핵심 수정] 존재하지 않는 변수 대신, 엔진 결과(res) 안에 이미 
          // 안전하게 저장되어 있는 '현재가(currPrice)'를 직접 꺼내어 덮어씌웁니다!
          const slotTrades = res.trades.map(t => {
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
        <td style="width:14%; padding:2px 1px; text-align:center; color:var(--text-muted); font-size:10px;">${buyDate}</td>
        <td style="width:14%; padding:2px 1px; text-align:center; font-size:10px;">${sellDate}</td>
        <td style="width:12%; padding:2px 1px; text-align:center; font-size:10px;">${mode}/T${tier}</td>
        <td style="width:12%; padding:2px 1px; text-align:center; font-size:10px;">${buyPriceStr}</td>
        <td style="width:12%; padding:2px 1px; text-align:center; font-size:10px;">${sellPriceStr}</td>
        <td style="width:12%; padding:2px 1px; text-align:center; font-size:10px;">${qty}</td>
        <td style="width:12%; padding:2px 1px; text-align:center; font-weight:700; font-size:10px;" class="${profitClass}">${profitStr}</td>
      </tr>`;
    }).join('');
    console.log("[매매내역] 렌더링 완료. 총 거래 건수:", allTrades.length);
  } catch (e) {
    console.error("[매매내역] 렌더링 중 런타임 오류 발생:", e);
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:var(--danger);">매매 내역 로딩 중 오류가 발생했습니다. (콘솔 확인 요망)</td></tr>`;
  }
}

// ⭐️ [신규] holdings 상태 변화를 역추적하여 실제 체결된 실전 매매(청산) 내역을 복원해주는 알고리즘
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
  if (grid && (grid.classList.contains('perf-tab-layout') || grid.classList.contains('backtest-view-layout'))) {
    return;
  }
  statsDisplayMode = statsDisplayMode === 'table' ? 'chart' : 'table';
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

// 도넛 차트 업데이트 로직
window.updateStatsPieChart = function() {
  if (statsDisplayMode !== 'chart') return;
  const selector = document.getElementById('statsMetricSelector');
  if (!selector) return;
  
  const metric = selector.value;
  const labels = [];
  const data = [];
  const bgColors = [];
  
  // 데이터 수집
  for (let i = 1; i <= MAX_SLOTS; i++) {
    if (isSlotActive(i)) {
      const s = getDisplayStatusData(getBestResult(lastBTResults[i], i), i);
      if (s) {
        let val = s[metric] || 0;
        if (metric === 'evalVal' || metric === 'totalAssets' || metric === 'base' || metric === 'cash' || metric === 'realPrincipal') {
            val = Math.max(0, val); // 마이너스는 0 처리 (자산 규모 기준)
        }
        
        const name = getSlotConfig(i)?.basics?.strategy ? getSlotConfig(i).basics.strategy : `투자법 ${i}`;
        labels.push(name);
        data.push(val);
        bgColors.push(SLOT_COLORS[(i - 1) % SLOT_COLORS.length]);
      }
    }
  }
  
  // HTML 범례 렌더링 (범례 박스는 우측 코너 고정하되, 내부 아이템은 색상칩 기준 좌측 1열 정렬)
  const legendContainer = document.getElementById('statsChartLegend');
  if (legendContainer) {
    let legendHtml = '';
    labels.forEach((label, idx) => {
      const color = bgColors[idx];
      legendHtml += `
        <div style="display:flex; align-items:center; gap:5px; justify-content:flex-start; width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          <span style="display:inline-block; width:7px; height:7px; background-color:${color}; border-radius:1.5px; flex-shrink:0;"></span>
          <span style="font-size:9px; color:var(--text); text-align:left; overflow:hidden; text-overflow:ellipsis; max-width:85px;" title="${label}">${label}</span>
        </div>
      `;
    });
    legendContainer.innerHTML = legendHtml;
  }
  
  // 차트 렌더링
  const canvas = document.getElementById('statsPieChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  if (statsPieChartInstance) {
    statsPieChartInstance.destroy();
  }
  
  const isDark = !document.body.classList.contains('light-mode');
  const textColor = isDark ? '#f8fafc' : '#0f172a';

  // 중앙 텍스트 플러그인 정의
  const centerTextPlugin = {
    id: 'centerText',
    afterDraw: function(chart) {
      const { ctx, chartArea: { left, right, top, bottom } } = chart;
      ctx.save();
      
      const dataset = chart.data.datasets[0];
      const total = dataset.data.reduce((acc, val) => acc + val, 0);
      
      const selector = document.getElementById('statsMetricSelector');
      const metricText = selector ? selector.options[selector.selectedIndex].text : '합계';
      
      const fx = typeof currentFxRate !== 'undefined' ? currentFxRate : 1350;
      const isCurrencyKRW = localStorage.getItem('vtotal_currency_mode') === 'KRW';
      let totalString = '';
      if (isCurrencyKRW) {
        const valInKRW = total * fx;
        if (valInKRW >= 100000000) {
          totalString = '₩' + (valInKRW / 100000000).toFixed(2) + '억';
        } else {
          totalString = '₩' + Math.round(valInKRW / 10000).toLocaleString() + '만';
        }
      } else {
        totalString = '$' + Math.round(total).toLocaleString();
      }

      const centerX = (left + right) / 2;
      const centerY = (top + bottom) / 2;
      
      // 메트릭 이름 그리기 (다소 작게, 투명하게)
      ctx.font = '500 10px Outfit, Inter, sans-serif';
      ctx.fillStyle = isDark ? 'rgba(248, 250, 252, 0.6)' : 'rgba(15, 23, 42, 0.6)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(metricText + ' 합계', centerX, centerY - 10);
      
      // 수치 그리기 (크고 굵게)
      ctx.font = 'bold 14px Outfit, Inter, sans-serif';
      ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
      ctx.fillText(totalString, centerX, centerY + 10);
      
      ctx.restore();
    }
  };

  // 외곽 수치 및 지시선 렌더링 플러그인 정의
  const doughnutLabelsPlugin = {
    id: 'doughnutLabels',
    afterDraw: function(chart) {
      const { ctx } = chart;
      if (chart.config.type !== 'doughnut') return;
      
      ctx.save();
      
      const isDark = !document.body.classList.contains('light-mode');
      const lineColor = isDark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(15, 23, 42, 0.35)';
      const textColor = isDark ? '#f1f5f9' : '#1e293b';
      
      const dataset = chart.data.datasets[0];
      const total = dataset.data.reduce((acc, val) => acc + val, 0);
      if (total === 0) {
        ctx.restore();
        return;
      }
      
      const meta = chart.getDatasetMeta(0);
      meta.data.forEach((element, index) => {
        const val = dataset.data[index];
        const percentage = (val / total * 100).toFixed(1);
        
        // 2% 미만 데이터는 텍스트가 겹치기 쉬우므로 표시 생략
        if (parseFloat(percentage) < 2.0) return;
        
        // 각도 및 반경 계산
        const midAngle = (element.startAngle + element.endAngle) / 2;
        const outerRadius = element.outerRadius;
        const isRight = Math.cos(midAngle) >= 0;
        
        // 1. 지시선 시작점 (조각 외곽 경계선 중심)
        const x1 = element.x + Math.cos(midAngle) * outerRadius;
        const y1 = element.y + Math.sin(midAngle) * outerRadius;
        
        // 2. 꺾임점 (좁은 화면에서도 밖으로 탈출하여 잘리지 않도록 좌우 모두 8px로 매우 타이트하게 조절)
        const lineLen = 8;
        const x2 = element.x + Math.cos(midAngle) * (outerRadius + lineLen);
        const y2 = element.y + Math.sin(midAngle) * (outerRadius + lineLen);
        
        // 3. 수평 연장선 종점 (텍스트 방향에 맞춰 8px 연장)
        const hLen = 8;
        const x3 = x2 + (isRight ? hLen : -hLen);
        const y3 = y2;
        
        // 4. 지시선(꺾임선) 그리기
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x3, y3);
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // 5. 시작점에 작은 원(dot) 그리기 (디테일 퀄리티 향상)
        ctx.beginPath();
        ctx.arc(x1, y1, 2.5, 0, 2 * Math.PI);
        ctx.fillStyle = dataset.backgroundColor[index];
        ctx.fill();
        ctx.strokeStyle = isDark ? '#1e293b' : '#ffffff';
        ctx.lineWidth = 0.75;
        ctx.stroke();
        
        // 6. 수치 텍스트 포맷팅 (투자법 이름은 제외하고 금액과 비율만 표시!)
        const fx = typeof currentFxRate !== 'undefined' ? currentFxRate : 1350;
        const isCurrencyKRW = localStorage.getItem('vtotal_currency_mode') === 'KRW';
        let priceStr = '';
        if (isCurrencyKRW) {
          priceStr = Math.round(val * fx / 10000).toLocaleString() + '만';
        } else {
          priceStr = '$' + Math.round(val).toLocaleString();
        }
        
        const labelText = `${priceStr} (${percentage}%)`;
        
        // 7. 텍스트 드로잉 (수평 지시선 위/아래로 나누어 겹침 방지 및 가로 잘림 원천 봉쇄)
        const isTopHalf = Math.sin(midAngle) < 0;
        ctx.font = 'bold 9.2px Outfit, Inter, sans-serif';
        ctx.fillStyle = textColor;
        ctx.textAlign = isRight ? 'left' : 'right';
        ctx.textBaseline = isTopHalf ? 'bottom' : 'top';
        
        // 수평선 위/아래로 미세 간격을 둠
        const textX = x3 + (isRight ? 3 : -3);
        const textY = y3 + (isTopHalf ? -1 : 1);
        ctx.fillText(labelText, textX, textY);
      });
      
      ctx.restore();
    }
  };

  const chartPlugins = [centerTextPlugin, doughnutLabelsPlugin];

  statsPieChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: bgColors,
        borderWidth: isDark ? 2 : 1,
        borderColor: isDark ? '#1e293b' : '#ffffff',
        borderRadius: 5, // 조각 둥글게
        hoverOffset: 8,  // 호버 효과 돌출
        spacing: 2       // 조각 간의 간격 띄움
      }]
    },
    plugins: chartPlugins,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          top: 15,
          bottom: 15,
          left: 20,    // 좌측 마진을 35px -> 20px로 조절하여 도넛을 좌측으로 최대한 당김
          right: 20    // 우측 마진 유지
        }
      },
      cutout: '72%', // 링을 조금 더 얇게 하여 텍스트가 들어갈 도넛 중심 영역 확보
      plugins: {
        legend: {
          display: false // 내장 범례는 숨기고 HTML 범례로 대체
        },
        tooltip: {
          enabled: true,
          callbacks: {
            label: function(context) {
              let label = context.label || '';
              if (label) label += ': ';
              const val = context.raw;
              const fx = typeof currentFxRate !== 'undefined' ? currentFxRate : 1350;
              const isCurrencyKRW = localStorage.getItem('vtotal_currency_mode') === 'KRW';
              if (isCurrencyKRW) {
                label += Math.round(val * fx / 10000).toLocaleString() + '만원';
              } else {
                label += '$' + Math.round(val).toLocaleString();
              }
              return label;
            }
          }
        }
      }
    }
  });
};
