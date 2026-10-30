// ui/render-holdings.js - 통합보유/자산현황 렌더링
// script.js에서 보유현황 관련 함수들 분리

function renderCombinedHoldings() {
  const isAuth = localStorage.getItem("vtotal3_auth");
  if (isAuth !== "true") return; // ⭐️ 로그인 전에는 불필요한 백그라운드 렌더링 원천 차단
  // ⚠️ dualOrderContainer 전체를 덮어쓰면 generateDynamicDOM()이 만든 주문표 DOM
  // (combinedOrderView, orderSlot1~N 등)이 통째로 파괴되어 다시 복구되지 않는다.
  // 반드시 통합 보유현황 전용 tbody(combinedHoldingsBody)만 갱신해서 주문표와 완전히 분리한다.
  const container = document.getElementById('combinedHoldingsBody');
  if (!container) return;

  let allHoldings = [];

  // ⚠️ 2026-07-31부터 "통합 보유현황"도 활성 브로커(키움 슬롯1~3 / LS 슬롯4~6)만 필터링한다
  // (사용자 요청). 이전엔 슬롯 6개를 항상 전부 합산했다.
  for (let i = 1; i <= window.MAX_SLOTS; i++) {
    if (window.isSlotActive(i) && (!window.BrokerService || window.BrokerService.isSlotForBroker(i))) {
      const res = window.getBestResult(window.lastBTResults[i], i);
      if (res && res.inv) {
        const stratName = res.currentStrat || window.slotConfigs[i]?.basics?.strategy || "";
        let currPrice = 0;
        const mainData = window.globalMainDataSlot?.[i] || window.globalMainData;
        if (mainData && mainData.close && mainData.close.length > 0) {
          currPrice = mainData.close[mainData.close.length - 1] || 0;
        }
        // ⚠️ 2026-08-04: 같은 날짜에 청산된 거래의 수량을 찾기
        // 예: inv[진입일=8/3, qty=15] → 청산일=8/3인 거래 찾기 → sellQtyToday=2
        if (res.inv && res.inv.length > 0 && res.trades && res.trades.length > 0) {
          console.log(`[renderCombinedHoldings] slot=${i}, inv.length=${res.inv.length}, trades.length=${res.trades.length}`);
        }
        res.inv.forEach((h, hIdx) => {
          const qty = parseFloat(h.qty) || 0;
          const buyPrice = parseFloat(String(h.buy_price || h.buyPrice || "0").replace(/[^0-9.-]/g, "")) || 0;
          const profit = (currPrice - buyPrice) * qty;

          // 진입일과 같은 날에 청산된 거래 찾기 (당일 합산 계산용)
          const buyDateStr = String(h.buyDate || h.buy_date || "").trim();
          const ticker = String(h.ticker || window.slotConfigs?.[i]?.basics?.ticker || "").trim().toUpperCase();
          let sellQtyToday = 0;

          try {
            if (buyDateStr && res.trades && Array.isArray(res.trades) && res.trades.length > 0) {
              // ⚠️ res.trades는 ticker 정보가 없으므로, 청산일만 비교
              // 같은 슬롯에서 청산일이 진입일과 같은 거래 찾기
              // 예: inv의 buyDate=8/3 → trade의 sellDate=8/3인 거래 찾음
              const sameDateSells = res.trades.filter(t => {
                const tSellDate = String(t.sellDate || t.sell_date || "").trim();
                // 청산일이 진입일과 같음
                return tSellDate === buyDateStr;
              });
              if (sameDateSells.length > 0) {
                sellQtyToday = sameDateSells.reduce((sum, t) => sum + Math.abs(parseFloat(t.qty) || 0), 0);
                console.log(`  inv[${hIdx}]: buyDate=${buyDateStr}, found ${sameDateSells.length} sells, sellQtyToday=${sellQtyToday}`);
              }
            }
          } catch (e) {
            console.warn(`[보유현황] 매도 수량 계산 오류:`, e);
          }

          allHoldings.push({
            ...h,
            stratName: stratName,
            slotNum: i,
            currPrice: currPrice,
            profit: profit,
            qty: qty,
            sellQtyToday: sellQtyToday  // 당일 매도 수량 (순 수량 계산용)
          });
        });
      }
    }
  }

  const modeMap = { 'Middle': 'Mid1', 'Middle2': 'Mid2', 'Middle3': 'Mid3', 'SF': 'SF', 'AG': 'AG' };

  if (allHoldings.length === 0) {
    container.innerHTML = "<tr><td colspan='10' class='table-empty-cell'>통합 보유 현황이 없습니다</td></tr>";
    return;
  }

  allHoldings.sort((a, b) => {
    const dA = String(a.buyDate || a.buy_date || "");
    const dB = String(b.buyDate || b.buy_date || "");
    if (dA !== dB) return dB.localeCompare(dA);
    const slotA = parseInt(a.slotNum, 10) || 0;
    const slotB = parseInt(b.slotNum, 10) || 0;
    if (slotA !== slotB) return slotA - slotB;
    const pA = parseFloat(a.buy_price || a.buyPrice) || 0;
    const pB = parseFloat(b.buy_price || b.buyPrice) || 0;
    return pB - pA;
  });

  const primaryDate = typeof window.getPrimaryStrategyDisplayDate === 'function'
    ? window.getPrimaryStrategyDisplayDate()
    : (typeof getPrimaryStrategyDisplayDate === 'function' ? getPrimaryStrategyDisplayDate() : '');

  const tableRows = allHoldings.map(o => {
    const currPrice = o.currPrice || 0;
    let sellPriceStr = "-";
    let stopDateStr = typeof window.getStopLossEstimatedDate === "function" ? window.getStopLossEstimatedDate(o, o.stratName) : "-";
    try {
      const modeData = window.MASTER_STRATEGIES[o.stratName].modes[o.mode];
      const sellPct = modeData.sell[o.tier - 1] || modeData.sell[0];
      const rawSellPrice = (Math.ceil((o.buy_price * (1 + sellPct) * 100) - 0.000001) / 100);
      if (window.isCurrencyKRW) {
        sellPriceStr = "₩" + Math.round(rawSellPrice * window.currentFXRate).toLocaleString();
      } else {
        sellPriceStr = "$" + rawSellPrice.toLocaleString(undefined, { minimumFractionDigits: 2 });
      }
      let holdLimit = Number(modeData.hold[o.tier - 1] || modeData.hold[0]) || 0;
      if (o.buyDate && window.globalMainData && window.globalMainData.dates && holdLimit > 0) {
        const bIdx = window.globalMainData.dates.findIndex(d => window.formatDateNY(d) === o.buyDate);
        if (bIdx !== -1) {
          let curr = new Date(window.globalMainData.dates[bIdx]);
          let dCount = 0;
          let safeLoop = 0;
          while (dCount < holdLimit && ++safeLoop < 365) {
            curr.setDate(curr.getDate() + 1);
            const dStr = window.formatDateNY(curr);
            const dow = curr.getDay();
            if (dow !== 0 && dow !== 6 && (!window.isUSMarketHoliday || !window.isUSMarketHoliday(dStr))) dCount++;
          }
          const yy = String(curr.getFullYear()).slice(-2);
          const mm = curr.getMonth() + 1;
          const dd = curr.getDate();
          stopDateStr = `${yy}/${mm}/${dd}`;
        }
      }
    } catch (e) { }

    let buyDateStr = "-";
    if (o.buyDate) {
      const parts = o.buyDate.split('-');
      if (parts.length === 3) {
        const yy = parts[0].slice(-2);
        const mm = parseInt(parts[1], 10);
        const dd = parseInt(parts[2], 10);
        buyDateStr = `${yy}/${mm}/${dd}`;
      } else {
        buyDateStr = o.buyDate;
      }
    }

    const displayMode = modeMap[o.mode] || o.mode;

    let profitStr = "-";
    let profitClass = "";
    let profit = null;
    if (currPrice > 0) {
      const buyPrice = parseFloat(String(o.buy_price || o.buyPrice || "0").replace(/[^0-9.-]/g, "")) || 0;
      const qty = parseFloat(o.qty) || 0;
      profit = (currPrice - buyPrice) * qty;
      const sign = profit < 0 ? "-" : "";
      if (window.isCurrencyKRW) {
        profitStr = sign + "₩" + Math.round(Math.abs(profit) * window.currentFXRate).toLocaleString();
      } else {
        profitStr = sign + "$" + Math.abs(profit).toLocaleString(undefined, { minimumFractionDigits: 2 });
      }
      profitClass = profit > 0 ? "profit-plus" : (profit < 0 ? "profit-minus" : "");
    }

    let buyPriceStr = "";
    if (window.isCurrencyKRW) {
      buyPriceStr = "₩" + Math.round(Number(o.buy_price) * window.currentFXRate).toLocaleString();
    } else {
      buyPriceStr = "$" + Number(o.buy_price).toLocaleString(undefined, { minimumFractionDigits: 2 });
    }

    // 📊 일치 컬럼: 브로커(키움 슬롯1~6 / LS 슬롯7~12) 매수 체결과 앱 보유수량 대조
    // ⚠️ 모든 보유 행의 대조 상태를 정상 표시하되, 당일 강조(기준일) 행만 글자 굵기(font-weight:700)로 강조한다.
    const buyDateNorm = typeof window.normalizeHighlightDate === 'function'
      ? window.normalizeHighlightDate(buyDateStr || o.buyDate || o.buy_date)
      : (typeof normalizeHighlightDate === 'function' ? normalizeHighlightDate(buyDateStr || o.buyDate || o.buy_date) : '');
    const isPrimaryDate = Boolean(primaryDate && buyDateNorm && buyDateNorm === primaryDate);

    const symbol = window.slotConfigs?.[o.slotNum]?.basics?.ticker || o.ticker || "";
    const stockName = String(symbol || "-").trim().toUpperCase();
    let reconcileCell = '<td style="text-align:center;color:#94a3b8;font-size:10px;">-</td>';
    if (window.BrokerReconcile) {
      const broker = window.BrokerReconcile.brokerForSlot(o.slotNum);
      const buyDate = o.buyDate || o.buy_date;
      
      // 당일 해당 브로커, 종목의 통합 보유수량 합계 및 종목 전체 보유수량 합계
      let totalAppQtyForDay = 0;
      let totalAppSellQtyForDay = 0;
      let totalAppQtyForSym = 0;
      allHoldings.forEach(h => {
        const hSymbol = window.slotConfigs?.[h.slotNum]?.basics?.ticker || h.ticker || "";
        const hBroker = window.BrokerReconcile.brokerForSlot(h.slotNum);
        if (hSymbol === symbol && hBroker === broker) {
          totalAppQtyForSym += Number(h.qty) || 0;
          if ((h.buyDate || h.buy_date) === buyDate) {
            totalAppQtyForDay += Number(h.qty) || 0;
            totalAppSellQtyForDay += Number(h.sellQtyToday) || 0;
          }
        }
      });
      
      const nettedQty = typeof window.getNettedQtyForTickerDate === 'function'
        ? window.getNettedQtyForTickerDate(symbol, buyDate, broker)
        : 0;
      const st = window.BrokerReconcile.holdingStatus(symbol, buyDate, totalAppQtyForDay, broker, totalAppSellQtyForDay, nettedQty, totalAppQtyForSym);
      
      // ⭐️ 대조 상태 정상 반영:
      // 1) 계획 수량 이상 확보된 경우 (overbuy):
      //    - 당일 매수 행(isPrimaryDate): 초과분 표기 ('11과매수' 등)
      //    - 과거 매수 행(!isPrimaryDate): 계획 수량 이상 확보되었으므로 정상 '일치(✓)'
      // 2) 계획 수량보다 부족한 경우(mismatch), 조회 범위 밖인 경우(pending):
      //    - 당일/과거 불문하고 원래 상태 그대로 유지! (LS/키움 미체결 및 보류 정상 복원)
      if (!isPrimaryDate && st.status === 'overbuy') {
        st.status = 'match';
      }
      reconcileCell = window.BrokerReconcile.cellHtml(st, isPrimaryDate);
    }

    return `<tr class="${isPrimaryDate ? 'date-sync-highlight-row' : ''}" data-buy-date="${buyDateNorm}">${reconcileCell}<td style="color:${window.SLOT_COLORS[(o.slotNum - 1) % window.SLOT_COLORS.length]}; font-weight:700;">#${o.slotNum}</td><td>${stockName}</td><td style="color:#8b5cf6;">${buyDateStr}</td><td>${stopDateStr}</td><td>${displayMode}/T${o.tier}</td><td style="color:#8b5cf6;">${buyPriceStr}</td><td class="hide-on-cover">${sellPriceStr}</td><td style="color:#8b5cf6;">${o.qty}</td><td class="${profitClass}">${profitStr}</td></tr>`;
  }).join('');

  container.innerHTML = tableRows;

  // fire-and-forget: fills land async, then this re-renders itself once with real statuses
  // (숨겨진 패널에서는 불필요한 3사 네트워크 요청을 유발하지 않고, 활성 브로커만 지정해 조회한다)
  const holdingsEl = document.getElementById('panelHoldings');
  const isHoldingsVisible = holdingsEl && !holdingsEl.classList.contains('hidden') && holdingsEl.style.display !== 'none';
  if (isHoldingsVisible && window.BrokerReconcile && !window.__isRefreshingCombinedHoldings) {
    const activeBr = (window.BrokerService && window.BrokerService.activeBroker) || "meritz";
    const fillsCacheEntry = window.BrokerReconcile.getFillsCache ? window.BrokerReconcile.getFillsCache(activeBr) : null;
    // ⚠️ 실패(키 미등록/통신 오류)로 캐시가 비어도 렌더→재조회→렌더 무한 루프가 되지 않도록 30초 쿨다운
    const nowTs = Date.now();
    const isLive = window.BrokerReconcile.isLiveSynced ? window.BrokerReconcile.isLiveSynced(activeBr) : false;
    const needsFetch = (!isLive || !fillsCacheEntry || (fillsCacheEntry.days || 0) < 30 || (nowTs - (fillsCacheEntry.at || 0) > 60000))
      && (nowTs - (window.__lastCombinedFillsTry || 0) > 10000);
    if (needsFetch) {
      window.__lastCombinedFillsTry = nowTs;
      window.__isRefreshingCombinedHoldings = true;
      window.BrokerReconcile.refreshFills(activeBr, () => {
        window.__isRefreshingCombinedHoldings = false;
        renderCombinedHoldings();
      }, false, 60);
    }
    if (!window.BrokerReconcile.getCachedBalance(activeBr) && (nowTs - (window.__lastCombinedBalTry || 0) > 30000)) {
      window.__lastCombinedBalTry = nowTs;
      window.BrokerReconcile.getBalance(activeBr).then(() => {
        renderCombinedHoldings();
      }).catch(() => {});
    }
  }
  if (typeof applyPrimaryDateHighlight === 'function') applyPrimaryDateHighlight();
  if (typeof updateCombinedHoldingsSummary === 'function') updateCombinedHoldingsSummary();
}

function renderTableSlot(inv, stratName, slotNum) {
  const tbody = document.getElementById('holdingsBody' + slotNum);
  if (!tbody) return;
  if (!inv || inv.length === 0) {
    tbody.innerHTML = "<tr><td colspan='8' style='padding:20px; color:#64748b;'>보유 수량 없음</td></tr>";
    return;
  }

  let currPrice = 0;
  const mainData = window.globalMainDataSlot?.[slotNum] || window.globalMainData;
  if (mainData && mainData.close && mainData.close.length > 0) {
    currPrice = mainData.close[mainData.close.length - 1] || 0;
  }

  const sortedInv = [...inv].sort((a, b) => {
    const dA = String(a.buyDate || a.buy_date || "");
    const dB = String(b.buyDate || b.buy_date || "");
    if (dA !== dB) return dB.localeCompare(dA);
    const slotA = parseInt(a.slotNum || slotNum, 10) || 0;
    const slotB = parseInt(b.slotNum || slotNum, 10) || 0;
    if (slotA !== slotB) return slotA - slotB;
    return (parseInt(a.tier, 10) || 0) - (parseInt(b.tier, 10) || 0);
  });

  const modeMap = { 'Middle': 'Mid1', 'Middle2': 'Mid2', 'Middle3': 'Mid3', 'SF': 'SF', 'AG': 'AG' };
  const primaryDate = typeof getPrimaryStrategyDisplayDate === 'function' ? getPrimaryStrategyDisplayDate() : '';
  tbody.innerHTML = sortedInv.map(o => {
    let sellPriceStr = "-";
    let stopDateStr = typeof window.getStopLossEstimatedDate === "function" ? window.getStopLossEstimatedDate(o, o.stratName) : "-";
    try {
      const modeData = window.MASTER_STRATEGIES[stratName].modes[o.mode];
      const sellPct = modeData.sell[o.tier - 1] || modeData.sell[0];
      const rawSellPrice = (Math.ceil((o.buy_price * (1 + sellPct) * 100) - 0.000001) / 100);
      if (window.isCurrencyKRW) {
        sellPriceStr = "₩" + Math.round(rawSellPrice * window.currentFXRate).toLocaleString();
      } else {
        sellPriceStr = "$" + rawSellPrice.toLocaleString(undefined, { minimumFractionDigits: 2 });
      }
      let holdLimit = Number(modeData.hold[o.tier - 1] || modeData.hold[0]) || 0;
      if (o.buyDate && window.globalMainData && window.globalMainData.dates && holdLimit > 0) {
        const bIdx = window.globalMainData.dates.findIndex(d => window.formatDateNY(d) === o.buyDate);
        if (bIdx !== -1) {
          let curr = new Date(window.globalMainData.dates[bIdx]);
          let dCount = 0;
          let safeLoop = 0;
          while (dCount < holdLimit && ++safeLoop < 365) {
            curr.setDate(curr.getDate() + 1);
            const dStr = window.formatDateNY(curr);
            const dow = curr.getDay();
            if (dow !== 0 && dow !== 6 && (!window.isUSMarketHoliday || !window.isUSMarketHoliday(dStr))) dCount++;
          }
          const yy = String(curr.getFullYear()).slice(-2);
          const mm = curr.getMonth() + 1;
          const dd = curr.getDate();
          stopDateStr = `${yy}/${mm}/${dd}`;
        }
      }
    } catch (e) { }

    let buyDateStr = "-";
    if (o.buyDate) {
      const parts = o.buyDate.split('-');
      if (parts.length === 3) {
        const yy = parts[0].slice(-2);
        const mm = parseInt(parts[1], 10);
        const dd = parseInt(parts[2], 10);
        buyDateStr = `${yy}/${mm}/${dd}`;
      } else {
        buyDateStr = o.buyDate;
      }
    }

    const buyDateNorm = typeof window.normalizeHighlightDate === 'function'
      ? window.normalizeHighlightDate(buyDateStr || o.buyDate || o.buy_date)
      : (typeof normalizeHighlightDate === 'function' ? normalizeHighlightDate(buyDateStr || o.buyDate || o.buy_date) : '');
    const isPrimaryDate = Boolean(primaryDate && buyDateNorm && buyDateNorm === primaryDate);

    const displayMode = modeMap[o.mode] || o.mode;

    let profitStr = "-";
    let profitClass = "";
    let profit = null;
    if (currPrice > 0) {
      const buyPrice = parseFloat(String(o.buy_price || o.buyPrice || "0").replace(/[^0-9.-]/g, "")) || 0;
      const qty = parseFloat(o.qty) || 0;
      profit = (currPrice - buyPrice) * qty;
      const sign = profit < 0 ? "-" : "";
      if (window.isCurrencyKRW) {
        profitStr = sign + "₩" + Math.round(Math.abs(profit) * window.currentFXRate).toLocaleString();
      } else {
        profitStr = sign + "$" + Math.abs(profit).toLocaleString(undefined, { minimumFractionDigits: 2 });
      }
      profitClass = profit > 0 ? "profit-plus" : (profit < 0 ? "profit-minus" : "");
    }

    let buyPriceStr = "";
    if (window.isCurrencyKRW) {
      buyPriceStr = "₩" + Math.round(Number(o.buy_price) * window.currentFXRate).toLocaleString();
    } else {
      buyPriceStr = "$" + Number(o.buy_price).toLocaleString(undefined, { minimumFractionDigits: 2 });
    }

    return `<tr class="${isPrimaryDate ? 'date-sync-highlight-row' : ''}" data-buy-date="${buyDateNorm}"><td style="color:${window.SLOT_COLORS[(slotNum - 1) % window.SLOT_COLORS.length]}; font-weight:700;">#${slotNum}</td><td style="color:#8b5cf6;">${buyDateStr}</td><td>${stopDateStr}</td><td>${displayMode}/T${o.tier}</td><td style="color:#8b5cf6;">${buyPriceStr}</td><td class="hide-on-cover">${sellPriceStr}</td><td style="color:#8b5cf6;">${o.qty}</td><td class="${profitClass}">${profitStr}</td></tr>`;
  }).join('');

  if (typeof applyPrimaryDateHighlight === 'function') applyPrimaryDateHighlight();
}

function toggleIndividualHoldings(event) {
  if (window.UI && window.UI.toggles && typeof window.UI.toggles.toggleOrderView === 'function') {
    window.UI.toggles.toggleOrderView();
  } else {
    window.showIndividualHoldings = !window.showIndividualHoldings;
    if (typeof showIndividualHoldings !== 'undefined') {
      showIndividualHoldings = window.showIndividualHoldings;
    }
    window.updateSlotsVisibility();
    window.UI.order.refreshOrderViewUI();
  }
}

function createSummaryBadge(label, value, color, noBg = false) {
  if (noBg) {
    return `<span style="display:inline-flex; align-items:center; gap:3px; padding:0; white-space:nowrap; font-size:var(--app-font-size, 10.5px); font-family:inherit;"><span>${label}</span><strong style="color:${color}; margin-left:3px; font-weight:700;">${value}</strong></span>`;
  }
  return `<span style="display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:999px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); white-space:nowrap; font-size:var(--app-font-size, 10.5px); font-family:inherit;"><span>${label}</span><strong style="color:${color}; font-weight:700;">${value}</strong></span>`;
}

function formatSummaryDate(dateStr) {
  if (!dateStr) return '기준일 없음';
  const parts = String(dateStr).split('-');
  if (parts.length >= 3) return `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}일`;
  return String(dateStr);
}

function updateCombinedHoldingsSummary() {
  const summaryEl = document.getElementById('combinedHoldingsSummary');
  if (!summaryEl) return;

  const viewMode = window.currentHoldingsViewMode || 'combined';
  let allHoldings = [];

  if (viewMode !== 'combined') {
    const slotNum = parseInt(viewMode.replace('slot', ''), 10);
    const res = (typeof window.getBestResult === 'function')
      ? window.getBestResult(window.lastBTResults[slotNum], slotNum)
      : window.lastBTResults[slotNum];
    if (res && res.inv && Array.isArray(res.inv)) {
      allHoldings = [...res.inv];
    }
  } else {
    for (let i = 1; i <= window.MAX_SLOTS; i++) {
      if (window.isSlotActive(i) && (!window.BrokerService || window.BrokerService.isSlotForBroker(i))) {
        const res = (typeof window.getBestResult === 'function')
          ? window.getBestResult(window.lastBTResults[i], i)
          : window.lastBTResults[i];
        if (res && res.inv) {
          if (Array.isArray(res.inv)) allHoldings.push(...res.inv);
        }
      }
    }
  }

  // 기준 날짜: 주가 데이터의 마지막 날짜 (미장 종가 기준)
  let summaryBaseDate = '';
  if (viewMode !== 'combined') {
    const slotNum = parseInt(viewMode.replace('slot', ''), 10);
    const d = window.globalMainDataSlot?.[slotNum] || (slotNum === 1 ? window.globalMainData : null);
    if (d && d.dates && d.dates.length > 0) {
      const lastDate = d.dates[d.dates.length - 1];
      if (lastDate && window.formatDateNY) {
        summaryBaseDate = window.formatDateNY(lastDate);
      }
    }
  }
  if (!summaryBaseDate && typeof window.getPrimaryStrategyDisplayDate === 'function') {
    summaryBaseDate = window.getPrimaryStrategyDisplayDate();
  }
  if (!summaryBaseDate) {
    for (let i = 1; i <= window.MAX_SLOTS; i++) {
      const d = window.globalMainDataSlot?.[i] || (i === 1 ? window.globalMainData : null);
      if (d && d.dates && d.dates.length > 0) {
        const lastDate = d.dates[d.dates.length - 1];
        if (lastDate && window.formatDateNY) {
          summaryBaseDate = window.formatDateNY(lastDate);
          if (summaryBaseDate) break;
        }
      }
    }
  }

  if (!summaryBaseDate) {
    summaryBaseDate = window.currentOrderDate || (window.lastBTResults?.[1]?.orderDateStr ? String(window.lastBTResults[1].orderDateStr).replace(/\s*\(동기화됨\)\s*$/, '') : '');
  }
  if (!summaryBaseDate && allHoldings.length > 0) {
    const sortedDates = allHoldings.map(h => String(h.buyDate || h.buy_date || '')).filter(Boolean).sort();
    if (sortedDates.length > 0) summaryBaseDate = sortedDates[sortedDates.length - 1];
  }

  // 해당 날짜의 매수 수량과 전체 수량 계산 (날짜 정규화 비교로 2자리/4자리 연도 및 구분자 불일치 완전 해결)
  const normDateFn = (v) => {
    if (!v) return "";
    const s = String(v).trim();
    if (typeof window.normalizeDateKey === 'function') return window.normalizeDateKey(s);
    if (window.BrokerReconcile && typeof window.BrokerReconcile.normalizeDateKey === 'function') return window.BrokerReconcile.normalizeDateKey(s);
    const parts = s.split(/[-/.]/).map(p => p.trim()).filter(Boolean);
    if (parts.length === 3) {
      let [y, mo, d] = parts;
      if (y.length <= 2) y = "20" + y.padStart(2, "0");
      return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
    const digits = s.replace(/[^0-9]/g, "");
    if (digits.length === 8) return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
    if (digits.length === 6) return `20${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 6)}`;
    return s;
  };

  const normSummaryDate = normDateFn(summaryBaseDate);
  const matchedHoldings = normSummaryDate ? allHoldings.filter(h => {
    const rawHDate = String(h.buyDate || h.buy_date || '');
    const normHDate = normDateFn(rawHDate);
    return normHDate === normSummaryDate;
  }) : [];

  const buyQty = matchedHoldings.reduce((sum, h) => sum + (parseFloat(h.qty) || 0), 0);
  const totalQty = allHoldings.reduce((sum, h) => sum + (parseFloat(h.qty) || 0), 0);

  const buyLabel = summaryBaseDate ? `${formatSummaryDate(summaryBaseDate)} 매수` : '당일 매수';
  summaryEl.innerHTML = `${createSummaryBadge(buyLabel, `${Math.round(buyQty).toLocaleString()}개`, '#fbbf24')} ${createSummaryBadge('총 잔고', `${Math.round(totalQty).toLocaleString()}개`, '#10b981')}`;
}

// 글로벌 window.UI에 등록
if (!window.UI) window.UI = {};
if (!window.UI.holdings) window.UI.holdings = {};
window.UI.holdings.renderCombinedHoldings = renderCombinedHoldings;
window.UI.holdings.renderTableSlot = renderTableSlot;
window.UI.holdings.toggleIndividualHoldings = toggleIndividualHoldings;
window.UI.holdings.updateCombinedHoldingsSummary = updateCombinedHoldingsSummary;

// ⚠️ 2026-08-04: 페이지 로드 후 800ms 뒤에 renderCombinedHoldings 자동 호출
// (초기 로드 시에는 호출되지 않아서 당일 합산 로직이 작동하지 않는 문제 해결)
setTimeout(() => {
  if (typeof window.renderCombinedHoldings === 'function' && !window.showIndividualHoldings) {
    window.renderCombinedHoldings();
  }
}, 800);
