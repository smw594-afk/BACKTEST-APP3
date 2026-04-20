// script.js (UI 컨트롤, 데이터 통신 및 차트 렌더링 - 6슬롯 무한 확장 버전)

const APP_VERSION = "3.200";
const MAX_SLOTS = 6;

// 글로벌 상태 변수
let myUserId = "";
let myChart = null;
let currentOrderDate = "";
let isOrderView = true;
let isStatsMode = false;
let isViewingHistory = false;
let lastMyPerfData = null;
let perfLastCheckTime = 0;
let activeSettingsTab = 1;
let periodViewState = 0;
let periodDisplayMode = 'chart';
let isManualBacktestMode = false;
let chartViewMode = 0;
let periodBarChartInstance = null;

// 동적 상태 관리 배열 (인덱스 1부터 사용하기 위해 MAX_SLOTS + 1 크기로 생성)
let slotConfigs = Array(MAX_SLOTS + 1).fill(null);
let simulationConfigs = Array(MAX_SLOTS + 1).fill(null);
let lastBTResults = Array(MAX_SLOTS + 1).fill(null);
let globalMonthlyDataArr = Array(MAX_SLOTS + 1).fill(null);
let globalYearlyDataArr = Array(MAX_SLOTS + 1).fill(null);
let globalCombinedMonthlyData = [];
let globalCombinedYearlyData = [];

// 슬롯별 테마 색상 (반복 순환)
const SLOT_COLORS = ['#6366f1', '#10b981', '#fbbf24', '#f43f5e', '#8b5cf6', '#06b6d4', '#eab308'];

// 1. DOM 동적 생성
function generateDynamicDOM() {
  const orderContainer = document.getElementById('dualOrderContainer');
  const tableContainer = document.getElementById('periodTableFlex');

  if (orderContainer) {
    let orderHtml = '';
    for (let i = 1; i <= MAX_SLOTS; i++) {
      orderHtml += `
        <div id="orderSlot${i}" style="flex:1; display:flex; flex-direction:column; min-width:0; display:none; border-left: ${i > 1 ? '1px solid rgba(255,255,255,0.1)' : 'none'}; padding-left: ${i > 1 ? '4px' : '0'};">
          <div id="orderScroll${i}" style="flex:1; overflow-y:auto; min-height:0;" class="slim-scroll">
            <div id="orderView${i}" style="display:block;">
              <div class="slot-title" id="orderSlot${i}Name" style="color:${SLOT_COLORS[(i - 1) % SLOT_COLORS.length]}; font-size: 0.8em; margin-bottom: 2px;"></div>
              <table class="data-table">
                <thead><tr><th>구분</th><th class="hidden">방식</th><th>가격</th><th>수량</th></tr></thead>
                <tbody id="orderBody${i}"><tr><td colspan="3" style="padding:15px; color:#94a3b8;">데이터 대기 중...</td></tr></tbody>
              </table>
            </div>
            <div id="holdingsView${i}" style="display:none;">
              <table class="data-table">
                <thead><tr><th>T</th><th>M</th><th>B</th><th>S</th><th>Q</th><th>H</th></tr></thead>
                <tbody id="holdingsBody${i}"><tr><td colspan="6" style="padding:15px; color:#94a3b8;">데이터 대기 중...</td></tr></tbody>
              </table>
            </div>
          </div>
          <div class="tier-footer" id="tierFooter${i}" style="display:none; margin-top:auto; flex-shrink:0;">
            <div>T: <span id="tierCountVal${i}" style="color:var(--success);">-</span></div>
            <div>M: <span id="modeCountVal${i}" style="color:var(--success);">-</span></div>
            <div>W: <span id="weightCountVal${i}" style="color:var(--success);">-</span></div>
            <div>Q: <span id="qtyCountVal${i}" style="color:var(--success);">-</span></div>
          </div>
        </div>`;
    }
    orderContainer.innerHTML = orderHtml;
  }

  if (tableContainer) {
    let tableHtml = `
      <div id="monthlySlot0" style="flex:0; min-width:fit-content; width:fit-content; padding-right:1px; display:none;">
        <div class="slot-title" style="color:var(--text-muted); padding-left:0; padding-right:0;">년월</div>
        <table class="data-table" id="periodTable0" style="border-spacing: 0 1px;">
          <thead><tr id="periodTableHead0"><th style="white-space:nowrap; width:1%; padding:0 !important; text-align:center; vertical-align:middle; height:16px;">년월</th></tr></thead>
          <tbody id="periodBody0"><tr><td style="padding:0 !important; height:16px; text-align:center;">-</td></tr></tbody>
        </table>
      </div>`;

    for (let i = 1; i <= MAX_SLOTS; i++) {
      tableHtml += `
        <div id="monthlySlot${i}" style="flex:1; min-width:120px; display:none; border-left:1px solid rgba(255,255,255,0.1); padding-left:4px;">
          <div class="slot-title swipe-handler" style="color:${SLOT_COLORS[(i - 1) % SLOT_COLORS.length]};" id="slot${i}TableName">투자법${i}</div>
          <table class="data-table" id="periodTable${i}">
            <thead><tr id="periodTableHead${i}"><th class="hide-on-narrow">총자산</th><th>수익금</th><th>수익률</th><th class="hide-on-cover">MDD</th></tr></thead>
            <tbody id="periodBody${i}"><tr><td colspan="4" style="padding:15px; color:#94a3b8;">데이터 대기 중...</td></tr></tbody>
          </table>
        </div>`;
    }

    tableHtml += `
      <div id="monthlySlotCombined" style="flex:1; min-width:120px; display:none; border-left:1px solid rgba(255,255,255,0.1); padding-left:4px;">
        <div class="slot-title swipe-handler" style="color:rgba(168, 85, 247, 0.9);">종합</div>
        <table class="data-table" id="periodTableCombined">
          <thead><tr id="periodTableHeadCombined"><th>수익금</th><th>수익률</th><th class="hide-on-cover">MDD</th></tr></thead>
          <tbody id="periodBodyCombined"><tr><td colspan="3" style="padding:15px; color:#94a3b8;">데이터 대기 중...</td></tr></tbody>
        </table>
      </div>`;

    tableContainer.innerHTML = tableHtml;
  }
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
  if (!confirm("🔄 실전 데이터 모드로 복원하시겠습니까?\n\n현재 화면의 백테스트 결과가 사라지고 시트의 실시간 데이터로 교체됩니다.")) return;
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

function showOrderView() {
  // ⭐️ 수동 백테스트 중이었다면 원래 설정과 캐시로 즉시 복귀
  if (isManualBacktestMode) {
    restoreLocalCache();
    showToast("실전 데이터 모드로 복귀했습니다.", "🔄");
  }

  isStatsMode = false;
  isOrderView = true;
  document.getElementById('mainGrid').classList.remove('perf-metrics-layout');
  const btnStats = document.getElementById('btnStatsShow');
  if (btnStats) btnStats.classList.remove('active');
  if (shouldAutoRefresh()) handleInstantOrder();
  else refreshOrderViewUI();
}

function shouldAutoRefresh() {
  if (!myUserId) return false;
  const now = new Date();
  const nyHour = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }).format(now));
  const nyDateStr = formatDateNY(now);
  const lastDate = localStorage.getItem('vtotal_last_auto_ny_' + myUserId);
  if (nyHour >= 17) {
    if (lastDate !== nyDateStr) {
      localStorage.setItem('vtotal_last_auto_ny_' + myUserId, nyDateStr);
      return true;
    }
  }
  return false;
}

function showStatsView() {
  // ⭐️ 수동 백테스트 중이었다면 원래 설정과 캐시로 즉시 복귀
  if (isManualBacktestMode) {
    restoreLocalCache();
    showToast("실전 데이터 모드로 복귀했습니다.", "🔄");
  }

  isStatsMode = true;
  isOrderView = false;
  const grid = document.getElementById('mainGrid');
  if (grid) grid.classList.add('perf-metrics-layout');
  const btnStats = document.getElementById('btnStatsShow');
  if (btnStats) btnStats.classList.add('active');

  // 데이터가 정상적으로 있으면 종합 데이터 및 차트만 리렌더링
  calculateCombinedPeriodData();
  renderChartAll();
}

function toggleOrderView() { isOrderView = !isOrderView; refreshOrderViewUI(); }
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
  return !!(cfg && cfg.basics && cfg.basics.strategy && cfg.basics.strategy !== "");
}

function getSlotConfig(num) {
  return isManualBacktestMode ? simulationConfigs[num] : slotConfigs[num];
}

function updateSlotsVisibility() {
  let activeCount = 0;
  for (let i = 1; i <= MAX_SLOTS; i++) {
    const active = isSlotActive(i);
    if (active) activeCount++;
    const v = document.getElementById('orderSlot' + i); if (v) v.style.display = active ? 'flex' : 'none';
    const m = document.getElementById('monthlySlot' + i); if (m) m.style.display = active ? 'block' : 'none';
  }

  const m0 = document.getElementById('monthlySlot0');
  if (m0) m0.style.display = (activeCount > 0) ? 'block' : 'none';

  const mCombo = document.getElementById('monthlySlotCombined');
  if (mCombo) mCombo.style.display = (activeCount >= 2) ? 'block' : 'none';

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
  if (userHeader) userHeader.innerText = myUserId;
  if (document.getElementById('loginVersion')) document.getElementById('loginVersion').innerText = `v${APP_VERSION}`;
  if (document.getElementById('settingsVersion')) document.getElementById('settingsVersion').innerText = APP_VERSION;

  const prefCurrency = localStorage.getItem(`vtotal_pref_currency_${myUserId}`) || "USD";
  isCurrencyKRW = (prefCurrency === "KRW");
  const defaultCurrSelect = document.getElementById('defaultCurrency');
  if (defaultCurrSelect) defaultCurrSelect.value = prefCurrency;
  syncCurrencyUI();

  // 슬롯 데이터 복원
  for (let i = 1; i <= MAX_SLOTS; i++) {
    const savedStr = localStorage.getItem(`vtotal_conf${i}_${myUserId}`);
    if (savedStr) { try { slotConfigs[i] = JSON.parse(savedStr); } catch (e) { } }

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

  updateSlotsVisibility();
  updatePeriodTitle();
  refreshStatsTable();

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
  checkAndSyncWithServer(!slotConfigs[1]);
  checkPendingSync();
  setLED('on');
  initInstantButtonEvents();
  initStatsButtonEvents();
  initBacktestLongPress();
}

function updateHeaderDisplay() {
  const header = document.getElementById('userDisplayHeader');
  if (!header) return;

  if (!isViewingHistory) {
    header.innerText = myUserId;
    return;
  }

  let assets = [];
  for (let i = 1; i <= MAX_SLOTS; i++) {
    if (isSlotActive(i)) {
      const cash = Number(unformatComma(String(getSlotConfig(i).basics.initialCash)));
      assets.push(cash);
    }
  }

  const uniqueAssets = [...new Set(assets.filter(a => !isNaN(a) && a > 0))];
  let label = " (백테스트";
  if (uniqueAssets.length === 1) label += " $" + formatComma(uniqueAssets[0]);
  label += ")";
  header.innerText = myUserId + label;
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
  document.getElementById('qBatchRaw').value = '';

  overlay.style.display = 'flex';
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
  setLED('loading');
  const userHeader = document.getElementById('userDisplayHeader');
  if (userHeader) userHeader.innerText = myUserId + ' (초고속 로딩 중...)';

  try {
    const runFastEngine = async (cfg, isActive, slotNum) => {
      if (!isActive) return null;
      const res = await runBacktestMemory(cfg, false, slotNum);
      if (res && res.status !== "error") {
        updateUIWithResult(res, cfg, slotNum, true);
        return res;
      }
      return null;
    };

    for (let i = 1; i <= MAX_SLOTS; i++) {
      await runFastEngine(slotConfigs[i], isSlotActive(i), i);
    }

    const track2Promise = (async () => {
      try {
        const resInit = await fetch(`${GAS_URL}?action=GET_INIT&id=${myUserId}`);
        const dataInit = await resInit.json();

        let perfUrl = `${GAS_URL}?action=GET_MY_PERF&id=${myUserId}`;
        for (let i = 1; i <= MAX_SLOTS; i++) {
          let pName = i === 1 ? 'config' : `config${i}`;
          let sName = dataInit[pName]?.basics?.strategy || slotConfigs[i]?.basics?.strategy || "";
          perfUrl += `&strat${i}=${encodeURIComponent(sName)}`;
        }

        const resPerf = await fetch(perfUrl);
        const dataPerf = await resPerf.json();
        return { dataInit, dataPerf };
      } catch (e) { console.error("Track 2 Error:", e); return null; }
    })();

    updateSlotsVisibility();
    renderChartAll();

    isStatsMode = false;
    isOrderView = true;
    document.getElementById('mainGrid').classList.remove('perf-metrics-layout');
    const btnStats = document.getElementById('btnStatsShow');
    if (btnStats) btnStats.classList.remove('active');
    refreshOrderViewUI();

    if (userHeader) userHeader.innerText = myUserId + ' (동기화 중...)';

    const serverResult = await track2Promise;
    if (!serverResult) throw new Error("Server Sync Failed");
    const { dataInit, dataPerf } = serverResult;

    lastMyPerfData = dataPerf;
    perfLastCheckTime = new Date().getTime();

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

    const syncSlotWithSheet = async (confData, perfSlotData, slotNum) => {
      if (!confData || !confData.basics || !confData.basics.strategy) {
        localStorage.removeItem(`vtotal_conf${slotNum}_${myUserId}`);
        localStorage.removeItem(`vtotal_snap${slotNum}_${myUserId}`);
        return;
      }

      localStorage.setItem(`vtotal_conf${slotNum}_${myUserId}`, JSON.stringify({ basics: confData.basics }));
      slotConfigs[slotNum] = confData;

      let sheetLastDate = "1900-01-01";

      if (perfSlotData && perfSlotData.logs && perfSlotData.logs.length > 0) {
        perfSlotData.logs.forEach(r => {
          let dt = parseDateStr(r[0]);
          if (dt && dt > sheetLastDate) sheetLastDate = dt;
        });
        localStorage.setItem(`vtotal_sheet_last_date_${slotNum}_${myUserId}`, sheetLastDate);

        const configStartDate = confData.basics.startDate || "1900-01-01";
        const realData = processRealLogData(perfSlotData, confData.basics.strategy, configStartDate);

        if (realData) {
          // ⭐️ [완벽 해결] 서버(시트)에 저장된 옛날 갱신금을 무시하고, 
          // 엔진을 '강제 실행(force: true)'하여 수학적으로 완벽한 누적 갱신금(165주 기준)을 새로 뽑아옵니다.
          const pureEngineRes = await runBacktestMemory(confData, true, slotNum);
          const isEngOk = (pureEngineRes && pureEngineRes.summary);

          // 진짜 알고리즘 갱신금(base) 추출
          const trueAlgorithmicBase = isEngOk ? pureEngineRes.summary.base : realData.summary.base;
          const trueRealPrincipal = realData.summary.realPrincipal;

          // 화면의 설정값을 옛날 데이터가 아닌 완벽한 알고리즘 데이터로 동기화
          confData.basics.renewCash = trueAlgorithmicBase;
          confData.basics.initialCash = trueRealPrincipal;
          
          localStorage.setItem(`vtotal_conf${slotNum}_${myUserId}`, JSON.stringify({ basics: confData.basics }));
          slotConfigs[slotNum] = confData;

          let mergedSnap = {
            ...realData,
            summary: isEngOk ? {
              ...pureEngineRes.summary,
              base: trueAlgorithmicBase, // <-- 핵심: 서버값이 아닌 엔진의 진짜 갱신금 강제 유지!
              inout: realData.summary.inout,
              realPrincipal: trueRealPrincipal,
              totalAssets: realData.summary.totalAssets,
              yield: realData.summary.yield,
              cagr: realData.summary.cagr,
              totalProfit: realData.summary.totalProfit,
              mdd: realData.summary.mdd,
              calmar: realData.summary.calmar,
              currentMdd: realData.summary.currentMdd,
              cash: realData.summary.cash,
              qty: realData.summary.qty,
              avgPrice: realData.summary.avgPrice,
              trueStartDate: realData.summary.trueStartDate
            } : realData.summary,
            inv: isEngOk ? pureEngineRes.inv : realData.inv,
            trades: isEngOk ? pureEngineRes.trades : realData.trades,
            orders: (isEngOk && pureEngineRes.orders && pureEngineRes.orders.length > 0) ? pureEngineRes.orders : realData.orders,
            nextOrderInfo: isEngOk ? pureEngineRes.nextOrderInfo : null,
            orderDateStr: isEngOk ? pureEngineRes.orderDateStr : realData.orderDateStr,
            dailyStates: isEngOk ? pureEngineRes.dailyStates : realData.dailyStates,
            isSynced: true
          };

          localStorage.setItem(`vtotal_snap${slotNum}_${myUserId}`, JSON.stringify(mergedSnap));
          lastBTResults[slotNum] = mergedSnap;
          updateUIWithResult(mergedSnap, confData, slotNum, false);
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

    // 🟢 [버그 수정 1] 서버 동기화 완료 후 현재 탭의 설정값을 화면 입력창에 강제로 채워넣음
    loadSlotToForm(activeSettingsTab);
    updateSettingsTabButtons();

    if (dataInit.hasSheet) checkAndRunAutoSave();

  } catch (e) {
    console.error("초기 통신 에러 (엔진 결과로 폴백):", e);
    for (let i = 1; i <= MAX_SLOTS; i++) {
      if (lastBTResults[i]) updateUIWithResult(lastBTResults[i], slotConfigs[i], i, false);
    }
    setLED('error');
  } finally {
    updateHeaderDisplay();
    setLED('on');
  }
}

function checkAndRunAutoSave() {
  let combinedMap = {};
  const addStates = (res, slotKey, lastDate) => {
    if (!res || !res.dailyStates) return;
    res.dailyStates.forEach(state => {
      if (state.date > lastDate) {
        if (!combinedMap[state.date]) {
          let baseObj = { date: state.date };
          for (let i = 1; i <= MAX_SLOTS; i++) baseObj[`s${i}`] = null;
          combinedMap[state.date] = baseObj;
        }
        combinedMap[state.date][slotKey] = state;
      }
    });
  };

  for (let i = 1; i <= MAX_SLOTS; i++) {
    let sheetLastDate = localStorage.getItem(`vtotal_sheet_last_date_${i}_${myUserId}`) || "1900-01-01";
    addStates(lastBTResults[i], `s${i}`, sheetLastDate);
  }

  let batchLogs = Object.values(combinedMap).sort((a, b) => a.date.localeCompare(b.date));
  if (batchLogs.length === 0) return;

  setLED('loading');
  fetch(GAS_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: "AUTO_DAILY_SAVE", id: myUserId, logs: batchLogs }) })
    .then(() => {
      let finalDate = batchLogs[batchLogs.length - 1].date;
      for (let i = 1; i <= MAX_SLOTS; i++) {
        if (batchLogs.some(b => b[`s${i}`])) localStorage.setItem(`vtotal_sheet_last_date_${i}_${myUserId}`, finalDate);
      }
      setLED('on');
      const header = document.getElementById('userDisplayHeader');
      if (header) {
        header.innerText = myUserId + " (누락 데이터 자동 백업 완료!)";
        setTimeout(() => { if (header.innerText.includes("백업 완료")) header.innerText = myUserId; }, 3000);
      }
    })
    .catch(() => { setLED('off'); });
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
    lastBTResults[targetSlot] = null;
    updateSlotsVisibility();
    renderChartAll();
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

    // 백테스트 실행 결과 확인 (최신 데이터 확보)
    const targetRes = await runBacktestMemory(slotConfigs[targetSlot], false, targetSlot);

    if (!targetRes || targetRes.status === "error") {
      showToast("❌ 계산 중 오류가 발생했습니다.");
      if (btn) btn.innerHTML = orgText;
      return;
    }

    // [수정사항 2] 시트의 마지막 날짜 이후의 모든 거래일(dailyStates) 필터링
    const sheetLastDate = localStorage.getItem(`vtotal_sheet_last_date_${targetSlot}_${myUserId}`) || "1900-01-01";
    const newLogs = targetRes.dailyStates.filter(s => s.date > sheetLastDate);

    if (newLogs.length === 0) {
      if (!confirm("시트에 이미 최신 데이터까지 기록되어 있습니다. 설정을 갱신하시겠습니까?")) {
        if (btn) btn.innerHTML = orgText;
        return;
      }
    }

    if (btn) btn.innerText = '저장 중...';

    // GAS로 보낼 페이로드 구성
    let payload = {
      action: "BACKUP_AND_SAVE_V4",
      id: myUserId,
      logs: newLogs.map(s => {
        let entry = { date: s.date };
        // 슬롯 번호에 맞게 데이터 매핑 (s1, s2, ... s6)
        entry[`s${targetSlot}`] = { asset: s.asset, inout: s.inout, json: s.json };
        return entry;
      }),
      // 설정값(Params) 업데이트
      params: (targetSlot === 1) ? slotConfigs[1] : null,
      params2: (targetSlot === 2) ? slotConfigs[2] : null,
      params3: (targetSlot === 3) ? slotConfigs[3] : null,
      params4: (targetSlot === 4) ? slotConfigs[4] : null,
      params5: (targetSlot === 5) ? slotConfigs[5] : null,
      params6: (targetSlot === 6) ? slotConfigs[6] : null
    };

    if (navigator.onLine) {
      await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });

      // 로컬 스토리지 날짜 갱신
      if (newLogs.length > 0) {
        localStorage.setItem(`vtotal_sheet_last_date_${targetSlot}_${myUserId}`, newLogs[newLogs.length - 1].date);
      }

      showToast(`${newLogs.length}일치의 기록이 시트에 반영되었습니다.`, "✅");
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
      fetch(GAS_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) })
        .then(() => {
          localStorage.removeItem('vtotal_pending_sync');
          showToast("보류중인 데이터가 시트에 성공적으로 반영되었습니다.");
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

  // ⭐️ 수동 백테스트 중이라면 메모리 변수 대신, 로컬에 백업된 '진짜 실전 스냅샷'을 읽어옵니다.
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

  if (!res || !res.summary) {
    elDate.innerText = "-"; elTotal.innerText = "-"; elRenew.innerText = "-"; elPrincipal.innerText = "-";
    return;
  }

  const s = res.summary;
  const sheetDate = localStorage.getItem(`vtotal_sheet_last_date_${slotNum}_${myUserId}`) || "-";
  const fmt = (val) => "$" + fixFloat(val).toLocaleString();

  elDate.innerText = sheetDate;
  elTotal.innerText = fmt(s.totalAssets);
  elRenew.innerText = fmt(s.base);
  elPrincipal.innerText = fmt(s.realPrincipal || s.base);
}

function updateUIWithResult(resBT, config, slotNum, skipSave = false) {
  const existing = lastBTResults[slotNum];
  let finalRes = resBT;

  if (existing && existing.isSynced && !resBT.isSynced && !isViewingHistory) {
    finalRes = {
      ...existing,
      orders: resBT.orders,
      nextOrderInfo: resBT.nextOrderInfo,
      orderDateStr: resBT.orderDateStr,
      inv: resBT.inv
    };
  }

  lastBTResults[slotNum] = finalRes;
  globalMonthlyDataArr[slotNum] = finalRes.monthlyData;
  globalYearlyDataArr[slotNum] = finalRes.yearlyData;

  if (slotNum === 1) {
    currentActiveConfigStr = JSON.stringify(config);
    const op = document.getElementById('panelOrder'); if (op) op.classList.remove('hidden');
  }

  renderOrderViewSlot(finalRes, slotNum);
  renderPeriodTableSlot(slotNum);
  renderMetrics(finalRes.summary, finalRes.chartDates ? finalRes.chartDates.length : 0, slotNum);
  if (slotNum === activeSettingsTab) updateCurrentStatusUI(slotNum);
  calculateCombinedPeriodData();
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
    }
  };

  for (let i = 1; i <= MAX_SLOTS; i++) {
    await executeSlot(slotConfigs[i], isSlotActive(i), i);
  }

  updateSlotsVisibility();
  renderChartAll();

  const grid = document.getElementById('mainGrid');
  if (grid) {
    grid.classList.add('perf-metrics-layout');
    grid.classList.remove('order-expanded');
  }
  isStatsMode = true;
  isOrderView = false;
  const btnStats = document.getElementById('btnStatsShow');
  if (btnStats) btnStats.classList.add('active');

  toggleSettings();
  restoreBtn();
  triggerIconAnim('icoRun');
  showToast("백테스트 엔진 실행 완료");
}

async function handleInstantOrder() {
  const grid = document.getElementById('mainGrid');
  if (grid) grid.classList.remove('hide-order-panel', 'perf-metrics-layout');
  isViewingHistory = false;
  isManualBacktestMode = false;
  updateHeaderDisplay();
  const restoreBtn = setBtnLoading('btnInstant', '계산 중...');

  const executeSlot = async (cfg, isActive, slotNum) => {
    if (isActive) {
      const res = await runBacktestMemory(cfg, false, slotNum);
      if (res.status !== "error") {
        lastBTResults[slotNum] = res;
        updateUIWithResult(res, cfg, slotNum);
      }
    } else {
      lastBTResults[slotNum] = null;
    }
  };

  for (let i = 1; i <= MAX_SLOTS; i++) {
    await executeSlot(slotConfigs[i], isSlotActive(i), i);
  }

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
    localStorage.setItem(`vtotal_snap_combined_${myUserId}`, JSON.stringify({ m: globalCombinedMonthlyData, y: globalCombinedYearlyData }));
  }
}

function renderOrderViewSlot(res, slotNum) {
  if (!res) return;
  renderOrderTableSlot(res.orders, slotNum);
  renderHoldingsTableSlot(res.inv || [], res.currentStrat, slotNum);

  const nameEl = document.getElementById('orderSlot' + slotNum + 'Name');
  if (nameEl) nameEl.innerText = res.currentStrat || "";

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
      if (f) f.style.display = 'flex';
    }
  }

  const icon = isOrderView ? "⚡" : "📦";
  const labelText = isOrderView ? "주문표" : "보유계좌 현황";

  let titleStr = `${icon} ${labelText}`;
  titleStr += ` <span style="font-size:0.75em; font-weight:normal; opacity:0.6; margin-left:8px;">(${date1})</span>`;

  const now = new Date();
  const nyHour = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }).format(now));
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
  if (!inv || inv.length === 0) { tbody.innerHTML = "<tr><td colspan='6' style='padding:20px; color:#64748b;'>보유 수량 없음</td></tr>"; return; }
  const modeMap = { 'Middle': 'Mid1', 'Middle2': 'Mid2', 'Middle3': 'Mid3', 'SF': 'SF', 'AG': 'AG' };
  tbody.innerHTML = inv.map(o => {
    let sellPriceStr = "-", stopDateStr = "-";
    try {
      const modeData = MASTER_STRATEGIES[stratName].modes[o.mode];
      const sellPct = modeData.sell[o.tier - 1] || modeData.sell[0];
      sellPriceStr = "$" + (Math.ceil((o.buy_price * (1 + sellPct) * 100) - 0.000001) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 });
      let holdLimit = modeData.hold[o.tier - 1] || modeData.hold[0];
      if (o.buyDate && window.globalMainData && window.globalMainData.dates) {
        const bIdx = window.globalMainData.dates.findIndex(d => formatDateNY(d) === o.buyDate);
        if (bIdx !== -1) {
          let curr = new Date(window.globalMainData.dates[bIdx]); let dCount = 0;
          while (dCount < holdLimit) {
            curr.setDate(curr.getDate() + 1); const dStr = formatDateNY(curr); const dow = curr.getDay();
            if (dow !== 0 && dow !== 6 && !isUSMarketHoliday(dStr)) dCount++;
          }
          stopDateStr = (curr.getMonth() + 1) + "/" + curr.getDate();
        }
      }
    } catch (e) { }
    return `<tr><td>${o.tier}</td><td>${modeMap[o.mode] || o.mode}</td><td>$${Number(o.buy_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td><td class="hide-on-cover" style="color:var(--danger);">${sellPriceStr}</td><td>${o.qty}</td><td>${stopDateStr}</td></tr>`;
  }).join('');
}

function renderOrderTableSlot(orders, slotNum) {
  const tbody = document.getElementById('orderBody' + slotNum);
  if (!tbody) return;
  if (!orders || orders.length === 0) { tbody.innerHTML = "<tr><td colspan='3' style='padding:20px; color:#64748b;'>주문 없음</td></tr>"; return; }
  tbody.innerHTML = orders.map(o => `<tr><td class="${o[0] === '매수' ? 'buy' : 'sell'}">${o[0]}</td><td class="hidden">${o[1]}</td><td>$${Number(o[2]).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td><td>${o[3]}주</td></tr>`).join('');
}

function updatePeriodTitle() {
  const periodTitle = document.getElementById('periodTitle');
  if (!periodTitle) return;
  const smallStyle = 'style="font-size:0.85em; font-weight:normal; opacity:0.8; margin-left:2px;"';
  if (periodViewState === 0) periodTitle.innerHTML = `📅 월별 성과 <span ${smallStyle}>(종합)</span>`;
  else periodTitle.innerHTML = `📅 년별 성과 <span ${smallStyle}>(종합)</span>`;
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
  periodViewState = (periodViewState + 1) % 2;
  updatePeriodTitle();
  if (periodDisplayMode === 'chart') {
    renderPeriodBarChart();
  } else {
    const TH_STYLE = "white-space:nowrap; padding:0 4px !important; text-align:center; vertical-align:middle; height:16px !important; line-height:16px !important; box-sizing:border-box !important; overflow:hidden;";
    const head0Str = periodViewState === 0 ? `<th style="${TH_STYLE} width:1%;">년월</th>` : `<th style="${TH_STYLE} width:1%;">연도</th>`;
    const h0 = document.getElementById('periodTableHead0');
    if (h0) h0.innerHTML = head0Str;

    const headData1Str = `<th class="hide-on-narrow" style="${TH_STYLE}">총자산</th><th style="${TH_STYLE}">수익금</th><th style="${TH_STYLE}">수익률</th><th class="hide-on-cover" style="${TH_STYLE}">MDD</th>`;
    const headDataStr = `<th style="${TH_STYLE}">수익금</th><th style="${TH_STYLE}">수익률</th><th class="hide-on-cover" style="${TH_STYLE}">MDD</th>`;

    for (let i = 1; i <= MAX_SLOTS; i++) {
      const h = document.getElementById('periodTableHead' + i);
      if (h) h.innerHTML = (i === 1) ? headData1Str : headDataStr;
    }
    const hc = document.getElementById('periodTableHeadCombined');
    if (hc) hc.innerHTML = headDataStr;

    renderPeriodTableText(0);
    for (let i = 1; i <= MAX_SLOTS; i++) {
      if (isSlotActive(i)) renderPeriodTableText(i);
    }
    renderPeriodTableText('Combined');
  }
  if (myChart) setTimeout(() => myChart.resize(), 100);
}

function renderPeriodTableText(slotNum) {
  const tbodyStr = slotNum === 'Combined' ? 'periodBodyCombined' : `periodBody${slotNum}`;
  const tbody = document.getElementById(tbodyStr);
  if (!tbody) return;

  const CELL_STYLE = "vertical-align:middle; height:16px !important; line-height:16px !important; padding:0 4px !important; box-sizing:border-box !important; white-space:nowrap; overflow:hidden;";

  if (slotNum === 0) {
    let dataCandidate = [];
    let mapArr = periodViewState === 1 ? [...globalYearlyDataArr, globalCombinedYearlyData] : [...globalMonthlyDataArr, globalCombinedMonthlyData];
    for (let d of mapArr) if (d && d.length > (dataCandidate.length || 0)) dataCandidate = d;

    if (!dataCandidate || dataCandidate.length === 0) {
      tbody.innerHTML = `<tr><td style="${CELL_STYLE} text-align:center;">-</td></tr>`;
      return;
    }

    const sortedData = [...dataCandidate].sort((a, b) => b.period.localeCompare(a.period));
    tbody.innerHTML = sortedData.map(row => {
      let d = row.period;
      if (d.includes('-')) { const p = d.split('-'); d = p[0].substring(2) + '/' + p[1]; }
      else if (d.length === 4) { d = d.substring(2); }
      return `<tr><td style="${CELL_STYLE} width:1%; text-align:center;">${d}</td></tr>`;
    }).join('');
    return;
  }

  if (slotNum !== 'Combined') {
    const titleEl = document.getElementById(`slot${slotNum}TableName`);
    if (titleEl) titleEl.innerText = getSlotConfig(slotNum)?.basics?.strategy || `투자법 ${slotNum}`;
  }

  const mData = slotNum === 'Combined' ? globalCombinedMonthlyData : globalMonthlyDataArr[slotNum];
  const yData = slotNum === 'Combined' ? globalCombinedYearlyData : globalYearlyDataArr[slotNum];
  let data = (periodViewState === 1) ? yData : mData;

  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan='4' style="${CELL_STYLE} text-align:center;">데이터가 없습니다.</td></tr>`;
    return;
  }
  data.sort((a, b) => b.period.localeCompare(a.period));

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

  tbody.innerHTML = data.map(row => {
    let html = "";
    if (slotNum === 1) {
      html += `<td class='hide-on-narrow' style='${CELL_STYLE}'>${fmtAsset(row.asset)}</td>`;
    }
    html += `<td class='${cls(row.profit)}' style='${CELL_STYLE}'>${fmtProfit(row.profit)}</td>`;
    html += `<td class='${cls(row.rate)}' style='${CELL_STYLE}'>${fmtRate(row.rate)}</td>`;
    html += `<td class='hide-on-cover ${(row.mdd < 0 ? 'val-minus' : '')}' style='${CELL_STYLE}'>${fmtMdd(row.mdd)}</td>`;
    return `<tr>${html}</tr>`;
  }).join('');
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
  renderChartAll();
  refreshStatsTable();
}

function toggleCurrencyMode() {
  isCurrencyKRW = !isCurrencyKRW;
  syncCurrencyUI();
  refreshAllUI();
}

function syncCurrencyUI() {
  const btn = document.getElementById('btnCurrencyToggle');
  if (!btn) return;
  const ICON_USD = `<img src="https://flagcdn.com/w40/us.png" style="width:16px; height:12px; border-radius:2px; margin-right:5px; flex-shrink:0; box-shadow: 0 0 2px rgba(0,0,0,0.5);">`;
  const ICON_KRW = `<img src="https://flagcdn.com/w40/kr.png" style="width:16px; height:12px; border-radius:2px; margin-right:5px; flex-shrink:0; box-shadow: 0 0 2px rgba(0,0,0,0.5);">`;
  btn.style.display = "flex"; btn.style.alignItems = "center"; btn.style.justifyContent = "center";
  btn.style.minWidth = "70px"; btn.style.padding = "4px 8px"; btn.style.marginLeft = "auto"; btn.style.marginRight = "0px";
  btn.innerHTML = isCurrencyKRW ? `${ICON_KRW} KRW` : `${ICON_USD} USD`;
  btn.style.color = '#fff'; btn.style.border = 'none'; btn.style.outline = 'none'; btn.style.boxShadow = 'none'; btn.style.background = 'none'; btn.style.fontWeight = 'bold';
}

function updateDefaultCurrency(val) {
  if (myUserId) {
    localStorage.setItem(`vtotal_pref_currency_${myUserId}`, val);
    showToast(`기본 통화가 ${val === 'KRW' ? '원화' : '달러'}로 설정되었습니다. 새로고침 시 적용됩니다.`);
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

function renderPeriodBarChart() {
  const canvas = document.getElementById('periodBarChart');
  const wrapper = document.getElementById('periodBarChartWrapper');
  if (!canvas || !wrapper) return;

  if (periodBarChartInstance) { periodBarChartInstance.destroy(); periodBarChartInstance = null; }

  canvas.style.display = 'block';
  canvas.style.marginBottom = '0';
  wrapper.style.padding = '0';
  wrapper.style.margin = '0';
  wrapper.style.lineHeight = '0';
  wrapper.style.overflow = 'hidden';

  const isYearly = (periodViewState === 1);
  const globalDataArr = isYearly ? globalYearlyDataArr : globalMonthlyDataArr;

  let allPeriods = new Set();
  for (let i = 1; i <= MAX_SLOTS; i++) {
    if (globalDataArr[i] && isSlotActive(i)) {
      globalDataArr[i].forEach(r => allPeriods.add(r.period));
    }
  }
  const sortedPeriods = [...allPeriods].sort().reverse();
  if (sortedPeriods.length === 0) return;

  const labels = sortedPeriods.map(p => {
    if (periodViewState === 0 && p.length === 7) return p.substring(2).replace('-', '/');
    return p;
  });

  const fx = isCurrencyKRW ? currentFXRate : 1;
  const isKRW = isCurrencyKRW;
  let datasets = [];

  let activeSlotIndexes = [];
  for (let i = 1; i <= MAX_SLOTS; i++) {
    if (isSlotActive(i) && globalDataArr[i]) activeSlotIndexes.push(i);
  }

  // 데이터맵 생성
  const slotMaps = Array(MAX_SLOTS + 1).fill(null);
  activeSlotIndexes.forEach(i => {
    slotMaps[i] = {};
    globalDataArr[i].forEach(r => slotMaps[i][r.period] = r);
  });

  // 수익금 & 수익률 계산
  const slotProfits = Array(MAX_SLOTS + 1).fill([]);
  const slotRates = Array(MAX_SLOTS + 1).fill([]);

  activeSlotIndexes.forEach(i => {
    slotProfits[i] = sortedPeriods.map(p => slotMaps[i][p] ? Math.round((slotMaps[i][p].profit * fx) / (isKRW ? 10000 : 1)) : 0);
    slotRates[i] = sortedPeriods.map(p => slotMaps[i][p] ? Number((slotMaps[i][p].rate * 100).toFixed(2)) : 0);
  });

  // 수익금 오차 방지를 위한 보정 (마지막 슬롯에게 잔여 오차 몰아주기)
  if (activeSlotIndexes.length >= 2) {
    const combinedMap = {};
    const combinedData = isYearly ? globalCombinedYearlyData : globalCombinedMonthlyData;
    if (combinedData) combinedData.forEach(r => combinedMap[r.period] = r);

    const lastIdx = activeSlotIndexes[activeSlotIndexes.length - 1];
    slotProfits[lastIdx] = sortedPeriods.map((p, pIdx) => {
      let hasData = false;
      activeSlotIndexes.forEach(si => { if (slotMaps[si][p]) hasData = true; });
      if (!hasData) return 0;

      const rawTotal = combinedMap[p] ? combinedMap[p].profit : 0;
      const totalRounded = Math.round((rawTotal * fx) / (isKRW ? 10000 : 1));

      let sumOther = 0;
      for (let j = 0; j < activeSlotIndexes.length - 1; j++) {
        sumOther += slotProfits[activeSlotIndexes[j]][pIdx];
      }
      return totalRounded - sumOther;
    });
  }

  // 막대 그래프 데이터셋 추가
  activeSlotIndexes.forEach((slotNum, index) => {
    const isFirst = (index === 0);
    const isLast = (index === activeSlotIndexes.length - 1);

    let borderRadius = { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 };
    if (activeSlotIndexes.length === 1) {
      borderRadius = { topLeft: 4, topRight: 4, bottomLeft: 4, bottomRight: 4 };
    } else {
      if (isFirst) borderRadius = { topLeft: 0, topRight: 0, bottomLeft: 4, bottomRight: 4 };
      else if (isLast) borderRadius = { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 };
    }

    datasets.push({
      label: (getSlotConfig(slotNum)?.basics?.strategy || `투자법 ${slotNum}`) + ' 수익금',
      data: slotProfits[slotNum],
      backgroundColor: SLOT_COLORS[(slotNum - 1) % SLOT_COLORS.length] + '80', // 반투명
      borderColor: SLOT_COLORS[(slotNum - 1) % SLOT_COLORS.length],
      borderWidth: 1,
      borderRadius: borderRadius,
      yAxisID: 'y',
      stack: 'profit',
      order: 2
    });
  });

  // 평균 수익률 꺾은선 추가
  if (activeSlotIndexes.length > 0) {
    const combinedRates = sortedPeriods.map((p, i) => {
      let sum = 0;
      activeSlotIndexes.forEach(si => sum += slotRates[si][i]);
      return Number((sum / activeSlotIndexes.length).toFixed(2));
    });

    datasets.push({
      label: '평균 수익률',
      data: combinedRates,
      type: 'line',
      borderColor: '#a855f7',
      backgroundColor: '#a855f7',
      borderWidth: 3,
      pointRadius: 2,
      pointBackgroundColor: '#a855f7',
      tension: 0.3,
      yAxisID: 'yRate',
      order: 1
    });
  }

  if (datasets.length === 0) return;

  const profitLabelPlugin = {
    id: 'periodProfitLabels',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      ctx.save();
      ctx.font = `bold 10px "Inter", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      const meta = chart.getDatasetMeta(datasets.findIndex(d => d.stack === 'profit'));
      if (!meta || !meta.data) { ctx.restore(); return; }

      const stackMetas = chart.data.datasets.map((d, i) => d.stack === 'profit' ? chart.getDatasetMeta(i) : null).filter(m => m !== null);
      const topMeta = stackMetas[stackMetas.length - 1];

      topMeta.data.forEach((bar, i) => {
        let total = 0;
        activeSlotIndexes.forEach(si => total += slotProfits[si][i]);
        if (total === 0) return;

        let label = isKRW
          ? (total > 0 ? '+' : (total < 0 ? '-' : '')) + Math.abs(total).toLocaleString() + '만'
          : (total > 0 ? '+$' : (total < 0 ? '-$' : '$')) + Math.abs(total).toLocaleString();

        const yPos = total >= 0 ? bar.y - 5 : bar.y + 15;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillText(label, bar.x, yPos);
      });
      ctx.restore();
    }
  };

  const minBarWidth = isYearly ? 100 : 70;
  const containerWidth = wrapper.parentElement.clientWidth;
  const neededWidth = labels.length * minBarWidth;
  wrapper.style.minWidth = neededWidth > containerWidth ? neededWidth + 'px' : '100%';

  const ctx = canvas.getContext('2d');
  periodBarChartInstance = new Chart(ctx, {
    type: 'bar',
    data: { labels: labels, datasets: datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      layout: { padding: { top: 15, bottom: 4, left: 0, right: 0 } },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1, padding: 10,
          titleFont: { family: 'Outfit', size: 12, weight: 'bold' }, bodyFont: { family: 'Inter', size: 11 }, cornerRadius: 8,
          callbacks: {
            label: function (c) {
              const v = c.parsed.y;
              if (c.dataset.yAxisID === 'yRate') return `${c.dataset.label}: ${v > 0 ? '+' : ''}${v.toFixed(2)}%`;
              if (isKRW) return `${c.dataset.label}: ${v >= 0 ? '+' : '-'}${Math.abs(v).toLocaleString()}만원`;
              return `${c.dataset.label}: ${v >= 0 ? '+$' : '-$'}${Math.abs(v).toLocaleString()}`;
            }
          }
        }
      },
      scales: {
        x: {
          stacked: true, grid: { display: false, tickLength: 0, drawTicks: false, drawBorder: false },
          ticks: { font: { family: 'Inter', size: 9 }, color: '#94a3b8', autoSkip: false, maxTicksLimit: 50 }
        },
        y: {
          stacked: true, position: 'left', grid: { color: 'rgba(255, 255, 255, 0.05)', tickLength: 0, drawTicks: false, drawBorder: false },
          ticks: { font: { family: 'Inter', size: 10 }, color: '#94a3b8', callback: function (v) { return isKRW ? v.toLocaleString() + '만' : '$' + v.toLocaleString(); } }
        },
        yRate: {
          position: 'right', grid: { display: false },
          ticks: { font: { family: 'Inter', size: 10, weight: 'bold' }, color: '#a855f7', callback: function (v) { return v + '%'; } },
          title: { display: false }
        }
      }
    },
    plugins: [profitLabelPlugin]
  });
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
  const rows = [];
  let activeCount = 0;

  for (let i = 1; i <= MAX_SLOTS; i++) {
    if (isSlotActive(i)) {
      activeCount++;
      rows.push({ res: getBestResult(lastBTResults[i], i), name: getSlotConfig(i)?.basics?.strategy || `투자법 ${i}`, color: SLOT_COLORS[(i - 1) % SLOT_COLORS.length] });
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

  if (rows.length === 0) { table.innerHTML = '<tr><td style="text-align:center; padding:20px; color:#94a3b8;">데이터가 없습니다.</td></tr>'; return; }

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
    { key: 'cash', label: '예수금', type: 'fmt' },
    { key: 'evalReturn', label: '평가수익', type: 'color', pct: true },
    { key: 'qty', label: '주식수', type: 'raw', suffix: '주' },
    { key: 'currPrice', label: '현재가', type: 'price' },
    { key: 'avgPrice', label: '평균단가', type: 'price' },
    { key: 'base', label: '갱신금', type: 'fmt' },
    { key: 'mdd', label: '전체 MDD', type: 'color', pct: true },
    { key: 'cagr', label: 'CAGR', type: 'color', pct: true },
    { key: 'calmar', label: '칼마비율', type: 'raw' }
  ];

  let html = '<div style="display:flex; flex-direction:column; gap:2px; padding:2px; box-sizing:border-box;">';
  html += '<div style="display:flex; align-items:center; gap:4px; padding:2px 3px; box-sizing:border-box; line-height:1; height:18px; border-bottom:1px solid rgba(255,255,255,0.1);">';
  html += '<div style="font-size:11px; font-weight:700; letter-spacing:-0.2px; line-height:1; min-width:75px; flex-shrink:0; color:var(--text-muted); text-align:center;">투자법</div>';
  metricsList.forEach(m => {
    html += `<div style="flex:1; min-width:48px; font-size:10px; font-weight:700; letter-spacing:-0.2px; line-height:1; text-align:center; color:var(--text-muted); white-space:nowrap;">${m.label}</div>`;
  });
  html += '</div>';

  rows.forEach((r) => {
    const isCombo = (r.name === '합산');
    const displaySummary = r.res ? r.res.summary : null;
    html += `<div style="display:flex; align-items:center; gap:4px; background:rgba(255,255,255,0.04); border-radius:3px; padding:2px 3px; box-sizing:border-box; line-height:1; min-height:18px;">`;
    html += `<div style="font-size:11px; font-weight:700; letter-spacing:-0.2px; line-height:1; min-width:75px; flex-shrink:0; color:${r.color}; display:flex; align-items:center;">${r.name}</div>`;
    metricsList.forEach(m => {
      let cellVal = fmtValue(displaySummary, m, isCombo);
      html += `<div style="flex:1; min-width:48px; font-size:11px; font-weight:400; text-align:center; line-height:1; white-space:nowrap;">${cellVal}</div>`;
    });
    html += '</div>';
  });
  html += '</div>';
  table.innerHTML = html;
}

function renderMetrics(s, days, slotNum) { refreshStatsTable(); }

const peakAnnotationPlugin = {
  id: 'peakAnnotation',
  afterDatasetsDraw(chart) {
    const { ctx, scales: { x, y, y1 }, data } = chart;
    if (!data || !data.datasets || data.datasets.length === 0) return;

    let globalMaxAsset = -Infinity, globalMaxAssetIdx = -1, globalMaxAssetColor = '#6366f1';
    let globalMinMdd = Infinity, globalMinMddIdx = -1, globalMinMddColor = '#ef4444';

    data.datasets.forEach((ds) => {
      if (ds.label && ds.label.includes('자산') && ds.data) {
        ds.data.forEach((val, i) => {
          if (val !== null && val > globalMaxAsset) { globalMaxAsset = val; globalMaxAssetIdx = i; globalMaxAssetColor = ds.borderColor; }
        });
      }
      if (ds.label && ds.label.includes('MDD') && ds.data) {
        ds.data.forEach((val, i) => {
          if (val !== null && val < globalMinMdd) { globalMinMdd = val; globalMinMddIdx = i; globalMinMddColor = ds.borderColor; }
        });
      }
    });

    const fontSize = 11;
    ctx.save();
    ctx.font = `bold ${fontSize}px "Outfit", "Inter", sans-serif`;

    function drawLabel(text, px, py, color, isAsset) {
      ctx.beginPath(); ctx.arc(px, py, 4, 0, 2 * Math.PI); ctx.fillStyle = color; ctx.fill();
      let textX = px - 6, textY = isAsset ? py - 6 : py + 10;
      ctx.textAlign = 'right'; ctx.textBaseline = isAsset ? 'bottom' : 'top';
      if (px < 60) { textX = px + 6; ctx.textAlign = 'left'; }
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.strokeText(text, textX, textY); ctx.fillStyle = color; ctx.fillText(text, textX, textY);
    }

    if (globalMaxAssetIdx >= 0 && isFinite(globalMaxAsset)) {
      const label = isCurrencyKRW ? `${Math.round(globalMaxAsset).toLocaleString()}만` : `$${Math.round(globalMaxAsset).toLocaleString()}`;
      drawLabel(label, x.getPixelForValue(globalMaxAssetIdx), y.getPixelForValue(globalMaxAsset), globalMaxAssetColor, true);
    }
    if (globalMinMddIdx >= 0 && isFinite(globalMinMdd)) {
      drawLabel(`${globalMinMdd.toFixed(1)}%`, x.getPixelForValue(globalMinMddIdx), y1.getPixelForValue(globalMinMdd), globalMinMddColor, false);
    }
    ctx.restore();
  }
};

const titleClickPlugin = {
  id: 'titleClick',
  afterEvent(chart, args) {
    const evt = args.event;
    if (evt.type === 'click' && evt.y <= 28) toggleChartView();
  }
};

window.currentChartSignature = "";

function renderChartAll() {
  const validRes = [];
  for (let i = 1; i <= MAX_SLOTS; i++) {
    if (isSlotActive(i) && lastBTResults[i]) validRes.push(lastBTResults[i]);
  }
  renderChart(validRes);
}

function renderChart(resultsArray) {
  const validRes = (Array.isArray(resultsArray) ? resultsArray : Array.from(arguments)).filter(r => r && r.chartDates && r.chartBalances);
  if (validRes.length === 0) {
    if (myChart) { myChart.destroy(); myChart = null; }
    window.currentChartSignature = "";
    return;
  }

  const sigs = validRes.map(r => r.summary ? `${r.currentStrat}_${r.summary.totalAssets}_${r.chartDates.length}` : "null");
  const newSig = sigs.join('|') + "|" + chartViewMode + "|" + isCurrencyKRW;

  let namesStr = validRes.map(r => r.currentStrat);
  let titleSuffix = namesStr.length > 0 ? (namesStr.length > 1 ? '(종합)' : `(${namesStr[0]})`) : '';

  if (chartViewMode > 0 && chartViewMode <= MAX_SLOTS) {
    const cfg = getSlotConfig(chartViewMode);
    titleSuffix = `(${cfg?.basics?.strategy || `투자법 ${chartViewMode}`})`;
  }

  const cTitle = document.getElementById('chartTitle');
  const smallStyle = 'style="font-size:0.85em; font-weight:normal; opacity:0.8; margin-left:2px;"';
  if (cTitle) cTitle.innerHTML = `📈 성과추이 <span ${smallStyle}>${titleSuffix}</span>`;

  if (window.currentChartSignature === newSig) return;
  window.currentChartSignature = newSig;

  if (myChart) myChart.destroy();
  document.getElementById('chartBox').innerHTML = '<canvas id="balanceChart" class="view-transition"></canvas>';
  const ctx = document.getElementById('balanceChart').getContext('2d');

  const chartFontSize = 11;
  Chart.defaults.font.size = chartFontSize;

  const allDatesSet = new Set();
  validRes.forEach(r => r.chartDates.forEach(d => allDatesSet.add(d)));
  const universalDates = Array.from(allDatesSet).sort();
  if (universalDates.length === 0) return;

  const shortDates = universalDates.map(d => {
    const p = d.split('-');
    if (p.length < 3) return d;
    let y = p[0].length === 4 ? p[0].substring(2) : p[0];
    return `${y}-${parseInt(p[1])}-${p[2]}`;
  });

  const fx = isCurrencyKRW ? currentFXRate : 1;
  const isKRW = isCurrencyKRW;

  const alignData = (resDates, resValues, skipFX = false) => {
    const map = {};
    resDates.forEach((d, i) => { map[d] = resValues[i]; });
    return universalDates.map(d => {
      if (map[d] === undefined) return null;
      if (skipFX) return map[d];
      return isKRW ? Math.round(map[d] * fx / 10000) : Math.round(map[d]);
    });
  };

  let datasets = [];
  let allMddValues = [];

  for (let i = 1; i <= MAX_SLOTS; i++) {
    if (isSlotActive(i) && lastBTResults[i]) {
      // chartViewMode가 0이면 모두 그림. 1 이상이면 해당 슬롯만 그림.
      if (chartViewMode === 0 || chartViewMode === i) {
        const res = lastBTResults[i];
        const sName = getSlotConfig(i)?.basics?.strategy || `투자법 ${i}`;
        const alignedBA = alignData(res.chartDates, res.chartBalances, false);
        const mdd = res.chartMdd.map(v => v * 100);
        const alignedMDD = alignData(res.chartDates, mdd, true);

        const color = SLOT_COLORS[(i - 1) % SLOT_COLORS.length];
        const grad = ctx.createLinearGradient(0, 0, 0, 400);
        grad.addColorStop(0, color + '4D'); // 30% alpha
        grad.addColorStop(1, color + '00'); // 0% alpha

        datasets.push(
          { label: sName + ' 자산', data: alignedBA, borderColor: color, yAxisID: 'y', borderWidth: 2, pointRadius: 0, fill: true, backgroundColor: grad, tension: 0.2 },
          // 1️⃣ MDD 색상을 color로 변경 완료
          { label: sName + ' MDD', data: alignedMDD, borderColor: color, borderDash: [4, 4], yAxisID: 'y1', borderWidth: 1, pointRadius: 0, fill: false, tension: 0.2 }
        );
        allMddValues = allMddValues.concat(mdd);
      }
    }
  }

  const worstMdd = Math.min.apply(null, allMddValues.filter(v => v !== null && isFinite(v)));
  const dynamicMddMin = isFinite(worstMdd) ? Math.floor(worstMdd) - 10 : -50;

  // 2️⃣ 툴팁 위치를 bottomLeft로 설정 완료 (x축 값을 0으로 고정)
  if (Chart.Tooltip && !Chart.Tooltip.positioners.bottomLeft) {
    Chart.Tooltip.positioners.bottomLeft = function (items) {
      if (!items.length) return false;
      const chart = this.chart;
      return { x: 0, y: chart.height };
    };
  }

  myChart = new Chart(ctx, {
    type: 'line',
    data: { labels: shortDates, datasets: datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        title: { display: false }, legend: { display: false },
        tooltip: {
          // 3️⃣ 툴팁 속성을 bottomLeft 및 left 정렬로 변경 완료
          enabled: true, position: 'bottomLeft', xAlign: 'left', yAlign: 'bottom',
          backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1, padding: 8,
          titleFont: { family: 'Outfit', size: chartFontSize, weight: 'bold' }, bodyFont: { family: 'Inter', size: chartFontSize },
          cornerRadius: 8, displayColors: true,
          callbacks: {
            label: function (c) {
              let l = c.dataset.label || '';
              if (l.includes('자산')) return `${l}: ${isKRW ? '' : '$'}${c.parsed.y.toLocaleString()}${isKRW ? '만' : ''}`;
              if (l.includes('MDD')) return `${l}: ${c.parsed.y.toFixed(2)}%`;
              return `${l}: ${c.parsed.y}`;
            }
          }
        },
        zoom: { pan: { enabled: true, mode: 'x' }, zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' } }
      },
      scales: {
        y: {
          position: 'left', grace: '10%', grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { font: { family: 'Inter', size: chartFontSize - 2 }, color: '#94a3b8', callback: function (v) { return v.toLocaleString() + (isKRW ? '만' : '$'); } }
        },
        y1: {
          position: 'right', min: dynamicMddMin, max: 0, grid: { display: false },
          ticks: { font: { family: 'Inter', size: chartFontSize - 2 }, color: '#ef4444', callback: function (v) { return v.toFixed(1) + '%'; } }
        }
      }
    },
    plugins: [peakAnnotationPlugin, titleClickPlugin]
  });

  setTimeout(() => {
    if (typeof myChart !== "undefined" && myChart && datasets.length > 0 && datasets[0].data.length > 0) {
      const lastIdx = datasets[0].data.length - 1;
      const meta = myChart.getDatasetMeta(0);
      if (meta && meta.data && meta.data[lastIdx]) {
        const point = meta.data[lastIdx];
        const elements = datasets.map((_, i) => ({ datasetIndex: i, index: lastIdx }));
        myChart.setActiveElements(elements);
        myChart.tooltip.setActiveElements(elements, { x: point.x, y: point.y });
        myChart.update();
      }
    }
  }, 100);
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
      if (activeScrollTarget) return;
      if (absX > absY && absX > 30) { callback(ev.deltaX < 0 ? 'left' : 'right'); if (navigator.vibrate) navigator.vibrate(8); }
    });
  };

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
  const activeSlotName = (activeSettingsTab <= MAX_SLOTS) ? `투자법 ${activeSettingsTab}` : "투자법";
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
  }).then(() => {
    showToast(`$${amount.toLocaleString()} 처리 완료! 데이터를 다시 불러옵니다.`, "💰");
    if (btn) btn.innerHTML = orgText;
    refreshAllUI();
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

function exportTradeHistoryToCSV() {
  const slotNum = activeSettingsTab;
  const res = lastBTResults[slotNum];

  // dailyStates에는 주말/휴장일을 제외한 모든 거래일의 기록이 담겨있습니다.
  if (!res || !res.dailyStates || res.dailyStates.length === 0) {
    alert("저장할 매매 기록이 없습니다. 수동 백테스트를 실행해주세요.");
    return;
  }

  // 1. 모든 매매기록(완료된 거래 + 현재 보유 중인 미실현 거래)을 매수일 기준으로 그룹화
  const tradesByBuyDate = {};

  // 완료된 거래 (매도 완료)
  if (res.trades) {
    res.trades.forEach(t => {
      if (!tradesByBuyDate[t.buyDate]) tradesByBuyDate[t.buyDate] = [];
      tradesByBuyDate[t.buyDate].push(t);
    });
  }

  // 미실현 거래 (보유 중)
  if (res.inv) {
    res.inv.forEach(h => {
      if (!tradesByBuyDate[h.buyDate]) tradesByBuyDate[h.buyDate] = [];
      tradesByBuyDate[h.buyDate].push({
        buyDate: h.buyDate,
        sellDate: '보유중',
        mode: h.mode,
        tier: h.tier,
        buyPrice: h.buy_price,
        sellPrice: 0,
        qty: h.qty
      });
    });
  }

  let csvContent = "\uFEFF"; // 한글 깨짐 방지 BOM
  csvContent += "날짜(영업일),매도일,모드,티어,매수가,매도가,수량,총잔고(마감),갱신금(마감)\n";

  // 2. 엔진이 기록한 모든 실제 거래일(dailyStates)을 순차적으로 순회
  res.dailyStates.forEach(state => {
    const dateStr = state.date;
    const asset = state.asset.toFixed(2);

    let renewCash = "0.00";
    try {
      const parsed = JSON.parse(state.json);
      // 백테스트 엔진 내 base_principal 또는 base 필드 추출
      renewCash = (parsed.base_principal || parsed.base || 0).toFixed(2);
    } catch (e) { }

    const dayTrades = tradesByBuyDate[dateStr];

    if (dayTrades && dayTrades.length > 0) {
      // 해당 날짜에 매수한 기록이 1개 이상 있는 경우 (각 매수 건별로 행 추가)
      dayTrades.forEach(t => {
        const sellD = t.sellDate || '-';
        const sPrice = t.sellPrice > 0 ? t.sellPrice.toFixed(2) : '-';

        const row = [
          dateStr,
          sellD,
          t.mode,
          t.tier,
          t.buyPrice.toFixed(2),
          sPrice,
          t.qty,
          asset,
          renewCash
        ];
        csvContent += row.join(",") + "\n";
      });
    } else {
      // 해당 날짜에 시드가 0이거나 조건이 안 맞아 매수를 아예 안 한 경우 (빈칸 기록)
      const row = [
        dateStr,
        '-', // 매도일
        '-', // 모드
        '-', // 티어
        '-', // 매수가
        '-', // 매도가
        '-', // 수량
        asset, // 총잔고(마감)
        renewCash // 갱신금(마감)
      ];
      csvContent += row.join(",") + "\n";
    }
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `VTOTAL_BACKTEST_SLOT${slotNum}_DAILY_LOG_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast("모든 영업일 기록이 엑셀로 저장되었습니다.", "📊");
}
