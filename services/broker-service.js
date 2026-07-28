/**
 * App 3 Broker Service Manager (Kiwoom + LS Securities)
 * Slots 1~3 = Kiwoom, Slots 4~6 = LS Securities
 * Supports Local Storage Key Pre-filling & VM Proxy Sync
 */

const LOCAL_PROXY_BASE = "http://localhost:8788";
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

  switchBrokerMode(broker) {
    this.activeBroker = broker;
    localStorage.setItem("vtotal3_active_broker", broker);

    // Update Single Nav Bar Button Text & Style
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

    // Refresh holdings & account UI
    if (window.BrokerReconcile && typeof window.BrokerReconcile.invalidate === "function") {
      window.BrokerReconcile.invalidate();
    }
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
          <button onclick="window.BrokerService.switchBrokerMode('kiwoom'); document.getElementById('broker-select-popup-modal').remove();" 
            style="padding:12px; border-radius:10px; background:${active === 'kiwoom' ? 'linear-gradient(135deg, #10b981, #059669)' : '#0f172a'}; color:${active === 'kiwoom' ? '#000' : '#fff'}; border:2px solid ${active === 'kiwoom' ? '#10b981' : '#334155'}; font-size:14px; font-weight:700; cursor:pointer; text-align:left; display:flex; justify-content:space-between; align-items:center;">
            <span>🟢 키움증권 모드 (슬롯 1~3)</span>
            ${active === 'kiwoom' ? '<span style="font-size:11px; background:#000; color:#10b981; padding:2px 6px; border-radius:4px; font-weight:800;">선택됨 ✓</span>' : ''}
          </button>

          <!-- LS증권 선택 버튼 -->
          <button onclick="window.BrokerService.switchBrokerMode('ls'); document.getElementById('broker-select-popup-modal').remove();" 
            style="padding:12px; border-radius:10px; background:${active === 'ls' ? 'linear-gradient(135deg, #a855f7, #7e22ce)' : '#0f172a'}; color:#fff; border:2px solid ${active === 'ls' ? '#a855f7' : '#334155'}; font-size:14px; font-weight:700; cursor:pointer; text-align:left; display:flex; justify-content:space-between; align-items:center;">
            <span>🟣 LS증권 모드 (슬롯 4~6)</span>
            ${active === 'ls' ? '<span style="font-size:11px; background:#fff; color:#a855f7; padding:2px 6px; border-radius:4px; font-weight:800;">선택됨 ✓</span>' : ''}
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },
  activeBroker: "kiwoom",

  getApiBase() {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return LOCAL_PROXY_BASE;
    }
    return WORKER3_RELAY_BASE;
  },

  isSlotForBroker(slot, broker = this.activeBroker) {
    const slotNum = Number(slot);
    if (broker === "kiwoom") return slotNum >= 1 && slotNum <= 3;
    if (broker === "ls") return slotNum >= 4 && slotNum <= 6;
    return true;
  },

  async brokerFetch(endpoint, method = "GET", payload = null, timeoutMs = 3500) {
    const baseUrl = this.getApiBase();
    const url = `${baseUrl}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      "x-app-key": window.BROKER_APP_KEY || "",
      "x-user-id": localStorage.getItem("vtotal3_id") || "default"
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
    const broker = Number(slot) <= 3 ? "kiwoom" : "ls";
    return await this.brokerFetch(`/api/broker/${broker}/order`, "POST", { symbol, qty, price: Number(price).toFixed(2), side, ordType });
  },

  async cancelOverseasOrder(slot, orderNo) {
    const broker = Number(slot) <= 3 ? "kiwoom" : "ls";
    return await this.brokerFetch(`/api/broker/${broker}/cancel`, "POST", { orderNo });
  },

  async fetchUnfilledOrders(broker = this.activeBroker) {
    if (typeof broker !== "string" || broker.length <= 1) broker = "kiwoom";
    return await this.brokerFetch(`/api/broker/${broker}/unfilled`, "GET");
  },

  async fetchOverseasBalance(broker = this.activeBroker) {
    return await this.brokerFetch(`/api/broker/${broker}/balance`, "GET");
  },

  async fetchOverseasFills(broker = this.activeBroker) {
    if (typeof broker !== "string" || broker.length <= 1) broker = "kiwoom";
    return await this.brokerFetch(`/api/broker/${broker}/fills`, "GET");
  },

  // ─────────── 키 상태 / 자동주문 on-off ───────────
  async keyStatus(broker = this.activeBroker) {
    const userId = localStorage.getItem("vtotal3_id") || "default";
    return await this.brokerFetch(`/api/user/${broker}-key/status?userId=${encodeURIComponent(userId)}`, "GET");
  },

  async setAutoOrder(broker, enabled) {
    const userId = localStorage.getItem("vtotal3_id") || "default";
    return await this.brokerFetch(`/api/user/${broker}-key/autoorder`, "POST", { userId, enabled: !!enabled });
  },

  async deleteKey(broker = this.activeBroker) {
    const userId = localStorage.getItem("vtotal3_id") || "default";
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
        <p style="font-size:13px; color:#94a3b8; margin-bottom:16px;">API 키는 브라우저 및 GCP VM 프록시에 안전하게 저장됩니다.</p>
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
      const userId = localStorage.getItem("vtotal3_id") || "default";
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
      window.BrokerService.switchBrokerMode(saved === "ls" ? "ls" : "kiwoom");
    } catch (e) { console.warn("[BrokerService] init:", e.message); }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", paint);
  else paint();
})();
