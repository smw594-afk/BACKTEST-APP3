// price_loader.js
// Cloudflare Worker3에서 주가 데이터를 가져옵니다.
// normalizeDateKey는 utils/date-helpers.js에서 import됨

const WORKER3_URL = "https://autumn-limit-001e-3.smw594.workers.dev";
const PRICE_HISTORY_MIN_DATE = "2010-01-01";

const priceLoader = {
  priceDataCache: {},
  _loadAllPricesPromise: null,

  // 1. Worker3에서 주가 데이터 조회
  async fetchSheetValues(neededStartDate = false) {
    try {
      // ⚡ index.html에서 HTML 파싱 직후 미리 쏴둔 주가 요청을 재사용
      // (단, 수동 백테스트 필요 기간 조회가 아닐 때만 프리페치 활용)
      let data = null;
      if (!neededStartDate) {
        if (window.__ultraEarlyFetch && window.__ultraEarlyFetch.pricePromise) {
          data = await window.__ultraEarlyFetch.pricePromise;
          window.__ultraEarlyFetch.pricePromise = null;
        } else if (window.__earlyFetch && window.__earlyFetch.pricePromise) {
          data = await window.__earlyFetch.pricePromise;
          window.__earlyFetch.pricePromise = null; // 1회 소비
        }
      }

      if (!data) {
        console.log(neededStartDate ? `📥 [수동 백테스트] ${neededStartDate.toISOString().split('T')[0]}부터 주가 조회...` : "📥 Worker3에서 주가 데이터 조회...");

        // 시작/종료 timestamp
        // - 일반 프리페치: 최근 450일
        // - 필요 기간: neededStartDate부터 현재까지
        const now = new Date();
        const p1 = neededStartDate
          ? Math.floor(neededStartDate.getTime() / 1000)
          : Math.floor((now.getTime() - 450 * 24 * 60 * 60 * 1000) / 1000);
        const p2 = Math.floor(now.getTime() / 1000);
        const symbols = "SOXL,SOXX,TQQQ,QQQ,KRW=X";

        const url = `${WORKER3_URL}/api/prices?symbols=${encodeURIComponent(symbols)}&p1=${p1}&p2=${p2}`;
        console.log("🔗 요청 URL:", url);

        const fetchWithTimeout = (u, opts = {}, timeoutMs = 12000) => {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), timeoutMs);
          return fetch(u, { ...opts, signal: controller.signal })
            .finally(() => clearTimeout(timer));
        };

        // 모바일 네트워크 연결 웜업 타임 대응: 최대 3회 자동 재시도
        let lastErr = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const res = await fetchWithTimeout(url, {}, 12000);
            if (!res.ok) {
              throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            }
            data = await res.json();
            if (data && data.result) break;
            throw new Error("주가 데이터 응답이 비어있습니다");
          } catch (fetchErr) {
            lastErr = fetchErr;
            console.warn(`⚠️ [주가 로드] 시도 ${attempt}/3 실패: ${fetchErr.message}`);
            if (attempt < 3) {
              await new Promise(r => setTimeout(r, attempt * 1000));
            }
          }
        }
        if (!data || !data.result) {
          throw lastErr || new Error("주가 데이터 응답이 비어있습니다");
        }
      }

      if (!data || !data.result) {
        throw new Error("주가 데이터 응답이 비어있습니다");
      }

      console.log("✅ Worker3 응답:", data);
      if (data.result) {
        Object.keys(data.result).forEach(symbol => {
          const chart = data.result[symbol]?.chart?.result?.[0];
          if (chart?.timestamp) {
            console.log(`   ${symbol}: ${chart.timestamp.length}개 타임스탬프`);
            console.log(`     첫 번째: ${new Date(chart.timestamp[0] * 1000).toISOString()}`);
            console.log(`     마지막: ${new Date(chart.timestamp[chart.timestamp.length - 1] * 1000).toISOString()}`);
          }
        });
      }

      // Worker3 응답 형식을 2차원 배열로 변환
      return this.convertWorker3DataToArray(data);
    } catch (err) {
      console.error("❌ 주가 조회 실패:", err.message);
      throw new Error("Worker3 호출 실패: " + err.message);
    }
  },

  // Worker3 응답을 2차원 배열로 변환
  convertWorker3DataToArray(data) {
    if (!data || !data.result) return [];

    const result = data.result;
    const rows = [];

    // 에러 발생한 티커가 있다면 콘솔에 경고 출력
    Object.keys(result).forEach(symbol => {
      if (result[symbol]?.error) {
        console.warn(`⚠️ [주가 로드] ${symbol} 데이터 로드 실패:`, result[symbol].error);
      }
    });

    // 첫 번째로 유효한 차트 데이터를 가진 티커 찾기
    const firstSymbol = Object.keys(result).find(symbol => result[symbol]?.chart?.result?.[0]?.timestamp);
    if (!firstSymbol) {
      console.error("❌ [주가 로드] 유효한 차트 데이터를 가진 티커가 하나도 없습니다.");
      return [];
    }

    const chart = result[firstSymbol].chart.result[0];
    const timestamp = chart.timestamp;
    if (!timestamp || timestamp.length === 0) return [];

    // ⚠️ 티커마다 결측일이 달라 배열 길이/인덱스가 서로 다를 수 있으므로,
    //    인덱스가 아니라 timestamp(날짜) 기준으로 조인한다.
    //    (인덱스로 조회하면 결측일 이후 모든 가격이 하루씩 밀리는 버그 발생)
    const symbolsToAdd = ["SOXL", "SOXX", "TQQQ", "QQQ", "KRW=X"];
    const symbolMaps = {};
    symbolsToAdd.forEach(symbol => {
      const c = result[symbol]?.chart?.result?.[0];
      if (c && c.timestamp && c.indicators?.quote?.[0]) {
        const q = c.indicators.quote[0];
        const m = new Map();
        c.timestamp.forEach((t, i) => m.set(t, { open: q.open[i], close: q.close[i] }));
        symbolMaps[symbol] = m;
      }
    });

    // 각 타임스탬프 행 생성 (row[0] = ts, row[1] = dateStr)
    // PRICE_CONFIG 구조: SOXL 종가=index 3, SOXX=5, TQQQ=7, QQQ=9, KRW=X=11
    timestamp.forEach(ts => {
      const row = [ts, new Date(ts * 1000).toISOString().split('T')[0]];
      symbolsToAdd.forEach(symbol => {
        const v = symbolMaps[symbol] ? symbolMaps[symbol].get(ts) : null;
        row.push((v && v.open) || 0); // 시가
        row.push((v && v.close) || 0); // 종가 (결측=0 → parseSheetData에서 직전값 보정)
      });
      rows.push(row);
    });

    // 오름차순 유지 (엔진과 통일: 최신이 마지막)
    return rows;
  },

  // 2. 날짜 포맷팅 (utils/date-helpers.js에서 import함수 사용)

  // 3. 주가 데이터 파싱
  parseSheetData(values, ticker) {
    const PRICE_CONFIG = {
      SOXL: { dateCol: 1, closeCol: 3 },
      SOXX: { dateCol: 1, closeCol: 5 },
      TQQQ: { dateCol: 1, closeCol: 7 },
      QQQ: { dateCol: 1, closeCol: 9 },
      "KRW=X": { dateCol: 1, closeCol: 11 }
    };

    const config = PRICE_CONFIG[ticker];
    if (!config) return { ticker, dates: [], open: [], close: [] };

    const dates = [];
    const open = [];
    const close = [];

    let lastValidClose = ticker === "KRW=X" ? 1350.0 : 0.0;

    // ⚠️ i=3 시작 + 결측가 직전값 보정: 앱3(3.391)와 동일해야 백테스트 결과가 일치한다.
    //    (시작 행이 다르면 WRSI 주간 집계 시작점이 밀려 모드 판정이 어긋남)
    for (let i = 3; i < values.length; i++) {
      const row = values[i];
      if (!row || row.length <= 1) continue;

      const rawDate = String(row[config.dateCol] || "").trim();
      const dateKey = window.dateHelpers ? window.dateHelpers.normalizeDateKey(rawDate) : this.normalizeDateKey(rawDate);
      if (!dateKey) continue;

      // 주말 제외
      const dateObj = new Date(`${dateKey}T12:00:00Z`);
      const dayOfWeek = dateObj.getUTCDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      let closeVal = parseFloat(String(row[config.closeCol] || "").replace(/[^0-9.-]/g, ""));

      if (isNaN(closeVal) || closeVal <= 0) {
        closeVal = lastValidClose;
      } else {
        lastValidClose = closeVal;
      }

      if (isNaN(closeVal) || closeVal <= 0) continue;

      dates.push(dateObj);
      open.push(Math.round(closeVal * 100) / 100);
      close.push(Math.round(closeVal * 100) / 100);
    }

    return { ticker, dates, open, close };
  },

  // 4. 모든 티커 로드
  // ⚠️ 앱 초기화 중 여러 곳(checkAndSyncWithServer, handleInstantOrder 등)에서
  //    이 함수를 각각 호출한다. 프리페치 Promise는 첫 번째 호출자가 소비하면
  //    곧바로 null 처리되므로, 그 이후 호출자들은 이 함수 레벨 캐시가 없으면
  //    매번 /api/prices를 새로 쏘게 된다(F5 시 중복 요청의 원인).
  //    같은 페이지 세션 안에서는 한 번만 실제로 fetch하고 나머지는 그 결과를 공유한다.
  async loadAllSheetPrices(neededStartDate = false) {
    // neededStartDate가 Date 객체면 그 날짜부터 로드, false면 450일만 로드
    if (neededStartDate instanceof Date) {
      this._loadAllPricesPromise = this._loadAllSheetPricesInner(neededStartDate);
      try {
        return await this._loadAllPricesPromise;
      } catch (err) {
        // ⭐️ [버그 수정] 실패한 Promise가 캐시에 남으면, 이후의 모든 일반 주가 요청
        // (매수 주문 계산, 주가 정보 화면 등)까지 같은 실패를 그대로 재사용해 연쇄적으로
        // 망가진다. 실패 시 캐시를 반드시 해제해 다음 호출에서 재시도 가능하게 한다.
        this._loadAllPricesPromise = null;
        throw err;
      }
    }

    if (this._loadAllPricesPromise) {
      return this._loadAllPricesPromise;
    }
    this._loadAllPricesPromise = this._loadAllSheetPricesInner(false);
    try {
      return await this._loadAllPricesPromise;
    } catch (err) {
      this._loadAllPricesPromise = null; // 실패 시엔 다음 호출에서 재시도 가능하도록 캐시 해제
      throw err;
    }
  },

  async _loadAllSheetPricesInner(neededStartDate = false) {
    try {
      console.log(neededStartDate ? "⏳ [수동 백테스트] 필요 기간 주가 로드 시작..." : "⏳ 주가 데이터 로드 시작...");
      const values = await this.fetchSheetValues(neededStartDate);

      if (!values || values.length === 0) {
        throw new Error("주가 데이터가 비어있습니다");
      }

      console.log("🔄 데이터 파싱 중...");
      const tickers = ["SOXL", "SOXX", "TQQQ", "QQQ", "KRW=X"];

      tickers.forEach(ticker => {
        this.priceDataCache[ticker] = this.parseSheetData(values, ticker);
        const parsed = this.priceDataCache[ticker];
        console.log(`✅ ${ticker}: ${parsed.dates.length}개 행`);
        if (parsed.dates.length > 0) {
          console.log(`   첫 번째: ${parsed.dates[0]}, 종가: ${parsed.close[0]}`);
          console.log(`   마지막: ${parsed.dates[parsed.dates.length-1]}, 종가: ${parsed.close[parsed.dates.length-1]}`);
        }
      });

      // 환율 업데이트
      const krwData = this.priceDataCache["KRW=X"];
      if (krwData && krwData.close.length > 0) {
        const latestFXRate = krwData.close[krwData.close.length - 1];
        currentFXRate = latestFXRate;
        if (window.currencyService && typeof window.currencyService.setCurrentFXRate === 'function') {
          window.currencyService.setCurrentFXRate(latestFXRate);
        } else {
          localStorage.setItem("vtotal3_last_fx_rate", latestFXRate.toString());
        }
        if (typeof window !== 'undefined') {
          window.currentFXRate = latestFXRate;
        }
        // 주가 로딩 중에는 화면을 강제로 다시 그리지 않는다.
        // 초기화 중 원화 설정/스냅샷/엔진 결과가 아직 준비되지 않은 상태에서
        // 중간 렌더링이 발생하면 최초 화면과 통화 전환 화면의 환율이 달라질 수 있다.
      }

      console.log("🎉 주가 데이터 로드 완료!");
      return this.priceDataCache;
    } catch (err) {
      console.error("❌ loadAllSheetPrices 실패:", err.message);
      throw err;
    }
  },

  // 5. 특정 티커 조회
  getPriceSeries(ticker) {
    const series = this.priceDataCache[ticker.toUpperCase()];
    return series || { ticker, dates: [], open: [], close: [] };
  }
};

window.priceLoader = priceLoader;
