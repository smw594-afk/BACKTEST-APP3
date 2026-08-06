// ui/event-handlers.js
// UI 이벤트 핸들러 통합

const eventHandlers = {
  // 설정 패널 토글
  toggleSettings() {
    const settingsScreen = document.getElementById('settingsScreen');
    if (settingsScreen) {
      settingsScreen.classList.toggle('hidden');
    }
  },

  // 탭 전환
  switchSettingsTab(tabNum) {
    window.activeSettingsTab = tabNum;
    this.updateSettingsTabButtons();
  },

  // 탭 버튼 업데이트
  updateSettingsTabButtons() {
    const activeTab = window.activeSettingsTab || 1;

    for (let i = 1; i <= (window.MAX_SLOTS || 12); i++) {
      const btn = document.getElementById(`tabSlot${i}`);
      if (btn) {
        if (i === activeTab) {
          btn.style.background = 'linear-gradient(135deg, #6366f1, #4f46e5)';
        } else {
          btn.style.background = 'rgba(51,65,85,0.8)';
        }
      }
    }
  },

  // 뷰 전환: 주문/보유
  toggleOrderView(dir) {
    if (window.isOrderView) {
      this.showHoldingsView();
    } else {
      this.showOrderView();
    }
  },

  showOrderView() {
    window.isOrderView = true;
    window.isManualBacktestMode = false;
    const orderView = document.getElementById('orderViewContainer');
    const holdingsView = document.getElementById('holdingsViewContainer');
    const statsView = document.getElementById('statsViewContainer');
    const perfView = document.getElementById('perfViewContainer');

    if (orderView) orderView.classList.remove('hidden');
    if (holdingsView) holdingsView.classList.add('hidden');
    if (statsView) statsView.classList.add('hidden');
    if (perfView) perfView.classList.add('hidden');
  },

  showHoldingsView() {
    window.isOrderView = false;
    window.isManualBacktestMode = false;
    const orderView = document.getElementById('orderViewContainer');
    const holdingsView = document.getElementById('holdingsViewContainer');

    if (orderView) orderView.classList.add('hidden');
    if (holdingsView) holdingsView.classList.remove('hidden');
  },

  showStatsView() {
    window.isStatsMode = true;
    window.isManualBacktestMode = false;
    const statsView = document.getElementById('statsViewContainer');
    const perfView = document.getElementById('perfViewContainer');

    if (statsView) statsView.classList.remove('hidden');
    if (perfView) perfView.classList.add('hidden');
  },

  showPerfView() {
    window.isStatsMode = false;
    window.isManualBacktestMode = false;
    const statsView = document.getElementById('statsViewContainer');
    const perfView = document.getElementById('perfViewContainer');

    if (statsView) statsView.classList.add('hidden');
    if (perfView) perfView.classList.remove('hidden');
  },

  // 기간 표시 모드 토글
  togglePeriodDisplayMode(displayType) {
    if (displayType === 'yearly') {
      window.yearlyDisplayMode = window.yearlyDisplayMode === 'chart' ? 'table' : 'chart';
    } else if (displayType === 'monthly') {
      window.monthlyDisplayMode = window.monthlyDisplayMode === 'chart' ? 'table' : 'chart';
    } else if (displayType === 'daily') {
      window.dailyDisplayMode = window.dailyDisplayMode === 'chart' ? 'table' : 'chart';
    }
  },

  // 차트 뷰 토글
  toggleChartView() {
    window.chartViewMode = (window.chartViewMode + 1) % 3;
  },

  // 통화 모드 토글
  // ⚠️ ui/render-toggles.js에 동일한 이름의 전역 function toggleCurrencyMode()가 있고
  // 로드 순서상 그쪽이 window.toggleCurrencyMode를 덮어써 실제로 사용된다. 이 메서드는 호출되지 않음.
  toggleCurrencyMode() {
    if (window.currencyService) {
      const isKRW = window.currencyService.getIsCurrencyKRW();
      window.currencyService.setIsCurrencyKRW(!isKRW);
    }
  },

  // 기본 통화 업데이트
  updateDefaultCurrency(val) {
    localStorage.setItem('vtotal3_currency', val);
    if (window.currencyService) {
      window.currencyService.setIsCurrencyKRW(val === 'KRW');
    }
  },

  // 테마 업데이트
  updateTheme(val) {
    localStorage.setItem('vtotal3_theme', val);
    if (val === 'dark') {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
  },

  // 정렬 순서 업데이트
  updateSortOrder(val) {
    localStorage.setItem('vtotal3_sort_order', val);
  },

  // 결합 모드 업데이트
  updateCombinedMode(val) {
    localStorage.setItem('vtotal3_combined_mode', val);
    window.isCombinedOrderMode = (val === 'on');
  },

  // 폰트 크기 업데이트
  updateFontSize(val) {
    localStorage.setItem('vtotal3_font_size', val);
    const doc = document.documentElement;
    doc.style.fontSize = val + 'px';
  },

  // 정렬 순서 토글
  toggleSortOrder() {
    const current = localStorage.getItem('vtotal3_sort_order') || 'asc';
    const newOrder = current === 'asc' ? 'desc' : 'asc';
    this.updateSortOrder(newOrder);
  },

  // 개별 홀딩 토글
  toggleIndividualHoldings() {
    window.showIndividualHoldings = !window.showIndividualHoldings;
  }
};

// 전역 호환성
window.eventHandlers = eventHandlers;

// 래퍼 함수들 (기존 코드와의 호환성)
window.toggleSettings = () => eventHandlers.toggleSettings();
window.switchSettingsTab = (tabNum) => eventHandlers.switchSettingsTab(tabNum);
window.toggleOrderView = (dir) => eventHandlers.toggleOrderView(dir);
window.showOrderView = () => {
  if (window.isManualBacktestMode) {
    if (typeof window.restoreLocalCache === 'function') window.restoreLocalCache();
  }
  window.isManualBacktestMode = false;
  eventHandlers.showOrderView();
};
window.showHoldingsView = () => {
  if (window.isManualBacktestMode) {
    if (typeof window.restoreLocalCache === 'function') window.restoreLocalCache();
  }
  window.isManualBacktestMode = false;
  eventHandlers.showHoldingsView();
};
window.showStatsView = () => {
  if (window.isManualBacktestMode) {
    if (typeof window.restoreLocalCache === 'function') window.restoreLocalCache();
  }
  window.isManualBacktestMode = false;
  eventHandlers.showStatsView();
};
window.showPerfView = () => {
  if (window.isManualBacktestMode) {
    if (typeof window.restoreLocalCache === 'function') window.restoreLocalCache();
  }
  window.isManualBacktestMode = false;
  eventHandlers.showPerfView();
};
window.toggleChartView = () => eventHandlers.toggleChartView();
window.toggleCurrencyMode = () => eventHandlers.toggleCurrencyMode();
window.updateDefaultCurrency = (val) => eventHandlers.updateDefaultCurrency(val);
window.updateTheme = (val) => eventHandlers.updateTheme(val);
window.updateSortOrder = (val) => eventHandlers.updateSortOrder(val);
window.updateCombinedMode = (val) => eventHandlers.updateCombinedMode(val);
window.updateFontSize = (val) => eventHandlers.updateFontSize(val);
window.toggleSortOrder = () => eventHandlers.toggleSortOrder();
window.toggleIndividualHoldings = () => eventHandlers.toggleIndividualHoldings();
