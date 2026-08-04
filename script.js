
// 🛡️ Chart.js DOM detach 시 ownerDocument null 예외 안전 방어 래퍼
function safeChartResize(chartInstance) {
  if (!chartInstance || typeof chartInstance.resize !== 'function') return;
  try {
    const canvas = chartInstance.canvas;
    if (canvas && canvas.ownerDocument && document.body.contains(canvas)) {
      chartInstance.resize();
    }
  } catch (e) {
    // DOM 트리가 잠시 떨어진 경우의 resize 예외 무시
  }
}
window.safeChartResize = safeChartResize;
// script.js (UI 컨트롤, 데이터 통신 및 차트 렌더링 - 6슬롯 무한 확장 버전)

const GAS_URL = "https://script.google.com/macros/s/AKfycbxUSDds-kN5QQL9cvuNeSJuw6YAImIp-N8XK699Ov2cmIP1tfizXUuT87ECVgvVlU8V/exec";
// 읽기(GET_ALL_INIT)는 Worker3(GCP Sheets API 통로)를 우선 사용하고 실패 시 위 GAS_URL로 폴백한다.
// 쓰기(로그인/입출금/자동저장)는 그대로 GAS_URL을 사용한다.
const BACKTEST_LOG_SPREADSHEET_ID = "1SrDC8Gkm8ztodtvt_oAOSEQMHE2U-CphetIMz7qWqQY";
const APP_VERSION = "3.642";
const MAX_SLOTS = 6;
const APP_RUNTIME_VERSION_KEY = "vtotal3_runtime_version";
const TRANSIENT_CACHE_PREFIXES = [
  "vtotal3_snap",
  "vtotal3_manual_BT_",
  "vtotal3_sheet_last_date_",
  "vtotal3_sheet_existing_dates_",
  "vtotal3_snap_combined_"
];

// ✨ Snapshot 최적화: 필요한 필드만 저장 (50KB → 20KB)
function minifySnapshot(snap) {
  if (!snap) return snap;
  return {
    summary: snap.summary,
    chartDates: snap.chartDates,
    chartBalances: snap.chartBalances,
    chartInout: snap.chartInout,
    chartMdd: snap.chartMdd,
    yearlyData: snap.yearlyData,
    monthlyData: snap.monthlyData,
    dailyData: snap.dailyData,
    // ⭐️ 홈 화면(주문표/보유현황) 및 매도내역 복원에 필요한 필드
    orders: snap.orders,
    rawOrders: snap.rawOrders,
    inv: snap.inv,
    currentStrat: snap.currentStrat,
    nextOrderInfo: snap.nextOrderInfo,
    orderDateStr: snap.orderDateStr,
    trades: snap.trades
  };
}

function saveSnapshot(snap, slotNum, userId) {
  try {
    const minified = minifySnapshot(snap);
    minified.savedAt = Date.now();
    localStorage.setItem(`vtotal3_snap${slotNum}_${userId}`, JSON.stringify(minified));
  } catch (e) {
    console.error(`Snapshot 저장 실패 [슬롯${slotNum}]:`, e.message);
  }
}

function loadSnapshot(slotNum, userId) {
  try {
    const str = localStorage.getItem(`vtotal3_snap${slotNum}_${userId}`);
    return str ? JSON.parse(str) : null;
  } catch (e) {
    console.error(`Snapshot 로드 실패 [슬롯${slotNum}]:`, e.message);
    return null;
  }
}

// 🏆 BT 랭킹 결과 저장/복원
function saveBTResult(result, slotNum, userId) {
  try {
    const minified = minifySnapshot(result);
    localStorage.setItem(`vtotal3_manual_BT_${slotNum}_${userId}`, JSON.stringify(minified));
  } catch (e) {
    console.error(`BT 결과 저장 실패 [슬롯${slotNum}]:`, e.message);
  }
}

function loadBTResult(slotNum, userId) {
  try {
    const str = localStorage.getItem(`vtotal3_manual_BT_${slotNum}_${userId}`);
    return str ? JSON.parse(str) : null;
  } catch (e) {
    console.error(`BT 결과 로드 실패 [슬롯${slotNum}]:`, e.message);
    return null;
  }
}

function clearTransientAppCaches() {
  const removableKeys = [];

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (TRANSIENT_CACHE_PREFIXES.some(prefix => key.startsWith(prefix))) {
        removableKeys.push(key);
      }
    }

    removableKeys.forEach((key) => localStorage.removeItem(key));
  } catch (e) {
    console.warn("임시 캐시 정리 중 오류:", e);
  }

  try {
    if (window.cachedPriceMap && typeof window.cachedPriceMap === "object") {
      window.cachedPriceMap = {};
    }
  } catch (e) { }

}

function syncRuntimeVersion() {
  try {
    const savedVersion = localStorage.getItem(APP_RUNTIME_VERSION_KEY);
    if (savedVersion !== APP_VERSION) {
      clearTransientAppCaches();
      localStorage.setItem(APP_RUNTIME_VERSION_KEY, APP_VERSION);
    }
  } catch (e) {
    console.warn("런타임 버전 동기화 실패:", e);
  }
}

syncRuntimeVersion();

// ===== Chart.js 병렬 로드 관리 =====
// chart.js 로드를 비동기로 확인하여 Promise 반환
// 이미 로드되었으면 즉시 resolve, 아니면 동적 로드
function ensureChartLoaded() {
  return new Promise((resolve) => {
    // 이미 Chart.js가 로드됨
    if (window.Chart) {
      resolve();
      return;
    }

    // Chart.js 동적 로드
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';

    script.onload = () => {
      console.log('[병렬로드] Chart.js 로드 완료');
      resolve();
    };

    script.onerror = () => {
      console.warn('[병렬로드] Chart.js 로드 실패, 계속 진행');
      resolve(); // 실패해도 진행
    };

    document.head.appendChild(script);
  });
}

window.ensureChartLoaded = ensureChartLoaded;

// ===== UI 모듈에서 접근 가능하도록 window 객체에 모든 전역 변수 할당 =====
// 이 섹션은 ui/*.js 모듈들이 script.js의 전역 변수에 접근할 수 있도록 합니다.
// script.js가 로드될 때까지 UI 모듈들이 미리 준비할 수 있도록 합니다.

function formatStrategyNameWithSmallParentheses(name) {
  if (!name) return '';
  return name.replace(/\(([^)]+)\)/g, '<span class="stats-profit-rate">($1)</span>');
}
window.formatStrategyNameWithSmallParentheses = formatStrategyNameWithSmallParentheses;

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
let periodDisplayMode = 'table';
let yearlyDisplayMode = 'table'; // 'chart' 또는 'table'
let monthlyDisplayMode = 'table'; // 'chart' 또는 'table'
let dailyDisplayMode = 'table'; // 'chart' 또는 'table'
let isManualBacktestMode = false;
let lastManualBTResults = {}; // 🔒 백테스트 결과 별도 보관 (실전 데이터로 덮어씌워지지 않도록)
let chartViewMode = 0;
let showIndividualHoldings = false;
let statsDisplayMode = "chart";
let perfStatsMode = "stats";    // 성과모드 전용: stats | realtime
let backtestStatsMode = "performance";
let statsPieChartInstance = null;

// Window에 기본 변수들 할당
window.myUserId = myUserId;
window.myChart = myChart;
window.currentOrderDate = currentOrderDate;
window.isOrderView = isOrderView;
window.isCombinedOrderMode = isCombinedOrderMode;
window.isStatsMode = isStatsMode;
window.isViewingHistory = isViewingHistory;
window.lastMyPerfData = lastMyPerfData;
window.perfLastCheckTime = perfLastCheckTime;
window.activeSettingsTab = activeSettingsTab;
window.periodViewState = periodViewState;
window.periodDisplayMode = periodDisplayMode;
window.yearlyDisplayMode = yearlyDisplayMode;
window.monthlyDisplayMode = monthlyDisplayMode;
window.dailyDisplayMode = dailyDisplayMode;
window.isManualBacktestMode = isManualBacktestMode;
window.lastManualBTResults = lastManualBTResults; // 🔒 BT랭킹이 window 경유로 참조 (객체 재할당 금지 — 속성만 갱신할 것)

// 🏆 localStorage에서 이전 BT 결과 복원
// ⚠️ 이 시점엔 myUserId가 아직 빈 문자열(로그인 복원 전)이라, 저장 시 사용한
//    실제 아이디를 localStorage에서 직접 읽어와야 키가 일치한다.
{
  const btSavedId = localStorage.getItem('vtotal3_id') || "";
  for (let i = 1; i <= MAX_SLOTS; i++) {
    const btRes = loadBTResult(i, btSavedId);
    if (btRes) {
      lastManualBTResults[i] = btRes;
    }
  }
}

window.chartViewMode = chartViewMode;
window.showIndividualHoldings = showIndividualHoldings;
window.statsDisplayMode = statsDisplayMode;
window.perfStatsMode = perfStatsMode;
window.backtestStatsMode = backtestStatsMode;
window.statsPieChartInstance = statsPieChartInstance;

function getStatsDisplayModeKey() {
  return `vtotal3_stats_display_mode_${myUserId || 'guest'}`;
}

function getPerfStatsModeKey() {
  return `vtotal3_perf_stats_mode_${myUserId || 'guest'}`;
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

// Window에 동적 상태 배열 및 상수 할당
window.slotConfigs = slotConfigs;
window.simulationConfigs = simulationConfigs;
window.lastBTResults = lastBTResults;
window.globalMonthlyDataArr = globalMonthlyDataArr;
window.globalYearlyDataArr = globalYearlyDataArr;
window.globalDailyDataArr = globalDailyDataArr;
window.globalCombinedMonthlyData = globalCombinedMonthlyData;
window.globalCombinedYearlyData = globalCombinedYearlyData;
window.globalCombinedDailyData = globalCombinedDailyData;
window.SLOT_COLORS = SLOT_COLORS;
window.MAX_SLOTS = MAX_SLOTS;
window.APP_VERSION = APP_VERSION;
window.GAS_URL = GAS_URL;

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
        <div class="slot-title swipe-handler" style="color:${SLOT_COLORS[(i - 1) % SLOT_COLORS.length]};" id="slot${i}TableName${suffix}">A-QUANT 2-${i}</div>
        <table class="data-table" id="periodTable${i}${suffix}">
          <thead><tr id="periodTableHead${i}${suffix}">${headDataStr}</tr></thead>
          <tbody id="periodBody${i}${suffix}"><tr><td colspan="3" class="table-empty-cell">데이터 대기 중...</td></tr></tbody>
        </table>
      </div>`;
  }

  tableContainer.innerHTML = tableHtml;
}


// 2. 초기 로드 및 편의 함수
// (generateDynamicDOM은 initAppImmediate에서 호출됨 — 여기서 중복 등록하면 매 로드마다 2회 실행)

async function forceUpdateApp() {
  if (confirm(`현재 버전: ${APP_VERSION}\n앱 데이터를 강제로 공장초기화(Hard Reset)할까요?\n\n이 작업은 로컬 스토리지, IndexedDB, 그리고 서비스 워커 캐시를 완전히 삭제하여 앱을 최초 상태로 복원합니다.`)) {
    try {
      // 1. IndexedDB 전체 삭제 (구버전 캐시 DB 포함, 이름 상관없이 모두)
      if (window.indexedDB && indexedDB.databases) {
        const dbs = await indexedDB.databases();
        dbs.forEach(db => { if (db.name) indexedDB.deleteDatabase(db.name); });
      }
      
      // 2. 스토리지 비우기
      localStorage.clear();
      sessionStorage.clear();

      // 3. 서비스 워커 캐시 스토리지 전체 제거
      if ('caches' in window && window.location.protocol !== 'file:') {
        const keys = await caches.keys();
        await Promise.all(keys.map(key => caches.delete(key)));
      }

      // 4. 등록된 서비스 워커 모두 해제
      if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          await reg.unregister();
        }
      }
      
      alert("✅ 공장초기화가 완료되었습니다. 앱을 재부팅합니다.");
    } catch (e) {
      alert("초기화 중 일부 오류가 발생했습니다: " + e.message);
    }
    const reloadUrl = new URL(window.location.href);
    reloadUrl.searchParams.set('v', APP_VERSION);
    reloadUrl.searchParams.set('reset', Date.now().toString());
    window.location.replace(reloadUrl.toString());
  }
}

function togglePriceInfoTicker() {
  const tickers = ['total', 'SOXL', 'TQQQ', 'SOXX', 'QQQ'];
  const currentTicker = window.priceInfoTicker || 'total';
  const currentIndex = tickers.indexOf(currentTicker);
  const nextIndex = (currentIndex + 1) % tickers.length;
  const nextTicker = tickers[nextIndex];

  const selector = document.getElementById('priceInfoTickerSelector');
  if (selector) selector.value = nextTicker;

  if (typeof window.changePriceInfoTicker === 'function') {
    window.changePriceInfoTicker(nextTicker);
  }
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
  await window.UI.misc.checkAndSyncWithServer(true, true);
  setLED('on');
  showToast("✅ 실전 데이터로 복원되었습니다.");
}

// 🔄 수동 백테스트 해제 및 기존 로컬 캐시 복원 함수
function restoreLocalCache() {
  isManualBacktestMode = false;
  window.isManualBacktestMode = false;
  isViewingHistory = false;
  updateHeaderDisplay();

  // 슬롯별로 localStorage에 저장된 실제 실전 캐시(snap) 데이터를 메모리에 다시 복원
  for (let i = 1; i <= MAX_SLOTS; i++) {
    const snapStr = localStorage.getItem(`vtotal3_snap${i}_${myUserId}`);
    // isManualBacktestMode가 false가 되었으므로 isSlotActive는 원래의 slotConfigs를 바라봄
    if (snapStr && isSlotActive(i)) {
      try {
        const snap = JSON.parse(snapStr);
        lastBTResults[i] = snap;
        globalMonthlyDataArr[i] = snap.monthlyData;
        globalYearlyDataArr[i] = snap.yearlyData;
        globalDailyDataArr[i] = snap.dailyData;

        if (i === 1) window.UI.misc.initData(slotConfigs[1]); // 1번 슬롯 폼 복원
        window.UI.order.renderOrderViewSlot(snap, i);
        window.UI.performance.renderPeriodTableSlot(i);
      } catch (e) { }
    } else {
      lastBTResults[i] = null;
    }
  }

  // UI 및 차트, 종합 데이터 재계산 렌더링
  window.UI.misc.updateSlotsVisibility();
  window.UI.performance.calculateCombinedPeriodData();
  renderChartAll();
  window.UI.stats.refreshStatsTable();
  window.UI.updates.updateCurrentStatusUI(activeSettingsTab);
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
  if (periodTitle) periodTitle.innerHTML = '📅 년별 수익 그래프';
  if (periodChartTitle) periodChartTitle.innerHTML = '📅 월별 수익 그래프';
  if (periodDailyTitle) periodDailyTitle.innerHTML = '📅 일별 수익 그래프';

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

  window.UI.updates.renderPerfTabCharts();
  window.UI.performance.renderPerfTables();
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
    // renderPeriodBarChartRaw는 requestAnimationFrame으로 비동기 실행되지만,
    // updateChartRatesDisplay가 그 내부에서도 호출되므로, 여기서의 호출은 불필요
    // (비동기 실행 전에 호출되어 stale 데이터를 사용할 수 있음)
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

function shouldAutoRefresh() {
  if (!myUserId) return false;
  const now = new Date();
  const nyTimeStr = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
  const nyDateStr = formatDateNY(now);
  const lastDate = localStorage.getItem('vtotal3_last_auto_ny_' + myUserId);

  const nyDateObj = new Date(nyTimeStr);
  const nyHour = nyDateObj.getHours();
  const nyMin = nyDateObj.getMinutes();

  // 뉴욕 장 마감(16:00) 이후부터 다음 장 시작(09:30) 전까지 자동 갱신 허용
  const isMarketClosedTime = (nyHour >= 16 || nyHour < 9 || (nyHour === 9 && nyMin < 30));

  if (isMarketClosedTime) {
    if (lastDate !== nyDateStr) {
      localStorage.setItem('vtotal3_last_auto_ny_' + myUserId, nyDateStr);
      return true;
    }
  }
  return false;
}

// 2026-08-04: GCP 주문시간(개장 10분 전 = NY 09:20) 이후 첫 갱신 여부 추적
function shouldForceFirstRefreshAfterOrderTime() {
  if (!myUserId) return false;
  const now = new Date();
  const nyTimeStr = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
  const nyDateStr = formatDateNY(now);

  const nyDateObj = new Date(nyTimeStr);
  const nyHour = nyDateObj.getHours();
  const nyMin = nyDateObj.getMinutes();

  // GCP 주문 시간(09:20 NY) 이후인지 확인
  const isAfterOrderTime = (nyHour > 9 || (nyHour === 9 && nyMin >= 20));

  if (isAfterOrderTime) {
    const lastFreshKey = 'vtotal3_last_order_refresh_' + myUserId;
    const lastRefreshDate = localStorage.getItem(lastFreshKey);

    // 오늘 처음 갱신하는 경우
    if (lastRefreshDate !== nyDateStr) {
      localStorage.setItem(lastFreshKey, nyDateStr);
      return true;
    }
  }
  return false;
}

// 3. 탭 및 설정 관리
function switchSettingsTab(tabNum) {
  saveCurrentFormToSlot(activeSettingsTab);
  activeSettingsTab = tabNum;
  loadSlotToForm(tabNum);
  updateSettingsTabButtons();
  window.UI.updates.updateCurrentStatusUI(tabNum);
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
  return `vtotal3_slot_disabled_${slotNum}_${userId || ""}`;
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
  localStorage.setItem(`vtotal3_conf${slotNum}_${myUserId}`, JSON.stringify(cfg));
  setSlotLocallyDisabled(slotNum, cfg?.basics?.strategy === "정지");
}

function applySheetConfigToSlot(slotNum, confData) {
  if (!confData || !confData.basics) return;
  if (confData.basics.strategy === 'RSI 3M') confData.basics.strategy = '3M3D1-R';

  slotConfigs[slotNum] = { basics: { ...confData.basics } };
  localStorage.setItem(`vtotal3_conf${slotNum}_${myUserId}`, JSON.stringify(slotConfigs[slotNum]));
  rememberSheetConfigSnapshot(slotNum, slotConfigs[slotNum]);

  if (slotNum === activeSettingsTab) {
    window.UI.misc.initData(slotConfigs[slotNum]);
  }
}

function loadSlotToForm(slotNum) {
  const cfg = slotConfigs[slotNum];
  if (cfg && cfg.basics) {
    window.UI.misc.initData(cfg);
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

// Window에 함수 할당
window.isSlotActive = isSlotActive;
window.getSlotConfig = getSlotConfig;

// 4. 앱 초기화 및 로그인
// ⚡ GET_ALL_INIT은 render-misc.js에서 이미 시작됨
// window.initDataFuture는 render-misc.js에서 설정됨

// DOM이 파싱되는 즉시 즉각 실행
function initAppImmediate() {
  // core.js와 engine.js의 전역 변수들도 window에 할당
  if (typeof isCurrencyKRW !== 'undefined') window.isCurrencyKRW = isCurrencyKRW;
  if (typeof currentFXRate !== 'undefined') window.currentFXRate = currentFXRate;
  if (typeof MASTER_STRATEGIES !== 'undefined') window.MASTER_STRATEGIES = MASTER_STRATEGIES;

  window.UI.misc.generateDynamicDOM();
  const isAuth = localStorage.getItem('vtotal3_auth'); const savedId = localStorage.getItem('vtotal3_id');
  if (isAuth === 'true' && savedId) { 
    myUserId = savedId; 
    window.myUserId = myUserId; 
    window.UI.misc.enterAppDirectly(); 
  } else { 
    document.getElementById('loginScreen').classList.remove('hidden'); 
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAppImmediate);
} else {
  initAppImmediate();
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
  const click = (e) => { if (isLongPress) return; window.UI.misc.showStatsView(); };
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
      window.UI.misc.handleInstantOrder();
    }, 800);
  };
  const cancel = () => clearTimeout(pressTimer);
  const click = (e) => { if (isLongPress) return; window.UI.misc.showOrderView(); };
  btn.addEventListener('mousedown', start);
  btn.addEventListener('touchstart', start, { passive: true });
  btn.addEventListener('mouseup', cancel);
  btn.addEventListener('touchend', cancel);
  // ⚠️ HTML 인라인 onclick(showOrderView)이 남아있으면 클릭 2회 실행 + 길게 누르기 후에도
  //    showOrderView가 실행되므로, onclick 프로퍼티 대입으로 인라인 핸들러를 교체한다(btnStats와 동일 방식).
  btn.onclick = click;
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

  localStorage.setItem(`vtotal3_quick_config_${myUserId}`, JSON.stringify(config));
}

function loadQuickConfigFromLocal() {
  const saved = localStorage.getItem(`vtotal3_quick_config_${myUserId}`);
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
      setupQuickCashAutoFill();
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
  setupQuickCashAutoFill();
}

function setupQuickCashAutoFill() {
  const pInput = document.getElementById('qInitialCash');
  const rInput = document.getElementById('qRenewCash');
  if (!pInput || !rInput) return;
  const initialRaw = unformatComma(pInput.value || "");
  const renewRaw = unformatComma(rInput.value || "");
  rInput.dataset.manual = renewRaw && renewRaw !== initialRaw ? "1" : "0";
  pInput.oninput = function () {
    pInput.value = formatComma(pInput.value);
    if (rInput.dataset.manual !== "1" || !unformatComma(rInput.value)) {
      rInput.dataset.manual = "0";
      rInput.value = pInput.value;
    }
    saveQuickConfigToLocal();
  };
  rInput.oninput = function () {
    rInput.value = formatComma(rInput.value);
    const nextRenew = unformatComma(rInput.value);
    const nextInitial = unformatComma(pInput.value);
    rInput.dataset.manual = nextRenew && nextRenew !== nextInitial ? "1" : "0";
    saveQuickConfigToLocal();
  };
}

function handleQuickBatchParse(val) {
  if (!val) return;
  const parts = val.trim().split(/[\s,\|]+/).filter(v => v !== "");
  if (parts.length >= 1 && parts[0].match(/^\d{4}-\d{2}-\d{2}$/)) document.getElementById('qStartDate').value = parts[0];
  if (parts.length >= 2 && parts[1].match(/^\d{4}-\d{2}-\d{2}$/)) document.getElementById('qEndDate').value = parts[1];
  if (parts.length >= 3) document.getElementById('qInitialCash').value = parts[2];
  if (parts.length >= 4) document.getElementById('qRenewCash').value = parts[3];
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

  payload.logs = sortedStates.map((state) => {
    const row = { date: normalizeSheetStateDate(state.date) };
    row[`s${slot}`] = {
      asset: state.asset,
      inout: 0,
      json: state.json
    };
    return row;
  });

  return payload;
}

function getSheetConfigSnapshotKey(slot) {
  return `vtotal3_sheet_conf_snapshot_${slot}_${myUserId}`;
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
    asset: fixFloat(initialCash),
    inout: 0,
    json: JSON.stringify({
      cash: fixFloat(initialCash),
      base_principal: fixFloat(initialCash),
      base: fixFloat(initialCash),
      realPrincipal: fixFloat(initialCash),
      realizedProfit: 0,
      holdings: []
    })
  };
}

function getDisplaySheetDate(slotNum, res = null, config = null) {
  const rawDate = localStorage.getItem(`vtotal3_sheet_last_date_${slotNum}_${myUserId}`) || "";
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
  const combinedMap = {};

  const addStates = (res, slotKey, lastDate, slotNum) => {
    if (!res || !res.dailyStates) return;
    const normalizedLastDate = normalizeSheetStateDate(lastDate) || "1900-01-01";
    
    // 시트에 이미 존재하는 날짜 목록 가져오기
    const existingDatesStr = localStorage.getItem(`vtotal3_sheet_existing_dates_${slotNum}_${myUserId}`) || "";
    const existingDatesSet = new Set(existingDatesStr.split(",").map(d => normalizeSheetStateDate(d)).filter(Boolean));

    res.dailyStates.forEach(state => {
      const date = normalizeSheetStateDate(state.date);
      if (!date) return;
      
      const isMissing = !existingDatesSet.has(date);
      const isFuture = date > normalizedLastDate;
      
      if (!isFuture && !isMissing) return;

      if (!combinedMap[date]) {
        const baseObj = { date };
        for (let i = 1; i <= MAX_SLOTS; i++) baseObj[`s${i}`] = null;
        combinedMap[date] = baseObj;
      }
      combinedMap[date][slotKey] = {
        asset: state.asset,
        inout: state.inout,
        json: state.json
      };
    });
  };

  for (let i = 1; i <= MAX_SLOTS; i++) {
    const sheetLastDate = localStorage.getItem(`vtotal3_sheet_last_date_${i}_${myUserId}`) || "1900-01-01";
    addStates(lastBTResults[i], `s${i}`, sheetLastDate, i);
  }

  const batchLogs = Object.values(combinedMap).sort((a, b) => a.date.localeCompare(b.date));
  if (batchLogs.length === 0) return;

  setLED('loading');
  const fetchWithTimeout = (url, options = {}, timeoutMs = 15000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...options, signal: controller.signal })
      .finally(() => clearTimeout(timer));
  };
  fetchWithTimeout(GAS_URL, {
    method: 'POST',
    mode: 'no-cors',
    body: JSON.stringify({ action: "AUTO_DAILY_SAVE", id: myUserId, logs: batchLogs })
  })
    .then(() => {
      for (let i = 1; i <= MAX_SLOTS; i++) {
        const slotLogs = batchLogs.filter(row => row[`s${i}`]);
        if (slotLogs.length > 0) {
          const slotLastDate = slotLogs[slotLogs.length - 1].date;
          localStorage.setItem(`vtotal3_sheet_last_date_${i}_${myUserId}`, slotLastDate);
        }
      }
      setLED('on');
      const header = document.getElementById('userDisplayHeader');
      if (header) {
        header.innerText = myUserId + " (누락 데이터 자동 백업 완료!)";
        setTimeout(() => { if (header.innerText.includes("자동 백업 완료")) header.innerText = myUserId; }, 3000);
      }

      // 저장 결과 검증은 백그라운드에서 1회만 수행한다.
      // 기존에는 같은 전체 동기화를 연속 2회 호출해 주문표 계산과 시트 읽기가 중복됐다.
      const verifySavedSheet = window.UI?.misc?.checkAndSyncWithServer;
      if (typeof verifySavedSheet === 'function' && !window.__sheetVerifySyncPromise) {
        const waitForCurrentSync = new Promise(resolve => {
          let checks = 0;
          const checkIdle = () => {
            if (!window.isServerSyncing || checks++ >= 100) resolve();
            else setTimeout(checkIdle, 100);
          };
          checkIdle();
        });
        window.__sheetVerifySyncPromise = waitForCurrentSync
          .then(() => verifySavedSheet(false, true, true))
          .catch(e => console.warn('자동 백업 후 시트 검증 실패:', e))
          .finally(() => { window.__sheetVerifySyncPromise = null; });
      }
    })
    .catch(() => { setLED('off'); });
}

async function handleSave() {
  const targetSlot = activeSettingsTab;
  const btn = document.getElementById('btnSaveTop');
  const orgText = btn ? btn.innerHTML : "";
  if (btn) btn.innerText = '준비 중...';

  try {
    saveCurrentFormToSlot(targetSlot);

    if (!isSlotActive(targetSlot)) {
      localStorage.removeItem(`vtotal3_snap${targetSlot}_${myUserId}`);
      localStorage.removeItem(`vtotal3_sheet_last_date_${targetSlot}_${myUserId}`);
      localStorage.removeItem(`vtotal3_sheet_existing_dates_${targetSlot}_${myUserId}`);
      const stoppedConfig = slotConfigs[targetSlot] || { basics: { strategy: "정지" } };
      stoppedConfig.basics.strategy = "정지";
      slotConfigs[targetSlot] = stoppedConfig;
      localStorage.setItem(`vtotal3_conf${targetSlot}_${myUserId}`, JSON.stringify(stoppedConfig));
      setSlotLocallyDisabled(targetSlot, true);
      lastBTResults[targetSlot] = null;
      globalMonthlyDataArr[targetSlot] = null;
      globalYearlyDataArr[targetSlot] = null;
      globalDailyDataArr[targetSlot] = null;

      if (navigator.onLine) {
        // "정지" 전략이 담긴 설정을 실제로 시트에 기록해야 다른 기기에서도 비활성화가 유지된다.
        await saveSlotToSheet(targetSlot, stoppedConfig, []);
        rememberSheetConfigSnapshot(targetSlot, stoppedConfig);
        showToast(`[A-QUANT 2-${targetSlot}] 비활성화 설정이 시트에 반영되었습니다.`, "✅");
      } else {
        handleOfflineSave(buildSheetSavePayload(targetSlot, stoppedConfig, []));
      }

      window.UI.misc.updateSlotsVisibility();
      window.UI.performance.calculateCombinedPeriodData();
      renderChartAll();
      window.UI.stats.refreshStatsTable();
      window.UI.updates.updateCurrentStatusUI(targetSlot);

      if (btn) btn.innerHTML = orgText;
      return;
    }

    const sheetLastDate = normalizeSheetStateDate(localStorage.getItem(`vtotal3_sheet_last_date_${targetSlot}_${myUserId}`)) || "1900-01-01";
    const existingDatesStr = localStorage.getItem(`vtotal3_sheet_existing_dates_${targetSlot}_${myUserId}`) || "";
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

    // 📊 이미 로드된 캐시 데이터 사용
    const cachedPriceData = window.priceLoader && window.priceLoader.priceDataCache ?
      window.priceLoader.priceDataCache : {};
    let targetRes = await runBacktestMemory(slotConfigs[targetSlot], cachedPriceData, targetSlot);
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
        localStorage.setItem(`vtotal3_sheet_last_date_${targetSlot}_${myUserId}`, "1900-01-01");
        localStorage.removeItem(`vtotal3_sheet_existing_dates_${targetSlot}_${myUserId}`);
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
        const existingDatesStr = localStorage.getItem(`vtotal3_sheet_existing_dates_${targetSlot}_${myUserId}`) || "";
        const existingDatesSet = new Set(existingDatesStr ? existingDatesStr.split(",") : []);

        newLogs.forEach(s => {
          const date = normalizeSheetStateDate(s.date);
          if (date > maxDate) maxDate = date;
          existingDatesSet.add(date);
        });

        localStorage.setItem(`vtotal3_sheet_last_date_${targetSlot}_${myUserId}`, maxDate);
        localStorage.setItem(`vtotal3_sheet_existing_dates_${targetSlot}_${myUserId}`, Array.from(existingDatesSet).join(","));
      }

      showToast(newLogs.length > 0 ? `${newLogs.length}일치의 기록이 시트에 반영되었습니다.` : "설정값이 시트에 반영되었습니다. 매매기록은 종가 데이터가 있는 날짜부터 저장됩니다.", "✅");

      // 방금 재계산한 targetRes를 넘겨야 변경분(자산/증액/슬롯 활성화)이 VM 봇에 반영된다.
      if (typeof pushTodayOrders === 'function') await pushTodayOrders({ [targetSlot]: targetRes });
      // ⚠️ 시트에 저장했으니 GCP도 같은 시트를 다시 읽어 재계산하게 트리거한다.
      // 위 push는 "앱이 계산한 값"을 즉시 반영하는 안전망이고(트리거가 실패해도 최신 설정으로
      // 주문이 나가도록), 이 트리거가 성공하면 GCP가 자기 계산으로 덮어써서 화면의
      // "일치/불일치"가 다시 서로 독립적으로 계산한 값끼리의 진짜 대조가 된다.
      if (typeof triggerVmRecalc === 'function') triggerVmRecalc();
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
    localStorage.setItem(`vtotal3_sheet_last_date_${i}_${myUserId}`, "1900-01-01");
    localStorage.removeItem(`vtotal3_sheet_existing_dates_${i}_${myUserId}`);
  }
  showToast("동기화 정보가 초기화되었습니다. 시트 반영을 시도하세요.", "✅");
}

function handleOfflineSave(payload) {
  localStorage.setItem('vtotal3_pending_sync', JSON.stringify(payload));
  alert("현재 오프라인입니다.\n데이터는 앱에 우선 저장되며 인터넷이 연결되면 다시 반영할수 있도록 안내해 드립니다.");
  showToast("오프라인: 앱에 우선 저장됨", "📴");
}

function checkPendingSync() {
  const pendingData = localStorage.getItem('vtotal3_pending_sync');
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
          localStorage.removeItem('vtotal3_pending_sync');
          showToast("보류중인 데이터가 시트에 성공적으로 반영되었습니다.");
        }
      }).catch(e => {
        showToast("서버 오류로 반영이 지연되었습니다.", "❌");
      });
    }
  }
}
window.addEventListener('online', checkPendingSync);

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



function confirmLogout() {
  if (confirm("로그아웃 하시겠습니까?")) {
    localStorage.removeItem('vtotal3_auth');
    localStorage.removeItem('vtotal3_id');
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

  // 성과모드(perf-tab-layout)에서 넘어오는 경우, 백테스트 실행 전 레이아웃을 미리 초기화
  // (렌더링 도중 perf-tab-layout이 남아 차트/패널이 왼쪽으로 쏠리는 문제 방지)
  {
    const grid = document.getElementById('mainGrid');
    const wasPerfTab = grid && grid.classList.contains('perf-tab-layout');
    if (wasPerfTab) {
      restoreFromPerfLayout();
      grid.classList.remove('perf-metrics-layout', 'perf-tab-layout', 'order-expanded', 'price-info-expanded');
    }
  }

  // 📊 시작일 기준 ±1년 데이터 필요 (RSI 누적 계산용)
  const targetStartDate = new Date(`${startDate}T12:00:00Z`);
  const oneYearBefore = new Date(targetStartDate.getTime() - 365 * 24 * 60 * 60 * 1000);
  const cachedOldest = (() => {
    const soxl = window.priceLoader?.getPriceSeries('SOXL');
    return soxl?.dates?.[0] || null;
  })();
  const forceFullRange = !cachedOldest || cachedOldest > oneYearBefore;

  let priceData;
  try {
    console.log(forceFullRange ? `🔄 시작일(${startDate}) 1년 전 데이터 로드 중...` : "🔄 캐시된 주가 데이터 사용 중...");
    priceData = await priceLoader.loadAllSheetPrices(forceFullRange ? oneYearBefore : false);
    console.log("✅ 주가 데이터 로드 완료:", Object.keys(priceData));
  } catch (err) {
    console.error("❌ 주가 데이터 로드 실패:", err);
    restoreBtn();
    return alert("주가 데이터를 불러올 수 없습니다: " + err.message);
  }
  const executeSlot = async (cfg, isActive, slotNum) => {
    if (isManualBacktestMode) {
      cfg = simulationConfigs[slotNum];
      isActive = (cfg && cfg.basics && cfg.basics.strategy !== "");
    }
    if (isActive) {
      const res = await runBacktestMemory(cfg, priceData, slotNum);
      if (res.status !== "error") {
        // 🔒 백테스트 모드: lastManualBTResults에만 저장 (시트 자동 저장 방지)
        lastManualBTResults[slotNum] = res;
        saveBTResult(res, slotNum, myUserId); // 📦 localStorage에도 저장 (페이지 닫아도 유지)
        window.UI.updates.updateUIWithResult(res, cfg, slotNum, true);
      }
    } else {
      // 🔒 백테스트 모드: lastManualBTResults만 초기화
      lastManualBTResults[slotNum] = null;
      localStorage.removeItem(`vtotal3_manual_BT_${slotNum}_${myUserId}`); // 📦 BT 결과 삭제
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

  // ⭐️ 계산 중(await 구간)에 사용자가 이미 홈/다른 화면으로 이동해 백테스트 모드를
  // 벗어났다면(isManualBacktestMode=false), 완료 시점에 화면을 강제로 백테스트 뷰로
  // 되돌리지 않는다. 결과는 위 executeSlot에서 이미 lastManualBTResults에 저장됐으므로 데이터 손실은 없음.
  if (!isManualBacktestMode) {
    showToast("백테스트 엔진 실행 완료");
    return;
  }

  restoreFromPerfLayout();
  window.UI.misc.updateSlotsVisibility();
  renderChartAll();

  const grid = document.getElementById('mainGrid');
  if (grid) {
    grid.classList.add('backtest-view-layout');
    grid.classList.remove('perf-metrics-layout', 'perf-tab-layout', 'order-expanded', 'monthly-expanded', 'analysis-expanded', 'price-info-expanded');
  }

  // ⭐️ 성과분석/주가정보/매도내역 화면에서 넘어온 경우, 해당 패널을 닫고
  // 백테스트 결과 화면(주문표)으로 100% 동일하게 전환한다.
  const perfAnalysisCard = document.getElementById('panelAnalysisView');
  if (perfAnalysisCard) {
    perfAnalysisCard.classList.add('hidden');
    perfAnalysisCard.style.display = 'none';
  }
  const analysisCurrencyBtn = document.getElementById('btnCurrencyToggleAnalysis');
  if (analysisCurrencyBtn) analysisCurrencyBtn.style.display = 'none';
  if (window.UI?.performance?.destroyAnalysisCharts) window.UI.performance.destroyAnalysisCharts();
  const btnAnalysis = document.getElementById('btnAnalysis');
  if (btnAnalysis) btnAnalysis.classList.remove('active');
  const panelHistory = document.getElementById('panelHistory');
  if (panelHistory) {
    panelHistory.classList.add('hidden');
    panelHistory.style.display = 'none';
  }

  const statsTitle = document.getElementById('statsTitle');
  if (statsTitle) statsTitle.innerHTML = '📄 성과 지표';
  backtestStatsMode = "performance";

  isStatsMode = false;
  window.isStatsMode = false;
  isOrderView = true;
  window.isOrderView = true;

  const btnInstant = document.getElementById('btnInstant');
  if (btnInstant) btnInstant.classList.add('active');
  const btnPerf = document.getElementById('btnPerfShow');
  if (btnPerf) btnPerf.classList.remove('active');
  const btnStats = document.getElementById('btnStatsShow');
  if (btnStats) btnStats.classList.remove('active');

  window.UI.performance.calculateCombinedPeriodData();
  renderChartAll();
  window.UI.stats.refreshStatsTable();

  for (let i = 1; i <= MAX_SLOTS; i++) {
    if (isSlotActive(i)) window.UI.performance.renderPeriodTableText(i);
  }
  window.UI.performance.renderPeriodTableText('Combined');

  window.UI.toggles.toggleSettings();

  // 레이아웃 전환 후 차트 리사이즈 (성과모드→백테스트 시 차트 크기 어긋남 방지)
  if (window.myChart) setTimeout(() => safeChartResize(window.myChart), 50);
  if (window.myPeriodChart) setTimeout(() => safeChartResize(window.myPeriodChart), 50);

  showToast("백테스트 엔진 실행 완료");
}


function updatePeriodTitle() {
  const grid = document.getElementById('mainGrid');
  const isPerfTabLayout = grid && grid.classList.contains('perf-tab-layout');
  if (isPerfTabLayout) {
    const periodTitle = document.getElementById('periodTitle');
    if (periodTitle) periodTitle.innerHTML = '📅 년별 수익 그래프';
    return;
  }

  const periodTitle = document.getElementById('periodTitle');
  const periodChartTitle = document.getElementById('periodChartTitle');
  if (!periodTitle) return;
  const smallStyle = 'style="font-size:0.85em; font-weight:normal; opacity:0.8; margin-left:2px;"';
  
  let titleText = "";
  let chartTitleText = "";
  if (periodViewState === 0) {
    titleText = `📅 월별 수익 <span ${smallStyle}>(종합)</span>`;
    chartTitleText = `📅 월별 수익 그래프`;
  } else if (periodViewState === 1) {
    titleText = `📅 년별 수익 <span ${smallStyle}>(종합)</span>`;
    chartTitleText = `📅 년별 수익 그래프`;
  } else {
    titleText = `📅 일별 수익 <span ${smallStyle}>(종합)</span>`;
    chartTitleText = `📅 일별 수익 그래프`;
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
      if (isSlotActive(i)) window.UI.performance.renderPeriodTableText(i);
    }
    window.UI.performance.renderPeriodTableText('Combined');
    window.UI.performance.renderPeriodTableText(0);
  }
}





window.addEventListener('DOMContentLoaded', () => {
  const setupSwipe = (elementId, callback) => {
    const el = document.getElementById(elementId);
    if (!el || typeof Hammer === 'undefined') return;
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

  const setupSwipeDown = (elementId, callback, horizontalCallback = null, horizontalTargetSelector = '') => {
    const el = document.getElementById(elementId);
    if (!el) return;

    if (horizontalTargetSelector) {
      const horizontalTarget = el.querySelector(horizontalTargetSelector);
      if (horizontalTarget) horizontalTarget.style.touchAction = 'pan-y';
    }

    let startX = 0;
    let startY = 0;
    let isDragging = false;
    let allowHorizontal = false;

    const shouldIgnoreTarget = (target) => {
      if (!target) return false;
      return !!target.closest('button, a, input, select, textarea');
    };

    const start = (e) => {
      const touch = e.touches && e.touches[0];
      const point = touch || e;
      if (!point || shouldIgnoreTarget(e.target)) return;
      isDragging = true;
      allowHorizontal = !horizontalTargetSelector || !!e.target.closest(horizontalTargetSelector);
      startX = point.clientX;
      startY = point.clientY;
    };

    const end = (e) => {
      if (!isDragging) return;
      isDragging = false;
      const touch = e.changedTouches && e.changedTouches[0];
      const point = touch || e;
      if (!point) return;
      const diffX = point.clientX - startX;
      const diffY = point.clientY - startY;

      // 수평 스와이프 (좌/우): 주문표 및 보유현황 모드 모두에서 작동 (통합 ↔ 슬롯별 보유현황 이동)
      if (horizontalCallback && allowHorizontal && Math.abs(diffX) > 42 && Math.abs(diffX) > Math.abs(diffY) * 1.2) {
        horizontalCallback(diffX < 0 ? 'left' : 'right');
        if (navigator.vibrate) navigator.vibrate(8);
        return;
      }

      // 수직 스와이프 (위/아래: 세로 확장): 주문표 모드(isOrderView=true)일 때만 작동
      if (window.isOrderView !== false && Math.abs(diffY) > 42 && Math.abs(diffY) > Math.abs(diffX) * 1.2) {
        callback();
        if (navigator.vibrate) navigator.vibrate(8);
      }
    };

    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchend', end, { passive: true });
    el.addEventListener('touchcancel', () => { isDragging = false; }, { passive: true });
    el.addEventListener('mousedown', start);
    el.addEventListener('mouseup', end);
    el.addEventListener('mouseleave', () => { isDragging = false; });
  };

  const orderTitle = document.getElementById('orderTitle');
  if (orderTitle) {
    orderTitle.removeAttribute('onclick');
    const handleTitleClick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      window.UI.toggles.toggleOrderView();
    };
    orderTitle.addEventListener('click', handleTitleClick);
    orderTitle.addEventListener('touchend', handleTitleClick);
  }

  const priceInfoTitle = document.getElementById('priceInfoTitle');
  if (priceInfoTitle) {
    const handlePriceInfoClick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      togglePriceInfoTicker();
    };
    priceInfoTitle.addEventListener('click', handlePriceInfoClick);
    priceInfoTitle.addEventListener('touchend', handlePriceInfoClick);
  }

  setupSwipe('orderHeader', (dir) => window.UI.toggles.toggleOrderView(dir));
  setupSwipeDown('panelOrder', () => {
    if (window.UI && window.UI.toggles && typeof window.UI.toggles.toggleOrderExpansion === 'function') {
      window.UI.toggles.toggleOrderExpansion();
    }
  }, (dir) => window.UI.toggles.toggleOrderView(dir), '#dualOrderContainer');
  setupDragScrollX('dualOrderContainer');
  setupSwipe('monthlyHeader', () => window.UI.toggles.togglePeriodView());

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
    try { localStorage.setItem(`vtotal3_chart_view_mode_${myUserId}`, chartViewMode); } catch (e) { }
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
        const tickers = ['total', 'SOXL', 'SOXX', 'TQQQ', 'QQQ'];
        const currentTicker = window.priceInfoTicker || 'total';
        let currentIndex = tickers.indexOf(currentTicker);
        if (currentIndex === -1) currentIndex = 0;

        if (diffX > 0) {
          let nextIndex = currentIndex - 1;
          if (nextIndex < 0) nextIndex = tickers.length - 1;
          window.UI.priceInfo.changePriceInfoTicker(tickers[nextIndex]);
        } else {
          let nextIndex = currentIndex + 1;
          if (nextIndex >= tickers.length) nextIndex = 0;
          window.UI.priceInfo.changePriceInfoTicker(tickers[nextIndex]);
        }
      }
    }
  };

  setupPriceInfoSwipeDirect();
});


function handleDeposit() {
  const activeSlotName = slotConfigs[activeSettingsTab]?.basics?.strategy || `A-QUANT 2-${activeSettingsTab}`;
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
    await window.UI.misc.checkAndSyncWithServer(false, true); // 시트 데이터 강제 다시 불러오기
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

  // ⭐️ NY 시간 기준 17:05 (오후 5:05) 계산
  // formatToParts 결과를 직접 사용하여 올바른 타임존 처리
  let targetNY = new Date(
    parseInt(nyDate.year),
    parseInt(nyDate.month) - 1,
    parseInt(nyDate.day),
    17, 5, 0, 0
  );

  // NY 시간 → UTC 시간으로 변환 (현재와 targetNY의 오프셋 이용)
  const nowNY = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const offset = now.getTime() - nowNY.getTime();
  targetNY = new Date(targetNY.getTime() + offset);

  if (now.getTime() >= targetNY.getTime()) targetNY.setDate(targetNY.getDate() + 1);
  const delay = targetNY.getTime() - now.getTime();
  console.log(`[스케줄러] NY 시간 17:05 (한국 시간 ${new Date(now.getTime() + offset + 9*60*60*1000).getHours()}:05)에 자동 백업 예정...`);
  setTimeout(() => {
    checkAndRunAutoSave();
    scheduleNextAutoSave();
  }, delay);
}

window.addEventListener('load', () => {
  window.UI.misc.setupCashAutoFill();
  scheduleNextAutoSave();
});

// 앱이 백그라운드에서 다시 활성화될 때 자동 갱신 확인
// 2026-08-04: 다음 두 경우를 처리한다:
// 1. shouldAutoRefresh() = true: 마감 후 처음 갱신 시 → 전체 재계산(handleInstantOrder)
// 2. shouldForceFirstRefreshAfterOrderTime() = true: 주문시간 이후 첫 갱신 → 주문 상태만 갱신
// ⚠️ handleInstantOrder()는 mainGrid의 레이아웃을 강제로 초기화하므로 홈(주문표) 화면에서만 호출
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    // 전체 재계산이 필요한 경우
    if (typeof shouldAutoRefresh === 'function' && shouldAutoRefresh()) {
      if (window.isOrderView && !window.isStatsMode) {
        window.UI.misc.handleInstantOrder();
      }
    }
    // GCP 주문시간 이후 첫 갱신 — 주문 상태 캐시만 갱신
    else if (typeof shouldForceFirstRefreshAfterOrderTime === 'function' && shouldForceFirstRefreshAfterOrderTime()) {
      if (typeof window.refreshOrderStatusCache === 'function') {
        window.refreshOrderStatusCache();
      }
    }
    // 그 외 일반적인 갱신
    else if (typeof window.refreshOrderStatusCache === 'function') {
      window.refreshOrderStatusCache();
    }
  }
});

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

// 🏆 전역 헬퍼 함수: 특정 슬롯의 가장 최신 주기별 성과 데이터 추출
function getSlotLatestPeriodRow(slotNum, kind) {
  const rows = kind === 'year' ? globalYearlyDataArr[slotNum] : (kind === 'month' ? globalMonthlyDataArr[slotNum] : globalDailyDataArr[slotNum]);
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return [...rows].filter(row => row && row.period).sort((a, b) => String(b.period).localeCompare(String(a.period)))[0] || null;
}

// 🏆 백테스트 투자법별 총수익률/년수익률/월수익률 랭킹 모달 생성 및 노출 함수
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
    statusData = window.UI.stats.getDisplayStatusData(getBestResult(lastBTResults[slotNum], slotNum), slotNum);
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
        const slotData = window.UI.stats.getDisplayStatusData(slotRes, i);
        
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
    const p = Number(row.profit || 0);
    const r = Number(row.rate || 0);
    const isLight = document.body.classList.contains('light-mode');
    const plusColor = isLight ? '#1d4ed8' : '#3b82f6';
    const minusColor = isLight ? '#b91c1c' : '#ef4444';
    const colorStr = p > 0 ? plusColor : (p < 0 ? minusColor : 'var(--text-muted)');
    return `${formatChartMoney(p, true)}<span class="stats-profit-rate" style="color:${colorStr} !important; opacity:0.9;">(${(r * 100).toFixed(1)}%)</span>`;
  };

  const colorizeProfitValue = (valueText, rawValue) => {
    const num = Number(rawValue || 0);
    const isLight = document.body.classList.contains('light-mode');
    const plusColor = isLight ? '#1d4ed8' : '#3b82f6';
    const minusColor = isLight ? '#b91c1c' : '#ef4444';
    const colorStr = num > 0 ? plusColor : (num < 0 ? minusColor : 'var(--text-muted)');
    const cls = num > 0 ? 'val-plus' : (num < 0 ? 'val-minus' : '');
    return `<span class="${cls}" style="color:${colorStr} !important; font-weight:700;">${valueText}</span>`;
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
        const slotData = window.UI.stats.getDisplayStatusData(slotRes, i);
        let slotProfit = 0;
        let slotPrincipal = 0;
        if (slotData) {
          slotProfit = Number(slotData.totalProfit !== undefined ? slotData.totalProfit : (slotData.totalAssets - slotData.realPrincipal));
          slotPrincipal = Number(slotData.realPrincipal || 0);
        }
        legendRows.push({
          label: formatStrategyNameWithSmallParentheses(strategyName),
          customValue: `수익 ${formatChartMoney(slotProfit, true)}`,
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
  const assetLegendFontPx = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-font-size')) || 10.5;
  const assetLegendWidthPx = Math.ceil(200 + Math.max(0, assetLegendFontPx - 10.5) * 8.5);
  const assetLegendWidth = `${assetLegendWidthPx}px`;
  const donutStartPx = assetLegendWidthPx + 10;
  const donutWrap = document.querySelector('.stats-donut-wrap');
  if (donutWrap) {
    donutWrap.style.left = `calc(${donutStartPx}px + (100% - ${donutStartPx}px) / 2)`;
    donutWrap.style.width = `clamp(170px, min(calc(100% - ${donutStartPx + 12}px), calc(100% - 6px)), 320px)`;
  }
  if (legendContainer) {
    legendContainer.innerHTML = legendRows.map(row => {
      if (row.isHeader) {
        return `
          <div class="stats-asset-legend-row stats-asset-header" style="display: flex; justify-content: space-between; align-items: center; width: ${assetLegendWidth}; min-width: ${assetLegendWidth}; padding: 2px 6px; box-sizing: border-box; height: auto; background: transparent; border-radius: 0;">
            <span style="font-weight: 800; font-size: var(--app-font-size, 10.5px); color: var(--text-muted); text-align: left; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${row.label}</span>
            <span style="font-weight: 800; font-size: var(--app-font-size, 10.5px); color: var(--text-muted); text-align: right; width: 110px; flex-shrink: 0; letter-spacing: -0.3px;">${row.customValue}</span>
          </div>
        `;
      }
      return `
        <div class="stats-asset-legend-row stats-asset-${row.tone || 'plain'}" style="display: flex; justify-content: space-between; align-items: center; width: ${assetLegendWidth}; min-width: ${assetLegendWidth}; padding: 0 6px; box-sizing: border-box; height: auto;">
          <div style="display: flex; align-items: center; gap: 4px; min-width: 0; flex: 1;">
            <span class="stats-asset-label" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: ${row.color || 'var(--text-muted)'}; font-size: var(--app-font-size, 10.5px); font-weight: 700; flex: 1; text-align: left;">${row.label}</span>
          </div>
          <b style="color: ${row.color || 'var(--text-muted)'}; font-size: var(--app-font-size, 10.5px); font-weight: 700; white-space: nowrap; width: 110px; flex-shrink: 0; text-align: right; letter-spacing: -0.3px;">
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

  try {
    const chartOnCanvas = (typeof Chart !== 'undefined' && typeof Chart.getChart === 'function')
      ? Chart.getChart(canvas)
      : null;
    if (chartOnCanvas) chartOnCanvas.destroy();
  } catch (e) { }
  if (statsPieChartInstance) {
    try { statsPieChartInstance.destroy(); } catch (e) { }
  }
  statsPieChartInstance = null;
  window.statsPieChartInstance = null;
  if (window.stateManager && typeof window.stateManager.setStatsPieChart === 'function') {
    window.stateManager.setStatsPieChart(null);
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

// ===== 전역 변수 동기화 함수 =====
// script.js의 모든 전역 변수를 window 객체에 동기화합니다.
// UI 모듈들이 항상 최신 값에 접근할 수 있도록 합니다.
function syncGlobalsToWindow() {
  window.myUserId = myUserId;
  window.myChart = myChart;
  window.currentOrderDate = currentOrderDate;
  window.isOrderView = isOrderView;
  window.isCombinedOrderMode = isCombinedOrderMode;
  window.isStatsMode = isStatsMode;
  window.isViewingHistory = isViewingHistory;
  window.lastMyPerfData = lastMyPerfData;
  window.perfLastCheckTime = perfLastCheckTime;
  window.activeSettingsTab = activeSettingsTab;
  window.periodViewState = periodViewState;
  window.periodDisplayMode = periodDisplayMode;
  window.yearlyDisplayMode = yearlyDisplayMode;
  window.monthlyDisplayMode = monthlyDisplayMode;
  window.dailyDisplayMode = dailyDisplayMode;
  window.isManualBacktestMode = isManualBacktestMode;
  window.chartViewMode = chartViewMode;
  window.showIndividualHoldings = showIndividualHoldings;
  window.statsDisplayMode = statsDisplayMode;
  window.perfStatsMode = perfStatsMode;
  window.backtestStatsMode = backtestStatsMode;
  window.statsPieChartInstance = statsPieChartInstance;
  window.slotConfigs = slotConfigs;
  window.simulationConfigs = simulationConfigs;
  window.lastBTResults = lastBTResults;
  window.globalMonthlyDataArr = globalMonthlyDataArr;
  window.globalYearlyDataArr = globalYearlyDataArr;
  window.globalDailyDataArr = globalDailyDataArr;
  window.globalCombinedMonthlyData = globalCombinedMonthlyData;
  window.globalCombinedYearlyData = globalCombinedYearlyData;
  window.globalCombinedDailyData = globalCombinedDailyData;
  window.syncGlobalsToWindow = syncGlobalsToWindow;
}

// 초기 로드 시 동기화
syncGlobalsToWindow();

// 📈 주가 정보 조회 뷰 기능 (대시보드 패널 연동)


// 📱 모바일 백그라운드 -> 포그라운드 복귀 및 네트워크 재연결 시 자동 수신/복구
(function registerMobileResumeHandler() {
  let isChecking = false;
  const checkAndRecoverPrices = async () => {
    if (isChecking) return;
    isChecking = true;
    try {
      const soxl = window.priceLoader && window.priceLoader.getPriceSeries ? window.priceLoader.getPriceSeries('SOXL') : null;
      const isPriceEmpty = !soxl || !soxl.dates || soxl.dates.length === 0;
      if (isPriceEmpty && window.priceLoader && window.priceLoader.loadAllSheetPrices && !window.isServerSyncing) {
        console.log("📱 [모바일 복귀] 주가 데이터가 비어있어 자동으로 재연결을 시도합니다...");
        if (typeof setLED === 'function') setLED('loading');
        window.priceLoader._loadAllPricesPromise = null;
        const prices = await window.priceLoader.loadAllSheetPrices();
        if (prices && Object.keys(prices).length > 0) {
          if (typeof setLED === 'function') setLED('on');
          if (window.UI && window.UI.misc && typeof window.UI.misc.checkAndSyncWithServer === 'function') {
            await window.UI.misc.checkAndSyncWithServer(false, false);
          }
        }
      }
    } catch (e) {
      console.warn("⚠️ [모바일 복귀] 자동 주가 복구 실패:", e);
      if (typeof setLED === 'function') setLED('error');
    } finally {
      isChecking = false;
    }
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkAndRecoverPrices();
    }
  });
  window.addEventListener('pageshow', checkAndRecoverPrices);
  window.addEventListener('online', checkAndRecoverPrices);
})();

// 🌅 미국 장 종료 후 자동 갱신 (05:00~04:59:59 하루 주기, 1회만)
(function registerPriceRefreshHandler() {
  function shouldRefreshPrices() {
    if (!window.dateHelpers) return false;

    const now = new Date();
    let refreshDate = new Date(now);
    if (now.getHours() < 5) {
      refreshDate.setDate(refreshDate.getDate() - 1);
    }

    const refreshDateKey = window.dateHelpers.formatDateNY(refreshDate);
    const status = window.dateHelpers.getUSMarketDateStatus(refreshDateKey);

    // 주말이나 휴장일이면 갱신 안 함
    if (status.isClosed) return false;

    const lastRefreshDate = localStorage.getItem('vtotal3_price_refresh_date');
    return lastRefreshDate !== refreshDateKey;
  }

  function doRefresh() {
    if (!shouldRefreshPrices()) return;

    if (window.priceLoader && typeof window.priceLoader.loadAllSheetPrices === 'function') {
      console.log("🌅 [주가 갱신] 미국 장 종료 후 자동 갱신 시작");
      window.priceLoader.loadAllSheetPrices();

      const now = new Date();
      let refreshDate = new Date(now);
      if (now.getHours() < 5) {
        refreshDate.setDate(refreshDate.getDate() - 1);
      }
      const refreshDateKey = window.dateHelpers.formatDateNY(refreshDate);
      localStorage.setItem('vtotal3_price_refresh_date', refreshDateKey);
      console.log("🌅 [주가 갱신] 완료 (" + refreshDateKey + ")");
    }
  }

  // 앱 로드 시 갱신
  doRefresh();

  // 포그라운드 진입 시 갱신 (백그라운드에서 돌아올 때)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      doRefresh();
    }
  });
})();

// 🏠 홈 UI 길게 누르면 주가 + 데이터 강제 갱신
(function registerHomeLongPressHandler() {
  const homeBtn = document.getElementById('btnInstant');
  if (!homeBtn) return;

  let pressTimer = null;
  const LONG_PRESS_DURATION = 500;

  homeBtn.addEventListener('mousedown', () => {
    pressTimer = setTimeout(() => {
      doHomeLongPress();
    }, LONG_PRESS_DURATION);
  });

  homeBtn.addEventListener('mouseup', () => {
    clearTimeout(pressTimer);
  });

  homeBtn.addEventListener('mouseleave', () => {
    clearTimeout(pressTimer);
  });

  homeBtn.addEventListener('touchstart', () => {
    pressTimer = setTimeout(() => {
      doHomeLongPress();
    }, LONG_PRESS_DURATION);
  });

  homeBtn.addEventListener('touchend', () => {
    clearTimeout(pressTimer);
  });

  function doHomeLongPress() {
    console.log("🏠 [홈 UI 길게 누르기] 주가 + 데이터 강제 갱신 시작");

    // 주가 강제 갱신
    if (window.priceLoader && typeof window.priceLoader.loadAllSheetPrices === 'function') {
      window.priceLoader.loadAllSheetPrices().then(() => {
        console.log("✅ 주가 갱신 완료");
      });
    }

    // 데이터 강제 갱신
    if (window.UI && window.UI.misc && typeof window.UI.misc.checkAndSyncWithServer === 'function') {
      window.UI.misc.checkAndSyncWithServer(true, false).then(() => {
        console.log("✅ 데이터 갱신 완료");
      });
    }
  }
})();

// 성과 추이 차트의 오른쪽 상단에 Y/M/D 수익률 표시
function calculateChartRatesDataEngine() {
  let rates = window.chartRatesData;
  if (!rates || rates.dd === undefined) {
    let yRate = 0, mRate = 0, dRate = 0;
    let latestYRow = null, latestMRow = null, latestDRow = null;

    const combinedSnap = { yearlyData: [], monthlyData: [], dailyData: [] };
    for (let i = 1; i <= MAX_SLOTS; i++) {
      if (typeof isSlotActive === 'function' && isSlotActive(i) && lastBTResults[i]
          && (!window.BrokerService || window.BrokerService.isSlotForBroker(i))) {
        const snap = typeof getBestResult === 'function' ? getBestResult(lastBTResults[i], i) : lastBTResults[i];
        if (snap) {
          if (Array.isArray(snap.yearlyData)) combinedSnap.yearlyData.push(...snap.yearlyData);
          if (Array.isArray(snap.monthlyData)) combinedSnap.monthlyData.push(...snap.monthlyData);
          if (Array.isArray(snap.dailyData)) combinedSnap.dailyData.push(...snap.dailyData);
        }
      }
    }

    const yearSummary = {}, monthSummary = {}, daySummary = {};
    combinedSnap.yearlyData.forEach(row => {
      if (row && row.period) {
        if (!yearSummary[row.period]) yearSummary[row.period] = { profit: 0, asset: 0 };
        yearSummary[row.period].profit += Number(row.profit || 0);
        yearSummary[row.period].asset += Number(row.asset || 0);
      }
    });
    combinedSnap.monthlyData.forEach(row => {
      if (row && row.period) {
        if (!monthSummary[row.period]) monthSummary[row.period] = { profit: 0, asset: 0 };
        monthSummary[row.period].profit += Number(row.profit || 0);
        monthSummary[row.period].asset += Number(row.asset || 0);
      }
    });
    combinedSnap.dailyData.forEach(row => {
      if (row && row.period) {
        if (!daySummary[row.period]) daySummary[row.period] = { profit: 0, asset: 0 };
        daySummary[row.period].profit += Number(row.profit || 0);
        daySummary[row.period].asset += Number(row.asset || 0);
      }
    });

    const latestYear = Object.keys(yearSummary).sort().reverse()[0];
    if (latestYear) {
      latestYRow = yearSummary[latestYear];
      const basis = latestYRow.asset - latestYRow.profit;
      yRate = basis > 0 ? (latestYRow.profit / basis) * 100 : 0;
    }
    const latestMonth = Object.keys(monthSummary).sort().reverse()[0];
    if (latestMonth) {
      latestMRow = monthSummary[latestMonth];
      const basis = latestMRow.asset - latestMRow.profit;
      mRate = basis > 0 ? (latestMRow.profit / basis) * 100 : 0;
    }
    const latestDay = Object.keys(daySummary).sort().reverse()[0];
    if (latestDay) {
      latestDRow = daySummary[latestDay];
      const basis = latestDRow.asset - latestDRow.profit;
      dRate = basis > 0 ? (latestDRow.profit / basis) * 100 : 0;
    }

    let currentMddVal = 0;
    try {
      const activeRes = [];
      for (let i = 1; i <= MAX_SLOTS; i++) {
        if (typeof isSlotActive === 'function' && isSlotActive(i) && lastBTResults[i]
            && (!window.BrokerService || window.BrokerService.isSlotForBroker(i))) {
          const res = typeof getBestResult === 'function' ? getBestResult(lastBTResults[i], i) : lastBTResults[i];
          if (res) activeRes.push(res);
        }
      }
      if (activeRes.length > 0 && window.summaryCalculator && typeof window.summaryCalculator.calculateCombinedSummaryEngine === 'function') {
        const combinedSummary = window.summaryCalculator.calculateCombinedSummaryEngine(activeRes);
        if (combinedSummary && combinedSummary.currentMdd !== undefined) {
          currentMddVal = combinedSummary.currentMdd * 100;
        }
      }
    } catch(e) {}

    rates = {
      y: Number(yRate.toFixed(1)),
      m: Number(mRate.toFixed(1)),
      d: Number(dRate.toFixed(1)),
      dd: Number(currentMddVal.toFixed(1)),
      yProfit: latestYRow ? Number(latestYRow.profit || 0) : 0,
      mProfit: latestMRow ? Number(latestMRow.profit || 0) : 0,
      dProfit: latestDRow ? Number(latestDRow.profit || 0) : 0
    };
    window.chartRatesData = rates;
  }
  return rates;
}
window.calculateChartRatesDataEngine = calculateChartRatesDataEngine;

function updateChartRatesDisplay() {
  if (window._isUpdatingChartRates) return;
  window._isUpdatingChartRates = true;
  try {
    const rates = calculateChartRatesDataEngine();
    const display = document.getElementById("item_chartRatesDisplay") || document.getElementById("chartRatesDisplay");
    if (!display) return;
    const getColor = (rate) => {
      if (rate > 0) return "#3b82f6";
      if (rate < 0) return "#ef4444";
      return "var(--text)";
    };
    const yVal = (rates && rates.y !== undefined) ? Number(rates.y) : 0;
    const mVal = (rates && rates.m !== undefined) ? Number(rates.m) : 0;
    const dVal = (rates && rates.d !== undefined) ? Number(rates.d) : 0;
    const ddVal = (rates && rates.dd !== undefined) ? Number(rates.dd) : 0;
    // 항목 사이 구분기호(|) 없이 공백으로만 띄운다.
    const seg = (label, val, color, sign) =>
      '<span style="color:var(--text);">' + label + ':</span>' +
      '<span style="color:' + color + ';">' + sign + val.toFixed(1) + '%</span>';
    display.innerHTML = [
      seg('Y', yVal, getColor(yVal), yVal > 0 ? "+" : ""),
      seg('M', mVal, getColor(mVal), mVal > 0 ? "+" : ""),
      seg('D', dVal, getColor(dVal), dVal > 0 ? "+" : ""),
      seg('DD', ddVal, getColor(-ddVal), ddVal > 0 ? "-" : "")
    // 간격은 이 span 하나로만 준다. 컨테이너(#chartRatesDisplay)의 flex gap은 0으로
    // 맞춰둬야 하며, gap이 남아 있으면 여기서 아무리 줄여도 넓어 보인다.
    ].join('<span style="display:inline-block; width:0.5ch;"></span>');
    if (typeof window.updateCombinedPerfRatesUI === "function") window.updateCombinedPerfRatesUI();
  } catch (e) {
    console.error("updateChartRatesDisplay error:", e);
  } finally {
    window._isUpdatingChartRates = false;
  }
}

window.updateChartRatesDisplay = updateChartRatesDisplay;

// renderChart를 래핑해서 updateChartRatesDisplay 호출 추가
const originalRenderChart = window.renderChart || function() {};
window.renderChart = function() {
  originalRenderChart.apply(this, arguments);
  if (typeof updateChartRatesDisplay === 'function') {
    updateChartRatesDisplay();
  }
};

// ── 21:00 KST 자동주문: 오늘의 주문표를 VM 프록시에 예약 저장 ──
// App 1의 pushTodayOrders()와 동일 구조.
// 앱을 켤 때 자동 호출. 20:50 이후는 프록시가 거부하므로 safe.
// freshBySlot: { [slotNum]: 방금 재계산한 결과 }
// ⚠️ handleSave는 재계산 결과를 지역변수에만 담고 lastBTResults/스냅샷을 갱신하지 않는다.
//    그래서 인자 없이 부르면 "자산 변경·증액·슬롯 활성화" 직후에도 변경 전 주문표가
//    VM으로 올라간다. 저장 경로에서는 반드시 방금 결과를 넘길 것.
async function pushTodayOrders(freshBySlot) {
  try {
    // 주문표는 "개장 15분 전(09:15 ET)"까지만 바꿀 수 있다. VM 스케줄러가 09:20 ET
    // (개장 10분 전)에 집어가기 때문이다. 서버(broker3-proxy)도 같은 컷오프를 강제하므로
    // 두 값을 함께 유지할 것.
    // ⚠️ 반드시 뉴욕 시각으로 판정한다 — 서머타임 때문에 KST로 고정하면(여름 22:15 /
    //    겨울 23:15) 계절마다 한 시간 어긋난다.
    const nyNow = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York", hour12: false, hour: "2-digit", minute: "2-digit"
    }).formatToParts(new Date());
    const nyHh = Number((nyNow.find(p => p.type === "hour") || {}).value || 0) % 24;
    const nyMm = Number((nyNow.find(p => p.type === "minute") || {}).value || 0);
    const nyMins = nyHh * 60 + nyMm;
    if (nyMins >= 9 * 60 + 15 && nyMins <= 9 * 60 + 50) {
      console.log("[OrderSync] 주문표 수정 마감(09:15 ET, 개장 15분 전)이 지나 갱신을 건너뜁니다.");
      return;
    }
    if (!myUserId) return;

    // 활성 슬롯의 주문 수집
    const orders = [];
    for (let i = 1; i <= MAX_SLOTS; i++) {
      if (!isSlotActive(i)) continue;
      const res = (freshBySlot && freshBySlot[i]) || getBestResult(lastBTResults[i], i);
      if (!res || !res.orders) continue;
      const symbol = String(getSlotConfig(i)?.basics?.ticker || "").toUpperCase();
      res.orders.forEach(o => {
        // order tuple: [side('매수'/'매도'), mode('MOC'/'LOC'등), price, qty] — 심볼은 슬롯 설정에서
        const sideKr = o[0];
        const side = sideKr === '매수' ? 'buy' : (sideKr === '매도' ? 'sell' : '');
        const ordType = o[1] === 'MOC' ? 'MOC' : 'LOC';
        const price = parseFloat(o[2]) || 0; // MOC는 가격 없음(빈 문자열)
        const qty = parseInt(o[3], 10);
        if (symbol && side && qty > 0 && (ordType === 'MOC' || price > 0)) {
          orders.push({
            slot: i,
            symbol,
            side,
            qty,
            ordType,
            price: price.toFixed(2),
            broker: getSlotConfig(i)?.basics?.broker || "kiwoom",
          });
        }
      });
    }
    if (orders.length === 0) {
      console.log("[OrderSync] 예약할 주문이 없습니다.");
      return;
    }

    // ── 예수금 부족 경고 (브로커별 매수 필요금액 vs 보유 예수금) ──
    if (window.BrokerService && typeof window.BrokerService.fetchOverseasBalance === 'function') {
      const buyNeededByBroker = {};
      orders.forEach(o => {
        if (o.side === 'buy') {
          buyNeededByBroker[o.broker] = (buyNeededByBroker[o.broker] || 0) + Number(o.price) * o.qty;
        }
      });
      for (const [broker, needed] of Object.entries(buyNeededByBroker)) {
        try {
          const bal = await window.BrokerService.fetchOverseasBalance(broker);
          const cash = Number(bal && bal.usdCash || 0);
          if (bal && bal.success && cash < needed) {
            const proceed = confirm(
              `⚠️ [${broker.toUpperCase()}] 예수금 부족 경고\n\n` +
              `필요 금액: $${needed.toFixed(2)}\n` +
              `보유 예수금: $${cash.toFixed(2)}\n\n` +
              `그대로 주문을 예약하시겠습니까?\n(증권사에서 증거금 부족으로 거부될 수 있습니다)`
            );
            if (!proceed) {
              console.log("[OrderSync] 사용자가 예수금 부족 경고에서 취소함");
              return;
            }
          }
        } catch (e) {
          console.warn("[OrderSync] 예수금 조회 실패, 체크 건너뜀:", e.message);
        }
      }
    }

    // GCP 프록시 직접 사용 (자동주문 저장)
    let base = "https://autumn-limit-001e-3.smw594.workers.dev";

    const resp = await fetch(`${base}/api/orders/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-app-key": window.BROKER_APP_KEY || "app3_key_083530e9ad0c0f2080e09515a87852768dab4c3c",
        "x-user-id": myUserId,
      },
      body: JSON.stringify({ userId: myUserId, orders }),
    });
    const result = await resp.json();
    if (result.ok) {
      console.log(`[OrderSync] ✅ ${orders.length}건 주문 예약 완료 (자동주문 ON)`);
      if (typeof refreshOrderStatusCache === 'function') refreshOrderStatusCache();
    } else {
      console.warn("[OrderSync] ⚠️ 예약 실패:", result.reason || result.error);
    }
  } catch (e) {
    console.warn("[OrderSync] ⚠️ 주문표 전송 중 오류 (네트워크 무시):", e.message);
  }
}
window.pushTodayOrders = pushTodayOrders;

// 앱이 시트에 저장한 뒤, GCP(VM)도 같은 시트를 다시 읽어 주문표를 재생성하게 만든다.
// GCP 쪽은 "오늘자 데일리스테이트가 있으면 그대로 쓰고, 없으면 계산해서 저장한 뒤 사용"으로
// 앱과 동일하게 동작한다(/api/orders/refresh). 실패해도 앱 동작에는 영향을 주지 않는다 —
// 직전 pushTodayOrders가 이미 최신 설정 기준 주문표를 올려둔 상태이기 때문이다.
async function triggerVmRecalc() {
  try {
    if (!myUserId) return;
    const base = "https://autumn-limit-001e-3.smw594.workers.dev";
    const controller = new AbortController();
    // 시세 로드 + 슬롯별 엔진 2회전이라 수 초 걸린다. 넉넉하게 잡는다.
    const timer = setTimeout(() => controller.abort(), 45000);
    const resp = await fetch(`${base}/api/orders/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-app-key": window.BROKER_APP_KEY || "app3_key_083530e9ad0c0f2080e09515a87852768dab4c3c",
        "x-user-id": myUserId,
      },
      body: JSON.stringify({ userId: myUserId }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));
    const result = await resp.json();
    if (result.ok) {
      console.log(`[OrderSync] ✅ GCP 재계산 완료 (${result.count}건)`);
      if (typeof refreshOrderStatusCache === 'function') refreshOrderStatusCache();
    } else {
      console.warn("[OrderSync] ⚠️ GCP 재계산 거부/실패:", result.reason);
    }
  } catch (e) {
    console.warn("[OrderSync] ⚠️ GCP 재계산 트리거 오류(앱 동작에는 영향 없음):", e.message);
  }
}
window.triggerVmRecalc = triggerVmRecalc;
