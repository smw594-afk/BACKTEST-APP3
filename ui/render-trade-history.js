// ui/render-trade-history.js - 실전 매도내역 렌더링 (백업에서 복구됨)

let lastTradeHistoryRenderSignature = '';
let historyMonthOffset = 0;
let historyScrollBound = false;
let historyViewMode = 'strategy'; // 기본은 실전 매도내역 (내역모드 진입 시 항상 이 화면)

// 실전 매도내역(strategy) 표의 thead (index.html 정적 헤더와 동일: 일치 컬럼 포함 10열)
function strategyHistoryTheadHtml() {
  const isLight = typeof document !== 'undefined' && document.body && document.body.classList.contains('light-mode');
  const borderCol = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
  const textMuted = isLight ? '#64748b' : '#94a3b8';
  return `<tr style="border-bottom:1px solid ${borderCol}; color:${textMuted}; font-weight:700;">`
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

function kiwoomHistoryTheadHtml() {
  const isLight = typeof document !== 'undefined' && document.body && document.body.classList.contains('light-mode');
  const borderCol = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
  const textMuted = isLight ? '#64748b' : '#94a3b8';
  return `<tr style="border-bottom:1px solid ${borderCol}; color:${textMuted}; font-weight:700;">`
    + '<th style="padding:4px 2px; text-align:center;">종목</th>'
    + '<th style="padding:4px 2px; text-align:center;">구분</th>'
    + '<th style="padding:4px 2px; text-align:center;">주문가</th>'
    + '<th style="padding:4px 2px; text-align:center;">체결가</th>'
    + '<th style="padding:4px 2px; text-align:center;">수량</th>'
    + '<th style="padding:4px 2px; text-align:center;">상태</th>'
    + '<th style="padding:4px 2px; text-align:center;">시간</th>'
    + '<th style="padding:4px 2px; text-align:center;">수수료</th>'
    + '<th style="padding:4px 2px; text-align:center;">수익금</th></tr>';
}

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

// ⚠️ 2026-07-31: 이 함수가 파일에 완전히 동일하게 두 번 정의돼 있던 것을 정리했다
// (JS는 나중 선언이 실제 적용되므로 앞쪽은 죽은 코드였다).
async function renderBrokerFills(broker) {
  const tbody = document.getElementById('historyTableBody');
  const thead = document.querySelector('#historyTable thead');
  if (!tbody) return;
  const label = broker === 'ls' ? 'LS증권' : '키움';
  const isLight = typeof document !== 'undefined' && document.body && document.body.classList.contains('light-mode');
  const textColor = isLight ? '#0f172a' : '#f8fafc';
  const textMuted = isLight ? '#64748b' : '#94a3b8';
  const symbolColor = isLight ? '#be123c' : '#fda4af';
  const buyColor = isLight ? '#b91c1c' : '#f43f5e';
  const sellColor = isLight ? '#15803d' : '#10b981';
  const borderCol = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';

  if (thead) {
    thead.innerHTML = `<tr style="border-bottom:1px solid ${borderCol}; color:${textMuted}; font-weight:700;">`
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

  tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:20px;color:${textMuted};">${label} 해외주식 체결내역 조회 중...</td></tr>`;

  try {
    let data = null;
    if (window.BrokerReconcile && window.BrokerReconcile.getFills) {
      data = await window.BrokerReconcile.getFills(broker);
    } else if (window.BrokerService && window.BrokerService.fetchOverseasFills) {
      data = await window.BrokerService.fetchOverseasFills(broker);
    }

    if (!data || data.success === false) {
      const errMsg = (data && data.error) || "체결내역 응답 없음";
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:20px;color:#f43f5e;">${label} 해외주식 체결내역 조회 실패<br/><span style="font-size:9.5px;opacity:0.8;">${errMsg}</span></td></tr>`;
      return;
    }

    const rows = Array.isArray(data.executions) ? data.executions : (Array.isArray(data.rows) ? data.rows : []);
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:20px;color:${textMuted};">${label} 해외주식 체결내역이 없습니다</td></tr>`;
      return;
    }

    const sortKey = (r) => `${String(r.marketDate || r.date || "")} ${String(r.timeKst || r.time || "")}`;
    tbody.innerHTML = rows.slice().sort((a, b) => sortKey(b).localeCompare(sortKey(a))).map(r => {
      const sideStr = String(r.side || r.io_tp_nm || '').toUpperCase();
      const isBuy = sideStr.includes('BUY') || sideStr.includes('매수');
      const qty = Math.abs(Number(r.qty || r.cntr_qty || r.ord_qty) || 0);
      const buyPric = Number(r.ord_pric || r.price) || 0;
      const cntrPric = Number(r.cntr_pric || r.price) || 0;
      let statusStr = r.ord_stt || r.status || '체결완료';
      if (statusStr === '접수완료' || statusStr === '체결') statusStr = '체결완료';
      const timePart = r.time || r.cntr_tm || r.ord_tm || '-';
      const feeVal = Number(r.tdy_trde_cmsn || r.fee) || 0;
      const pnlVal = Number(r.rlzt_pl || r.pnl) || 0;

      const usd = (v) => "$" + Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const pnlColor = pnlVal >= 0 ? sellColor : buyColor;
      const profitCell = !isBuy
        ? (pnlVal !== 0 ? `<td style="text-align:center; color:${pnlColor}; font-weight:700;">${pnlVal >= 0 ? '+' : ''}${usd(pnlVal)}</td>` : `<td style="text-align:center; color:${textMuted};">-</td>`)
        : `<td style="text-align:center; color:${textMuted};">-</td>`;

      return `<tr style="text-align:center; color:${textColor}; border-bottom:1px solid ${borderCol};">
        <td style="text-align:center; font-weight:700; color:${symbolColor};">${r.symbol || r.stk_nm || '-'}</td>
        <td style="text-align:center; color:${isBuy ? buyColor : sellColor}; font-weight:700;">${isBuy ? '매수' : '매도'}</td>
        <td style="text-align:center; color:${textColor};">$${buyPric.toFixed(2)}</td>
        <td style="text-align:center; color:${textColor};">$${cntrPric.toFixed(2)}</td>
        <td style="text-align:center; color:${textColor};">${qty.toLocaleString()}주</td>
        <td style="text-align:center; color:${textColor};">${statusStr}</td>
        <td style="text-align:center; color:${textMuted};">${timePart}</td>
        <td style="text-align:center; color:${textColor};">${feeVal > 0 ? usd(feeVal) : '-'}</td>
        ${profitCell}
      </tr>`;
    }).join('');
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
      if (isSlotActive(i) && (!window.BrokerService || window.BrokerService.isSlotForBroker(i))) {
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
        buyDate: String(t.buyDate || t.buy_date || ""),
        qty: Number(t.qty || 0)
      });
    });

    groupedByTicker.forEach((rows, groupKey) => {
      const [broker, ticker, normalizedSellDate] = groupKey.split('|');
      if (!reconcileState || !reconcileState.ready) {
        rows.forEach(r => {
          const rowKey = `${groupKey}|${r.buyDate}`;
          sellStatusByRowKey.set(rowKey, { status: (reconcileState && reconcileState.failed) ? 'unknown' : 'loading', mismatchQty: 0 });
        });
        return;
      }
      if (!reconcileState.coveredDates.has(`${broker}|${normalizedSellDate}`)) {
        rows.forEach(r => {
          const rowKey = `${groupKey}|${r.buyDate}`;
          sellStatusByRowKey.set(rowKey, { status: 'pending', mismatchQty: 0 });
        });
        return;
      }

      const live = reconcileState.sell.get(`${broker}|${ticker}|${normalizedSellDate}`);
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
    const isLightMode = typeof document !== 'undefined' && document.body && document.body.classList.contains('light-mode');
    const signature = `${allTrades.length}|${historyMonthOffset}|${latestDate}|${allTrades.reduce((sum, t) => sum + Number(t.profit || 0), 0)}|br:${reconcileState ? reconcileState.sell.size : 0}:${reconcileState ? reconcileState.ready : false}|theme:${isLightMode ? 'light' : 'dark'}`;
    if (signature === lastTradeHistoryRenderSignature && tbody.children.length > 0) return;
    lastTradeHistoryRenderSignature = signature;

    // fire-and-forget: 체결 데이터가 아직 없으면(로딩) 받아온 뒤 자기 자신을 한 번 다시 그린다.
    if (BR && !BR.isReady()) {
      BR.refreshFills(() => { if (historyViewMode === 'strategy') renderDBTradeHistory(); });
    }

    const scrollHost = tbody.closest('.slim-scroll');
    if (scrollHost && !historyScrollBound) {
      historyScrollBound = true;
      scrollHost.addEventListener('scroll', () => {
        if (scrollHost.scrollTop + scrollHost.clientHeight >= scrollHost.scrollHeight - 40) {
          historyMonthOffset += 1;
          renderDBTradeHistory();
        }
      }, { passive: true });

      // ⚠️ 2026-08-04: 행이 몇 개뿐이면 scrollHeight===clientHeight라 위 'scroll' 이벤트가
      // 아예 발생하지 않는다(스크롤할 내용이 없음) — 그래서 사용자가 스와이프해도 반응이
      // 없었다(실증: 3줄짜리 표에서 스크롤 자체가 안 걸림). 오버플로우 여부와 무관하게
      // 위로 스와이프(휠 아래로 굴림 포함)하면 바로 이전 달을 불러오도록 별도 처리한다.
      let touchStartY = null;
      scrollHost.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
      }, { passive: true });
      scrollHost.addEventListener('touchend', (e) => {
        if (touchStartY === null) return;
        const deltaY = touchStartY - e.changedTouches[0].clientY;
        touchStartY = null;
        if (deltaY > 40) { // 위로 스와이프 = 아래로 스크롤 의도
          historyMonthOffset += 1;
          renderDBTradeHistory();
        }
      }, { passive: true });
      scrollHost.addEventListener('wheel', (e) => {
        if (e.deltaY > 20 && scrollHost.scrollHeight <= scrollHost.clientHeight + 5) {
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
      // ⚠️ 2026-07-31: parseDateStr()은 문자열 끝의 "-"를 malformed 날짜 구분자로 보고
      // 잘라내는 로직이 있어서(예: "2026-07-" → "2026-07"), 여기서처럼 "데이터 없음" 표시용으로
      // 리터럴 "-"를 fallback으로 넘기면 parseDateStr("-")가 그 "-"까지 잘라내 빈 문자열("")을
      // 돌려준다 — 그 결과 진입일 칸이 "-" 대신 빈칸으로 보였다(사용자 지적). 진짜 날짜가 있을
      // 때만 parseDateStr을 거치고, 없으면 그대로 "-"를 보여주게 fallback을 바깥으로 뺐다.
      const rawBuyDateVal = t.buyDate || t.buy_date || "";
      const rawSellDateVal = t.sellDate || t.sell_date || "";
      let buyDate = rawBuyDateVal ? parseDateStr(rawBuyDateVal) : "-";
      let sellDate = rawSellDateVal ? parseDateStr(rawSellDateVal) : "-";

      if (buyDate && buyDate.includes('-') && buyDate.length === 10) {
        buyDate = buyDate.substring(2);
      }
      if (sellDate && sellDate.includes('-') && sellDate.length === 10) {
        sellDate = sellDate.substring(2);
      }

      // 슬롯의 실제 브로커(키움 1~3 / LS 4~6) 체결과 행 단위로 대조한 상태.
      const rowBroker = BR ? BR.brokerForSlot(slot) : "kiwoom";
      const rowBrokerLabel = rowBroker === "ls" ? "LS" : "키움";
      const rawSellDate = String(t.sellDate || t.sell_date || "");
      const normalizedSellDateForLookup = normalizeDateKey(rawSellDate);
      const buyDateStr = String(t.buyDate || t.buy_date || "");
      const rowKeyLookup = `${rowBroker}|${stripA(t.ticker)}|${normalizedSellDateForLookup}|${buyDateStr}`;
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
      const isMismatch = rowStatus === 'mismatch' || isOversold;
      const mmStyle = isMismatch ? "color:#ef4444; font-weight:700;" : "";
      const mmTitle = isOversold
        ? `title="${rowBrokerLabel}에서 예상보다 많이 매도됨 — 앱 예상 ${Math.round(rowStatusObj.appQty || 0)}주 / ${rowBrokerLabel} 실제 ${Math.round(rowStatusObj.liveQty || 0)}주"`
        : (isMismatch ? `title="이 행의 수량이 ${rowBrokerLabel} 체결내역과 부분 불일치"` : "");

      // 일치 컬럼(보유현황과 동일 개념): 일치/과매도/불일치/보류. 팔린 내역 행은 배경색으로 강조.
      const isLight = typeof document !== 'undefined' && document.body && document.body.classList.contains('light-mode');
      const textColor = isLight ? '#0f172a' : '#f8fafc';
      const textMuted = isLight ? '#64748b' : '#94a3b8';
      const borderCol = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.03)';

      let reconcile, rowBg;
      if (rowStatus === 'match') {
        reconcile = { text: '일치', icon: '✓', color: isLight ? '#1d4ed8' : '#3b82f6' };
        rowBg = isLight ? 'background:rgba(59,130,246,0.08);' : 'background:rgba(59,130,246,0.10);';
      } else if (isOversold) {
        reconcile = { text: `${Math.round(rowStatusObj.overQty || 0)}과매도`, icon: '', color: '#f59e0b' };
        rowBg = isLight ? 'background:rgba(245,158,11,0.08);' : 'background:rgba(245,158,11,0.12);';
      } else if (rowStatus === 'mismatch') {
        const mismatchText = mismatchQty > 0 ? `${Math.round(mismatchQty)}매도X` : `${Math.round(t.qty || 0)}미체결`;
        reconcile = { text: mismatchText, icon: '', color: isLight ? '#b91c1c' : '#ef4444' };
        rowBg = isLight ? 'background:rgba(239,68,68,0.08);' : 'background:rgba(239,68,68,0.12);';
      } else {
        reconcile = { text: '보류', icon: '△', color: textMuted };
        rowBg = isLight ? 'background:transparent;' : 'background:rgba(255,255,255,0.03);';
      }
      const reconcileTitle = isMismatch ? mmTitle
        : (rowStatus === 'pending' ? `title="${rowBrokerLabel} 체결 대조 대기 — 최근 체결내역에 없음"`
          : (rowStatus === 'match' ? `title="${rowBrokerLabel} 체결과 일치"` : `title="${rowBrokerLabel} 체결내역 확인 중"`));

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

      return `<tr style="border-bottom: 1px solid ${borderCol}; color:${textColor}; ${rowBg}">
        <td style="width:9%; padding:2px 1px; text-align:center; color:${reconcile.color}; font-size:9px; font-weight:800; white-space:nowrap;" ${reconcileTitle}>${reconcile.icon} ${reconcile.text}</td>
        <td style="width:9%; padding:2px 1px; text-align:center; color:${SLOT_COLORS[(slot-1)%SLOT_COLORS.length]}; font-weight:700; font-size:10px;">#${slot}</td>
        <td style="width:10%; padding:2px 1px; text-align:center; font-size:9.5px; color:${textColor};">${stockName}</td>
        <td style="width:11%; padding:2px 1px; text-align:center; font-size:10px; color:${textColor};">${buyDate}</td>
        <td class="sell-price" style="width:11%; padding:2px 1px; text-align:center; font-size:10px; color:${mismatchCellColor}; ${mmStyle}" ${mmTitle}>${sellDate}</td>
        <td style="width:9%; padding:2px 1px; text-align:center; font-size:10px; color:${textColor};">${mode}/T${tier}</td>
        <td style="width:10%; padding:2px 1px; text-align:center; font-size:10px; color:${textColor};">${buyPriceStr}</td>
        <td class="sell-price" style="width:10%; padding:2px 1px; text-align:center; font-size:10px; color:${mismatchCellColor}; ${mmStyle}" ${mmTitle}>${sellPriceStr}</td>
        <td style="width:7%; padding:2px 1px; text-align:center; font-size:10px; color:${mismatchCellColor}; ${mmStyle}" ${mmTitle}>${qty}</td>
        <td style="width:14%; padding:2px 1px; text-align:center; font-size:10px; white-space:nowrap; color:${profitColor} !important; font-weight:700;" class="${profitClass}">${profitStr}</td>
      </tr>`;
    }).join('');
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

// 브로커 전환 시 호출: "키움/LS 매수매도 내역"(fills) 뷰를 보고 있었다면 새 증권사의
// fills 뷰로 즉시 갈아탄다. "실전 매도 내역"(strategy) 뷰는 이미 isSlotActive로 필터링되므로
// 그대로 둔다.
// ⚠️ 2026-07-30까지 이 함수는 옛 키움/한투(KIS) 체계(window.brokerService.getBroker(),
//    모드값 'kis')를 참조하고 있었다 — 지금은 키움/LS 체계(window.BrokerService.activeBroker,
//    모드값 'ls')라 실행돼도 broker가 항상 'kiwoom'으로 잡혀 아무 효과가 없었다. toggleView()의
//    현재 로직에 맞춰 다시 작성했다.
function syncHistoryViewModeToBroker() {
  const broker = window.BrokerService ? window.BrokerService.activeBroker : 'kiwoom';
  const wantMode = broker === 'ls' ? 'ls' : 'kiwoom';
  if (historyViewMode === 'kiwoom' || historyViewMode === 'ls') {
    historyViewMode = wantMode;
    const title = document.getElementById('historyTitle');
    if (title) title.textContent = wantMode === 'ls' ? '📋 LS증권 매수·매도 내역' : '📋 키움 매수·매도 내역';
    renderBrokerFills(wantMode);
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

window.toggleView = toggleView;
window.toggleTradeHistoryView = toggleView;

window.toggleView = toggleView;
window.UI.tradeHistory.toggleView = toggleView;
window.UI.tradeHistory.toggleHistoryView = toggleView;

window.toggleView = toggleView;
window.UI.tradeHistory.toggleView = toggleView;
