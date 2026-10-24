// ui/render-trade-history.js - 실전 매도내역 렌더링 (백업에서 복구됨)

let lastTradeHistoryRenderSignature = '';
let historyMonthOffset = 0;
let historyScrollBound = false;
let historyDisplayLimit = 20; // ⭐️ 첫 화면 20개 표시, 스와이프/스크롤 시 20개씩 점진적 로딩
let totalTradesCount = 0;
let brokerFillsDisplayLimit = 20; // ⭐️ 키움/LS 체결내역도 첫 화면 20개 표시
let lastBrokerFillsRows = [];
let lastBrokerFillsBroker = '';
let historyViewMode = 'strategy'; // 기본은 실전 매도내역 (내역모드 진입 시 항상 이 화면)

// 🛡️ [40영업일 가드] 최근 40영업일(달력 약 60일) 컷오프 날짜 계산
function getCutoffTradingDay(tradingDaysCount = 40) {
  try {
    let allMarketDates = new Set();
    const maxSlots = (typeof MAX_SLOTS !== 'undefined' ? MAX_SLOTS : 12);
    for (let i = 1; i <= maxSlots; i++) {
      const res = window.lastBTResults?.[i];
      if (res && Array.isArray(res.chartDates)) {
        res.chartDates.forEach(d => {
          const k = typeof normalizeDateKey === 'function' ? normalizeDateKey(d) : String(d).trim();
          if (k) allMarketDates.add(k);
        });
      }
    }
    const sortedDates = Array.from(allMarketDates).sort();
    if (sortedDates.length >= tradingDaysCount) {
      return sortedDates[sortedDates.length - tradingDaysCount];
    }
  } catch (e) { }

  try {
    const now = new Date();
    const nyTimeStr = now.toLocaleString("en-US", { timeZone: "America/New_York" });
    let cur = new Date(nyTimeStr);
    let counted = 0;
    let cutoff = "";
    const isHolidayFn = (typeof isUSMarketHoliday === 'function') ? isUSMarketHoliday : (typeof window !== 'undefined' && window.dateHelpers?.isUSMarketHoliday);

    for (let i = 0; i < 200 && counted < tradingDaysCount; i++) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      const ymd = `${y}-${m}-${d}`;
      const dow = cur.getDay();

      const isWeekend = (dow === 0 || dow === 6);
      const isHoliday = isHolidayFn ? isHolidayFn(ymd) : false;

      if (!isWeekend && !isHoliday) {
        counted++;
        cutoff = ymd;
      }
      cur.setDate(cur.getDate() - 1);
    }
    return cutoff;
  } catch (e) {
    const d = new Date(Date.now() - 60 * 86400000);
    return typeof normalizeDateKey === 'function' ? normalizeDateKey(d) : d.toISOString().split('T')[0];
  }
}

// 실전 매도내역(strategy) 표의 thead (index.html 정적 헤더와 동일: 일치 컬럼 포함 10열)
function strategyHistoryTheadHtml() {
  const isLight = typeof document !== 'undefined' && document.body && document.body.classList.contains('light-mode');
  const borderCol = isLight ? 'rgba(15, 23, 42, 0.1)' : 'rgba(255, 255, 255, 0.07)';
  const textMuted = isLight ? '#64748b' : '#94a3b8';
  return `<tr style="border-bottom:1px solid ${borderCol}; color:${textMuted}; font-weight:700;">`
    + '<th style="width:52px; text-align:center;">일치</th>'
    + '<th style="text-align:center;">슬롯</th>'
    + '<th style="text-align:center;">종목</th>'
    + '<th style="text-align:center;">진입일</th>'
    + '<th style="text-align:center;">청산일</th>'
    + '<th style="text-align:center;">모드/T</th>'
    + '<th style="text-align:center;">진입가</th>'
    + '<th style="text-align:center;">청산가</th>'
    + '<th style="text-align:center;">수량</th>'
    + '<th style="text-align:center;">T수익금</th></tr>';
}

function kiwoomHistoryTheadHtml() {
  const isLight = typeof document !== 'undefined' && document.body && document.body.classList.contains('light-mode');
  const borderCol = isLight ? 'rgba(15, 23, 42, 0.1)' : 'rgba(255, 255, 255, 0.07)';
  const textMuted = isLight ? '#64748b' : '#94a3b8';
  return `<tr style="border-bottom:1px solid ${borderCol}; color:${textMuted}; font-weight:700;">`
    + '<th style="width:10%; padding:2px 1px; text-align:center; font-size:11px;">상태</th>'
    + '<th style="width:9%; padding:2px 1px; text-align:center; font-size:11px;">구분</th>'
    + '<th style="width:10%; padding:2px 1px; text-align:center; font-size:11px;">종목</th>'
    + '<th style="width:13%; padding:2px 1px; text-align:center; font-size:11px;">시간</th>'
    + '<th style="width:11%; padding:2px 1px; text-align:center; font-size:11px;">주문가</th>'
    + '<th style="width:11%; padding:2px 1px; text-align:center; font-size:11px;">체결가</th>'
    + '<th style="width:9%; padding:2px 1px; text-align:center; font-size:11px;">수량</th>'
    + '<th style="width:14%; padding:2px 1px; text-align:center; font-size:11px; white-space:nowrap;">수익금</th>'
    + '<th style="width:13%; padding:2px 1px; text-align:center; font-size:11px;">수수료</th></tr>';
}

function resetToStrategyHistory() {
  historyViewMode = 'strategy';
  historyMonthOffset = 0;
  historyDisplayLimit = 20;
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
async function toggleView() {
  const broker = window.BrokerService ? window.BrokerService.activeBroker : 'kiwoom';
  const fillsMode = (broker === 'ls' || broker === 'meritz') ? broker : 'kiwoom';
  historyViewMode = historyViewMode === 'strategy' ? fillsMode : 'strategy';

  const title = document.getElementById('historyTitle') || document.getElementById('historyModeTitle');
  if (title) {
    title.textContent = historyViewMode === 'ls' ? '📋 LS증권 매매내역'
      : historyViewMode === 'meritz' ? '📋 메리츠증권 매매내역'
      : historyViewMode === 'kiwoom' ? '📋 키움증권 매매내역' : '📜 실전 매도 내역';
  }

  const thead = document.querySelector('#historyTable thead');
  if (historyViewMode === 'kiwoom' || historyViewMode === 'meritz' || historyViewMode === 'ls') {
    if (thead) thead.innerHTML = kiwoomHistoryTheadHtml();
    return renderBrokerFills(historyViewMode);
  }

  // 'strategy' 모드 복귀 시: 헤더를 실전매도내역(10열)으로 원복하고 DB 거래내역 재렌더링
  lastTradeHistoryRenderSignature = '';
  historyDisplayLimit = 20;
  if (thead) thead.innerHTML = strategyHistoryTheadHtml();
  renderDBTradeHistory();
}

function bindHistoryScrollListener(tbody) {
  if (!tbody) return;
  const scrollHost = tbody.closest('.slim-scroll');
  if (scrollHost && !historyScrollBound) {
    historyScrollBound = true;

    scrollHost.addEventListener('scroll', () => {
      if (scrollHost.scrollTop + scrollHost.clientHeight >= scrollHost.scrollHeight - 40) {
        loadMoreTradeHistory();
      }
    }, { passive: true });

    let touchStartY = null;
    scrollHost.addEventListener('touchstart', (e) => {
      touchStartY = e.touches[0].clientY;
    }, { passive: true });
    scrollHost.addEventListener('touchend', (e) => {
      if (touchStartY === null) return;
      const deltaY = touchStartY - e.changedTouches[0].clientY;
      touchStartY = null;
      if (deltaY > 30) { // 위로 스와이프 = 아래로 스크롤하여 더 보기 의도
        loadMoreTradeHistory();
      }
    }, { passive: true });
    scrollHost.addEventListener('wheel', (e) => {
      if (e.deltaY > 20 && (scrollHost.scrollTop + scrollHost.clientHeight >= scrollHost.scrollHeight - 40 || scrollHost.scrollHeight <= scrollHost.clientHeight + 10)) {
        loadMoreTradeHistory();
      }
    }, { passive: true });
  }
}

function renderBrokerFillsRowsHtml(broker, rows) {
  const tbody = document.getElementById('historyTableBody');
  if (!tbody) return;
  const isLight = typeof document !== 'undefined' && document.body && document.body.classList.contains('light-mode');
  const textColor = isLight ? '#0f172a' : '#f8fafc';
  const textMuted = isLight ? '#64748b' : '#94a3b8';
  const buyColor = '#8b5cf6'; // 통합 보유현황 진입일 보라색
  const sellColor = 'var(--success, #10b981)'; // 실전 매도내역 청산일 녹색
  const borderCol = isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)';

  const visibleRows = rows.slice(0, brokerFillsDisplayLimit);

  let html = visibleRows.map(r => {
    const sideStr = String(r.side || r.io_tp_nm || '').toUpperCase();
    const isBuy = sideStr.includes('BUY') || sideStr.includes('매수');
    const qty = Math.abs(Number(r.qty || r.cntr_qty || r.ord_qty) || 0);
    const buyPric = Number(r.ord_pric || r.price) || 0;
    const cntrPric = Number(r.cntr_pric || r.price) || 0;
    let statusStr = r.ord_stt || r.status || '체결';
    if (statusStr.includes('체결') || statusStr.includes('완료') || statusStr.includes('부분') || statusStr === '접수완료') {
      statusStr = '체결';
    }

    // ⭐️ 상태 색상 (체결: 파란색 통일)
    let statusColor = textMuted;
    if (statusStr === '체결') {
      statusColor = isLight ? '#1d4ed8' : '#3b82f6';
    } else if (statusStr.includes('취소')) {
      statusColor = '#ef4444'; // 불일치/취소와 동일한 빨간색
    }

    // ⭐️ 체결 시간 포맷팅: 년/월/일 + 시:분:초 (좁은 칸 가독성 최적화)
    const rawTime = String(r.time || r.cntr_tm || r.ord_tm || '-').trim();
    const mDateRaw = String(r.marketDate || r.date || '').replace(/[^0-9]/g, '');
    const mDateShort = mDateRaw.length === 8 ? `${mDateRaw.slice(4, 6)}/${mDateRaw.slice(6, 8)}` : '';
    let displayTime = rawTime;
    let fullTimeTitle = rawTime;

    if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2})?$/.test(rawTime)) {
      const parts = rawTime.split(/\s+/);
      const dp = parts[0].split('-');
      displayTime = `${dp[1]}/${dp[2]} ${parts[1]}`;
      fullTimeTitle = rawTime;
    } else if (/^\d{6}$/.test(rawTime)) {
      const hhmmss = `${rawTime.slice(0, 2)}:${rawTime.slice(2, 4)}:${rawTime.slice(4, 6)}`;
      displayTime = mDateShort ? `${mDateShort} ${hhmmss}` : hhmmss;
      fullTimeTitle = (r.marketDate ? `${r.marketDate} ` : '') + hhmmss;
    } else if (mDateShort && r.timeKst) {
      displayTime = `${mDateShort} ${r.timeKst}`;
      fullTimeTitle = (r.marketDate ? `${r.marketDate} ` : '') + r.timeKst;
    }

    const feeVal = Number(r.tdy_trde_cmsn || r.fee) || 0;
    const pnlVal = Number(r.rlzt_pl || r.pnl) || 0;

    const usd = (v) => "$" + Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const pnlClass = pnlVal > 0 ? "profit-plus" : (pnlVal < 0 ? "profit-minus" : "");
    const profitCell = !isBuy
      ? (pnlVal !== 0 ? `<td style="width:14%; padding:2px 1px; text-align:center; font-size:10px; white-space:nowrap;" class="${pnlClass}">${pnlVal > 0 ? '+' : ''}${usd(pnlVal)}</td>` : `<td style="width:14%; padding:2px 1px; text-align:center; font-size:10px; color:${textMuted};">-</td>`)
      : `<td style="width:14%; padding:2px 1px; text-align:center; font-size:10px; color:${textMuted};">-</td>`;

    // ⭐️ 구분별(매수: 보라색 #8b5cf6, 매도: 녹색 var(--success)) 체결가 및 수량 색상 동기화
    const tradeColor = isBuy ? buyColor : sellColor;

    return `<tr data-market-date="${r.marketDate || r.date || ''}" style="border-bottom:1px solid ${borderCol};">
      <td style="width:10%; padding:2px 1px; text-align:center; font-size:10px; color:${statusColor}; white-space:nowrap;">${statusStr}</td>
      <td style="width:9%; padding:2px 1px; text-align:center; font-size:10px; color:${tradeColor}; white-space:nowrap;">${isBuy ? '매수' : '매도'}</td>
      <td style="width:10%; padding:2px 1px; text-align:center; font-size:10px; color:${textColor};">${r.symbol || r.stk_nm || (typeof getSoleActiveTicker === 'function' ? getSoleActiveTicker() : 'SOXL')}</td>
      <td style="width:13%; padding:2px 1px; text-align:center; font-size:10px; color:${tradeColor}; white-space:nowrap;" title="${escapeTradeHistoryHtml(fullTimeTitle)}">${displayTime}</td>
      <td style="width:11%; padding:2px 1px; text-align:center; font-size:10px; color:${textColor};">$${buyPric.toFixed(2)}</td>
      <td style="width:11%; padding:2px 1px; text-align:center; font-size:10px; color:${tradeColor};">$${cntrPric.toFixed(2)}</td>
      <td style="width:9%; padding:2px 1px; text-align:center; font-size:10px; color:${tradeColor};">${qty.toLocaleString()}주</td>
      ${profitCell}
      <td style="width:13%; padding:2px 1px; text-align:center; font-size:10px;">${feeVal > 0 ? usd(feeVal) : '-'}</td>
    </tr>`;
  }).join('');

  if (visibleRows.length < rows.length) {
    html += `<tr style="border-bottom: 1px dashed ${borderCol};">
      <td colspan="9" style="text-align:center; padding:8px 0; color:${textMuted}; font-size:10px; cursor:pointer;" onclick="if(window.UI && window.UI.tradeHistory && window.UI.tradeHistory.loadMore) window.UI.tradeHistory.loadMore();">
        ⬇ 더 보기 (${visibleRows.length} / ${rows.length}) — 스와이프 또는 터치 시 +20개
      </td>
    </tr>`;
  }

  tbody.innerHTML = html;
  bindHistoryScrollListener(tbody);
  applyPrimaryDateHighlight();
}

async function renderBrokerFills(broker) {
  const tbody = document.getElementById('historyTableBody');
  const thead = document.querySelector('#historyTable thead');
  if (!tbody) return;
  bindHistoryScrollListener(tbody);
  brokerFillsDisplayLimit = 20; // ⭐️ 조회 시 20개로 초기화
  lastBrokerFillsRows = [];
  lastBrokerFillsBroker = broker;
  const label = broker === 'ls' ? 'LS증권' : (broker === 'meritz' ? '메리츠증권' : '키움증권');
  const isLight = typeof document !== 'undefined' && document.body && document.body.classList.contains('light-mode');
  const textMuted = isLight ? '#64748b' : '#94a3b8';
  const theadBorderCol = isLight ? 'rgba(15, 23, 42, 0.1)' : 'rgba(255, 255, 255, 0.07)';

  if (thead) {
    thead.innerHTML = kiwoomHistoryTheadHtml();
  }

  tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:20px;color:${textMuted};">${label} 해외주식 체결내역 조회 중...</td></tr>`;

  try {
    let data = null;
    if (window.BrokerReconcile && window.BrokerReconcile.getFills) {
      data = await window.BrokerReconcile.getFills(broker, false, 60);
    } else if (window.BrokerService && window.BrokerService.fetchOverseasFills) {
      data = await window.BrokerService.fetchOverseasFills(broker, 60);
    }

    if (!data || data.success === false) {
      const errMsg = (data && data.error) || "체결내역 응답 없음";
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:20px;color:#f43f5e;">${label} 해외주식 체결내역 조회 실패<br/><span style="font-size:9.5px;opacity:0.8;">${errMsg}</span></td></tr>`;
      return;
    }

    const rows = Array.isArray(data.executions) ? data.executions : (Array.isArray(data.rows) ? data.rows : []);
    if (!rows.length) {
      lastBrokerFillsRows = [];
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:20px;color:${textMuted};">${label} 해외주식 체결내역이 없습니다</td></tr>`;
      return;
    }

    const sortKey = (r) => `${String(r.marketDate || r.date || "")} ${String(r.timeKst || r.time || "")}`;
    lastBrokerFillsRows = rows.slice().sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
    lastBrokerFillsBroker = broker;
    renderBrokerFillsRowsHtml(broker, lastBrokerFillsRows);
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:20px;color:#f43f5e;">${label} 해외주식 체결내역 연동 실패<br/><span style="font-size:9.5px;opacity:0.8;">${e.message}</span></td></tr>`;
  }
}

// KIS는 초당 요청 한도가 엄격해 캐시 없이는 바로 rate limit(초당 거래건수 초과)에 걸린다.
// getKisFillsCached 자체가 1분 캐시를 두는 이유.
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

async function renderKiwoomFills() { return renderBrokerFills('kiwoom'); }

// ⚠️ 2026-07-30까지 이 아래에 App1(국내 키움) 프록시(`KIWOOM_API_BASE || 'http://localhost:8787'`,
// ka10076/kt00009 등 국내 필드)를 참조하는 별도의 매도 대조 파이프라인이 있었다
// (getKiwoomFillsCached/loadKiwoom7dFills/getKiwoom7dSellReconcile 등). 골든 룰 8이 금지하는
// App1 프록시에 의존했을 뿐 아니라, 애초에 해외주식 체결과 무관한 데이터라 슬롯이 LS(4~6)여도
// 항상 "키움" 체결로만 표시됐다(사용자 실증). 통합 보유현황(render-holdings.js)이 쓰는
// window.BrokerReconcile(broker3-proxy 기반, 키움+LS 실제 해외주식 체결)로 완전히 교체했다 —
// 아래 renderDBTradeHistory()의 대조 로직을 참고.
let sellReconcileRefreshInFlight = false;
let sellReconcileRefreshedAt = 0;
async function refreshSellReconcileFills() {
  if (sellReconcileRefreshInFlight) return;
  if (Date.now() - sellReconcileRefreshedAt < 60000) return; // 1분 캐시
  if (!window.BrokerReconcile) return;
  sellReconcileRefreshInFlight = true;
  try {
    await window.BrokerReconcile.refreshFills();
    sellReconcileRefreshedAt = Date.now();
    if (historyViewMode === 'strategy') {
      lastTradeHistoryRenderSignature = '';
      renderDBTradeHistory();
    }
  } catch (e) {
    console.warn('[매매내역] 체결 대조 데이터 갱신 실패:', e.message);
  } finally {
    sellReconcileRefreshInFlight = false;
  }
}

function renderDBTradeHistory() {
  if (historyViewMode === 'ls') {
    const title = document.getElementById('historyTitle') || document.getElementById('historyModeTitle');
    if (title) title.textContent = '📋 LS증권 매매내역';
    renderBrokerFills('ls');
    return;
  }
  if (historyViewMode === 'kiwoom') {
    const title = document.getElementById('historyTitle') || document.getElementById('historyModeTitle');
    if (title) title.textContent = '📋 키움증권 매매내역';
    renderBrokerFills('kiwoom');
    return;
  }
  if (historyViewMode === 'kis') {
    const title = document.getElementById('historyTitle') || document.getElementById('historyModeTitle');
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
      if (isSlotActive(i) && (!window.BrokerService || window.BrokerService.isSlotForBroker(i))) {
        const res = lastBTResults[i];
        if (res) {
          const slotCfg = (typeof slotConfigs !== 'undefined' && slotConfigs?.[i]) || (typeof window !== 'undefined' && window.slotConfigs?.[i]);
          const slotStartDate = slotCfg?.basics?.startDate ? normalizeDateKey(slotCfg.basics.startDate) : "";

          // 1) 현재 투자법 운용 기간 (sellDate >= slotStartDate) 매매: res.trades에서 추출 (정확한 현재 전략 데이터)
          let currentStratTrades = Array.isArray(res.trades) ? res.trades : [];
          if (slotStartDate) {
            currentStratTrades = currentStratTrades.filter(t => {
              const sellD = normalizeDateKey(t.sellDate || t.sell_date);
              return sellD && sellD >= slotStartDate;
            });
          }

          // 2) 투자설정 시작일 이전 (sellDate < slotStartDate) 매매: 시트 보유 꾸러미 증감(방법 2)으로 정밀 복원
          let pastReconstructedTrades = [];
          const sheetLogs = (window.lastMyPerfData && window.lastMyPerfData[`strat${i}`]?.logs)
            || (res.sheetLogs && res.sheetLogs.length > 0 ? res.sheetLogs : null)
            || (res.dailyStates && buildTradeLogsFromDailyStates(res.dailyStates))
            || null;

          if (sheetLogs && sheetLogs.length > 0) {
            const allReconstructed = reconstructRealTrades(sheetLogs, i);
            if (slotStartDate) {
              pastReconstructedTrades = allReconstructed.filter(t => {
                const sellD = normalizeDateKey(t.sellDate || t.sell_date);
                return sellD && sellD < slotStartDate;
              });
            } else if (currentStratTrades.length === 0) {
              pastReconstructedTrades = allReconstructed;
            }
          }

          // 만약 sheetLogs로부터 복원하지 못했더라도, res.trades에 이미 시작일 이전 거래가 남아있다면 보존
          if (pastReconstructedTrades.length === 0 && slotStartDate && Array.isArray(res.trades)) {
            pastReconstructedTrades = res.trades.filter(t => {
              const sellD = normalizeDateKey(t.sellDate || t.sell_date);
              return sellD && sellD < slotStartDate;
            });
          }

          // 3) 과거 시트 복원 매매 + 현재 투자법 매매 병합
          let trades = pastReconstructedTrades.concat(currentStratTrades);

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
              ticker: (slotCfg?.basics?.ticker) || window.slotConfigs?.[i]?.basics?.ticker || t.ticker || "SOXL",
              sellPrice: finalPrice,
              sell_price: finalPrice
            };
          });

          allTrades = allTrades.concat(slotTrades);
        } else {
        }
      }
    }
    // 🛡️ [40영업일 가드] 최근 40영업일(달력 약 60일) 이내 청산된 매도 내역만 유지 (투자법 변경 시 과거 매매 대조 왜곡 방지)
    const cutoff40TradingDays = getCutoffTradingDay(40);
    if (cutoff40TradingDays) {
      allTrades = allTrades.filter(t => {
        const rawSell = String(t.sellDate || t.sell_date || "");
        const normalizedSell = normalizeDateKey(rawSell);
        if (!normalizedSell) return false;
        return normalizedSell >= cutoff40TradingDays;
      });
    }

    if (allTrades.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:20px; color:#64748b;">최근 40영업일 내 매매 내역이 없습니다</td></tr>`;
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

    // 최근 체결(해외주식, 브로커별)과 대조: 종목+청산일+브로커 단위로 수량/체결가를 비교한다.
    // ⚠️ 날짜 포맷 통일: 앱의 청산일 형태(26/07/21, 2026.7.21 등)를 normalizeDateKey로 YYYY-MM-DD로 변환
    // window.BrokerReconcile이 키움+LS 양쪽의 실제 해외주식 체결(broker3-proxy)을 이미 캐시해 두므로
    // 그 상태(state.sell/coveredDates)를 슬롯의 실제 브로커(brokerForSlot) 기준으로 조회한다.
    const stripA = s => String(s || '').replace(/^A/i, '').trim();
    const BR = window.BrokerReconcile;
    const reconcileState = BR ? BR.state : null;
    // 종목+청산일+브로커별 각 행의 reconciliation 상태를 결정
    // 같은 그룹 내 행들을 진입일 역순으로 정렬한 후, 매도된 수량을 상위부터 차감
    const sellStatusByRowKey = new Map(); // (broker|ticker|sellDate|buyDate) → status & mismatchQty
    const groupedByTicker = new Map(); // broker|ticker|sellDate → [{buyDate, qty}, ...]

    allTrades.forEach(t => {
      const rawSellDate = String(t.sellDate || t.sell_date || "");
      const ticker = stripA(t.ticker);
      if (!ticker || !rawSellDate) return;
      const normalizedSellDate = normalizeDateKey(rawSellDate);
      if (!normalizedSellDate) return;
      const broker = BR ? BR.brokerForSlot(t.slotNum) : "kiwoom";
      const groupKey = `${broker}|${ticker}|${normalizedSellDate}`;
      if (!groupedByTicker.has(groupKey)) groupedByTicker.set(groupKey, []);
      groupedByTicker.get(groupKey).push({
        slotNum: t.slotNum,
        buyDate: String(t.buyDate || t.buy_date || ""),
        qty: Number(t.qty || 0)
      });
    });

    groupedByTicker.forEach((rows, groupKey) => {
      const [broker, ticker, normalizedSellDate] = groupKey.split('|');
      if (!reconcileState || !reconcileState.ready) {
        rows.forEach(r => {
          const rowKey = `${groupKey}|${r.buyDate}|${r.slotNum}`;
          sellStatusByRowKey.set(rowKey, { status: (reconcileState && reconcileState.failed) ? 'unknown' : 'loading', mismatchQty: 0 });
        });
        return;
      }
      if (!reconcileState.coveredDates.has(`${broker}|${normalizedSellDate}`)) {
        rows.forEach(r => {
          const rowKey = `${groupKey}|${r.buyDate}|${r.slotNum}`;
          sellStatusByRowKey.set(rowKey, { status: 'pending', mismatchQty: 0 });
        });
        return;
      }

      // 매도 날짜에 신규 매수와 상계(퉁치기)된 수량을 합산 (당일 및 과거 거래일 공통)
      const totalNetted = typeof window.getNettedQtyForTickerDate === 'function'
        ? window.getNettedQtyForTickerDate(ticker, normalizedSellDate, broker, true)
        : 0;

      const live = reconcileState.sell.get(`${broker}|${ticker}|${normalizedSellDate}`);
      const rawLiveQty = live ? Math.round(live.qty) : 0;
      const liveTotal = rawLiveQty + totalNetted;
      const appTotal = rows.reduce((sum, r) => sum + Math.round(r.qty), 0);

      if (liveTotal <= 0) {
        rows.forEach(r => {
          const rowKey = `${groupKey}|${r.buyDate}|${r.slotNum}`;
          sellStatusByRowKey.set(rowKey, { status: 'mismatch', mismatchQty: r.qty });
        });
        return;
      }

      // 3) 일 단위(그룹 단위) 대조 상태 결정:
      let groupStatus = 'match';
      let overQty = 0;
      let mismatchQty = 0;

      // ⭐️ 10/12처럼 계획 매도(106주)가 상계 수량(totalNetted)으로 100% 충족된 경우:
      // 브로커의 추가 수동 매도 1주와 무관하게 계획 매도는 전량 '일치(✓)'!
      if (totalNetted > 0 && totalNetted >= appTotal) {
        groupStatus = 'match';
      } else if (liveTotal > appTotal) {
        groupStatus = 'oversold';
        overQty = liveTotal - appTotal;
      } else if (liveTotal < appTotal) {
        groupStatus = 'mismatch';
        mismatchQty = appTotal - liveTotal;
      } else {
        groupStatus = 'match';
      }

      // 4) 통합 보유현황처럼 해당 날짜 그룹의 모든 행에 일 단위 상태를 일관되게 부여!
      rows.forEach(r => {
        const rowKey = `${groupKey}|${r.buyDate}|${r.slotNum}`;
        sellStatusByRowKey.set(rowKey, {
          status: groupStatus,
          overQty: overQty,
          mismatchQty: mismatchQty,
          isNetted: totalNetted > 0,
          nettedQty: totalNetted,
          appQty: appTotal,
          liveQty: liveTotal
        });
      });
    });

    totalTradesCount = allTrades.length;

    // ⭐️ 전체 거래 내역을 청산일 최신순으로 정렬
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

    const latestDate = allTrades.length > 0 ? normalizeDateKey(String(allTrades[0].sellDate || allTrades[0].sell_date || '')) : '';
    
    // ⭐️ [2026-09-04]: 첫 화면에는 최근 20개만 표시하고, 스크롤/위로 스와이프 시 20개씩 추가 로딩
    const visibleTrades = allTrades.slice(0, historyDisplayLimit);

    const isLightMode = typeof document !== 'undefined' && document.body && document.body.classList.contains('light-mode');
    const activeBr = window.BrokerService ? window.BrokerService.activeBroker : "kiwoom";
    const signature = `${activeBr}|${allTrades.length}|${historyDisplayLimit}|${latestDate}|${visibleTrades.reduce((sum, t) => sum + Number(t.profit || 0), 0)}|br:${reconcileState ? (reconcileState.sell.size + ":" + reconcileState.coveredDates.size + ":" + reconcileState.rows.length) : 0}:${reconcileState ? reconcileState.ready : false}|theme:${isLightMode ? 'light' : 'dark'}`;
    if (signature === lastTradeHistoryRenderSignature && tbody.children.length > 0) return;
    lastTradeHistoryRenderSignature = signature;

    // fire-and-forget: 체결 데이터가 아직 준비되지 않았으면 1회 비동기 조회 후 재렌더링
    if (BR && !BR.isReady() && !window.__isRefreshingHistoryFills) {
      window.__isRefreshingHistoryFills = true;
      const activeBrKey = window.BrokerService ? window.BrokerService.activeBroker : 'kiwoom';
      BR.refreshFills(activeBrKey, () => {
        window.__isRefreshingHistoryFills = false;
        if (historyViewMode === 'strategy') {
          lastTradeHistoryRenderSignature = '';
          renderDBTradeHistory();
        }
      });
    }

    bindHistoryScrollListener(tbody);

    const modeMap = { 'Middle': 'Mid1', 'Middle2': 'Mid2', 'Middle3': 'Mid3', 'SF': 'SF', 'AG': 'AG' };

    const primaryDate = typeof window.getPrimaryStrategyDisplayDate === 'function'
      ? window.getPrimaryStrategyDisplayDate()
      : (typeof getPrimaryStrategyDisplayDate === 'function' ? getPrimaryStrategyDisplayDate() : '');

    if (allTrades.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" class="table-empty-cell" style="text-align:center; padding:20px; color:#64748b;">매매 내역이 없습니다</td></tr>';
      return;
    }

    let html = visibleTrades.map(t => {
      const slot = t.slotNum;
      // ⚠️ 2026-07-31: parseDateStr()은 문자열 끝의 "-"를 malformed 날짜 구분자로 보고
      // 잘라내는 로직이 있어서(예: "2026-07-" → "2026-07"), 여기서처럼 "데이터 없음" 표시용으로
      // 리터럴 "-"를 fallback으로 넘기면 parseDateStr("-")가 그 "-"까지 잘라내 빈 문자열("")을
      // 돌려준다 — 그 결과 진입일 칸이 "-" 대신 빈칸으로 보였다(사용자 지적). 진짜 날짜가 있을
      // 때만 parseDateStr을 거치고, 없으면 그대로 "-"를 보여주게 fallback을 바깥으로 뺐다.
      const rawBuyDateVal = t.buyDate || t.buy_date || "";
      const rawSellDateVal = t.sellDate || t.sell_date || "";
      let buyDate = rawBuyDateVal ? parseDateStr(rawBuyDateVal) : "-";
      let sellDate = rawSellDateVal ? parseDateStr(rawSellDateVal) : "-";

      const toSlashDate = (d) => {
        if (!d || d === "-") return "-";
        const parts = String(d).split('-');
        if (parts.length === 3) {
          const yy = parts[0].slice(-2);
          const mm = parseInt(parts[1], 10);
          const dd = parseInt(parts[2], 10);
          return `${yy}/${mm}/${dd}`;
        }
        return d;
      };
      const buyDateSlash = toSlashDate(buyDate);
      const sellDateSlash = toSlashDate(sellDate);

      // 슬롯의 실제 브로커(키움 1~3 / LS 4~6) 체결과 행 단위로 대조한 상태.
      const rowBroker = BR ? BR.brokerForSlot(slot) : "kiwoom";
      const rowBrokerLabel = rowBroker === "ls" ? "LS" : (rowBroker === "meritz" ? "메리츠" : "키움");
      const rawSellDate = String(t.sellDate || t.sell_date || "");
      const normalizedSellDateForLookup = normalizeDateKey(rawSellDate);
      const buyDateStr = String(t.buyDate || t.buy_date || "");
      const rowKeyLookup = `${rowBroker}|${stripA(t.ticker)}|${normalizedSellDateForLookup}|${buyDateStr}|${slot}`;
      let rowStatusObj = sellStatusByRowKey.get(rowKeyLookup) || { status: 'pending', mismatchQty: 0 };

      // ⚠️ 2026-08-04: 당일 청산 거래(진입일=청산일)의 경우, 브로커 매수 체결과 대조한다.
      // 보유현황과 동일한 개념: 청산일에 매수된 순수량(매수-당일매도)이 브로커 매수 체결과
      // 일치하면, 그 매도분(t.qty)도 "일치"로 표시한다.
      // 예: 8/3 15주 매수 + 8/3 2주 매도 → 순수량 13 = 키움 매수체결 13 → 이 2주 매도행도 일치.
      if (rowStatusObj.status !== 'match' && normalizedSellDateForLookup) {
        const sellDateNorm = normalizedSellDateForLookup;
        // res.trades에서 같은 청산일(=진입일)로 매수된 총 수량을 구한다 (해당 슬롯의 inv에서)
        const slotRes = lastBTResults[slot];
        const invMatch = slotRes && Array.isArray(slotRes.inv)
          ? slotRes.inv.find(h => normalizeDateKey(String(h.buyDate || h.buy_date || "")) === sellDateNorm)
          : null;
        if (invMatch && BR) {
          const grossQty = Math.round(Number(invMatch.qty) || 0);
          const sameDaySellQty = Array.isArray(slotRes.trades)
            ? slotRes.trades.filter(tr => normalizeDateKey(String(tr.sellDate || tr.sell_date || "")) === sellDateNorm)
                .reduce((sum, tr) => sum + Math.abs(Number(tr.qty) || 0), 0)
            : 0;
          const netQty = Math.max(0, grossQty - sameDaySellQty);
          const buyStatus = BR.holdingStatus(t.ticker, sellDateNorm, grossQty, rowBroker, sameDaySellQty);
          if (buyStatus && buyStatus.status === 'match') {
            rowStatusObj = { status: 'match', mismatchQty: 0 };
          }
        }
      }

      const rowStatus = rowStatusObj.status;
      const mismatchQty = rowStatusObj.mismatchQty || 0;
      const isOversold = rowStatus === 'oversold';
      const isMismatch = (rowStatus === 'mismatch' || isOversold) && rowStatus !== 'loading' && rowStatus !== 'unknown';
      // ⚠️ 일치하지 않은 행의 값도 글자 굵기(font-weight:700) 강조하지 않는다 (색상만 빨간색 유지)
      const mmStyle = isMismatch ? "color:#ef4444;" : "";
      const mmTitle = isOversold
        ? `title="${rowBrokerLabel}에서 예상보다 많이 매도됨 — 앱 예상 ${Math.round(rowStatusObj.appQty || 0)}주 / ${rowBrokerLabel} 실제 ${Math.round(rowStatusObj.liveQty || 0)}주"`
        : (isMismatch ? `title="이 행의 수량이 ${rowBrokerLabel} 체결내역과 부분 불일치"` : "");

      // ⚠️ 당일 매도(청산일=기준일)된 행만 글자 굵기(font-weight:700)로 강조한다.
      const sellDateNorm = typeof window.normalizeHighlightDate === 'function'
        ? window.normalizeHighlightDate(sellDate)
        : (typeof normalizeHighlightDate === 'function' ? normalizeHighlightDate(sellDate) : '');
      const isTodaySell = Boolean(primaryDate && sellDateNorm && sellDateNorm === primaryDate);
      const reconcileWeight = isTodaySell ? '700' : 'normal';

      // 일치 컬럼(보유현황과 동일 개념): 일치/과매도/불일치/보류. 팔린 내역 행은 배경색으로 강조.
      const isLight = typeof document !== 'undefined' && document.body && document.body.classList.contains('light-mode');
      const textColor = isLight ? '#0f172a' : '#f8fafc';
      const textMuted = isLight ? '#64748b' : '#94a3b8';
      const borderCol = isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)';

      let reconcile, rowBg;
      const isOverbuy = rowStatus === 'overbuy';
      if (rowStatus === 'match') {
        reconcile = { text: '일치', icon: '✓', color: isLight ? '#1d4ed8' : '#3b82f6' };
        rowBg = 'background:transparent;'; // ⭐️ 과거 일치 건에 전체 음영을 주지 않는다 (당일 청산 건만 강조)
      } else if (isOversold) {
        reconcile = { text: `${Math.round(rowStatusObj.overQty || 0)}과매도`, icon: '', color: '#f59e0b' };
        rowBg = 'background:transparent;';
      } else if (isOverbuy) {
        reconcile = { text: `${Math.round(rowStatusObj.overQty || 0)}과매수`, icon: '', color: '#f59e0b' };
        rowBg = 'background:transparent;';
      } else if (rowStatus === 'pending' || rowStatus === 'loading' || rowStatus === 'unknown') {
        reconcile = { text: '보류', icon: '△', color: textMuted };
        rowBg = 'background:transparent;';
      } else {
        // ⭐️ 일치 아닐경우는 모두 글자색상 빨간색(#ef4444) 통일
        const mismatchText = mismatchQty > 0 ? `${Math.round(mismatchQty)}매도X` : `${Math.round(t.qty || 0)}미체결`;
        reconcile = { text: mismatchText, icon: '', color: '#ef4444' };
        rowBg = 'background:transparent;';
      }
      const reconcileTitle = isMismatch ? mmTitle
        : (rowStatus === 'pending' || rowStatus === 'loading' || rowStatus === 'unknown' ? `title="${rowBrokerLabel} 체결 대조 대기 — 최근 체결내역에 없음"`
          : (rowStatus === 'match' ? `title="${rowBrokerLabel} 체결${rowStatusObj.isNetted ? `(퉁치기 상계 ${rowStatusObj.nettedQty}주 포함)` : ''}과 일치"` : `title="${rowBrokerLabel} 체결내역 확인 중"`));

      const mode = modeMap[t.mode] || t.mode || "-";
      const tier = t.tier || "-";
      const buyPrice = Number(t.buy_price !== undefined ? t.buy_price : (t.buyPrice || 0));
      const sellPrice = Number(t.sell_price !== undefined ? t.sell_price : (t.sellPrice || 0));
      const qty = t.qty || 0;
      const profit = Number(t.profit !== undefined ? t.profit : 0);

      const isPlus = profit >= 0;
      const profitClass = isPlus ? "profit-plus" : "profit-minus";
      const profitColor = isPlus ? (isLight ? '#15803d' : '#10b981') : (isLight ? '#b91c1c' : '#f43f5e');
      const sign = profit < 0 ? "-" : (profit > 0 ? "+" : "");
      let profitStr = "";
      if (window.isCurrencyKRW) {
        profitStr = sign + "₩" + Math.round(Math.abs(profit) * currentFXRate).toLocaleString();
      } else {
        profitStr = sign + "$" + Math.abs(profit).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
      }

      let buyPriceStr = "";
      let sellPriceStr = "";
      if (window.isCurrencyKRW) {
        buyPriceStr = "₩" + Math.round(buyPrice * currentFXRate).toLocaleString();
        sellPriceStr = "₩" + Math.round(sellPrice * currentFXRate).toLocaleString();
      } else {
        buyPriceStr = "$" + buyPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
        sellPriceStr = "$" + sellPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
      }

      const stockName = t.ticker || "-";
      const mismatchCellColor = isMismatch ? (isLight ? '#b91c1c' : '#ef4444') : textColor;

      return `<tr class="${isTodaySell ? 'date-sync-highlight-row' : ''}" data-sell-date="${sellDateNorm}" style="border-bottom: 1px solid ${borderCol};">
        <td style="color:${reconcile.color}; font-size:10px; font-weight:${reconcileWeight}; white-space:nowrap; text-align:center; padding:2px 1px;" ${reconcileTitle}>${reconcile.icon} ${reconcile.text}</td>
        <td style="color:${SLOT_COLORS[(slot-1)%SLOT_COLORS.length]}; font-weight:700; text-align:center;">#${slot}</td>
        <td style="text-align:center;">${stockName}</td>
        <td style="text-align:center;">${buyDateSlash}</td>
        <td class="sell-price" style="text-align:center; ${mmStyle}" ${mmTitle}>${sellDateSlash}</td>
        <td style="text-align:center;">${mode}/T${tier}</td>
        <td style="text-align:center;">${buyPriceStr}</td>
        <td class="sell-price" style="text-align:center; ${mmStyle}" ${mmTitle}>${sellPriceStr}</td>
        <td class="sell-price" style="text-align:center; ${mmStyle}" ${mmTitle}>${qty}</td>
        <td style="text-align:center; white-space:nowrap;" class="${profitClass}">${profitStr}</td>
      </tr>`;
    }).join('');

    if (visibleTrades.length < allTrades.length) {
      const isLight = typeof document !== 'undefined' && document.body && document.body.classList.contains('light-mode');
      const textMuted = isLight ? '#64748b' : '#94a3b8';
      const borderCol = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.03)';
      html += `<tr style="border-bottom: 1px dashed ${borderCol};">
        <td colspan="10" style="text-align:center; padding:8px 0; color:${textMuted}; font-size:10px; cursor:pointer;" onclick="if(window.UI && window.UI.tradeHistory && window.UI.tradeHistory.loadMore) window.UI.tradeHistory.loadMore();">
          ⬇ 더 보기 (${visibleTrades.length} / ${allTrades.length}) — 스와이프 또는 터치 시 +20개
        </td>
      </tr>`;
    }

    tbody.innerHTML = html;
    applyPrimaryDateHighlight();
    refreshSellReconcileFills(); // fire-and-forget; 체결 대조 데이터 갱신 후 재렌더
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
    if (Array.isArray(r)) {
      let dt = parseDateStr(r[0]);
      let jsonStr = r[3] || "{}";
      let parsed = {};
      if (typeof jsonStr === "object" && jsonStr !== null) {
        parsed = jsonStr;
      } else {
        try { parsed = JSON.parse(jsonStr); } catch(e) {}
      }
      return { date: dt, holdings: parsed.holdings || [] };
    } else if (r && typeof r === "object") {
      let dt = parseDateStr(r.date);
      let holdings = r.holdings;
      if (!holdings && r.json) {
        try {
          const parsed = typeof r.json === "object" ? r.json : JSON.parse(r.json);
          holdings = parsed.holdings;
        } catch(e) {}
      }
      return { date: dt, holdings: holdings || [] };
    }
    return null;
  }).filter(l => l && l.date).sort((a, b) => a.date.localeCompare(b.date));

  const reconstructed = [];

  const getBuyDate = (item) => item.buyDate || item.buy_date || "";
  const getMode = (item) => String(item.mode || "").trim();
  const getTier = (item) => String(item.tier || "").trim();

  for (let i = 0; i < sortedLogs.length - 1; i++) {
    const curLog = sortedLogs[i];
    const nextLog = sortedLogs[i+1];

    const curHoldings = curLog.holdings;
    const nextHoldings = nextLog.holdings;

    // ⭐️ [방법 2: 시트 꾸러미 날짜별 보유수량 증감 추적 복원]
    const curLots = [];
    (curHoldings || []).forEach(item => {
      const bDate = normalizeDateKey(item.buyDate || item.buy_date || curLog.date);
      const mode = String(item.mode || "").trim();
      const tier = String(item.tier || "").trim();
      const qty = parseFloat(item.qty || 0);
      const buyPrice = parseFloat(item.buy_price || item.buyPrice || 0);
      if (qty > 0) {
        curLots.push({ bDate, mode, tier, qty, buyPrice, rawItem: item });
      }
    });

    const nextLots = [];
    (nextHoldings || []).forEach(item => {
      const bDate = normalizeDateKey(item.buyDate || item.buy_date || nextLog.date);
      const mode = String(item.mode || "").trim();
      const tier = String(item.tier || "").trim();
      const qty = parseFloat(item.qty || 0);
      const buyPrice = parseFloat(item.buy_price || item.buyPrice || 0);
      if (qty > 0) {
        nextLots.push({ bDate, mode, tier, qty, buyPrice, remainingQty: qty });
      }
    });

    curLots.forEach(cur => {
      // 1단계: (진입일 + 모드 + 티어) 완전 일치 잔고 매칭
      let matchedNext = nextLots.find(n => n.bDate === cur.bDate && n.mode === cur.mode && n.tier === cur.tier && n.remainingQty > 0);
      // 2단계: 투자법 변경 시 모드/티어 표기 변경 대응 (진입일 동일 잔고 승계)
      if (!matchedNext) {
        matchedNext = nextLots.find(n => n.bDate === cur.bDate && n.remainingQty > 0);
      }

      let soldQty = 0;
      if (matchedNext) {
        if (matchedNext.remainingQty >= cur.qty) {
          matchedNext.remainingQty -= cur.qty;
          soldQty = 0;
        } else {
          soldQty = cur.qty - matchedNext.remainingQty;
          matchedNext.remainingQty = 0;
        }
      } else {
        // 익일에 해당 buyDate 잔고 완전 소멸 -> 전량 매도
        soldQty = cur.qty;
      }

      if (soldQty > 0 && !isNaN(soldQty)) {
        const buyDate = cur.bDate || curLog.date;
        const sellDate = nextLog.date;

        let buyPrice = Number(getClosePriceOnDate(buyDate, slotNum) || cur.buyPrice || 0);
        let sellPrice = Number(getClosePriceOnDate(sellDate, slotNum) || 0);

        if (buyPrice === 0 || isNaN(buyPrice)) buyPrice = Number(cur.buyPrice || 0);
        if (sellPrice === 0 || isNaN(sellPrice)) {
          try {
            const stratName = (typeof slotConfigs !== 'undefined' && slotConfigs?.[slotNum]?.basics?.strategy) || "";
            const modeData = (typeof MASTER_STRATEGIES !== 'undefined' && MASTER_STRATEGIES?.[stratName]?.modes?.[cur.mode]);
            if (modeData) {
              const sellPct = modeData.sell[Number(cur.tier) - 1] || modeData.sell[0];
              sellPrice = Math.ceil((buyPrice * (1 + sellPct) * 100) - 0.000001) / 100;
            } else {
              sellPrice = buyPrice;
            }
          } catch(e) {
            sellPrice = buyPrice;
          }
        }

        const cfg = typeof slotConfigs !== 'undefined' ? slotConfigs[slotNum] : null;
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
          mode: cur.mode,
          tier: cur.tier,
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

// 브로커 전환 시 호출: "키움/LS 매수매도 내역"(fills) 뷰를 보고 있었다면 새 증권사의
// fills 뷰로 즉시 갈아탄다. "실전 매도 내역"(strategy) 뷰는 이미 isSlotActive로 필터링되므로
// 그대로 둔다.
// ⚠️ 2026-07-30까지 이 함수는 옛 키움/한투(KIS) 체계(window.brokerService.getBroker(),
//    모드값 'kis')를 참조하고 있었다 — 지금은 키움/LS 체계(window.BrokerService.activeBroker,
//    모드값 'ls')라 실행돼도 broker가 항상 'kiwoom'으로 잡혀 아무 효과가 없었다. toggleView()의
//    현재 로직에 맞춰 다시 작성했다.
function syncHistoryViewModeToBroker() {
  const broker = window.BrokerService ? window.BrokerService.activeBroker : 'kiwoom';
  const wantMode = (broker === 'ls' || broker === 'meritz') ? broker : 'kiwoom';
  if (historyViewMode === 'kiwoom' || historyViewMode === 'meritz' || historyViewMode === 'ls') {
    historyViewMode = wantMode;
    const title = document.getElementById('historyTitle') || document.getElementById('historyModeTitle');
    if (title) {
      title.textContent = wantMode === 'ls' ? '📋 LS증권 매매내역'
        : (wantMode === 'meritz' ? '📋 메리츠증권 매매내역' : '📋 키움증권 매매내역');
    }
    renderBrokerFills(wantMode);
  } else {
    lastTradeHistoryRenderSignature = '';
    renderDBTradeHistory();
    if (typeof window.updateHistorySummary === 'function') window.updateHistorySummary();
    else if (window.UI?.misc?.updateHistorySummary) window.UI.misc.updateHistorySummary();
  }
}

function loadMoreTradeHistory() {
  if (historyViewMode === 'strategy') {
    if (historyDisplayLimit < totalTradesCount) {
      historyDisplayLimit = Math.min(historyDisplayLimit + 20, totalTradesCount);
      renderDBTradeHistory();
    }
  } else if (historyViewMode === 'kiwoom' || historyViewMode === 'meritz' || historyViewMode === 'ls') {
    if (brokerFillsDisplayLimit < lastBrokerFillsRows.length) {
      brokerFillsDisplayLimit = Math.min(brokerFillsDisplayLimit + 20, lastBrokerFillsRows.length);
      renderBrokerFillsRowsHtml(historyViewMode, lastBrokerFillsRows);
    }
  }
}

if (!window.UI) window.UI = {};
if (!window.UI.tradeHistory) window.UI.tradeHistory = {};
window.UI.tradeHistory.renderDBTradeHistory = renderDBTradeHistory;
window.UI.tradeHistory.toggleView = toggleView;
window.UI.tradeHistory.syncHistoryViewModeToBroker = syncHistoryViewModeToBroker;
window.UI.tradeHistory.resetToStrategyHistory = resetToStrategyHistory;
window.UI.tradeHistory.buildTradeLogsFromDailyStates = buildTradeLogsFromDailyStates;
window.UI.tradeHistory.reconstructRealTrades = reconstructRealTrades;
window.UI.tradeHistory.loadMore = loadMoreTradeHistory;

window.toggleView = toggleView;
window.toggleTradeHistoryView = toggleView;
window.UI.tradeHistory.toggleHistoryView = toggleView;
window.reconstructRealTrades = reconstructRealTrades;
