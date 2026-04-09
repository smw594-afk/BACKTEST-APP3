const APP_VERSION = "3.000";
const GAS_URL = "https://script.google.com/macros/s/AKfycbw1si6V_02Ua0trHlZdvT_EnFLDGA6-0hNtEaZhq2W-UGXMVo0e9K5mI3jH5IqQ4KOi9Q/exec";
const VERCEL_URL = "https://yahoo-proxy-gamma.vercel.app/api/yahoo";

// ⭐️ 글로벌 변수 추가
let isCurrencyKRW = false; 
let currentFXRate = 1350; // 기본 환율 1350원

const MASTER_STRATEGIES = {
  "2M3D1-1P": {
    config: { compR: 0.818, lossR: 0.282, dLimit: -0.048, cDn3: 0.0, cDn2: 0.008, cDn1: 0.0, tierMethod: '보유', useMid1: true, useMid2: true, useMid3: false },
    modes: {
      SF: { buy: [0.046, 0.046, 0.046, 0.046, 0.046, 0.046], sell: [0.018, 0.018, 0.018, 0.018, 0.018, 0.018], hold: [34, 34, 34, 34, 34, 34], weight: [0.138, 0.116, 0.289, 0.05, 0.273, 0.05] },
      Middle: { buy: [0.043, 0.043, 0.043, 0.043, 0.043, 0.043], sell: [0.014, 0.014, 0.014, 0.014, 0.014, 0.014], hold: [6, 6, 6, 6, 6, 6], weight: [0.3, 0.3, 0.3, 0.3, 0.3, 0.3] },
      AG: { buy: [0.034, 0.034, 0.034, 0.034, 0.034, 0.034], sell: [0.022, 0.022, 0.022, 0.022, 0.022, 0.022], hold: [7, 7, 7, 7, 7, 7], weight: [0.17, 0.08, 0.052, 0.3, 0.072, 0.247] },
      Middle2: { buy: [0.025, 0.025, 0.025, 0.025, 0.025, 0.025], sell: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0], hold: [12, 12, 12, 12, 12, 12], weight: [0.05, 0.05, 0.05, 0.05, 0.05, 0.05] },
      Middle3: { buy: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0], sell: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0], hold: [0, 0, 0, 0, 0, 0], weight: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0] }
    }
  },
  "2M3D2(2.0)": {
    config: { compR: 0.814, lossR: 0.286, dLimit: -0.048, cDn3: 0.0, cDn2: 0.008, cDn1: 0.0, tierMethod: '보유', useMid1: true, useMid2: false, useMid3: true },
    modes: {
      SF: { buy: [0.036, 0.036, 0.036, 0.036, 0.036, 0.036, 0.036, 0.036], sell: [0.016, 0.016, 0.016, 0.016, 0.016, 0.016, 0.016, 0.016], hold: [35, 35, 35, 35, 35, 35, 35, 35], weight: [0.046, 0.143, 0.23, 0.046, 0.115, 0.161, 0.31, 0.001] },
      Middle: { buy: [0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03], sell: [0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003], hold: [20, 20, 20, 20, 20, 20, 20], weight: [0.355, 0.355, 0.355, 0.355, 0.355, 0.355, 0.355] },
      AG: { buy: [0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025], sell: [0.031, 0.031, 0.031, 0.031, 0.031, 0.031, 0.031, 0.031], hold: [8, 8, 8, 8, 8, 8, 8, 8], weight: [0.047, 0.39, 0.042, 0.043, 0.217, 0.22, 0.31, 0.45] },
      Middle2: { buy: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0], sell: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0], hold: [0, 0, 0, 0, 0, 0], weight: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0] },
      Middle3: { buy: [0.039, 0.039, 0.039, 0.039, 0.039, 0.039, 0.039, 0.039, 0.039, 0.039], sell: [0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003], hold: [12, 12, 12, 12, 12, 12, 12, 12, 12, 12], weight: [0.131, 0.131, 0.131, 0.131, 0.131, 0.131, 0.131, 0.131, 0.131, 0.131] }
    }
  },
  "2M3D2(1.2)": {
    config: { compR: 0.814, lossR: 0.293, dLimit: -0.048, cDn3: 0.0, cDn2: 0.008, cDn1: 0.0, tierMethod: '보유', useMid1: true, useMid2: false, useMid3: true },
    modes: {
      SF: { buy: [0.035, 0.035, 0.035, 0.035, 0.035, 0.035, 0.035, 0.035], sell: [0.016, 0.016, 0.016, 0.016, 0.016, 0.016, 0.016, 0.016], hold: [35, 35, 35, 35, 35, 35, 35, 35], weight: [0.046, 0.143, 0.23, 0.046, 0.115, 0.161, 0.31, 0.046] },
      Middle: { buy: [0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03], sell: [0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003], hold: [21, 21, 21, 21, 21, 21, 21, 21], weight: [0.352, 0.352, 0.352, 0.352, 0.352, 0.352, 0.352, 0.352] },
      AG: { buy: [0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025], sell: [0.032, 0.032, 0.032, 0.032, 0.032, 0.032, 0.032, 0.032], hold: [8, 8, 8, 8, 8, 8, 8, 8], weight: [0.049, 0.216, 0.043, 0.043, 0.216, 0.216, 0.12, 0.096] },
      Middle2: { buy: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0], sell: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0], hold: [0, 0, 0, 0, 0, 0], weight: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0] },
      Middle3: { buy: [0.038, 0.038, 0.038, 0.038, 0.038, 0.038, 0.038, 0.038], sell: [0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003], hold: [13, 13, 13, 13, 13, 13, 13, 13], weight: [0.129, 0.129, 0.129, 0.129, 0.129, 0.129, 0.129, 0.129] }
    }
  }
};

function forceUpdateApp() {
  if (confirm(`현재 버전: ${APP_VERSION}\n데이터를 강제로 초기화할까요?`)) {
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

let myUserId = ""; let myChart = null; let currentOrderDate = ""; let isOrderView = true; let isStatsMode = false;
let isViewingHistory = false;
let lastMyPerfData = null;
let perfLastCheckTime = 0;

function restoreSimulationUI() {
  // 백테스트 중이 아니었으면 무시
  if (!isViewingHistory) return;

  try {
    const id = myUserId ? myUserId : localStorage.getItem('vtotal_id');
    const s1Raw = localStorage.getItem(`vtotal_snap1_${id}`);
    const s2Raw = localStorage.getItem(`vtotal_snap2_${id}`);
    const s3Raw = localStorage.getItem(`vtotal_snap3_${id}`);

    if (s1Raw) {
      const snap1 = JSON.parse(s1Raw);
      lastBTResult1 = snap1; lastBTResult = snap1;
      // true 옵션 = "화면만 바꾸고 저장(덮어쓰기)은 하지 마라"
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
    showToast("실전(캐시) 데이터로 복귀 완료", "⚡");
  } catch (e) {
    console.error("Restore Failed:", e);
  } finally {
    isViewingHistory = false; // 시뮬레이션 모드 종료
  }
}

function isPerfCacheValid() {
  if (!lastMyPerfData) return false;
  const now = new Date();
  const last = new Date(perfLastCheckTime);
  return now.getFullYear() === last.getFullYear() &&
    now.getMonth() === last.getMonth() &&
    now.getDate() === last.getDate();
}

// 🔴 [추가] 중복 코드를 밖으로 분리한 성과 렌더링 도우미 함수
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
      const res = processRealLogData(d, s.name);
      if (res) updateUIWithResult(res, s.cfg, slotNum, true);
    }
  });
  updateCombinedMetrics();
  renderChart(lastBTResult1, lastBTResult2, lastBTResult3);
}

function showOrderView() {
  restoreSimulationUI();
  isStatsMode = false;
  isOrderView = true;
  document.getElementById('mainGrid').classList.remove('perf-metrics-layout');
  const btnStats = document.getElementById('btnStatsShow');
  if (btnStats) btnStats.classList.remove('active');

  if (shouldAutoRefresh()) {
    handleInstantOrder();
  } else {
    refreshOrderViewUI();
  }
}

function shouldAutoRefresh() {
  if (!myUserId) return false;
  
  const now = new Date();
  const nyHour = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }).format(now));
  const nyDateStr = formatDateNY(now); 
  const lastDate = localStorage.getItem('vtotal_last_auto_ny_' + myUserId);

  // ⭐️ 뉴욕 시간 오후 5시(17시) 이후에만 갱신 발동! (서머타임 시 한국 아침 6시, 해제 시 아침 7시)
  if (nyHour >= 17) {
    if (lastDate !== nyDateStr) {
      localStorage.setItem('vtotal_last_auto_ny_' + myUserId, nyDateStr);
      return true;
    }
  }
  return false;
}

function showStatsView() {
  // 1. 상태 전환: 성과지표 모드 ON, 주문표 모드 OFF
  isStatsMode = true;
  isOrderView = false; 
  
  // ⭐️ [버그 픽스] "나 지금 과거 장부 보는 중이야!" 스위치를 켜야 나중에 돌아올 때 원래 주문표를 복구해 줍니다!
  isViewingHistory = true; 

  // 2. 화면 UI 전환 (CSS 레이아웃 변경)
  const grid = document.getElementById('mainGrid');
  if (grid) grid.classList.add('perf-metrics-layout');
  
  const btnStats = document.getElementById('btnStatsShow');
  if (btnStats) btnStats.classList.add('active');

  // 3. 서버 통신 없이 순수 시트 캐시만 즉시 화면에 그리기
  const s1 = slot1Config?.basics?.strategy || "";
  const s2 = isSlot2Active() ? (slot2Config?.basics?.strategy || "") : "";
  const s3 = isSlot3Active() ? (slot3Config?.basics?.strategy || "") : "";

  renderPerfFromCache(s1, s2, s3);
}

function toggleOrderHoldings() {
  isOrderView = !isOrderView;
  refreshOrderViewDisplay();
}

function refreshOrderViewDisplay() {
  refreshOrderViewUI();
}

let currentActiveConfigStr = ""; let lastBTResult = null;
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

const DB_NAME = "VTotalDB_Cache"; const DB_VERSION = 2; const STORE_NAME = "YahooDataStore";
async function openDB() { return new Promise((resolve, reject) => { const req = indexedDB.open(DB_NAME, DB_VERSION); req.onupgradeneeded = e => { const db = e.target.result; if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "ticker" }); }; req.onsuccess = e => resolve(e.target.result); req.onerror = e => reject(e.target.error); }); }
async function getDB(tk) { try { const db = await openDB(); return new Promise((resolve, reject) => { const tx = db.transaction(STORE_NAME, "readonly"); const req = tx.objectStore(STORE_NAME).get(tk); req.onsuccess = () => resolve(req.result); req.onerror = () => resolve(null); }); } catch (e) { return null; } }
async function setDB(data) { try { const db = await openDB(); const tx = db.transaction(STORE_NAME, "readwrite"); tx.objectStore(STORE_NAME).put(data); } catch (e) { } }

function formatComma(val) { if (!val && val !== 0) return ''; let s = String(val).replace(/[^0-9.]/g, ''); let parts = s.split('.'); parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ","); return parts.join('.'); }
function unformatComma(val) { return String(val).replace(/,/g, ''); }

let periodViewState = 0; let isMonthlyExpanded = false; let globalMonthlyData = []; let globalYearlyData = [];
let chartViewMode = 0;

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
  document.getElementById('tabSlot1').style.background = (tabNum === 1) ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'rgba(51,65,85,0.8)';
  document.getElementById('tabSlot2').style.background = (tabNum === 2) ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(51,65,85,0.8)';
  document.getElementById('tabSlot3').style.background = (tabNum === 3) ? 'linear-gradient(135deg, #ec4899, #db2777)' : 'rgba(51,65,85,0.8)';
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
function isSlot1Active() { return isStrategySet(slot1Config); }
function isSlot2Active() { return isStrategySet(slot2Config); }
function isSlot3Active() { return isStrategySet(slot3Config); }

function updateSlotsVisibility() {
  const statuses = [isSlot1Active(), isSlot2Active(), isSlot3Active()];
  statuses.forEach((active, i) => {
    const num = i + 1;
    const v = document.getElementById('orderSlot' + num); if (v) v.style.display = active ? 'flex' : 'none';
    const m = document.getElementById('monthlySlot' + num); if (m) m.style.display = active ? 'block' : 'none';
  });

  const m4 = document.getElementById('monthlySlot4');
  if (m4) m4.style.display = (statuses[0] && (statuses[1] || statuses[2])) ? 'block' : 'none';

  const panel = document.getElementById('panelMonthly');
  if (panel) {
    if (statuses[0] && (statuses[1] || statuses[2])) panel.classList.add('dual-active');
    else panel.classList.remove('dual-active');
  }
  updatePeriodTitle();
  refreshStatsTable();
}

function toggleSlot2Visibility(show) {
  updateSlotsVisibility();
}

window.onload = function () {
  const isAuth = localStorage.getItem('vtotal_auth'); const savedId = localStorage.getItem('vtotal_id');
  if (isAuth === 'true' && savedId) { myUserId = savedId; enterAppDirectly(); }
  else { document.getElementById('loginScreen').classList.remove('hidden'); }
};

async function handleLogin() {
  const id = document.getElementById('loginId').value.trim(), pw = document.getElementById('loginPw').value.trim(), btn = document.getElementById('loginBtn');
  if (!id || !pw) return alert("아이디와 비밀번호를 입력하세요."); btn.innerText = "서버 통신 중..."; btn.disabled = true;
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
          if (initData && initData.config2) {
            localStorage.setItem(`vtotal_conf2_${id}`, JSON.stringify(initData.config2));
          }
          if (initData && initData.config3) {
            localStorage.setItem(`vtotal_conf3_${id}`, JSON.stringify(initData.config3));
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

  const userHeader = document.getElementById('userDisplayHeader');
  if (userHeader) userHeader.innerText = myUserId;
  if (document.getElementById('loginVersion')) document.getElementById('loginVersion').innerText = `v${APP_VERSION}`;
  if (document.getElementById('settingsVersion')) document.getElementById('settingsVersion').innerText = APP_VERSION;

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

  // 💾 [합산 캐시 로드] 엔진 실행 전, 저장되어있던 합산 데이터를 즉시 보여줍니다.
  const cachedCombined = localStorage.getItem(`vtotal_snap_combined_${myUserId}`);
  if (cachedCombined) {
    try {
      const c = JSON.parse(cachedCombined);
      globalMonthlyData4 = c.m || [];
      globalYearlyData4 = c.y || [];
      if (isSlot1Active() && (isSlot2Active() || isSlot3Active())) renderPeriodTableText(4);
    } catch (e) { }
  }

  renderChart(lastBTResult1, lastBTResult2, lastBTResult3);

  checkAndSyncWithServer(!slot1Config);
  checkPendingSync();
  setLED('on');
  initInstantButtonEvents();
  initStatsButtonEvents(); // 📊 성과지표 버튼 이벤트 초기화
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
      handlePerformance(true); // 📊 길게 누르면 강제 동기화
    }, 800);
  };
  const cancel = () => clearTimeout(pressTimer);
  const click = (e) => {
    if (isLongPress) return;
    showStatsView(); // 📊 짧게 누르면 성과지표 탭 전환
  };
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
  const click = (e) => {
    if (isLongPress) return;
    showOrderView();
  };
  btn.addEventListener('mousedown', start);
  btn.addEventListener('touchstart', start, { passive: true });
  btn.addEventListener('mouseup', cancel);
  btn.addEventListener('touchend', cancel);
  btn.addEventListener('click', click);
}

// 🟢 [V4.3 초고속 병렬 처리 적용] 대기 시간을 1/3로 압축한 백그라운드 동기화
async function checkAndSyncWithServer(isInitial) {
  setLED('loading');
  const userHeader = document.getElementById('userDisplayHeader');
  if (userHeader) userHeader.innerText = myUserId + ' (초고속 로딩 중...)';

  try {
    // 🚀 Track 1: 로컬 엔진 3개 동시 가동
    const runFastEngine = async (cfg, isActive, slotNum) => {
      if (!isActive) return null;
      const res = await runBacktestMemory(cfg, false, slotNum);
      if (res && res.status !== "error") {
        if (slotNum === 1) { lastBTResult1 = res; lastBTResult = res; }
        else if (slotNum === 2) { lastBTResult2 = res; toggleSlot2Visibility(true); }
        else if (slotNum === 3) { lastBTResult3 = res; }
        updateUIWithResult(res, cfg, slotNum, false);
        return res;
      }
      return null;
    };

    const track1Promise = Promise.all([
      runFastEngine(slot1Config, isSlot1Active(), 1),
      runFastEngine(slot2Config, isSlot2Active(), 2),
      runFastEngine(slot3Config, isSlot3Active(), 3)
    ]);

    // 🚀 Track 2: 구글 서버 통신 병렬 처리 (여기서 5초 단축!)
    const track2Promise = (async () => {
      try {
        const s1Name = slot1Config?.basics?.strategy || "투자법 1";
        const s2Name = slot2Config?.basics?.strategy || "투자법 2";
        const s3Name = slot3Config?.basics?.strategy || "투자법 3";

        // 설정값과 성과 데이터를 직렬 대기하지 않고 '동시에' 요청합니다.
        const [resInit, resPerf] = await Promise.all([
          fetch(`${GAS_URL}?action=GET_INIT&id=${myUserId}`),
          fetch(`${GAS_URL}?action=GET_MY_PERF&id=${myUserId}&strat1=${encodeURIComponent(s1Name)}&strat2=${encodeURIComponent(s2Name)}&strat3=${encodeURIComponent(s3Name)}`)
        ]);

        const dataInit = await resInit.json();
        const dataPerf = await resPerf.json();
        
        return { dataInit, dataPerf };
      } catch (e) { console.error("Track 2 Error:", e); return null; }
    })();

    // 화면 선행 렌더링
    await track1Promise;
    if (!isSlot2Active()) toggleSlot2Visibility(false);
    renderChart(lastBTResult1, lastBTResult2, lastBTResult3);

    isStatsMode = false;
    isOrderView = true;
    document.getElementById('mainGrid').classList.remove('perf-metrics-layout');
    const btnStats = document.getElementById('btnStatsShow');
    if (btnStats) btnStats.classList.remove('active');
    refreshOrderViewUI();

    if (userHeader) userHeader.innerText = myUserId + ' (백그라운드 동기화 중...)';

    // 구글 서버 데이터 수신 완료
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
        localStorage.setItem(`vtotal_sheet_last_date_${slotNum}_${myUserId}`, sheetLastDate);

        const realData = processRealLogData(perfSlotData, confData.basics.strategy);

        if (realData) {
          localStorage.setItem(`vtotal_snap${slotNum}_${myUserId}`, JSON.stringify(realData));
          
          // ⭐️ [데이터 동기화] 시트의 JSON에 있는 최신 원금을 설정값(config)에도 강제로 덮어씌웁니다.
          if (realData.summary.base) {
            confData.basics.renewCash = realData.summary.base;
            // 💾 [영구 저장] 새로고침해도 58로 돌아가지 않도록 로컬 저장소의 설정값도 즉시 업데이트합니다.
            localStorage.setItem(`vtotal_conf${slotNum}_${myUserId}`, JSON.stringify({ basics: confData.basics }));
          }

          if (slotNum === activeSettingsTab) {
            const rInput = document.getElementById('renewCash');
            if (rInput && confData.basics.renewCash) {
              rInput.value = formatComma(confData.basics.renewCash);
            }
          }
          
          const pureEngineRes = await runBacktestMemory(confData, false, slotNum);
          const isEngOk = pureEngineRes && pureEngineRes.status !== "error";

          let mergedSnap = {
            ...realData,
            summary: isEngOk ? pureEngineRes.summary : realData.summary,
            inv: isEngOk ? pureEngineRes.inv : realData.inv,
            trades: isEngOk ? pureEngineRes.trades : realData.trades,
            orders: (isEngOk && pureEngineRes.orders && pureEngineRes.orders.length > 0) ? pureEngineRes.orders : realData.orders,
            nextOrderInfo: isEngOk ? pureEngineRes.nextOrderInfo : null,
            orderDateStr: isEngOk ? pureEngineRes.orderDateStr : realData.orderDateStr,
            dailyStates: isEngOk ? pureEngineRes.dailyStates : realData.dailyStates
          };

          if (slotNum === 1) { lastBTResult1 = mergedSnap; lastBTResult = mergedSnap; }
          else if (slotNum === 2) { lastBTResult2 = mergedSnap; }
          else if (slotNum === 3) { lastBTResult3 = mergedSnap; }

          updateUIWithResult(mergedSnap, confData, slotNum, false);
        }
      }
    };

    // ⭐️ [속도 개선 2] 3개 슬롯의 엔진 재계산을 순차 대기하지 않고 '동시에' 가동합니다! (여기서 또 6~9초 단축!)
    await Promise.all([
      syncSlotWithSheet(dataInit.config, dataPerf.strat1, 1),
      syncSlotWithSheet(dataInit.config2, dataPerf.strat2, 2),
      syncSlotWithSheet(dataInit.config3, dataPerf.strat3, 3)
    ]);

    renderChart(lastBTResult1, lastBTResult2, lastBTResult3);
    updateCombinedMetrics();

    if (dataInit.hasSheet) {
      checkAndRunAutoSave();
    }

  } catch (e) {
    console.error("초기화/동기화 에러:", e);
    setLED('error');
  } finally {
    if (userHeader) userHeader.innerText = myUserId;
    setLED('on');
  }
}

// 🟢 [최종 진화] 시트의 빈 공백(누락된 날짜)만 핀셋으로 골라서 서버로 쏘는 스마트 자동저장
function checkAndRunAutoSave() {
  // ⭐️ [버그 해결] 마스터님 지적대로, 시간 제한을 아예 없앴습니다!
  // 야후 데이터 문지기가 이미 확정된 데이터만 넘겨주므로, 언제 켜든 빈칸만 있으면 즉시 저장합니다.

  let sheetLastDate1 = localStorage.getItem(`vtotal_sheet_last_date_1_${myUserId}`) || "1900-01-01";
  let sheetLastDate2 = localStorage.getItem(`vtotal_sheet_last_date_2_${myUserId}`) || "1900-01-01";
  let sheetLastDate3 = localStorage.getItem(`vtotal_sheet_last_date_3_${myUserId}`) || "1900-01-01";

  let combinedMap = {};
  const addStates = (res, slotKey, lastDate) => {
    if (!res || !res.dailyStates) return;
    res.dailyStates.forEach(state => {
      // 시트의 마지막 날짜보다 최신인 '확정 데이터'만 쏙쏙 골라냅니다.
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
  
  // 저장할 누락분이 없으면 조용히 종료 (시간 락 필요 없음!)
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
      if (header) header.innerText = myUserId + " (누락 데이터 자동 백업 완료!)";
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

// 💡 [개조 2] 4열 압축 동기화용 통신 함수
// ⭐️ [완결판] 화면에 보이는 정답을 그대로 시트에 꽂아넣는 직결형 저장 로직
async function handleSave() {
  const now = new Date();
  const nyHour = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }).format(now));
  
  if (nyHour < 17) {
    if (!confirm("🚨 [치명적 경고: 데이터 확정 전!]\n\n아직 종가가 확정되지 않은 시간입니다.\n지금 시트에 강제로 저장하면 '불완전한 데이터'가 영구 보존됩니다!\n\n정말 강제로 덮어쓰시겠습니까?")) {
      return; 
    }
  } else {
    // 메시지도 직관적으로 변경했습니다!
    if (!confirm("현재 화면에 표시된 계산 결과를 시트에 최종본으로 반영하시겠습니까?")) return;
  }

  const btn = document.getElementById('btnSaveTop');
  const orgText = btn.innerHTML;
  btn.innerText = '⏳ 저장 중';

  saveCurrentFormToSlot(activeSettingsTab);
  lastMyPerfData = null;

  // ⭐️ [핵심 수술 1] 뒤에서 몰래 엔진을 다시 돌리지 않습니다!
  // 마스터님이 백테스트로 이미 띄워둔 글로벌 변수(lastBTResult)를 그대로 가져다 씁니다.
  const processSlotForSave = (cfg, isActive, slotNum, currentRes) => {
    if (!isActive || !currentRes || currentRes.status === "error") return null;
    
    // 화면에 떠 있는 그 정답을 폰의 로컬 캐시(vtotal_snap)에도 '확정' 지어줍니다.
    updateUIWithResult(currentRes, cfg, slotNum, false); 
    return currentRes;
  };

  const res1 = processSlotForSave(slot1Config, isSlot1Active(), 1, lastBTResult1);
  const res2 = processSlotForSave(slot2Config, isSlot2Active(), 2, lastBTResult2);
  const res3 = processSlotForSave(slot3Config, isSlot3Active(), 3, lastBTResult3);

  renderChart(lastBTResult1, lastBTResult2, lastBTResult3);
  const current_phone_time = new Date().toLocaleString('sv-SE');
  localStorage.setItem('vtotal_last_sync_time', current_phone_time);

  // ⭐️ [핵심 수술 2] 복잡한 계산식 삭제. 엔진의 완벽한 결과값을 그대로 JSON에 포장합니다.
  // realizedProfit 자리에 엔진이 마스터님의 공식대로 계산해둔 'totalProfit'을 매칭시켰습니다.
  let payload = {
    action: "BACKUP_AND_SAVE_V4",
    id: myUserId,
    sync_time: current_phone_time,
    date: (res1 && res1.chartDates) ? res1.chartDates[res1.chartDates.length - 1] : formatDateNY(new Date()),
    params: slot1Config,
    params2: isSlot2Active() ? slot2Config : null,
    params3: isSlot3Active() ? slot3Config : null,
    
    s1: res1 ? {
      asset: res1.summary.totalAssets,
      inout: res1.summary.inout,
      json: JSON.stringify({
        cash: Math.round(res1.summary.cash * 100) / 100,
        base_principal: Math.round(res1.summary.base * 100) / 100,
        realizedProfit: Math.round(res1.summary.totalProfit * 100) / 100, 
        holdings: res1.inv
      })
    } : null,
    s2: res2 ? {
      asset: res2.summary.totalAssets,
      inout: res2.summary.inout,
      json: JSON.stringify({
        cash: Math.round(res2.summary.cash * 100) / 100,
        base_principal: Math.round(res2.summary.base * 100) / 100,
        realizedProfit: Math.round(res2.summary.totalProfit * 100) / 100,
        holdings: res2.inv
      })
    } : null,
    s3: res3 ? {
      asset: res3.summary.totalAssets,
      inout: res3.summary.inout,
      json: JSON.stringify({
        cash: Math.round(res3.summary.cash * 100) / 100,
        base_principal: Math.round(res3.summary.base * 100) / 100,
        realizedProfit: Math.round(res3.summary.totalProfit * 100) / 100,
        holdings: res3.inv
      })
    } : null
  };

  if (!navigator.onLine) {
    handleOfflineSave(payload);
    btn.innerHTML = orgText;
    return;
  }

  try {
    await fetch(GAS_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
    btn.innerText = '✅ 반영됨';
    showToast(`시트에 압축 반영되었습니다. (${current_phone_time.split(' ')[1]})`);
    localStorage.removeItem('vtotal_pending_sync');
    setTimeout(() => { btn.innerHTML = orgText; }, 1500);
  } catch (e) {
    handleOfflineSave(payload);
    btn.innerHTML = orgText;
  }
}

// 오프라인 저장 로직
function handleOfflineSave(payload) {
  localStorage.setItem('vtotal_pending_sync', JSON.stringify(payload));
  alert("현재 오프라인입니다.\n데이터는 폰에 우선 저장되었으며, 인터넷이 연결되면 다시 반영할 수 있도록 안내해 드립니다.");
  showToast("오프라인: 폰에 우선 저장됨", "💾");
}

// 온라인 복구 확인 로직
function checkPendingSync() {
  const pendingData = localStorage.getItem('vtotal_pending_sync');
  if (pendingData && navigator.onLine) {
    if (confirm("오프라인 상태에서 저장된 최신 데이터가 있습니다. 지금 시트에 반영하시겠습니까?")) {
      const payload = JSON.parse(pendingData);
      fetch(GAS_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) })
        .then(() => {
          localStorage.removeItem('vtotal_pending_sync');
          showToast("대기 중이던 데이터가 시트에 성공적으로 반영되었습니다.");
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
}

function handleStrategyChange(strategyName) {
  document.getElementById('strategySelect').value = strategyName;
  triggerOptimisticSave();
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

function updateUIWithResult(resBT, config, slotNum, skipSave = false) {
  if (slotNum === 1) {
    currentActiveConfigStr = JSON.stringify(config);
    lastBTResult = resBT; lastBTResult1 = resBT;
    const op = document.getElementById('panelOrder'); if (op) op.classList.remove('hidden');
    globalMonthlyData = resBT.monthlyData; globalYearlyData = resBT.yearlyData;
  }
  if (slotNum === 2) toggleSlot2Visibility(true);

  if (slotNum === 1) { lastBTResult1 = resBT; globalMonthlyData1 = resBT.monthlyData; globalYearlyData1 = resBT.yearlyData; }
  else if (slotNum === 2) { lastBTResult2 = resBT; globalMonthlyData2 = resBT.monthlyData; globalYearlyData2 = resBT.yearlyData; }
  else if (slotNum === 3) { lastBTResult3 = resBT; globalMonthlyData3 = resBT.monthlyData; globalYearlyData3 = resBT.yearlyData; }

  renderOrderViewSlot(resBT, slotNum);
  renderPeriodTableSlot(slotNum);
  renderMetrics(resBT.summary, resBT.chartDates ? resBT.chartDates.length : 0, slotNum);
  updateCombinedMetrics();
  if (skipSave) return;

  try {
    const snapshot = {
      orders: resBT.orders,
      orderDateStr: resBT.orderDateStr,
      summary: resBT.summary,
      inv: (resBT.inv || []).map(p => ({ tier: p.tier, mode: p.mode, buy_price: p.buy_price, qty: p.qty, cost: p.cost, days: p.days, buyDate: p.buyDate })),
      monthlyData: resBT.monthlyData,
      yearlyData: resBT.yearlyData,
      chartDates: resBT.chartDates,
      chartBalances: resBT.chartBalances,
      chartMdd: resBT.chartMdd,
      currentStrat: resBT.currentStrat,
      nextOrderInfo: resBT.nextOrderInfo // T, M, W, Q 보존
    };
    localStorage.setItem(`vtotal_snap${slotNum}_` + myUserId, JSON.stringify(snapshot));
    localStorage.setItem('vtotal_snap_date_' + myUserId, formatDateNY(new Date()));

    const kst = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
    const kstDateStr = kst.getFullYear() + '-' + (kst.getMonth() + 1) + '-' + kst.getDate();
    localStorage.setItem('vtotal_last_auto_kst_' + myUserId, kstDateStr);
  } catch (e) { }
}

function confirmLogout() { if (confirm("로그아웃 하시겠습니까?")) { localStorage.removeItem('vtotal_auth'); localStorage.removeItem('vtotal_id'); location.reload(); } }
function formatDateNY(dateObj) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(dateObj); }

function isUSMarketHoliday(dateStr) {
  const parts = dateStr.split('-'); const y = parseInt(parts[0]), m = parseInt(parts[1]), d = parseInt(parts[2]); const targetDate = new Date(y, m - 1, d); const dow = targetDate.getDay();
  const getObs = (yy, mm, dd) => { let dc = new Date(yy, mm - 1, dd); if (dc.getDay() === 0) dc.setDate(dc.getDate() + 1); else if (dc.getDay() === 6) dc.setDate(dc.getDate() - 1); return `${yy}-${String(dc.getMonth() + 1).padStart(2, '0')}-${String(dc.getDate()).padStart(2, '0')}`; };
  const getNth = (yy, mm, wd, nth) => { let dc; if (nth > 0) { dc = new Date(yy, mm - 1, 1); let diff = (wd - dc.getDay() + 7) % 7; dc.setDate(1 + diff + (nth - 1) * 7); } else { dc = new Date(yy, mm, 0); let diff = (dc.getDay() - wd + 7) % 7; dc.setDate(dc.getDate() - diff); } return `${yy}-${String(dc.getMonth() + 1).padStart(2, '0')}-${String(dc.getDate()).padStart(2, '0')}`; };
  const getGF = (yy) => { let a = yy % 19, b = Math.floor(yy / 100), c = yy % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451); let month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1; let gf = new Date(yy, month - 1, day); gf.setDate(gf.getDate() - 2); return `${yy}-${String(gf.getMonth() + 1).padStart(2, '0')}-${String(gf.getDate()).padStart(2, '0')}`; };
  const hols = [getObs(y, 1, 1), getNth(y, 1, 1, 3), getNth(y, 2, 1, 3), getGF(y), getNth(y, 5, 1, -1), getObs(y, 6, 19), getObs(y, 7, 4), getNth(y, 9, 1, 1), getNth(y, 11, 4, 4), getObs(y, 12, 25)];
  return hols.includes(dateStr);
}
function pyRound2(num) { let factor = 100, temp = num * factor, rounded = Math.round(temp); if (Math.abs(temp % 1) === 0.5) rounded = (Math.floor(temp) % 2 === 0) ? Math.floor(temp) : Math.ceil(temp); return rounded / factor; }

const yahooCache = {};
const pendingFetches = {};

async function fetchYahooData(t, p1, p2, rnd, force = false) {
  if (!t) throw new Error("티커가 비어있습니다.");
  const memKey = `${t}_${p1}_${p2}`;
  if (!force && yahooCache[memKey]) return yahooCache[memKey];
  if (!force && pendingFetches[memKey]) return await pendingFetches[memKey];

  const fetchPromise = (async () => {
    let cached = await getDB(t);
    if (!cached) { cached = { ticker: t, dates: [], close: [], open: [] }; }
    const requestedStart = p1 * 1000, requestedEnd = p2 * 1000;
    const lastCachedTs = cached.dates.length > 0 ? (new Date(cached.dates[cached.dates.length - 1])).getTime() : 0;
    const firstCachedTs = cached.dates.length > 0 ? (new Date(cached.dates[0])).getTime() : Infinity;
    let fetchP1 = p1, fetchP2 = p2, isDelta = false;
    const now = Date.now();
    // ⚠️ 캐시 무력화 및 야후 실시간 강제 연동
    // 1시간 캐싱 등 복잡한 우회 로직을 제거하고 확실하게 최신 데이터를 보장
    const enoughOld = (firstCachedTs <= requestedStart + 43200000);

    if (force || !enoughOld || (requestedEnd - lastCachedTs > 86400000)) {
      // 데이터가 하루 이상 비어있거나, 강제 고침일 경우 깔끔하게 델타 무시하고 전체 최신화
      fetchP1 = p1; fetchP2 = p2; isDelta = false;

      // 야후 서버 타임스탬프 오류 방지를 위해 3일 뒤까지 마진 제공
      fetchP2 = fetchP2 + (86400 * 3);
      // ⭐️ 구글 서버(GAS_URL)를 버리고, VERCEL_URL로 직접 쏩니다!
      const yUrl = `${VERCEL_URL}?t=${t}&p1=${fetchP1}&p2=${fetchP2}`;
      try {
        const response = await fetch(yUrl); const res = await response.json(); if (res.error) throw new Error(res.error);
        const r = res.chart.result[0], ts = r.timestamp, cls = r.indicators.quote[0].close, ops = r.indicators.quote[0].open;
        let newDates = [], newClose = [], newOpen = [], lastDay = "";
        for (let i = 0; i < ts.length; i++) {
          if (cls[i] !== null) {
            let dateObj = new Date(ts[i] * 1000); let dayStr = formatDateNY(dateObj); let cVal = rnd ? pyRound2(cls[i]) : cls[i]; let oVal = rnd ? pyRound2(ops[i]) : ops[i];
            if (dayStr !== lastDay) { newDates.push(dateObj); newClose.push(cVal); newOpen.push(oVal); lastDay = dayStr; } else { newClose[newClose.length - 1] = cVal; newOpen[newOpen.length - 1] = oVal; }
          }
        }
        if (isDelta) {
          const lastStr = formatDateNY(new Date(lastCachedTs));
          const freshIdx = newDates.findIndex(d => formatDateNY(d) > lastStr);
          if (freshIdx !== -1) {
            cached.dates = cached.dates.concat(newDates.slice(freshIdx));
            cached.close = cached.close.concat(newClose.slice(freshIdx));
            cached.open = cached.open.concat(newOpen.slice(freshIdx));
          }
        } else {
          // ⚠️ [야후 증분 보호 로직] 야후 서버 장애로 과거 날짜까지만 넘어온 경우 (예: 4/7이 내려오다 4/6으로 후퇴)
          // 기존 캐시에 있던 소중한 최신 날짜(4/7)를 날려버리지 않도록 MERGE(방어)합니다.
          let existingLastStr = cached.dates.length > 0 ? formatDateNY(new Date(cached.dates[cached.dates.length - 1])) : "1900-01-01";
          let newLastStr = newDates.length > 0 ? formatDateNY(newDates[newDates.length - 1]) : "1900-01-01";

          if (existingLastStr > newLastStr) {
            // 야후 데이터가 오히려 더 과거로 퇴보했다면, 안전하게 기존 캐시를 보존
            console.warn(`야후 데이터 누락 감지! (DB: ${existingLastStr}, 야후: ${newLastStr}). 기존 캐시를 보호합니다.`);
          } else {
            // 정상적으로 전체 업데이트 진행
            cached.dates = newDates; cached.close = newClose; cached.open = newOpen;
          }
        }

        const todayNYStr = formatDateNY(new Date()); 
        const nowNY = new Date();
        const nyHour = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }).format(nowNY));

        if (cached.dates.length > 0) {
          const lastDayNY = formatDateNY(new Date(cached.dates[cached.dates.length - 1]));
          // ⭐️ [수정] 뉴욕 시간 오후 5시(장 마감 1시간 뒤) 전에는 당일 봉 불안정 취급, 5시 정각부터 확정본 인정!
          if (lastDayNY === todayNYStr) {
            if (nyHour < 17) {
              cached.dates.pop(); cached.close.pop(); cached.open.pop();
            }
          }
        }
        await setDB(cached);
        localStorage.setItem('vtotal_last_fetch_' + t, now.toString());
      } catch (e) { throw new Error("데이터 수집 실패: " + e.message); }
    }
    const finalResult = { dates: [], close: [], open: [] };
    const reqS = requestedStart, reqE = requestedEnd;
    // 최종 반환할 때 범위 내 데이터만 정제해서 전송
    for (let i = 0, len = cached.dates.length; i < len; i++) {
      const d = cached.dates[i];
      const ts = (d instanceof Date) ? d.getTime() : new Date(d).getTime();
      // API 시간 오차를 감안해 끝쪽 마진을 넉넉하게 줌
      if (ts >= reqS && ts <= reqE + (86400 * 1000 * 5)) {
        finalResult.dates.push(d);
        finalResult.close.push(cached.close[i]);
        finalResult.open.push(cached.open[i]);
      }
    }
    yahooCache[memKey] = finalResult;
    return finalResult;
  })();
  pendingFetches[memKey] = fetchPromise;
  const result = await fetchPromise;
  delete pendingFetches[memKey];
  return result;
}

function getFridayEnd(d) {
  const nyStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  const [y, m, dayVal] = nyStr.split('-').map(Number);
  const date = new Date(y, m - 1, dayVal); const day = date.getDay(); const diff = (day <= 5) ? (5 - day) : (5 + 7 - day); date.setDate(date.getDate() + diff); date.setHours(0, 0, 0, 0); return date.getTime();
}

function calculateWRSI_WFRI(qData) {
  let dD = qData.dates, qC = qData.close, weeklyData = {}, wP = [], wD = [];
  for (let i = 0; i < dD.length; i++) weeklyData[getFridayEnd(dD[i])] = { close: qC[i], date: dD[i] };
  let sortedFri = Object.keys(weeklyData).sort((a, b) => Number(a) - Number(b));
  for (let i = 0; i < sortedFri.length; i++) { wP.push(weeklyData[sortedFri[i]].close); wD.push(weeklyData[sortedFri[i]].date); }
  let p = 14, wRsi = [];
  for (let i = 0; i < wP.length; i++) { if (i < p) { wRsi.push(50); continue; } let g = 0, l = 0; for (let j = i - p + 1; j <= i; j++) { let df = wP[j] - wP[j - 1]; if (df > 0) g += df; else l -= df; } wRsi.push(l === 0 ? 100 : 100 - (100 / (1 + (g / p) / (l / p)))); }
  let wRMap = {};
  for (let i = 0; i < dD.length; i++) { let ds = formatDateNY(dD[i]), friEnd = getFridayEnd(dD[i]), wIdx = sortedFri.indexOf(friEnd.toString()); wRMap[ds] = { dR: (wIdx >= 1) ? wRsi[wIdx - 1] : 50, dRR: (wIdx >= 2) ? wRsi[wIdx - 2] : 50, dCurrent: wRsi[wIdx] }; }
  return wRMap;
}

function run_tungchigi_master(paramsArr) {
  if (!paramsArr || paramsArr.length === 0) return [];
  let g = new Float64Array(100), h = new Float64Array(100), i_p = new Float64Array(100), j = new Float64Array(100), k = new Array(100).fill(false);
  for (let idx = 0; idx < paramsArr.length; idx++) { if (idx >= 100) break; let side = paramsArr[idx][0], method = paramsArr[idx][1], price = parseFloat(paramsArr[idx][2]), qty = parseFloat(paramsArr[idx][3]); if (side === '매수') { g[idx] = price; h[idx] = qty; } else { i_p[idx] = price; j[idx] = qty; if (method.toUpperCase() === 'MOC') k[idx] = true; } }
  let u_g = Array.from(g).filter(v => v > 0), adj_sell = Array.from(i_p).map((val, i) => k[i] ? 0.01 : val), u_i = adj_sell.filter(v => v > 0);
  let m_prices = [...new Set([...u_g, ...u_i])].sort((a, b) => b - a), m_col = new Array(100).fill(NaN); m_prices.forEach((val, i) => m_col[i] = val);
  let n_col = new Float64Array(100), o_col = new Float64Array(100);
  for (let idx = 0; idx < 100; idx++) { if (isNaN(m_col[idx])) continue; let mv = m_col[idx], count_m = m_col.slice(0, idx + 1).filter(v => v === mv).length; if (count_m > 1) { n_col[idx] = 0; } else { let sum_h = 0; for (let x = 0; x < 100; x++) if (g[x] === mv) sum_h += h[x]; n_col[idx] = sum_h; } if (n_col[idx] > 0) { o_col[idx] = 0; } else if (mv === 0.01) { let sum_j = 0; for (let x = 0; x < 100; x++) if (k[x]) sum_j += j[x]; o_col[idx] = -sum_j; } else { let sum_j = 0; for (let x = 0; x < 100; x++) if (!k[x] && i_p[x] === mv) sum_j += j[x]; o_col[idx] = -sum_j; } }
  let p_col = new Float64Array(100), cumsum_n = 0; for (let idx = 0; idx < 99; idx++) { cumsum_n += n_col[idx]; p_col[idx + 1] = cumsum_n; }
  let q_col = new Float64Array(100), cumsum_o = 0; for (let idx = 98; idx >= 0; idx--) { cumsum_o += o_col[idx]; q_col[idx] = cumsum_o; }
  let r_col = new Float64Array(100); for (let idx = 0; idx < 100; idx++) r_col[idx] = p_col[idx] + q_col[idx];
  let s_col = new Float64Array(100); for (let idx = 0; idx < 100; idx++) { let curr = r_col[idx], prev = idx > 0 ? r_col[idx - 1] : 0, nxt = idx < 99 ? r_col[idx + 1] : 0; if (curr === 0) s_col[idx] = 0; else if (curr < 0) s_col[idx] = (nxt < 0) ? (curr - nxt) : curr; else s_col[idx] = (prev < 0) ? curr : (curr - prev); }
  let y_raw = [], z_raw = []; for (let idx = 0; idx < 99; idx++) { let mv = m_col[idx]; if (isNaN(mv)) continue; y_raw.push(o_col[idx] < 0 ? mv - 0.01 : mv); z_raw.push(n_col[idx] > 0 ? mv + 0.01 : mv); }
  let y_sorted = y_raw.sort((a, b) => b - a), z_sorted = z_raw.sort((a, b) => b - a), y_final = new Array(100).fill(NaN), z_final = new Array(100).fill(NaN); for (let i = 0; i < z_sorted.length; i++) z_final[i] = z_sorted[i]; for (let i = 0; i < y_sorted.length; i++) if (i + 1 < 100) y_final[i + 1] = y_sorted[i];
  let grouped = {}; for (let idx = 0; idx < 100; idx++) { let s = s_col[idx]; if (s === 0) continue; let side = s > 0 ? "매수" : "매도", price = s > 0 ? y_final[idx] : z_final[idx]; if (isNaN(price) || price <= 0) continue; let method = (price === 0.01 && side === "매도") ? "MOC" : "LOC", key = side + "|" + method + "|" + price.toFixed(4); if (!grouped[key]) grouped[key] = { side: side, method: method, price: price, qty: Math.abs(s) }; else grouped[key].qty += Math.abs(s); }
  return Object.values(grouped).sort((a, b) => b.price - a.price).map(r => [r.side, r.method, r.price, r.qty]);
}

async function runBacktestMemory(params, force = false, slotNum = null) {
  try {
    let ticker = params.basics.ticker.toString().trim(), startDate = new Date(params.basics.startDate);
    let endDateInput = params.basics.endDate;
    let endDate = (endDateInput && endDateInput.trim() !== "") ? new Date(endDateInput) : new Date();
    endDate.setHours(23, 59, 59, 999);

    function n(val, def) { return (val === "" || isNaN(val)) ? def : parseFloat(val); }
    function p(val) { const num = parseFloat(val); return isNaN(num) ? 0.0 : Number((num / 100.0).toFixed(8)); }

    // ⭐️ [완벽 동기화 로직] 엔진이 초기자산과 '투자갱신금'을 UI에서 정확히 빼옵니다.
    const pInput = (activeSettingsTab === slotNum) ? document.getElementById('initialCash') : null;
    const realTimePrincipal = pInput ? parseFloat(unformatComma(pInput.value)) : n(params.basics.initialCash, 10000);
    
    // 💡 추가된 부분: 갱신금(renewCash)도 UI에서 강제 추출!
    const rInput = (activeSettingsTab === slotNum) ? document.getElementById('renewCash') : null;
    const realTimeRenew = rInput ? parseFloat(unformatComma(rInput.value)) : n(params.basics.renewCash, realTimePrincipal);

    // 엔진의 파라미터를 강제로 업데이트
    params.basics.initialCash = realTimePrincipal;
    params.basics.renewCash = realTimeRenew;

    let initialCash = realTimePrincipal;
    let basePrincipal = realTimeRenew; // 이제 엔진이 마스터님이 적은 가상원금을 정확히 인식합니다!

    let curStrat = params.basics.strategy || '2M3D1-1P';
    if (!MASTER_STRATEGIES[curStrat]) curStrat = '2M3D1-1P';
    let M_STRAT = MASTER_STRATEGIES[curStrat];
    let cfg = M_STRAT.config;
    let MODES = M_STRAT.modes;

    let compR = cfg.compR, lossR = cfg.lossR, EPS = 0.0000001;
    let fBuy = p(params.basics.fBase);
    let fSellT = p(params.basics.fBase) + p(params.basics.fSec);
    let tierAssign = cfg.tierMethod, dLimit = cfg.dLimit, cDn3 = cfg.cDn3, cDn2 = cfg.cDn2, cDn1 = cfg.cDn1;
    let useMid1 = cfg.useMid1, useMid2 = cfg.useMid2, useMid3 = cfg.useMid3;

    let startTs = Math.floor(startDate.getTime() / 1000) - (365 * 86400);
    let todayFixed = new Date(); todayFixed.setHours(23, 59, 59, 999);
    let endTs = Math.floor(todayFixed.getTime() / 1000);

    let [mainDataAll, qqqData] = await Promise.all([
      fetchYahooData(ticker, startTs, endTs, true, force),
      fetchYahooData("QQQ", startTs, endTs, true, force)
    ]);
    window.globalMainData = mainDataAll;
    let startIndex = mainDataAll.dates.findIndex(d => d >= startDate); if (startIndex === -1) startIndex = 0;
    let firstPrevClose = (startIndex > 0) ? mainDataAll.close[startIndex - 1] : mainDataAll.open[0], wRsiMap = calculateWRSI_WFRI(qqqData);

    let cash = initialCash, prev_total = initialCash, peak = initialCash, base = basePrincipal, inv = [];
    let cumulativeInOut = 0;
    let cumulativeRealizedProfit = 0; // ⭐️ [기억 장치 추가] 누적 실현수익이 날아가지 않도록 보존!
    let res = { S: [], BA: [], BF: [], AV: [], dailyStates: [] }; // ⭐️ dailyStates 추가

    let activeSlot = slotNum || activeSettingsTab;
    let snapStr = localStorage.getItem(`vtotal_snap${activeSlot}_` + myUserId);
    let bDates = mainDataAll.dates.filter(d => d <= endDate && d >= startDate);
    let startLoopIdx = 0;
    let maxBuyDate = ""; // ⭐️ 중복 매수 방어선

    // 🚀 [마스터 아키텍처 V4] 로컬 캐시(또는 시트에서 받아온 JSON) 완벽 복원
    if (!force && snapStr) {
      let snap = JSON.parse(snapStr);
      if (snap.currentStrat === curStrat && snap.chartDates && snap.chartDates.length > 0) {
        res.S = snap.chartDates;
        res.BA = snap.chartBalances;
        res.BF = snap.chartMdd;

        inv = snap.inv || [];
        inv.forEach(h => { if (h.buyDate > maxBuyDate) maxBuyDate = h.buyDate; });
        let lastSnapDateStr = res.S[res.S.length - 1];
        if (lastSnapDateStr > maxBuyDate) maxBuyDate = lastSnapDateStr;

        cash = snap.summary.cash;
        peak = snap.summary.peak || (res.BA.length > 0 ? Math.max(...res.BA) : initialCash);
        // ⭐️ [핵심] 이어하기(force=false)일 때 과거 누적 수익금을 불러와서 장착!
        cumulativeRealizedProfit = snap.summary.realizedProfit || 0; 

        let oldBase = snap.summary.base || initialCash;
        cumulativeInOut = snap.summary.inout || 0;
        
        // ⭐️ [마스터 절대 권력 로직]
        // 화면에 입력한 갱신금(basePrincipal)이 과거의 유령 갱신금(oldBase)과 다르다면?
        // 엔진의 오지랖을 무시하고, 무조건 마스터님이 입력한 숫자로 강제 교체합니다!
        if (Math.abs(basePrincipal - oldBase) > 1) { 
            console.log(`🚀 [갱신금 강제 리셋] 유령(${oldBase}) 삭제 ➜ 마스터의 새 갱신금(${basePrincipal}) 장착!`);
            base = basePrincipal; // 👈 마스터님의 94315.72 가 드디어 온전히 박힙니다.
        } else {
            base = oldBase; // 변경이 없으면 평소처럼 복리 이어가기
        }

        startLoopIdx = bDates.findIndex(d => formatDateNY(d) > maxBuyDate);
        if (startLoopIdx === -1) startLoopIdx = bDates.length;
      }
    }

    let full_c = mainDataAll.close, rsi_m = 'SF';
    function t2(v) { let s = (v >= 0 ? EPS : -EPS); return Math.trunc((v + s) * 100) / 100.0; } function c2(v) { return Math.ceil((v * 100) - EPS) / 100.0; } function R2(v) { return Number(Math.round((v + EPS) * 100) / 100); } function truncPct5(v) { let sign = v >= 0 ? 1e-11 : -1e-11; return Math.trunc((v + sign) * 100000) / 100000; }

    for (let i = startLoopIdx; i < bDates.length; i++) {
      let idx = startIndex + i, close = full_c[idx], dtStr = formatDateNY(bDates[i]), prev = (idx === 0) ? firstPrevClose : full_c[idx - 1];

      // ⭐️ [수정] 무작정 스킵하지 말고, '장부(S 배열)에 이미 기록된 날짜'만 스킵합니다!
      if (res.S.includes(dtStr)) continue;

      let rv = wRsiMap[dtStr] ? wRsiMap[dtStr].dR : 50, rrv = wRsiMap[dtStr] ? wRsiMap[dtStr].dRR : 50;
      if (rv !== 0) { if (rrv <= 35 && rrv < rv) rsi_m = 'AG'; else if (rrv >= 40 && rrv < 50 && rrv > rv) rsi_m = 'SF'; else if (rrv <= 50 && rv > 50) rsi_m = 'AG'; else if (rrv >= 50 && rv < 50) rsi_m = 'SF'; else if (rrv >= 50 && rrv < 60 && rrv < rv) rsi_m = 'AG'; else if (rrv > 65 && rrv > rv) rsi_m = 'SF'; }

      let curr_m = rsi_m;
      if (idx >= 4) {
        let pct_m1 = truncPct5((full_c[idx - 1] - full_c[idx - 2]) / full_c[idx - 2]);
        let pct_m2 = truncPct5((full_c[idx - 2] - full_c[idx - 3]) / full_c[idx - 3]);
        let pct_m3 = truncPct5((full_c[idx - 3] - full_c[idx - 4]) / full_c[idx - 4]);

        let is3Drop = (pct_m1 <= cDn1 && pct_m2 <= cDn2 && pct_m3 <= cDn3);
        let isPlunge = (pct_m1 <= dLimit);
        let applied_m = null;

        if (is3Drop) {
          if (useMid1 && useMid3) applied_m = (curr_m === 'AG') ? 'Middle3' : 'Middle';
          else if (useMid1) applied_m = 'Middle';
          else if (useMid3) applied_m = 'Middle3';
        }
        if (!applied_m && isPlunge && useMid2) {
          applied_m = 'Middle2';
        }
        if (applied_m) curr_m = applied_m;
      }

      let t = inv.length + 1; if (tierAssign === '최소(빈자리)' || tierAssign === '최소') { let used = inv.map(p => p.tier); t = 1; while (used.indexOf(t) !== -1) t++; }
      let b_qty = 0, b_tgt = 0, seed = 0.0;

      let w_list = MODES[curr_m].weight;
      if (t <= w_list.length) {
        let w_val = w_list[t - 1];
        seed = t2(Math.min(base * w_val, cash));
        b_tgt = t2(prev * (1 + MODES[curr_m].buy[t - 1]));
        if (b_tgt > 0 && close <= b_tgt) b_qty = Math.floor(seed / (b_tgt * (1 + fBuy)) + 1e-12);
      }

      let d_sell_net = 0.0, d_buy_cost = 0.0, d_cf = 0.0, n_inv = [];
      for (let p_idx = 0; p_idx < inv.length; p_idx++) {
        let p_inv = inv[p_idx]; p_inv.days++;
        let p_mode = MODES[p_inv.mode] || MODES['SF'];
        let sellRate = p_mode.sell[p_inv.tier - 1] || p_mode.sell[0] || 0;
        let s_tgt = c2(p_inv.buy_price * (1 + sellRate));
        let h_limit = (p_mode.hold[p_inv.tier - 1] || p_mode.hold[0]);

        if (close >= s_tgt || p_inv.days >= h_limit) {
          let net = (p_inv.qty * close) * (1 - fSellT);
          d_sell_net += net; d_buy_cost += p_inv.cost; d_cf += net;
        } else n_inv.push(p_inv);
      }
      inv = n_inv;
      if (b_qty > 0) {
        let totalBC = (b_qty * close) * (1 + fBuy);
        if (totalBC <= cash) {
          d_cf -= totalBC;
          inv.push({ buy_price: close, qty: b_qty, cost: totalBC, mode: curr_m, tier: t, days: 0, buyDate: dtStr });
        }
      }
      cash = t2(cash + d_cf);
      let pl_f = t2(d_sell_net - d_buy_cost), compA = 0.0; if (pl_f > 0) { compA = pl_f * compR; base += compA; } else if (pl_f < 0) { compA = pl_f * lossR; base += compA; } base = t2(base);
      
      cumulativeRealizedProfit += pl_f; // ⭐️ 매일매일 발생한 수익(손실)을 영구 누적!

      let evalVal = inv.reduce((s, p_i) => s + (p_i.qty * close), 0);
      let totalBalance = t2(cash + t2(evalVal)); prev_total = totalBalance; if (totalBalance > peak) peak = totalBalance;
      let currentMdd = peak > 0 ? truncPct5((totalBalance - peak) / peak) : 0;

      // ⭐️ 매일의 장부 상태(JSON용)를 기록할 때, 미세한 소수점 쓰레기를 완벽히 잘라냅니다.
      res.dailyStates.push({
        date: dtStr,
        asset: totalBalance,
        inout: cumulativeInOut,
        json: JSON.stringify({
          cash: Math.round(cash * 100) / 100,
          base_principal: Math.round(base * 100) / 100,
          realizedProfit: Math.round(cumulativeRealizedProfit * 100) / 100,
          holdings: JSON.parse(JSON.stringify(inv))
        })
      });

      res.S.push(dtStr); res.BF.push(currentMdd); res.BA.push(R2(totalBalance)); res.AV.push(pl_f);
    }

    let rawOrderOutput = [], orderDateStr = "날짜 확인 불가";
    let nextOrderInfo = { tier: "-", mode: "-", weight: "-", qty: "-" };

    let tIdx = full_c.length;
    if (tIdx > 0 && res.S.length > 0) {
      const lastDateDaily = mainDataAll.dates[tIdx - 1];
      const lastDateNYStr = formatDateNY(lastDateDaily);
      const lp = lastDateNYStr.split('-');
      const lastDateNY = new Date(parseInt(lp[0]), parseInt(lp[1]) - 1, parseInt(lp[2]), 20);
      const dayOfWeekNY = lastDateNY.getDay();
      const lastFriTS = getFridayEnd(lastDateDaily);

      lastDateNY.setDate(lastDateNY.getDate() + (dayOfWeekNY === 5 ? 3 : 1));
      while (true) {
        const dateStr = formatDateNY(lastDateNY);
        const dow = lastDateNY.getDay();
        if (dow === 0 || dow === 6 || isUSMarketHoliday(dateStr)) {
          lastDateNY.setDate(lastDateNY.getDate() + 1);
        } else { break; }
      }
      const nextFriTS = getFridayEnd(lastDateNY);
      orderDateStr = (lastDateNY.getMonth() + 1) + "/" + lastDateNY.getDate();

      // ⭐️ [버그 수정] 루프 스킵(이어하기) 시 rsi_m이 기본값('SF')으로 굳어버리는 현상 해결
      // 마지막 날짜(lastDateNYStr)의 주간 지표(dR, dRR)를 뜯어와서 현재 모드를 직접 재계산합니다.
      let today_m = 'SF';
      if (wRsiMap[lastDateNYStr]) {
        let base_rv = wRsiMap[lastDateNYStr].dR;
        let base_rrv = wRsiMap[lastDateNYStr].dRR;
        if (base_rv !== 0) {
          if (base_rrv <= 35 && base_rrv < base_rv) today_m = 'AG';
          else if (base_rrv >= 40 && base_rrv < 50 && base_rrv > base_rv) today_m = 'SF';
          else if (base_rrv <= 50 && base_rv > 50) today_m = 'AG';
          else if (base_rrv >= 50 && base_rv < 50) today_m = 'SF';
          else if (base_rrv >= 50 && base_rrv < 60 && base_rrv < base_rv) today_m = 'AG';
          else if (base_rrv > 65 && base_rrv > base_rv) today_m = 'SF';
        }
      }

      // 만약 다음 주문일이 '다음 주'로 넘어갔다면, 이번 주 종가(dCurrent)를 바탕으로 한 번 더 갱신!
      if (nextFriTS !== lastFriTS) {
        const lastBarInfo = wRsiMap[lastDateNYStr];
        if (lastBarInfo) {
          const rv = lastBarInfo.dCurrent; // 다음주의 dR이 될 값
          const rrv = lastBarInfo.dR;      // 다음주의 dRR이 될 값
          if (rv !== 0) {
            if (rrv <= 35 && rrv < rv) today_m = 'AG';
            else if (rrv >= 40 && rrv < 50 && rrv > rv) today_m = 'SF';
            else if (rrv <= 50 && rv > 50) today_m = 'AG';
            else if (rrv >= 50 && rv < 50) today_m = 'SF';
            else if (rrv >= 50 && rrv < 60 && rrv < rv) today_m = 'AG';
            else if (rrv > 65 && rrv > rv) today_m = 'SF';
          }
        }
      }

      let lastDataClose = full_c[tIdx - 1];
      let tp1_h = truncPct5((full_c[tIdx - 1] - (full_c[tIdx - 2] || full_c[tIdx - 1])) / (full_c[tIdx - 2] || full_c[tIdx - 1]));
      let tp2_h = truncPct5(((full_c[tIdx - 2] || full_c[tIdx - 1]) - (full_c[tIdx - 3] || full_c[tIdx - 2])) / (full_c[tIdx - 3] || full_c[tIdx - 2]));
      let tp3_h = truncPct5(((full_c[tIdx - 3] || full_c[tIdx - 2]) - (full_c[tIdx - 4] || full_c[tIdx - 3])) / (full_c[tIdx - 4] || full_c[tIdx - 3]));

      if (tIdx >= 5) {
        let is3Drop_t = (tp1_h <= cDn1 && tp2_h <= cDn2 && tp3_h <= cDn3);
        let isPlunge_t = (tp1_h <= dLimit);
        let applied_m_t = null;
        if (is3Drop_t) {
          if (useMid1 && useMid3) applied_m_t = (today_m === 'AG') ? 'Middle3' : 'Middle';
          else if (useMid1) applied_m_t = 'Middle';
          else if (useMid3) applied_m_t = 'Middle3';
        }
        if (!applied_m_t && isPlunge_t && useMid2) applied_m_t = 'Middle2';
        if (applied_m_t) today_m = applied_m_t;
      }

      let tTier = inv.length + 1; if (tierAssign === '최소(빈자리)' || tierAssign === '최소') { let used = inv.map(p_i => p_i.tier); tTier = 1; while (used.indexOf(tTier) !== -1) tTier++; }
      let currentW = MODES[today_m].weight[tTier - 1] || 0;
      let tSeed = t2(Math.min(base * currentW, cash));
      let bTgtVal = MODES[today_m].buy[tTier - 1] || 0;
      let tTgt = t2(lastDataClose * (1 + bTgtVal));
      let todayBuyQty = (tTgt > 0 && currentW > 0) ? Math.floor((tSeed / (tTgt * (1 + fBuy))) + 1e-12) : 0;
      if (todayBuyQty > 0) rawOrderOutput.push(["매수", "LOC", tTgt, todayBuyQty]);

      inv.forEach(p_i => {
        let p_mode = MODES[p_i.mode] || MODES['SF'];
        let sellRate = p_mode.sell[p_i.tier - 1] || p_mode.sell[0] || 0;
        let s_tgt = c2(p_i.buy_price * (1 + sellRate));
        rawOrderOutput.push(["매도", "LOC", s_tgt, p_i.qty]);
      });

      nextOrderInfo = { tier: tTier, mode: today_m, weight: (currentW * 100).toFixed(1), qty: todayBuyQty };
    }

    let lastIdx = res.BA.length - 1, tAssets = res.BA[lastIdx];
    let totalRealizedProfit = cumulativeRealizedProfit; // ⭐️ 과거 값이 날아가던 reduce 삭제하고 누적 변수로 대체!
    let tQty = inv.reduce((s, p) => s + p.qty, 0), avgPrice = tQty > 0 ? (inv.reduce((s, p) => s + p.cost, 0) / tQty) : 0;
    let currPrice = full_c.length > 0 ? full_c[full_c.length - 1] : 0;
    let evalVal = inv.reduce((s, p_i) => s + (p_i.qty * currPrice), 0);
    let realPrincipal = initialCash + cumulativeInOut;
    let yrs = (endDate - startDate) / (1000 * 60 * 60 * 24 * 365);
    let cagr = yrs > 0 ? (Math.pow((tAssets / realPrincipal), (1 / yrs)) - 1) : 0;
    let oMdd = res.BF.length > 0 ? Math.min(...res.BF) : 0;

    let summary = {
      totalAssets: tAssets, yield: (tAssets - realPrincipal) / realPrincipal, cagr: cagr,
      mdd: oMdd, calmar: oMdd !== 0 ? Math.abs(cagr / oMdd) : 0,
      totalProfit: tAssets - realPrincipal, 
      realizedProfit: tAssets - base, // 👈 마스터님의 절대 공식으로 실시간 재정산
      qty: tQty, avgPrice: avgPrice, evalReturn: tQty > 0 ? (currPrice - avgPrice) / avgPrice : 0,
      evalVal: evalVal, cash: cash, depletion: tAssets > 0 ? (evalVal / tAssets) : 0,
      currPrice: currPrice, currentMdd: res.BF[lastIdx],
      base: base, inout: cumulativeInOut, realPrincipal: realPrincipal, peak: peak
    };

    let finalOrders = run_tungchigi_master(rawOrderOutput);

    return {
      status: "success",
      inv: inv,
      orders: finalOrders,
      orderDateStr: orderDateStr,
      summary: summary,
      chartDates: res.S,
      chartBalances: res.BA,
      chartMdd: res.BF,
      monthlyData: calculateMonthlyData(res.S, res.BA, res.BF, initialCash),
      yearlyData: calculateYearlyData(res.S, res.BA, res.BF, initialCash),
      currentStrat: curStrat,
      nextOrderInfo: nextOrderInfo,
      dailyStates: res.dailyStates // ⭐️ [필수 추가] 이 줄이 없어서 시트 저장이 안 됐던 겁니다!
    };
  } catch (e) { return { status: "error", message: e.toString() }; }
}

function calculateMonthlyData(dates, balances, mdds, initialCash) {
  if (!dates || dates.length === 0) return [];
  let monthly = [];
  let currentMonth = dates[0].substring(0, 7);
  // ⭐️ 1. 시트의 시작날짜(첫번째 날짜)의 총자산이 1개월 차의 원금!
  let monthStartBalance = balances[0];
  let currentMonthMinMdd = mdds[0];

  for (let i = 0; i < dates.length; i++) {
    let monthKey = dates[i].substring(0, 7);
    let dMdd = mdds[i];

    if (monthKey !== currentMonth) {
      let endBalance = balances[i - 1]; // 방금 끝난 달의 말일 자산
      let monthProfit = endBalance - monthStartBalance;
      monthly.push({
        period: currentMonth,
        asset: endBalance,
        rate: monthStartBalance > 0 ? monthProfit / monthStartBalance : 0,
        profit: monthProfit,
        mdd: currentMonthMinMdd
      });
      currentMonth = monthKey;
      // ⭐️ 2. 다음 달의 시작 원금은 '전월 말일 값 기준'
      monthStartBalance = endBalance;
      currentMonthMinMdd = dMdd;
    } else {
      if (dMdd < currentMonthMinMdd) currentMonthMinMdd = dMdd;
    }

    if (i === dates.length - 1) {
      let endBalance = balances[i];
      let monthProfit = endBalance - monthStartBalance;
      monthly.push({
        period: currentMonth,
        asset: endBalance,
        rate: monthStartBalance > 0 ? monthProfit / monthStartBalance : 0,
        profit: monthProfit,
        mdd: currentMonthMinMdd
      });
    }
  }
  return monthly;
}

function calculateYearlyData(dates, balances, mdds, initialCash) {
  if (!dates || dates.length === 0) return [];
  let yearly = [];
  let currentYear = dates[0].substring(0, 4);
  // ⭐️ 1. 시트 시작날짜 총자산이 1년 차의 원금!
  let yearStartBalance = balances[0];
  let currentYearMinMdd = mdds[0];

  for (let i = 0; i < dates.length; i++) {
    let yearKey = dates[i].substring(0, 4);
    let dMdd = mdds[i];

    if (yearKey !== currentYear) {
      let endBalance = balances[i - 1]; // 방금 끝난 연도의 말일 자산
      let yearProfit = endBalance - yearStartBalance;
      yearly.push({
        period: currentYear,
        asset: endBalance,
        rate: yearStartBalance > 0 ? yearProfit / yearStartBalance : 0,
        profit: yearProfit,
        mdd: currentYearMinMdd
      });
      currentYear = yearKey;
      // ⭐️ 2. 다음 해의 시작 원금은 '전월 말일 값 기준'
      yearStartBalance = endBalance;
      currentYearMinMdd = dMdd;
    } else {
      if (dMdd < currentYearMinMdd) currentYearMinMdd = dMdd;
    }

    if (i === dates.length - 1) {
      let endBalance = balances[i];
      let yearProfit = endBalance - yearStartBalance;
      yearly.push({
        period: currentYear,
        asset: endBalance,
        rate: yearStartBalance > 0 ? yearProfit / yearStartBalance : 0,
        profit: yearProfit,
        mdd: currentYearMinMdd
      });
    }
  }
  return yearly;
}

async function handlePerformance(isForce = false) {
  // ⭐️ [이중 잠금 1] 강제 갱신(3초 꾹) 시 데이터 확정 시간(NY 17:00)을 검사합니다.
  if (isForce) {
    const now = new Date();
    const nyHour = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }).format(now));
    if (nyHour < 17) {
      if (!confirm("🚨 [데이터 보호 모드]\n\n아직 뉴욕 시장 종가(오후 5시)가 확정되지 않은 시간입니다.\n지금 강제로 불러오면 불완전한 엉뚱한 값이 섞일 수 있습니다.\n그래도 무시하고 강제 갱신하시겠습니까?")) {
        return; // 마스터님이 취소를 누르면 안전하게 중단!
      }
    }
  }

  const grid = document.getElementById('mainGrid');
  if (grid) {
    grid.classList.add('perf-metrics-layout');
    grid.classList.remove('hidden');
  }
  isStatsMode = true;
  const btnStats = document.getElementById('btnStatsShow');
  if (btnStats) btnStats.classList.add('active');

  const restoreBtn = setBtnLoading('btnPerf', '📥...');
  const strat1Name = slot1Config?.basics?.strategy || "";
  const strat2Name = isSlot2Active() ? (slot2Config?.basics?.strategy || "") : "";
  const strat3Name = isSlot3Active() ? (slot3Config?.basics?.strategy || "") : "";

  try {
    // 💡 강제 갱신이 아니고, 날짜 캐시가 유효하다면 즉시 0.1초 로딩!
    if (!isForce && isPerfCacheValid()) {
      renderPerfFromCache(strat1Name, strat2Name, strat3Name);
      isViewingHistory = true; restoreBtn(); triggerIconAnim('icoPerf');
      showToast("⚡ 당일 성과 즉시 로딩");
      return;
    }

    // 캐시가 없거나 오늘 데이터가 아니면 서버 통신 시작
    setLED('loading');
    const response = await fetch(`${GAS_URL}?action=GET_MY_PERF&id=${myUserId}&strat1=${encodeURIComponent(strat1Name)}&strat2=${encodeURIComponent(strat2Name)}&strat3=${encodeURIComponent(strat3Name)}`);
    const data = await response.json();

    if (!data || data.status === "error") throw new Error(data.message || "데이터가 없습니다.");

    lastMyPerfData = data;
    perfLastCheckTime = new Date().getTime(); // 오늘 통신 시도 시간 기록

    renderPerfFromCache(strat1Name, strat2Name, strat3Name);
    setLED('on');
    showToast(isForce ? "🔄 3초 강제 업데이트 완료" : "✅ 최신 성과 갱신 완료");
  } catch (e) {
    console.error("성과 데이터 갱신 실패:", e);
    setLED('off');
  } finally {
    isViewingHistory = true; restoreBtn(); triggerIconAnim('icoPerf');
  }
}

function processRealLogData(d, currentStrat) {
  if (!d || !d.logs || d.logs.length === 0) return null;
  const logs = d.logs;
  const meta = d.meta;

  let restoredInv = [];
  let restoredBase = parseFloat(meta.totalPrincipal) || 0;
  
  // ⭐️ [버그 픽스 1] 옛날 헤더(meta) 대신 최신 데이터(JSON)에서 우선적으로 값을 가져옵니다.
  let realizedProfit = parseFloat(meta.realizedProfit) || 0;
  let cash = parseFloat(meta.currentCash) || 0;

  if (d.json && d.json.trim() !== "") {
    try {
      const parsed = JSON.parse(d.json);
      if (parsed.holdings) restoredInv = parsed.holdings;
      if (parsed.base_principal) restoredBase = parsed.base_principal;
      
      // 최신 JSON에 수익금과 예수금이 있다면 무조건 덮어씌움!
      if (parsed.realizedProfit !== undefined) realizedProfit = parsed.realizedProfit;
      if (parsed.cash !== undefined) cash = parsed.cash;
    } catch (e) { console.error("JSON 파싱 실패", e); }
  }

  // ⭐️ [버그 픽스 2] 수량과 평단가도 낡은 meta 대신 '복원된 실제 보유 종목'에서 실시간으로 완벽하게 다시 계산!
  let qty = 0, totalCost = 0;
  restoredInv.forEach(item => {
    qty += item.qty;
    totalCost += item.cost;
  });
  let avgPrice = qty > 0 ? totalCost / qty : 0;

  const parseAndFormatYYMMDD = (ds) => {
    if (!ds) return null;
    let str = String(ds).trim();
    // ⭐️ 요일 문자열(화) 강제 제거 로직 추가
    str = str.replace(/\([가-힣a-zA-Z]\)/g, "").trim();
    str = str.replace(/[년월.\/]/g, '-').replace(/일/g, '').replace(/\s+/g, '');
    if (str.endsWith('-')) str = str.slice(0, -1);
    if (str.includes('T')) str = str.split('T')[0];

    let p = str.split('-');
    if (p.length >= 3) {
      let y = p[0];
      if (y.length === 2) y = "20" + y;
      let m = p[1].padStart(2, '0');
      let d = p[2].padStart(2, '0');
      return `${y}-${m}-${d}`;
    } else if (p.length === 2) {
      let y = p[0];
      if (y.length === 2) y = "20" + y;
      let m = p[1].padStart(2, '0');
      return `${y}-${m}-01`;
    }
    return str;
  };

  let chartDates = [], chartBalances = [], chartMdd = [], chartInout = [];
  let peak = -Infinity;

  for (let i = 0; i < logs.length; i++) {
    let r = logs[i];
    let dateStr = r[0];
    let asset = parseFloat(String(r[1]).replace(/[^0-9.-]+/g, "")) || 0;

    if (dateStr && asset > 0) {
      let exactDate = parseAndFormatYYMMDD(dateStr);
      let inout = parseFloat(String(r[3]).replace(/[^0-9.-]+/g, "")) || 0;

      chartDates.push(exactDate);
      chartBalances.push(asset);
      chartInout.push(inout);

      if (asset > peak) peak = asset;
      chartMdd.push(peak > 0 ? (asset - peak) / peak : 0);
    }
  }

  const lastAsset = chartBalances[chartBalances.length - 1] || 0;
  const minMdd = chartMdd.length > 0 ? Math.min(...chartMdd) : 0;

  // ⭐️ [이중 합산 방기 및 정합성 패치] 
  const firstAsset = chartBalances[0] || 0;
  const firstInout = chartInout[0] || 0;
  let totalInoutSum = 0;
  chartInout.forEach(v => totalInoutSum += v);

  let totalPrincipal = 0;
  // 첫날 입출금(Inout)이 첫날 자산(Balance)과 거의 같다면, 입출금 열에 초기 자본이 포함된 것이므로 입출금 합계만 원금으로 사용.
  // 다르다면, 시트가 자산 기록부터 시작하고 입출금은 별도 추가금만 적힌 것이므로 '첫날 자산 + 이후 입출금'으로 계산.
  if (firstInout > 0 && Math.abs(firstAsset - firstInout) < 10) {
    totalPrincipal = totalInoutSum;
  } else {
    totalPrincipal = firstAsset + (totalInoutSum - firstInout);
  }


  const evalVal = lastAsset - cash;
  const depletion = lastAsset > 0 ? (evalVal / lastAsset) : 0;

  const investPrincipal = qty * avgPrice;
  const evalReturn = investPrincipal > 0 ? (evalVal - investPrincipal) / investPrincipal : 0;
  const currPrice = parseFloat(meta.tickerPrice) || (qty > 0 ? evalVal / qty : 0);
  const totalProfit = lastAsset - totalPrincipal;
  const simpleYield = totalPrincipal > 0 ? totalProfit / totalPrincipal : 0;

  let cagr = 0;
  if (chartDates.length > 1) {
    const toDateObj = (str) => {
      let p = str.split('-');
      let year = parseInt(p[0], 10);
      if (year < 100) year += 2000;
      return new Date(year, parseInt(p[1], 10) - 1, parseInt(p[2], 10));
    };
    const sDate = toDateObj(chartDates[0]);
    const eDate = toDateObj(chartDates[chartDates.length - 1]);
    let days = Math.max(1, Math.round((eDate - sDate) / (1000 * 60 * 60 * 24)) - 1);
    let years = days / 365;
    if (years > 0) cagr = Math.pow(1 + simpleYield, 1 / years) - 1;
  }

  const calcPeriod = (type) => {
    if (chartDates.length === 0) return [];
    let periods = {};

    for (let i = 0; i < chartDates.length; i++) {
      let parts = chartDates[i].split('-');
      let periodKey = type === 'month' ? `${parts[0]}-${parts[1]}` : parts[0];

      if (!periods[periodKey]) {
        periods[periodKey] = { startIdx: i, endIdx: i, indices: [], inout: 0 };
      }
      periods[periodKey].endIdx = i;
      periods[periodKey].indices.push(i);
      periods[periodKey].inout += (chartInout[i] || 0); // 기간 내 입출금 합산
    }

    let result = [];
    let pKeys = Object.keys(periods).sort();

    for (let i = 0; i < pKeys.length; i++) {
      let key = pKeys[i];
      let pData = periods[key];
      let startAsset = 0;
      let startInout = 0;

      if (i === 0) {
        startAsset = chartBalances[0];
        startInout = chartInout[0] || 0;
      } else {
        startAsset = chartBalances[periods[pKeys[i - 1]].endIdx];
        startInout = 0; // 이전 기간 말일 자산 기준이므로 해당일 입출금은 고려하지 않음
      }

      let endAsset = chartBalances[pData.endIdx];
      let inoutSum = pData.inout;

      // ⭐️ [입출금 보정 및 이중 합산 방지]
      let profit = 0;
      let profitBasis = 0;

      if (i === 0) {
        // 첫 구간은 요약 로직과 동일하게 처리
        if (startInout > 0 && Math.abs(startAsset - startInout) < 10) {
          profit = endAsset - inoutSum;
          profitBasis = inoutSum;
        } else {
          profit = endAsset - startAsset - (inoutSum - startInout);
          profitBasis = startAsset + (inoutSum - startInout);
        }
      } else {
        // 두번째 구간부터는 '기말 - 기초 - 구간입출금'
        profit = endAsset - startAsset - inoutSum;
        profitBasis = startAsset + inoutSum;
      }

      let minMddVal = 0;
      for (let idx of pData.indices) {
        if (chartMdd[idx] < minMddVal) minMddVal = chartMdd[idx];
      }

      result.push({
        period: key,
        asset: endAsset,
        rate: profitBasis > 0 ? profit / profitBasis : 0,
        profit: profit,
        mdd: minMddVal
      });
    }
    return result.reverse();
  };

  const summary = {
    totalAssets: lastAsset, yield: simpleYield, cagr: cagr, mdd: minMdd, calmar: minMdd !== 0 ? Math.abs(cagr / minMdd) : 0,
    totalProfit: lastAsset - totalPrincipal, realizedProfit: realizedProfit, qty: qty, avgPrice: avgPrice,
    evalReturn: evalReturn, evalVal: evalVal, cash: cash, depletion: depletion, currPrice: currPrice,
    currentMdd: chartMdd[chartMdd.length - 1],
    base: restoredBase, // 👈 여기가 범인입니다! totalPrincipal을 restoredBase로 변경
    realPrincipal: totalPrincipal
  };

  let rawOrderOutput = [];
  let M_STRAT = MASTER_STRATEGIES[currentStrat] || MASTER_STRATEGIES["2M3D1-1P"];
  let MODES = M_STRAT.modes;
  function c2(v) { return Math.ceil((v * 100) - 0.0000001) / 100.0; }

  if (restoredInv.length > 0) {
    restoredInv.forEach(p_i => {
      let modeData = MODES[p_i.mode] || MODES['SF'];
      let sellRate = modeData.sell[p_i.tier - 1] || modeData.sell[0] || 0;
      let s_tgt = c2(p_i.buy_price * (1 + sellRate));
      rawOrderOutput.push(["매도", "LOC", s_tgt, p_i.qty]);
    });
  }

  const finalOrders = rawOrderOutput.sort((a, b) => b[2] - a[2]);

  return {
    status: "success", S: chartDates, BA: chartBalances, BF: chartMdd,
    inv: restoredInv, orders: finalOrders, orderDateStr: chartDates[chartDates.length - 1] + " (동기화됨)",
    summary: summary, chartDates: chartDates, chartBalances: chartBalances, chartMdd: chartMdd,
    monthlyData: calcPeriod('month'), yearlyData: calcPeriod('year'), currentStrat: currentStrat
  };
}

async function runEngine() {
  const ticker = document.getElementById('ticker').value;
  const startDate = document.getElementById('startDate').value;
  if (!ticker || !startDate) return alert("데이터를 완전히 불러온 후 실행해주세요.");

  const restoreBtn = setBtnLoading('runBtnSettings', '⏳...');

  // ⭐️ 백테스트 시뮬레이션 모드 진입 선언
  isViewingHistory = true;

  const executeSlot = async (cfg, isActive, setRes, slotNum) => {
    if (isActive) {
      // ⭐️ force=true(처음부터 다시 계산), skipSave=true(진짜 캐시 덮어쓰기 방지)
      const res = await runBacktestMemory(cfg, true, slotNum);
      if (res.status !== "error") {
        setRes(res);
        updateUIWithResult(res, cfg, slotNum, true); // true = 캐시 저장 생략
      }
    } else {
      setRes(null);
    }
  };

  await Promise.all([
    executeSlot(slot1Config, isSlot1Active(), v => lastBTResult1 = v, 1),
    executeSlot(slot2Config, isSlot2Active(), v => lastBTResult2 = v, 2),
    executeSlot(slot3Config, isSlot3Active(), v => lastBTResult3 = v, 3)
  ]);

  updateSlotsVisibility();
  renderChart(lastBTResult1, lastBTResult2, lastBTResult3);

  // ⭐️ 백테스트 전용 UI 전환 (주문표 강제 숨김, 성과지표 레이아웃 강제 적용)
  const grid = document.getElementById('mainGrid');
  if (grid) {
    grid.classList.add('perf-metrics-layout');
    grid.classList.remove('order-expanded');
  }
  isStatsMode = true;
  isOrderView = false;
  const btnStats = document.getElementById('btnStatsShow');
  if (btnStats) btnStats.classList.add('active');

  // 설정창 닫기
  toggleSettings();

  restoreBtn();
  triggerIconAnim('icoRun');
  showToast("백테스트 시뮬레이션 완료 (주문표 제외)");
}

async function handleInstantOrder() {
  const grid = document.getElementById('mainGrid');
  if (grid) grid.classList.remove('hide-order-panel', 'perf-metrics-layout');
  const restoreBtn = setBtnLoading('btnInstant', '⏳...');

  const executeSlot = async (cfg, isActive, setRes, slotNum) => {
    if (isActive) {
      // ⭐️ force=false 로 설정해야 내 진짜 장부(JSON)를 이어서 오늘 주문을 계산함!
      const res = await runBacktestMemory(cfg, false, slotNum);
      if (res.status !== "error") {
        setRes(res);
        updateUIWithResult(res, cfg, slotNum); // 이건 진짜 실전이므로 캐시에 저장(덮어쓰기 허용)
      }
    } else {
      setRes(null);
    }
  };

  await Promise.all([
    executeSlot(slot1Config, isSlot1Active(), v => lastBTResult1 = v, 1),
    executeSlot(slot2Config, isSlot2Active(), v => lastBTResult2 = v, 2),
    executeSlot(slot3Config, isSlot3Active(), v => lastBTResult3 = v, 3)
  ]);

  updateSlotsVisibility();
  renderChart(lastBTResult1, lastBTResult2, lastBTResult3);
  restoreBtn();
  triggerIconAnim('icoInstant');
  showToast("실전 주문표 최신화 완료");
  refreshOrderViewUI();
}

function updateUIWithResult(res, cfg, slotNum, skipSave = false) {
  if (!res) return;

  if (slotNum === 1) {
    lastBTResult1 = res;
    globalMonthlyData1 = res.monthlyData || [];
    globalYearlyData1 = res.yearlyData || [];
  } else if (slotNum === 2) {
    lastBTResult2 = res;
    globalMonthlyData2 = res.monthlyData || [];
    globalYearlyData2 = res.yearlyData || [];
  } else if (slotNum === 3) {
    lastBTResult3 = res;
    globalMonthlyData3 = res.monthlyData || [];
    globalYearlyData3 = res.yearlyData || [];
  }

  // 캐시 저장
  if (!skipSave && myUserId) {
    localStorage.setItem(`vtotal_snap${slotNum}_${myUserId}`, JSON.stringify(res));
  }

  // UI 렌더링
  renderOrderViewSlot(res, slotNum);

  // 합산 데이터 갱신
  calculateCombinedPeriodData();
}

function calculateCombinedPeriodData() {
  const results = [lastBTResult1, lastBTResult2, lastBTResult3].filter(r => r != null && r.chartDates && r.chartDates.length > 0);
  if (results.length < 2) {
    globalMonthlyData4 = []; globalYearlyData4 = [];
    return;
  }

  // 🕵️ 최적화 전략: indexOf 대신 Map을 사용하여 검색 속도를 O(1)로 개선 (초고속 부팅용)
  const allDatesSet = new Set();
  const maps = results.map(r => {
    const dateMap = new Map();
    r.chartDates.forEach((d, i) => {
      dateMap.set(d, i);
      allDatesSet.add(d);
    });
    return { map: dateMap, balances: r.chartBalances, inouts: r.chartInout || [] };
  });

  const sortedDates = [...allDatesSet].sort();
  const combinedBalances = new Array(sortedDates.length).fill(0);
  const combinedMdd = new Array(sortedDates.length).fill(0);
  const combinedInout = new Array(sortedDates.length).fill(0);

  // 1. 일별 합산 (최적화 루프)
  sortedDates.forEach((date, i) => {
    let daySum = 0;
    let dayInout = 0;
    maps.forEach(obj => {
      const idx = obj.map.get(date);
      if (idx !== undefined) {
        daySum += obj.balances[idx];
        dayInout += (obj.inouts[idx] || 0);
      }
    });
    combinedBalances[i] = daySum;
    combinedInout[i] = dayInout;
  });

  // 2. 합산 MDD 계산
  let peak = -Infinity;
  combinedBalances.forEach((val, i) => {
    if (val > peak) peak = val;
    combinedMdd[i] = (peak > 0) ? (val - peak) / peak : 0;
  });

  // 3. 구간별(월/년) 데이터 집계 최최적화
  const calc = (type) => {
    const periods = {};
    for (let i = 0; i < sortedDates.length; i++) {
      const d = sortedDates[i];
      const periodKey = type === 'month' ? d.substring(0, 7) : d.substring(0, 4);
      if (!periods[periodKey]) {
        periods[periodKey] = { startIdx: i, endIdx: i, inout: 0, indices: [] };
      }
      periods[periodKey].endIdx = i;
      periods[periodKey].inout += combinedInout[i];
      periods[periodKey].indices.push(i);
    }

    return Object.keys(periods).sort().reverse().map((key, i, keys) => {
      const p = periods[key];
      const prevKey = Object.keys(periods).sort()[Object.keys(periods).sort().indexOf(key) - 1];

      const startAsset = prevKey ? combinedBalances[periods[prevKey].endIdx] : combinedBalances[0];
      const startInout = prevKey ? 0 : combinedInout[0];
      const endAsset = combinedBalances[p.endIdx];
      const inoutSum = p.inout;

      let profit = 0, basis = 0;
      if (!prevKey) { // 첫 구간
        if (startInout > 0 && Math.abs(startAsset - startInout) < 10) {
          profit = endAsset - inoutSum; basis = inoutSum;
        } else {
          profit = endAsset - startAsset - (inoutSum - startInout);
          basis = startAsset + (inoutSum - startInout);
        }
      } else {
        profit = endAsset - startAsset - inoutSum;
        basis = startAsset + inoutSum;
      }

      let minMdd = 0;
      p.indices.forEach(idx => { if (combinedMdd[idx] < minMdd) minMdd = combinedMdd[idx]; });

      return { period: key, asset: endAsset, rate: basis > 0 ? profit / basis : 0, profit: profit, mdd: minMdd };
    });
  };

  globalMonthlyData4 = calc('month');
  globalYearlyData4 = calc('year');

  // ⭐️ [UI 즉시 동기화] 계산이 끝나는 즉시 화면의 테이블/차트를 강제로 다시 그립니다.
  if (periodDisplayMode === 'chart') {
    renderPeriodBarChart();
  } else {
    if (isSlot1Active()) renderPeriodTableText(1);
    if (isSlot2Active()) renderPeriodTableText(2);
    if (isSlot3Active()) renderPeriodTableText(3);
    if (isSlot1Active() && (isSlot2Active() || isSlot3Active())) renderPeriodTableText(4);
  }

  // 💾 [캐시 저장] 계산된 합산 데이터를 로컬 스토리지에 저장하여 다음 부팅 시 즉시 노출되게 함
  if (myUserId) {
    localStorage.setItem(`vtotal_snap_combined_${myUserId}`, JSON.stringify({ m: globalMonthlyData4, y: globalYearlyData4 }));
  }
}

function renderOrderViewSlot(res, slotNum) {
  if (!res) return;
  const suffix = slotNum;
  renderOrderTableSlot(res.orders, suffix);
  renderHoldingsTableSlot(res.inv || [], res.currentStrat, suffix);

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
  const s1 = (slot1Config?.basics?.strategy || "");
  const s2 = isSlot2Active() ? (slot2Config?.basics?.strategy || "") : "";
  const s3 = isSlot3Active() ? (slot3Config?.basics?.strategy || "") : "";
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
  const labelText = isOrderView ? "주문표" : "보유계좌";
  const smallStyle = 'style="font-size:0.85em; font-weight:normal; opacity:0.8; margin-left:2px;"';

  let titleStr = `${icon} ${labelText}<span ${smallStyle}>(${stratDisplay})</span>`;
  titleStr += ` <span style="font-size:0.75em; font-weight:normal; opacity:0.6; margin-left:8px;">(${date1})</span>`;

  const now = new Date();
  const nyHour = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }).format(now));

  let dForTag = now;
  // 장 마감(오후 4시) 이후에는 다음 날 상태를 미리 보여줌
  if (nyHour >= 16) {
    dForTag = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }

  const checkDateStrForTag = formatDateNY(dForTag);
  const isHoliday = isUSMarketHoliday(checkDateStrForTag);

  // 요일(DOW)도 뉴욕 기준으로 정확히 판별
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
      void el.offsetWidth; // 리플로우 강제 트리거
      el.classList.add('view-transition');
    }
  });
}

function renderHoldingsTableSlot(inv, stratName, slotNum) {
  const tbody = document.getElementById('holdingsBody' + slotNum);
  if (!inv || inv.length === 0) { tbody.innerHTML = "<tr><td colspan='6' style='padding:20px; color:#64748b;'>보유 잔량 없음</td></tr>"; return; }
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
  const s1 = isSlot1Active() ? (slot1Config?.basics?.strategy || "") : "";
  const s2 = isSlot2Active() ? (slot2Config?.basics?.strategy || "") : "";
  const s3 = isSlot3Active() ? (slot3Config?.basics?.strategy || "") : "";
  let sArr = [];
  if (s1) sArr.push(s1);
  if (s2) sArr.push(s2);
  if (s3) sArr.push(s3);
  let currentStratName = sArr.join(' / ');
  const smallStyle = 'style="font-size:0.85em; font-weight:normal; opacity:0.8; margin-left:2px;"';

  if (periodViewState === 0) periodTitle.innerHTML = `📅 월별 성과<span ${smallStyle}>(${currentStratName})</span>`;
  else periodTitle.innerHTML = `📆 년별 성과<span ${smallStyle}>(${currentStratName})</span>`;
}

let periodBarChartInstance = null;
let periodDisplayMode = 'chart'; // 'chart' or 'table'

function togglePeriodDisplayMode() {
  periodDisplayMode = (periodDisplayMode === 'chart') ? 'table' : 'chart';
  const chartC = document.getElementById('periodChartContainer');
  const tableC = document.getElementById('periodTableContainer');
  const ico = document.getElementById('icoPeriodMode');
  if (periodDisplayMode === 'chart') {
    if (chartC) chartC.style.display = 'block';
    if (tableC) tableC.style.display = 'none';
    if (ico) ico.innerText = '🔢';
    renderPeriodBarChart();
  } else {
    if (chartC) chartC.style.display = 'none';
    if (tableC) tableC.style.display = 'block';
    if (ico) ico.innerText = '📈';
    renderPeriodTableText(1);
    if (isSlot2Active()) {
      renderPeriodTableText(2);
    }
    if (isSlot3Active()) {
      renderPeriodTableText(3);
    }
    if (isSlot1Active() && (isSlot2Active() || isSlot3Active())) {
      renderPeriodTableText(4);
    }
  }
}

function togglePeriodView() {
  periodViewState = (periodViewState + 1) % 2;
  updatePeriodTitle();
  if (periodDisplayMode === 'chart') {
    renderPeriodBarChart();
  } else {
    const head1Str = periodViewState === 0
      ? `<th>년/월</th><th class="hide-on-narrow">총자산</th><th>수익금</th><th>수익률</th><th class="hide-on-cover">MDD</th>`
      : `<th>연도</th><th class="hide-on-narrow">총자산</th><th>수익금</th><th>수익률</th><th class="hide-on-cover">MDD</th>`;
    const headStr = periodViewState === 0
      ? `<th>년/월</th><th>수익금</th><th>수익률</th><th class="hide-on-cover">MDD</th>`
      : `<th>연도</th><th>수익금</th><th>수익률</th><th class="hide-on-cover">MDD</th>`;
    const head3Str = `<th>수익금</th><th>수익률</th><th class="hide-on-cover">MDD</th>`;

    ['1', '2', '3', '4'].forEach(s => {
      const h = document.getElementById('periodTableHead' + s);
      if (h) h.innerHTML = (s === '1') ? head1Str : (s === '4' ? head3Str : headStr);
    });

    renderPeriodTableText(1);
    if (isSlot2Active()) {
      renderPeriodTableText(2);
    }
    if (isSlot3Active()) {
      renderPeriodTableText(3);
    }
    if (isSlot1Active() && (isSlot2Active() || isSlot3Active())) {
      renderPeriodTableText(4);
    }
  }
  if (myChart) setTimeout(() => myChart.resize(), 100);
}

function renderPeriodTableText(slotNum) {
  const tbody = document.getElementById('periodBody' + slotNum);
  if (!tbody) return;

  const isCoverMode = document.documentElement.classList.contains('is-cover');
  const s1Active = isSlot1Active();
  const s2Active = isSlot2Active();
  const s3Active = isSlot3Active();

  if (slotNum === 1) {
    const titleEl = document.getElementById('slot1TableName');
    if (titleEl) titleEl.innerText = slot1Config?.basics?.strategy || '투자법1';
  }

  if (slotNum === 2) {
    const titleEl = document.getElementById('slot2TableName');
    if (titleEl) titleEl.innerText = slot2Config?.basics?.strategy || '투자법2';
  }

  if (slotNum === 3) {
    const titleEl = document.getElementById('slot3TableName');
    if (titleEl) titleEl.innerText = slot3Config?.basics?.strategy || '투자법3';
  }

  // 4번 슬롯(합산)은 사전에 계산된 globalMonthlyData4 / globalYearlyData4 사용
  if (slotNum === 4) {
    if (!s1Active || (!s2Active && !s3Active)) return;
    const data = (periodViewState === 1) ? globalYearlyData4 : globalMonthlyData4;

    if (!data || data.length === 0) {
      tbody.innerHTML = "<tr><td colspan='3'>데이터가 없습니다.</td></tr>";
      return;
    }

    const fmtRate = (r) => { const v = (r * 100); return (v > 0 ? '+' : '') + v.toFixed(1) + '%'; };
    const fmtProfit = (p) => { 
      if (isCurrencyKRW) {
        let val = Math.round((p * currentFXRate) / 10000);
        return (val > 0 ? '+' : (val < 0 ? '-' : '')) + Math.abs(val).toLocaleString() + '만원';
      } else {
        let val = Math.round(p);
        return (val > 0 ? '+$' : (val < 0 ? '-$' : '$')) + Math.abs(val).toLocaleString();
      }
    };
    const fmtMdd = (m) => (m * 100).toFixed(1) + '%';
    const cls = (v) => v > 0 ? 'val-plus' : 'val-minus';

    tbody.innerHTML = data.map(row => {
      let displayPeriod = row.period;
      if (periodViewState === 0 && isCoverMode && displayPeriod.length === 7) {
        displayPeriod = displayPeriod.substring(2).replace('-', '/');
      }
      return `<tr>
            <td class="${cls(row.profit)}" style="font-weight:600;">${fmtProfit(row.profit)}</td>
            <td class="${cls(row.rate)}" style="font-weight:600;">${fmtRate(row.rate)}</td>
            <td class="hide-on-cover ${row.mdd < 0 ? 'val-minus' : ''}" style="font-weight:600;">${fmtMdd(row.mdd)}</td>
          </tr>`;
    }).join('');
    return;
  }

  // 1, 2, 3번 슬롯 개별 데이터 렌더링
  const mData = (slotNum === 1) ? globalMonthlyData1 : (slotNum === 2) ? globalMonthlyData2 : globalMonthlyData3;
  const yData = (slotNum === 1) ? globalYearlyData1 : (slotNum === 2) ? globalYearlyData2 : globalYearlyData3;
  let data = (periodViewState === 1) ? yData : mData;

  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${slotNum === 1 ? 5 : 4}">데이터가 없습니다.</td></tr>`;
    return;
  }

  // 내림차순(최신순) 정렬
  data.sort((a, b) => b.period.localeCompare(a.period));

  const fmtRate = (r) => { const v = (r * 100); return (v > 0 ? '+' : '') + v.toFixed(1) + '%'; };
  const fmtProfit = (p) => { 
    if (isCurrencyKRW) {
      let val = Math.round((p * currentFXRate) / 10000);
      return (val > 0 ? '+' : (val < 0 ? '-' : '')) + Math.abs(val).toLocaleString() + '만원';
    } else {
      let val = Math.round(p);
      return (val > 0 ? '+$' : (val < 0 ? '-$' : '$')) + Math.abs(val).toLocaleString();
    }
  };
  const fmtAsset = (a) => {
    if (isCurrencyKRW) {
      let val = Math.round((a * currentFXRate) / 10000);
      return val.toLocaleString() + '만원';
    } else {
      return '$' + Math.round(a).toLocaleString();
    }
  };
  const fmtMdd = (m) => (m * 100).toFixed(1) + '%';
  const cls = (v) => v > 0 ? 'val-plus' : 'val-minus';

  tbody.innerHTML = data.map(row => {
    let displayPeriod = row.period;
    if (periodViewState === 0 && isCoverMode && displayPeriod.length === 7) {
      displayPeriod = displayPeriod.substring(2).replace('-', '/');
    }

    let rowHtml = `<td>${displayPeriod}</td>`;
    if (slotNum === 1) {
      rowHtml += `<td class="hide-on-narrow">${fmtAsset(row.asset)}</td>`;
    }
    rowHtml += `<td class="${cls(row.profit)}">${fmtProfit(row.profit)}</td>`;
    rowHtml += `<td class="${cls(row.rate)}">${fmtRate(row.rate)}</td>`;
    rowHtml += `<td class="hide-on-cover ${row.mdd < 0 ? 'val-minus' : ''}">${fmtMdd(row.mdd)}</td>`;
    return `<tr>${rowHtml}</tr>`;
  }).join('');
}

// ⭐️ 환율 토글 함수
function toggleCurrencyMode() {
  isCurrencyKRW = !isCurrencyKRW;
  const btn = document.getElementById('btnCurrencyToggle');
  
  // 실제 고화질 국기 이미지 (FlagCDN 사용)
  const ICON_USD = `<img src="https://flagcdn.com/w40/us.png" style="width:16px; height:12px; border-radius:2px; margin-right:6px; flex-shrink:0; box-shadow: 0 0 2px rgba(0,0,0,0.5);">`;
  const ICON_KRW = `<img src="https://flagcdn.com/w40/kr.png" style="width:16px; height:12px; border-radius:2px; margin-right:6px; flex-shrink:0; box-shadow: 0 0 2px rgba(0,0,0,0.5);">`;

  if (btn) {
    btn.style.display = "flex";
    btn.style.alignItems = "center";
    btn.style.justifyContent = "center";
    btn.style.minWidth = "100px"; 

    if (isCurrencyKRW) {
      btn.innerHTML = `${ICON_KRW} 원화(KRW)`;
      btn.style.color = '#fbbf24'; 
      btn.style.borderColor = 'rgba(251, 191, 36, 0.5)';
      btn.style.boxShadow = '0 0 10px rgba(251, 191, 36, 0.15)';
    } else {
      btn.innerHTML = `${ICON_USD} 달러(USD)`;
      btn.style.color = '#94a3b8';
      btn.style.borderColor = 'rgba(255,255,255,0.1)';
      btn.style.boxShadow = 'none';
    }
  }

  // 화면 재렌더링
  if (periodDisplayMode === 'chart') {
    renderPeriodBarChart();
  } else {
    renderPeriodTableText(1);
    if (isSlot2Active()) renderPeriodTableText(2);
    if (isSlot3Active()) renderPeriodTableText(3);
    if (isSlot1Active() && (isSlot2Active() || isSlot3Active())) renderPeriodTableText(4);
  }
}

function renderPeriodTable() { if (periodDisplayMode === 'chart') renderPeriodBarChart(); else renderPeriodTableText(1); }
function renderPeriodTableSlot(slotNum) {
  if (periodDisplayMode === 'chart') {
    renderPeriodBarChart();
  } else {
    renderPeriodTableText(slotNum);
    if (isSlot1Active() && isSlot2Active()) {
      renderPeriodTableText(3);
    }
  }
}

function renderPeriodBarChart() {
  const canvas = document.getElementById('periodBarChart');
  const wrapper = document.getElementById('periodBarChartWrapper');
  if (!canvas || !wrapper) return;

  if (periodBarChartInstance) { periodBarChartInstance.destroy(); periodBarChartInstance = null; }

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
  const profits3 = sortedPeriods.map(p => map3[p] ? Math.round((map3[p].profit * fx) / (isKRW ? 10000 : 1)) : 0);

  const rates1 = sortedPeriods.map(p => map1[p] ? Number((map1[p].rate * 100).toFixed(2)) : 0);
  const rates2 = sortedPeriods.map(p => map2[p] ? Number((map2[p].rate * 100).toFixed(2)) : 0);
  const rates3 = sortedPeriods.map(p => map3[p] ? Number((map3[p].rate * 100).toFixed(2)) : 0);

  const s1Name = slot1Config?.basics?.strategy || '투자법1';
  const s2Name = slot2Config?.basics?.strategy || '투자법2';
  const s3Name = slot3Config?.basics?.strategy || '투자법3';
  const isYearly = (periodViewState === 1);

  let datasets = [];

  // --- 수익금 막대 데이터 (Stacked Bar) ---
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
      order: 2 // 막대를 뒤로
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
      backgroundColor: 'rgba(236, 72, 153, 0.5)',
      borderColor: 'rgba(236, 72, 153, 1)',
      borderWidth: 1,
      borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 },
      yAxisID: 'y',
      stack: 'profit',
      order: 2
    });
  }

  // --- 평균 수익률 꺾은선 (단일 라인으로 깔끔하게 표시) ---
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
      borderColor: '#fbbf24',
      backgroundColor: '#fbbf24',
      borderWidth: 3,
      pointRadius: 2,
      pointBackgroundColor: '#fbbf24',
      tension: 0.3,
      yAxisID: 'yRate',
      order: 1 // 선을 막대 앞으로
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
      const meta = chart.getDatasetMeta(datasets.findIndex(d => d.stack === 'profit'));
      if (!meta || !meta.data) { ctx.restore(); return; }

      // 스택 최상단 막대의 위치를 찾아 합산 라벨 표시
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
        const yPos = total >= 0 ? bar.y - 6 : bar.y + 12;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
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
    type: 'bar', // ⭐️ 기본 타입을 'bar'로 명시해야 차트가 정상 렌더링됩니다.
    data: { labels: labels, datasets: datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
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
          grid: { display: false },
          ticks: {
            font: { family: 'Inter', size: 11 },
            color: '#94a3b8',
            maxRotation: isYearly ? 0 : 45,
            autoSkip: true,
            maxTicksLimit: 20
          }
        },
        y: {
          stacked: true,
          position: 'left',
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
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
            color: '#fbbf24',
            callback: function (v) { return v + '%'; }
          },
          title: { display: false }
        }
      }
    },
    plugins: [profitLabelPlugin]
  });
}

function calculateCombinedSummary(r1, r2, r3) {
  // 1. 활성화된(데이터가 있는) 슬롯만 필터링합니다.
  const activeResults = [];
  if (isSlot1Active() && r1) activeResults.push(r1);
  if (isSlot2Active() && r2) activeResults.push(r2);
  if (isSlot3Active() && r3) activeResults.push(r3);

  if (activeResults.length === 0) return null;
  if (activeResults.length === 1) return activeResults[0].summary;

  let tAssets = 0, base = 0, evalVal = 0, totalProfit = 0, realizedProfit = 0, cash = 0, qty = 0, sumRealPrincipal = 0;
  let currPriceSum = 0, avgPriceSum = 0;
  let count = activeResults.length;

  for (const r of activeResults) {
    const s = r.summary || {};
    base += (s.base || 0);
    sumRealPrincipal += (s.realPrincipal || s.base || 0); // realPrincipal이 없으면 base라도 사용
    tAssets += (s.totalAssets || 0);
    evalVal += (s.evalVal || 0);
    totalProfit += (s.totalProfit || 0);
    realizedProfit += (s.realizedProfit || 0);
    cash += (s.cash || 0);
    qty += (s.qty || 0);
    
    // 👑 현재가 평균을 위한 단순 합산
    currPriceSum += (s.currPrice || 0);
    // 👑 평균단가 가중 합산
    avgPriceSum += ((s.avgPrice || 0) * (s.qty || 0)); 
  }

  // ⭐️ [버그 픽스] 무지성 배열 순서 합산(ba[i])을 버리고, 날짜(Date) 기준으로 완벽하게 정렬!
  let combinedMdd = 0;
  let combinedCurrentMdd = 0;

  const allDatesSet = new Set();
  const mappedResults = activeResults.map(r => {
    const dMap = new Map();
    if (r.chartDates && r.chartBalances) {
      r.chartDates.forEach((d, i) => {
        dMap.set(d, r.chartBalances[i]);
        allDatesSet.add(d);
      });
    }
    return dMap;
  });

  const sortedDates = Array.from(allDatesSet).sort();

  if (sortedDates.length > 0) {
    let peak = -Infinity;
    let minDraw = 0;

    sortedDates.forEach((date, i) => {
      let daySum = 0;
      mappedResults.forEach(dMap => {
        // 💡 해당 날짜에 데이터가 있으면 더하고, 아직 전략이 시작 안 했으면 0원 취급!
        if (dMap.has(date)) {
          daySum += dMap.get(date);
        }
      });

      if (daySum > peak) peak = daySum;
      let draw = peak > 0 ? (daySum - peak) / peak : 0;
      if (draw < minDraw) minDraw = draw;
      
      // 맨 마지막 날짜(오늘)의 하락률이 현재 MDD
      if (i === sortedDates.length - 1) combinedCurrentMdd = draw;
    });
    combinedMdd = minDraw;
  }

  return {
    totalAssets: tAssets,
    yield: sumRealPrincipal > 0 ? (tAssets - sumRealPrincipal) / sumRealPrincipal : 0,
    currentMdd: combinedCurrentMdd,
    depletion: tAssets > 0 ? (evalVal / tAssets) : 0,
    totalProfit: tAssets - sumRealPrincipal,
    realizedProfit: realizedProfit,
    evalVal: evalVal,
    cash: cash,
    evalReturn: avgPriceSum > 0 ? (evalVal - avgPriceSum) / avgPriceSum : 0,
    qty: qty,
    currPrice: currPriceSum / count,
    avgPrice: qty > 0 ? avgPriceSum / qty : (avgPriceSum / count),
    base: base,
    mdd: combinedMdd,
    cagr: (function() {
      if (sumRealPrincipal <= 0 || tAssets <= 0) return 0;
      let earliest = Infinity, latest = -Infinity;
      activeResults.forEach(r => {
        if (r.chartDates && r.chartDates.length > 0) {
          const s = new Date(r.chartDates[0]).getTime();
          const e = new Date(r.chartDates[r.chartDates.length - 1]).getTime();
          if (s < earliest) earliest = s;
          if (e > latest) latest = e;
        }
      });
      if (isFinite(earliest) && isFinite(latest)) {
        const days = Math.max(1, Math.round((latest - earliest) / (1000 * 60 * 60 * 24)));
        const years = days / 365;
        const totalYield = (tAssets - sumRealPrincipal) / sumRealPrincipal;
        return years > 0 ? Math.pow(1 + totalYield, 1 / years) - 1 : totalYield;
      }
      return 0;
    })(),
    calmar: combinedMdd !== 0 ? Math.abs((function() {
      if (sumRealPrincipal <= 0 || tAssets <= 0) return 0;
      let earliest = Infinity, latest = -Infinity;
      activeResults.forEach(r => {
        if (r.chartDates && r.chartDates.length > 0) {
          const s = new Date(r.chartDates[0]).getTime();
          const e = new Date(r.chartDates[r.chartDates.length - 1]).getTime();
          if (s < earliest) earliest = s;
          if (e > latest) latest = e;
        }
      });
      const days = isFinite(earliest) ? Math.max(1, Math.round((latest - earliest) / (1000 * 60 * 60 * 24))) : 0;
      const years = days / 365;
      const totalYield = (tAssets - sumRealPrincipal) / sumRealPrincipal;
      return years > 0 ? Math.pow(1 + totalYield, 1 / years) - 1 : totalYield;
    })() / combinedMdd) : 0,
    realPrincipal: sumRealPrincipal
  };
}

function updateCombinedMetrics() {
  updateSlotsVisibility();
}

function refreshStatsTable() {
  const table = document.getElementById('statsTable');
  if (!table) return;
  const s1Active = isSlot1Active();
  const s2Active = isSlot2Active();
  const s3Active = isSlot3Active();
  const rows = [];
  if (s1Active) rows.push({ res: lastBTResult1, name: slot1Config?.basics?.strategy || '투자법 1', color: 'var(--primary)' });
  if (s2Active) rows.push({ res: lastBTResult2, name: slot2Config?.basics?.strategy || '투자법 2', color: 'var(--success)' });
  if (s3Active) rows.push({ res: lastBTResult3, name: slot3Config?.basics?.strategy || '투자법 3', color: '#ec4899' });

  let activeCount = (s1Active ? 1 : 0) + (s2Active ? 1 : 0) + (s3Active ? 1 : 0);
  if (activeCount >= 2) {
    const comb = calculateCombinedSummary(lastBTResult1, lastBTResult2, lastBTResult3);
    rows.push({ res: { summary: comb }, name: '합산', color: 'var(--secondary)' });
  }
  if (rows.length === 0) { table.innerHTML = '<tr><td style="text-align:center; padding:20px; color:#94a3b8;">데이터가 없습니다.</td></tr>'; return; }
  const isValid = (v) => v !== undefined && v !== null && !isNaN(v) && isFinite(v);
  const fmtValue = (sObj, m, isCombo) => {
    if (!sObj) return '-';
    const v = sObj[m.key];
    if (!isValid(v)) return '-';
    // isCombo 제약 제거 (주식수, 평단가 등 노출)
    if (m.type === 'fmt') return '$' + Math.round(Number(v)).toLocaleString();
    if (m.type === 'color') {
      let num = Number(v), str = m.pct ? (Math.abs(num) * 100).toFixed(2) + '%' : '$' + Math.round(Math.abs(num)).toLocaleString();
      return num > 0 ? `<span class="val-plus">+${str}</span>` : (num < 0 ? `<span class="val-minus">-${str}</span>` : `<span>${str}</span>`);
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
    { key: 'depletion', label: '진행율', type: 'color', pct: true },
    { key: 'totalProfit', label: '총수익금', type: 'color' },
    { key: 'evalVal', label: '평가금', type: 'fmt' },
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

  // 기존 2.42 renderMetrics 스타일 적용한 가로형 레이아웃
  let html = '<div style="display:flex; flex-direction:column; gap:2px; padding:2px; box-sizing:border-box;">';

  // 헤더 행 (항목명을 가로로 나열)
  html += '<div style="display:flex; align-items:center; gap:4px; padding:2px 3px; box-sizing:border-box; line-height:1; height:18px; border-bottom:1px solid rgba(255,255,255,0.1);">';
  html += '<div style="font-size:11px; font-weight:700; letter-spacing:-0.2px; line-height:1; min-width:75px; flex-shrink:0; color:var(--text-muted);">투자법</div>';
  metricsList.forEach(m => {
    html += `<div style="flex:1; min-width:48px; font-size:10px; font-weight:700; letter-spacing:-0.2px; line-height:1; text-align:center; color:var(--text-muted); white-space:nowrap;">${m.label}</div>`;
  });
  html += '</div>';

  // 데이터 행 (각 투자법이 한 행 — 가로로 펼쳐짐)
  rows.forEach(r => {
    const isCombo = (r.name === '합산');
    html += `<div style="display:flex; align-items:center; gap:4px; background:rgba(255,255,255,0.04); border-radius:3px; padding:2px 3px; box-sizing:border-box; line-height:1; min-height:18px;">`;
    html += `<div style="font-size:11px; font-weight:700; letter-spacing:-0.2px; line-height:1; min-width:75px; flex-shrink:0; color:${r.color}; display:flex; align-items:center;">${r.name}</div>`;
    metricsList.forEach(m => {
      let cellVal = fmtValue(r.res ? r.res.summary : null, m, isCombo);
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
      drawLabel(`$${Math.round(globalMaxAsset).toLocaleString()}`, x.getPixelForValue(globalMaxAssetIdx), y.getPixelForValue(globalMaxAsset), globalMaxAssetColor, true);
    }
    if (globalMinMddIdx >= 0 && isFinite(globalMinMdd)) {
      drawLabel(`${globalMinMdd.toFixed(2)}%`, x.getPixelForValue(globalMinMddIdx), y1.getPixelForValue(globalMinMdd), globalMinMddColor, false);
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
  const newSig = sig1 + "|" + sig2 + "|" + sig3 + "|" + chartViewMode;

  const s1Set = isSlot1Active();
  const s2Set = isSlot2Active();
  const s3Set = isSlot3Active();

  const s1NameT = s1Set ? (slot1Config?.basics?.strategy || '투자법1') : '투자법1';
  const s2NameT = s2Set ? (slot2Config?.basics?.strategy || '투자법2') : '투자법2';
  const s3NameT = s3Set ? (slot3Config?.basics?.strategy || '투자법3') : '투자법3';

  let namesStr = [];
  if (s1Set) namesStr.push(s1NameT);
  if (s2Set) namesStr.push(s2NameT);
  if (s3Set) namesStr.push(s3NameT);
  let titleSuffix = namesStr.length > 0 ? `(${namesStr.join(' + ')})` : '';

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

  const s1Name = slot1Config?.basics?.strategy || '투자법1';
  const s2Name = slot2Config?.basics?.strategy || '투자법2';
  const s3Name = slot3Config?.basics?.strategy || '투자법3';

  // ⭐️ [버그 픽스] 1번 슬롯 편애 금지! 모든 슬롯의 날짜를 긁어모아 '유니버설 X축'을 만듭니다.
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

  // ⭐️ 날짜를 X축에 맞춰 빈칸(null)으로 예쁘게 정렬해주는 도우미 함수
  const alignData = (resDates, resValues) => {
    const map = {};
    resDates.forEach((d, i) => { map[d] = resValues[i]; });
    return universalDates.map(d => map[d] !== undefined ? map[d] : null);
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
  assetGradient3.addColorStop(0, 'rgba(236, 72, 153, 0.2)');
  assetGradient3.addColorStop(1, 'rgba(236, 72, 153, 0)');

  if ((chartViewMode === 0 || chartViewMode === 1) && res1 && res1.chartDates && s1Set) {
    const alignedBA1 = alignData(res1.chartDates, res1.chartBalances);
    const mdd1 = res1.chartMdd.map(v => v * 100);
    const alignedMDD1 = alignData(res1.chartDates, mdd1);
    
    const ds1 = [
      { label: s1Name + ' 자산', data: alignedBA1, borderColor: '#6366f1', yAxisID: 'y', borderWidth: 2, pointRadius: 0, fill: true, backgroundColor: assetGradient1, tension: 0.2 },
      { label: s1Name + ' MDD', data: alignedMDD1, borderColor: '#ef4444', borderDash: [4, 4], yAxisID: 'y1', borderWidth: 1, pointRadius: 0, fill: false, tension: 0.2 }
    ];
    datasets = datasets.concat(ds1);
    allMddValues = allMddValues.concat(mdd1);
  }

  if ((chartViewMode === 0 || chartViewMode === 2) && res2 && res2.chartDates && s2Set) {
    const alignedBA2 = alignData(res2.chartDates, res2.chartBalances);
    const mdd2 = res2.chartMdd.map(v => v * 100);
    const alignedMDD2 = alignData(res2.chartDates, mdd2);

    const ds2 = [
      { label: s2Name + ' 자산', data: alignedBA2, borderColor: '#10b981', yAxisID: 'y', borderWidth: 2, pointRadius: 0, fill: true, backgroundColor: assetGradient2, tension: 0.2 },
      { label: s2Name + ' MDD', data: alignedMDD2, borderColor: '#f59e0b', borderDash: [4, 4], yAxisID: 'y1', borderWidth: 1, pointRadius: 0, fill: false, tension: 0.2 }
    ];
    datasets = datasets.concat(ds2);
    allMddValues = allMddValues.concat(mdd2);
  }

  if ((chartViewMode === 0 || chartViewMode === 3) && res3 && res3.chartDates && s3Set) {
    const alignedBA3 = alignData(res3.chartDates, res3.chartBalances);
    const mdd3 = res3.chartMdd.map(v => v * 100);
    const alignedMDD3 = alignData(res3.chartDates, mdd3);

    const ds3 = [
      { label: s3Name + ' 자산', data: alignedBA3, borderColor: '#ec4899', yAxisID: 'y', borderWidth: 2, pointRadius: 0, fill: true, backgroundColor: assetGradient3, tension: 0.2 },
      { label: s3Name + ' MDD', data: alignedMDD3, borderColor: '#be185d', borderDash: [4, 4], yAxisID: 'y1', borderWidth: 1, pointRadius: 0, fill: false, tension: 0.2 }
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
          callbacks: { label: function (c) { let l = c.dataset.label || ''; if (l.includes('자산')) return `${l}: $${Math.round(c.parsed.y).toLocaleString()}`; if (l.includes('MDD')) return `${l}: ${c.parsed.y.toFixed(2)}%`; return `${l}: ${c.parsed.y}`; } }
        },
        zoom: { pan: { enabled: true, mode: 'x' }, zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' } }
      },
      scales: {
        y: { position: 'left', grace: '10%', grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { font: { family: 'Inter', size: chartFontSize - 2 }, color: '#94a3b8' } },
        y1: { position: 'right', min: dynamicMddMin, max: 0, grid: { display: false }, ticks: { font: { family: 'Inter', size: chartFontSize - 2 }, color: '#ef4444' } }
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
  const m1 = document.getElementById('monthlySlot1');
  const m2 = document.getElementById('monthlySlot2');
  let mIsSync = false;
  if (m1 && m2) {
    const syncMScroll = function (e) {
      if (mIsSync) return; mIsSync = true;
      const top = this.scrollTop;
      if (m1 !== this) m1.scrollTop = top;
      if (m2 !== this) m2.scrollTop = top;
      setTimeout(() => { mIsSync = false; }, 20);
    };
    m1.addEventListener('scroll', syncMScroll);
    m2.addEventListener('scroll', syncMScroll);
  }

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

    // ⭐️ [개선] 모든 자식 요소의 터치 액션을 auto로 열어서 좌우 스크롤이 어디서든 작동하게 함
    el.style.touchAction = 'auto';
    el.style.userSelect = 'none';

    const mc = new Hammer.Manager(el, {
      touchAction: 'auto',
      recognizers: [
        [Hammer.Pan, { direction: Hammer.DIRECTION_HORIZONTAL, threshold: 45 }]
      ]
    });

    mc.on('panend', (ev) => {
      const absX = Math.abs(ev.deltaX);
      const absY = Math.abs(ev.deltaY);

      // 가로 스크롤 가능한 영역 내부면 스와이프 차단
      const srcEl = ev.srcEvent?.target;
      if (srcEl) {
        let node = srcEl;
        while (node && node !== el) {
          if (node.scrollWidth > node.clientWidth + 2) return;
          node = node.parentElement;
        }
      }

      if (absX > absY && absX > 40) {
        callback(ev.deltaX < 0 ? 'left' : 'right');
        if (navigator.vibrate) navigator.vibrate(8);
      }
    });
  };

  // 1. 주문표 패널: 주문표 <-> 보유계좌 전환
  setupSwipe('panelOrder', () => toggleOrderView());

  // 2. 월별성과 패널: 월별 <-> 년별 성과 전환
  setupSwipe('panelMonthly', () => togglePeriodView());

  // 3. 차트 패널: 전체 -> 투자법1 -> 투자법2 -> 투자법3 순환 전환
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

  // 4. 성과지표 패널 (Stats): 성과지표 화면에서는 스와이프를 제거하여 자유로운 좌우 스크롤 보장
    // setupSwipe('panelStats', () => showOrderView()); // 마스터님 요청으로 제거
});

function setBtnLoading(btnId, loadingText) {
  const btn = document.getElementById(btnId);
  if (!btn) return () => { };
  const orgHtml = btn.innerHTML;
  btn.innerHTML = loadingText;
  btn.disabled = true;
  return () => { btn.innerHTML = orgHtml; btn.disabled = false; };
}

function showToast(msg, icon = "✅") {
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

/**
 * 🕒 S-Quant Flanger 스마트 예약 시스템
 * 뉴욕 시간 17:00(장 마감 1시간 후)을 계산하여 다음 자동 저장을 예약합니다.
 */
function scheduleNextAutoSave() {
  const now = new Date();
  
  // 1. 현재 뉴욕 시간 확인
  const nyFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
    hour12: false
  });
  
  const parts = nyFormatter.formatToParts(now);
  const nyDate = {};
  parts.forEach(p => nyDate[p.type] = p.value);

  // 2. 오늘의 뉴욕 17시 05분(여유 시간 포함) 객체 생성
  let targetNY = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  targetNY.setHours(17, 5, 0, 0);

  // 3. 만약 이미 오늘 17시가 지났다면? 내일 17시로 설정
  if (now.getTime() >= targetNY.getTime()) {
    targetNY.setDate(targetNY.getDate() + 1);
  }

  // 4. 지금부터 타겟 시간까지 남은 밀리초(ms) 계산
  const delay = targetNY.getTime() - now.getTime();
  
  const hours = Math.floor(delay / (1000 * 60 * 60));
  const mins = Math.floor((delay % (1000 * 60 * 60)) / (1000 * 60));

  console.log(`[스케줄러] 다음 데이터 확정까지 ${hours}시간 ${mins}분 남았습니다. (예약 완료)`);

  // 5. 정확한 시간에 실행 예약
  setTimeout(() => {
    console.log("🕒 예약된 시간이 되었습니다. 자동 저장을 시작합니다.");
    checkAndRunAutoSave();
    // 저장이 끝나면 다시 다음 날 시간을 예약 (무한 반복)
    scheduleNextAutoSave(); 
  }, delay);
}

window.addEventListener('load', () => {
  scheduleNextAutoSave();
});

