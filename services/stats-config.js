// services/stats-config.js
// 통계 및 성과 뷰 설정 관리

const statsConfig = {
  // 통계 디스플레이 모드 키 조회
  getStatsDisplayModeKey() {
    return `vtotal3_stats_mode_${myUserId}`;
  },

  // 성과 통계 모드 키 조회
  getPerfStatsModeKey() {
    return `vtotal3_perf_stats_mode_${myUserId}`;
  },

  // 통계 디스플레이 모드 로드
  loadStatsDisplayMode() {
    const key = this.getStatsDisplayModeKey();
    const saved = localStorage.getItem(key);
    if (saved && (saved === "chart" || saved === "table")) {
      return saved;
    }
    return "chart"; // 기본값
  },

  // 성과 통계 모드 로드
  loadPerfStatsMode() {
    const key = this.getPerfStatsModeKey();
    const saved = localStorage.getItem(key);
    if (saved && (saved === "performance" || saved === "analysis")) {
      return saved;
    }
    return "performance"; // 기본값
  },

  // 통계 디스플레이 모드 저장
  saveStatsDisplayMode(mode) {
    if (mode !== "chart" && mode !== "table") return;
    const key = this.getStatsDisplayModeKey();
    localStorage.setItem(key, mode);
    if (typeof window !== 'undefined') {
      window.statsDisplayMode = mode;
    }
  },

  // 성과 통계 모드 저장
  savePerfStatsMode(mode) {
    if (mode !== "performance" && mode !== "analysis") return;
    const key = this.getPerfStatsModeKey();
    localStorage.setItem(key, mode);
    if (typeof window !== 'undefined') {
      window.perfStatsMode = mode;
    }
  },

  // 통계 모드 토글
  toggleStatsDisplayMode() {
    const current = this.loadStatsDisplayMode();
    const newMode = current === "chart" ? "table" : "chart";
    this.saveStatsDisplayMode(newMode);
    return newMode;
  },

  // 성과 통계 모드 토글
  togglePerfStatsMode() {
    const current = this.loadPerfStatsMode();
    const newMode = current === "performance" ? "analysis" : "performance";
    this.savePerfStatsMode(newMode);
    return newMode;
  }
};

// 전역 호환성
window.statsConfig = statsConfig;

// 래퍼 함수들 (기존 코드와의 호환성)
window.getStatsDisplayModeKey = () => statsConfig.getStatsDisplayModeKey();
window.getPerfStatsModeKey = () => statsConfig.getPerfStatsModeKey();
window.loadStatsDisplayMode = () => statsConfig.loadStatsDisplayMode();
window.loadPerfStatsMode = () => statsConfig.loadPerfStatsMode();
window.saveStatsDisplayMode = (mode) => statsConfig.saveStatsDisplayMode(mode);
window.savePerfStatsMode = (mode) => statsConfig.savePerfStatsMode(mode);
window.toggleStatsDisplayMode = () => statsConfig.toggleStatsDisplayMode();
window.togglePerfStatsMode = () => statsConfig.togglePerfStatsMode();
