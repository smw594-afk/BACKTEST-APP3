// UI 헬퍼/업데이트 함수들
// formatStrategyNameWithSmallParentheses, getDateHighlightClass, syncCurrencyUI,
// updateDefaultCurrency, updateTheme, updateSortOrder, updateCombinedMode, updateFontSize,
// getBestResult, calculateCombinedSummary, setupDragScrollX, updateStatsTitleByMode

function formatStrategyNameWithSmallParentheses(name) {
  if (!name) return '';
  return name.replace(/\(([^)]+)\)/g, '<span class="stats-profit-rate">($1)</span>');
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

function updateStatsTitleByMode() {
  const statsTitle = document.getElementById('statsTitle');
  if (!statsTitle) return;
  statsTitle.innerHTML = statsDisplayMode === 'chart' ? '💼 자산현황' : '📡 계좌 정보';
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
  window.isCurrencyKRW = isCurrencyKRW;  // ⚠️ window 객체에도 동기화
  if (myUserId) {
    localStorage.setItem(`vtotal3_pref_currency_${myUserId}`, val);
    showToast(`기본 통화가 ${val === 'KRW' ? '원화' : '달러'}로 설정되었습니다.`);
  }
  syncCurrencyUI();
  window.UI.toggles.refreshAllUI();
  // ⚠️ 2026-08-04: 통화 설정 변경 시 실전 매도 내역도 다시 렌더링해야 한다
  // renderDBTradeHistory는 window.renderDBTradeHistory로 직접 호출
  if (typeof window.renderDBTradeHistory === 'function') {
    window.renderDBTradeHistory();
  }
}

function updateTheme(val) {
  if (val === 'light') document.body.classList.add('light-mode');
  else document.body.classList.remove('light-mode');
  // Chart.js 캔버스는 CSS 변수 변경만으로 색상이 바뀌지 않으므로 테마 전환 시 강제 재렌더한다.
  window.currentChartSignature = "";
  window.currentBarChartSignature = "";
  window.barChartSignatures = {};
  if (periodDisplayMode === 'chart') renderPeriodBarChart();

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
    localStorage.setItem(`vtotal3_pref_theme_${myUserId}`, val);
    showToast(`테마가 ${val === 'light' ? '라이트' : '다크'}로 설정되었습니다.`);
  }
}

function updateSortOrder(val) {
  if (myUserId) {
    localStorage.setItem(`vtotal3_sort_order_${myUserId}`, val);
    showToast(`주문표 정렬이 ${val === 'asc' ? '상승(▲)' : '하강(▼)'}으로 즉시 설정되었습니다.`);
    if (typeof window.UI.order.renderCombinedOrderBook === 'function') window.UI.order.renderCombinedOrderBook();
    for (let i = 1; i <= MAX_SLOTS; i++) {
      if (lastBTResults[i] && lastBTResults[i].orders) {
        window.UI.order.renderOrderTableSlot(lastBTResults[i].orders, i);
      }
    }
  }
}

function updateCombinedMode(val) {
  if (myUserId) {
    localStorage.setItem(`vtotal3_combined_mode_${myUserId}`, val);
    showToast(`통합주문서 모드가 ${val === 'combined' ? '통합주문' : '일반'}으로 설정되었습니다.`);
    updateSlotsVisibility();
    window.UI.order.refreshOrderViewUI();
  }
}

function updateFontSize(val) {
  if (myUserId) {
    localStorage.setItem(`vtotal3_font_size_${myUserId}`, val);
    document.documentElement.style.setProperty('--app-font-size', val);
    showToast(`기본 폰트 크기가 ${val}로 변경되었습니다.`);
    // 차트 데이터가 같아도 폰트 변경 시에는 반드시 새 설정으로 다시 그린다.
    window.currentChartSignature = "";
    window.currentBarChartSignature = "";
    window.barChartSignatures = {};
    if (window.UI?.stats?.refreshStatsTable) window.UI.stats.refreshStatsTable();
    if (typeof renderChartAll === 'function') renderChartAll();
    if (typeof renderPeriodBarChart === 'function') renderPeriodBarChart();
    if (typeof updateStatsPieChart === 'function') updateStatsPieChart();
  }
}

function getBestResult(currentRes, slotNum) {
  if (isViewingHistory) return currentRes;
  if (currentRes && currentRes.isSynced) return currentRes;
  const cachedStr = localStorage.getItem(`vtotal3_snap${slotNum}_` + myUserId);
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
  // ⚠️ 2026-07-31: "합산" 요약도 활성 브로커(키움 1~3 / LS 4~6)만 필터링한다(사용자 요청).
  for (let i = 1; i <= MAX_SLOTS; i++) {
    if (isSlotActive(i) && (!window.BrokerService || window.BrokerService.isSlotForBroker(i))) {
      const b = getBestResult(lastBTResults[i], i);
      if (b) activeRes.push(b);
    }
  }
  return calculateCombinedSummaryEngine(activeRes);
}

function setupDragScrollX(elementId) {
  const el = document.getElementById(elementId);
  if (!el || el.dataset.dragScrollReady === "1") return;
  el.dataset.dragScrollReady = "1";
  let dragging = false;
  let startX = 0;
  let startLeft = 0;

  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch' || e.pointerType === 'pen') return;
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

// Window 객체에 함수 할당 (UI 모듈에서 접근 가능하게)
window.getBestResult = getBestResult;
window.calculateCombinedSummary = calculateCombinedSummary;
window.setupDragScrollX = setupDragScrollX;
window.updateStatsTitleByMode = updateStatsTitleByMode;
window.syncCurrencyUI = syncCurrencyUI;
window.updateDefaultCurrency = updateDefaultCurrency;
window.updateTheme = updateTheme;
window.updateSortOrder = updateSortOrder;
window.updateCombinedMode = updateCombinedMode;
window.updateFontSize = updateFontSize;
