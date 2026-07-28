// services/currency-service.js
// 통화 및 환율 관리 서비스

const currencyService = {
  // 전역 상태
  isCurrencyKRW: false,
  currentFXRate: 1450,

  // Getter
  getIsCurrencyKRW() {
    return this.isCurrencyKRW;
  },

  getCurrentFXRate() {
    return this.currentFXRate;
  },

  // Setter
  setIsCurrencyKRW(value) {
    this.isCurrencyKRW = value;
    try {
      localStorage.setItem('vtotal3_currency_mode', value ? 'KRW' : 'USD');
    } catch (e) {
      console.error('Failed to save currency mode:', e);
    }
  },

  setCurrentFXRate(rate) {
    this.currentFXRate = rate;
    try {
      localStorage.setItem('vtotal3_last_fx_rate', rate.toString());
    } catch (e) {
      console.error('Failed to save FX rate:', e);
    }
    if (typeof window !== 'undefined') {
      window.currentFXRate = rate;
    }
  },

  // 환율 업데이트
  async updateCurrentFXRate(callback = null) {
    try {
      const krwSeries = typeof window !== 'undefined' && window.priceLoader?.getPriceSeries
        ? window.priceLoader.getPriceSeries('KRW=X')
        : null;
      const loadedRate = krwSeries?.close?.length
        ? Number(krwSeries.close[krwSeries.close.length - 1])
        : NaN;
      if (Number.isFinite(loadedRate) && loadedRate > 0) {
        this.setCurrentFXRate(loadedRate);
        if (callback) callback(this.currentFXRate);
        return this.currentFXRate;
      }

      const savedRate = parseFloat(localStorage.getItem('vtotal3_last_fx_rate'));
      if (savedRate && !isNaN(savedRate) && savedRate > 0) {
        this.currentFXRate = savedRate;
        if (typeof window !== 'undefined') {
          window.currentFXRate = savedRate;
        }
        if (callback) callback(this.currentFXRate);
        return this.currentFXRate;
      }
    } catch (e) {
      console.error('Failed to update FX rate:', e);
    }
    return this.currentFXRate;
  },

  // 저장된 설정 로드
  loadSettings() {
    try {
      const savedMode = localStorage.getItem('vtotal3_currency_mode');
      if (savedMode === 'KRW') {
        this.isCurrencyKRW = true;
      }
      const savedRate = parseFloat(localStorage.getItem('vtotal3_last_fx_rate'));
      if (savedRate && !isNaN(savedRate) && savedRate > 0) {
        this.currentFXRate = savedRate;
        if (typeof window !== 'undefined') {
          window.currentFXRate = savedRate;
        }
      }
    } catch (e) {
      console.error('Failed to load currency settings:', e);
    }
  }
};

// 첫 화면을 그리기 전에 이전에 저장한 최신 환율/통화 설정을 즉시 복원한다.
// 이 호출이 없으면 새로고침 때마다 기본값 1450으로 먼저 렌더링된다.
currencyService.loadSettings();

// 전역 호환성: script.js에서 직접 접근 가능하게 함
window.currencyService = currencyService;
// ⚠️ 이전의 Proxy 방식은 window.isCurrencyKRW 자체를 읽고 쓸 때 trap이 걸리지 않아
//    (Proxy 객체라 항상 truthy로 평가됨) 의도대로 동작하지 않았다. 단순 boolean으로 노출하고,
//    이후 값 갱신은 enterAppDirectly/toggleCurrencyMode의 전역 대입이 담당한다.
window.isCurrencyKRW = currencyService.isCurrencyKRW;
window.currentFXRate = currencyService.currentFXRate;
