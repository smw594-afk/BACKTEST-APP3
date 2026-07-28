// ui/render-holdings.js - 통합보유/자산현황 렌더링
// script.js에서 보유현황 관련 함수들 분리

function renderCombinedHoldings() {
  // ⚠️ dualOrderContainer 전체를 덮어쓰면 generateDynamicDOM()이 만든 주문표 DOM
  // (combinedOrderView, orderSlot1~N 등)이 통째로 파괴되어 다시 복구되지 않는다.
  // 반드시 통합 보유현황 전용 tbody(combinedHoldingsBody)만 갱신해서 주문표와 완전히 분리한다.
  const container = document.getElementById('combinedHoldingsBody');
  if (!container) return;

  let allHoldings = [];

  for (let i = 1; i <= window.MAX_SLOTS; i++) {
    if (window.isSlotActive(i)) {
      const res = window.getBestResult(window.lastBTResults[i], i);
      if (res && res.inv) {
        const stratName = res.currentStrat || window.slotConfigs[i]?.basics?.strategy || "";
        let currPrice = 0;
        const mainData = window.globalMainDataSlot?.[i] || window.globalMainData;
        if (mainData && mainData.close && mainData.close.length > 0) {
          currPrice = mainData.close[mainData.close.length - 1] || 0;
        }
        res.inv.forEach(h => {
          const qty = parseFloat(h.qty) || 0;
          const buyPrice = parseFloat(String(h.buy_price || h.buyPrice || "0").replace(/[^0-9.-]/g, "")) || 0;
          const profit = (currPrice - buyPrice) * qty;

          allHoldings.push({
            ...h,
            stratName: stratName,
            slotNum: i,
            currPrice: currPrice,
            profit: profit,
            qty: qty
          });
        });
      }
    }
  }

  const modeMap = { 'Middle': 'Mid1', 'Middle2': 'Mid2', 'Middle3': 'Mid3', 'SF': 'SF', 'AG': 'AG' };

  if (allHoldings.length === 0) {
    container.innerHTML = "<tr><td colspan='9' class='table-empty-cell'>통합 보유 현황이 없습니다</td></tr>";
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
      let holdLimit = modeData.hold[o.tier - 1] || modeData.hold[0];
      if (o.buyDate && window.globalMainData && window.globalMainData.dates) {
        const bIdx = window.globalMainData.dates.findIndex(d => window.formatDateNY(d) === o.buyDate);
        if (bIdx !== -1) {
          let curr = new Date(window.globalMainData.dates[bIdx]);
          let dCount = 0;
          while (dCount < holdLimit) {
            curr.setDate(curr.getDate() + 1);
            const dStr = window.formatDateNY(curr);
            const dow = curr.getDay();
            if (dow !== 0 && dow !== 6 && !window.isUSMarketHoliday(dStr)) dCount++;
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
    if (currPrice > 0) {
      const buyPrice = parseFloat(String(o.buy_price || o.buyPrice || "0").replace(/[^0-9.-]/g, "")) || 0;
      const qty = parseFloat(o.qty) || 0;
      const profit = (currPrice - buyPrice) * qty;
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

    // 📊 일치 컬럼: 브로커(키움 슬롯1~3 / LS 슬롯4~6) 매수 체결과 앱 보유수량 대조
    const symbol = window.slotConfigs?.[o.slotNum]?.basics?.ticker || o.ticker || "";
    const reconcileCell = window.BrokerReconcile
      ? window.BrokerReconcile.cellHtml(window.BrokerReconcile.holdingStatus(symbol, o.buyDate || o.buy_date, o.qty))
      : '<td style="text-align:center;color:#94a3b8;font-size:9px;">-</td>';

    return `<tr>${reconcileCell}<td style="color:${window.SLOT_COLORS[(o.slotNum - 1) % window.SLOT_COLORS.length]}; font-weight:700;">#${o.slotNum}</td><td style="color:#8b5cf6;">${buyDateStr}</td><td>${stopDateStr}</td><td>${displayMode}/T${o.tier}</td><td style="color:#8b5cf6;">${buyPriceStr}</td><td class="hide-on-cover">${sellPriceStr}</td><td style="color:#8b5cf6;">${o.qty}</td><td class="${profitClass}">${profitStr}</td></tr>`;
  }).join('');

  container.innerHTML = tableRows;

  // fire-and-forget: fills land async, then this re-renders itself once with real statuses
  if (window.BrokerReconcile && !window.BrokerReconcile.isReady()) {
    window.BrokerReconcile.refreshFills(() => renderCombinedHoldings());
  }
  if (typeof applyPrimaryDateHighlight === 'function') applyPrimaryDateHighlight();
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
      let holdLimit = modeData.hold[o.tier - 1] || modeData.hold[0];
      if (o.buyDate && window.globalMainData && window.globalMainData.dates) {
        const bIdx = window.globalMainData.dates.findIndex(d => window.formatDateNY(d) === o.buyDate);
        if (bIdx !== -1) {
          let curr = new Date(window.globalMainData.dates[bIdx]);
          let dCount = 0;
          while (dCount < holdLimit) {
            curr.setDate(curr.getDate() + 1);
            const dStr = window.formatDateNY(curr);
            const dow = curr.getDay();
            if (dow !== 0 && dow !== 6 && !window.isUSMarketHoliday(dStr)) dCount++;
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
    if (currPrice > 0) {
      const buyPrice = parseFloat(String(o.buy_price || o.buyPrice || "0").replace(/[^0-9.-]/g, "")) || 0;
      const qty = parseFloat(o.qty) || 0;
      const profit = (currPrice - buyPrice) * qty;
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

    return `<tr><td style="color:${window.SLOT_COLORS[(slotNum - 1) % window.SLOT_COLORS.length]}; font-weight:700;">#${slotNum}</td><td style="color:#8b5cf6;">${buyDateStr}</td><td>${stopDateStr}</td><td>${displayMode}/T${o.tier}</td><td style="color:#8b5cf6;">${buyPriceStr}</td><td class="hide-on-cover">${sellPriceStr}</td><td style="color:#8b5cf6;">${o.qty}</td><td class="${profitClass}">${profitStr}</td></tr>`;
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
    return `<span style="display:inline-flex; align-items:center; gap:3px; padding:0; white-space:nowrap;"><span>${label}</span><strong style="color:${color}; margin-left:3px;">${value}</strong></span>`;
  }
  return `<span style="display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:999px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); white-space:nowrap;"><span>${label}</span><strong style="color:${color};">${value}</strong></span>`;
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

  let allHoldings = [];
  for (let i = 1; i <= window.MAX_SLOTS; i++) {
    if (window.isSlotActive(i)) {
      const res = window.getBestResult(window.lastBTResults[i], i);
      if (res && res.inv) {
        if (Array.isArray(res.inv)) allHoldings.push(...res.inv);
      }
    }
  }

  // 기준 날짜: 주가 데이터의 마지막 날짜 (미장 종가 기준)
  let summaryBaseDate = '';
  const mainData = window.globalMainDataSlot?.[1] || window.globalMainData;
  if (mainData && mainData.dates && mainData.dates.length > 0) {
    const lastDate = mainData.dates[mainData.dates.length - 1];
    if (lastDate && window.formatDateNY) {
      summaryBaseDate = window.formatDateNY(lastDate);
    }
  }

  if (!summaryBaseDate) {
    summaryEl.innerHTML = '';
    return;
  }

  // 해당 날짜의 매수 수량과 전체 수량 계산
  const matchedHoldings = allHoldings.filter(h => {
    const hDate = String(h.buyDate || h.buy_date || '');
    return hDate === summaryBaseDate;
  });

  const buyQty = matchedHoldings.reduce((sum, h) => sum + (parseFloat(h.qty) || 0), 0);
  const totalQty = allHoldings.reduce((sum, h) => sum + (parseFloat(h.qty) || 0), 0);

  summaryEl.innerHTML = `${createSummaryBadge(`${formatSummaryDate(summaryBaseDate)} 매수`, `${Math.round(buyQty).toLocaleString()}개`, '#fbbf24')} ${createSummaryBadge('총 잔고', `${Math.round(totalQty).toLocaleString()}개`, '#10b981')}`;
}

// 글로벌 window.UI에 등록
if (!window.UI) window.UI = {};
if (!window.UI.holdings) window.UI.holdings = {};
window.UI.holdings.renderCombinedHoldings = renderCombinedHoldings;
window.UI.holdings.renderTableSlot = renderTableSlot;
window.UI.holdings.toggleIndividualHoldings = toggleIndividualHoldings;
window.UI.holdings.updateCombinedHoldingsSummary = updateCombinedHoldingsSummary;
