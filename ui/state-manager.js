// ui/state-manager.js
// 전역 UI 상태 관리

const stateManager = {
  // 사용자 정보
  myUserId: "",

  // 차트 인스턴스
  myChart: null,
  statsPieChartInstance: null,

  // 뷰 상태
  currentOrderDate: "",
  isOrderView: true,
  isCombinedOrderMode: false,
  isStatsMode: false,
  isViewingHistory: false,
  isManualBacktestMode: false,

  // 설정 탭
  activeSettingsTab: 1,

  // 기간 뷰 상태
  periodViewState: 0,
  periodDisplayMode: 'chart',
  yearlyDisplayMode: 'chart',
  monthlyDisplayMode: 'chart',
  dailyDisplayMode: 'chart',

  // 차트 및 통계
  chartViewMode: 0,
  showIndividualHoldings: false,
  statsDisplayMode: "chart",
  perfStatsMode: "performance",
  backtestStatsMode: "performance",

  // 데이터 캐시
  lastMyPerfData: null,
  perfLastCheckTime: 0,

  // 접근자 메서드
  getMyUserId() { return this.myUserId; },
  setMyUserId(id) { this.myUserId = id; },

  getMyChart() { return this.myChart; },
  setMyChart(chart) { this.myChart = chart; },

  getStatsPieChart() { return this.statsPieChartInstance; },
  setStatsPieChart(chart) { this.statsPieChartInstance = chart; },

  getCurrentOrderDate() { return this.currentOrderDate; },
  setCurrentOrderDate(date) { this.currentOrderDate = date; },

  getIsOrderView() { return this.isOrderView; },
  setIsOrderView(value) { this.isOrderView = value; },

  getIsCombinedOrderMode() { return this.isCombinedOrderMode; },
  setIsCombinedOrderMode(value) { this.isCombinedOrderMode = value; },

  getIsStatsMode() { return this.isStatsMode; },
  setIsStatsMode(value) { this.isStatsMode = value; },

  getIsViewingHistory() { return this.isViewingHistory; },
  setIsViewingHistory(value) { this.isViewingHistory = value; },

  getActiveSettingsTab() { return this.activeSettingsTab; },
  setActiveSettingsTab(tab) { this.activeSettingsTab = tab; },

  getPeriodViewState() { return this.periodViewState; },
  setPeriodViewState(state) { this.periodViewState = state; },

  getPeriodDisplayMode() { return this.periodDisplayMode; },
  setPeriodDisplayMode(mode) { this.periodDisplayMode = mode; },

  getYearlyDisplayMode() { return this.yearlyDisplayMode; },
  setYearlyDisplayMode(mode) { this.yearlyDisplayMode = mode; },

  getMonthlyDisplayMode() { return this.monthlyDisplayMode; },
  setMonthlyDisplayMode(mode) { this.monthlyDisplayMode = mode; },

  getDailyDisplayMode() { return this.dailyDisplayMode; },
  setDailyDisplayMode(mode) { this.dailyDisplayMode = mode; },

  getChartViewMode() { return this.chartViewMode; },
  setChartViewMode(mode) { this.chartViewMode = mode; },

  getShowIndividualHoldings() { return this.showIndividualHoldings; },
  setShowIndividualHoldings(value) { this.showIndividualHoldings = value; },

  getStatsDisplayMode() { return this.statsDisplayMode; },
  setStatsDisplayMode(mode) { this.statsDisplayMode = mode; },

  getPerfStatsMode() { return this.perfStatsMode; },
  setPerfStatsMode(mode) { this.perfStatsMode = mode; },

  getBacktestStatsMode() { return this.backtestStatsMode; },
  setBacktestStatsMode(mode) { this.backtestStatsMode = mode; },

  getLastMyPerfData() { return this.lastMyPerfData; },
  setLastMyPerfData(data) { this.lastMyPerfData = data; },

  getPerfLastCheckTime() { return this.perfLastCheckTime; },
  setPerfLastCheckTime(time) { this.perfLastCheckTime = time; }
};

// 전역 호환성
window.stateManager = stateManager;
