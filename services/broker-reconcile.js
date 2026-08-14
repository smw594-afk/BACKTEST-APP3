/**
 * App 3 Broker Reconcile Service (ported from App1's Kiwoom reconciliation, adapted for US stocks).
 *
 * Provides the shared data layer for four features:
 *   1. 계좌 정보          — live balance/USD cash modal
 *   2. 보유현황 일치       — holdings vs broker BUY fills
 *   3. 실전매도내역 일치    — sell trades vs broker SELL fills
 *   4. 키움/LS 매수매도내역 — raw fills table
 *
 * Both brokers go through the same GCP VM proxy (BrokerService), so one cache serves all views.
 *
 * ⚠️ Proxy response contract (proxy/broker3-proxy.js must map real broker TRs to this shape):
 *   /balance → { usdCash, buyingPowerUsd, holdings:[{symbol,qty,avgPrice,currentPrice,evalPnlUsd}] }
 *   /fills   → { executions:[{id,symbol,side:"BUY"|"SELL",qty,price,time,marketDate?}] }
 *   `marketDate` (NY trading date, YYYY-MM-DD) is preferred; otherwise `time` is converted from KST.
 */

(function () {
  "use strict";

  const CACHE_MS = 30000;
  const BROKERS = ["kiwoom", "ls"];
  const BROKER_LABEL = { kiwoom: "🟢 키움", ls: "🟣 LS증권" };

  const fillsCache = {};   // broker → { at, data }
  const fillsPromise = {};
  const balanceCache = {}; // broker → { at, data }
  const balancePromise = {};

  // ─────────── date helpers (US market date, not KST calendar date) ───────────
  // A fill at 05:00 KST belongs to the PREVIOUS New York trading day, so a naive
  // substring of a KST timestamp would bucket it one day late.
  function nyDateKey(dt) {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit"
      }).format(dt);
    } catch (e) {
      return "";
    }
  }

  function normalizeMarketDate(row) {
    if (!row) return "";
    // 1) explicit market date from the proxy wins
    const explicit = row.marketDate || row.date || "";
    const plain = String(explicit).replace(/[^0-9]/g, "");
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(explicit))) return String(explicit);
    if (plain.length === 8) return `${plain.slice(0, 4)}-${plain.slice(4, 6)}-${plain.slice(6, 8)}`;

    // 2) derive from a KST timestamp string
    const t = String(row.time || row.timestamp || "");
    const m = t.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (m) {
      const [, y, mo, d, hh = "0", mi = "0", ss = "0"] = m;
      const isKst = /KST/i.test(t) || !/UTC|Z|GMT/i.test(t); // proxy reports KST by default
      const dt = isKst
        ? new Date(Date.UTC(+y, +mo - 1, +d, +hh - 9, +mi, +ss))
        : new Date(Date.UTC(+y, +mo - 1, +d, +hh, +mi, +ss));
      return nyDateKey(dt) || `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
    return "";
  }

  // App holdings/trades store dates as YYYY-MM-DD (formatDateNY) but sheet-restored
  // rows can arrive as 26/07/21 or 2026.7.21 — normalize both sides before comparing.
  function normalizeDateKey(v) {
    const s = String(v || "").trim();
    if (!s || s === "-") return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // Separator form first — "2026.7.5" has 6 digits but is NOT YYMMDD, so the
    // digit-count shortcut below must never see a separated date.
    const parts = s.split(/[-/.]/).map(p => p.trim()).filter(Boolean);
    if (parts.length === 3 && parts.every(p => /^\d{1,4}$/.test(p))) {
      let [y, mo, d] = parts;
      if (y.length <= 2) y = "20" + y.padStart(2, "0");
      return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
    const digits = s.replace(/[^0-9]/g, "");
    if (digits.length === 8) return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
    if (digits.length === 6) return `20${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 6)}`;
    return "";
  }

  const normSymbol = (s) => String(s || "").trim().toUpperCase();
  // 슬롯→브로커 판정은 BrokerService가 단일 진실 공급원이다(services/broker-service.js).
  // 예전엔 여기에 `slot<=3`이 따로 복사돼 있어, 경계값을 바꿀 때 한쪽만 고치면
  // 체결 대조가 엉뚱한 브로커 계좌를 보게 됐다.
  const brokerForSlot = (slot) => (window.BrokerService
    ? window.BrokerService.brokerForSlot(slot)
    : (Number(slot) <= 6 ? "kiwoom" : "ls"));

  // ─────────── cached proxy reads ───────────
  async function getFills(broker) {
    const now = Date.now();
    const c = fillsCache[broker];
    if (c && now - c.at < CACHE_MS) return c.data;
    if (!fillsPromise[broker]) {
      fillsPromise[broker] = window.BrokerService.fetchOverseasFills(broker)
        .finally(() => { fillsPromise[broker] = null; });
    }
    const data = await fillsPromise[broker];
    fillsCache[broker] = { at: Date.now(), data };
    return data;
  }

  async function getBalance(broker) {
    const now = Date.now();
    const c = balanceCache[broker];
    if (c && now - c.at < CACHE_MS) return c.data;
    if (!balancePromise[broker]) {
      balancePromise[broker] = window.BrokerService.fetchOverseasBalance(broker)
        .finally(() => { balancePromise[broker] = null; });
    }
    // 키 등록 여부는 VM이 판별한다(키는 VM에만 저장 — 골든 룰 5).
    // VM이 "키 미등록" 400을 주면 그 메시지가 그대로 error로 표시된다.
    let data = await balancePromise[broker];
    if (!data) {
      data = {
        success: false,
        broker: broker.toUpperCase(),
        error: "VM 프록시 서버 통신 대기 중 (잠시 후 다시 [🔄 새로고침]을 눌러주세요)"
      };
    }
    balanceCache[broker] = { at: Date.now(), data };
    return data;
  }

  function invalidate() {
    BROKERS.forEach(b => { fillsCache[b] = null; balanceCache[b] = null; });
  }

  // ─────────── fill maps ───────────
  // state.buy / state.sell : Map<`SYMBOL|YYYY-MM-DD`, {qty, cost}>
  // state.coveredDates     : Set<YYYY-MM-DD> — dates the broker actually reported.
  //   A holding whose date is NOT covered is '미확인', never '불일치' — absence of
  //   data must not be rendered as a contradiction.
  const state = { buy: new Map(), sell: new Map(), coveredDates: new Set(), ready: false, failed: false, rows: [] };

  // ⚠️ 2026-07-30까지 키가 `symbol|date`뿐이라 키움·LS가 같은 종목을 같은 날 매매하면
  //    두 브로커의 체결이 한 칸에 합쳐졌다(수량 합산, 평균가 뒤섞임). 슬롯 1~3=키움,
  //    4~6=LS인데 조회는 항상 브로커별이라 이제 broker를 키에 포함해 완전히 분리한다.
  function ingest(broker, data) {
    const rows = Array.isArray(data && data.executions) ? data.executions
      : (Array.isArray(data && data.rows) ? data.rows : []);
    rows.forEach(r => {
      const symbol = normSymbol(r.symbol || r.ticker);
      const date = normalizeMarketDate(r);
      const qty = Math.abs(Number(r.filledQty != null ? r.filledQty : r.qty) || 0);
      const price = Math.abs(Number(r.filledPrice != null ? r.filledPrice : r.price) || 0);
      if (!symbol || !date || qty <= 0) return;
      const side = String(r.side || "").toUpperCase();
      const isBuy = side.includes("BUY") || side.includes("매수");
      const target = isBuy ? state.buy : state.sell;
      const key = `${broker}|${symbol}|${date}`;
      const cur = target.get(key) || { qty: 0, cost: 0 };
      cur.qty += qty;
      cur.cost += qty * price;
      target.set(key, cur);
      state.coveredDates.add(`${broker}|${date}`);
      state.rows.push({ ...r, broker, _symbol: symbol, _date: date, _qty: qty, _price: price, _isBuy: isBuy });
    });
  }

  let refreshInFlight = false;
  async function refreshFills(targetBroker, onDone) {
    if (typeof targetBroker === "function") {
      onDone = targetBroker;
      targetBroker = null;
    }
    if (refreshInFlight) return;
    if (!window.BrokerService) return;

    // ⚠️ 키움 모드일 땐 키움 체결내역만, LS 모드일 땐 LS 체결내역만 조회한다. (불필요한 타 증권사 호출 제거)
    const activeBr = targetBroker || (window.BrokerService && window.BrokerService.activeBroker) || "kiwoom";
    refreshInFlight = true;
    try {
      const d = await getFills(activeBr).catch(e => null);
      state.rows = state.rows.filter(r => r.broker !== activeBr);
      for (const [k] of state.buy) { if (k.startsWith(`${activeBr}|`)) state.buy.delete(k); }
      for (const [k] of state.sell) { if (k.startsWith(`${activeBr}|`)) state.sell.delete(k); }
      for (const dKey of state.coveredDates) { if (dKey.startsWith(`${activeBr}|`)) state.coveredDates.delete(dKey); }

      let anyOk = false;
      if (d && d.success !== false) {
        ingest(activeBr, d);
        anyOk = true;
      }
      state.ready = true;
      state.failed = !anyOk;
      if (typeof onDone === "function") onDone();
    } finally {
      refreshInFlight = false;
    }
  }

  // ─────────── reconcile status ───────────
  // Compare rounded quantities only. Prices differ legitimately (limit vs fill),
  // so a price gap alone is surfaced in the tooltip, not as a mismatch.
  function statusFor(map, broker, symbol, dateKey, appQty) {
    if (!state.ready) return { status: state.failed ? "unknown" : "loading" };
    const sym = normSymbol(symbol);
    const date = normalizeDateKey(dateKey);
    if (!sym || !date) return { status: "unknown" };
    if (!state.coveredDates.has(`${broker}|${date}`)) return { status: "pending", appQty };
    const live = map.get(`${broker}|${sym}|${date}`);
    if (!live || live.qty <= 0) return { status: "mismatch", appQty, liveQty: 0, livePrice: 0 };
    const livePrice = live.cost / live.qty;
    const matched = Math.round(Number(appQty) || 0) === Math.round(live.qty);
    return { status: matched ? "match" : "mismatch", appQty, liveQty: live.qty, livePrice };
  }

  // broker는 필수가 아니라 편의상 기본값을 둔다 — 실제로는 항상 brokerForSlot(slotNum)으로
  // 넘겨받아야 한다(안 넘기면 슬롯 4~6=LS 데이터를 잘못 키움 쪽에서 찾게 된다).
  const holdingStatus = (symbol, buyDate, appQty, broker = "kiwoom", appSellQty = 0) => {
    // ⚠️ 당일 매도가 있으면 순 수량(매수 - 매도)으로 비교한다.
    // 예: 8/3 15주 매수, 2주 매도 → 순 수량 13주와 키움 체결 비교
    const netAppQty = Math.max(0, Math.round(Number(appQty) || 0) - Math.round(Number(appSellQty) || 0));
    return statusFor(state.buy, broker, symbol, buyDate, netAppQty);
  };
  const sellStatus = (symbol, sellDate, appQty, broker = "kiwoom") => statusFor(state.sell, broker, symbol, sellDate, appQty);

  function badge(st) {
    switch (st && st.status) {
      case "match": return { text: "일치", icon: "✓", color: "#10b981" };
      case "mismatch": return { text: "불일치", icon: "✕", color: "#ef4444" };
      case "loading": return { text: "확인 중", icon: "…", color: "#f59e0b" };
      case "pending": return { text: "보류", icon: "△", color: "#94a3b8" };
      default: return { text: "미확인", icon: "△", color: "#94a3b8" };
    }
  }

  function badgeTitle(st) {
    if (!st) return "";
    if (st.status === "mismatch") {
      return `title="브로커 체결과 불일치 — 앱: ${Math.round(st.appQty || 0)}주 / 브로커: ${Math.round(st.liveQty || 0)}주 @ $${Number(st.livePrice || 0).toFixed(2)}"`;
    }
    if (st.status === "pending") return 'title="브로커 체결 대조 대기 — 조회 범위에 해당 일자가 없습니다"';
    if (st.status === "match") return 'title="브로커 체결과 일치"';
    if (st.status === "loading") return 'title="브로커 체결내역 조회 중"';
    return 'title="브로커 체결내역 미확인"';
  }

  function cellHtml(st) {
    const b = badge(st);
    return `<td style="color:${b.color}; font-size:9px; font-weight:800; white-space:nowrap; text-align:center;" ${badgeTitle(st)}>${b.icon} ${b.text}</td>`;
  }

  // ─────────── 계좌 정보 modal ───────────
  const usd = (v) => "$" + Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    function accountSectionHtml(broker, data) {
    const label = BROKER_LABEL[broker];
    const isLight = typeof document !== "undefined" && document.body && document.body.classList.contains("light-mode");

    if (!data || data.success === false) {
      return `<div style="margin-bottom:16px; background:var(--card, #0f172a); padding:14px; border-radius:10px; border:1px solid var(--card-border, #334155); color:var(--text, #f8fafc);">
        <div style="font-weight:700; font-size:14px; margin-bottom:6px; color:var(--text, #f8fafc);">${label}</div>
        <div style="color:#f43f5e; font-size:12px; background:rgba(244,63,94,0.1); padding:8px; border-radius:6px;">❌ ${escapeHtml((data && data.error) || "계좌 정보를 불러올 수 없습니다.")}</div>
      </div>`;
    }

    const usdCash = Number(data.usdCash || 0);
    const buyingPower = Number(data.buyingPowerUsd || usdCash);
    const holdings = Array.isArray(data.holdings) ? data.holdings : [];

    let totalEval = usdCash;
    let totalPnl = 0;

    holdings.forEach(h => {
      const q = Number(h.qty || 0);
      const curr = Number(h.currentPrice || 0);
      const pnl = Number(h.evalPnlUsd || 0);
      totalEval += (q * curr);
      totalPnl += pnl;
    });

    const rows = holdings.length
      ? holdings.map(h => {
        const qty = Math.round(Number(h.qty) || 0);
        const avgPrice = Number(h.avgPrice || 0);
        const currPrice = Number(h.currentPrice || 0);
        const pnl = Number(h.evalPnlUsd || 0);
        const pnlPct = (avgPrice > 0 && qty > 0) ? ((currPrice - avgPrice) / avgPrice * 100) : 0;
        const color = pnl > 0 ? (isLight ? "#1d4ed8" : "#3b82f6") : (pnl < 0 ? (isLight ? "#b91c1c" : "#ef4444") : "var(--text, #f8fafc)");

        return `<tr style="border-bottom:1px solid var(--card-border, #334155);">
            <td style="padding:10px 8px; font-weight:700; color:var(--text, #f8fafc);">${escapeHtml(h.symbol)}</td>
            <td style="padding:10px 8px; text-align:right; color:var(--text, #cbd5e1);">${qty.toLocaleString()}주</td>
            <td style="padding:10px 8px; text-align:right; color:var(--text-muted, #94a3b8);">${usd(avgPrice)}</td>
            <td style="padding:10px 8px; text-align:right; color:var(--text, #f8fafc);">${usd(currPrice)}</td>
            <td style="padding:10px 8px; text-align:right; color:${color}; font-weight:700;">${pnl < 0 ? "-" : ""}${usd(Math.abs(pnl))}</td>
            <td style="padding:10px 8px; text-align:right; color:${color}; font-weight:700;">${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%</td>
          </tr>`;
      }).join("")
      : `<tr><td colspan="6" style="padding:16px; text-align:center; color:var(--text-muted, #64748b); font-size:13px;">현재 보유 중인 종목이 없습니다.</td></tr>`;

    return `
      <div style="margin-bottom:20px; background:var(--card, #0f172a); padding:16px; border-radius:12px; border:1px solid var(--card-border, #334155); color:var(--text, #f8fafc);">
        <!-- 국내주식 스타일 상단 계좌 요약 카드 -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid var(--card-border, #1e293b); padding-bottom:10px;">
          <span style="font-weight:700; font-size:15px; color:var(--text, #f8fafc);">${label}</span>
          <span style="font-size:12px; color:var(--text-muted, #94a3b8);">계좌: ${escapeHtml(data.accountNo || '연동 완료')}</span>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px; margin-bottom:14px; background:rgba(148,163,184,0.1); padding:12px; border-radius:8px;">
          <div>
            <div style="font-size:11px; color:var(--text-muted, #94a3b8);">외화 예수금</div>
            <div style="font-size:14px; font-weight:700; color:#38bdf8; margin-top:2px;">${usd(usdCash)}</div>
          </div>
          <div>
            <div style="font-size:11px; color:var(--text-muted, #94a3b8);">주문 가능 금액</div>
            <div style="font-size:14px; font-weight:700; color:${isLight ? '#059669' : '#34d399'}; margin-top:2px;">${usd(buyingPower)}</div>
          </div>
          <div>
            <div style="font-size:11px; color:var(--text-muted, #94a3b8);">총 평가 금액</div>
            <div style="font-size:14px; font-weight:700; color:var(--text, #f8fafc); margin-top:2px;">${usd(totalEval)}</div>
          </div>
        </div>

        <!-- 국내주식 스타일 보유 종목 테이블 -->
        <div style="font-size:13px; font-weight:700; margin-bottom:8px; color:var(--text, #cbd5e1); display:flex; justify-content:space-between;">
          <span>📦 실시간 보유 종목 (${holdings.length}건)</span>
        </div>
        <div style="overflow-x:auto; border-radius:8px; border:1px solid var(--card-border, #334155);">
          <table style="width:100%; border-collapse:collapse; font-size:12px; text-align:left; color:var(--text, #f8fafc);">
            <thead>
              <tr style="background:rgba(148,163,184,0.15); color:var(--text-muted, #94a3b8); border-bottom:1px solid var(--card-border, #334155);">
                <th style="padding:8px;">종목</th>
                <th style="padding:8px; text-align:right;">수량</th>
                <th style="padding:8px; text-align:right;">매수단가</th>
                <th style="padding:8px; text-align:right;">현재가</th>
                <th style="padding:8px; text-align:right;">평가손익</th>
                <th style="padding:8px; text-align:right;">수익률</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
  function escapeHtml(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[c]);
  }

  async function openAccountInfoModal() {
    invalidate(); // Always clear cache to fetch fresh live data from Kiwoom REST API
    const old = document.getElementById("broker-account-modal");
    if (old) old.remove();
    const modal = document.createElement("div");
    modal.id = "broker-account-modal";
    modal.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:9999;";
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    modal.innerHTML = `
      <div style="max-width:560px;width:92%;max-height:82vh;overflow:auto;padding:22px;background:#1e293b;color:#f8fafc;border-radius:12px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);" onclick="event.stopPropagation()">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <h3 style="margin:0;font-size:17px;font-weight:600;">📡 계좌 정보 (해외주식)</h3>
          <button onclick="document.getElementById('broker-account-modal').remove()"
            style="background:none;border:none;color:#94a3b8;font-size:20px;cursor:pointer;line-height:1;">×</button>
        </div>
        <div id="broker-account-body" style="font-size:12px;color:#94a3b8;">조회 중...</div>
        <div style="margin-top:14px;text-align:right;">
          <button onclick="window.BrokerReconcile.refreshAccountInfo()"
            style="padding:6px 14px;border-radius:6px;background:#334155;color:#fff;border:none;cursor:pointer;font-size:11px;">🔄 새로고침</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    await paintAccountInfo();
  }

  async function paintAccountInfo(targetBroker = null) {
    const body = document.getElementById("broker-account-body");
    if (!body) return;
    if (!window.BrokerService) { body.innerHTML = '<span style="color:#f43f5e;">BrokerService 미로드</span>'; return; }
    
    const active = targetBroker || (window.BrokerService.activeBroker || "kiwoom");
    body.innerHTML = '<div style="padding:20px; text-align:center; color:#94a3b8; font-size:13px;">⏳ [' + active.toUpperCase() + '] 계좌 정보를 불러오는 중...</div>';
    
    try {
      const data = await getBalance(active);
      body.innerHTML = accountSectionHtml(active, data);
    } catch (e) {
      body.innerHTML = '<div style="color:#f43f5e; padding:16px;">❌ 계좌 정보 조회 오류: ' + e.message + '</div>';
    }
  }

  function refreshAccountInfo() {
    BROKERS.forEach(b => { balanceCache[b] = null; });
    paintAccountInfo();
  }

  // ─────────── 내역모드 stats 패널용 계좌 정보 (App1 스타일) ───────────
  // 실시간 운영현황 자리를 대체한다. 활성 브로커(상단 토글)의 실전 잔고를 그린다.
  let panelRenderSeq = 0;
  async function renderBrokerAccountTable(container) {
    if (!container) return;
    const seq = ++panelRenderSeq;
    const active = (window.BrokerService && window.BrokerService.activeBroker) || "kiwoom";
    container.innerHTML = `<div style="padding:20px; color:#64748b; text-align:center; font-size:11px;">${BROKER_LABEL[active]} 실전 계좌 정보를 조회 중...</div>`;
    let data;
    try {
      data = await getBalance(active);
    } catch (e) {
      data = { success: false, error: e.message };
    }
    if (seq !== panelRenderSeq) return; // 최신 요청만 반영 (뷰 전환 중 덮어쓰기 방지)
    const other = active === "kiwoom" ? "ls" : "kiwoom";
    container.innerHTML = `
      <div style="display:flex; justify-content:flex-end; margin:2px 4px 4px 0;">
        <button onclick="window.BrokerReconcile.invalidate(); window.BrokerReconcile.renderBrokerAccountTable(this.closest('#statsTable') || document.getElementById('statsTable'))"
          style="border:none; border-radius:5px; padding:3px 10px; font-size:10px; cursor:pointer; background:#334155; color:#fff;">🔄 새로고침</button>
      </div>
      ${accountSectionHtml(active, data)}
      <div style="text-align:center; font-size:10px; color:#64748b; padding:4px 0 8px;">
        상단 ${BROKER_LABEL[other]} 전환은 좌측 상단 브로커 버튼에서
      </div>`;
  }

  window.BrokerReconcile = {

  // ⭐️ 주문 전송 후 실시간 체결/미체결 자동 검증 및 확인 로직
  reconcileOrdersAndFills: async function(broker) {
    const targetBroker = broker || (window.BrokerService ? window.BrokerService.activeBroker : "kiwoom");
    console.log(`[주문확인] ${targetBroker} 실전 계좌 주문 체결 및 미체결 상태를 검증합니다...`);

    try {
      const [balance, unfilled, fills] = await Promise.all([
        window.BrokerService.fetchOverseasBalance(targetBroker),
        window.BrokerService.fetchOverseasUnfilled(targetBroker),
        window.BrokerService.fetchOverseasFills(targetBroker, 1)
      ]);

      console.log("[주문확인 결과]", { balance, unfilled, fills });

      return {
        success: true,
        broker: targetBroker,
        usdCash: balance.usdCash,
        holdingsCount: (balance.holdings || []).length,
        unfilledCount: Array.isArray(unfilled) ? unfilled.length : 0,
        fillsCount: Array.isArray(fills) ? fills.length : 0,
        timestamp: new Date().toISOString()
      };
    } catch (e) {
      console.error("[주문확인 오류]", e);
      return { success: false, error: e.message };
    }
  },

    BROKERS, BROKER_LABEL,
    normalizeMarketDate, normalizeDateKey, normSymbol, brokerForSlot,
    getFills, getBalance, invalidate, refreshFills,
    state,
    holdingStatus, sellStatus, badge, badgeTitle, cellHtml, escapeHtml,
    openAccountInfoModal, refreshAccountInfo, renderBrokerAccountTable,
    isReady: () => state.ready
  };
})();


window.toggleGcpBotEngine = async function() {
  const btn = document.getElementById("btnToggleGcpBotEngine");
  const active = (window.BrokerService && window.BrokerService.activeBroker) || "kiwoom";
  const isStopping = btn && btn.innerText.includes("정지");

  if (confirm(isStopping ? "정말로 GCP 봇 엔진을 정지하시겠습니까?" : "GCP 봇 엔진을 가동하시겠습니까?")) {
    try {
      btn.innerText = "⏳ 처리 중...";
      if (active === "kiwoom") {
        await window.BrokerService.setKiwoomAutoOrder(!isStopping);
      } else {
        await window.BrokerService.setLsAutoOrder(!isStopping);
      }
      btn.innerText = isStopping ? "▶️ GCP 봇 엔진 가동" : "⏸️ GCP 봇 엔진 정지";
      btn.style.background = isStopping ? "#10b981" : "#ef4444";
      alert(isStopping ? "GCP 봇 엔진이 정지되었습니다." : "GCP 봇 엔진이 가동되었습니다.");
    } catch(e) {
      alert("봇 엔진 상태 변경 실패: " + e.message);
      if (btn) btn.innerText = isStopping ? "⏸️ GCP 봇 엔진 정지" : "▶️ GCP 봇 엔진 가동";
    }
  }
};
