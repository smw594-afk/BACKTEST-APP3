// script.js (UI 컨트롤, 데이터 통신 및 차트 렌더링)

const APP_VERSION = "3.000";

// 글로벌 상태 변수
// 글로벌 상태 변수 (isCurrencyKRW, currentFXRate는 engine.js로 이동됨)
let myUserId = "";
let myChart = null;
let currentOrderDate = "";
let isOrderView = true;
let isStatsMode = false;
let isViewingHistory = false;
let lastMyPerfData = null;
let perfLastCheckTime = 0;
let currentActiveConfigStr = "";
let lastBTResult = null;
let activeSettingsTab = 1;
let slot1Config = null;
let slot2Config = null;
let slot3Config = null;
let lastBTResult1 = null;
let lastBTResult2 = null;
let lastBTResult3 = null;
let globalMonthlyData1 = []; let globalYearlyData1 = [];
let globalMonthlyData2 = []; let globalYearlyData2 = [];
let globalMonthlyData3 = []; let globalYearlyData3 = [];
let globalMonthlyData4 = []; let globalYearlyData4 = [];
let periodViewState = 0;
let isMonthlyExpanded = false;
let globalMonthlyData = [];
let globalYearlyData = [];
let chartViewMode = 0;
let periodBarChartInstance = null;
let periodDisplayMode = 'chart';
let isManualBacktestMode = false;
let simulationConfigs = { 1: null, 2: null, 3: null };



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

function restoreSimulationUI() {
  if (!isViewingHistory) return;
  try {
    const id = myUserId ? myUserId : localStorage.getItem('vtotal_id');
    const s1Raw = localStorage.getItem(`vtotal_snap1_${id}`);
    const s2Raw = localStorage.getItem(`vtotal_snap2_${id}`);
    const s3Raw = localStorage.getItem(`vtotal_snap3_${id}`);

    if (s1Raw) {
      const snap1 = JSON.parse(s1Raw);
      lastBTResult1 = snap1; lastBTResult = snap1;
      updateUIWithResult(snap1, slot1Config, 1, true);

      if (s2Raw && isSlot2Active()) {
        const snap2 = JSON.parse(s2Raw);
        lastBTResult2 = snap2;
        updateUIWithResult(snap2, slot2Config, 2, true);
      } else { lastBTResult2 = null; }

      if (s3Raw && isSlot3Active()) {
        const snap3 = JSON.parse(s3Raw);
        lastBTResult3 = snap3;
        updateUIWithResult(snap3, slot3Config, 3, true);
      } else { lastBTResult3 = null; }

      renderChart(lastBTResult1, lastBTResult2, lastBTResult3);
    }
    showToast("이전(캐시) 데이터로 복원 완료", "✅");
  } catch (e) { console.error("Restore Failed:", e); } finally { isViewingHistory = false; isManualBacktestMode = false; updateHeaderDisplay(); }
}

// ⭐️ 실전 계좌 모드로 강제 복원하는 공통 함수
async function restoreRealAccountMode() {
  if (!confirm("🔄 실전 데이터 모드로 복원하시겠습니까?\n\n현재 화면의 백테스트 결과가 사라지고 시트의 실시간 데이터로 교체됩니다.")) return;

  isViewingHistory = false;
  isManualBacktestMode = false;
  updateHeaderDisplay();
  setLED('loading');
  await checkAndSyncWithServer(true); // 서버 동기화 강제 실행
  setLED('on');
  showToast("✅ 실전 데이터로 복원되었습니다.");
}

function isPerfCacheValid() {
  if (!lastMyPerfData) return false;
  const now = new Date();
  const last = new Date(perfLastCheckTime);
  return now.getFullYear() === last.getFullYear() && now.getMonth() === last.getMonth() && now.getDate() === last.getDate();
}

function renderPerfFromCache(strat1Name, strat2Name, strat3Name) {
  if (!lastMyPerfData) return;
  const strats = [
    { key: 'strat1', name: strat1Name, cfg: slot1Config },
    { key: 'strat2', name: strat2Name, cfg: slot2Config },
    { key: 'strat3', name: strat3Name, cfg: slot3Config }
  ];
  strats.forEach((s, i) => {
    const slotNum = i + 1;
    const d = lastMyPerfData[s.key];
    if (d && d.logs && d.logs.length > 0) {
      const res = processRealLogData(d, s.name, s.cfg?.basics?.startDate);
      if (res) updateUIWithResult(res, s.cfg, slotNum, true);
    }
  });
  calculateCombinedPeriodData();
  renderChart(lastBTResult1, lastBTResult2, lastBTResult3);
}

function showOrderView() {
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
  isStatsMode = true;
  isOrderView = false;

  const grid = document.getElementById('mainGrid');
  if (grid) grid.classList.add('perf-metrics-layout');
  const btnStats = document.getElementById('btnStatsShow');
  if (btnStats) btnStats.classList.add('active');

  const s1 = getSlotConfig(1)?.basics?.strategy || "";
  const s2 = isSlot2Active() ? (getSlotConfig(2)?.basics?.strategy || "") : "";
  const s3 = isSlot3Active() ? (getSlotConfig(3)?.basics?.strategy || "") : "";

  renderPerfFromCache(s1, s2, s3);
}

function toggleOrderHoldings() { isOrderView = !isOrderView; refreshOrderViewDisplay(); }
function refreshOrderViewDisplay() { refreshOrderViewUI(); }

function toggleChartView() {
  if (!lastBTResult1) return;
  chartViewMode = (chartViewMode + 1) % 4;
  if (chartViewMode === 3 && !isSlot3Active()) chartViewMode = 0;
  if (chartViewMode === 2 && !isSlot2Active()) chartViewMode = 0;
  renderChart(lastBTResult1, lastBTResult2, lastBTResult3);
}

function switchSettingsTab(tabNum) {
  saveCurrentFormToSlot(activeSettingsTab);
  activeSettingsTab = tabNum;
  loadSlotToForm(tabNum);
  updateSettingsTabButtons();
  updateCurrentStatusUI(tabNum); // 탭 전환 시 상태창 즉시 업데이트
  document.getElementById('tabSlot1').style.background = (tabNum === 1) ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'rgba(51,65,85,0.8)';
  document.getElementById('tabSlot2').style.background = (tabNum === 2) ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(51,65,85,0.8)';
  document.getElementById('tabSlot3').style.background = (tabNum === 3) ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : 'rgba(51,65,85,0.8)';
}

function updateSettingsTabButtons() {
  const s1 = slot1Config?.basics?.strategy || "투자법 1";
  const s2 = slot2Config?.basics?.strategy || "투자법 2";
  const s3 = slot3Config?.basics?.strategy || "투자법 3";
  document.getElementById('tabSlot1').innerText = s1;
  document.getElementById('tabSlot2').innerText = s2;
  document.getElementById('tabSlot3').innerText = s3;
}

function saveCurrentFormToSlot(slotNum) {
  const cfg = gatherParams();
  if (slotNum === 1) { slot1Config = cfg; localStorage.setItem('vtotal_conf1_' + myUserId, JSON.stringify(cfg)); }
  else if (slotNum === 2) { slot2Config = cfg; localStorage.setItem('vtotal_conf2_' + myUserId, JSON.stringify(cfg)); }
  else { slot3Config = cfg; localStorage.setItem('vtotal_conf3_' + myUserId, JSON.stringify(cfg)); }
}

function loadSlotToForm(slotNum) {
  const cfg = (slotNum === 1) ? slot1Config : (slotNum === 2) ? slot2Config : slot3Config;
  if (cfg && cfg.basics) {
    initData(cfg);
  } else {
    document.getElementById('ticker').value = '';
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.getElementById('initialCash').value = '';
    document.getElementById('renewCash').value = '';
    document.getElementById('strategySelect').value = '';
    document.getElementById('fBase').value = '';
    document.getElementById('fSec').value = '';
  }
}

function isStrategySet(cfg) { return cfg && cfg.basics && cfg.basics.strategy && cfg.basics.strategy !== ""; }
function isSlot1Active() {
  if (isManualBacktestMode) return !!(simulationConfigs[1] && simulationConfigs[1].basics && simulationConfigs[1].basics.strategy);
  return isStrategySet(slot1Config);
}
function isSlot2Active() {
  if (isManualBacktestMode) return !!(simulationConfigs[2] && simulationConfigs[2].basics && simulationConfigs[2].basics.strategy);
  return isStrategySet(slot2Config);
}
function isSlot3Active() {
  if (isManualBacktestMode) return !!(simulationConfigs[3] && simulationConfigs[3].basics && simulationConfigs[3].basics.strategy);
  return isStrategySet(slot3Config);
}

function getSlotConfig(num) {
  if (isManualBacktestMode && simulationConfigs[num]) return simulationConfigs[num];
  if (num === 1) return slot1Config;
  if (num === 2) return slot2Config;
  if (num === 3) return slot3Config;
  return null;
}

function updateSlotsVisibility() {
  const statuses = [
    isManualBacktestMode ? (simulationConfigs[1] && simulationConfigs[1].basics && simulationConfigs[1].basics.strategy !== "") : isSlot1Active(),
    isManualBacktestMode ? (simulationConfigs[2] && simulationConfigs[2].basics && simulationConfigs[2].basics.strategy !== "") : isSlot2Active(),
    isManualBacktestMode ? (simulationConfigs[3] && simulationConfigs[3].basics && simulationConfigs[3].basics.strategy !== "") : isSlot3Active(),
  ];
  statuses.forEach((active, i) => {
    const num = i + 1;
    const v = document.getElementById('orderSlot' + num); if (v) v.style.display = active ? 'flex' : 'none';
    const m = document.getElementById('monthlySlot' + num); if (m) m.style.display = active ? 'block' : 'none';
  });

  const m0 = document.getElementById('monthlySlot0');
  if (m0) m0.style.display = (statuses[0] || statuses[1] || statuses[2]) ? 'block' : 'none';

  const activeCount = statuses.filter(s => s).length;
  const m4 = document.getElementById('monthlySlot4');
  if (m4) m4.style.display = (activeCount >= 2) ? 'block' : 'none';

  const panel = document.getElementById('panelMonthly');
  if (panel) {
    if (activeCount >= 2) panel.classList.add('dual-active');
    else panel.classList.remove('dual-active');
  }
  updatePeriodTitle();
  refreshStatsTable();
}

function toggleSlot2Visibility(show) { updateSlotsVisibility(); }

window.onload = function () {
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
          if (initData && initData.config) {
            localStorage.setItem(`vtotal_conf1_${id}`, JSON.stringify(initData.config));
            localStorage.setItem(`vtotal_conf_${id}`, JSON.stringify(initData.config));
          }
          if (initData && initData.config2) { localStorage.setItem(`vtotal_conf2_${id}`, JSON.stringify(initData.config2)); }
          if (initData && initData.config3) { localStorage.setItem(`vtotal_conf3_${id}`, JSON.stringify(initData.config3)); }
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

  updateCurrentFXRate(() => {
    if (isCurrencyKRW) refreshAllUI();
  });

  const userHeader = document.getElementById('userDisplayHeader');
  if (userHeader) userHeader.innerText = myUserId;
  if (document.getElementById('loginVersion')) document.getElementById('loginVersion').innerText = `v${APP_VERSION}`;
  if (document.getElementById('settingsVersion')) document.getElementById('settingsVersion').innerText = APP_VERSION;

  const prefCurrency = localStorage.getItem(`vtotal_pref_currency_${myUserId}`) || "USD";
  isCurrencyKRW = (prefCurrency === "KRW");
  const defaultCurrSelect = document.getElementById('defaultCurrency');
  if (defaultCurrSelect) defaultCurrSelect.value = prefCurrency;
  syncCurrencyUI();

  const savedConf1Str = localStorage.getItem('vtotal_conf1_' + myUserId) || localStorage.getItem(`vtotal_conf_${myUserId}`);
  const savedConf2Str = localStorage.getItem('vtotal_conf2_' + myUserId);
  const savedConf3Str = localStorage.getItem('vtotal_conf3_' + myUserId);
  if (savedConf1Str) { try { slot1Config = JSON.parse(savedConf1Str); } catch (e) { } }
  if (savedConf2Str) { try { slot2Config = JSON.parse(savedConf2Str); } catch (e) { } }
  if (savedConf3Str) { try { slot3Config = JSON.parse(savedConf3Str); } catch (e) { } }

  const snapStr = localStorage.getItem('vtotal_snap1_' + myUserId);
  const snapStr2 = localStorage.getItem('vtotal_snap2_' + myUserId);
  const snapStr3 = localStorage.getItem('vtotal_snap3_' + myUserId);

  const processSnap = (snapStr, slotNum, isActive) => {
    if (!snapStr || !isActive) {
      if (slotNum === 1 && isActive) { initData(slot1Config); setLED('loading'); }
      return;
    }
    try {
      const snap = JSON.parse(snapStr);
      if (slotNum === 1) {
        initData(slot1Config);
        lastBTResult = snap; lastBTResult1 = snap;
        document.getElementById('mainGrid').classList.remove('hide-order-panel');
        const op = document.getElementById('panelOrder'); if (op) op.classList.remove('hidden');
        globalMonthlyData = snap.monthlyData; globalYearlyData = snap.yearlyData;
        globalMonthlyData1 = snap.monthlyData; globalYearlyData1 = snap.yearlyData;
        if (snap.chartDates) renderChart(snap, null, null);
        setLED('loading');
      } else if (slotNum === 2) {
        lastBTResult2 = snap; globalMonthlyData2 = snap.monthlyData; globalYearlyData2 = snap.yearlyData;
      } else if (slotNum === 3) {
        lastBTResult3 = snap; globalMonthlyData3 = snap.monthlyData; globalYearlyData3 = snap.yearlyData;
      }
      renderOrderViewSlot(snap, slotNum);
      renderPeriodTableSlot(slotNum);
    } catch (e) { }
  };

  processSnap(snapStr, 1, isSlot1Active());
  processSnap(snapStr2, 2, isSlot2Active());
  processSnap(snapStr3, 3, isSlot3Active());

  updateSlotsVisibility();
  updatePeriodTitle();
  refreshStatsTable();

  const cachedCombined = localStorage.getItem(`vtotal_snap_combined_${myUserId}`);
  if (cachedCombined) {
    try {
      const c = JSON.parse(cachedCombined);
      globalMonthlyData4 = c.m || [];
      globalYearlyData4 = c.y || [];
      // ⭐️ 합산 성과 지표(Stats) 캐시 복원 추가
      if (c.stats && !lastBTResult1 && !lastBTResult2 && !lastBTResult3) {
        // 임시로 summary만 가진 객체를 생성하여 UI에 먼저 보여줌
        window.cachedCombinedStats = c.stats;
      }
      if (isSlot1Active() && (isSlot2Active() || isSlot3Active())) renderPeriodTableText(4);
    } catch (e) { }
  }

  renderChart(lastBTResult1, lastBTResult2, lastBTResult3);

  checkAndSyncWithServer(!slot1Config);
  checkPendingSync();
  setLED('on');
  initInstantButtonEvents();
  initStatsButtonEvents();
  initBacktestLongPress();
}

/**
 * 아이디 옆에 백테스트 모드 상태와 초기자산 금액을 업데이트하는 함수
 */
function updateHeaderDisplay() {
  const header = document.getElementById('userDisplayHeader');
  if (!header) return;

  if (!isViewingHistory) {
    header.innerText = myUserId;
    return;
  }

  // 백테스트 모드 표시 로직
  let assets = [];
  // 활성화된 슬롯의 설정값 수집
  if (isManualBacktestMode) {
    if (simulationConfigs[1]) assets.push(Number(simulationConfigs[1].basics.initialCash));
    if (simulationConfigs[2]) assets.push(Number(simulationConfigs[2].basics.initialCash));
    if (simulationConfigs[3]) assets.push(Number(simulationConfigs[3].basics.initialCash));
  } else {
    if (isSlot1Active() && slot1Config.basics.initialCash) assets.push(Number(unformatComma(String(slot1Config.basics.initialCash))));
    if (isSlot2Active() && slot2Config.basics.initialCash) assets.push(Number(unformatComma(String(slot2Config.basics.initialCash))));
    if (isSlot3Active() && slot3Config.basics.initialCash) assets.push(Number(unformatComma(String(slot3Config.basics.initialCash))));
  }

  // 중복 제거 (NaN 및 0 이하 제외)
  const uniqueAssets = [...new Set(assets.filter(a => !isNaN(a) && a > 0))];

  let label = " (백테스트";
  // 모든 활성 슬롯의 초기자산이 동일할 때만 금액 표시
  if (uniqueAssets.length === 1) {
    label += " $" + formatComma(uniqueAssets[0]);
  }
  label += ")";

  header.innerText = myUserId + label;
}

function selectQuickStrat(btn, stratName) {
  // 모든 투자법 버튼에서 active 제거
  const btns = document.querySelectorAll('.q-strat-btn');
  btns.forEach(b => b.classList.remove('active'));
  // 클릭한 버튼 active 추가
  btn.classList.add('active');
  // 히든 input에 값 저장
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
      restoreRealAccountMode(); // ⭐️ 실전 모드 복원 호출
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
  // 이제 클릭만 해도 설정창이 뜨도록 변경
  btn.onclick = () => openQuickConfig();
}

function openQuickConfig() {
  const overlay = document.getElementById('quickConfigOverlay');
  if (!overlay) return;

  // 요청하신 기본값으로 설정
  document.getElementById('qStrat1').value = '2M3D2(1.2)';
  document.getElementById('qStrat2').value = '2M3D2(2.0)';
  document.getElementById('qStrat3').value = '2M3D1-1P';

  document.getElementById('qTicker').value = 'SOXL';
  document.getElementById('qStartDate').value = '2026-01-01';
  document.getElementById('qEndDate').value = '';
  document.getElementById('qInitialCash').value = formatComma('40000');
  document.getElementById('qRenewCash').value = formatComma('40000');

  // 현재 설정창에 있는 수수료/SEC 값을 가져와 모달에 채워줌
  document.getElementById('qFBase').value = document.getElementById('fBase').value || '0.08';
  document.getElementById('qFSec').value = document.getElementById('fSec').value || '0.00278';

  document.getElementById('qBatchRaw').value = '';

  overlay.style.display = 'flex';
}

function handleQuickBatchParse(val) {
  if (!val) return;
  // 공백, 콤마, 슬래시 등으로 구분된 값을 찾음
  const parts = val.trim().split(/[\s,\|]+/).filter(v => v !== "");
  if (parts.length >= 1) {
    // 날짜 형식 체크 (YYYY-MM-DD)
    if (parts[0].match(/^\d{4}-\d{2}-\d{2}$/)) document.getElementById('qStartDate').value = parts[0];
  }
  if (parts.length >= 2) {
    if (parts[1].match(/^\d{4}-\d{2}-\d{2}$/)) document.getElementById('qEndDate').value = parts[1];
  }
  if (parts.length >= 3) {
    document.getElementById('qInitialCash').value = parts[2];
  }
  if (parts.length >= 4) {
    document.getElementById('qRenewCash').value = parts[3];
  }
}

function applyQuickConfig() {
  const t = document.getElementById('qTicker').value;
  const s = document.getElementById('qStartDate').value;
  const e = document.getElementById('qEndDate').value;
  const i = document.getElementById('qInitialCash').value;
  const r = document.getElementById('qRenewCash').value;
  const fb = document.getElementById('qFBase').value;
  const fs = document.getElementById('qFSec').value;

  const strategies = [
    document.getElementById('qStrat1').value,
    document.getElementById('qStrat2').value,
    document.getElementById('qStrat3').value
  ];

  if (strategies.every(st => st === "")) {
    alert("최소 한 개 이상의 투자법을 선택해주세요.");
    return;
  }

  // 수동 백테스트 모드 활성화
  isManualBacktestMode = true;
  isViewingHistory = true;

  // 각 슬롯별로 시뮬레이션 설정 저장 (원본 localStorage 및 slotConfig 변수는 유지)
  strategies.forEach((st, idx) => {
    const slotNum = idx + 1;
    if (st === "") {
      simulationConfigs[slotNum] = null;
    } else {
      simulationConfigs[slotNum] = {
        basics: {
          ticker: t,
          startDate: s,
          endDate: e,
          strategy: st,
          initialCash: unformatComma(i),
          renewCash: unformatComma(r),
          fBase: fb,
          fSec: fs
        }
      };
    }
  });

  document.getElementById('quickConfigOverlay').style.display = 'none';
  showToast("수동 백테스트 모드로 실행합니다. (원본 설정은 유지됨)", "🚀");
  runEngine();
}

async function checkAndSyncWithServer(isInitial) {
  setLED('loading');
  const userHeader = document.getElementById('userDisplayHeader');
  if (userHeader) userHeader.innerText = myUserId + ' (초고속 로딩 중...)';

  try {
    const runFastEngine = async (cfg, isActive, slotNum) => {
      if (!isActive) return null;
      const res = await runBacktestMemory(cfg, false, slotNum);
      if (res && res.status !== "error") {
        updateUIWithResult(res, cfg, slotNum, true); // ⭐️ 직접 할당 대신 통합 업데이트 함수 사용
        return res;
      }
      return null;
    };

    await runFastEngine(slot1Config, isSlot1Active(), 1);
    await runFastEngine(slot2Config, isSlot2Active(), 2);
    await runFastEngine(slot3Config, isSlot3Active(), 3);

    const track2Promise = (async () => {
      try {
        const resInit = await fetch(`${GAS_URL}?action=GET_INIT&id=${myUserId}`);
        const dataInit = await resInit.json();

        const s1Name = dataInit.config?.basics?.strategy || slot1Config?.basics?.strategy || "";
        const s2Name = dataInit.config2?.basics?.strategy || slot2Config?.basics?.strategy || "";
        const s3Name = dataInit.config3?.basics?.strategy || slot3Config?.basics?.strategy || "";

        const resPerf = await fetch(`${GAS_URL}?action=GET_MY_PERF&id=${myUserId}&strat1=${encodeURIComponent(s1Name)}&strat2=${encodeURIComponent(s2Name)}&strat3=${encodeURIComponent(s3Name)}`);
        const dataPerf = await resPerf.json();
        return { dataInit, dataPerf };
      } catch (e) { console.error("Track 2 Error:", e); return null; }
    })();

    // const track1Promise = await ... (이미 위에서 순차 실행 완료)
    if (!isSlot2Active()) toggleSlot2Visibility(false);
    renderChart(lastBTResult1, lastBTResult2, lastBTResult3);

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
      if (slotNum === 1) slot1Config = confData;
      else if (slotNum === 2) slot2Config = confData;
      else if (slotNum === 3) slot3Config = confData;

      let sheetLastDate = "1900-01-01";

      if (perfSlotData && perfSlotData.logs && perfSlotData.logs.length > 0) {
        perfSlotData.logs.forEach(r => {
          let dt = parseDateStr(r[0]);
          if (dt && dt > sheetLastDate) sheetLastDate = dt;
        });
        // ⭐️ 날짜가 유효할 때만 로컬스토리지 갱신 (누락 방지)
        if (sheetLastDate !== "1900-01-01") {
          localStorage.setItem(`vtotal_sheet_last_date_${slotNum}_${myUserId}`, sheetLastDate);
        }

        const configStartDate = confData.basics.startDate || "1900-01-01";
        const realData = processRealLogData(perfSlotData, confData.basics.strategy, configStartDate);

          if (realData) {
            localStorage.setItem(`vtotal_snap${slotNum}_${myUserId}`, JSON.stringify(realData));

            // 💰 [동기화 핵심] 시트에서 가져온 최신 갱신금은 '상태 출력창'에만 반영하고 입력 필드(config)는 건드리지 않음
            const sheetBase = fixFloat(realData.summary.base);
            // 메모리 config의 갱신금은 사용자가 입력한 초기값을 유지함
            
            // 이제 업데이트된 설정값으로 엔진을 실행하여 정합성을 맞춤
            const pureEngineRes = await runBacktestMemory(slotNum === 1 ? slot1Config : slotNum === 2 ? slot2Config : slot3Config, false, slotNum);
            const isEngOk = (pureEngineRes && pureEngineRes.summary);

          let mergedSnap = {
            ...realData,
            summary: isEngOk ? {
              ...pureEngineRes.summary,
              base: realData.summary.base,
              inout: realData.summary.inout,
              realPrincipal: realData.summary.realPrincipal,
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

          if (slotNum === 1) { lastBTResult1 = mergedSnap; lastBTResult = mergedSnap; }
          else if (slotNum === 2) { lastBTResult2 = mergedSnap; }
          else if (slotNum === 3) { lastBTResult3 = mergedSnap; }
          else if (slotNum === 4) { lastBTResult4 = mergedSnap; }

          updateUIWithResult(mergedSnap, confData, slotNum, false);
        }
      }
    };

    await syncSlotWithSheet(dataInit.config, dataPerf.strat1, 1);
    await syncSlotWithSheet(dataInit.config2, dataPerf.strat2, 2);
    await syncSlotWithSheet(dataInit.config3, dataPerf.strat3, 3);

    renderChart(lastBTResult1, lastBTResult2, lastBTResult3);
    calculateCombinedPeriodData();

    if (dataInit.hasSheet) checkAndRunAutoSave();

  } catch (e) {
    console.error("초기 통신 에러 (엔진 결과로 폴백):", e);
    // 서버 통신 실패 시 엔진으로 계산된 값이라도 UI에 반영
    if (lastBTResult1) updateUIWithResult(lastBTResult1, slot1Config, 1, false);
    if (lastBTResult2) updateUIWithResult(lastBTResult2, slot2Config, 2, false);
    if (lastBTResult3) updateUIWithResult(lastBTResult3, slot3Config, 3, false);
    setLED('error');
  } finally {
    updateHeaderDisplay();
    setLED('on');
  }
}

function checkAndRunAutoSave() {
  let sheetLastDate1 = localStorage.getItem(`vtotal_sheet_last_date_1_${myUserId}`) || "1900-01-01";
  let sheetLastDate2 = localStorage.getItem(`vtotal_sheet_last_date_2_${myUserId}`) || "1900-01-01";
  let sheetLastDate3 = localStorage.getItem(`vtotal_sheet_last_date_3_${myUserId}`) || "1900-01-01";

  let combinedMap = {};
  const addStates = (res, slotKey, lastDate) => {
    if (!res || !res.dailyStates) return;
    res.dailyStates.forEach(state => {
      if (state.date > lastDate) {
        if (!combinedMap[state.date]) combinedMap[state.date] = { date: state.date, s1: null, s2: null, s3: null };
        combinedMap[state.date][slotKey] = state;
      }
    });
  };

  addStates(lastBTResult1, 's1', sheetLastDate1);
  addStates(lastBTResult2, 's2', sheetLastDate2);
  addStates(lastBTResult3, 's3', sheetLastDate3);

  let batchLogs = Object.values(combinedMap).sort((a, b) => a.date.localeCompare(b.date));
  if (batchLogs.length === 0) return;

  setLED('loading');
  fetch(GAS_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: "AUTO_DAILY_SAVE", id: myUserId, logs: batchLogs }) })
    .then(() => {
      let finalDate = batchLogs[batchLogs.length - 1].date;
      if (batchLogs.some(b => b.s1)) localStorage.setItem(`vtotal_sheet_last_date_1_${myUserId}`, finalDate);
      if (batchLogs.some(b => b.s2)) localStorage.setItem(`vtotal_sheet_last_date_2_${myUserId}`, finalDate);
      if (batchLogs.some(b => b.s3)) localStorage.setItem(`vtotal_sheet_last_date_3_${myUserId}`, finalDate);
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

  const updateSlot = (slotNum, setConfigFunc, isActiveFunc, setResFunc) => {
    setConfigFunc(currentParams);
    if (isActiveFunc()) {
      runBacktestMemory(currentParams, false).then(res => {
        if (res.status !== "error") updateUIWithResult(res, currentParams, slotNum);
      });
    } else {
      setResFunc(null);
      updateSlotsVisibility();
      renderChart(lastBTResult1, lastBTResult2, lastBTResult3);
    }
  };

  if (activeSettingsTab === 1) updateSlot(1, v => slot1Config = v, isSlot1Active, v => lastBTResult1 = v);
  else if (activeSettingsTab === 2) updateSlot(2, v => slot2Config = v, isSlot2Active, v => lastBTResult2 = v);
  else updateSlot(3, v => slot3Config = v, isSlot3Active, v => lastBTResult3 = v);

  updateSlotsVisibility();
}

async function handleSave() {
  const targetSlot = activeSettingsTab; // 레이스 컨디션 방지를 위해 현재 슬롯 번호 캡처
  const btn = document.getElementById('btnSaveTop');
  const orgText = btn.innerHTML;
  btn.innerText = '준비 중...';

  try {
    saveCurrentFormToSlot(targetSlot);
    lastMyPerfData = null;
    isViewingHistory = false;

    // 1. 계산부터 먼저 수행 (대조를 위해 필요)
    const orgManualMode = isManualBacktestMode;
    let targetRes = null;
    try {
      isManualBacktestMode = true;
      const cfg = (targetSlot === 1 ? slot1Config : targetSlot === 2 ? slot2Config : slot3Config);
      targetRes = await runBacktestMemory(cfg, false, targetSlot);
    } finally {
      isManualBacktestMode = orgManualMode;
    }

    if (!targetRes || targetRes.status === "error") {
      showToast("❌ 계산 중 오류가 발생했습니다.");
      btn.innerHTML = orgText;
      return;
    }

    // 2. 통합 경고 메시지 구성 (시장 시간 + 종료일 + 수치 대조)
    let alertMsgs = [];
    const endDateVal = document.getElementById('endDate').value;
    const now = new Date();
    const nyHour = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }).format(now));

    if (nyHour < 17) {
      alertMsgs.push("🚨 [장 마감 전] 종가 미확정 데이터가 기록될 수 있습니다.");
    }
    if (endDateVal) {
      alertMsgs.push("⚠️ [종료일 설정] 실전 데이터가 과거 데이터로 덮어씌워질 수 있습니다.");
    }

    // 3. 시트 값과 정밀 대조
    const snapStr = localStorage.getItem(`vtotal_snap${targetSlot}_` + myUserId);
    let diffMsgs = [];
    if (snapStr) {
      const snap = JSON.parse(snapStr);
      const sheetB = fixFloat(snap.summary.base);
      const sheetC = fixFloat(snap.summary.cash);
      const sheetA = fixFloat(snap.summary.totalAssets);
      const appB = fixFloat(targetRes.summary.base);
      const appC = fixFloat(targetRes.summary.cash);
      const appA = fixFloat(targetRes.summary.totalAssets);

      if (Math.abs(sheetB - appB) > 0.009) diffMsgs.push(`● 갱신금: ${formatComma(sheetB.toFixed(2))} → ${formatComma(appB.toFixed(2))}`);
      if (Math.abs(sheetC - appC) > 0.009) diffMsgs.push(`● 캐쉬: ${formatComma(sheetC.toFixed(2))} → ${formatComma(appC.toFixed(2))}`);
      if (Math.abs(sheetA - appA) > 0.009) diffMsgs.push(`● 총잔고: ${formatComma(sheetA.toFixed(2))} → ${formatComma(appA.toFixed(2))}`);
    }

    // 4. 통합 확인창 띄우기
    let finalConfirmMsg = "📋 [시트 반영 수치 정밀 대조]\n";
    if (alertMsgs.length > 0) finalConfirmMsg += "\n" + alertMsgs.join("\n") + "\n";
    
    if (diffMsgs.length > 0) {
      finalConfirmMsg += "\n📊 [수치 변동 감지]\n" + diffMsgs.join("\n") + "\n";
    } else {
      finalConfirmMsg += "\n✅ 기존 시트 데이터와 일치합니다.\n";
    }
    finalConfirmMsg += "\n계산된 수치를 시트에 최종 반영하시겠습니까?";

    if (!confirm(finalConfirmMsg)) {
      btn.innerHTML = orgText;
      return;
    }

    // 5. 시트 반영 절차 계속 진행
    btn.innerText = '저장 중...';
    updateHeaderDisplay();

    renderChart(lastBTResult1, lastBTResult2, lastBTResult3);

    const current_phone_time = new Date().toLocaleString('sv-SE');
    localStorage.setItem('vtotal_last_sync_time', current_phone_time);

    const targetDate = (targetRes.chartDates) ? targetRes.chartDates[targetRes.chartDates.length - 1] : formatDateNY(new Date());

    let payload = {
      action: "BACKUP_AND_SAVE_V4",
      id: myUserId,
      sync_time: current_phone_time,
      date: targetDate,
      params: (targetSlot === 1) ? slot1Config : null,
      params2: (targetSlot === 2) ? slot2Config : null,
      params3: (targetSlot === 3) ? slot3Config : null,
      s1: (targetSlot === 1) ? { asset: fixFloat(targetRes.summary.totalAssets), inout: 0, json: JSON.stringify({ cash: fixFloat(targetRes.summary.cash), base_principal: fixFloat(targetRes.summary.base), holdings: targetRes.inv }) } : null,
      s2: (targetSlot === 2) ? { asset: fixFloat(targetRes.summary.totalAssets), inout: 0, json: JSON.stringify({ cash: fixFloat(targetRes.summary.cash), base_principal: fixFloat(targetRes.summary.base), holdings: targetRes.inv }) } : null,
      s3: (targetSlot === 3) ? { asset: fixFloat(targetRes.summary.totalAssets), inout: 0, json: JSON.stringify({ cash: fixFloat(targetRes.summary.cash), base_principal: fixFloat(targetRes.summary.base), holdings: targetRes.inv }) } : null
    };

    if (navigator.onLine) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);
      try {
        await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload), signal: controller.signal });
        clearTimeout(timeoutId);
        
        const updatedSnap = {
          ...targetRes,
          summary: { ...targetRes.summary },
          isSynced: true
        };
        localStorage.setItem(`vtotal_snap${targetSlot}_` + myUserId, JSON.stringify(updatedSnap));
        localStorage.setItem('vtotal_snap_date_' + myUserId, formatDateNY(new Date()));

        btn.innerText = '시트반영완료';
        showToast("시트에 데이터가 보존된 상태로 반영되었습니다.");
        localStorage.removeItem('vtotal_pending_sync');
      } catch (e) {
        clearTimeout(timeoutId);
        handleOfflineSave(payload);
      }
    } else {
      handleOfflineSave(payload);
    }
  } catch (err) {
    console.error("Save Error:", err);
    alert("저장 중 오류가 발생했습니다: " + err.message);
  } finally {
    setTimeout(() => { btn.innerHTML = orgText; }, 1500);
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
    pInput.oninput = function () {
      pInput.value = formatComma(pInput.value);
    };
    rInput.oninput = function () {
      rInput.value = formatComma(rInput.value);
    };
  }

  updateCurrentStatusUI(activeSettingsTab); // 데이터 로딩 시 상태창 업데이트
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

/**
 * 📊 설정 내 '실시간 운용 현황' 출력창 업데이트 기능을 수행함
 */
function updateCurrentStatusUI(slotNum) {
  const panel = document.getElementById('settingsStatusPanel');
  if (!panel) return;

  const res = (slotNum === 1) ? lastBTResult1 : (slotNum === 2) ? lastBTResult2 : lastBTResult3;
  
  const elDate = document.getElementById('statDate');
  const elTotal = document.getElementById('statTotal');
  const elRenew = document.getElementById('statRenew');
  const elPrincipal = document.getElementById('statPrincipal');

  if (!res || !res.summary) {
    elDate.innerText = "-"; elTotal.innerText = "-"; elRenew.innerText = "-"; elPrincipal.innerText = "-";
    return;
  }

  const s = res.summary;
  // ⭐️ 날짜 표시: 시트에서 가져온 마지막 동기화(기록) 날짜 표시 (B, G, L 행 등 시트 기준 데이터)
  const sheetDate = localStorage.getItem(`vtotal_sheet_last_date_${slotNum}_${myUserId}`) || "-";
  
  const fmt = (val) => {
    // ⭐️ 요청에 따라 실시간 운용현황은 항상 달러($)로 표기
    return "$" + fixFloat(val).toLocaleString();
  };

  elDate.innerText = sheetDate;
  elTotal.innerText = fmt(s.totalAssets);
  elRenew.innerText = fmt(s.base);
  // 💰 [핵심 수정] 원금은 무조건 엔진이 계산한 실시간 원금(realPrincipal)을 사용
  elPrincipal.innerText = fmt(s.realPrincipal !== undefined ? s.realPrincipal : s.base);
}

function updateUIWithResult(resBT, config, slotNum, skipSave = false) {
  // ⭐️ 최적 데이터 유지를 위한 병합 로직
  const existing = (slotNum === 1) ? lastBTResult1 : (slotNum === 2) ? lastBTResult2 : lastBTResult3;

  let finalRes = resBT;

  // 🛡️ [강력 보호] 이미 동기화된(isSynced: true) 데이터가 메모리에 있다면,
  // 배경에서 돌아가는 시뮬레이션(resBT)이 원금이나 수익률 지표를 덮어쓰지 못하도록 방어합니다.
  if (existing && existing.isSynced && !resBT.isSynced) {
    finalRes = {
      ...existing, // 💰 시트에서 가져온 정확한 원금, 자산, 수익률 유지
      orders: resBT.orders, // 주문 정보만 최신 시뮬레이션 반영
      nextOrderInfo: resBT.nextOrderInfo,
      orderDateStr: resBT.orderDateStr,
      inv: resBT.inv,
      dailyStates: resBT.dailyStates, // 차트 데이터는 엔진 결과 사용
      chartDates: resBT.chartDates,
      chartBalances: resBT.chartBalances,
      chartMdd: resBT.chartMdd,
      chartInout: resBT.chartInout
    };
  }

  if (slotNum === 1) {
    currentActiveConfigStr = JSON.stringify(config);
    lastBTResult = finalRes; lastBTResult1 = finalRes;
    const op = document.getElementById('panelOrder'); if (op) op.classList.remove('hidden');
    globalMonthlyData = finalRes.monthlyData; globalYearlyData = finalRes.yearlyData;
    globalMonthlyData1 = finalRes.monthlyData; globalYearlyData1 = finalRes.yearlyData;
  }
  else if (slotNum === 2) {
    toggleSlot2Visibility(true);
    lastBTResult2 = finalRes; globalMonthlyData2 = finalRes.monthlyData; globalYearlyData2 = finalRes.yearlyData;
  }
  else if (slotNum === 3) {
    lastBTResult3 = finalRes; globalMonthlyData3 = finalRes.monthlyData; globalYearlyData3 = finalRes.yearlyData;
  }

  renderOrderViewSlot(finalRes, slotNum);
  renderPeriodTableSlot(slotNum);
  renderMetrics(finalRes.summary, finalRes.chartDates ? finalRes.chartDates.length : 0, slotNum);
  if (slotNum === activeSettingsTab) updateCurrentStatusUI(slotNum);
  calculateCombinedPeriodData();
  if (skipSave) return;
  // 스냅샷 갱신은 오직 서버 연동/저장 성공 시에만 수행하도록 격리함.
}

function confirmLogout() { if (confirm("로그아웃 하시겠습니까?")) { localStorage.removeItem('vtotal_auth'); localStorage.removeItem('vtotal_id'); location.reload(); } }





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

  const executeSlot = async (cfg, isActive, setRes, slotNum) => {
    // 수동 백테스트 모드일 때는 simulationConfigs 사용
    if (isManualBacktestMode) {
      cfg = simulationConfigs[slotNum];
      isActive = (cfg && cfg.basics && cfg.basics.strategy !== "");
    }

    if (isActive) {
      const res = await runBacktestMemory(cfg, true, slotNum);
      if (res.status !== "error") {
        setRes(res);
        updateUIWithResult(res, cfg, slotNum, true);
      }
    } else {
      setRes(null);
    }
  };

  await executeSlot(slot1Config, isSlot1Active(), v => lastBTResult1 = v, 1);
  await executeSlot(slot2Config, isSlot2Active(), v => lastBTResult2 = v, 2);
  await executeSlot(slot3Config, isSlot3Active(), v => lastBTResult3 = v, 3);

  updateSlotsVisibility();
  renderChart(lastBTResult1, lastBTResult2, lastBTResult3);

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

  const executeSlot = async (cfg, isActive, setRes, slotNum) => {
    if (isActive) {
      const res = await runBacktestMemory(cfg, false, slotNum);
      if (res.status !== "error") {
        setRes(res);
        updateUIWithResult(res, cfg, slotNum);
      }
    } else {
      setRes(null);
    }
  };

  await executeSlot(slot1Config, isSlot1Active(), v => lastBTResult1 = v, 1);
  await executeSlot(slot2Config, isSlot2Active(), v => lastBTResult2 = v, 2);
  await executeSlot(slot3Config, isSlot3Active(), v => lastBTResult3 = v, 3);

  updateSlotsVisibility();
  renderChart(lastBTResult1, lastBTResult2, lastBTResult3);
  restoreBtn();
  triggerIconAnim('icoInstant');
  showToast("실전 주문표 최신화 완료");
  refreshOrderViewUI();
}



function calculateCombinedPeriodData() {
  const r1 = getBestResult(lastBTResult1, 1);
  const r2 = getBestResult(lastBTResult2, 2);
  const r3 = getBestResult(lastBTResult3, 3);
  const results = [r1, r2, r3].filter(r => r != null && r.chartDates && r.chartDates.length > 0);

  if (results.length < 2) {
    globalMonthlyData4 = []; globalYearlyData4 = [];
    return;
  }

  // 데이터 무결성 체크용 서명 생성 (필터링과 무관하게 전체 히스토리 변화 체크)
  const sigs = results.map(r => {
    const fDates = r.chartDatesFull || r.chartDates || [];
    return r.summary ? `${r.currentStrat}_${r.summary.totalAssets}_${fDates.length}` : "null";
  });
  const newSig = sigs.join('|') + "|" + isCurrencyKRW;
  if (window.lastMonthlySig === newSig) return;
  window.lastMonthlySig = newSig;

  // engine.js에 분리된 계산 엔진 호출로 데이터 가져오기
  const combinedData = generateCombinedPeriodDataEngine(results);
  globalMonthlyData4 = combinedData.monthly;
  globalYearlyData4 = combinedData.yearly;

  // UI 렌더링 호출
  if (periodDisplayMode === 'chart') {
    renderPeriodBarChart();
  } else {
    if (isSlot1Active()) renderPeriodTableText(1);
    if (isSlot2Active()) renderPeriodTableText(2);
    if (isSlot3Active()) renderPeriodTableText(3);
    if (isSlot1Active() && (isSlot2Active() || isSlot3Active())) renderPeriodTableText(4);
    renderPeriodTableText(0);
  }

  if (myUserId) {
    localStorage.setItem(`vtotal_snap_combined_${myUserId}`, JSON.stringify({ m: globalMonthlyData4, y: globalYearlyData4 }));
  }
}

function renderOrderViewSlot(res, slotNum) {
  if (!res) return;
  const suffix = slotNum;
  renderOrderTableSlot(res.orders, suffix);
  renderHoldingsTableSlot(res.inv || [], res.currentStrat, suffix);

  const nameEl = document.getElementById('orderSlot' + suffix + 'Name');
  if (nameEl) nameEl.innerText = res.currentStrat || "";

  if (res.nextOrderInfo) {
    const modeMap = { 'Middle': 'Mid1', 'Middle2': 'Mid2', 'Middle3': 'Mid3', 'SF': 'SF', 'AG': 'AG' };
    document.getElementById('tierCountVal' + suffix).innerText = res.nextOrderInfo.tier;
    document.getElementById('modeCountVal' + suffix).innerText = modeMap[res.nextOrderInfo.mode] || res.nextOrderInfo.mode;
    document.getElementById('weightCountVal' + suffix).innerText = res.nextOrderInfo.weight;
    document.getElementById('qtyCountVal' + suffix).innerText = res.nextOrderInfo.qty;
  }

  const orderDate = res.orderDateStr || "";
  if (slotNum === 1) currentOrderDate = orderDate;
  refreshOrderViewUI();
}

function toggleOrderView() {
  isOrderView = !isOrderView;
  refreshOrderViewUI();
}
function toggleOrderExpansion() {
  const grid = document.getElementById('mainGrid');
  const btn = document.getElementById('btnExpandOrder');
  const isExpanded = grid.classList.toggle('order-expanded');
  if (isExpanded) { btn.classList.add('active'); grid.classList.remove('monthly-expanded'); }
  else { btn.classList.remove('active'); if (periodViewState === 2) grid.classList.add('monthly-expanded'); }
  if (myChart) setTimeout(() => myChart.resize(), 100);
}

function refreshOrderViewUI() {
  const s1 = (getSlotConfig(1)?.basics?.strategy || "");
  const s2 = isSlot2Active() ? (getSlotConfig(2)?.basics?.strategy || "") : "";
  const s3 = isSlot3Active() ? (getSlotConfig(3)?.basics?.strategy || "") : "";
  const sArr = [];
  if (s1) sArr.push(s1);
  if (s2) sArr.push(s2);
  if (s3) sArr.push(s3);
  const stratDisplay = sArr.join(' / ');
  const date1 = lastBTResult1?.orderDateStr || currentOrderDate || "";

  document.getElementById('orderView1').style.display = isOrderView ? 'block' : 'none';
  document.getElementById('holdingsView1').style.display = isOrderView ? 'none' : 'block';

  const footer1 = document.getElementById('tierFooter1');
  if (footer1) footer1.style.display = 'flex';

  if (isSlot2Active()) {
    document.getElementById('orderView2').style.display = isOrderView ? 'block' : 'none';
    document.getElementById('holdingsView2').style.display = isOrderView ? 'none' : 'block';

    const footer2 = document.getElementById('tierFooter2');
    if (footer2) footer2.style.display = 'flex';
  }

  if (isSlot3Active()) {
    document.getElementById('orderView3').style.display = isOrderView ? 'block' : 'none';
    document.getElementById('holdingsView3').style.display = isOrderView ? 'none' : 'block';

    const footer3 = document.getElementById('tierFooter3');
    if (footer3) footer3.style.display = 'flex';
  }

  const icon = isOrderView ? "⚡" : "📦";
  const labelText = isOrderView ? "주문표" : "보유계좌 현황";
  const smallStyle = 'style="font-size:0.85em; font-weight:normal; opacity:0.8; margin-left:2px;"';

  let titleStr = `${icon} ${labelText}`;
  titleStr += ` <span style="font-size:0.75em; font-weight:normal; opacity:0.6; margin-left:8px;">(${date1})</span>`;

  const now = new Date();
  const nyHour = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }).format(now));

  let dForTag = now;
  if (nyHour >= 16) {
    dForTag = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }

  const checkDateStrForTag = formatDateNY(dForTag);
  const isHoliday = isUSMarketHoliday(checkDateStrForTag);

  const nyDayStr = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short' }).format(dForTag);
  const isWeekend = (nyDayStr === 'Sat' || nyDayStr === 'Sun');

  if (isHoliday || isWeekend) {
    const statusText = isHoliday ? "[휴장일]" : "[주말]";
    titleStr += ` <span style="color:var(--danger); font-size:0.75em; font-weight:700; margin-left:8px;">${statusText}</span>`;
  }

  document.getElementById('orderTitle').innerHTML = titleStr;

  const targetIds = ['orderView1', 'holdingsView1', 'orderView2', 'holdingsView2', 'orderView3', 'holdingsView3'];
  targetIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove('view-transition');
      void el.offsetWidth;
      el.classList.add('view-transition');
    }
  });
}

function renderHoldingsTableSlot(inv, stratName, slotNum) {
  const tbody = document.getElementById('holdingsBody' + slotNum);
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
  if (!orders || orders.length === 0) { tbody.innerHTML = "<tr><td colspan='3' style='padding:20px; color:#64748b;'>주문 없음</td></tr>"; return; }
  tbody.innerHTML = orders.map(o => `<tr><td class="${o[0] === '매수' ? 'buy' : 'sell'}">${o[0]}</td><td class="hidden">${o[1]}</td><td>$${Number(o[2]).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td><td>${o[3]}주</td></tr>`).join('');
}

function updatePeriodTitle() {
  const periodTitle = document.getElementById('periodTitle');
  if (!periodTitle) return;
  const s1 = isSlot1Active() ? (getSlotConfig(1)?.basics?.strategy || "") : "";
  const s2 = isSlot2Active() ? (getSlotConfig(2)?.basics?.strategy || "") : "";
  const s3 = isSlot3Active() ? (getSlotConfig(3)?.basics?.strategy || "") : "";
  let sArr = [];
  if (s1) sArr.push(s1);
  if (s2) sArr.push(s2);
  if (s3) sArr.push(s3);
  let currentStratName = sArr.join(' / ');
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
    renderPeriodTableText(0); 
    if (isSlot1Active()) renderPeriodTableText(1);
    if (isSlot2Active()) renderPeriodTableText(2);
    if (isSlot3Active()) renderPeriodTableText(3);
    const activeCount = [isSlot1Active(), isSlot2Active(), isSlot3Active()].filter(x => x).length;
    if (activeCount >= 2) renderPeriodTableText(4);
  }
}

function togglePeriodView() {
  periodViewState = (periodViewState + 1) % 2;
  updatePeriodTitle();
  if (periodDisplayMode === 'chart') {
    renderPeriodBarChart();
  } else {
    const TH_STYLE = "white-space:nowrap; padding:0 4px !important; text-align:center; vertical-align:middle; height:16px !important; line-height:16px !important; box-sizing:border-box !important; overflow:hidden;";

    const head0Str = periodViewState === 0
      ? `<th style="${TH_STYLE} width:1%;">년월</th>`
      : `<th style="${TH_STYLE} width:1%;">연도</th>`;

    const headData1Str = `<th class="hide-on-narrow" style="${TH_STYLE}">총자산</th><th style="${TH_STYLE}">수익금</th><th style="${TH_STYLE}">수익률</th><th class="hide-on-cover" style="${TH_STYLE}">MDD</th>`;
    const headDataStr = `<th style="${TH_STYLE}">수익금</th><th style="${TH_STYLE}">수익률</th><th class="hide-on-cover" style="${TH_STYLE}">MDD</th>`;

    const h0 = document.getElementById('periodTableHead0');
    if (h0) h0.innerHTML = head0Str;

    ['1', '2', '3', '4'].forEach(s => {
      const h = document.getElementById('periodTableHead' + s);
      if (h) h.innerHTML = (s === '1' || s === '4') ? headData1Str : headDataStr;
    });

    renderPeriodTableText(0);
    if (isSlot1Active()) renderPeriodTableText(1);
    if (isSlot2Active()) renderPeriodTableText(2);
    if (isSlot3Active()) renderPeriodTableText(3);
    const activeCount = [isSlot1Active(), isSlot2Active(), isSlot3Active()].filter(x => x).length;
    if (activeCount >= 2) renderPeriodTableText(4);
  }
  if (myChart) setTimeout(() => myChart.resize(), 100);
}

function renderPeriodTableText(slotNum) {
  const tbody = document.getElementById('periodBody' + slotNum);
  if (!tbody) return;

  const CELL_STYLE = "vertical-align:middle; height:16px !important; line-height:16px !important; padding:0 4px !important; box-sizing:border-box !important; white-space:nowrap; overflow:hidden;";

  if (slotNum === 0) {
    // 현재 보기 모드(월별/년별)에 맞는 데이터 맵 구성
    let dataCandidate = [];

    if (periodViewState === 1) {
      // 년별 보기 모드일 때
      let yMap = [globalYearlyData1, globalYearlyData2, globalYearlyData3, globalYearlyData4];
      for (let d of yMap) {
        if (d && d.length > (dataCandidate.length || 0)) dataCandidate = d;
      }
    } else {
      // 월별 보기 모드일 때
      let mMap = [globalMonthlyData1, globalMonthlyData2, globalMonthlyData3, globalMonthlyData4];
      for (let d of mMap) {
        if (d && d.length > (dataCandidate.length || 0)) dataCandidate = d;
      }
    }

    if (!dataCandidate || dataCandidate.length === 0) {
      tbody.innerHTML = `<tr><td style="${CELL_STYLE} text-align:center;">-</td></tr>`;
      return;
    }

    // 내림차순 정렬 (데이터 행들과 일치시킴)
    const sortedData = [...dataCandidate].sort((a, b) => b.period.localeCompare(a.period));

    tbody.innerHTML = sortedData.map(row => {
      let d = row.period;
      if (d.includes('-')) {
        const p = d.split('-'); d = p[0].substring(2) + '/' + p[1];
      } else if (d.length === 4) {
        d = d.substring(2);
      }
      return `<tr><td style="${CELL_STYLE} width:1%; text-align:center;">${d}</td></tr>`;
    }).join('');
    return;
  }

  if (slotNum === 1) {
    const titleEl = document.getElementById('slot1TableName');
    if (titleEl) titleEl.innerText = getSlotConfig(1)?.basics?.strategy || '투자법 1';
  } else if (slotNum === 2) {
    const titleEl = document.getElementById('slot2TableName');
    if (titleEl) titleEl.innerText = getSlotConfig(2)?.basics?.strategy || '투자법 2';
  } else if (slotNum === 3) {
    const titleEl = document.getElementById('slot3TableName');
    if (titleEl) titleEl.innerText = getSlotConfig(3)?.basics?.strategy || '투자법 3';
  }

  const mData = (slotNum === 1) ? globalMonthlyData1 : (slotNum === 2) ? globalMonthlyData2 : (slotNum === 3) ? globalMonthlyData3 : globalMonthlyData4;
  const yData = (slotNum === 1) ? globalYearlyData1 : (slotNum === 2) ? globalYearlyData2 : (slotNum === 3) ? globalYearlyData3 : globalYearlyData4;
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
    if (isCurrencyKRW) {
      let val = Math.round((a * currentFXRate) / 10000);
      return val.toLocaleString() + '만';
    } else {
      return '$' + Math.round(a).toLocaleString();
    }
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
    if (isSlot1Active()) renderPeriodTableText(1);
    if (isSlot2Active()) renderPeriodTableText(2);
    if (isSlot3Active()) renderPeriodTableText(3);
    if (isSlot1Active() && (isSlot2Active() || isSlot3Active())) renderPeriodTableText(4);
    renderPeriodTableText(0);
  }
  renderChart(lastBTResult1, lastBTResult2, lastBTResult3);
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

  btn.style.display = "flex";
  btn.style.alignItems = "center";
  btn.style.justifyContent = "center";
  btn.style.minWidth = "70px";
  btn.style.padding = "4px 8px";
  btn.style.marginLeft = "auto";
  btn.style.marginRight = "0px";

  if (isCurrencyKRW) {
    btn.innerHTML = `${ICON_KRW} KRW`;
  } else {
    btn.innerHTML = `${ICON_USD} USD`;
  }

  btn.style.color = '#fff';
  btn.style.border = 'none';
  btn.style.outline = 'none';
  btn.style.boxShadow = 'none';
  btn.style.background = 'none';
  btn.style.fontWeight = 'bold';
}

function updateDefaultCurrency(val) {
  if (myUserId) {
    localStorage.setItem(`vtotal_pref_currency_${myUserId}`, val);
    showToast(`기본 통화가 ${val === 'KRW' ? '원화' : '달러'}로 설정되었습니다. 새로고침 시 적용됩니다.`);
  }
}

function renderPeriodTable() { if (periodDisplayMode === 'chart') renderPeriodBarChart(); else renderPeriodTableText(1); }
function renderPeriodTableSlot(slotNum) {
  if (periodDisplayMode === 'chart') {
    renderPeriodBarChart();
  } else {
    renderPeriodTableText(slotNum);
    if (isSlot1Active() && (isSlot2Active() || isSlot3Active())) {
      renderPeriodTableText(4);
    }
    renderPeriodTableText(0); // 년월 열 강제 업데이트
  }
}



function renderPeriodBarChart() {
  const canvas = document.getElementById('periodBarChart');
  const wrapper = document.getElementById('periodBarChartWrapper');
  if (!canvas || !wrapper) return;

  // ⭐️ 이전 차트 파괴 로직 복구 (핵심)
  if (periodBarChartInstance) { periodBarChartInstance.destroy(); periodBarChartInstance = null; }

  canvas.style.display = 'block'; // 하단 인라인 유격 제거
  canvas.style.marginBottom = '0';

  // ⭐️ 부모 컨테이너 여백 강제 제거
  wrapper.style.padding = '0';
  wrapper.style.margin = '0';
  wrapper.style.lineHeight = '0';
  wrapper.style.overflow = 'hidden';

  const s1Active = isSlot1Active();
  const s2Active = isSlot2Active();
  const s3Active = isSlot3Active();

  const mData1 = s1Active ? globalMonthlyData1 : null;
  const yData1 = s1Active ? globalYearlyData1 : null;
  const mData2 = s2Active ? globalMonthlyData2 : null;
  const yData2 = s2Active ? globalYearlyData2 : null;
  const mData3 = s3Active ? globalMonthlyData3 : null;
  const yData3 = s3Active ? globalYearlyData3 : null;

  const data1 = (periodViewState === 1) ? yData1 : mData1;
  const data2 = (periodViewState === 1) ? yData2 : mData2;
  const data3 = (periodViewState === 1) ? yData3 : mData3;

  if ((!data1 || data1.length === 0) && (!data2 || data2.length === 0) && (!data3 || data3.length === 0)) return;

  const sorted1 = data1 ? [...data1] : [];
  const sorted2 = data2 ? [...data2] : [];
  const sorted3 = data3 ? [...data3] : [];

  const allPeriods = new Set();
  sorted1.forEach(r => allPeriods.add(r.period));
  sorted2.forEach(r => allPeriods.add(r.period));
  sorted3.forEach(r => allPeriods.add(r.period));
  const sortedPeriods = [...allPeriods].sort().reverse();

  const labels = sortedPeriods.map(p => {
    if (periodViewState === 0 && p.length === 7) return p.substring(2).replace('-', '/');
    return p;
  });

  const map1 = {}; sorted1.forEach(r => { map1[r.period] = r; });
  const map2 = {}; sorted2.forEach(r => { map2[r.period] = r; });
  const map3 = {}; sorted3.forEach(r => { map3[r.period] = r; });

  const fx = isCurrencyKRW ? currentFXRate : 1;
  const isKRW = isCurrencyKRW;

  const profits1 = sortedPeriods.map(p => map1[p] ? Math.round((map1[p].profit * fx) / (isKRW ? 10000 : 1)) : 0);
  const profits2 = sortedPeriods.map(p => map2[p] ? Math.round((map2[p].profit * fx) / (isKRW ? 10000 : 1)) : 0);
  // ⭐️ 2289 vs 2290 오차 해결: 3번 투자법을 (전체합계 - 1 - 2)로 계산하여 테이블과 100% 일치시킴
  const profits3 = sortedPeriods.map((p, i) => {
    if (!map1[p] && !map2[p] && !map3[p]) return 0;
    const rawTotal = (map1[p] ? map1[p].profit : 0) + (map2[p] ? map2[p].profit : 0) + (map3[p] ? map3[p].profit : 0);
    const totalRounded = Math.round((rawTotal * fx) / (isKRW ? 10000 : 1));
    return totalRounded - profits1[i] - profits2[i];
  });

  const rates1 = sortedPeriods.map(p => map1[p] ? Number((map1[p].rate * 100).toFixed(2)) : 0);
  const rates2 = sortedPeriods.map(p => map2[p] ? Number((map2[p].rate * 100).toFixed(2)) : 0);
  const rates3 = sortedPeriods.map(p => map3[p] ? Number((map3[p].rate * 100).toFixed(2)) : 0);

  const s1Name = getSlotConfig(1)?.basics?.strategy || '투자법 1';
  const s2Name = getSlotConfig(2)?.basics?.strategy || '투자법 2';
  const s3Name = getSlotConfig(3)?.basics?.strategy || '투자법 3';
  const isYearly = (periodViewState === 1);

  let datasets = [];

  if (s1Active) {
    datasets.push({
      label: s1Name + ' 수익금',
      data: profits1,
      backgroundColor: 'rgba(99, 102, 241, 0.5)',
      borderColor: 'rgba(99, 102, 241, 1)',
      borderWidth: 1,
      borderRadius: { topLeft: 0, topRight: 0, bottomLeft: 4, bottomRight: 4 },
      yAxisID: 'y',
      stack: 'profit',
      order: 2
    });
  }
  if (s2Active) {
    datasets.push({
      label: s2Name + ' 수익금',
      data: profits2,
      backgroundColor: 'rgba(16, 185, 129, 0.5)',
      borderColor: 'rgba(16, 185, 129, 1)',
      borderWidth: 1,
      borderRadius: { topLeft: s3Active ? 0 : 4, topRight: s3Active ? 0 : 4, bottomLeft: 0, bottomRight: 0 },
      yAxisID: 'y',
      stack: 'profit',
      order: 2
    });
  }
  if (s3Active) {
    datasets.push({
      label: s3Name + ' 수익금',
      data: profits3,
      backgroundColor: 'rgba(251, 191, 36, 0.5)',
      borderColor: 'rgba(251, 191, 36, 1)',
      borderWidth: 1,
      borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 },
      yAxisID: 'y',
      stack: 'profit',
      order: 2
    });
  }

  const activeCount = (s1Active ? 1 : 0) + (s2Active ? 1 : 0) + (s3Active ? 1 : 0);
  if (activeCount > 0) {
    const combinedRates = sortedPeriods.map((p, i) => {
      let sum = 0;
      if (s1Active) sum += rates1[i];
      if (s2Active) sum += rates2[i];
      if (s3Active) sum += rates3[i];
      return Number((sum / activeCount).toFixed(2));
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
      ctx.textBaseline = 'bottom'; // ⭐️ 텍스트가 위로 향하도록 기준선 변경
      const meta = chart.getDatasetMeta(datasets.findIndex(d => d.stack === 'profit'));
      if (!meta || !meta.data) { ctx.restore(); return; }

      const stackMetas = chart.data.datasets.map((d, i) => d.stack === 'profit' ? chart.getDatasetMeta(i) : null).filter(m => m !== null);
      const topMeta = stackMetas[stackMetas.length - 1];

      topMeta.data.forEach((bar, i) => {
        const total = (s1Active ? profits1[i] : 0) + (s2Active ? profits2[i] : 0) + (s3Active ? profits3[i] : 0);
        if (total === 0) return;
        let label = "";
        if (isKRW) {
          label = (total > 0 ? '+' : (total < 0 ? '-' : '')) + Math.abs(total).toLocaleString() + '만';
        } else {
          label = (total > 0 ? '+$' : (total < 0 ? '-$' : '$')) + Math.abs(total).toLocaleString();
        }
        const yPos = total >= 0 ? bar.y - 5 : bar.y + 15; // ⭐️ 다시 막대 위쪽으로 이동
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
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 15, bottom: 4, left: 0, right: 0 } }, // ⭐️ 최적의 가독성을 위해 다시 15px로 복구
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 10,
          titleFont: { family: 'Outfit', size: 12, weight: 'bold' },
          bodyFont: { family: 'Inter', size: 11 },
          cornerRadius: 8,
          callbacks: {
            label: function (c) {
              const v = c.parsed.y;
              if (c.dataset.yAxisID === 'yRate') return `${c.dataset.label}: ${v > 0 ? '+' : ''}${v.toFixed(2)}%`;
              if (isKRW) {
                return `${c.dataset.label}: ${v >= 0 ? '+' : '-'}${Math.abs(v).toLocaleString()}만원`;
              }
              return `${c.dataset.label}: ${v >= 0 ? '+$' : '-$'}${Math.abs(v).toLocaleString()}`;
            }
          }
        }
      },
      scales: {
        x: {
          stacked: true,
          grid: { display: false, tickLength: 0, drawTicks: false, drawBorder: false },
          ticks: {
            font: { family: 'Inter', size: 9 }, // ⭐️ 모든 날짜 출력을 위해 폰트 살짝 축소
            color: '#94a3b8',
            maxRotation: 0,
            minRotation: 0,
            padding: 0,
            autoSkip: false, // ⭐️ 날짜가 생략되지 않도록 강제 표시
            maxTicksLimit: 50
          }
        },
        y: {
          stacked: true,
          position: 'left',
          grid: { color: 'rgba(255, 255, 255, 0.05)', tickLength: 0, drawTicks: false, drawBorder: false }, // ⭐️ 경계선 유격 제거
          ticks: {
            font: { family: 'Inter', size: 10 },
            color: '#94a3b8',
            callback: function (v) {
              if (isKRW) return v.toLocaleString() + '만';
              return '$' + v.toLocaleString();
            }
          }
        },
        yRate: {
          position: 'right',
          grid: { display: false },
          ticks: {
            font: { family: 'Inter', size: 10, weight: 'bold' },
            color: '#a855f7',
            callback: function (v) { return v + '%'; }
          },
          title: { display: false }
        }
      }
    },
    plugins: [profitLabelPlugin]
  });
}

function updateCombinedMetrics() {
  updateSlotsVisibility();
}

// ⭐️ 시뮬레이션 수치보다 동기화된 캐시 수치를 우선 선택하는 헬퍼 함수
function getBestResult(currentRes, slotNum) {
  // 백테스트 결과 보기 모드이거나 히스토리 조회 중일 때는 현재 결과를 최우선함
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

function calculateCombinedSummary(r1, r2, r3) {
  const activeResults = [];
  const b1 = getBestResult(r1, 1);
  const b2 = getBestResult(r2, 2);
  const b3 = getBestResult(r3, 3);
  if (isSlot1Active() && b1) activeResults.push(b1);
  if (isSlot2Active() && b2) activeResults.push(b2);
  if (isSlot3Active() && b3) activeResults.push(b3);

  // engine.js에 분리된 계산 엔진을 호출
  return calculateCombinedSummaryEngine(activeResults);
}

function refreshStatsTable() {
  const table = document.getElementById('statsTable');
  if (!table) return;
  const s1Active = isSlot1Active();
  const s2Active = isSlot2Active();
  const s3Active = isSlot3Active();
  const rows = [];
  if (s1Active) rows.push({ res: getBestResult(lastBTResult1, 1), name: getSlotConfig(1)?.basics?.strategy || '투자법 1', color: 'var(--primary)' });
  if (s2Active) rows.push({ res: getBestResult(lastBTResult2, 2), name: getSlotConfig(2)?.basics?.strategy || '투자법 2', color: 'var(--success)' });
  if (s3Active) rows.push({ res: getBestResult(lastBTResult3, 3), name: getSlotConfig(3)?.basics?.strategy || '투자법 3', color: '#f59e0b' });

  let activeCount = (s1Active ? 1 : 0) + (s2Active ? 1 : 0) + (s3Active ? 1 : 0);
  if (activeCount >= 2) {
    const comb = calculateCombinedSummary(lastBTResult1, lastBTResult2, lastBTResult3);
    rows.push({ res: { summary: comb, isSynced: true }, name: '합산', color: 'var(--secondary)' });

    // ⭐️ 합산 데이터 캐싱
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

    // ⭐️ 데이터 필드 유연성 확보 (동기화/엔진 데이터 필드명 차이 대응)
    const tAssets = sObj.totalAssets !== undefined ? sObj.totalAssets : (sObj.total_assets || 0);
    // 💰 [핵심 수정] 통계 테이블에서도 엔진의 실시간 원금(realPrincipal)을 최우선 고정
    const rPrincipal = sObj.realPrincipal !== undefined ? sObj.realPrincipal : (sObj.base || sObj.base_principal || 0);

    let v = sObj[m.key];

    // 특정 주요 지표 강제 계산 (엔진 계산 누락 대비)
    if (m.key === 'realPrincipal') v = rPrincipal;
    if (m.key === 'totalAssets') v = tAssets;
    if (m.key === 'totalProfit') v = tAssets - rPrincipal;
    if (m.key === 'yield') v = rPrincipal > 0 ? (tAssets - rPrincipal) / rPrincipal : 0;
    if (v === undefined || v === null) v = sObj[m.key] || 0; // 최후의 수단으로 0 할당

    if (!isValid(v)) v = 0; // 유효하지 않은 수치는 0으로 처리

    const isKRW = (typeof isCurrencyKRW !== 'undefined') ? isCurrencyKRW : false;
    const fx = (typeof currentFXRate !== 'undefined') ? currentFXRate : 1450;

    if (m.type === 'fmt') {
      if (isKRW) return Math.round(Number(v) * fx / 10000).toLocaleString() + '만';
      return '$' + Math.round(Number(v)).toLocaleString();
    }
    if (m.type === 'color') {
      let num = Number(v);
      if (m.pct) {
        let str = (Math.abs(num) * 100).toFixed(1) + '%';
        return num > 0 ? `<span class="val-plus">+${str}</span>` : (num < 0 ? `<span class="val-minus">-${str}</span>` : `<span>${str}</span>`);
      } else {
        let str = isKRW ? Math.round(Math.abs(num) * fx / 10000).toLocaleString() + '만' : '$' + Math.round(Math.abs(num)).toLocaleString();
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

  rows.forEach((r, idx) => {
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

function renderMetrics(s, days, slotNum) {
  refreshStatsTable();
}

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
          if (val !== null && val > globalMaxAsset) {
            globalMaxAsset = val; globalMaxAssetIdx = i; globalMaxAssetColor = ds.borderColor;
          }
        });
      }
      if (ds.label && ds.label.includes('MDD') && ds.data) {
        ds.data.forEach((val, i) => {
          if (val !== null && val < globalMinMdd) {
            globalMinMdd = val; globalMinMddIdx = i; globalMinMddColor = ds.borderColor;
          }
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
    if (evt.type === 'click' && evt.y <= 28) {
      toggleChartView();
    }
  }
};

window.currentChartSignature = "";

function renderChart(res1, res2, res3) {
  if ((!res1 || !res1.chartDates) && (!res2 || !res2.chartDates) && (!res3 || !res3.chartDates)) {
    if (myChart) { myChart.destroy(); myChart = null; }
    window.currentChartSignature = "";
    return;
  }

  const sig1 = (res1 && res1.summary) ? (res1.currentStrat + "_" + res1.summary.totalAssets + "_" + res1.chartDates.length) : "null";
  const sig2 = (res2 && res2.summary) ? (res2.currentStrat + "_" + res2.summary.totalAssets + "_" + res2.chartDates.length) : "null";
  const sig3 = (res3 && res3.summary) ? (res3.currentStrat + "_" + res3.summary.totalAssets + "_" + res3.chartDates.length) : "null";
  const newSig = sig1 + "|" + sig2 + "|" + sig3 + "|" + chartViewMode + "|" + isCurrencyKRW;

  const s1Set = isSlot1Active();
  const s2Set = isSlot2Active();
  const s3Set = isSlot3Active();

  const s1NameT = s1Set ? (getSlotConfig(1)?.basics?.strategy || '투자법 1') : '투자법 1';
  const s2NameT = s2Set ? (getSlotConfig(2)?.basics?.strategy || '투자법 2') : '투자법 2';
  const s3NameT = s3Set ? (getSlotConfig(3)?.basics?.strategy || '투자법 3') : '투자법 3';

  let namesStr = [];
  if (s1Set) namesStr.push(s1NameT);
  if (s2Set) namesStr.push(s2NameT);
  if (s3Set) namesStr.push(s3NameT);
  let titleSuffix = namesStr.length > 0 ? (namesStr.length > 1 ? '(종합)' : `(${namesStr[0]})`) : '';

  if (chartViewMode === 1) titleSuffix = `(${s1NameT})`;
  else if (chartViewMode === 2) titleSuffix = `(${s2NameT})`;
  else if (chartViewMode === 3) titleSuffix = `(${s3NameT})`;
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

  const s1Name = getSlotConfig(1)?.basics?.strategy || '투자법 1';
  const s2Name = getSlotConfig(2)?.basics?.strategy || '투자법 2';
  const s3Name = getSlotConfig(3)?.basics?.strategy || '투자법 3';

  const allDatesSet = new Set();
  if (res1 && res1.chartDates && s1Set) res1.chartDates.forEach(d => allDatesSet.add(d));
  if (res2 && res2.chartDates && s2Set) res2.chartDates.forEach(d => allDatesSet.add(d));
  if (res3 && res3.chartDates && s3Set) res3.chartDates.forEach(d => allDatesSet.add(d));

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

  const assetGradient1 = ctx.createLinearGradient(0, 0, 0, 400);
  assetGradient1.addColorStop(0, 'rgba(99, 102, 241, 0.3)');
  assetGradient1.addColorStop(1, 'rgba(99, 102, 241, 0)');

  const assetGradient2 = ctx.createLinearGradient(0, 0, 0, 400);
  assetGradient2.addColorStop(0, 'rgba(16, 185, 129, 0.2)');
  assetGradient2.addColorStop(1, 'rgba(16, 185, 129, 0)');

  const assetGradient3 = ctx.createLinearGradient(0, 0, 0, 400);
  assetGradient3.addColorStop(0, 'rgba(251, 191, 36, 0.2)');
  assetGradient3.addColorStop(1, 'rgba(251, 191, 36, 0)');

  if ((chartViewMode === 0 || chartViewMode === 1) && res1 && res1.chartDates && s1Set) {
    const alignedBA1 = alignData(res1.chartDates, res1.chartBalances, false);
    const mdd1 = res1.chartMdd.map(v => v * 100);
    const alignedMDD1 = alignData(res1.chartDates, mdd1, true);

    const ds1 = [
      { label: s1Name + ' 자산', data: alignedBA1, borderColor: '#6366f1', yAxisID: 'y', borderWidth: 2, pointRadius: 0, fill: true, backgroundColor: assetGradient1, tension: 0.2 },
      { label: s1Name + ' MDD', data: alignedMDD1, borderColor: '#ef4444', borderDash: [4, 4], yAxisID: 'y1', borderWidth: 1, pointRadius: 0, fill: false, tension: 0.2 }
    ];
    datasets = datasets.concat(ds1);
    allMddValues = allMddValues.concat(mdd1);
  }

  if ((chartViewMode === 0 || chartViewMode === 2) && res2 && res2.chartDates && s2Set) {
    const alignedBA2 = alignData(res2.chartDates, res2.chartBalances, false);
    const mdd2 = res2.chartMdd.map(v => v * 100);
    const alignedMDD2 = alignData(res2.chartDates, mdd2, true);

    const ds2 = [
      { label: s2Name + ' 자산', data: alignedBA2, borderColor: '#10b981', yAxisID: 'y', borderWidth: 2, pointRadius: 0, fill: true, backgroundColor: assetGradient2, tension: 0.2 },
      { label: s2Name + ' MDD', data: alignedMDD2, borderColor: '#f59e0b', borderDash: [4, 4], yAxisID: 'y1', borderWidth: 1, pointRadius: 0, fill: false, tension: 0.2 }
    ];
    datasets = datasets.concat(ds2);
    allMddValues = allMddValues.concat(mdd2);
  }

  if ((chartViewMode === 0 || chartViewMode === 3) && res3 && res3.chartDates && s3Set) {
    const alignedBA3 = alignData(res3.chartDates, res3.chartBalances, false);
    const mdd3 = res3.chartMdd.map(v => v * 100);
    const alignedMDD3 = alignData(res3.chartDates, mdd3, true);

    const ds3 = [
      { label: s3Name + ' 자산', data: alignedBA3, borderColor: '#fbbf24', yAxisID: 'y', borderWidth: 2, pointRadius: 0, fill: true, backgroundColor: assetGradient3, tension: 0.2 },
      { label: s3Name + ' MDD', data: alignedMDD3, borderColor: '#38bdf8', borderDash: [4, 4], yAxisID: 'y1', borderWidth: 1, pointRadius: 0, fill: false, tension: 0.2 }
    ];
    datasets = datasets.concat(ds3);
    allMddValues = allMddValues.concat(mdd3);
  }

  const worstMdd = Math.min.apply(null, allMddValues.filter(v => v !== null && isFinite(v)));
  const dynamicMddMin = isFinite(worstMdd) ? Math.floor(worstMdd) - 10 : -50;

  if (Chart.Tooltip && !Chart.Tooltip.positioners.bottomRight) {
    Chart.Tooltip.positioners.bottomRight = function (items) {
      if (!items.length) return false;
      const chart = this.chart;
      return { x: chart.width, y: chart.height };
    };
  }

  myChart = new Chart(ctx, {
    type: 'line',
    data: { labels: shortDates, datasets: datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        title: { display: false },
        legend: { display: false },
        tooltip: {
          enabled: true, position: 'bottomRight', xAlign: 'right', yAlign: 'bottom',
          backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1, padding: 8,
          titleFont: { family: 'Outfit', size: chartFontSize, weight: 'bold' },
          bodyFont: { family: 'Inter', size: chartFontSize },
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
          position: 'left', grace: '10%',
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: {
            font: { family: 'Inter', size: chartFontSize - 2 },
            color: '#94a3b8',
            callback: function (v) { return v.toLocaleString() + (isKRW ? '만' : '$'); }
          }
        },
        y1: {
          position: 'right', min: dynamicMddMin, max: 0, grid: { display: false },
          ticks: {
            font: { family: 'Inter', size: chartFontSize - 2 },
            color: '#ef4444',
            callback: function (v) { return v.toFixed(1) + '%'; }
          }
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
  // 스크롤 동기화 로직 제거 (부모 컨테이너가 통합 관리하므로 불필요)


  const o1 = document.getElementById('orderScroll1');
  const o2 = document.getElementById('orderScroll2');
  let oIsSync1 = false, oIsSync2 = false;
  if (o1 && o2) {
    o1.addEventListener('scroll', function () {
      if (!oIsSync1) { oIsSync2 = true; o2.scrollTop = this.scrollTop; }
      oIsSync1 = false;
    });
    o2.addEventListener('scroll', function () {
      if (!oIsSync2) { oIsSync1 = true; o1.scrollTop = this.scrollTop; }
      oIsSync2 = false;
    });
  }

  const setupSwipe = (elementId, callback) => {
    const el = document.getElementById(elementId);
    if (!el) return;

    el.style.touchAction = 'pan-y';
    el.style.userSelect = 'none';

    const mc = new Hammer.Manager(el, {
      touchAction: 'pan-y',
      recognizers: [
        [Hammer.Pan, { direction: Hammer.DIRECTION_HORIZONTAL, threshold: 5 }]
      ]
    });

    let activeScrollTarget = null;
    let initialScrollLeft = 0;

    mc.on('panstart', (ev) => {
      let target = ev.srcEvent?.target;
      activeScrollTarget = null;
      while (target && target !== el) {
        if (target.scrollWidth > target.clientWidth + 5) {
          const style = window.getComputedStyle(target);
          if (style.overflowX === 'auto' || style.overflowX === 'scroll' || style.overflow === 'auto' || style.overflow === 'scroll') {
            activeScrollTarget = target;
            initialScrollLeft = target.scrollLeft;
            break;
          }
        }
        target = target.parentElement;
      }
    });

    mc.on('panmove', (ev) => {
      if (activeScrollTarget) {
        activeScrollTarget.scrollLeft = initialScrollLeft - ev.deltaX;
      }
    });

    mc.on('panend', (ev) => {
      const absX = Math.abs(ev.deltaX);
      const absY = Math.abs(ev.deltaY);

      if (activeScrollTarget) {
        // ⭐️ 스크롤 가능한 테이블 내부에서 동작 중일 때는 화면 전환 스와이프를 차단합니다.
        return;
      }

      if (absX > absY && absX > 30) {
        callback(ev.deltaX < 0 ? 'left' : 'right');
        if (navigator.vibrate) navigator.vibrate(8);
      }
    });
  };

  setupSwipe('orderHeader', () => toggleOrderView());
  setupSwipe('monthlyHeader', () => togglePeriodView());
  setupSwipe('panelChart', (dir) => {
    if (dir === 'left') {
      chartViewMode = (chartViewMode + 1) % 4;
      if (chartViewMode === 3 && !isSlot3Active()) chartViewMode = 0;
      if (chartViewMode === 2 && !isSlot2Active()) chartViewMode = 0;
    } else {
      chartViewMode = (chartViewMode - 1 + 4) % 4;
      if (chartViewMode === 3 && !isSlot3Active()) chartViewMode = isSlot2Active() ? 2 : 1;
      if (chartViewMode === 2 && !isSlot2Active()) chartViewMode = 1;
    }
    renderChart(lastBTResult1, lastBTResult2, lastBTResult3);
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
  if (icon) {
    icon.classList.remove('icon-rotate');
    void icon.offsetWidth;
    icon.classList.add('icon-rotate');
  }
}

// 스마트 증액 (입금) 기능
function handleDeposit() {
  const activeSlotName = (activeSettingsTab === 1) ? "투자법 1" : (activeSettingsTab === 2) ? "투자법 2" : "투자법 3";
  let amountStr = prompt(`[${activeSlotName}] 얼마를 증액(입금)하시겠습니까?\n(달러 단위로 숫자만 입력하세요)`);
  if (!amountStr) return;
  let amount = parseFloat(amountStr.replace(/[^0-9.-]/g, ''));
  if (isNaN(amount) || amount === 0) return alert("올바른 금액을 입력하세요.");
  const isReduction = amount < 0;
  const actionName = isReduction ? "감액(출금)" : "증액(입금)";
  const absAmount = Math.abs(amount);
  const confirmMsg = `[${activeSlotName}]에서 $${absAmount.toLocaleString()}를 정말 ${actionName}하시겠습니까?\n\n` +
    `※ 과거 수익률은 안전하게 보존되며, 예수금과 갱신금(원금)이 즉시 ${isReduction ? '감소' : '증가'}합니다.`;
  if (!confirm(confirmMsg)) return;
  const btn = document.getElementById('btnSaveTop');
  const orgText = btn ? btn.innerHTML : "";
  if (btn) btn.innerHTML = "⏳ 처리 중...";
  setLED('loading');
  fetch(GAS_URL, {
    method: 'POST',
    mode: 'no-cors',
    body: JSON.stringify({
      action: "ADD_FUNDS",
      id: myUserId,
      slot: activeSettingsTab,
      amount: amount
    })
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
    timeZone: 'America/New_York',
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
    hour12: false
  });
  const parts = nyFormatter.formatToParts(now);
  const nyDate = {};
  parts.forEach(p => nyDate[p.type] = p.value);
  let targetNY = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  targetNY.setHours(17, 5, 0, 0);
  if (now.getTime() >= targetNY.getTime()) {
    targetNY.setDate(targetNY.getDate() + 1);
  }
  const delay = targetNY.getTime() - now.getTime();
  const hours = Math.floor(delay / (1000 * 60 * 60));
  const mins = Math.floor((delay % (1000 * 60 * 60)) / (1000 * 60));
  console.log(`[스케줄러] 다음 데이터 자동 백업까지 ${hours}시간 ${mins}분 남았습니다.`);
  setTimeout(() => {
    checkAndRunAutoSave();
    scheduleNextAutoSave();
  }, delay);
}

window.addEventListener('load', () => {
  scheduleNextAutoSave();
});
