// services/prefetch-service.js
// 초기 프리페치 서비스 (HTML 파싱 시점에 API 요청 시작)

const prefetchService = {
  // 캐시된 Promise들
  initPromise: null,
  pricePromise: null,

  // 프리페치 시작
  startEarlyPrefetch() {
    try {
      // ⚡⚡ index.html head 최상단 인라인 스크립트가 이미 요청을 쏴놨다면
      // 그 Promise를 그대로 재사용한다 (중복 요청 방지, 그리고 그쪽이 훨씬 먼저 시작됨)
      if (window.__ultraEarlyFetch) {
        this.initPromise = window.__ultraEarlyFetch.initPromise;
        this.pricePromise = window.__ultraEarlyFetch.pricePromise;
        console.log('[사전로드] ⚡ 초초경량 프리페치 결과 재사용 (중복 요청 없음)');
        return;
      }

      const isAuth = localStorage.getItem('vtotal3_auth');
      const savedId = localStorage.getItem('vtotal3_id');
      if (isAuth !== 'true' || !savedId) return;

      // (아래는 위 인라인 스크립트가 어떤 이유로든 실행되지 않았을 때의 안전망 — 평소엔 안 탄다)
      // 1) GET_ALL_INIT — 읽기는 Worker3(GCP Sheets API 통로)를 우선 시도하고,
      //    실패하면 기존 GAS로 폴백한다. 쓰기(로그인/입출금/자동저장)는 그대로 GAS를 쓴다.
      const WORKER3_URL_EARLY = "https://autumn-limit-001e-3.smw594.workers.dev";
      const BACKTEST_LOG_SPREADSHEET_ID_EARLY = "1SrDC8Gkm8ztodtvt_oAOSEQMHE2U-CphetIMz7qWqQY";
      const GAS_URL_EARLY = "https://script.google.com/macros/s/AKfycbxUSDds-kN5QQL9cvuNeSJuw6YAImIp-N8XK699Ov2cmIP1tfizXUuT87ECVgvVlU8V/exec";

      let gasUrl = `${GAS_URL_EARLY}?action=GET_ALL_INIT&id=${encodeURIComponent(savedId)}`;
      for (let i = 1; i <= 6; i++) {
        let strat = "";
        try {
          const raw = localStorage.getItem(`vtotal3_conf${i}_${savedId}`);
          if (raw) {
            const parsed = JSON.parse(raw);
            strat = (parsed && parsed.basics && parsed.basics.strategy) || "";
          }
        } catch (e) {}
        gasUrl += `&strat${i}=${encodeURIComponent(strat)}`;
      }
      const fetchWithTimeout = (url, options = {}, timeoutMs = 8000) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        return fetch(url, { ...options, signal: controller.signal })
          .finally(() => clearTimeout(timer));
      };

      const fetchFromGas = () => fetchWithTimeout(gasUrl)
        .then(r => r.json())
        .catch(e => { console.warn('[사전로드] GET_ALL_INIT 프리페치 실패(GAS):', e); return null; });

    if (!savedId || !savedId.trim()) { return; }
      const workerInitUrl = `${WORKER3_URL_EARLY}/api/backtest-log-init?id=${encodeURIComponent(savedId)}&spreadsheetId=${encodeURIComponent(BACKTEST_LOG_SPREADSHEET_ID_EARLY)}`;
      this.initPromise = fetchWithTimeout(workerInitUrl)
        .then(r => { if (!r.ok) throw new Error('worker http ' + r.status); return r.json(); })
        .then(data => {
          // hasSheet:false는 워커가 시트/탭을 못 읽었을 때도 정상 200으로 오므로(GAS와 동일 계약),
          // 별도로 걸러서 GAS로 폴백시켜야 "빈 응답을 성공으로 오인"하는 걸 막을 수 있다.
          if (!data || data.error || data.hasSheet === false) {
            throw new Error((data && (data.error || (data.perf && data.perf.message))) || 'worker init empty/hasSheet=false');
          }
          console.log('[사전로드] ✅ Worker(GCP) GET_ALL_INIT 응답:', data);
          return data;
        })
        .catch(e => {
          console.warn('[사전로드] Worker(GCP) 읽기 실패, GAS로 폴백:', e);
          return fetchFromGas();
        });

      // 2) Worker3 주가 데이터
      const now = Date.now();
      const p1 = Math.floor((now - 450 * 24 * 60 * 60 * 1000) / 1000);
      const p2 = Math.floor(now / 1000);
      const symbols = "SOXL,SOXX,TQQQ,QQQ,KRW=X";
      const priceUrl = `${WORKER3_URL_EARLY}/api/prices?symbols=${encodeURIComponent(symbols)}&p1=${p1}&p2=${p2}`;
      this.pricePromise = fetchWithTimeout(priceUrl)
        .then(r => r.json())
        .catch(e => { console.warn('[사전로드] 주가 프리페치 실패:', e); return null; });

      console.log('[사전로드] ⚡ GET_ALL_INIT + 주가 프리페치 시작 (HTML 파싱 최초 시점)');
    } catch (e) {
      console.warn('[사전로드] 프리페치 설정 실패:', e);
    }
  },

  // 프리페치된 데이터 가져오기
  getInitData() {
    return this.initPromise;
  },

  getPriceData() {
    return this.pricePromise;
  },

  // 프리페치 결과를 Promise에서 가져오기 (한 번만)
  async consumeInitData() {
    const data = await this.initPromise;
    this.initPromise = null;
    return data;
  },

  async consumePriceData() {
    const data = await this.pricePromise;
    this.pricePromise = null;
    return data;
  }
};

// 글로벌 호환성
window.__earlyFetch = {
  get initPromise() { return prefetchService.getInitData(); },
  set initPromise(v) { prefetchService.initPromise = v; },
  get pricePromise() { return prefetchService.getPriceData(); },
  set pricePromise(v) { prefetchService.pricePromise = v; }
};

window.prefetchService = prefetchService;
