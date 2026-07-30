// ui/render-trade-history.js - 실전 매도내역 렌더링 (백업에서 복구됨)

let lastTradeHistoryRenderSignature = '';
let historyMonthOffset = 0;
let historyScrollBound = false;
let historyViewMode = 'strategy'; // 기본은 실전 매도내역 (내역모드 진입 시 항상 이 화면)

// 실전 매도내역(strategy) 표의 thead (index.html 정적 헤더와 동일: 일치 컬럼 포함 10열)
function strategyHistoryTheadHtml() {
  return '<tr style="border-bottom:1px solid rgba(255,255,255,0.1);color:var(--text-muted);font-weight:700;">'
    + '<th style="width:9%; padding:2px 1px; text-align:center;">일치</th>'
    + '<th style="width:9%; padding:2px 1px; text-align:center;">투자법</th>'
    + '<th style="width:10%; padding:2px 1px; text-align:center;">종목</th>'
    + '<th style="width:11%; padding:2px 1px; text-align:center;">진입일</th>'
    + '<th style="width:11%; padding:2px 1px; text-align:center;">청산일</th>'
    + '<th style="width:9%; padding:2px 1px; text-align:center;">모드/T</th>'
    + '<th style="width:10%; padding:2px 1px; text-align:center;">진입가</th>'
    + '<th style="width:10%; padding:2px 1px; text-align:center;">청산가</th>'
    + '<th style="width:7%; padding:2px 1px; text-align:center;">수량</th>'
    + '<th style="width:14%; padding:2px 1px; text-align:center; white-space:nowrap;">수익금</th></tr>';
}

// 내역모드 진입 시 실전 매도내역 화면으로 강제 리셋 (제목/헤더/오프셋 복원 후 렌더)
function resetToStrategyHistory() {
  historyViewMode = 'strategy';
  historyMonthOffset = 0;
  lastTradeHistoryRenderSignature = '';
  const title = document.getElementById('historyTitle');
  if (title) title.textContent = '📜 실전 매도 내역';
  const thead = document.querySelector('#historyTable thead');
  if (thead) thead.innerHTML = strategyHistoryTheadHtml();
  renderDBTradeHistory();
}

function formatYymmdd(dateStr) {
  if (!dateStr) return '';
  const clean = String(dateStr).replace(/[^0-9]/g, '');
  if (clean.length === 8) {
    return `${clean.slice(2, 4)}/${clean.slice(4, 6)}/${clean.slice(6, 8)}`;
  }
  return dateStr;
}

function escapeTradeHistoryHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

function strategyHistoryTheadHtml() {
  return '<tr><th>일치</th><th>투자법</th><th>종목</th><th>진입일</th><th>청산일</th><th>모드/T</th><th>진입가</th><th>청산가</th><th>수량</th><th>수익금</th></tr>';
}

function kiwoomHistoryTheadHtml() {
  return '<tr><th>종목</th><th>구분</th><th>주문가</th><th>체결가</th><th>수량</th><th>상태</th><th>시간</th><th>수수료</th><th>수익금</th></tr>';
}

async function toggleView() {
  const broker = window.BrokerService ? window.BrokerService.activeBroker : 'kiwoom';
  const fillsMode = broker === 'ls' ? 'ls' : 'kiwoom';
  historyViewMode = historyViewMode === 'strategy' ? fillsMode : 'strategy';

  const title = document.getElementById('historyTitle') || document.getElementById('historyModeTitle');
  if (title) {
    title.textContent = historyViewMode === 'ls' ? '📋 LS증권 매수·매도 내역'
      : historyViewMode === 'kiwoom' ? '📋 키움 매수·매도 내역' : '📜 실전 매도 내역';
  }

  const thead = document.querySelector('#historyTable thead');
  if (historyViewMode === 'kiwoom' || historyViewMode === 'ls') {
    if (thead) thead.innerHTML = kiwoomHistoryTheadHtml();
    return renderBrokerFills(historyViewMode);
  }

  // 'strategy' 모드 복귀 시: 헤더를 실전매도내역(10열)으로 원복하고 DB 거래내역 재렌더링
  lastTradeHistoryRenderSignature = '';
  if (thead) thead.innerHTML = strategyHistoryTheadHtml();
  renderDBTradeHistory();
}

async function renderBrokerFills(broker) {
  const tbody = document.getElementById('historyTableBody');
  const thead = document.querySelector('#historyTable thead');
  if (!tbody) return;
  const label = broker === 'ls' ? 'LS증권' : '키움';

  if (thead) {
    thead.innerHTML = '<tr style="border-bottom:1px solid rgba(255,255,255,0.1);color:var(--text-muted);font-weight:700;">'
      + '<th style="padding:4px 2px;text-align:center;">종목</th>'
      + '<th style="padding:4px 2px;text-align:center;">구분</th>'
      + '<th style="padding:4px 2px;text-align:center;">주문가</th>'
      + '<th style="padding:4px 2px;text-align:center;">체결가</th>'
      + '<th style="padding:4px 2px;text-align:center;">수량</th>'
      + '<th style="padding:4px 2px;text-align:center;">상태</th>'
      + '<th style="padding:4px 2px;text-align:center;">시간</th>'
      + '<th style="padding:4px 2px;text-align:center;">수수료</th>'
      + '<th style="padding:4px 2px;text-align:center;">수익금</th></tr>';
  }

  tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:20px;color:#64748b;">${label} 해외주식 체결내역 조회 중...</td></tr>`;

  try {
    let data = null;
    if (window.BrokerService && window.BrokerService.fetchOverseasFills) {
      data = await window.BrokerService.fetchOverseasFills(broker);
    } else if (window.BrokerReconcile && window.BrokerReconcile.getFills) {
      data = await window.BrokerReconcile.getFills(broker);
    }

    if (!data || data.success === false) {
      const errMsg = (data && data.error) || "체결내역 응답 없음";
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:20px;color:#f43f5e;">${label} 해외주식 체결내역 조회 실패<br/><span style="font-size:9.5px;opacity:0.8;">${errMsg}</span></td></tr>`;
      return;
    }

    const rows = Array.isArray(data.executions) ? data.executions : (Array.isArray(data.rows) ? data.rows : []);
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:20px;color:#64748b;">${label} 해외주식 체결내역이 없습니다</td></tr>`;
      return;
    }

    // 체결일시 기준 내림차순(최신이 맨 위). 배열 순서를 뒤집기만 하면 여러 날짜가 섞였을 때
    // 최신이 위로 오지 않는다 — 거래일(marketDate) + 체결시각(KST)으로 정렬한다.
    const sortKey = (r) => `${String(r.marketDate || r.date || "")} ${String(r.timeKst || r.time || "")}`;
    tbody.innerHTML = rows.slice().sort((a, b) => sortKey(b).localeCompare(sortKey(a))).map(r => {
      const sideStr = String(r.side || r.io_tp_nm || '').toUpperCase();
      const isBuy = sideStr.includes('BUY') || sideStr.includes('매수');
      const qty = Math.abs(Number(r.qty || r.cntr_qty || r.ord_qty) || 0);
      const buyPric = Number(r.ord_pric || r.price) || 0;
      const cntrPric = Number(r.cntr_pric || r.price) || 0;
      const statusStr = r.ord_stt || r.status || '체결';
      const timePart = r.time || r.cntr_tm || r.ord_tm || '-';
      const feeVal = Number(r.tdy_trde_cmsn || r.fee) || 0;
      const pnlVal = Number(r.rlzt_pl || r.pnl) || 0;

      const usd = (v) => "$" + Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const profitCell = !isBuy
        ? (pnlVal !== 0 ? `<td style="text-align:center; color:${pnlVal >= 0 ? '#10b981' : '#f43f5e'}; font-weight:700;">${pnlVal >= 0 ? '+' : ''}${usd(pnlVal)}</td>` : `<td style="text-align:center; color:var(--text-muted);">-</td>`)
        : `<td style="text-align:center; color:var(--text-muted);">-</td>`;

      // 위 thead와 정렬을 맞춘다(전 컬럼 center) — 한쪽만 바꾸면 컬럼이 어긋나 보인다.
      return `<tr style="text-align:center;">
        <td style="text-align:center; font-weight:700; color:#fda4af;">${r.symbol || r.stk_nm || '-'}</td>
        <td style="text-align:center; color:${isBuy ? '#f43f5e' : '#10b981'}; font-weight:700;">${isBuy ? '매수' : '매도'}</td>
        <td style="text-align:center;">$${buyPric.toFixed(2)}</td>
        <td style="text-align:center;">$${cntrPric.toFixed(2)}</td>
        <td style="text-align:center;">${qty.toLocaleString()}주</td>
        <td style="text-align:center;">${statusStr}</td>
        <td style="text-align:center; color:var(--text-muted);">${timePart}</td>
        <td style="text-align:center;">${feeVal > 0 ? usd(feeVal) : '-'}</td>
        ${profitCell}
      </tr>`;
    }).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:20px;color:#f43f5e;">${label} 해외주식 체결내역 연동 실패<br/><span style="font-size:9.5px;opacity:0.8;">${e.message}</span></td></tr>`;
  }
}

async function renderBrokerFills(broker) {
  const tbody = document.getElementById('historyTableBody');
  const thead = document.querySelector('#historyTable thead');
  if (!tbody) return;
  const label = broker === 'ls' ? 'LS증권' : '키움';

  if (thead) {
    thead.innerHTML = '<tr style="border-bottom:1px solid rgba(255,255,255,0.1);color:var(--text-muted);font-weight:700;">'
      + '<th style="padding:4px 2px;text-align:center;">종목</th>'
      + '<th style="padding:4px 2px;text-align:center;">구분</th>'
      + '<th style="padding:4px 2px;text-align:center;">주문가</th>'
      + '<th style="padding:4px 2px;text-align:center;">체결가</th>'
      + '<th style="padding:4px 2px;text-align:center;">수량</th>'
      + '<th style="padding:4px 2px;text-align:center;">상태</th>'
      + '<th style="padding:4px 2px;text-align:center;">시간</th>'
      + '<th style="padding:4px 2px;text-align:center;">수수료</th>'
      + '<th style="padding:4px 2px;text-align:center;">수익금</th></tr>';
  }

  tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:20px;color:#64748b;">${label} 해외주식 체결내역 조회 중...</td></tr>`;

  try {
    let data = null;
    if (window.BrokerService && window.BrokerService.fetchOverseasFills) {
      data = await window.BrokerService.fetchOverseasFills(broker);
    } else if (window.BrokerReconcile && window.BrokerReconcile.getFills) {
      data = await window.BrokerReconcile.getFills(broker);
    }

    if (!data || data.success === false) {
      const errMsg = (data && data.error) || "체결내역 응답 없음";
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:20px;color:#f43f5e;">${label} 해외주식 체결내역 조회 실패<br/><span style="font-size:9.5px;opacity:0.8;">${errMsg}</span></td></tr>`;
      return;
    }

    const rows = Array.isArray(data.executions) ? data.executions : (Array.isArray(data.rows) ? data.rows : []);
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:20px;color:#64748b;">${label} 해외주식 체결내역이 없습니다</td></tr>`;
      return;
    }

    // 체결일시 기준 내림차순(최신이 맨 위). 배열 순서를 뒤집기만 하면 여러 날짜가 섞였을 때
    // 최신이 위로 오지 않는다 — 거래일(marketDate) + 체결시각(KST)으로 정렬한다.
    const sortKey = (r) => `${String(r.marketDate || r.date || "")} ${String(r.timeKst || r.time || "")}`;
    tbody.innerHTML = rows.slice().sort((a, b) => sortKey(b).localeCompare(sortKey(a))).map(r => {
      const sideStr = String(r.side || r.io_tp_nm || '').toUpperCase();
      const isBuy = sideStr.includes('BUY') || sideStr.includes('매수');
      const qty = Math.abs(Number(r.qty || r.cntr_qty || r.ord_qty) || 0);
      const buyPric = Number(r.ord_pric || r.price) || 0;
      const cntrPric = Number(r.cntr_pric || r.price) || 0;
      const statusStr = r.ord_stt || r.status || '체결';
      const timePart = r.time || r.cntr_tm || r.ord_tm || '-';
      const feeVal = Number(r.tdy_trde_cmsn || r.fee) || 0;
      const pnlVal = Number(r.rlzt_pl || r.pnl) || 0;

      const usd = (v) => "$" + Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const profitCell = !isBuy
        ? (pnlVal !== 0 ? `<td style="text-align:center; color:${pnlVal >= 0 ? '#10b981' : '#f43f5e'}; font-weight:700;">${pnlVal >= 0 ? '+' : ''}${usd(pnlVal)}</td>` : `<td style="text-align:center; color:var(--text-muted);">-</td>`)
        : `<td style="text-align:center; color:var(--text-muted);">-</td>`;

      // 위 thead와 정렬을 맞춘다(전 컬럼 center) — 한쪽만 바꾸면 컬럼이 어긋나 보인다.
      return `<tr style="text-align:center;">
        <td style="text-align:center; font-weight:700; color:#fda4af;">${r.symbol || r.stk_nm || '-'}</td>
        <td style="text-align:center; color:${isBuy ? '#f43f5e' : '#10b981'}; font-weight:700;">${isBuy ? '매수' : '매도'}</td>
        <td style="text-align:center;">$${buyPric.toFixed(2)}</td>
        <td style="text-align:center;">$${cntrPric.toFixed(2)}</td>
        <td style="text-align:center;">${qty.toLocaleString()}주</td>
        <td style="text-align:center;">${statusStr}</td>
        <td style="text-align:center; color:var(--text-muted);">${timePart}</td>
        <td style="text-align:center;">${feeVal > 0 ? usd(feeVal) : '-'}</td>
        ${profitCell}
      </tr>`;
    }).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:20px;color:#f43f5e;">${label} 해외주식 체결내역 연동 실패<br/><span style="font-size:9.5px;opacity:0.8;">${e.message}</span></td></tr>`;
  }
}

// KIS는 초당 요청 한도가 엄격해 캐시 없이는 바로 rate limit(초당 거래건수 초과)에 걸린다.
// 키움 getKiwoomFillsCached()와 동일한 1분 캐시 패턴.
let kisFillsCache = null;
let kisFillsCacheAt = 0;
let kisFillsPromise = null;
async function getKisFillsCached(days) {
  if (kisFillsCache && Date.now() - kisFillsCacheAt < 60000) return kisFillsCache;
  if (!kisFillsPromise) {
    kisFillsPromise = window.brokerService.kisFills(days).finally(() => { kisFillsPromise = null; });
  }
  const result = await kisFillsPromise;
  kisFillsCache = result;
  kisFillsCacheAt = Date.now();
  return result;
}

// 한투 매수매도 내역 (kis-worker /api/kis/fills — 주식일별주문체결조회 TTTC0081R).
// ⚠️ 필드 매핑은 미검증 스펙 기반. rt_cd=0(요청 자체)은 실제 계좌로 검증됨, 응답 필드명은
// 실거래 발생 후 kis-worker의 raw 응답과 대조 확인 필요.
async function renderKisFills() {
  const tbody = document.getElementById('historyTableBody');
  const thead = document.querySelector('#historyTable thead');
  if (!tbody) return;
  if (thead) thead.innerHTML = '<tr><th>종목</th><th>구분</th><th>주문수량</th><th>체결수량</th><th>체결가</th><th>체결금액</th><th>일자</th></tr>';
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:#64748b;">한투 체결내역 조회 중...</td></tr>';
  try {
    const { rows } = await getKisFillsCached(7);
    if (!rows || !rows.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:#64748b;">최근 7일 체결내역이 없습니다</td></tr>';
      return;
    }
    const n = v => Math.round(Number(v) || 0).toLocaleString();
    // 체결일시 기준 내림차순(최신이 맨 위). 배열 순서를 뒤집기만 하면 여러 날짜가 섞였을 때
    // 최신이 위로 오지 않는다 — 거래일(marketDate) + 체결시각(KST)으로 정렬한다.
    const sortKey = (r) => `${String(r.marketDate || r.date || "")} ${String(r.timeKst || r.time || "")}`;
    tbody.innerHTML = rows.slice().sort((a, b) => sortKey(b).localeCompare(sortKey(a))).map(r => {
      const sideLabel = r.side === 'buy' ? '매수' : '매도';
      return `<tr><td>${escapeTradeHistoryHtml(r.name || r.ticker)}</td><td>${sideLabel}</td><td>${n(r.orderQty)}주</td><td>${n(r.filledQty)}주</td><td>₩${n(r.filledPrice)}</td><td>₩${n(r.filledAmt)}</td><td>${formatYymmdd(r.date)}</td></tr>`;
    }).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:#f43f5e;">한투 체결내역 조회 실패<br/><span style="font-size:9.5px;opacity:0.8;">${escapeTradeHistoryHtml(e.message)}</span></td></tr>`;
  }
}

// Shared 60s-cached fetch of ka10076 (today's fills) — reused by the "키움 매수·매도
// 내역" view AND the 실전 매도내역 reconciliation check below.
let kiwoomFillsCache = null;
let kiwoomFillsCacheAt = 0;
let kiwoomFillsPromise = null;

async function getKiwoomFillsCached() {
  const base = window.KIWOOM_API_BASE || 'http://localhost:8787';
  if (kiwoomFillsCache && Date.now() - kiwoomFillsCacheAt < 60000) return kiwoomFillsCache;
  if (!kiwoomFillsPromise) {
    kiwoomFillsPromise = fetch(`${base}/api/kiwoom/fills`).then(async res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    }).finally(() => { kiwoomFillsPromise = null; });
  }
  const result = await kiwoomFillsPromise;
  kiwoomFillsCache = result;
  kiwoomFillsCacheAt = Date.now();
  return result;
}

// Fetch today's fills (ka10076) + backfill the past ~6 weekdays (kt00009 via ?date=),
// dedup, and persist to localStorage. Returns the deduped 7-day fill rows.
// Shared by the "키움 매수·매도 내역" view AND the 실전 매도내역 대조(일치 컬럼).
async function loadKiwoom7dFills() {
  const data = await getKiwoomFillsCached();
  const fetched = Array.isArray(data?.cntr) ? data.cntr : (Array.isArray(data?.acnt_ord_cntr_prst_array) ? data.acnt_ord_cntr_prst_array : []);
  const now = Date.now();
  const cacheKey = `vtotal_kiwoom_fills_7d_${window.myUserId || 'default'}`;
  let cached = [];
  try { cached = JSON.parse(localStorage.getItem(cacheKey) || '[]'); } catch (e) { cached = []; }
  const today = kstDateKeyFromMs(now);
  // The proxy reports which trading day the ka10076 rows belong to — on market
  // holidays that's the previous session, NOT the calendar date.
  const fetchDate = /^\d{8}$/.test(String(data?.trade_date || ''))
    ? `${data.trade_date.slice(0, 4)}-${data.trade_date.slice(4, 6)}-${data.trade_date.slice(6, 8)}`
    : today;
  const fillIdKey = r => `${r.ord_no || ''}|${r.cntr_qty || r.ord_qty || ''}|${r.cntr_pric || ''}`;
  const fetchedIds = new Set(fetched.map(fillIdKey));
  cached = cached.filter(r => r._date === fetchDate || !fetchedIds.has(fillIdKey(r)));
  const bfKey = `vtotal_kiwoom_fills_bf_${window.myUserId || 'default'}`;
  let backfilled = [];
  try { backfilled = JSON.parse(localStorage.getItem(bfKey) || '[]'); } catch (e) { backfilled = []; }
  const haveDates = new Set([...cached.map(r => r._date), ...backfilled, today, fetchDate]);
  const base = window.KIWOOM_API_BASE || 'http://localhost:8787';
  for (let k = 1; k <= 6; k++) {
    const dayMs = now - k * 86400000;
    const dow = new Date(dayMs + 9 * 3600 * 1000).getUTCDay();
    if (dow === 0 || dow === 6) continue;
    const dkey = kstDateKeyFromMs(dayMs);
    if (haveDates.has(dkey)) continue;
    try {
      const res = await fetch(`${base}/api/kiwoom/fills?date=${dkey.replace(/-/g, '')}`);
      if (!res.ok) continue; // retry on next render
      const day = await res.json();
      if (String(day?.date || '') !== dkey.replace(/-/g, '')) continue;
      (Array.isArray(day?.cntr) ? day.cntr : []).forEach(r => cached.push({ ...r, _date: dkey, _seenAt: now }));
      backfilled.push(dkey);
    } catch (e) { }
  }
  backfilled = backfilled.filter(dkey => now - new Date(`${dkey}T00:00:00+09:00`).getTime() <= 8 * 86400000);
  try { localStorage.setItem(bfKey, JSON.stringify(backfilled)); } catch (e) { }
  const deduped = Array.from(new Map([...cached, ...fetched.map(r => ({ ...r, _date: fetchDate, _seenAt: now }))].map(r => [`${fillIdKey(r)}|${r._date || ''}`, r])).values())
    .filter(r => now - Number(r._seenAt || now) <= 7 * 86400000);
  try { localStorage.setItem(cacheKey, JSON.stringify(deduped)); } catch (e) { }
  return deduped;
}

async function renderKiwoomFills() { return renderBrokerFills('kiwoom'); }
async function _old_renderKiwoomFills() {
  const tbody = document.getElementById('historyTableBody');
  const thead = document.querySelector('#historyTable thead');
  if (!tbody) return;
  if (thead) thead.innerHTML = '<tr><th>종목</th><th>구분</th><th>주문가</th><th>체결가</th><th>수량</th><th>상태</th><th>시간</th><th>수수료</th><th>수익금</th></tr>';
  tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px;color:#64748b;">키움 체결내역 조회 중...</td></tr>';
  try {
    const now = Date.now();
    const today = kstDateKeyFromMs(now);
    const deduped = await loadKiwoom7dFills();
    // Newest first: date desc, then fill time (fallback order time) desc.
    const fillSortKey = r => `${r._date || ''} ${String(r.cntr_tm || r.ord_tm || '').replace(/[^0-9]/g, '').padStart(6, '0')}`;
    const rows = deduped.slice().sort((a, b) => fillSortKey(b).localeCompare(fillSortKey(a)));
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px;color:#64748b;">체결내역이 없습니다</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(r => {
      const tickerCode = String(r.stk_cd || '').replace(/^A/, '');
      const managedTicker = window.KR_TICKERS_CONFIG?.DEFAULT_SYMBOLS?.find(item => item.code === tickerCode);
      const fullStockName = String(r.stk_nm || r.stk_cd || '-');
      const stockName = String(managedTicker?.name || fullStockName);
      const stockChars = Array.from(stockName);
      const shortStockName = stockChars.length > 10 ? `${stockChars.slice(0, 10).join('')}…` : stockName;
      const side = String(r.io_tp_nm || '').replace(/^[-+]/, '') || '-';
      // cntr_tm = real fill time ("15:30:07", merged from kt00009 by the proxy);
      // fallback ord_tm = order-submission time ("152529") for unfilled/legacy rows.
      const time = String(r.cntr_tm || r.ord_tm || '').replace(/[^0-9]/g, '')
        .padStart(6, '0').replace(/^(\d{2})(\d{2})(\d{2})$/, '$1:$2:$3');
      const n = v => Math.round(Number(String(v || 0).replace(/[^0-9.-]/g, '')) || 0).toLocaleString();
      const qty = Number(String(r.cntr_qty || r.ord_qty || 0).replace(/[^0-9.-]/g, '')) || 0;
      const gross = (Number(String(r.cntr_pric || r.ord_pric || 0).replace(/[^0-9.-]/g, '')) || 0) * qty;
      // Backfilled past-day BUY rows have no fee data (only sell fees are queryable
      // for past dates via ka10072) — show '-' instead of a misleading ₩0.
      const feeKnown = r.tdy_trde_cmsn != null || r.tdy_trde_tax != null;
      const fee = Number(String(r.tdy_trde_cmsn || 0).replace(/[^0-9.-]/g, '')) || 0;
      const tax = Number(String(r.tdy_trde_tax || 0).replace(/[^0-9.-]/g, '')) || 0;
      const isSell = side.includes('매도');
      // 수익금 = 키움 실현손익(ka10072 tdy_sel_pl, 프록시가 rlzt_pl로 전달). 매수는 청산 전이라 '-'.
      // 실현손익 값이 없는 매도 행(프록시 미갱신/조회 실패)도 '-'로 둔다.
      const plKnown = isSell && r.rlzt_pl != null && String(r.rlzt_pl) !== '';
      const pl = plKnown ? (Number(String(r.rlzt_pl).replace(/[^0-9.-]/g, '')) || 0) : 0;
      const profitCell = !isSell
        ? `<td style="color:var(--text-muted);">-</td>`
        : (plKnown
          ? `<td class="${pl >= 0 ? 'profit-plus' : 'profit-minus'}">${pl < 0 ? '-' : ''}₩${n(Math.abs(pl))}</td>`
          : `<td style="color:var(--text-muted);">-</td>`);
      return `<tr><td title="${escapeTradeHistoryHtml(fullStockName)}" style="max-width:10em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeTradeHistoryHtml(shortStockName)}</td><td>${side}</td><td>₩${n(r.ord_pric)}</td><td>₩${n(r.cntr_pric)}</td><td>${n(qty)}주</td><td>${r.ord_stt || '-'}</td><td>${formatYymmdd(r._date || today)} ${time}</td><td>${feeKnown ? `₩${n(fee)}` : '-'}</td>${profitCell}</tr>`;
    }).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:20px;color:#f43f5e;">키움 체결내역 조회 실패</td></tr>`;
  }
}

// KST-shifted Y-M-D key, independent of the browser's local timezone.
function kstDateKeyFromMs(ms) {
  const d = new Date(ms + 9 * 3600 * 1000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

// ka10076 is TODAY-only, so 매도 reconciliation can only cover today's 청산 rows —
// older rows have no live Kiwoom record to check against and are left unmarked.
// Aggregated per ticker (not per-lot) for the same reason render-holdings.js does:
// kt00018-style per-lot detail isn't available, only same-day fill totals.
function getTodaySellAggregateByTicker(fillsData) {
  const map = new Map();
  const rows = Array.isArray(fillsData?.cntr) ? fillsData.cntr : (Array.isArray(fillsData?.acnt_ord_cntr_prst_array) ? fillsData.acnt_ord_cntr_prst_array : []);
  rows.forEach(r => {
    const side = String(r.io_tp_nm || '');
    if (!side.includes('매도') || String(r.ord_stt || '') !== '체결') return;
    const ticker = String(r.stk_cd || '').replace(/^A/, '');
    const qty = Number(String(r.cntr_qty || r.ord_qty || 0).replace(/[^0-9.-]/g, '')) || 0;
    const price = Number(String(r.cntr_pric || r.ord_pric || 0).replace(/[^0-9.-]/g, '')) || 0;
    if (!ticker || qty <= 0) return;
    const cur = map.get(ticker) || { qty: 0, cost: 0 };
    cur.qty += qty;
    cur.cost += qty * price;
    map.set(ticker, cur);
  });
  return map;
}

let kiwoomTodaySellRefreshInFlight = false;
async function refreshKiwoomTodaySellCache() {
  if (kiwoomTodaySellRefreshInFlight) return;
  if (window.__kiwoomTodaySellMap && Date.now() - (window.__kiwoomTodaySellMapAt || 0) < 60000) return;
  kiwoomTodaySellRefreshInFlight = true;
  try {
    const data = await getKiwoomFillsCached();
    window.__kiwoomTodaySellMap = getTodaySellAggregateByTicker(data);
    window.__kiwoomTodaySellMapAt = Date.now();
    if (historyViewMode === 'strategy') {
      lastTradeHistoryRenderSignature = ''; // force re-render now that live data is available
      renderDBTradeHistory();
    }
  } catch (e) {
    console.warn("[매매내역] 키움 체결내역 조회 실패(대조 생략):", e.message);
  } finally {
    kiwoomTodaySellRefreshInFlight = false;
  }
}

// 최근 ~7거래일 키움 체결(매도)로 실전 매도내역을 대조하기 위한 맵을 localStorage 캐시에서 구성한다.
// (renderKiwoomFills/loadKiwoom7dFills가 저장해 둔 vtotal_kiwoom_fills_7d_* 를 그대로 읽음)
// ⚠️ 날짜 포맷: 키움 _date는 YYYY-MM-DD 형태. normalizeDateKey로 재확인하여 일관성 보장.
function getKiwoom7dSellReconcile() {
  const uid = window.myUserId || 'default';
  let rows = [], backfilled = [];
  try { rows = JSON.parse(localStorage.getItem(`vtotal_kiwoom_fills_7d_${uid}`) || '[]'); } catch (e) { rows = []; }
  try { backfilled = JSON.parse(localStorage.getItem(`vtotal_kiwoom_fills_bf_${uid}`) || '[]'); } catch (e) { backfilled = []; }
  const sellMap = new Map();
  const coveredDates = new Set(backfilled);
  coveredDates.add(kstDateKeyFromMs(Date.now()));
  rows.forEach(r => {
    const rawDate = String(r._date || '');
    const normalizedDate = normalizeDateKey(rawDate);
    if (normalizedDate) coveredDates.add(normalizedDate);
    if (!String(r.io_tp_nm || '').includes('매도') || String(r.ord_stt || '') !== '체결') return;
    const ticker = String(r.stk_cd || '').replace(/^A/i, '').trim();
    const qty = Number(String(r.cntr_qty || r.ord_qty || 0).replace(/[^0-9.-]/g, '')) || 0;
    const price = Number(String(r.cntr_pric || r.ord_pric || 0).replace(/[^0-9.-]/g, '')) || 0;
    if (!ticker || !normalizedDate || qty <= 0) return;
    const key = `${ticker}|${normalizedDate}`;
    const cur = sellMap.get(key) || { qty: 0, cost: 0 };
    cur.qty += qty; cur.cost += qty * price;
    sellMap.set(key, cur);
  });
  return { sellMap, coveredDates, hasData: rows.length > 0 };
}

// 실전 매도내역 대조용 7일 체결 캐시를 백그라운드로 갱신 후 재렌더 (키움 내역 뷰를 안 열어도 대조 가능).
let kiwoom7dFillsRefreshInFlight = false;
let kiwoom7dFillsRefreshedAt = 0;
async function refreshKiwoom7dFillsCache() {
  if (kiwoom7dFillsRefreshInFlight) return;
  if (Date.now() - kiwoom7dFillsRefreshedAt < 60000) return; // 1분 캐시
  kiwoom7dFillsRefreshInFlight = true;
  try {
    await loadKiwoom7dFills(); // localStorage 캐시 갱신
    kiwoom7dFillsRefreshedAt = Date.now();
    if (historyViewMode === 'strategy') {
      lastTradeHistoryRenderSignature = '';
      renderDBTradeHistory();
    }
  } catch (e) {
    console.warn('[매매내역] 7일 체결 대조 데이터 갱신 실패:', e.message);
  } finally {
    kiwoom7dFillsRefreshInFlight = false;
  }
}

function renderDBTradeHistory() {
  if (historyViewMode === 'kiwoom') {
    const title = document.getElementById('historyTitle');
    if (title) title.textContent = '📋 키움 매수·매도 내역';
    renderKiwoomFills();
    return;
  }
  if (historyViewMode === 'kis') {
    const title = document.getElementById('historyTitle');
    if (title) title.textContent = '📋 한투 매수·매도 내역';
    renderKisFills();
    return;
  }
  const tbody = document.getElementById('historyTableBody');
  if (!tbody) {
    console.warn("[매매내역] historyTableBody 요소를 찾을 수 없습니다.");
    return;
  }

  try {
    let allTrades = [];
    for (let i = 1; i <= MAX_SLOTS; i++) {
      if (isSlotActive(i)) {
        const res = lastBTResults[i];
        if (res) {
          let trades = Array.isArray(res.trades) ? res.trades : [];
          if (res.isSynced && !res.tradesFromSheet && res.dailyStates && res.dailyStates.length > 0) {
            const reconstructedTrades = reconstructRealTrades(buildTradeLogsFromDailyStates(res.dailyStates), i);
            if (reconstructedTrades.length >= trades.length) {
              trades = reconstructedTrades;
              res.trades = reconstructedTrades;
            }
          }

          const slotTrades = trades.map(t => {
            let finalPrice = parseFloat(t.sellPrice || t.sell_price) || 0;

            if (finalPrice <= 0) {
              const currentPrice = parseFloat(res.summary?.currPrice || res.currPrice) || 0;
              if (currentPrice > 0) {
                finalPrice = currentPrice;
              }
            }

            return {
              ...t,
              slotNum: i,
              ticker: window.slotConfigs?.[i]?.basics?.ticker || "",
              sellPrice: finalPrice,
              sell_price: finalPrice
            };
          });

          allTrades = allTrades.concat(slotTrades);
        } else {
        }
      }
    }

    if (allTrades.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:20px; color:#64748b;">매매 내역이 없습니다</td></tr>`;
      return;
    }

    // Merge multiple fills of the same strategy trade into one row.
    const mergedTrades = new Map();
    allTrades.forEach(trade => {
      const buyDate = String(trade.buyDate || trade.buy_date || "");
      const sellDate = String(trade.sellDate || trade.sell_date || "");
      const mode = String(trade.mode || "");
      const tier = String(trade.tier || "");
      const key = [trade.slotNum, buyDate, sellDate, mode, tier].join('|');
      const qty = Number(trade.qty || 0);
      const profit = Number(trade.profit || 0);
      const existing = mergedTrades.get(key);
      if (!existing) {
        mergedTrades.set(key, { ...trade, qty, profit });
        return;
      }
      const oldQty = Number(existing.qty || 0);
      const totalQty = oldQty + qty;
      if (totalQty > 0) {
        existing.buy_price = ((Number(existing.buy_price || existing.buyPrice || 0) * oldQty) + (Number(trade.buy_price || trade.buyPrice || 0) * qty)) / totalQty;
        existing.sell_price = ((Number(existing.sell_price || 0) * oldQty) + (Number(trade.sell_price || 0) * qty)) / totalQty;
      }
      existing.qty = totalQty;
      existing.profit = Number(existing.profit || 0) + profit;
    });
    allTrades = Array.from(mergedTrades.values());

    // 최근 ~7거래일 키움 체결(매도)과 대조: 종목+청산일 단위로 수량/체결가를 비교한다.
    // (과거엔 '오늘'만 가능했지만 키움 매수·매도 내역이 7일치를 보관하므로 그 범위 전부 대조)
    // ⚠️ 날짜 포맷 통일: 앱의 청산일 형태(26/07/21, 2026.7.21 등)를 normalizeDateKey로 YYYY-MM-DD로 변환
    const todayKey = kstDateKeyFromMs(Date.now());
    const reconcile7d = getKiwoom7dSellReconcile();
    const stripA = s => String(s || '').replace(/^A/i, '').trim();
    const appSellByTickerDate = new Map();
    const debugDateFormats = []; // 디버깅용
    allTrades.forEach(t => {
      const rawSellDate = String(t.sellDate || t.sell_date || "");
      const ticker = stripA(t.ticker);
      if (!ticker || !rawSellDate) return;
      const normalizedSellDate = normalizeDateKey(rawSellDate);
      if (!normalizedSellDate) return;
      // 디버깅: 날짜 변환 확인
      if (debugDateFormats.length < 5) debugDateFormats.push({raw: rawSellDate, normalized: normalizedSellDate, ticker});
      const key = `${ticker}|${normalizedSellDate}`;
      const cur = appSellByTickerDate.get(key) || { qty: 0, cost: 0 };
      const qty = Number(t.qty || 0);
      cur.qty += qty;
      cur.cost += qty * Number(t.sell_price ?? t.sellPrice ?? 0);
      appSellByTickerDate.set(key, cur);
    });
    // 종목+청산일별 각 행의 reconciliation 상태를 결정
    // 같은 그룹 내 행들을 진입일 역순으로 정렬한 후, 매도된 수량을 상위부터 차감
    const sellStatusByRowKey = new Map(); // (ticker|sellDate|buyDate) → status & mismatchQty
    const groupedByTicker = new Map(); // ticker|sellDate → [{buyDate, qty, cost}, ...]

    allTrades.forEach(t => {
      const rawSellDate = String(t.sellDate || t.sell_date || "");
      const ticker = stripA(t.ticker);
      if (!ticker || !rawSellDate) return;
      const normalizedSellDate = normalizeDateKey(rawSellDate);
      if (!normalizedSellDate) return;
      const groupKey = `${ticker}|${normalizedSellDate}`;
      if (!groupedByTicker.has(groupKey)) groupedByTicker.set(groupKey, []);
      groupedByTicker.get(groupKey).push({
        buyDate: String(t.buyDate || t.buy_date || ""),
        qty: Number(t.qty || 0),
        cost: Number(t.qty || 0) * Number(t.sell_price ?? t.sellPrice ?? 0)
      });
    });

    groupedByTicker.forEach((rows, groupKey) => {
      const [ticker, normalizedSellDate] = groupKey.split('|');
      if (!reconcile7d.coveredDates.has(normalizedSellDate)) {
        rows.forEach(r => {
          const rowKey = `${groupKey}|${r.buyDate}`;
          sellStatusByRowKey.set(rowKey, { status: 'pending', mismatchQty: 0 });
        });
        return;
      }

      const live = reconcile7d.sellMap.get(groupKey);
      if (!live) {
        rows.forEach(r => {
          const rowKey = `${groupKey}|${r.buyDate}`;
          sellStatusByRowKey.set(rowKey, { status: 'mismatch', mismatchQty: r.qty });
        });
        return;
      }

      // 진입일 역순으로 정렬하여 최신부터 매도 수량 차감
      rows.sort((a, b) => b.buyDate.localeCompare(a.buyDate));
      const liveTotal = Math.round(live.qty);
      const appTotal = rows.reduce((sum, r) => sum + Math.round(r.qty), 0);
      let remainingLiveQty = liveTotal;

      rows.forEach(r => {
        const rowKey = `${groupKey}|${r.buyDate}`;
        const rowQty = Math.round(r.qty);
        if (remainingLiveQty >= rowQty) {
          sellStatusByRowKey.set(rowKey, { status: 'match', mismatchQty: 0 });
          remainingLiveQty -= rowQty;
        } else if (remainingLiveQty > 0) {
          sellStatusByRowKey.set(rowKey, { status: 'mismatch', mismatchQty: rowQty - remainingLiveQty });
          remainingLiveQty = 0;
        } else {
          sellStatusByRowKey.set(rowKey, { status: 'mismatch', mismatchQty: rowQty });
        }
      });

      // 실제 매도가 앱 예상 합계보다 많으면(=과매도) 남은 초과분을 첫 행에 표시한다.
      // 위 루프는 "예상보다 적게 팔린 경우"만 잡아서, 과매도는 전부 일치로 새어나갔다.
      if (remainingLiveQty > 0 && rows.length) {
        const firstKey = `${groupKey}|${rows[0].buyDate}`;
        sellStatusByRowKey.set(firstKey, {
          status: 'oversold', overQty: remainingLiveQty, appQty: appTotal, liveQty: liveTotal
        });
      }
    });

    const latestDate = allTrades.reduce((latest, trade) => {
      const value = String(trade.sellDate || trade.sell_date || '');
      const normalized = normalizeDateKey(value);
      return normalized > latest ? normalized : latest;
    }, '');
    const latestParts = latestDate.split('-').map(Number);
    const latestMonth = latestParts.length === 3 && latestParts[1] > 0 ? new Date(Date.UTC(latestParts[0], latestParts[1] - 1 - historyMonthOffset, 1)) : null;
    const monthStart = latestMonth ? latestMonth.getTime() : -Infinity;
    const monthEnd = latestParts.length === 3 && latestParts[1] > 0 ? Date.UTC(latestParts[0], latestParts[1], 1) : Infinity;
    const visibleTrades = latestMonth ? allTrades.filter(trade => {
      const value = String(trade.sellDate || trade.sell_date || '');
      const time = Date.parse(`${value}T00:00:00Z`);
      return time >= monthStart && time < monthEnd;
    }) : allTrades;
    const signature = `${allTrades.length}|${historyMonthOffset}|${latestDate}|${allTrades.reduce((sum, t) => sum + Number(t.profit || 0), 0)}|kw:${reconcile7d.sellMap.size}:${reconcile7d.coveredDates.size}:${reconcile7d.hasData}`;
    if (signature === lastTradeHistoryRenderSignature && tbody.children.length > 0) return;
    lastTradeHistoryRenderSignature = signature;

    const scrollHost = tbody.closest('.slim-scroll');
    if (scrollHost && !historyScrollBound) {
      historyScrollBound = true;
      scrollHost.addEventListener('scroll', () => {
        if (scrollHost.scrollTop + scrollHost.clientHeight >= scrollHost.scrollHeight - 40) {
          historyMonthOffset += 1;
          renderDBTradeHistory();
        }
      }, { passive: true });
    }

    allTrades.sort((a, b) => {
      const sellA = String(a.sellDate || a.sell_date || "");
      const sellB = String(b.sellDate || b.sell_date || "");
      if (sellA !== sellB) {
        return sellB.localeCompare(sellA);
      }
      const buyA = String(a.buyDate || a.buy_date || "");
      const buyB = String(b.buyDate || b.buy_date || "");
      return buyB.localeCompare(buyA);
    });

    const modeMap = { 'Middle': 'Mid1', 'Middle2': 'Mid2', 'Middle3': 'Mid3', 'SF': 'SF', 'AG': 'AG' };

    // ⚠️ 정렬은 실제로 렌더되는 visibleTrades에 적용해야 한다(과거엔 allTrades만 정렬해
    //    필터로 새 배열이 된 visibleTrades에는 반영되지 않아 정렬이 무효였다).
    //    청산일 최신 → 위, 과거 → 아래.
    visibleTrades.sort((a, b) => {
      const sellA = String(a.sellDate || a.sell_date || "");
      const sellB = String(b.sellDate || b.sell_date || "");
      if (sellA !== sellB) return sellB.localeCompare(sellA);
      const buyA = String(a.buyDate || a.buy_date || "");
      const buyB = String(b.buyDate || b.buy_date || "");
      return buyB.localeCompare(buyA);
    });

    tbody.innerHTML = visibleTrades.map(t => {
      const slot = t.slotNum;
      let buyDate = parseDateStr(t.buyDate || t.buy_date || "-");
      let sellDate = parseDateStr(t.sellDate || t.sell_date || "-");

      if (buyDate && buyDate.includes('-') && buyDate.length === 10) {
        buyDate = buyDate.substring(2);
      }
      if (sellDate && sellDate.includes('-') && sellDate.length === 10) {
        sellDate = sellDate.substring(2);
      }

      // 키움 최근 ~7거래일 체결(매도)과 행 단위로 대조한 상태.
      const rawSellDate = String(t.sellDate || t.sell_date || "");
      const normalizedSellDateForLookup = normalizeDateKey(rawSellDate);
      const buyDateStr = String(t.buyDate || t.buy_date || "");
      const rowKeyLookup = `${stripA(t.ticker)}|${normalizedSellDateForLookup}|${buyDateStr}`;
      const rowStatusObj = sellStatusByRowKey.get(rowKeyLookup) || { status: 'pending', mismatchQty: 0 };
      const rowStatus = rowStatusObj.status;
      const mismatchQty = rowStatusObj.mismatchQty || 0;
      const isOversold = rowStatus === 'oversold';
      const isMismatch = rowStatus === 'mismatch' || isOversold;
      const mmStyle = isMismatch ? "color:#ef4444; font-weight:700;" : "";
      const mmTitle = isOversold
        ? `title="키움에서 예상보다 많이 매도됨 — 앱 예상 ${Math.round(rowStatusObj.appQty || 0)}주 / 키움 실제 ${Math.round(rowStatusObj.liveQty || 0)}주"`
        : (isMismatch ? 'title="이 행의 수량이 키움 체결내역과 부분 불일치"' : "");

      // 일치 컬럼(보유현황과 동일 개념): 일치/과매도/불일치/보류. 팔린 내역 행은 배경색으로 강조.
      let reconcile, rowBg;
      if (rowStatus === 'match') {
        reconcile = { text: '일치', icon: '✓', color: '#10b981' };
        rowBg = 'background:rgba(16,185,129,0.10);';
      } else if (isOversold) {
        // 앱 예상보다 실제로 더 팔린 경우(개인 보유분까지 매도 등). 초과 수량을 표시.
        reconcile = { text: `${Math.round(rowStatusObj.overQty || 0)}과매도`, icon: '', color: '#f59e0b' };
        rowBg = 'background:rgba(245,158,11,0.12);';
      } else if (rowStatus === 'mismatch') {
        const mismatchText = mismatchQty > 0 ? `${Math.round(mismatchQty)}매도X` : `${Math.round(t.qty || 0)}미체결`;
        reconcile = { text: mismatchText, icon: '', color: '#ef4444' };
        rowBg = 'background:rgba(239,68,68,0.12);';
      } else {
        reconcile = { text: '보류', icon: '△', color: '#94a3b8' };
        rowBg = 'background:rgba(255,255,255,0.03);';
      }
      const reconcileTitle = isMismatch ? mmTitle
        : (rowStatus === 'pending' ? 'title="키움 체결 대조 대기 — 최근 체결내역에 없거나 조회 범위(약 7거래일)를 벗어남"' : 'title="키움 체결과 일치"');

      const mode = modeMap[t.mode] || t.mode || "-";
      const tier = t.tier || "-";
      const buyPrice = Number(t.buy_price !== undefined ? t.buy_price : (t.buyPrice || 0));
      const sellPrice = Number(t.sell_price !== undefined ? t.sell_price : (t.sellPrice || 0));
      const qty = t.qty || 0;
      const profit = Number(t.profit !== undefined ? t.profit : 0);

      const profitClass = profit > 0 ? "profit-plus" : (profit < 0 ? "profit-minus" : "");
      const sign = profit < 0 ? "-" : "";
      let profitStr = "";
      if (true) {
        profitStr = sign + Math.round(Math.abs(profit) * currentFXRate / 10000).toLocaleString() + "만";
      } else {
        profitStr = sign + "$" + Math.abs(profit).toLocaleString(undefined, {minimumFractionDigits: 2});
      }

      let buyPriceStr = "";
      let sellPriceStr = "";
      if (true) {
        buyPriceStr = "₩" + Math.round(buyPrice * currentFXRate).toLocaleString();
        sellPriceStr = "₩" + Math.round(sellPrice * currentFXRate).toLocaleString();
      } else {
        buyPriceStr = "$" + buyPrice.toLocaleString(undefined, {minimumFractionDigits: 2});
        sellPriceStr = "$" + sellPrice.toLocaleString(undefined, {minimumFractionDigits: 2});
      }

      const stockName = window.getSlotStockName ? window.getSlotStockName(slot) : "-";

      return `<tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.03); ${rowBg}">
        <td style="width:9%; padding:2px 1px; text-align:center; color:${reconcile.color}; font-size:9px; font-weight:800; white-space:nowrap;" ${reconcileTitle}>${reconcile.icon} ${reconcile.text}</td>
        <td style="width:9%; padding:2px 1px; text-align:center; color:${SLOT_COLORS[(slot-1)%SLOT_COLORS.length]}; font-weight:700; font-size:10px;">#${slot}</td>
        <td style="width:10%; padding:2px 1px; text-align:center; font-size:9.5px;">${stockName}</td>
        <td style="width:11%; padding:2px 1px; text-align:center; font-size:10px;">${buyDate}</td>
        <td class="sell-price" style="width:11%; padding:2px 1px; text-align:center; font-size:10px; ${mmStyle}" ${mmTitle}>${sellDate}</td>
        <td style="width:9%; padding:2px 1px; text-align:center; font-size:10px;">${mode}/T${tier}</td>
        <td style="width:10%; padding:2px 1px; text-align:center; font-size:10px;">${buyPriceStr}</td>
        <td class="sell-price" style="width:10%; padding:2px 1px; text-align:center; font-size:10px; ${mmStyle}" ${mmTitle}>${sellPriceStr}</td>
        <td style="width:7%; padding:2px 1px; text-align:center; font-size:10px; ${mmStyle}" ${mmTitle}>${qty}</td>
        <td style="width:14%; padding:2px 1px; text-align:center; font-size:10px; white-space:nowrap;" class="${profitClass}">${profitStr}</td>
      </tr>`;
    }).join('');
    applyPrimaryDateHighlight();
    refreshKiwoom7dFillsCache(); // fire-and-forget; 7일 체결 대조 데이터 갱신 후 재렌더
  } catch (e) {
    console.error("[매매내역] 렌더링 중 런타임 오류 발생:", e);
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:20px; color:var(--danger);">매매 내역 로딩 중 오류가 발생했습니다. (콘솔 확인 요망)</td></tr>`;
  }
}

function buildTradeLogsFromDailyStates(dailyStates) {
  return (dailyStates || []).map(state => [
    state.date,
    state.asset,
    state.inout || 0,
    state.json
  ]);
}

function reconstructRealTrades(logs, slotNum) {
  if (!logs || logs.length === 0) return [];

  const sortedLogs = logs.map(r => {
    let dt = parseDateStr(r[0]);
    let jsonStr = r[3] || "{}";
    let parsed = {};
    try { parsed = JSON.parse(jsonStr); } catch(e) {}
    return { date: dt, holdings: parsed.holdings || [] };
  }).filter(l => l.date).sort((a, b) => a.date.localeCompare(b.date));

  const reconstructed = [];

  const getBuyDate = (item) => item.buyDate || item.buy_date || "";
  const getMode = (item) => String(item.mode || "").trim();
  const getTier = (item) => String(item.tier || "").trim();

  for (let i = 0; i < sortedLogs.length - 1; i++) {
    const curLog = sortedLogs[i];
    const nextLog = sortedLogs[i+1];

    const curHoldings = curLog.holdings;
    const nextHoldings = nextLog.holdings;

    const curMap = {};
    curHoldings.forEach(item => {
      const k = `${getBuyDate(item)}_${getMode(item)}_${getTier(item)}`;
      if (!curMap[k]) {
        curMap[k] = {
          buyDate: getBuyDate(item),
          mode: item.mode,
          tier: item.tier,
          qty: 0,
          buy_price: parseFloat(item.buy_price || item.buyPrice || 0)
        };
      }
      curMap[k].qty += parseFloat(item.qty || 0);
    });

    const nextMap = {};
    nextHoldings.forEach(item => {
      const k = `${getBuyDate(item)}_${getMode(item)}_${getTier(item)}`;
      if (!nextMap[k]) {
        nextMap[k] = { qty: 0 };
      }
      nextMap[k].qty += parseFloat(item.qty || 0);
    });

    Object.keys(curMap).forEach(k => {
      const curItem = curMap[k];
      const nextItem = nextMap[k];

      const curQty = curItem.qty;
      const nextQty = nextItem ? nextItem.qty : 0;

      const soldQty = curQty - nextQty;

      if (soldQty > 0 && !isNaN(soldQty)) {
        const buyDate = curItem.buyDate || curLog.date;
        const sellDate = nextLog.date;

        let buyPrice = Number(getClosePriceOnDate(buyDate, slotNum) || curItem.buy_price || 0);
        let sellPrice = Number(getClosePriceOnDate(sellDate, slotNum) || 0);

        if (buyPrice === 0 || isNaN(buyPrice)) buyPrice = Number(curItem.buy_price || 0);
        if (sellPrice === 0 || isNaN(sellPrice)) {
          try {
            const stratName = slotConfigs[slotNum]?.basics?.strategy || "";
            const modeData = MASTER_STRATEGIES[stratName]?.modes[curItem.mode];
            if (modeData) {
              const sellPct = modeData.sell[curItem.tier - 1] || modeData.sell[0];
              sellPrice = Math.ceil((buyPrice * (1 + sellPct) * 100) - 0.000001) / 100;
            } else {
              sellPrice = buyPrice;
            }
          } catch(e) {
            sellPrice = buyPrice;
          }
        }

        const cfg = slotConfigs[slotNum];
        const fBuy = (cfg && cfg.basics) ? (parseFloat(cfg.basics.fBase) || 0) / 100 : 0.0008;
        const fSec = (cfg && cfg.basics) ? (parseFloat(cfg.basics.fSec) || 0) / 100 : 0.0000278;

        const safeFBuy = isNaN(fBuy) ? 0.0008 : fBuy;
        const safeFSec = isNaN(fSec) ? 0.0000278 : fSec;
        const safeFSell = safeFBuy + safeFSec;

        const buyCost = soldQty * buyPrice * (1 + safeFBuy);
        const sellNet = soldQty * sellPrice * (1 - safeFSell);
        let profit = sellNet - buyCost;
        if (isNaN(profit)) profit = 0;

        reconstructed.push({
          slotNum: slotNum,
          buyDate: buyDate,
          sellDate: sellDate,
          mode: curItem.mode,
          tier: curItem.tier,
          buyPrice: buyPrice,
          sellPrice: sellPrice,
          qty: soldQty,
          profit: profit
        });
      }
    });
  }

  return reconstructed;
}

// getClosePriceOnDate는 매매내역 재구성 시 로그 한 건마다(수백~수천 회) 호출된다.
// 예전 구현은 매 호출마다 mainData.dates 전체(수백~1000+ 행)를 다시
// formatDateNY+parseDateStr로 변환하며 선형 스캔했다 — 슬롯 하나 재구성에 5초+ 걸리는
// 원인이었다. 같은 mainData에 대해 날짜→인덱스 맵을 한 번만 만들어 캐싱한다.
const __closePriceDateMapCache = new WeakMap(); // mainData -> Map(dateStr -> index)

function getClosePriceOnDate(dateStr, slotNum) {
  const mainData = (window.globalMainDataSlot && window.globalMainDataSlot[slotNum]) || window.globalMainData;
  if (!mainData || !mainData.dates) return null;
  const targetDate = parseDateStr(dateStr);

  let dateMap = __closePriceDateMapCache.get(mainData);
  if (!dateMap) {
    dateMap = new Map();
    for (let i = 0; i < mainData.dates.length; i++) {
      dateMap.set(parseDateStr(formatDateNY(mainData.dates[i])), i);
    }
    __closePriceDateMapCache.set(mainData, dateMap);
  }

  const exactIdx = dateMap.get(targetDate);
  if (exactIdx !== undefined) {
    return mainData.close[exactIdx];
  }

  // 정확히 일치하는 거래일이 없으면(주말/공휴일) 그 이전 마지막 거래일 종가를 사용.
  // 날짜는 오름차순으로 들어오므로 맵 순회 자체는 O(n)이지만, 문자열 비교만 하므로
  // (formatDateNY/parseDateStr 재계산 없이) 예전 구현보다 훨씬 저렴하다.
  let bestIdx = -1;
  for (const [dStr, idx] of dateMap) {
    if (dStr <= targetDate) bestIdx = idx;
    else break;
  }
  return bestIdx !== -1 ? mainData.close[bestIdx] : null;
}

// 브로커 전환 시 호출: "키움/한투 매수매도 내역"(fills) 뷰를 보고 있었다면 새 증권사의
// fills 뷰로 즉시 갈아탄다. "실전 매도 내역"(strategy) 뷰는 이미 isSlotActive로 필터링되므로
// 그대로 둔다.
function syncHistoryViewModeToBroker() {
  if (historyViewMode !== 'kiwoom' && historyViewMode !== 'kis') return;
  const broker = window.brokerService ? window.brokerService.getBroker() : 'kiwoom';
  const wantMode = broker === 'kis' ? 'kis' : 'kiwoom';
  if (historyViewMode === wantMode) return;
  historyViewMode = wantMode;
  const title = document.getElementById('historyTitle');
  if (title) title.textContent = wantMode === 'kis' ? '📋 한투 매수·매도 내역' : '📋 키움 매수·매도 내역';
  if (wantMode === 'kiwoom') { kiwoomFillsCache = null; renderKiwoomFills(); }
  else { renderKisFills(); }
}

if (!window.UI) window.UI = {};
if (!window.UI.tradeHistory) window.UI.tradeHistory = {};
window.UI.tradeHistory.renderDBTradeHistory = renderDBTradeHistory;
window.UI.tradeHistory.toggleView = toggleView;
window.UI.tradeHistory.syncHistoryViewModeToBroker = syncHistoryViewModeToBroker;
window.UI.tradeHistory.resetToStrategyHistory = resetToStrategyHistory;
window.UI.tradeHistory.buildTradeLogsFromDailyStates = buildTradeLogsFromDailyStates;
window.UI.tradeHistory.reconstructRealTrades = reconstructRealTrades;

window.toggleView = toggleView;
window.toggleTradeHistoryView = toggleView;

window.toggleView = toggleView;
window.UI.tradeHistory.toggleView = toggleView;
window.UI.tradeHistory.toggleHistoryView = toggleView;

window.toggleView = toggleView;
window.UI.tradeHistory.toggleView = toggleView;
