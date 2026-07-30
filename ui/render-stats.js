// ui/render-stats.js

function getStatsPieChartInstance() {
  if (window.stateManager && typeof window.stateManager.getStatsPieChart === 'function') {
    return window.stateManager.getStatsPieChart();
  }
  return window.statsPieChartInstance || null;
}

function setStatsPieChartInstance(chart) {
  if (window.stateManager && typeof window.stateManager.setStatsPieChart === 'function') {
    window.stateManager.setStatsPieChart(chart);
  }
  window.statsPieChartInstance = chart;
}

function buildStatsPieRows() {
  const rows = [];
  const slotColors = Array.isArray(window.SLOT_COLORS) && window.SLOT_COLORS.length > 0
    ? window.SLOT_COLORS
    : ['#6366f1', '#10b981', '#fbbf24', '#f43f5e', '#8b5cf6', '#06b6d4', '#eab308'];
  // ⚠️ 2026-07-31: 자산현황(파이차트)도 활성 브로커(키움 1~3 / LS 4~6)만 필터링한다(사용자 요청).
  for (let i = 1; i <= MAX_SLOTS; i++) {
    if (!isSlotActive(i)) continue;
    if (window.BrokerService && !window.BrokerService.isSlotForBroker(i)) continue;
    const res = getBestResult(lastBTResults[i], i);
    if (!res) continue;
    const summary = getDisplayStatusData(res, i) || res.summary || {};
    const totalAssets = Number(summary.totalAssets !== undefined ? summary.totalAssets : (summary.total_assets || 0));
    const realPrincipal = Number(summary.realPrincipal !== undefined ? summary.realPrincipal : (summary.base || summary.base_principal || 0));
    const displayValue = totalAssets > 0 ? totalAssets : realPrincipal;
    rows.push({
      slotNum: i,
      label: (getSlotConfig(i)?.basics?.strategy || `투자법 ${i}`),
      value: Math.max(displayValue, 0),
      color: slotColors[(i - 1) % slotColors.length] || '#6366f1',
      summary
    });
  }
  if (rows.length === 0 && window.cachedCombinedStats) {
    const totalAssets = Number(window.cachedCombinedStats.totalAssets || 0);
    rows.push({
      slotNum: 'Combined',
      label: '합산',
      value: Math.max(totalAssets, 0),
      color: 'var(--secondary, #a855f7)',
      summary: window.cachedCombinedStats
    });
  }
  return rows;
}

function updateStatsPieChart() {
  const canvas = document.getElementById('statsPieChart');
  const legend = document.getElementById('statsChartLegend');
  if (!canvas) return;

  const rows = buildStatsPieRows();
  const isKRW = true;
  const fx = typeof currentFXRate !== 'undefined' ? currentFXRate : 1;
  const formatMoney = (value) => {
    const num = Number(value || 0);
    if (isKRW) return Math.round(num * fx).toLocaleString();
    return Math.round(num).toLocaleString();
  };

  if (!rows.length) {
    if (legend) legend.innerHTML = '<div class="analysis-legend-value">데이터 없음</div>';
    const existing = getStatsPieChartInstance();
    if (existing && typeof existing.destroy === 'function') existing.destroy();
    setStatsPieChartInstance(null);
    return;
  }

  const values = rows.map(row => Number(row.value || 0));
  const total = values.reduce((sum, val) => sum + val, 0) || rows.length;
  const safeValues = values.map(val => (val > 0 ? val : 1));

  if (legend) {
    legend.innerHTML = rows.map(row => {
      const share = total > 0 ? ((Number(row.value || 0) / total) * 100) : 0;
      return `
        <div class="stats-asset-legend-row" style="display:flex; align-items:center; gap:6px; padding:2px 4px; min-height:18px;">
          <span style="width:8px; height:8px; border-radius:999px; background:${row.color}; flex:0 0 auto;"></span>
          <span style="flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${formatStrategyNameWithSmallParentheses(row.label)}</span>
          <span style="margin-left:auto; font-weight:700; color:var(--text);">${formatMoney(row.value)}</span>
          <span style="margin-left:6px; color:var(--text-muted); font-size:10px;">${share.toFixed(1)}%</span>
        </div>`;
    }).join('');
  }

  const existing = getStatsPieChartInstance();
  const labels = rows.map(row => row.label);
  const colors = rows.map(row => row.color);

  if (existing) {
    existing.data.labels = labels;
    existing.data.datasets[0].data = safeValues;
    existing.data.datasets[0].backgroundColor = colors;
    existing.update();
    return;
  }

  if (!window.Chart) return;

  const ctx = canvas.getContext('2d');
  const chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: safeValues,
        backgroundColor: colors,
        borderWidth: 0,
        spacing: 2,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '58%',
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(context) {
              const row = rows[context.dataIndex];
              const share = total > 0 ? ((Number(row?.value || 0) / total) * 100) : 0;
              return `${context.label}: ${formatMoney(row?.value || 0)} (${share.toFixed(1)}%)`;
            }
          }
        }
      }
    }
  });

  setStatsPieChartInstance(chart);
}

function refreshStatsTable() {
  const table = document.getElementById('statsTableBody') || document.getElementById('statsTable');
  const tableContainer = document.getElementById('statsTableContainer');
  const chartContainer = document.getElementById('statsChartContainer');
  const selector = document.getElementById('statsMetricSelector');
  const actionArea = document.getElementById('statsActionArea');
  const statsTitle = document.getElementById('statsTitle');

  // statsTableBody가 없는 화면(주문표 등)에서는 아무것도 하지 않음
  if (!tableContainer && !chartContainer) return;

  if (actionArea) actionArea.innerHTML = '';

  const grid = document.getElementById('mainGrid');

  // ══════════════════════════════════════════════════════
  // 📄 내역 모드 (perf-metrics-layout)
  //   상태: statsDisplayMode ('chart' | 'table')
  //   화면: 💼 자산현황(파이차트) ↔ 📡 계좌 정보(해외계좌 실잔고)
  //   ※ 실시간 운영현황 절대 없음
  // ══════════════════════════════════════════════════════
  if (grid && grid.classList.contains('perf-metrics-layout')) {
    if (statsTitle) statsTitle.innerHTML = statsDisplayMode === 'chart' ? '💼 자산현황' : (`📡 계좌 정보` + (window.lastAccountNo ? ` (${window.lastAccountNo})` : ''));
    if (statsDisplayMode === 'chart') {
      if (tableContainer) tableContainer.style.display = 'none';
      if (chartContainer) chartContainer.style.display = 'flex';
      if (selector) selector.style.display = 'block';
      if (actionArea) actionArea.style.display = 'none';
      updateStatsPieChart();
    } else {
      if (tableContainer) tableContainer.style.display = 'block';
      if (chartContainer) chartContainer.style.display = 'none';
      if (selector) selector.style.display = 'none';
      if (actionArea) actionArea.style.display = 'flex';
      if (table) renderKiwoomBalanceOnStatsTable(table);
    }
    return;
  }

  // ══════════════════════════════════════════════════════
  // 📊 성과 모드 (perf-tab-layout)
  //   상태: perfStatsMode ('stats' | 'realtime')
  //   화면: 📄 성과 지표(CAGR/승률/MDD) ↔ 📡 실시간 운영현황
  //   ※ 계좌 정보 절대 없음
  // ══════════════════════════════════════════════════════
  if (grid && grid.classList.contains('perf-tab-layout')) {
    if (statsTitle) statsTitle.innerHTML = perfStatsMode === 'realtime' ? '📡 실시간 운영현황' : '📄 성과 지표';
    if (tableContainer) tableContainer.style.display = 'block';
    if (chartContainer) chartContainer.style.display = 'none';
    if (selector) selector.style.display = 'none';
    if (actionArea) actionArea.style.display = 'flex';
    if (!table) return; // DOM 없으면 중단
    if (perfStatsMode === 'realtime') {
      renderRealtimeStatusTable(table);
    } else {
      renderOriginalStatsTable(table);
    }
    return;
  }

  // 기타 레이아웃 (주문표, 백테스트 등): statsTableBody가 없으면 그냥 리턴
  if (!table) return;
  if (tableContainer) tableContainer.style.display = 'block';
  if (chartContainer) chartContainer.style.display = 'none';
  if (selector) selector.style.display = 'none';
  if (actionArea) actionArea.style.display = 'flex';
  renderRealtimeStatusTable(table);
}

function renderOriginalStatsTable(table) {
  const rows = [];
  let activeCount = 0;
  const grid = document.getElementById('mainGrid');
  const isBacktestStatsView = !!(grid && grid.classList.contains('backtest-view-layout'));

  // ⚠️ 2026-07-31: 성과 지표도 활성 브로커(키움 1~3 / LS 4~6)만 필터링한다(사용자 요청).
  for (let i = 1; i <= MAX_SLOTS; i++) {
    if (isSlotActive(i) && (!window.BrokerService || window.BrokerService.isSlotForBroker(i))) {
      activeCount++;
      rows.push({
        res: getBestResult(lastBTResults[i], i),
        slotNum: i,
        name: getSlotConfig(i)?.basics?.strategy || `V-QUANT 2-${i}`,
        color: SLOT_COLORS[(i - 1) % SLOT_COLORS.length]
      });
    }
  }

  const getYieldVal = (r) => {
    try {
      const displaySummary = r.res ? (isBacktestStatsView ? r.res.summary : getDisplayStatusData(r.res, r.slotNum)) : null;
      if (!displaySummary) return -Infinity;
      const tAssets = displaySummary.totalAssets !== undefined ? displaySummary.totalAssets : (displaySummary.total_assets || 0);
      const rPrincipal = displaySummary.realPrincipal !== undefined ? displaySummary.realPrincipal : (displaySummary.base || displaySummary.base_principal || 0);
      const yVal = rPrincipal > 0 ? (tAssets - rPrincipal) / rPrincipal : 0;
      return (typeof yVal === 'number' && !isNaN(yVal) && isFinite(yVal)) ? yVal : -Infinity;
    } catch (e) {
      console.warn("getYieldVal 정렬 연산 중 예외 무시 (초기 동기화 중일 수 있음):", e);
      return -Infinity;
    }
  };

  rows.sort((a, b) => getYieldVal(b) - getYieldVal(a));

  if (activeCount >= 2) {
    const comb = calculateCombinedSummary();
    rows.push({ res: { summary: comb, isSynced: true }, name: '합산', color: 'var(--secondary)' });
    if (myUserId && comb) {
      const existing = localStorage.getItem(`vtotal2_snap_combined_${myUserId}`);
      let cData = existing ? JSON.parse(existing) : { m: [], y: [] };
      cData.stats = comb;
      localStorage.setItem(`vtotal2_snap_combined_${myUserId}`, JSON.stringify(cData));
    }
  } else if (activeCount === 0 && window.cachedCombinedStats) {
    rows.push({ res: { summary: window.cachedCombinedStats, isSynced: true }, name: '합산', color: 'var(--secondary-muted, #94a3b8)' });
  }

  if (rows.length === 0) {
    table.innerHTML = '<tr><td style="text-align:center; padding:20px; color:#94a3b8;">데이터가 없습니다.</td></tr>';
    return;
  }

  const isValid = (v) => v !== undefined && v !== null && !isNaN(v) && isFinite(v);
  const fmtValue = (sObj, m, isCombo) => {
    if (!sObj) return '-';
    const tAssets = sObj.totalAssets !== undefined ? sObj.totalAssets : (sObj.total_assets || 0);
    const rPrincipal = sObj.realPrincipal !== undefined ? sObj.realPrincipal : (sObj.base || sObj.base_principal || 0);
    let v = sObj[m.key];
    if (m.key === 'realPrincipal') v = rPrincipal;
    if (m.key === 'totalAssets') v = tAssets;
    if (m.key === 'totalProfit') v = tAssets - rPrincipal;
    if (m.key === 'yield') v = rPrincipal > 0 ? (tAssets - rPrincipal) / rPrincipal : 0;
    if (v === undefined || v === null) v = sObj[m.key] || 0;
    if (!isValid(v)) v = 0;

    const fx = isCurrencyKRW ? currentFXRate : 1450;
    if (m.type === 'fmt') {
      if (isCurrencyKRW) return Math.round(Number(v) * fx / 10000).toLocaleString() + '만';
      return '$' + Math.round(Number(v)).toLocaleString();
    }
    if (m.type === 'color') {
      let num = Number(v);
      const isLight = document.body.classList.contains('light-mode');
      const plusColor = isLight ? '#1d4ed8' : '#3b82f6';
      const minusColor = isLight ? '#b91c1c' : '#ef4444';
      const colorStr = num > 0 ? plusColor : (num < 0 ? minusColor : 'var(--text)');
      if (m.pct) {
        let str = (Math.abs(num) * 100).toFixed(1) + '%';
        return num > 0
          ? `<span class="val-plus" style="color:${colorStr} !important; font-weight:700;">${str}</span>`
          : (num < 0 ? `<span class="val-minus" style="color:${colorStr} !important; font-weight:700;">-${str}</span>` : `<span>${str}</span>`);
      } else {
        let str = isCurrencyKRW ? Math.round(Math.abs(num) * fx / 10000).toLocaleString() + '만' : '$' + Math.round(Math.abs(num)).toLocaleString();
        const sign = num < 0 ? '-' : '';
        return num > 0
          ? `<span class="val-plus" style="color:${colorStr} !important; font-weight:700;">${str}</span>`
          : (num < 0 ? `<span class="val-minus" style="color:${colorStr} !important; font-weight:700;">${sign}${str}</span>` : `<span>${str}</span>`);
      }
    }
    if (m.type === 'profitWithYield') {
      const profit = Number(v);
      const rate = Number(sObj.yield || 0);
      const sign = profit < 0 ? '-' : '';
      const money = isCurrencyKRW
        ? sign + Math.round(Math.abs(profit) * fx / 10000).toLocaleString() + '만'
        : sign + '$' + Math.round(Math.abs(profit)).toLocaleString();
      const pct = Math.round(rate * 100).toLocaleString() + '%';
      const display = `${money}<span class="stats-profit-rate">(${pct})</span>`;
      const cls = profit > 0 ? 'val-plus' : (profit < 0 ? 'val-minus' : '');
      return cls ? `<span class="${cls}">${display}</span>` : display;
    }
    if (m.type === 'price') return '$' + Number(v).toFixed(2);
    if (m.type === 'raw') return (m.key === 'calmar' ? Number(v).toFixed(2) : v) + (m.suffix || '');
    return v;
  };

  const metricsList = [
    { key: 'totalAssets', label: '총자산', type: 'fmt' },
    { key: 'realPrincipal', label: '원금', type: 'fmt' },
    { key: 'yield', label: '수익률', type: 'color', pct: true },
    { key: 'currentMdd', label: '현재 MDD', type: 'color', pct: true },
    { key: 'depletion', label: '진행도', type: 'color', pct: true },
    { key: 'totalProfit', label: '총수익금', type: 'color' },
    { key: 'evalVal', label: '평가액', type: 'fmt' },
    { key: 'evalReturn', label: '평가수익', type: 'color', pct: true },
    { key: 'qty', label: '주식수', type: 'raw', suffix: '주' },
    { key: 'mdd', label: '전체 MDD', type: 'color', pct: true },
    { key: 'cagr', label: 'CAGR', type: 'color', pct: true },
    { key: 'calmar', label: '칼마비율', type: 'raw' },
    { key: 'cash', label: '예수금', type: 'fmt' },
    { key: 'base', label: '갱신금', type: 'fmt' },
    { key: 'avgPrice', label: '평균단가', type: 'price' }
  ];

  const appFontPx = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-font-size')) || 10.5;
  const labelColWidth = `${Math.max(56, Math.ceil(56 * appFontPx / 10.5))}px`;
  const labelColSizeStyle = `width:${labelColWidth}; min-width:${labelColWidth}; max-width:${labelColWidth};`;
  const totalAssetsColMinWidthPx = Math.max(72, Math.ceil(72 * appFontPx / 10.5));
  const defaultMetricColMinWidthPx = Math.max(50, Math.ceil(50 * appFontPx / 10.5));
  const metricsMinWidthPx = metricsList.reduce((sum, m) => sum + (m.key === 'totalAssets' ? totalAssetsColMinWidthPx : defaultMetricColMinWidthPx), 0);
  const tableMinWidthPx = parseFloat(labelColWidth) + metricsMinWidthPx + metricsList.length + 8;
  const headerRowMinHeightPx = Math.max(18, Math.ceil(appFontPx + 6));
  const headerCellStyle = `font-size:calc(var(--app-font-size, 10.5px) - 0.5px); font-weight:700; letter-spacing:-0.2px; line-height:1; display:flex; align-items:center; justify-content:center; text-align:center; color:var(--text-muted); white-space:nowrap;`;

  let html = `<div style="display:flex; flex-direction:column; gap:1px; padding:2px; box-sizing:border-box; width:100%; min-width:${tableMinWidthPx}px;">`;
  html += `<div class="stats-header-row" style="display:flex; align-items:center; gap:1px; padding:2px 3px 2px 0px; box-sizing:border-box; line-height:1; min-height:${headerRowMinHeightPx}px; width:100%;">`;
  html += `<div style="${headerCellStyle} ${labelColSizeStyle} flex-shrink:0; justify-content:flex-start; text-align:left; overflow:hidden; text-overflow:ellipsis;">구분</div>`;
  metricsList.forEach(m => {
    const minWidth = (m.key === 'totalAssets') ? totalAssetsColMinWidthPx : defaultMetricColMinWidthPx;
    html += `<div style="flex:1; min-width:${minWidth}px; ${headerCellStyle}">${m.label}</div>`;
  });
  html += '</div>';

  rows.forEach((r) => {
    const isCombo = (r.name === '합산');
    const displaySummary = r.res ? ((isCombo || isBacktestStatsView) ? r.res.summary : getDisplayStatusData(r.res, r.slotNum)) : null;
    html += `<div class="stats-row" style="display:flex; align-items:center; gap:1px; border-radius:3px; padding:0 3px 0 0px; box-sizing:border-box; line-height:1; min-height:18px; width:100%;">`;
    html += `<div style="font-size:var(--app-font-size, 10.5px); font-weight:700; letter-spacing:-0.2px; line-height:1; ${labelColSizeStyle} flex-shrink:0; color:${r.color}; display:flex; align-items:center; justify-content:flex-start; text-align:left; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${formatStrategyNameWithSmallParentheses(r.name)}</div>`;
    metricsList.forEach(m => {
      let cellVal = fmtValue(displaySummary, m, isCombo);
      const minWidth = (m.key === 'totalAssets') ? totalAssetsColMinWidthPx : defaultMetricColMinWidthPx;
      const isPrincipal = (m.key === 'realPrincipal');
      const cellClass = isPrincipal ? 'class="stats-asset-principal-val"' : '';
      html += `<div ${cellClass} style="flex:1; min-width:${minWidth}px; font-size:var(--app-font-size, 10.5px); font-weight:${isPrincipal ? '700' : '400'}; display:flex; align-items:center; justify-content:center; text-align:center; line-height:1; white-space:nowrap; color:inherit !important;">${cellVal}</div>`;
    });
    html += '</div>';
  });
  html += '</div>';
  table.innerHTML = html;
}

function getDisplayStatusData(res, slotNum) {
  if (!res || !res.summary) return null;
  const s = res.summary;
  let sheetDate = "-";
  if (slotNum === 'Combined') {
    let firstActiveDate = null;
    for (let i = 1; i <= MAX_SLOTS; i++) {
      if (isSlotActive(i) && (!window.BrokerService || window.BrokerService.isSlotForBroker(i))) {
        const d = localStorage.getItem(`vtotal_sheet_last_date_${i}_${myUserId}`);
        if (d && d !== "-" && d !== "1900-01-01") {
          firstActiveDate = d;
          break;
        }
      }
    }
    sheetDate = firstActiveDate || "-";
  } else {
    sheetDate = getDisplaySheetDate(slotNum, res, slotConfigs[slotNum]);
  }

  let displayTotal = s.totalAssets !== undefined ? s.totalAssets : (s.total_assets || 0);
  let displayBase = s.base !== undefined ? s.base : (s.base_principal || 0);
  let displayPrincipal = s.realPrincipal !== undefined ? s.realPrincipal : (s.base || 0);
  let displayCash = s.cash !== undefined ? s.cash : 0;
  let displayEval = s.evalVal !== undefined ? s.evalVal : 0;
  let displayQty = s.qty !== undefined ? s.qty : 0;
  let displayCurrentMdd = s.currentMdd !== undefined ? s.currentMdd : 0;
  let displayMdd = s.mdd !== undefined ? s.mdd : displayCurrentMdd;
  let displayYield = displayPrincipal > 0 ? (displayTotal - displayPrincipal) / displayPrincipal : 0;
  let displayEvalReturn = s.evalReturn !== undefined ? s.evalReturn : 0;
  let displayDepletion = s.depletion !== undefined ? s.depletion : 0;
  let displayAvgPrice = s.avgPrice !== undefined ? s.avgPrice : 0;
  let displayCagr = s.cagr !== undefined ? s.cagr : 0;
  // engine.js reports calmar as |CAGR/MDD| — restore the standard sign
  // convention here (calmar carries the sign of CAGR; MDD is a magnitude).
  let displayCalmar = s.calmar !== undefined ? s.calmar : 0;
  if (displayCagr < 0) displayCalmar = -Math.abs(displayCalmar);
  const applyHoldingsFallback = (jsonData) => {
    const holdings = Array.isArray(jsonData?.holdings) ? jsonData.holdings : [];
    if (holdings.length === 0) return;
    let hQty = 0;
    let hCost = 0;
    holdings.forEach(h => {
      const q = parseFloat(h.qty || 0) || 0;
      const cost = parseFloat(h.cost || 0) || ((parseFloat(h.buy_price || h.buyPrice || 0) || 0) * q);
      hQty += q;
      hCost += cost;
    });
    if (hQty > 0 && (!displayQty || displayQty <= 0)) displayQty = hQty;
    if (hQty > 0 && (!displayAvgPrice || displayAvgPrice <= 0)) displayAvgPrice = hCost > 0 ? hCost / hQty : displayAvgPrice;
  };


  if (slotNum !== 'Combined') {
    if (res.isSynced) {
      // sync
    } else if (res.dailyStates && res.dailyStates.length > 0) {
      const lastState = res.dailyStates[res.dailyStates.length - 1];
      displayTotal = lastState.asset;
      try {
        const lastJson = JSON.parse(lastState.json);
        displayCash = lastJson.cash;
        displayBase = lastJson.base_principal;
        displayPrincipal = lastJson.realPrincipal || displayPrincipal;
        displayEval = lastJson.evalVal !== undefined ? lastJson.evalVal : (displayTotal - displayCash);
        displayQty = lastJson.qty !== undefined ? lastJson.qty : displayQty;
        displayYield = displayPrincipal > 0 ? (displayTotal - displayPrincipal) / displayPrincipal : 0;
        displayEvalReturn = lastJson.evalReturn !== undefined ? lastJson.evalReturn : displayEvalReturn;
        displayDepletion = lastJson.depletion !== undefined ? lastJson.depletion : displayDepletion;
        displayAvgPrice = lastJson.avgPrice !== undefined ? lastJson.avgPrice : displayAvgPrice;
        applyHoldingsFallback(lastJson);

        const assets = res.dailyStates.map(d => d.asset);
        const peak = assets.length > 0 ? Math.max(...assets) : 0;
        displayCurrentMdd = peak > 0 ? (displayTotal - peak) / peak : 0;
      } catch (e) {
        displayEval = displayTotal - displayCash;
      }
    }
  } else {
    displayEval = s.evalVal !== undefined ? s.evalVal : (displayTotal - displayCash);
  }

  // A stale sheet snapshot can retain the old 1M capital after the slot was
  // changed to 10M in the investment settings.  For an empty current slot,
  // use the configured capital as the live account baseline.
  if (slotNum !== 'Combined') {
    const cfgBasics = slotConfigs?.[slotNum]?.basics || {};
    const configuredInitial = Number(unformatComma(cfgBasics.initialCash)) || 0;
    const configuredRenew = Number(unformatComma(cfgBasics.renewCash)) || configuredInitial;
    const shownPrincipal = Number(displayPrincipal || displayBase || 0);
    const hasCurrentHoldings = Array.isArray(res.inv) && res.inv.length > 0;
    if (configuredInitial > 0 && shownPrincipal > 0 &&
        configuredInitial >= shownPrincipal * 2 && !hasCurrentHoldings) {
      displayTotal = configuredInitial;
      displayBase = configuredRenew;
      displayPrincipal = configuredInitial;
      displayCash = configuredInitial;
      displayEval = 0;
      displayQty = 0;
      displayYield = 0;
      displayEvalReturn = 0;
      displayDepletion = 0;
    }
  }

  const calcEvalProfit = (targetRes) => {
    const summary = targetRes?.summary || targetRes || {};
    const sEval = parseFloat(summary.evalVal || 0) || 0;
    const sQty = parseFloat(summary.qty || 0) || 0;
    const sAvg = parseFloat(summary.avgPrice || 0) || 0;
    const currPrice = parseFloat(summary.currPrice || targetRes?.currPrice || 0) || 0;

    if (targetRes?.inv && currPrice > 0) {
      return targetRes.inv.reduce((sum, h) => {
        const buyPrice = parseFloat(h.buy_price || h.buyPrice || 0) || 0;
        const qty = parseFloat(h.qty || 0) || 0;
        return sum + ((currPrice - buyPrice) * qty);
      }, 0);
    }

    if (sEval > 0 && sQty > 0 && sAvg > 0) return sEval - (sQty * sAvg);
    return null;
  };

  let displayTotalProfit = displayTotal - displayPrincipal;
  let displayEvalProfit = (displayEval > 0 && displayQty > 0 && displayAvgPrice > 0) ? (displayEval - (displayQty * displayAvgPrice)) : calcEvalProfit(res);
  if (slotNum === 'Combined') {
    displayEvalProfit = 0;
    let hasHoldingsProfit = false;
    for (let i = 1; i <= MAX_SLOTS; i++) {
      if (!isSlotActive(i)) continue;
      if (window.BrokerService && !window.BrokerService.isSlotForBroker(i)) continue;
      const p = calcEvalProfit(getBestResult(lastBTResults[i], i));
      if (p !== null) {
        displayEvalProfit += p;
        hasHoldingsProfit = true;
      }
    }
    if (!hasHoldingsProfit) displayEvalProfit = null;
  }
  if (displayEvalProfit === null) displayEvalProfit = 0;

  return {
    date: sheetDate,
    totalAssets: displayTotal,
    base: displayBase,
    cash: displayCash,
    evalVal: displayEval,
    realPrincipal: displayPrincipal,
    qty: displayQty,
    currentMdd: displayCurrentMdd,
    mdd: displayMdd,
    yield: displayYield,
    evalReturn: displayEvalReturn,
    evalProfit: displayEvalProfit,
    totalProfit: displayTotalProfit,
    depletion: displayDepletion,
    avgPrice: displayAvgPrice,
    cagr: displayCagr,
    calmar: displayCalmar
  };
}

function renderRealtimeStatusTable(table) {
  const rows = [];
  let activeCount = 0;
  const slotRows = [];

  // ⚠️ 2026-07-31: 실시간 운영현황도 활성 브로커(키움 1~3 / LS 4~6)만 필터링한다(사용자 요청).
  for (let i = 1; i <= MAX_SLOTS; i++) {
    if (isSlotActive(i) && (!window.BrokerService || window.BrokerService.isSlotForBroker(i))) {
      activeCount++;
      slotRows.push({
        res: getBestResult(lastBTResults[i], i),
        name: getSlotConfig(i)?.basics?.strategy ? `${getSlotConfig(i).basics.strategy}` : `투자법 ${i}`,
        color: SLOT_COLORS[(i - 1) % SLOT_COLORS.length],
        slotNum: i
      });
    }
  }

  if (activeCount >= 2) {
    const comb = calculateCombinedSummary();
    rows.push({ res: { summary: comb, isSynced: true }, name: '통합 합산', color: 'var(--secondary)', slotNum: 'Combined' });
  } else if (activeCount === 0 && window.cachedCombinedStats) {
    rows.push({ res: { summary: window.cachedCombinedStats, isSynced: true }, name: '통합 합산', color: 'var(--secondary-muted, #94a3b8)', slotNum: 'Combined' });
  }

  slotRows.forEach(sr => rows.push(sr));

  if (rows.length === 0) {
    table.innerHTML = '<tr><td style="text-align:center; padding:20px; color:#94a3b8;">데이터가 없습니다.</td></tr>';
    return;
  }

  const getLatestPeriodMetricRow = (slotNum, kind) => {
    let rows = [];
    if (slotNum === 'Combined') {
      rows = kind === 'year' ? globalCombinedYearlyData : (kind === 'month' ? globalCombinedMonthlyData : globalCombinedDailyData);
    } else {
      rows = kind === 'year' ? globalYearlyDataArr[slotNum] : (kind === 'month' ? globalMonthlyDataArr[slotNum] : globalDailyDataArr[slotNum]);
    }
    if (!Array.isArray(rows) || rows.length === 0) return null;
    return [...rows].filter(row => row && row.period).sort((a, b) => String(b.period).localeCompare(String(a.period)))[0] || null;
  };

    const fmtPeriodProfit = (row) => {
    if (!row) return '-';
    const profit = Number(row.profit || 0);
    const rate = Number(row.rate || 0);
    const sign = profit < 0 ? '-' : '';
    const money = isCurrencyKRW
      ? sign + Math.round(Math.abs(profit) * currentFXRate / 10000).toLocaleString() + '만'
      : sign + '$' + Math.round(Math.abs(profit)).toLocaleString();
    const pct = (rate * 100).toFixed(1) + '%';
    const isLight = document.body.classList.contains('light-mode');
    const plusColor = isLight ? '#1d4ed8' : '#3b82f6';
    const minusColor = isLight ? '#b91c1c' : '#ef4444';
    const colorStr = profit > 0 ? plusColor : (profit < 0 ? minusColor : 'var(--text)');
    const cls = profit > 0 ? 'val-plus' : (profit < 0 ? 'val-minus' : '');
    return `<span class="${cls}" style="color:${colorStr} !important; font-weight:700;">${money}<span class="stats-profit-rate" style="color:${colorStr} !important; opacity:0.9;">(${pct})</span></span>`;
  };

  const fmtValueNew = (data, m, rowMeta) => {
    const fx = isCurrencyKRW ? currentFXRate : 1450;
    if (m.type === 'slotProfit') {
      if (rowMeta?.slotNum === 'Combined' || rowMeta?.slotNum === m.slotNum) {
        const targetRes = getBestResult(lastBTResults[m.slotNum], m.slotNum);
        const targetData = getDisplayStatusData(targetRes, m.slotNum);
        if (!targetData) return '-';
        const profit = Number(targetData.totalProfit || 0);
        const sign = profit < 0 ? '-' : '';
        const money = isCurrencyKRW
          ? sign + Math.round(Math.abs(profit) * fx / 10000).toLocaleString() + '만'
          : sign + '$' + Math.round(Math.abs(profit)).toLocaleString();
        const display = `${money}`;
        const cls = profit > 0 ? 'val-plus' : (profit < 0 ? 'val-minus' : '');
        return cls ? `<span class="${cls}">${display}</span>` : display;
      }
      return '-';
    }

    if (!data) return '-';
    if (m.type === 'period') {
      return fmtPeriodProfit(getLatestPeriodMetricRow(rowMeta?.slotNum, m.kind));
    }
    let v = data[m.key];
    if (v === undefined || v === null) return '-';

    if (m.key === 'date') return v;

    if (m.type === 'fmt') {
      const formattedValue = isCurrencyKRW
        ? Math.round(Number(v) * fx / 10000).toLocaleString() + '만'
        : '$' + Math.round(Number(v)).toLocaleString();
      if (m.key === 'evalVal') {
        const depletion = Number(data.depletion || 0);
        const progressText = (Math.abs(depletion) * 100).toFixed(1) + '%';
        return `<span class="stats-profit-value">${formattedValue}<span class="stats-profit-rate">(${progressText})</span></span>`;
      }
      return formattedValue;
    }
    if (m.type === 'color') {
      let num = Number(v);
      if (m.pct) {
        let str = (Math.abs(num) * 100).toFixed(1) + '%';
        return num > 0 ? `<span class="val-plus">${str}</span>` : (num < 0 ? `<span class="val-minus">-${str}</span>` : `<span>${str}</span>`);
      } else {
        let str = isCurrencyKRW ? Math.round(Math.abs(num) * fx / 10000).toLocaleString() + '만' : '$' + Math.round(Math.abs(num)).toLocaleString();
        return num > 0 ? `<span class="val-plus">${str}</span>` : (num < 0 ? `<span class="val-minus">-${str}</span>` : `<span>${str}</span>`);
      }
    }
        if (m.type === 'profitWithRate') {
      const profit = Number(v);
      const rate = Number(data[m.rateKey] || 0);
      const sign = profit < 0 ? '-' : '';
      const money = isCurrencyKRW
        ? sign + Math.round(Math.abs(profit) * fx / 10000).toLocaleString() + '만'
        : sign + '$' + Math.round(Math.abs(profit)).toLocaleString();
      const pct = Math.round(rate * 100).toLocaleString() + '%';
      const isLight = document.body.classList.contains('light-mode');
      const plusColor = isLight ? '#1d4ed8' : '#3b82f6';
      const minusColor = isLight ? '#b91c1c' : '#ef4444';
      const colorStr = profit > 0 ? plusColor : (profit < 0 ? minusColor : 'var(--text)');
      const cls = profit > 0 ? 'val-plus' : (profit < 0 ? 'val-minus' : '');
      return `<span class="${cls}" style="color:${colorStr} !important; font-weight:700;">${money}<span class="stats-profit-rate" style="color:${colorStr} !important; opacity:0.9;">(${pct})</span></span>`;
    }
    if (m.type === 'price') {
      return '$' + Number(v).toFixed(2);
    }
    if (m.type === 'raw') {
      if (m.key === 'calmar') return Number(v).toFixed(2);
      return v + (m.suffix || '');
    }
    return v;
  };

  const baseMetricsList = [
    { key: 'date', label: '날짜', type: 'raw' },
    { key: 'totalAssets', label: '총자산', type: 'fmt' },
    { key: 'totalProfit', label: '총 수익<span class="stats-profit-rate">(수익률)</span>', type: 'profitWithRate', rateKey: 'yield' },
    { key: 'yearProfit', label: '년 수익<span class="stats-profit-rate">(수익률)</span>', type: 'period', kind: 'year' },
    { key: 'monthProfit', label: '월 수익<span class="stats-profit-rate">(수익률)</span>', type: 'period', kind: 'month' },
    { key: 'dayProfit', label: '일 수익<span class="stats-profit-rate">(수익률)</span>', type: 'period', kind: 'day' },
    { key: 'evalProfit', label: '평가수익<span class="stats-profit-rate">(수익률)</span>', type: 'profitWithRate', rateKey: 'evalReturn' },
    { key: 'qty', label: '주식수', type: 'raw', suffix: '주' },
    { key: 'evalVal', label: '평가금<span class="stats-label-note">(진행)</span>', type: 'fmt' },
    { key: 'avgPrice', label: '평균단가', type: 'price' },
    { key: 'currentMdd', label: '현재 MDD', type: 'color', pct: true },
    { key: 'mdd', label: '전체 MDD', type: 'color', pct: true },
    { key: 'cagr', label: 'CAGR', type: 'color', pct: true },
    { key: 'calmar', label: '칼마비율', type: 'raw' },
    { key: 'realPrincipal', label: '원금', type: 'fmt' },
    { key: 'base', label: '갱신금', type: 'fmt' },
    { key: 'cash', label: '예수금', type: 'fmt' }
  ];

  const metricsList = [...baseMetricsList];

  const realtimeFontPx = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-font-size')) || 10.5;
  const labelColWidthPx = Math.max(72, Math.ceil(72 * realtimeFontPx / 10.5));
  const dataColMinWidthPx = Math.max(60, Math.ceil(60 * realtimeFontPx / 10.5));
  const tableMinWidthPx = labelColWidthPx + (dataColMinWidthPx * rows.length) + rows.length + 8;
  const labelColStyle = `font-size:var(--app-font-size, 10.5px); font-weight:600; letter-spacing:-0.2px; line-height:1; width:${labelColWidthPx}px; min-width:${labelColWidthPx}px; max-width:${labelColWidthPx}px; flex-shrink:0; color:var(--text-muted); display:flex; align-items:center; justify-content:flex-start; text-align:left; padding-left:2px;`;
  const dataColBaseStyle = `font-size:var(--app-font-size, 10.5px); letter-spacing:-0.2px; display:flex; align-items:center; justify-content:center; text-align:center; line-height:1; white-space:nowrap;`;

  let html = `<div style="display:flex; flex-direction:column; width:100%; min-width:${tableMinWidthPx}px; gap:1px; padding:2px; box-sizing:border-box;">`;

  html += '<div class="stats-header-row" style="display:flex; align-items:center; gap:1px; padding:2px 3px; box-sizing:border-box; line-height:1; height:18px; width:100%;">';
  html += `<div style="${labelColStyle}">구분</div>`;
  rows.forEach((r, idx) => {
    const colFlex = (idx === 0) ? 1.2 : 0.8;
    html += `<div style="flex:${colFlex} 1 0; min-width:${dataColMinWidthPx}px; ${dataColBaseStyle} font-weight:600; color:${r.color};">${formatStrategyNameWithSmallParentheses(r.name)}</div>`;
  });
  html += '</div>';

  metricsList.forEach(m => {
    html += `<div class="stats-row" style="display:flex; align-items:center; gap:1px; border-radius:3px; padding:0 3px; box-sizing:border-box; line-height:1; min-height:18px; width:100%;">`;
    html += `<div style="${labelColStyle}">${m.label}</div>`;
    rows.forEach((r, idx) => {
      const colFlex = (idx === 0) ? 1.2 : 0.8;
      const data = getDisplayStatusData(r.res, r.slotNum);
      const cellVal = fmtValueNew(data, m, r);
      const isProfitValue = ['totalProfit', 'yearProfit', 'monthProfit', 'dayProfit', 'evalProfit'].includes(m.key);
      const profitClass = isProfitValue ? ' stats-profit-value' : '';
      const fontWeight = isProfitValue ? '500' : '400';
      html += `<div class="${profitClass.trim()}" style="flex:${colFlex} 1 0; min-width:${dataColMinWidthPx}px; ${dataColBaseStyle} font-weight:${fontWeight}; color:inherit !important;">${cellVal}</div>`;
    });
    html += '</div>';
  });

  html += '</div>';
  table.innerHTML = html;
  if (statsDisplayMode === 'chart') {
    updateStatsPieChart();
  }
}

function renderMetrics(s, days, slotNum) { refreshStatsTable(); }

let kiwoomBalanceCache = null;
let kiwoomBalanceCacheAt = 0;
let kiwoomBalancePromise = null;

// Shared 60s-cached fetch of kt00001+kt00018 (deposit+holdings) — reused by the
// stats balance table AND the 통합보유현황 reconciliation check (render-holdings.js)
// so both stay on one in-flight request instead of double-hitting the API.
async function getKiwoomBalanceCached() {
  const base = window.KIWOOM_API_BASE || "http://localhost:8787";
  const url = `${base}/api/kiwoom/balance`;
  let result = kiwoomBalanceCache && (Date.now() - kiwoomBalanceCacheAt < 60000) ? kiwoomBalanceCache : null;
  if (!result) {
    if (!kiwoomBalancePromise) {
      kiwoomBalancePromise = fetch(url).then(async res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        return res.json();
      }).finally(() => { kiwoomBalancePromise = null; });
    }
    result = await kiwoomBalancePromise;
    kiwoomBalanceCache = result;
    kiwoomBalanceCacheAt = Date.now();
  }
  return result;
}

// 한투 잔고 1분 캐시 — 키움(getKiwoomBalanceCached)과 동일 패턴.
// KIS는 초당 요청 한도가 엄격해서(초당 거래건수 초과 에러), refreshStatsTable()이
// 여러 UI 이벤트에서 잦게 호출되는 이 앱 구조상 캐시 없이는 바로 rate limit에 걸린다.
let kisBalanceCache = null;
let kisBalanceCacheAt = 0;
let kisBalancePromise = null;
async function getKisBalanceCached() {
  let result = kisBalanceCache && (Date.now() - kisBalanceCacheAt < 60000) ? kisBalanceCache : null;
  if (!result) {
    if (!kisBalancePromise) {
      kisBalancePromise = window.brokerService.kisBalance().finally(() => { kisBalancePromise = null; });
    }
    result = await kisBalancePromise;
    kisBalanceCache = result;
    kisBalanceCacheAt = Date.now();
  }
  return result;
}

// 한투 잔고(api.kisBalance()의 정리된 필드)를 키움 kt00001/kt00018 응답 모양으로 변환.
// 아래 렌더링 로직 전체를 브로커 구분 없이 그대로 재사용하기 위함.
function kisBalanceToKiwoomShape(kis) {
  return {
    deposit: { d2_entra: String(kis.deposit || 0) },
    holdings: {
      tot_evlt_amt: String(kis.evalAmt || 0),
      tot_evlt_pl: String(kis.evalPl || 0),
      prsm_dpst_aset_amt: String(kis.totalAsset || 0),
      acnt_evlt_remn_indv_tot: (kis.holdings || []).map(h => ({
        stk_nm: h.name, stk_cd: h.ticker,
        pur_pric: String(h.avgPrice || 0), cur_prc: String(h.currPrice || 0),
        rmnd_qty: String(h.qty || 0), evlt_amt: String(h.evalAmt || 0),
        evltv_prft: String(h.evalPl || 0), prft_rt: String(h.evalPlRate || 0),
        // 전일대비 등락률(수익률과 별개). kis-worker가 못 주면 undefined로 두어
        // 현재가 옆 괄호를 아예 표시하지 않는다(수익률로 폴백하지 않음).
        fluc_rt: (h.flucRate === null || h.flucRate === undefined) ? undefined : String(h.flucRate),
        pred_close_pric: String(h.prevClose || 0)
      }))
    }
  };
}

async function renderKiwoomBalanceOnStatsTable(table) {
  if (!table) return;
  const broker = window.BrokerService ? window.BrokerService.activeBroker : "kiwoom";
  const brokerLabel = broker === "ls" ? "LS" : "키움";

  table.innerHTML = `<div style="padding:20px; color:#64748b; text-align:center; font-size:11px;">${brokerLabel} 증권사 실전 잔고 정보를 조회 중...</div>`;

  try {
    let result = null;
    if (window.BrokerReconcile && window.BrokerReconcile.getBalance) {
      result = await window.BrokerReconcile.getBalance(broker);
    } else if (window.BrokerService && window.BrokerService.fetchOverseasBalance) {
      result = await window.BrokerService.fetchOverseasBalance(broker);
    }

    if (!result || result.success === false) {
      const errMsg = (result && result.error) || "계좌 데이터를 가져오지 못했습니다.";
      table.innerHTML = `<div style="padding:20px; color:#f43f5e; text-align:center; font-size:11px;">${brokerLabel} API 연동 실패<br/><span style="font-size:9.5px; opacity:0.8;">사유: ${errMsg}</span></div>`;
      return;
    }

    const usdCash = Number(result.usdCash || result.deposit || 0);
// 📡 계좌번호를 타이틀(statsTitle)에 (계좌번호)로 추가
    const acctNo = result.accountNo || result.cano || result.acnt_no || "";
    if (acctNo) {
      window.lastAccountNo = acctNo;
    }
    const statsTitle = document.getElementById('statsTitle');
    const displayAcct = window.lastAccountNo ? ` (${window.lastAccountNo})` : "";
    if (statsTitle && statsDisplayMode === 'table') {
      statsTitle.innerHTML = `📡 계좌 정보${displayAcct}`;
    }
    const buyingPower = Number(result.buyingPowerUsd || usdCash);
    const holdingsRaw = result.holdings || result.acnt_evlt_remn_indv_tot || [];
    const holdings = Array.isArray(holdingsRaw) ? holdingsRaw : [];

    let evalAmt = 0;
    let evalProfit = 0;

    const normalizedHoldings = holdings.map(h => {
      const symbol = h.symbol || (h.stk_cd ? h.stk_cd.replace(/^A/, '') : '') || h.ticker || h.stk_nm || '-';
      const qty = Math.round(Number(h.qty || h.rmnd_qty || h.cqty || 0));
      const avgPrice = Number(h.avgPrice || h.pur_pric || h.pavg || 0);
      const currPrice = Number(h.currentPrice || h.cur_prc || h.price || 0);
      const pnlVal = Number(h.evalPnlUsd || h.evltv_prft || h.pnl || 0);
      const valuation = qty * currPrice;
      evalAmt += valuation;
      evalProfit += pnlVal;

      return { symbol, qty, avgPrice, currPrice, pnlVal, valuation };
    });

    const totalAsset = usdCash + evalAmt;
    const usd = (v) => "$" + Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    let html = '<div style="display:flex; flex-direction:column; gap:1px; padding:2px; box-sizing:border-box; width:100%;">';

    // 앱1 가로 요약 바 그대로 적용 ($ 달러)
    html += `
      <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08); border-radius:6px; padding:8px 12px; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center; font-size:10.5px;">
        <div>예수금(D+2): <strong style="color:var(--text, #fff);">${usd(usdCash)}</strong></div>
        <div>평가금액: <strong style="color:#fbbf24;">${usd(evalAmt)}</strong></div>
        <div>평가손익: <strong style="color:${evalProfit >= 0 ? '#10b981' : '#f43f5e'};">${evalProfit < 0 ? '-' : ''}${usd(Math.abs(evalProfit))}</strong></div>
        <div>총 자산: <strong style="color:#fbbf24;">${usd(totalAsset)}</strong></div>
      </div>
    `;

    // 앱1 헤더 정의 (stats-header-row)
    html += '<div class="stats-header-row" style="display:flex; align-items:center; gap:1px; padding:2px 3px; box-sizing:border-box; line-height:1; height:18px; width:100%;">';
    html += '<div style="font-size:11px; font-weight:700; letter-spacing:-0.2px; width:68px; min-width:68px; flex-shrink:0; color:var(--text-muted, #94a3b8); display:flex; align-items:center;">종목명</div>';
    html += '<div style="font-size:11px; font-weight:700; letter-spacing:-0.2px; width:45px; min-width:45px; flex-shrink:0; color:var(--text-muted, #94a3b8); display:flex; align-items:center; justify-content:center;">구분</div>';

    const columns = [
      { label: '평단가', width: '56px' },
      { label: '현재가', width: '56px' },
      { label: '수량', width: '48px' },
      { label: '평가금', width: '64px' },
      { label: '수익률', width: '50px' },
      { label: '평가손익', width: '64px' }
    ];

    columns.forEach(c => {
      html += `<div style="flex:1; min-width:${c.width}; font-size:10px; font-weight:700; letter-spacing:-0.2px; display:flex; align-items:center; justify-content:center; color:var(--text-muted, #94a3b8);">${c.label}</div>`;
    });
    html += '</div>';

    if (normalizedHoldings.length === 0) {
      html += `<div style="text-align:center; padding:20px; color:#64748b; font-size:10.5px;">보유 주식이 없습니다.</div>`;
    } else {
      normalizedHoldings.forEach(h => {
        const profitRate = (h.avgPrice > 0 && h.qty > 0) ? ((h.currPrice - h.avgPrice) / h.avgPrice * 100) : 0;
        const isPlus = profitRate >= 0;
        const color = isPlus ? '#10b981' : '#f43f5e';
        const prefix = isPlus ? '+' : '';

        html += `<div class="stats-row" style="display:flex; align-items:center; gap:1px; border-radius:3px; padding:1px 3px; box-sizing:border-box; min-height:18px; width:100%; border-bottom:1px solid rgba(255,255,255,0.05);">`;
        html += `<div style="font-size:10.5px; font-weight:700; letter-spacing:-0.2px; width:68px; min-width:68px; flex-shrink:0; color:#fda4af; display:flex; flex-direction:column; justify-content:center; text-align:left; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${h.symbol}<br/><span style="font-size:8px; color:#94a3b8; font-weight:normal;">${h.symbol}</span></div>`;
        html += `<div style="font-size:10px; font-weight:700; letter-spacing:-0.2px; width:45px; min-width:45px; flex-shrink:0; color:#6366f1; display:flex; align-items:center; justify-content:center;">${brokerLabel}</div>`;

        const rowVals = [
          `$${h.avgPrice.toFixed(2)}`,
          `$${h.currPrice.toFixed(2)}`,
          `${h.qty.toLocaleString()}주`,
          `$${h.valuation.toFixed(2)}`,
          `${prefix}${profitRate.toFixed(1)}%`,
          // 평가손익은 음수일 때만 부호를 붙인다(+ 기호 없음).
          `${h.pnlVal < 0 ? '-' : ''}$${Math.abs(h.pnlVal).toFixed(2)}`
        ];

        rowVals.forEach((val, idx) => {
          const w = columns[idx].width;
          const isProfitCol = (idx === 4 || idx === 5);
          const valColor = isProfitCol ? color : 'var(--text, #fff)';
          const valWeight = isProfitCol ? '700' : '400';
          html += `<div style="flex:1; min-width:${w}; font-size:10px; font-weight:${valWeight}; color:${valColor}; display:flex; align-items:center; justify-content:center;">${val}</div>`;
        });

        html += '</div>';
      });
    }

    html += '</div>';
    table.innerHTML = html;
  } catch (e) {
    console.error(`${brokerLabel} 잔고 로드 실패:`, e);
    table.innerHTML = `<div style="padding:20px; color:#f43f5e; text-align:center; font-size:11px;">${brokerLabel} API 연동 실패<br/><span style="font-size:9.5px; opacity:0.8;">사유: ${e.message}</span></div>`;
  }
}

if (!window.UI) window.UI = {};
if (!window.UI.stats) window.UI.stats = {};
window.UI.stats.refreshStatsTable = refreshStatsTable;
window.UI.stats.renderOriginalStatsTable = renderOriginalStatsTable;
window.UI.stats.renderRealtimeStatusTable = renderRealtimeStatusTable;
window.UI.stats.renderMetrics = renderMetrics;
window.UI.stats.getDisplayStatusData = getDisplayStatusData;
window.UI.stats.renderKiwoomBalanceOnStatsTable = renderKiwoomBalanceOnStatsTable;
window.UI.stats.getKiwoomBalanceCached = getKiwoomBalanceCached;

function toggleStatsView() {
  // 내역모드 전용 토글 (절대 perfStatsMode 건드리지 않음)
  statsDisplayMode = statsDisplayMode === 'chart' ? 'table' : 'chart';
  refreshStatsTable();
}
function togglePerfView() {
  // 성과모드 전용 토글 (절대 statsDisplayMode 건드리지 않음)
  perfStatsMode = perfStatsMode === 'stats' ? 'realtime' : 'stats';
  refreshStatsTable();
}
window.toggleStatsView = toggleStatsView;
window.togglePerfView = togglePerfView;

// 📌 statsTitle 클릭 시 현재 레이아웃에 맞는 토글만 실행
function onStatsTitleClick() {
  const grid = document.getElementById('mainGrid');
  if (grid && grid.classList.contains('perf-metrics-layout')) {
    // 내역모드: 💼 자산현황 ↔ 📡 계좌 정보
    statsDisplayMode = statsDisplayMode === 'chart' ? 'table' : 'chart';
  } else if (grid && grid.classList.contains('perf-tab-layout')) {
    // 성과모드: 📄 성과 지표 ↔ 📡 실시간 운영현황
    perfStatsMode = perfStatsMode === 'stats' ? 'realtime' : 'stats';
  }
  refreshStatsTable();
}
window.onStatsTitleClick = onStatsTitleClick;
