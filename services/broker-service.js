/**
 * App 3 Broker Service Manager (Kiwoom + LS Securities)
 * Slots 1~3 = Kiwoom, Slots 4~6 = LS Securities
 * Supports Local Storage Key Pre-filling & VM Proxy Sync
 */

// 로컬 프록시는 "명시적으로 켤 때만" 쓴다.
//   window.LOCAL_PROXY_BASE = "http://localhost:8788"  (index.html 등에서 지정)
// 기본은 localhost에서도 Worker3 → VM 경로다. 브로커 키는 VM에만 있어야 하므로
// (골든 룰 5) 로컬 프록시를 기본으로 두면 개발용으로 실계좌 키를 로컬에 복사하게 된다.
const LOCAL_PROXY_BASE = window.LOCAL_PROXY_BASE || "";
const WORKER3_RELAY_BASE = window.WORKER3_URL || "https://autumn-limit-001e-3.smw594.workers.dev";

window.BrokerService = {

  getUserId() {
    return localStorage.getItem("vtotal3_id") || localStorage.getItem("user_id") || "smw594";
  },


  setKiwoomAutoOrder: async function(enabled) {
    return this.setAutoOrder("kiwoom", enabled);
  },
  setLsAutoOrder: async function(enabled) {
    return this.setAutoOrder("ls", enabled);
  },

  // 설정 화면의 슬롯 탭을 활성 브로커 것만 보이게 한다(키움=1~6 / LS=7~12).
  // ⚠️ 표시만 바꾸면 안 된다 — 지금 열려 있는 탭(activeSettingsTab)이 반대 브로커 슬롯이면
  //    사용자에게 보이지 않는 슬롯에 설정이 저장된다. 그래서 현재 브로커의 첫 슬롯으로 옮긴다.
  applySettingsTabVisibility() {
    const broker = this.activeBroker || "kiwoom";
    const groups = { kiwoom: "settingsTabGroupKiwoom", ls: "settingsTabGroupLs" };
    Object.keys(groups).forEach((b) => {
      const el = document.getElementById(groups[b]);
      if (el) el.style.display = (b === broker) ? "" : "none";
    });

    const mine = this.slotsForBroker(broker);
    if (!mine.length) return;

    // ⚠️ 반드시 switchSettingsTab()을 통해 옮긴다. activeSettingsTab은 script.js의 지역
    //    변수이고 저장 대상 슬롯을 결정하므로, window에만 값을 써넣으면 화면에 보이는 탭과
    //    실제 저장되는 슬롯이 갈라진다.
    //    부팅 순서상 이 함수가 script.js보다 먼저 돌 수 있는데, 그때는 아직 옮길 수
    //    없으므로 표시만 바꾸고 넘어간다 — 설정 화면을 열 때 toggleSettings()가 다시 부른다.
    if (typeof window.switchSettingsTab !== "function") return;

    const current = Number(window.activeSettingsTab || 0);
    if (!mine.includes(current)) window.switchSettingsTab(mine[0]);
  },

  saveCurrentViewBeforeSwitch() {
    try {
      const settingsScreen = document.getElementById('settingsScreen');
      const isSettingsOpen = settingsScreen && (
        settingsScreen.style.display === 'flex' ||
        (typeof window.getComputedStyle === 'function' && window.getComputedStyle(settingsScreen).display === 'flex')
      );
      if (isSettingsOpen) {
        localStorage.setItem('vtotal3_last_view_after_broker_switch', 'settings');
        return;
      }

      const priceInfoCard = document.getElementById('panelPriceInfo');
      const isPriceActive = document.getElementById('btnPriceInfo')?.classList.contains('active') || (
        priceInfoCard && priceInfoCard.style.display !== 'none' && priceInfoCard.style.display !== '' &&
        (typeof window.getComputedStyle === 'function' && window.getComputedStyle(priceInfoCard).display !== 'none')
      );
      if (isPriceActive) {
        localStorage.setItem('vtotal3_last_view_after_broker_switch', 'price');
        return;
      }

      const perfAnalysisCard = document.getElementById('panelAnalysisView');
      const isAnalysisActive = document.getElementById('btnAnalysis')?.classList.contains('active') || (
        perfAnalysisCard && !perfAnalysisCard.classList.contains('hidden') && perfAnalysisCard.style.display !== 'none' && perfAnalysisCard.style.display !== '' &&
        (typeof window.getComputedStyle === 'function' && window.getComputedStyle(perfAnalysisCard).display !== 'none')
      );
      if (isAnalysisActive) {
        localStorage.setItem('vtotal3_last_view_after_broker_switch', 'analysis');
        return;
      }

      const isPerfActive = document.getElementById('btnPerfShow')?.classList.contains('active');
      if (isPerfActive) {
        localStorage.setItem('vtotal3_last_view_after_broker_switch', 'perf');
        return;
      }

      const isStatsActive = document.getElementById('btnStatsShow')?.classList.contains('active') || window.isStatsMode;
      if (isStatsActive) {
        localStorage.setItem('vtotal3_last_view_after_broker_switch', 'stats');
        return;
      }

      // 주문표 화면 내에서 '보유현황' 보기 상태인지 확인
      if (!window.isStatsMode && window.isOrderView === false) {
        localStorage.setItem('vtotal3_last_view_after_broker_switch', 'holdings');
        return;
      }

      localStorage.setItem('vtotal3_last_view_after_broker_switch', 'order');
    } catch (e) {
      console.warn("saveCurrentViewBeforeSwitch error:", e);
    }
  },

  switchBrokerMode(broker, isInitial = false) {
    const prevBroker = this.activeBroker;
    this.activeBroker = broker;
    localStorage.setItem("vtotal3_active_broker", broker);

    // 설정 화면 슬롯 탭도 이 브로커 것만 보이도록 갱신
    try { this.applySettingsTabVisibility(); } catch (e) { console.warn("[BrokerService] applySettingsTabVisibility error:", e); }

    // Update Single Nav Bar Button Text & Style
    try {
      const btn = document.getElementById("btnSingleBrokerNav");
      if (btn) {
        if (broker === "kiwoom") {
          btn.innerHTML = '🟢 키움 <span style="font-size:9px;">▼</span>';
          btn.style.background = "linear-gradient(135deg, #10b981, #059669)";
          btn.style.color = "#000";
          btn.style.boxShadow = "0 2px 6px rgba(16,185,129,0.4)";
        } else {
          btn.innerHTML = '🟣 LS <span style="font-size:9px;">▼</span>';
          btn.style.background = "linear-gradient(135deg, #a855f7, #7e22ce)";
          btn.style.color = "#fff";
          btn.style.boxShadow = "0 2px 6px rgba(168,85,247,0.4)";
        }
      }
    } catch (e) { console.warn("[BrokerService] btn update error:", e); }

    // ⭐️ 사용자가 증권사를 변경한 경우, 보고 있던 마지막 화면을 저장하고 앱을 깔끔하게 새로고침
    if (!isInitial && prevBroker && prevBroker !== broker) {
      this.saveCurrentViewBeforeSwitch(); try { const u = this.getUserId(); localStorage.removeItem("vtotal3_combined_order_view_" + u + "_" + prevBroker); localStorage.removeItem("vtotal3_combined_order_view_" + u + "_" + broker); } catch(e){};
      window.location.reload();
      return;
    }

    // 1. Reconcile 캐시 무효화
    try {
      if (window.BrokerReconcile && typeof window.BrokerReconcile.invalidate === "function") {
        window.BrokerReconcile.invalidate();
      if (window.orderStatusCache) {
        window.orderStatusCache.unfilledOrders = [];
        window.orderStatusCache.filledOrders = [];
        window.orderStatusCache.lastUpdated = 0;
      }
      }
    } catch (e) { console.warn("[BrokerService] invalidate error:", e); }

    // 2. 초기 렌더링 동기화
    try {
      if (window.UI && window.UI.stats && typeof window.UI.stats.refreshStatsTable === "function") {
        window.UI.stats.refreshStatsTable();
      }
      if (window.UI && window.UI.holdings && typeof window.UI.holdings.renderCombinedHoldings === "function") {
        window.UI.holdings.renderCombinedHoldings();
      }
      if (typeof window.refreshOrderStatusCache === "function") {
        window.refreshOrderStatusCache();
      }
      if (window.UI && window.UI.tradeHistory && typeof window.UI.tradeHistory.syncHistoryViewModeToBroker === "function") {
        window.UI.tradeHistory.syncHistoryViewModeToBroker();
      }
      if (typeof window.updateSlotsVisibility === "function") {
        window.updateSlotsVisibility();
      }
    } catch (e) { console.warn("[BrokerService] render error:", e); }
  },
  openBrokerSelectPopup() {
    const old = document.getElementById("broker-select-popup-modal");
    if (old) old.remove();

    const active = this.activeBroker || "kiwoom";

    const modal = document.createElement("div");
    modal.id = "broker-select-popup-modal";
    modal.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.8); display:flex; align-items:center; justify-content:center; z-index:99999; backdrop-filter:blur(4px);";
    modal.onclick = function(e) { if (e.target === modal) modal.remove(); };

    modal.innerHTML = `
      <div style="max-width:340px; width:88%; padding:20px; background:#1e293b; color:#f8fafc; border-radius:14px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.7); border:1px solid #334155;" onclick="event.stopPropagation()">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; border-bottom:1px solid #334155; padding-bottom:10px;">
          <h3 style="margin:0; font-size:16px; font-weight:700; color:#f8fafc; display:flex; align-items:center; gap:6px;">
            🏛️ 연동 증권사 선택
          </h3>
          <span onclick="document.getElementById('broker-select-popup-modal').remove()" style="cursor:pointer; font-size:22px; color:#94a3b8; line-height:1;">&times;</span>
        </div>

        <p style="font-size:12px; color:#94a3b8; margin-bottom:14px;">사용하실 증권사 모드를 선택해 주세요.</p>

        <div style="display:flex; flex-direction:column; gap:10px;">
          <!-- 키움증권 선택 버튼 -->
          <button onclick="document.getElementById('broker-select-popup-modal')?.remove(); window.BrokerService.switchBrokerMode('kiwoom');" 
            style="padding:12px; border-radius:10px; background:${active === 'kiwoom' ? 'linear-gradient(135deg, #10b981, #059669)' : '#0f172a'}; color:${active === 'kiwoom' ? '#000' : '#fff'}; border:2px solid ${active === 'kiwoom' ? '#10b981' : '#334155'}; font-size:14px; font-weight:700; cursor:pointer; text-align:left; display:flex; justify-content:space-between; align-items:center;">
            <span>🟢 키움증권 모드 (슬롯 1~6)</span>
            ${active === 'kiwoom' ? '<span style="font-size:11px; background:#000; color:#10b981; padding:2px 6px; border-radius:4px; font-weight:800;">선택됨 ✓</span>' : ''}
          </button>

          <!-- LS증권 선택 버튼 -->
          <button onclick="document.getElementById('broker-select-popup-modal')?.remove(); window.BrokerService.switchBrokerMode('ls');" 
            style="padding:12px; border-radius:10px; background:${active === 'ls' ? 'linear-gradient(135deg, #a855f7, #7e22ce)' : '#0f172a'}; color:#fff; border:2px solid ${active === 'ls' ? '#a855f7' : '#334155'}; font-size:14px; font-weight:700; cursor:pointer; text-align:left; display:flex; justify-content:space-between; align-items:center;">
            <span>🟣 LS증권 모드 (슬롯 7~12)</span>
            ${active === 'ls' ? '<span style="font-size:11px; background:#fff; color:#a855f7; padding:2px 6px; border-radius:4px; font-weight:800;">선택됨 ✓</span>' : ''}
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },
  activeBroker: "kiwoom",

  getApiBase() {
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (isLocal && LOCAL_PROXY_BASE) return LOCAL_PROXY_BASE;
    return WORKER3_RELAY_BASE;
  },

  // ⚠️ 슬롯 → 브로커 판정의 **단일 진실 공급원**. 다른 파일에서 `slot <= N` 같은 비교를
  //    새로 만들지 말고 반드시 이 함수를 쓸 것.
  //    2026-08-06 6→12 확장 전에는 이 판정이 isSlotForBroker 바깥에도 5곳(그중 2곳은 실제
  //    발주 경로)에 `slot<=3`으로 복사돼 있었다 — 한 곳만 고치면 화면과 실제 발주 브로커가
  //    어긋나는 사고로 이어진다(2026-07-31 오발주 사고와 같은 계열).
  //    서버 쪽 짝: proxy/broker3-proxy.js의 KIWOOM_MAX_SLOT, daily-backtest3.js의 BROKER_OF.
  //    **네 곳의 경계값은 항상 함께 바꾼다.**
  KIWOOM_MAX_SLOT: 6,

  brokerForSlot(slot) {
    return Number(slot) <= this.KIWOOM_MAX_SLOT ? "kiwoom" : "ls";
  },

  // 그 브로커가 쓰는 슬롯 번호 목록(설정 화면 탭 표시 등에 사용)
  slotsForBroker(broker = this.activeBroker) {
    const max = window.MAX_SLOTS || 12;
    const out = [];
    for (let i = 1; i <= max; i++) if (this.brokerForSlot(i) === broker) out.push(i);
    return out;
  },

  isSlotForBroker(slot, broker = this.activeBroker) {
    if (window.isManualBacktestMode || window.isViewingHistory) return true;
    const slotNum = Number(slot);
    const max = window.MAX_SLOTS || 12;
    if (!(slotNum >= 1 && slotNum <= max)) return false;
    if (broker === "kiwoom" || broker === "ls") return this.brokerForSlot(slotNum) === broker;
    return true;
  },

  async brokerFetch(endpoint, method = "GET", payload = null, timeoutMs = 3500) {
    const baseUrl = this.getApiBase();
    const url = `${baseUrl}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      "x-app-key": window.BROKER_APP_KEY || "",
      "x-user-id": this.getUserId()
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const options = { method, headers, signal: controller.signal };
    if (payload && method !== "GET" && method !== "HEAD") {
      options.body = JSON.stringify(payload);
    }

    try {
      const resp = await fetch(url, options);
      clearTimeout(timer);
      if (!resp.ok) {
        // VM 프록시는 400/502에도 {success:false, error:"..."} JSON을 준다 — 메시지를 살린다.
        try {
          const body = await resp.json();
          if (body && body.error) return { success: false, error: body.error, httpStatus: resp.status };
        } catch (e) { }
        return { success: false, error: `HTTP ${resp.status}` };
      }
      return await resp.json();
    } catch (err) {
      clearTimeout(timer);
      if (err.name !== 'AbortError') {
        console.warn("[BrokerService] Fetch error:", err.message || err);
      }
      return { success: false, error: err.name === 'AbortError' ? 'Timeout (VM Proxy 대기 중)' : err.toString() };
    }
  },

  async sendOverseasOrder({ slot, symbol, qty, price, side, ordType = "LIMIT" }) {
    const broker = this.brokerForSlot(slot);
    return await this.brokerFetch(`/api/broker/${broker}/order`, "POST", { symbol, qty, price: Number(price).toFixed(2), side, ordType });
  },

  async cancelOverseasOrder(slot, orderNo) {
    const broker = this.brokerForSlot(slot);
    return await this.brokerFetch(`/api/broker/${broker}/cancel`, "POST", { orderNo });
  },

  // 조회 계열은 VM이 증권사 TR을 여러 번 호출한다(체결내역은 일자별 TR).
  // 기본 3.5초로는 동시 호출이 겹칠 때 모자라 "Timeout" 오류가 난다.
  _bsInFlight: {},
  async _dedupFetch(key, fn) {
    if (this._bsInFlight[key]) return this._bsInFlight[key];
    this._bsInFlight[key] = (async () => {
      try {
        const res = await fn();
        setTimeout(() => { delete this._bsInFlight[key]; }, 2000);
        return res;
      } catch (err) {
        delete this._bsInFlight[key];
        throw err;
      }
    })();
    return this._bsInFlight[key];
  },

  async fetchUnfilledOrders(broker = this.activeBroker) {
    if (typeof broker !== "string" || broker.length <= 1) broker = "kiwoom";
    const timeout = broker === "ls" ? 30000 : 15000;
    return await this._dedupFetch(`unfilled_${broker}`, () => this.brokerFetch(`/api/broker/${broker}/unfilled`, "GET", null, timeout));
  },

  async fetchOverseasBalance(broker = this.activeBroker) {
    if (typeof broker !== "string" || broker.length <= 1) broker = "kiwoom";
    const timeout = broker === "ls" ? 30000 : 15000;
    return await this._dedupFetch(`balance_${broker}`, () => this.brokerFetch(`/api/broker/${broker}/balance`, "GET", null, timeout));
  },

  async fetchOverseasFills(broker = this.activeBroker) {
    if (typeof broker !== "string" || broker.length <= 1) broker = "kiwoom";
    return await this._dedupFetch(`fills_${broker}`, () => this.brokerFetch(`/api/broker/${broker}/fills`, "GET", null, 30000));
  },

  async fetchPendingOrders() {
    const userId = this.getUserId();
    return await this._dedupFetch(`pending_${userId}`, () => this.brokerFetch(`/api/orders/pending?userId=${encodeURIComponent(userId)}`, "GET", null, 10000));
  },

  // ─────────── 키 상태 / 자동주문 on-off ───────────
  async keyStatus(broker = this.activeBroker) {
    const userId = this.getUserId();
    return await this.brokerFetch(`/api/user/${broker}-key/status?userId=${encodeURIComponent(userId)}`, "GET");
  },

  async setAutoOrder(broker, enabled) {
    const userId = this.getUserId();
    return await this.brokerFetch(`/api/user/${broker}-key/autoorder`, "POST", { userId, enabled: !!enabled });
  },

  async deleteKey(broker = this.activeBroker) {
    const userId = this.getUserId();
    return await this.brokerFetch(`/api/user/${broker}-key`, "DELETE", { userId });
  },

    async syncKeysToVM(broker, savedKeys) {
    if (!savedKeys || !savedKeys.appKey || !savedKeys.accountNo) return;
    const userId = this.getUserId();
    const appSecret = savedKeys.appSecret || (window.__brokerSecrets && window.__brokerSecrets[broker]) || "";
    try {
      await this.brokerFetch(`/api/user/${broker}-key`, "POST", {
        appKey: savedKeys.appKey,
        appSecret: appSecret,
        accountNo: savedKeys.accountNo,
        userId
      });
      console.log(`[키 동기화] ${broker} API 키가 VM 프록시(${userId})에 동기화되었습니다.`);
    } catch (e) {
      console.warn(`[키 동기화 실패] ${broker}:`, e.message);
    }
  },

  getSavedKeys(broker) {
    try {
      const raw = localStorage.getItem(`vtotal3_${broker}_keys`);
      const parsed = raw ? JSON.parse(raw) : {};
      // 과거 버전이 appSecret을 저장했을 수 있다 — 읽는 즉시 제거(마이그레이션).
      if (parsed && parsed.appSecret) {
        delete parsed.appSecret;
        localStorage.setItem(`vtotal3_${broker}_keys`, JSON.stringify(parsed));
      }
      return { appKey: parsed.appKey || "", appSecret: "", accountNo: parsed.accountNo || "" };
    } catch (e) {
      return { appKey: "", appSecret: "", accountNo: "" };
    }
  },

  openBrokerKeySelect(broker = this.activeBroker) {
    return this.openBrokerKeyModal(broker);
  },

  openBrokerKeyModal(broker = this.activeBroker) {
    const oldModal = document.getElementById("broker-key-modal");
    if (oldModal) oldModal.remove();

    const title = broker === "kiwoom" ? "🟢 키움증권 해외주식 API 키 설정" : "🟣 LS증권 해외주식 API 키 설정";
    const saved = this.getSavedKeys(broker);

    const modal = document.createElement("div");
    modal.id = "broker-key-modal";
    modal.className = "modal-backdrop";
    modal.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.75); display:flex; align-items:center; justify-content:center; z-index:9999; backdrop-filter:blur(3px);";
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

    modal.innerHTML = `
      <div class="modal-content" style="max-width: 480px; width: 90%; padding: 24px; background: #1e293b; color: #f8fafc; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); border:1px solid #334155;" onclick="event.stopPropagation()">
        <h3 style="margin-top:0; font-size:18px; font-weight:600; display:flex; align-items:center; justify-content:space-between;">
          <span>${title}</span>
          <span onclick="document.getElementById('broker-key-modal').remove()" style="cursor:pointer; font-size:20px; color:#94a3b8;">&times;</span>
        </h3>
        <p style="font-size:13px; color:#94a3b8; margin-bottom:12px;">AppSecret은 브라우저에 저장하지 않고 GCP VM에만 보관됩니다(골든 룰 5).</p>

        <!-- 브로커 선택 탭: 키움/LS 각각 따로 등록한다 -->
        <div style="display:flex; gap:8px; margin-bottom:14px;">
          <button onclick="window.BrokerService.openBrokerKeyModal('kiwoom')"
            style="flex:1; padding:8px; border-radius:8px; cursor:pointer; font-size:13px; font-weight:700;
                   border:2px solid ${broker === 'kiwoom' ? '#10b981' : '#334155'};
                   background:${broker === 'kiwoom' ? 'linear-gradient(135deg,#10b981,#047857)' : '#0f172a'}; color:#fff;">
            🟢 키움 (슬롯1~6)
          </button>
          <button onclick="window.BrokerService.openBrokerKeyModal('ls')"
            style="flex:1; padding:8px; border-radius:8px; cursor:pointer; font-size:13px; font-weight:700;
                   border:2px solid ${broker === 'ls' ? '#a855f7' : '#334155'};
                   background:${broker === 'ls' ? 'linear-gradient(135deg,#a855f7,#7e22ce)' : '#0f172a'}; color:#fff;">
            🟣 LS증권 (슬롯7~12)
          </button>
        </div>

        <!-- 예수금 부족 경고 팝업 ON/OFF 스위치 -->
        <div id="broker-deposit-warning-box" style="display:flex; align-items:center; justify-content:space-between;
             background:#0f172a; border:1px solid #334155; border-radius:8px; padding:10px 12px; margin-bottom:8px; margin-top:4px;">
          <div>
            <div style="font-size:13px; font-weight:700; color:#f8fafc;">⚠️ 예수금 부족 경고 팝업</div>
            <div id="broker-deposit-warning-status" style="font-size:11px; color:#94a3b8; margin-top:2px;">
              ${localStorage.getItem('vtotal3_ignore_deposit_warning') === 'true' ? 'OFF (팝업 차단됨)' : 'ON (예수금 체크 팝업 표시)'}
            </div>
          </div>
          <div style="display:flex; gap:6px;">
            <button onclick="localStorage.setItem('vtotal3_ignore_deposit_warning', 'false'); window.BrokerService.openBrokerKeyModal('${broker}');"
              style="padding:4px 10px; border-radius:6px; font-size:11px; font-weight:700; cursor:pointer;
                     border:1px solid ${localStorage.getItem('vtotal3_ignore_deposit_warning') !== 'true' ? '#10b981' : '#334155'};
                     background:${localStorage.getItem('vtotal3_ignore_deposit_warning') !== 'true' ? '#10b981' : '#1e293b'}; color:#fff;">ON</button>
            <button onclick="localStorage.setItem('vtotal3_ignore_deposit_warning', 'true'); window.BrokerService.openBrokerKeyModal('${broker}');"
              style="padding:4px 10px; border-radius:6px; font-size:11px; font-weight:700; cursor:pointer;
                     border:1px solid ${localStorage.getItem('vtotal3_ignore_deposit_warning') === 'true' ? '#ef4444' : '#334155'};
                     background:${localStorage.getItem('vtotal3_ignore_deposit_warning') === 'true' ? '#ef4444' : '#1e293b'}; color:#fff;">OFF</button>
          </div>
        </div>

        <!-- GCP 봇(자동주문) 정지 스위치 — 브로커별로 독립 -->
        <div id="broker-autoorder-box" style="display:flex; align-items:center; justify-content:space-between;
             background:#0f172a; border:1px solid #334155; border-radius:8px; padding:10px 12px; margin-bottom:4px;">
          <div>
            <div style="font-size:13px; font-weight:700; color:#f8fafc;">🤖 GCP 자동주문 봇</div>
            <div id="broker-autoorder-status" style="font-size:11px; color:#94a3b8; margin-top:2px;">상태 확인 중...</div>
          </div>
          <div style="display:flex; gap:6px;">
            <button onclick="window.BrokerService.toggleBotFromModal('${broker}', true)"
              style="padding:6px 12px; border-radius:6px; border:none; cursor:pointer; font-size:12px; font-weight:700; background:#166534; color:#fff;">가동</button>
            <button onclick="window.BrokerService.toggleBotFromModal('${broker}', false)"
              style="padding:6px 12px; border-radius:6px; border:none; cursor:pointer; font-size:12px; font-weight:700; background:#7f1d1d; color:#fff;">정지</button>
          </div>
        </div>
        <div style="margin-top:12px;">
          <label style="display:block; font-size:12px; margin-bottom:4px; color:#cbd5e1;">AppKey / API Key</label>
          <input type="password" id="broker-modal-appkey" value="${saved.appKey || ''}" placeholder="AppKey 입력" style="width:100%; padding:10px; border-radius:6px; background:#0f172a; border:1px solid #334155; color:#fff; font-size:14px; outline:none;" />
        </div>
        <div style="margin-top:12px;">
          <label style="display:block; font-size:12px; margin-bottom:4px; color:#cbd5e1;">AppSecret / Secret Key</label>
          <input type="password" id="broker-modal-appsecret" value="${saved.appSecret || ''}" placeholder="AppSecret 입력" style="width:100%; padding:10px; border-radius:6px; background:#0f172a; border:1px solid #334155; color:#fff; font-size:14px; outline:none;" />
        </div>
        <div style="margin-top:12px;">
          <label style="display:block; font-size:12px; margin-bottom:4px; color:#cbd5e1;">계좌번호</label>
          <input type="text" id="broker-modal-account" value="${saved.accountNo || ''}" placeholder="계좌번호 입력" style="width:100%; padding:10px; border-radius:6px; background:#0f172a; border:1px solid #334155; color:#fff; font-size:14px; outline:none;" />
        </div>
        <div style="margin-top:24px; display:flex; gap:10px; justify-content:flex-end; align-items:center;">
          <button onclick="document.getElementById('broker-key-modal').remove()" style="padding:10px 18px; border-radius:6px; background:#475569; color:#fff; border:none; cursor:pointer; font-size:13px; font-weight:500;">취소</button>
          <button id="btnSaveBrokerKeys" onclick="window.BrokerService.saveModalKeys('${broker}')" style="padding:10px 20px; border-radius:6px; background:linear-gradient(135deg, #2563eb, #1d4ed8); color:#fff; border:none; font-weight:600; font-size:13px; cursor:pointer; transition:all 0.15s ease; box-shadow:0 4px 6px -1px rgba(37,99,235,0.4);">저장 및 연결</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    this.refreshBotStatusInModal(broker);
  },

  // 모달의 봇 상태줄을 서버 값으로 채운다(등록 여부 + 자동주문 on/off).
  async refreshBotStatusInModal(broker) {
    const el = document.getElementById("broker-autoorder-status");
    if (!el) return;
    try {
      const st = await this.keyStatus(broker);
      if (!st || st.success === false) { el.textContent = "상태 조회 실패"; return; }
      if (!st.hasKey && !st.registered) {
        el.innerHTML = `<span style="color:#94a3b8;">키 미등록 — 먼저 저장하세요</span>`;
        return;
      }
      const on = !!st.autoOrderEnabled;
      const mode = String(st.paperMode) === "1" ? "모의" : "실전";
      let extraBal = "";
      try {
        const bal = await this.fetchOverseasBalance(broker);
        if (bal && bal.success !== false) {
          const cash = Number(bal.usdCash || 0).toLocaleString(undefined, {minimumFractionDigits:2});
          const rp = Number(bal.rpCash || 0).toLocaleString(undefined, {minimumFractionDigits:2});
          const bp = Number(bal.buyingPowerUsd || 0).toLocaleString(undefined, {minimumFractionDigits:2});
          extraBal = `<div style="margin-top:4px; font-size:11px; color:#cbd5e1;">예수금: ${cash} | 外貨RP: ${rp} | 주문가능: ${bp}</div>`;
        }
      } catch (e) {}

      el.innerHTML = (on
        ? `<span style="color:#4ade80; font-weight:700;">가동 중</span> · ${mode} · 계좌 ${st.accountNo || "-"}`
        : `<span style="color:#f87171; font-weight:700;">정지됨</span> · ${mode} · 계좌 ${st.accountNo || "-"}`) + extraBal;
    } catch (e) {
      el.textContent = "상태 조회 실패: " + e.message;
    }
  },

  async toggleBotFromModal(broker, enabled) {
    const label = broker === "kiwoom" ? "키움" : "LS증권";
    // 실계좌 자동발주를 켜는 쪽만 확인을 받는다(끄는 건 언제나 안전).
    if (enabled && !confirm(`[${label}] GCP 자동주문 봇을 가동합니다.\n\n개장 10분 전에 예약된 주문이 사람 확인 없이 실제로 나갑니다.\n계속할까요?`)) return;
    const el = document.getElementById("broker-autoorder-status");
    if (el) el.textContent = "적용 중...";
    try {
      const res = await this.setAutoOrder(broker, enabled);
      if (res && res.success === false) {
        if (el) el.textContent = "실패: " + (res.error || "알 수 없는 오류");
        return;
      }
      await this.refreshBotStatusInModal(broker);
    } catch (e) {
      if (el) el.textContent = "실패: " + e.message;
    }
  },

  async saveModalKeys(broker) {
    const saveBtn = document.getElementById("btnSaveBrokerKeys");
    try {
      const appKeyEl = document.getElementById("broker-modal-appkey");
      const appSecretEl = document.getElementById("broker-modal-appsecret");
      const accountNoEl = document.getElementById("broker-modal-account");

      if (!appKeyEl || !appSecretEl || !accountNoEl) {
        alert("입력 양식을 찾을 수 없습니다.");
        return;
      }

      const appKey = appKeyEl.value.trim();
      const appSecret = appSecretEl.value.trim();
      const accountNo = accountNoEl.value.trim();

      if (!appKey || !appSecret || !accountNo) {
        alert("모든 항목(AppKey, AppSecret, 계좌번호)을 입력해 주세요.");
        return;
      }

      // Visual Button Loading Feedback
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerText = "⏳ 저장 및 연결 중...";
        saveBtn.style.opacity = "0.75";
        saveBtn.style.cursor = "wait";
      }

      // 1. 편의용 프리필만 로컬 저장 — appSecret은 절대 브라우저에 남기지 않는다(골든 룰 5).
      localStorage.setItem(`vtotal3_${broker}_keys`, JSON.stringify({ appKey, accountNo }));

      // 2. Sync to VM Proxy server
      const userId = this.getUserId();
      const res = await this.brokerFetch(`/api/user/${broker}-key`, "POST", { appKey, appSecret, accountNo, userId });

      if (res && res.success) {
        alert(`[${broker.toUpperCase()}] API 키가 GCP VM 프록시에 안전하게 저장되었습니다!`);
        const modal = document.getElementById("broker-key-modal");
        if (modal) modal.remove();
      } else {
        // VM에 저장 안 됐으면 모달을 닫지 않는다 — 성공으로 오인하지 않게.
        alert(`[${broker.toUpperCase()}] VM 저장 실패: ${(res && res.error) || 'VM 프록시 연결 불가'}\n(VM 프록시가 켜져 있는지 확인 후 다시 시도하세요)`);
      }
    } catch (err) {
      console.error("[BrokerService] saveModalKeys Exception:", err);
      alert("키 저장 처리 중 오류가 발생했습니다: " + err.message);
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerText = "저장 및 연결";
        saveBtn.style.opacity = "1";
        saveBtn.style.cursor = "pointer";
      }
    }
  }
};

// 시작 시: 저장된 활성 브로커 복원 + 상단 브로커 버튼 상태 반영
(function initBrokerService() {
  const paint = () => {
    try {
      const saved = localStorage.getItem("vtotal3_active_broker");
      window.BrokerService.switchBrokerMode(saved === "ls" ? "ls" : "kiwoom", true);
    } catch (e) { console.warn("[BrokerService] init:", e.message); }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", paint);
  else paint();
})();
