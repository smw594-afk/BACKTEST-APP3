// ui/layout-detector.js
// 반응형 레이아웃 감지 및 UI 업데이트

const layoutDetector = {
  // 레이아웃 감지 및 조정
  detectLayout() {
    const g = document.getElementById('mainGrid');
    // ⭐️ [커버 모드 완전 제거] 더 이상 특정 해상도에서 레이아웃을 강제로 압축하지 않습니다.
    if (document.documentElement.classList.contains('is-cover')) {
      document.documentElement.classList.remove('is-cover');
      this.updateMobileButtonText(false);
    }
    if (g) g.classList.remove('force-3-col', 'force-2-col');
  },

  // 모바일 버튼 텍스트 업데이트
  updateMobileButtonText(isMobile) {
    const btnInstant = document.getElementById('btnInstant');
    const btnRun = document.getElementById('runBtn');
    const btnSettings = document.getElementById('btnSettings');
    const btnPerf = document.getElementById('btnPerfShow');
    const btnStats = document.getElementById('btnStatsShow');

    if (btnInstant) btnInstant.innerHTML = '<span id="icoInstant">🏠</span>';
    if (btnRun) btnRun.innerHTML = isMobile ? '<span id="icoRun">🚀</span>' : '<span id="icoRun">🚀</span><span class="btn-text">백테스트</span>';
    if (btnSettings) btnSettings.innerHTML = '⚙️';
    if (btnPerf) btnPerf.innerHTML = '<span id="icoPerfShow">📊</span>';
    if (btnStats) btnStats.innerHTML = '<span id="icoStatsShow">📄</span>';
  },

  // 초기화
  init() {
    this.detectLayout();

    // resize 이벤트 리스너 등록
    window.addEventListener('resize', () => {
      this.detectLayout();
      if (typeof window.safeChartResize === 'function') {
        window.safeChartResize(window.myChart);
        window.safeChartResize(window.myPeriodChart);
      } else {
        try { if (window.myChart) window.myChart.resize(); } catch(e) {}
      }
    });

    // load 이벤트 리스너 등록
    window.addEventListener('load', () => {
      this.detectLayout();
    });
  }
};

// 전역 호환성
window.layoutDetector = layoutDetector;

// 전역 함수 래퍼 (기존 코드와의 호환성)
window.detectLayout = () => layoutDetector.detectLayout();
window.updateMobileButtonText = (isMobile) => layoutDetector.updateMobileButtonText(isMobile);

// 문서 로드 시 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    layoutDetector.init();
  });
} else {
  layoutDetector.init();
}
