// ui/render-stats.js
var globalCombinedMonthlyData = window.globalCombinedMonthlyData || [];
var globalCombinedYearlyData = window.globalCombinedYearlyData || [];
var globalCombinedDailyData = window.globalCombinedDailyData || [];
var statsDisplayMode = window.statsDisplayMode || "chart";
var perfStatsMode = window.perfStatsMode || "stats";

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

function updateStatsPieChart(explicitTarget) {
  if (typeof window.updateStatsPieChart === 'function' && window.updateStatsPieChart !== updateStatsPieChart) {
    return window.updateStatsPieChart(explicitTarget);
  }
  const canvas = document.getElementById('statsPieChart');
  const legend = document.getElementById('statsChartLegend');
  if (!canvas) return;

  const selector = document.getElementById('statsMetricSelector');
  const activeOptions = [
    { value: 'account', text: '계좌' },
    { value: 'combined', text: '통합' }
  ];
  const maxSlots = window.MAX_SLOTS || 12;
  for (let i = 1; i <= maxSlots; i++) {
    if (isSlotActive(i)) {
      const name = getSlotConfig(i)?.basics?.strategy || `투자법 ${i}`;
      activeOptions.push({ value: String(i), text: name });
    }
  }

  // ⭐️ 1) 먼저 옵션 HTML을 동기화하여 select 안에 option들이 온전히 존재하도록 보장
  if (selector) {
    const nextHtml = activeOptions.map(opt => `<option value="${opt.value}">${opt.text}</option>`).join('');
    if (selector.innerHTML !== nextHtml) {
      selector.innerHTML = nextHtml;
    }
  }

  const grid = document.getElementById('mainGrid');
  const isBacktest = !!(window.isManualBacktestMode || (typeof isManualBacktestMode !== 'undefined' && isManualBacktestMode) || (grid && grid.classList.contains('backtest-view-layout')));
  const defaultTarget = isBacktest ? 'combined' : 'account';

  // ⭐️ 2) explicitTarget이 주어지면 우선 사용, 없으면 현재 selector.value 사용
  let targetValue = explicitTarget;
  if (!targetValue) {
    targetValue = selector ? (selector.value || defaultTarget) : defaultTarget;
  }

  // 유효한 옵션인지 확인 후 폴백
  if (!activeOptions.some(opt => opt.value === targetValue)) {
    targetValue = defaultTarget;
  }

  // ⭐️ 3) 옵션이 채워진 상태에서 selector.value를 안전하게 동기화
  if (selector && selector.value !== targetValue) {
    selector.value = targetValue;
  }

  const statsTitle = document.getElementById('statsTitle');
  if (statsTitle && statsDisplayMode === 'chart' && (!grid || !grid.classList.contains('perf-tab-layout'))) {
    if (targetValue === 'account') {
      statsTitle.innerHTML = '💼 자산현황(계좌)';
    } else if (targetValue === 'combined') {
      statsTitle.innerHTML = '💼 자산현황(통합)';
    } else {
      const slotNum = parseInt(targetValue, 10);
      const stratName = getSlotConfig(slotNum)?.basics?.strategy || `투자법 ${slotNum}`;
      statsTitle.innerHTML = `💼 자산현황(${formatStrategyNameWithSmallParentheses(stratName)})`;
    }
    statsTitle.style.cursor = 'pointer';
    statsTitle.title = '클릭 또는 좌우 스와이프: 자산현황 전환 (계좌/통합/투자법)';
  }

  const fx = typeof currentFXRate !== 'undefined' ? currentFXRate : 1450;
  const isKRW = typeof isCurrencyKRW !== 'undefined' ? isCurrencyKRW : false;
  const formatMoney = (value) => {
    const num = Number(value || 0);
    if (isKRW) return Math.round(num * fx).toLocaleString() + '원';
    return '$' + Math.round(num).toLocaleString();
  };

  let rows = [];

  if (targetValue === 'account') {
    const acct = typeof window.getAccountBalanceData === 'function' ? window.getAccountBalanceData() : null;
    const principalVal = acct ? Number(acct.principal || 0) : 0;
    const otherProfit = acct ? Number(acct.otherProfit || 0) : 0;
    const eTotalProfit = acct ? Number(acct.totalProfit || 0) : 0;
    const cashAsset = acct ? Number(acct.cashAsset || 0) : 0;
    const totalAsset = acct ? Number(acct.totalAsset || 0) : 0;
    const rawCashLabel = acct?.cashLabel || '예수금';
    const cashLabel = rawCashLabel.replace(/^E/, '');

    rows.push({ label: '원금', value: principalVal > 0 ? principalVal : Math.max(totalAsset, 1), color: '#a855f7' });
    if (otherProfit > 0) {
      rows.push({ label: '기타수익', value: otherProfit, color: '#06b6d4' });
    }
    if (eTotalProfit > 0) {
      rows.push({ label: 'E총수익', value: eTotalProfit, color: '#3b82f6' });
    }

    if (legend && acct) {
      const isLight = document.body.classList.contains('light-mode');
      const plusColor = isLight ? '#1d4ed8' : '#3b82f6';
      const minusColor = isLight ? '#b91c1c' : '#ef4444';
      const acctProfit = acct.acctTotalProfit || 0;
      const acctYield = acct.acctTotalYield || 0;
      const pColor = acctProfit > 0 ? plusColor : (acctProfit < 0 ? minusColor : 'var(--text)');
      const pSign = acctProfit > 0 ? '+' : (acctProfit < 0 ? '-' : '');
      const ySign = acctYield > 0 ? '+' : '';

      legend.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:2px; padding:2px 4px; width:100%; font-size:10px;">
          <div style="display:flex; justify-content:space-between;"><span style="font-weight:700;">총수익</span><span style="font-weight:700; color:${pColor}; text-align:right;">${pSign}${formatMoney(Math.abs(acctProfit))} (${ySign}${(acctYield * 100).toFixed(1)}%)</span></div>
          <div style="display:flex; justify-content:space-between; color:var(--text-muted);"><span>${cashLabel}</span><span style="text-align:right;">${formatMoney(cashAsset)}</span></div>
          <div style="display:flex; justify-content:space-between; color:var(--text-muted);"><span>주문 가능금액</span><span style="text-align:right;">${formatMoney(acct.buyingPower)}</span></div>
          <div style="display:flex; justify-content:space-between; color:var(--text-muted);"><span>평가금</span><span style="text-align:right;">${formatMoney(acct.evalAmt)}</span></div>
          <div style="display:flex; justify-content:space-between; color:#06b6d4;"><span>기타수익</span><span style="text-align:right; color:#06b6d4;">${formatMoney(acct.otherProfit)} (${(principalVal > 0 ? (acct.otherProfit / principalVal * 100).toFixed(1) : 0)}%)</span></div>
          <div style="display:flex; justify-content:space-between; color:#c084fc;"><span>원금</span><span style="text-align:right; color:#c084fc;">${formatMoney(acct.principal)}</span></div>
          <div style="display:flex; justify-content:space-between; color:#60a5fa;"><span>E총수익</span><span style="text-align:right; color:#60a5fa;">${formatMoney(acct.totalProfit)}</span></div>
        </div>
      `;
    }
  } else if (targetValue === 'combined') {
    // ⭐️ [통합 모드] 활성 슬롯 전체의 자산 비중 파이차트
    rows = buildStatsPieRows();

    if (!rows.length) {
      if (legend) legend.innerHTML = '<div class="analysis-legend-value" style="color:var(--text-muted); font-size:11px; text-align:center; padding:10px;">데이터 없음</div>';
      const existing = getStatsPieChartInstance();
      if (existing && typeof existing.destroy === 'function') existing.destroy();
      setStatsPieChartInstance(null);
      return;
    }

    const values = rows.map(row => Number(row.value || 0));
    const total = values.reduce((sum, val) => sum + val, 0) || rows.length;

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
  } else {
    // ⭐️ [개별 슬롯 모드] 해당 슬롯의 상세 자산 구성 (주식 평가금 vs 예수금) & 핵심 요약
    const slotNum = parseInt(targetValue, 10);
    const res = getBestResult(lastBTResults[slotNum], slotNum);
    const summary = (res ? getDisplayStatusData(res, slotNum) : null) || (res ? res.summary : null) || {};
    const stratName = getSlotConfig(slotNum)?.basics?.strategy || `투자법 ${slotNum}`;

    const totalAssets = Number(summary.totalAssets !== undefined ? summary.totalAssets : (summary.total_assets || 0));
    const realPrincipal = Number(summary.realPrincipal !== undefined ? summary.realPrincipal : (summary.base || summary.base_principal || 0));
    const totalProfit = Number(summary.totalProfit !== undefined ? summary.totalProfit : (totalAssets - realPrincipal));
    const yieldRate = realPrincipal > 0 ? (totalProfit / realPrincipal) : 0;
    const cash = Number(summary.cash !== undefined ? summary.cash : (summary.cashUSD || 0));
    const evalAmt = Number(summary.evalAmt !== undefined ? summary.evalAmt : Math.max(0, totalAssets - cash));
    const actualCash = Math.max(0, cash > 0 ? cash : (totalAssets - evalAmt));

    if (evalAmt > 0) {
      rows.push({
        label: 'E평가금',
        value: evalAmt,
        color: '#3b82f6'
      });
    }
    if (actualCash > 0 || rows.length === 0) {
      rows.push({
        label: 'E예수금',
        value: actualCash > 0 ? actualCash : Math.max(totalAssets, 1),
        color: '#10b981'
      });
    }

    if (legend) {
      const isLight = document.body.classList.contains('light-mode');
      const plusColor = isLight ? '#1d4ed8' : '#3b82f6';
      const minusColor = isLight ? '#b91c1c' : '#ef4444';
      const profitColor = totalProfit > 0 ? plusColor : (totalProfit < 0 ? minusColor : 'var(--text)');
      const profitSign = totalProfit > 0 ? '+' : (totalProfit < 0 ? '-' : '');
      const profitStr = `${profitSign}${formatMoney(Math.abs(totalProfit))} (${(yieldRate * 100).toFixed(1)}%)`;

      const evalShare = totalAssets > 0 ? ((evalAmt / totalAssets) * 100).toFixed(1) : '0.0';
      const cashShare = totalAssets > 0 ? ((actualCash / totalAssets) * 100).toFixed(1) : '0.0';

      legend.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:3px; padding:2px 4px; width:100%; font-size:10.5px;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1px;">
            <span style="color:var(--text-muted, #94a3b8); font-weight:700;">총 자산</span>
            <span style="font-weight:700; color:var(--text);">${formatMoney(totalAssets)}</span>
          </div>
          <div style="display:flex; align-items:center; justify-content:space-between;">
            <span style="display:flex; align-items:center; gap:5px;">
              <span style="width:7px; height:7px; border-radius:999px; background:#3b82f6; flex-shrink:0;"></span>
              <span style="color:var(--text-muted, #94a3b8);">E평가금</span>
            </span>
            <span style="font-weight:600; color:var(--text);">${formatMoney(evalAmt)} <span style="font-size:9.5px; color:var(--text-muted);">(${evalShare}%)</span></span>
          </div>
          <div style="display:flex; align-items:center; justify-content:space-between;">
            <span style="display:flex; align-items:center; gap:5px;">
              <span style="width:7px; height:7px; border-radius:999px; background:#10b981; flex-shrink:0;"></span>
              <span style="color:var(--text-muted, #94a3b8);">E예수금</span>
            </span>
            <span style="font-weight:600; color:var(--text);">${formatMoney(actualCash)} <span style="font-size:9.5px; color:var(--text-muted);">(${cashShare}%)</span></span>
          </div>
          <div style="display:flex; align-items:center; justify-content:space-between; margin-top:2px; padding-top:2px; border-top:1px solid rgba(148, 163, 184, 0.15);">
            <span style="color:var(--text-muted, #94a3b8); font-weight:600;">E원금</span>
            <span style="font-weight:600; color:var(--text);">${formatMoney(realPrincipal)}</span>
          </div>
          <div style="display:flex; align-items:center; justify-content:space-between;">
            <span style="color:var(--text-muted, #94a3b8); font-weight:600;">총수익</span>
            <span style="font-weight:700; color:${profitColor};">${profitStr}</span>
          </div>
        </div>
      `;
    }
  }

  const values = rows.map(row => Number(row.value || 0));
  const total = values.reduce((sum, val) => sum + val, 0) || rows.length;
  const safeValues = values.map(val => (val > 0 ? val : 1));
  const labels = rows.map(row => row.label);
  const colors = rows.map(row => row.color);

  const existing = getStatsPieChartInstance();

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
  // 📊 성과 모드 (perf-tab-layout)
  //   화면: 📄 성과 지표 ↔ 📡 실시간 운영현황 (테이블 모드)
  // ══════════════════════════════════════════════════════
  if (grid && grid.classList.contains('perf-tab-layout')) {
    if (statsTitle) statsTitle.innerHTML = perfStatsMode === 'realtime' ? '📡 실시간 운영현황' : '📄 성과 지표';
    if (tableContainer) tableContainer.style.display = 'block';
    if (chartContainer) chartContainer.style.display = 'none';
    if (selector) selector.style.display = 'none';
    if (actionArea) actionArea.style.display = 'flex';
    if (!table) {
      const homeStatsTable = document.getElementById('homeStatsTable');
      if (homeStatsTable && window.homeMidViewMode === 'stats') {
        renderOriginalStatsTable(homeStatsTable);
      }
      return;
    }

    if (perfStatsMode === 'realtime') {
      renderRealtimeStatusTable(table);
    } else {
      renderOriginalStatsTable(table);
    }

    const homeStatsTable = document.getElementById('homeStatsTable');
    if (homeStatsTable && window.homeMidViewMode === 'stats') {
      renderOriginalStatsTable(homeStatsTable);
    }
    return;
  }

  // ══════════════════════════════════════════════════════
  // 💼 홈 화면 상단 및 백테스트 뷰
  //   화면: 💼 자산현황 (도넛 파이차트 및 범례 고정)
  // ══════════════════════════════════════════════════════
  statsDisplayMode = 'chart';
  if (statsTitle) {
    statsTitle.innerHTML = '💼 자산현황';
    statsTitle.style.cursor = 'default';
    statsTitle.title = '자산현황';
  }
  if (tableContainer) tableContainer.style.display = 'none';
  if (chartContainer) chartContainer.style.display = 'flex';
  if (selector) selector.style.display = 'none';
  if (actionArea) actionArea.style.display = 'none';
  updateStatsPieChart();
  return;

  const homeStatsTable = document.getElementById('homeStatsTable');
  if (homeStatsTable && window.homeMidViewMode === 'stats') {
    renderOriginalStatsTable(homeStatsTable);
  }
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
        name: getSlotConfig(i)?.basics?.strategy || `A-QUANT 2-${i}`,
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
    if (m.key === 'yearlyProfit') v = sObj.yearlyProfit !== undefined ? sObj.yearlyProfit : 0;
    if (m.key === 'yearlyYield') v = sObj.yearlyYield !== undefined ? sObj.yearlyYield : 0;
    if (m.key === 'monthlyProfit') v = sObj.monthlyProfit !== undefined ? sObj.monthlyProfit : 0;
    if (m.key === 'monthlyYield') v = sObj.monthlyYield !== undefined ? sObj.monthlyYield : 0;
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
    { key: 'yield', label: '총수익률', type: 'color', pct: true },
    { key: 'yearlyYield', label: '년수익률', type: 'color', pct: true, isWideOnly: true },
    { key: 'monthlyYield', label: '월수익률', type: 'color', pct: true },
    { key: 'currentMdd', label: '현재 MDD', type: 'color', pct: true },
    { key: 'depletion', label: '진행도', type: 'color', pct: true },
    { key: 'totalProfit', label: '총수익금', type: 'color' },
    { key: 'yearlyProfit', label: '년수익금', type: 'color', isWideOnly: true },
    { key: 'monthlyProfit', label: '월수익금', type: 'color' },
    { key: 'mdd', label: '전체 MDD', type: 'color', pct: true },
    { key: 'cagr', label: 'CAGR', type: 'color', pct: true },
    { key: 'calmar', label: '칼마비율', type: 'raw' },
    { key: 'evalVal', label: '평가액', type: 'fmt' },
    { key: 'evalReturn', label: '평가수익', type: 'color', pct: true },
    { key: 'cash', label: '예수금', type: 'fmt' },
    { key: 'qty', label: '주식수', type: 'raw', suffix: '주' },
    { key: 'base', label: '갱신금', type: 'fmt', isWideOnly: true },
    { key: 'avgPrice', label: '평균단가', type: 'price', isWideOnly: true }
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

  let html = `<div class="stats-table-wrapper" style="display:flex; flex-direction:column; gap:1px; padding:2px; box-sizing:border-box; width:100%;">`;
  html += `<div class="stats-header-row" style="display:flex; align-items:center; gap:1px; padding:2px 3px 2px 0px; box-sizing:border-box; line-height:1; min-height:${headerRowMinHeightPx}px; width:100%;">`;
  html += `<div style="${headerCellStyle} ${labelColSizeStyle} flex-shrink:0; justify-content:flex-start; text-align:left; overflow:hidden; text-overflow:ellipsis; cursor:pointer;" onclick="window.onStatsTitleClick()" title="클릭하여 성과지표 / 실시간 운영현황 토글">구분 🔄</div>`;
  metricsList.forEach(m => {
    const minWidth = (m.key === 'totalAssets') ? totalAssetsColMinWidthPx : defaultMetricColMinWidthPx;
    const wideClass = m.isWideOnly ? ' stats-col-wide' : '';
    html += `<div class="${wideClass.trim()}" style="flex:1; min-width:${minWidth}px; ${headerCellStyle}">${m.label}</div>`;
  });
  html += '</div>';

  const getLatestPeriodRow = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return null;
    const valid = arr.filter(x => x && x.period);
    if (valid.length === 0) return null;
    return [...valid].sort((a, b) => String(b.period).localeCompare(String(a.period)))[0] || null;
  };

  rows.forEach((r) => {
    const isCombo = (r.name === '합산');
    const displaySummary = r.res ? ((isCombo || isBacktestStatsView) ? r.res.summary : getDisplayStatusData(r.res, r.slotNum)) : null;

    if (displaySummary) {
      const yArr = (r.slotNum === 'Combined')
        ? (window.globalCombinedYearlyData || [])
        : ((window.globalYearlyDataArr && window.globalYearlyDataArr[r.slotNum]) || (r.res && r.res.yearlyData) || []);
      const mArr = (r.slotNum === 'Combined')
        ? (window.globalCombinedMonthlyData || [])
        : ((window.globalMonthlyDataArr && window.globalMonthlyDataArr[r.slotNum]) || (r.res && r.res.monthlyData) || []);

      const latestYear = getLatestPeriodRow(yArr);
      const latestMonth = getLatestPeriodRow(mArr);

      displaySummary.yearlyProfit = latestYear ? Number(latestYear.profit || 0) : 0;
      displaySummary.yearlyYield = latestYear ? Number(latestYear.rate || 0) : 0;
      displaySummary.monthlyProfit = latestMonth ? Number(latestMonth.profit || 0) : 0;
      displaySummary.monthlyYield = latestMonth ? Number(latestMonth.rate || 0) : 0;
    }

    html += `<div class="stats-row" style="display:flex; align-items:center; gap:1px; border-radius:3px; padding:0 3px 0 0px; box-sizing:border-box; line-height:1; min-height:18px; width:100%;">`;
    html += `<div style="font-size:var(--app-font-size, 10.5px); font-weight:700; letter-spacing:-0.2px; line-height:1; ${labelColSizeStyle} flex-shrink:0; color:${r.color}; display:flex; align-items:center; justify-content:flex-start; text-align:left; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${formatStrategyNameWithSmallParentheses(r.name)}</div>`;
    metricsList.forEach(m => {
      let cellVal = fmtValue(displaySummary, m, isCombo);
      const minWidth = (m.key === 'totalAssets') ? totalAssetsColMinWidthPx : defaultMetricColMinWidthPx;
      const isPrincipal = (m.key === 'realPrincipal');
      const classes = [
        isPrincipal ? 'stats-asset-principal-val' : '',
        m.isWideOnly ? 'stats-col-wide' : ''
      ].filter(Boolean).join(' ');
      const cellClass = classes ? `class="${classes}"` : '';
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
        const d = localStorage.getItem(`vtotal3_sheet_last_date_${i}_${myUserId}`) || localStorage.getItem(`vtotal_sheet_last_date_${i}_${myUserId}`);
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

  let displayTotal = Number(s.totalAssets !== undefined ? s.totalAssets : (s.total_assets || 0));
  let displayBase = Number(s.base !== undefined ? s.base : (s.base_principal || 0));
  let displayPrincipal = Number(s.realPrincipal !== undefined ? s.realPrincipal : (s.base || displayBase || 0));
  let displayCash = Number(s.cash !== undefined ? s.cash : 0);
  let displayEval = Number(s.evalVal !== undefined ? s.evalVal : 0);
  let displayQty = Number(s.qty !== undefined ? s.qty : 0);
  let displayCurrentMdd = Number(s.currentMdd !== undefined ? s.currentMdd : 0);
  let displayMdd = Number(s.mdd !== undefined ? s.mdd : displayCurrentMdd);
  let displayYield = displayPrincipal > 0 ? (displayTotal - displayPrincipal) / displayPrincipal : 0;
  let displayEvalReturn = Number(s.evalReturn !== undefined ? s.evalReturn : 0);
  let displayDepletion = Number(s.depletion !== undefined ? s.depletion : 0);
  let displayAvgPrice = Number(s.avgPrice !== undefined ? s.avgPrice : 0);
  let displayCagr = Number(s.cagr !== undefined ? s.cagr : 0);
  let displayCalmar = Number(s.calmar !== undefined ? s.calmar : 0);
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
    if (hQty > 0) displayQty = hQty;
    if (hQty > 0 && hCost > 0) displayAvgPrice = hCost / hQty;
  };

  // ⭐️ [시트 실제값 단일 진실 공급원] dailyStates가 있으면 최신 시트 행과 JSON을 기반으로 실제 계좌 값 반영
  if (slotNum !== 'Combined') {
    if (res.dailyStates && res.dailyStates.length > 0) {
      const lastState = res.dailyStates[res.dailyStates.length - 1];
      if (lastState && lastState.asset !== undefined) displayTotal = Number(lastState.asset || 0);
      try {
        const lastJson = JSON.parse(lastState.json || '{}');
        if (lastJson.cash !== undefined) displayCash = Number(lastJson.cash || 0);
        if (lastJson.base_principal !== undefined) displayBase = Number(lastJson.base_principal || 0);
        else if (lastJson.base !== undefined) displayBase = Number(lastJson.base || 0);
        
        if (lastJson.realPrincipal !== undefined && Number(lastJson.realPrincipal) > 0) {
          displayPrincipal = Number(lastJson.realPrincipal);
        } else if (displayPrincipal <= 0) {
          displayPrincipal = displayBase;
        }

        displayEval = lastJson.evalVal !== undefined ? Number(lastJson.evalVal || 0) : Math.max(0, displayTotal - displayCash);
        displayQty = lastJson.qty !== undefined ? Number(lastJson.qty || 0) : displayQty;
        displayEvalReturn = lastJson.evalReturn !== undefined ? Number(lastJson.evalReturn || 0) : displayEvalReturn;
        displayDepletion = lastJson.depletion !== undefined ? Number(lastJson.depletion || 0) : (displayTotal > 0 ? displayEval / displayTotal : 0);
        displayAvgPrice = lastJson.avgPrice !== undefined ? Number(lastJson.avgPrice || 0) : displayAvgPrice;
        applyHoldingsFallback(lastJson);

        const assets = res.dailyStates.map(d => Number(d.asset || 0));
        const peak = assets.length > 0 ? Math.max(...assets) : 0;
        displayCurrentMdd = peak > 0 ? (displayTotal - peak) / peak : 0;
      } catch (e) {
        displayEval = Math.max(0, displayTotal - displayCash);
      }
    }
  } else {
    displayEval = s.evalVal !== undefined ? Number(s.evalVal) : Math.max(0, displayTotal - displayCash);
  }

  // 보유주식이 있는 경우 실시간 보유 목록 기반으로 수량/평단가 정밀 보정
  if (Array.isArray(res.inv) && res.inv.length > 0) {
    let invQty = 0;
    let invCost = 0;
    res.inv.forEach(h => {
      const q = parseFloat(h.qty || 0) || 0;
      const p = parseFloat(h.buy_price || h.buyPrice || h.price || 0) || 0;
      invQty += q;
      invCost += (q * p);
    });
    if (invQty > 0) {
      displayQty = invQty;
      displayAvgPrice = invCost > 0 ? invCost / invQty : displayAvgPrice;
    }
  }

  let displayTotalProfit = displayTotal - displayPrincipal;
  // ⭐️ [년수익-총수익 일관성 보장] 실전 데이터에 yearlyData가 있으면,
  // 실제 기간별 수익 집계(startingAsset + inout 기준)를 기반으로 총수익 및 실전 원금을 정합성 있게 도출
  if (slotNum !== 'Combined' && Array.isArray(res.yearlyData) && res.yearlyData.length > 0) {
    const sumYearlyProfit = res.yearlyData.reduce((sum, y) => sum + Number(y.profit || 0), 0);
    displayTotalProfit = sumYearlyProfit;
    const calcPrinc = displayTotal - sumYearlyProfit;
    if (calcPrinc > 0) {
      displayPrincipal = calcPrinc;
    }
  }
  displayYield = displayPrincipal > 0 ? (displayTotalProfit / displayPrincipal) : 0;
  let displayEvalProfit = (displayEval > 0 && displayQty > 0 && displayAvgPrice > 0) ? (displayEval - (displayQty * displayAvgPrice)) : (s.evalProfit || 0);

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
      const yData = (typeof globalCombinedYearlyData !== 'undefined' && globalCombinedYearlyData) || window.globalCombinedYearlyData || [];
      const mData = (typeof globalCombinedMonthlyData !== 'undefined' && globalCombinedMonthlyData) || window.globalCombinedMonthlyData || [];
      const dData = (typeof globalCombinedDailyData !== 'undefined' && globalCombinedDailyData) || window.globalCombinedDailyData || [];
      rows = kind === 'year' ? yData : (kind === 'month' ? mData : dData);
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
  const currentStatsMode = (typeof statsDisplayMode !== 'undefined' ? statsDisplayMode : (window.statsDisplayMode || 'chart'));
  if (currentStatsMode === 'chart') {
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

function updateStatsTitleAccountNo(result) {
  const acctNo = result?.accountNo || result?.cano || result?.acnt_no || "";
  if (acctNo) {
    window.lastAccountNo = acctNo;
  }
  const displayAcct = window.lastAccountNo ? ` (${window.lastAccountNo})` : "";
  const statsTitle = document.getElementById('statsTitle');
  const currentStatsMode = (typeof statsDisplayMode !== 'undefined' ? statsDisplayMode : (window.statsDisplayMode || 'chart'));
  if (statsTitle && currentStatsMode === 'table') {
    statsTitle.innerHTML = `📡 계좌 정보${displayAcct}`;
  }
  const periodTitle = document.getElementById('periodTitle');
  const grid = document.getElementById('mainGrid');
  const isBacktest = !!(window.isManualBacktestMode || (grid && grid.classList.contains('backtest-view-layout')));
  if (periodTitle && !grid?.classList.contains('perf-tab-layout') && !isBacktest) {
    if (window.homeMidViewMode === 'stats') {
      periodTitle.innerHTML = '📄 성과 지표';
    } else {
      periodTitle.innerHTML = `📡 계좌 정보${displayAcct}`;
    }
  }
}

function buildBalanceHtml(result, broker) {
  const usdCash = Number(result.usdCash || result.deposit || 0);
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

  let cashAsset = usdCash;
  // ⚠️ LS는 외화 RP 95% 담보가 적용되므로 95% 역산, 키움은 RP가 없으므로 최종 정산예수금 그대로 사용.
  //    미체결 매수 주문이 있는 경우 buyingPower(주문가능금액)에서 이미 차감되어 있으므로
  //    프록시의 totalCashAsset을 우선 사용하거나, 미체결 매수 금액을 buyingPower에 복원하여 역산한다.
  if (broker === "ls") {
    let unfilledBuyAmt = Number(result.unfilledBuyUsd || 0);
    if (!unfilledBuyAmt && window.orderStatusCache && Array.isArray(window.orderStatusCache.unfilledOrders)) {
      unfilledBuyAmt = window.orderStatusCache.unfilledOrders
        .filter(o => {
          const br = o.broker || (window.BrokerService ? window.BrokerService.brokerForSlot(o.slot) : 'ls');
          return br === 'ls' && String(o.side || '').toUpperCase() === 'BUY';
        })
        .reduce((sum, o) => sum + (Number(o.qty || 0) * Number(o.price || 0)), 0);
    }

    if (result.totalCashAsset !== undefined && Number(result.totalCashAsset) > 0 && Number(result.unfilledBuyUsd || 0) > 0) {
      // 프록시가 이미 unfilledBuyUsd를 반영하여 산출한 totalCashAsset
      cashAsset = Number(result.totalCashAsset);
    } else {
      // 프록시 응답에 미체결 매수분이 미반영되었거나 구버전 캐시인 경우 프론트에서 직접 복원 역산
      const effectiveBuyingPower = buyingPower + unfilledBuyAmt;
      if (effectiveBuyingPower > usdCash) {
        const wonCollateralUsd = (effectiveBuyingPower - usdCash) / 0.95;
        cashAsset = wonCollateralUsd + usdCash;
      } else {
        cashAsset = usdCash;
      }
    }
  }
  const totalAsset = cashAsset + evalAmt;
  const usd = (v) => "$" + Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ⭐️ 실시간 운영현황 통합 합산 데이터 (원금, 일수익, 월수익, 년수익, 총수익)
  const curDailyData = (typeof globalCombinedDailyData !== 'undefined' && globalCombinedDailyData) || window.globalCombinedDailyData || [];
  if ((!curDailyData || curDailyData.length === 0) && typeof calculateCombinedPeriodData === 'function') {
    try { calculateCombinedPeriodData(); } catch (e) { }
  }

  let comb = null;
  try {
    if (typeof calculateCombinedSummary === 'function') {
      comb = calculateCombinedSummary();
    }
  } catch (e) { }
  if (!comb && window.cachedCombinedStats) {
    comb = window.cachedCombinedStats;
  }

  const manualPrincipal = (typeof getManualEstimatedPrincipal === 'function')
    ? getManualEstimatedPrincipal(broker)
    : (typeof window.getManualEstimatedPrincipal === 'function' ? window.getManualEstimatedPrincipal(broker) : 0);
  const backtestPrincipal = comb ? Number(comb.realPrincipal !== undefined ? comb.realPrincipal : (comb.base || comb.base_principal || 0)) : 0;
  const principal = manualPrincipal > 0 ? manualPrincipal : backtestPrincipal;
  const hasComb = (manualPrincipal > 0) || !!comb;
  const totalProfit = comb ? Number(comb.totalProfit !== undefined ? comb.totalProfit : ((comb.totalAssets || 0) - backtestPrincipal)) : 0;
  const totalYield = comb ? Number(comb.yield !== undefined ? comb.yield : (backtestPrincipal > 0 ? totalProfit / backtestPrincipal : 0)) : 0;

  const getLatestCombinedPeriodRow = (kind) => {
    let rows = [];
    if (kind === 'year') {
      rows = (typeof globalCombinedYearlyData !== 'undefined' && Array.isArray(globalCombinedYearlyData) && globalCombinedYearlyData.length > 0)
        ? globalCombinedYearlyData : (window.globalCombinedYearlyData || []);
    } else if (kind === 'month') {
      rows = (typeof globalCombinedMonthlyData !== 'undefined' && Array.isArray(globalCombinedMonthlyData) && globalCombinedMonthlyData.length > 0)
        ? globalCombinedMonthlyData : (window.globalCombinedMonthlyData || []);
    } else {
      rows = (typeof globalCombinedDailyData !== 'undefined' && Array.isArray(globalCombinedDailyData) && globalCombinedDailyData.length > 0)
        ? globalCombinedDailyData : (window.globalCombinedDailyData || []);
    }
    if (!Array.isArray(rows) || rows.length === 0) return null;
    return [...rows].filter(r => r && r.period).sort((a, b) => String(b.period).localeCompare(String(a.period)))[0] || null;
  };

  const dayRow = getLatestCombinedPeriodRow('day');
  const monthRow = getLatestCombinedPeriodRow('month');
  const yearRow = getLatestCombinedPeriodRow('year');

  const isLight = typeof document !== 'undefined' && document.body && document.body.classList.contains('light-mode');
  const plusColor = isLight ? '#1d4ed8' : '#10b981';
  const minusColor = isLight ? '#b91c1c' : '#f43f5e';

  const formatProfitWithRate = (profit, rate, hasData) => {
    if (!hasData || profit === undefined || profit === null) return '<span style="font-size:calc(var(--app-font-size, 10.5px) - 0.5px); color:var(--text-muted, #94a3b8); font-weight:normal;">-</span>';
    const numProfit = Number(profit || 0);
    const numRate = Number(rate || 0);
    const color = numProfit > 0 ? plusColor : (numProfit < 0 ? minusColor : 'var(--text, #fff)');
    const sign = numProfit < 0 ? '-' : (numProfit > 0 ? '+' : '');
    const pctSign = numRate > 0 ? '+' : '';
    const pctStr = (numRate * 100).toFixed(1) + '%';
    const fullText = `${sign}${usd(Math.abs(numProfit))} (${pctSign}${pctStr})`;
    return `<span style="font-size:calc(var(--app-font-size, 10.5px) - 0.5px); color:${color}; font-weight:normal;" title="${fullText}">${sign}${usd(Math.abs(numProfit))}<span class="summary-rate-pct" style="font-size:calc(var(--app-font-size, 10.5px) - 1.5px); font-weight:normal; opacity:0.9;">&nbsp;(${pctSign}${pctStr})</span></span>`;
  };

  const principalHtml = (hasComb && principal > 0)
    ? `<span style="font-size:calc(var(--app-font-size, 10.5px) - 0.5px); color:var(--text, #fff); font-weight:normal;">${usd(principal)}</span>`
    : (hasComb ? `<span style="font-size:calc(var(--app-font-size, 10.5px) - 0.5px); color:var(--text, #fff); font-weight:normal;">$0.00</span>` : '<span style="font-size:calc(var(--app-font-size, 10.5px) - 0.5px); color:var(--text-muted, #94a3b8); font-weight:normal;">-</span>');

  const cashLabel = broker === "ls" ? "예수금(RP)" : "예수금";
  const cashValHtml = `<span style="font-size:calc(var(--app-font-size, 10.5px) - 0.5px); color:var(--text, #fff); font-weight:normal;">${usd(broker === "ls" ? (totalAsset - evalAmt) : usdCash)}</span>`;
  const buyingPowerHtml = `<span style="font-size:calc(var(--app-font-size, 10.5px) - 0.5px); color:var(--text, #fff); font-weight:normal;">${usd(buyingPower)}</span>`;
  const evalAmtHtml = `<span style="font-size:calc(var(--app-font-size, 10.5px) - 0.5px); color:var(--text, #fff); font-weight:normal;">${usd(evalAmt)}</span>`;
  let otherProfit = (totalAsset || 0) - (principal || 0) - (totalProfit || 0);
  if (Math.abs(otherProfit) < 0.005) otherProfit = 0;
  const otherProfitColor = '#06b6d4';
  const otherProfitSign = otherProfit > 0 ? '+' : (otherProfit < 0 ? '-' : '');
  const otherProfitRate = (principal > 0) ? (otherProfit / principal) : 0;
  const otherProfitRateSign = otherProfitRate > 0 ? '+' : '';
  const otherProfitRateStr = (otherProfitRate * 100).toFixed(1) + '%';
  const otherProfitHtml = hasComb
    ? `<span style="font-size:calc(var(--app-font-size, 10.5px) - 0.5px); color:${otherProfitColor}; font-weight:normal;">${otherProfitSign}${usd(Math.abs(otherProfit))}<span class="summary-rate-pct" style="font-size:calc(var(--app-font-size, 10.5px) - 1.5px); font-weight:normal; opacity:0.9;">&nbsp;(${otherProfitRateSign}${otherProfitRateStr})</span></span>`
    : `<span style="font-size:calc(var(--app-font-size, 10.5px) - 0.5px); color:${otherProfitColor}; font-weight:normal;">${otherProfitSign}${usd(Math.abs(otherProfit))}</span>`;
  const totalAssetHtml = `<span style="color:#fbbf24; font-weight:600;">${usd(totalAsset)}</span>`;

  // ⭐️ 총수익 = 총자산 - 원금
  const acctTotalProfit = (totalAsset || 0) - (principal || 0);
  const acctTotalYield = (principal > 0) ? (acctTotalProfit / principal) : 0;
  const acctTotalProfitColor = acctTotalProfit > 0 ? plusColor : (acctTotalProfit < 0 ? minusColor : 'var(--text, #fff)');
  const acctTotalProfitSign = acctTotalProfit < 0 ? '-' : (acctTotalProfit > 0 ? '+' : '');
  const acctTotalYieldSign = acctTotalYield > 0 ? '+' : '';
  const acctTotalYieldStr = (acctTotalYield * 100).toFixed(1) + '%';
  const acctTotalProfitFullText = hasComb
    ? `${acctTotalProfitSign}${usd(Math.abs(acctTotalProfit))} (${acctTotalYieldSign}${acctTotalYieldStr})`
    : '-';
  const acctTotalProfitHtml = hasComb
    ? `<span style="font-size:var(--app-font-size, 10.5px) !important; font-weight:700 !important; color:${acctTotalProfitColor} !important; font-family:inherit; line-height:1.2;" title="${acctTotalProfitFullText}">${acctTotalProfitSign}${usd(Math.abs(acctTotalProfit))}<span class="summary-rate-pct" style="font-size:calc(var(--app-font-size, 10.5px) - 1px); font-weight:normal; opacity:0.9;">&nbsp;(${acctTotalYieldSign}${acctTotalYieldStr})</span></span>`
    : `<span style="font-size:var(--app-font-size, 10.5px) !important; font-weight:700 !important; color:var(--text-muted, #94a3b8); font-weight:700;">-</span>`;

  const dayProfitHtml = formatProfitWithRate(dayRow?.profit, dayRow?.rate, !!dayRow);
  const monthProfitHtml = formatProfitWithRate(monthRow?.profit, monthRow?.rate, !!monthRow);
  const yearProfitHtml = formatProfitWithRate(yearRow?.profit, yearRow?.rate, !!yearRow);
  const totalProfitHtml = formatProfitWithRate(totalProfit, totalYield, hasComb);

  let html = '<div style="display:flex; flex-direction:column; gap:1px; padding:2px; box-sizing:border-box; width:100%;">';

  // ⭐️ 1) 상단: 가로 요약 바 (최상단 총자산/총수익은 10.5px, 하단 서브 8개 항목은 10.0px)
  html += `
    <style>
      .stats-stock-table { font-family: inherit; margin-top: 3px; }
      .stats-stock-table th {
        font-size: 11px !important;
        font-weight: 700 !important;
        color: var(--text-muted, #94a3b8) !important;
        font-family: inherit;
        padding: 3px 2px !important;
        border-top: 1px solid rgba(100, 116, 139, 0.25) !important;
        border-bottom: 1px solid rgba(100, 116, 139, 0.25) !important;
      }
      body.light-mode .stats-stock-table th {
        border-top: 1px solid rgba(15, 23, 42, 0.15) !important;
        border-bottom: 1px solid rgba(15, 23, 42, 0.15) !important;
      }
      .stats-stock-table td { font-size: 10.5px !important; font-family: inherit; padding: 3px 2px !important; }

      .stats-balance-summary-card {
        container-type: inline-size;
        width: 100%;
        margin-top: 1px;
        margin-bottom: 2px;
        font-family: inherit;
        -webkit-text-size-adjust: 100% !important;
        text-size-adjust: 100% !important;
      }
      .stats-balance-summary-card * {
        -webkit-text-size-adjust: 100% !important;
        text-size-adjust: 100% !important;
      }
      .summary-5col-table {
        width: 100%;
        border-collapse: separate !important;
        border-spacing: 1px 1px !important;
        table-layout: fixed;
        font-family: inherit;
      }
      .summary-5col-table td {
        padding: 3px 6px !important;
        text-align: left !important;
        font-size: calc(var(--app-font-size, 10.5px) - 0.5px) !important;
        font-family: inherit;
        font-weight: normal !important;
        background: transparent !important;
      }
      .summary-narrow-table {
        display: none;
        width: 100%;
        border-collapse: separate !important;
        border-spacing: 1px 1px !important;
        font-family: inherit;
        font-size: calc(var(--app-font-size, 10.5px) - 0.5px) !important;
      }
      .summary-narrow-table td {
        padding: 3px 6px !important;
        font-family: inherit;
        font-size: calc(var(--app-font-size, 10.5px) - 0.5px) !important;
        background: transparent !important;
      }
      .summary-narrow-table td:nth-child(odd) {
        font-size: calc(var(--app-font-size, 10.5px) - 0.5px) !important;
        font-weight: normal !important;
        color: var(--text-muted, #94a3b8) !important;
      }
      .summary-narrow-table td:nth-child(even) {
        font-size: calc(var(--app-font-size, 10.5px) - 0.5px) !important;
        font-weight: normal !important;
      }
      .summary-lbl {
        display: inline-block;
        font-size: calc(var(--app-font-size, 10.5px) - 0.5px) !important;
        font-weight: normal !important;
        color: var(--text-muted, #94a3b8) !important;
        font-family: inherit;
        line-height: 1.2;
      }
      .summary-val {
        display: inline-block;
        font-size: calc(var(--app-font-size, 10.5px) - 0.5px) !important;
        font-weight: normal !important;
        font-family: inherit;
        line-height: 1.2;
      }
      .summary-val > span,
      .summary-val *,
      .summary-narrow-table td:nth-child(even) > span {
        font-size: calc(var(--app-font-size, 10.5px) - 0.5px) !important;
        font-weight: normal !important;
      }

      .summary-total-asset-td,
      body.light-mode .summary-total-asset-td,
      body.light-mode .data-table td.summary-total-asset-td,
      body.light-mode table.data-table tr td.summary-total-asset-td,
      body.light-mode .summary-narrow-table td.summary-total-asset-td,
      body.light-mode .summary-5col-table td.summary-total-asset-td {
        padding: 3px 6px !important;
        background: transparent !important;
        background-color: transparent !important;
        border: none !important;
        box-shadow: none !important;
      }
      .summary-total-asset-lbl {
        display: inline-block;
        font-size: var(--app-font-size, 10.5px) !important;
        font-weight: 700 !important;
        color: var(--text, #ffffff) !important;
        font-family: inherit;
        line-height: 1.2;
        background: transparent !important;
        box-shadow: none !important;
        text-shadow: none !important;
      }
      body.light-mode .summary-total-asset-lbl {
        color: #000000 !important;
      }
      .summary-total-asset-val {
        display: inline-block;
        font-size: var(--app-font-size, 10.5px) !important;
        font-weight: 700 !important;
        color: var(--text, #ffffff) !important;
        font-family: inherit;
        line-height: 1.2;
        background: transparent !important;
        box-shadow: none !important;
        text-shadow: none !important;
      }
      body.light-mode .summary-total-asset-val {
        color: #000000 !important;
      }

      @container (max-width: 620px) {
        .summary-5col-table { display: none !important; }
        .summary-narrow-table { display: table !important; }
      }
      @media (max-width: 620px) {
        .summary-5col-table { display: none !important; }
        .summary-narrow-table { display: table !important; }
      }
    </style>
    <div class="stats-balance-summary-card">
      <!-- 1) 넓은 화면용: 4개 열 상하 정렬 (최상단 총자산/총수익 행 + 2행 4열) -->
      <table class="data-table summary-5col-table">
        <colgroup>
          <col style="width:25%;">
          <col style="width:25%;">
          <col style="width:25%;">
          <col style="width:25%;">
        </colgroup>
        <tbody>
          <!-- ⭐️ 최상단 1행: 설정 폰트 크기 + 0.5px (11.0px) -->
          <tr style="background:transparent !important; background-color:transparent !important;">
            <td colspan="2" class="summary-total-asset-td" style="background:transparent !important; background-color:transparent !important; border:none !important; box-shadow:none !important;">
              <div style="display:flex; justify-content:space-between; align-items:baseline; width:100%;">
                <span class="summary-total-asset-lbl" style="white-space:nowrap;">총자산</span>
                <span style="display:flex; align-items:baseline; gap:3px; margin-left:auto;">
                  <span class="summary-total-asset-val">${usd(totalAsset)}</span>
                </span>
              </div>
            </td>
            <td colspan="2" class="summary-total-asset-td" style="background:transparent !important; background-color:transparent !important; border:none !important; box-shadow:none !important;">
              <div style="display:flex; justify-content:space-between; align-items:baseline; width:100%;">
                <span class="summary-total-asset-lbl" style="white-space:nowrap;">총수익</span>
                <span style="margin-left:auto;">${acctTotalProfitHtml}</span>
              </div>
            </td>
          </tr>
          <tr>
            <td colspan="4" style="background:transparent !important; border:none !important; box-shadow:none !important; padding:3px 6px !important;">
              <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                <div style="display:flex; align-items:center; gap:3px; white-space:nowrap;"><span class="summary-lbl">${cashLabel}:</span><span class="summary-val">${cashValHtml}</span></div>
                <div style="display:flex; align-items:center; gap:3px; white-space:nowrap;"><span class="summary-lbl">주문 가능금액:</span><span class="summary-val">${buyingPowerHtml}</span></div>
                <div style="display:flex; align-items:center; gap:3px; white-space:nowrap;"><span class="summary-lbl">기타수익:</span><span class="summary-val">${otherProfitHtml}</span></div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- 2) 좁은 화면용: 4열 테이블 -->
      <table class="data-table summary-narrow-table" style="table-layout:fixed;">
        <colgroup>
          <col style="width:26%;">
          <col style="width:24%;">
          <col style="width:26%;">
          <col style="width:24%;">
        </colgroup>
        <tbody>
          <!-- ⭐️ 좁은 화면 최상단 1행: 설정 폰트 크기 + 0.5px (11.0px) -->
          <tr style="background:transparent !important; background-color:transparent !important;">
            <td colspan="2" class="summary-total-asset-td" style="background:transparent !important; background-color:transparent !important; border:none !important; box-shadow:none !important;">
              <div style="display:flex; justify-content:space-between; align-items:baseline; width:100%;">
                <span class="summary-total-asset-lbl" style="white-space:nowrap;">총자산</span>
                <span style="display:flex; align-items:baseline; gap:2px; margin-left:auto;">
                  <span class="summary-total-asset-val">${usd(totalAsset)}</span>
                </span>
              </div>
            </td>
            <td colspan="2" class="summary-total-asset-td" style="background:transparent !important; background-color:transparent !important; border:none !important; box-shadow:none !important;">
              <div style="display:flex; justify-content:space-between; align-items:baseline; width:100%;">
                <span class="summary-total-asset-lbl" style="white-space:nowrap;">총수익</span>
                <span style="margin-left:auto;">${acctTotalProfitHtml}</span>
              </div>
            </td>
          </tr>
          <tr>
            <td colspan="4" style="background:transparent !important; border:none !important; box-shadow:none !important; padding:3px 6px !important;">
              <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                <div style="display:flex; align-items:center; gap:3px; white-space:nowrap;"><span class="summary-lbl">${cashLabel}:</span><span class="summary-val">${cashValHtml}</span></div>
                <div style="display:flex; align-items:center; gap:3px; white-space:nowrap;"><span class="summary-lbl">주문 가능금액:</span><span class="summary-val">${buyingPowerHtml}</span></div>
                <div style="display:flex; align-items:center; gap:3px; white-space:nowrap;"><span class="summary-lbl">기타수익:</span><span class="summary-val">${otherProfitHtml}</span></div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

  `;

  // ⭐️ 2) 하단: 종목별 잔고 테이블 (종목명, 평단가, 현재가, 수량, 평가금, 수익률, 평가손익)
  html += '<table class="data-table stats-stock-table" style="width:100%; border-collapse:separate !important; border-spacing:1px 1px !important; margin-bottom:2px; table-layout:fixed;">';
  html += '<colgroup>';
  html += '<col style="width:18%;">';
  html += '<col style="width:14%;">';
  html += '<col style="width:14%;">';
  html += '<col style="width:12%;">';
  html += '<col style="width:15%;">';
  html += '<col style="width:12%;">';
  html += '<col style="width:15%;">';
  html += '</colgroup>';
  html += '<thead><tr>';
  html += '<th style="text-align:center;">종목명</th>';
  html += '<th style="text-align:center;">평단가</th>';
  html += '<th style="text-align:center;">현재가</th>';
  html += '<th style="text-align:center;">수량</th>';
  html += '<th style="text-align:center;">평가금</th>';
  html += '<th style="text-align:center;">수익률</th>';
  html += '<th style="text-align:center;">평가손익</th>';
  html += '</tr></thead>';
  html += '<tbody>';

  if (normalizedHoldings.length === 0) {
    html += '<tr><td colspan="7" class="table-empty-cell" style="padding:16px; color:#64748b; text-align:center;">보유 주식이 없습니다.</td></tr>';
  } else {
    normalizedHoldings.forEach(h => {
      const isLight = typeof document !== 'undefined' && document.body && document.body.classList.contains('light-mode');
      const profitRate = (h.avgPrice > 0 && h.qty > 0) ? ((h.currPrice - h.avgPrice) / h.avgPrice * 100) : 0;
      const isPlus = profitRate >= 0;
      const color = isPlus ? (isLight ? '#1d4ed8' : '#10b981') : (isLight ? '#b91c1c' : '#f43f5e');
      const prefix = isPlus ? '+' : '';
      const pnlStr = (h.pnlVal < 0 ? '-' : '') + '$' + Math.abs(h.pnlVal).toFixed(2);

      html += '<tr>';
      html += `<td style="font-weight:700; color:var(--text, #fda4af); text-align:center;">${h.symbol}</td>`;
      html += `<td style="font-weight:700; color:#8b5cf6; text-align:center;">$${h.avgPrice.toFixed(2)}</td>`;
      html += `<td style="text-align:center;">$${h.currPrice.toFixed(2)}</td>`;
      html += `<td style="font-weight:700; color:#8b5cf6; text-align:center;">${h.qty.toLocaleString()}주</td>`;
      html += `<td style="text-align:center;">$${h.valuation.toFixed(2)}</td>`;
      html += `<td style="font-weight:700; color:${color}; text-align:center;">${prefix}${profitRate.toFixed(1)}%</td>`;
      html += `<td style="font-weight:700; color:${color}; text-align:center;">${pnlStr}</td>`;
      html += '</tr>';
    });
  }
  html += '</tbody></table>';

  html += '</div>';
  return html;
}

async function renderKiwoomBalanceOnStatsTable(table) {
  if (!table) table = document.getElementById('homeAccountTable') || document.getElementById('statsTable');
  if (!table) return;
  const broker = window.BrokerService ? window.BrokerService.activeBroker : "kiwoom";
  const brokerLabel = broker === "ls" ? "LS" : "키움";

  // 1) 캐시된 데이터가 있거나 이미 화면에 현재 브로커 데이터가 출력되어 있다면
  //    빈 화면('조회 중...')으로 덮어쓰지 않고 즉시 표시 또는 기존 화면을 유지(Stale-While-Revalidate)
  const cached = window.BrokerReconcile?.getCachedBalance ? window.BrokerReconcile.getCachedBalance(broker) : null;
  const alreadyRenderedSameBroker = (table.dataset?.broker === broker && table.querySelector('.stats-balance-summary-card'));

  if (cached && cached.success !== false) {
    table.innerHTML = buildBalanceHtml(cached, broker);
    if (!table.dataset) table.dataset = {};
    table.dataset.broker = broker;
    updateStatsTitleAccountNo(cached);
    const selector = document.getElementById('statsMetricSelector');
    if (selector && selector.value === 'account' && (window.statsDisplayMode || statsDisplayMode) === 'chart') {
      if (typeof window.updateStatsPieChart === 'function') {
        window.updateStatsPieChart('account');
      }
    }
  } else if (!alreadyRenderedSameBroker) {
    table.innerHTML = `<div style="padding:20px; color:#64748b; text-align:center; font-size:11px;">${brokerLabel} 증권사 실전 잔고 정보를 조회 중...</div>`;
  }

  const fetchStartTime = Date.now();
  try {
    let result = null;
    if (window.BrokerReconcile && window.BrokerReconcile.getBalance) {
      result = await window.BrokerReconcile.getBalance(broker);
    } else if (window.BrokerService && window.BrokerService.fetchOverseasBalance) {
      result = await window.BrokerService.fetchOverseasBalance(broker);
    }

    const currentBroker = window.BrokerService ? window.BrokerService.activeBroker : "kiwoom";
    if (currentBroker !== broker) return; // 중간에 브로커가 변경되었으면 무시

    if (!result || result.success === false) {
      const errMsg = (result && result.error) || "계좌 데이터를 가져오지 못했습니다.";
      const isMaint = window.BrokerService && typeof window.BrokerService.isMaintenanceError === 'function' && window.BrokerService.isMaintenanceError(errMsg);
      if (isMaint) {
        window.BrokerService.showMaintenancePopup(broker, errMsg);
        table.innerHTML = `
          <div style="padding:22px 16px; background:rgba(245,158,11,0.06); border:1px dashed rgba(245,158,11,0.4); border-radius:10px; color:#f59e0b; text-align:center; font-size:11.5px; margin:8px 0;">
            <div style="font-size:20px; margin-bottom:4px;">🛠️</div>
            <strong style="font-size:12.5px;">${brokerLabel} 시스템 점검 중</strong><br/>
            <span style="font-size:10px; color:#cbd5e1; opacity:0.9; display:inline-block; margin-top:4px;">
              현재 증권사 서버 전산 점검 시간입니다.<br/>
              점검 중에는 계좌 조회가 제한되며, 점검 종료 후 정상화됩니다.
            </span>
          </div>`;
        if (!table.dataset) table.dataset = {};
        table.dataset.broker = broker;
        return;
      }
      if (table.querySelector('.stats-balance-summary-card') && table.dataset && table.dataset.broker === broker) {
        console.warn(`[${brokerLabel} 잔고 갱신 실패 (기존 화면 유지)]:`, result?.error);
        return;
      }
      table.innerHTML = `<div style="padding:20px; color:#f43f5e; text-align:center; font-size:11px;">${brokerLabel} API 연동 실패<br/><span style="font-size:9.5px; opacity:0.8;">사유: ${errMsg}</span></div>`;
      if (!table.dataset) table.dataset = {};
      table.dataset.broker = broker;
      return;
    }

    const fetchDuration = Date.now() - fetchStartTime;
    table.innerHTML = buildBalanceHtml(result, broker);
    if (!table.dataset) table.dataset = {};
    table.dataset.broker = broker;
    updateStatsTitleAccountNo(result);

    const selector = document.getElementById('statsMetricSelector');
    if (selector && selector.value === 'account' && (window.statsDisplayMode || statsDisplayMode) === 'chart') {
      if (typeof window.updateStatsPieChart === 'function') {
        window.updateStatsPieChart('account');
      }
    }

    // ⭐️ 증권사 최신 계좌 로딩 완료 시 부드러운 전환 ("스르륵" 페이드인 효과)
    if (fetchDuration > 50 || !alreadyRenderedSameBroker) {
      table.classList.remove('account-smooth-fade');
      void table.offsetWidth; // DOM reflow 강제하여 애니메이션 재시작
      table.classList.add('account-smooth-fade');
    }
  } catch (e) {
    console.error(`${brokerLabel} 잔고 로드 실패:`, e);
    const isMaint = window.BrokerService && typeof window.BrokerService.isMaintenanceError === 'function' && window.BrokerService.isMaintenanceError(e.message);
    if (isMaint) {
      window.BrokerService.showMaintenancePopup(broker, e.message);
      table.innerHTML = `
        <div style="padding:22px 16px; background:rgba(245,158,11,0.06); border:1px dashed rgba(245,158,11,0.4); border-radius:10px; color:#f59e0b; text-align:center; font-size:11.5px; margin:8px 0;">
          <div style="font-size:20px; margin-bottom:4px;">🛠️</div>
          <strong style="font-size:12.5px;">${brokerLabel} 시스템 점검 중</strong><br/>
          <span style="font-size:10px; color:#cbd5e1; opacity:0.9; display:inline-block; margin-top:4px;">
            현재 증권사 서버 전산 점검 시간입니다.<br/>
            점검 중에는 계좌 조회가 제한되며, 점검 종료 후 정상화됩니다.
          </span>
        </div>`;
      if (!table.dataset) table.dataset = {};
      table.dataset.broker = broker;
    } else if (!table.querySelector('.stats-balance-summary-card') || (table.dataset && table.dataset.broker !== broker)) {
      table.innerHTML = `<div style="padding:20px; color:#f43f5e; text-align:center; font-size:11px;">${brokerLabel} API 연동 실패<br/><span style="font-size:9.5px; opacity:0.8;">사유: ${e.message}</span></div>`;
      if (!table.dataset) table.dataset = {};
      table.dataset.broker = broker;
    }
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

var homeMidViewMode = window.homeMidViewMode || 'account';
window.homeMidViewMode = homeMidViewMode;

function syncHomeMidViewDisplay() {
  const grid = document.getElementById('mainGrid');
  const isBacktest = !!(window.isManualBacktestMode || (grid && grid.classList.contains('backtest-view-layout')));
  if (isBacktest || grid?.classList.contains('perf-tab-layout') || grid?.classList.contains('perf-metrics-layout')) {
    return;
  }
  const homeAcctContainer = document.getElementById('homeAccountContainer');
  const homeStatsContainer = document.getElementById('homeStatsContainer');
  const perfSummary = document.getElementById('performanceSummary');
  const periodTitle = document.getElementById('periodTitle');
  const currentMode = window.homeMidViewMode || 'account';

  // ⭐️ 실전 홈 화면에서는 성과 차트/테이블 및 성과 탭 전용 카드들을 100% 무조건 숨김 (일별성과 중복 노출 원천 차단)
  const periodChartC = document.getElementById('periodChartContainer');
  const periodTableC = document.getElementById('periodTableContainer');
  const perfYearlyC = document.getElementById('perfYearlyChartContainer');
  const perfYearlyTableC = document.getElementById('perfYearlyTableContainer');
  const btnPeriodMode = document.getElementById('btnPeriodMode');
  if (periodChartC) periodChartC.style.display = 'none';
  if (periodTableC) periodTableC.style.display = 'none';
  if (perfYearlyC) perfYearlyC.style.display = 'none';
  if (perfYearlyTableC) perfYearlyTableC.style.display = 'none';
  if (btnPeriodMode) btnPeriodMode.style.display = 'none';

  const perfMonthlyChartCard = document.getElementById('panelMonthlyChart');
  const perfDailyChartCard = document.getElementById('panelDailyChart');
  if (perfMonthlyChartCard) { perfMonthlyChartCard.classList.add('hidden'); perfMonthlyChartCard.style.display = 'none'; }
  if (perfDailyChartCard) { perfDailyChartCard.classList.add('hidden'); perfDailyChartCard.style.display = 'none'; }

  if (currentMode === 'stats') {
    if (homeAcctContainer) homeAcctContainer.style.display = 'none';
    if (homeStatsContainer) homeStatsContainer.style.display = 'block';
    if (perfSummary) perfSummary.style.display = 'none';
    if (periodTitle) {
      periodTitle.innerHTML = '📄 성과 지표';
      periodTitle.style.cursor = 'pointer';
      periodTitle.title = '클릭 또는 좌우 스와이프: 계좌 정보 전환';
    }
    const homeStatsTable = document.getElementById('homeStatsTable');
    if (homeStatsTable && typeof renderOriginalStatsTable === 'function') {
      renderOriginalStatsTable(homeStatsTable);
    }
  } else {
    if (homeAcctContainer) homeAcctContainer.style.display = 'block';
    if (homeStatsContainer) homeStatsContainer.style.display = 'none';
    if (perfSummary) {
      perfSummary.style.display = 'grid';
      if (typeof updatePerformanceSummary === 'function') {
        updatePerformanceSummary();
      }
    }
    const displayAcct = window.lastAccountNo ? ` (${window.lastAccountNo})` : '';
    if (periodTitle) {
      periodTitle.innerHTML = `📡 계좌 정보${displayAcct}`;
      periodTitle.style.cursor = 'pointer';
      periodTitle.title = '클릭 또는 좌우 스와이프: 성과 지표 전환';
    }
    const homeTable = document.getElementById('homeAccountTable');
    if (homeTable && typeof renderKiwoomBalanceOnStatsTable === 'function') {
      renderKiwoomBalanceOnStatsTable(homeTable);
    }
  }
}
window.syncHomeMidViewDisplay = syncHomeMidViewDisplay;

var lastHomeMidToggleTime = 0;
function toggleHomeMidView(dir) {
  const now = Date.now();
  if (now - lastHomeMidToggleTime < 350) return;
  lastHomeMidToggleTime = now;

  const currentMode = window.homeMidViewMode || 'account';
  const nextMode = currentMode === 'stats' ? 'account' : 'stats';
  window.homeMidViewMode = nextMode;
  try {
    const currentUserId = window.myUserId || localStorage.getItem('vtotal3_id') || '';
    if (currentUserId) localStorage.setItem(`vtotal3_home_mid_mode_${currentUserId}`, nextMode);
  } catch (e) {}

  syncHomeMidViewDisplay();
}
window.toggleHomeMidView = toggleHomeMidView;

function renderHomeAccountTable() {
  const grid = document.getElementById('mainGrid');
  const isBacktest = !!(window.isManualBacktestMode || (grid && grid.classList.contains('backtest-view-layout')));
  if (isBacktest) {
    const homeAcctContainer = document.getElementById('homeAccountContainer');
    if (homeAcctContainer) homeAcctContainer.style.display = 'none';
    const homeStatsContainer = document.getElementById('homeStatsContainer');
    if (homeStatsContainer) homeStatsContainer.style.display = 'none';
    return;
  }
  const homeTable = document.getElementById('homeAccountTable');
  if (homeTable) {
    renderKiwoomBalanceOnStatsTable(homeTable);
  }
  const homeStatsTable = document.getElementById('homeStatsTable');
  if (homeStatsTable && typeof renderOriginalStatsTable === 'function') {
    renderOriginalStatsTable(homeStatsTable);
  }
  syncHomeMidViewDisplay();
}
window.renderHomeAccountTable = renderHomeAccountTable;
if (!window.UI.stats) window.UI.stats = {};
window.UI.stats.renderHomeAccountTable = renderHomeAccountTable;
window.UI.stats.syncHomeMidViewDisplay = syncHomeMidViewDisplay;
window.UI.stats.toggleHomeMidView = toggleHomeMidView;

function toggleStatsView() {
  // 내역모드 상단: [💼 자산현황] 도넛 차트 및 범례 항상 고정
  statsDisplayMode = 'chart';
  refreshStatsTable();
}
function togglePerfView() {
  // 성과모드 전용 토글 (절대 statsDisplayMode 건드리지 않음)
  perfStatsMode = perfStatsMode === 'stats' ? 'realtime' : 'stats';
  refreshStatsTable();
}
window.toggleStatsView = toggleStatsView;
window.togglePerfView = togglePerfView;

// 📌 statsTitle 클릭 시 현재 레이아웃에 맞는 토글/순환 실행
function onStatsTitleClick() {
  const grid = document.getElementById('mainGrid');
  if (grid && grid.classList.contains('perf-tab-layout')) {
    // 성과모드: 📄 성과 지표 ↔ 📡 실시간 운영현황 토글
    perfStatsMode = perfStatsMode === 'stats' ? 'realtime' : 'stats';
    refreshStatsTable();
    return;
  }
  // ⭐️ 홈 화면: 클릭 시에도 다음 자산현황으로 순환 전환 (계좌 -> 통합 -> 투자법1 -> ...)
  const selector = document.getElementById('statsMetricSelector');
  const activeOpts = ['account', 'combined'];
  const maxSlots = window.MAX_SLOTS || 12;
  for (let i = 1; i <= maxSlots; i++) {
    if (isSlotActive(i) && (!window.BrokerService || window.BrokerService.isSlotForBroker(i))) {
      activeOpts.push(String(i));
    }
  }
  const currentVal = selector ? (selector.value || 'account') : 'account';
  let currentIndex = activeOpts.indexOf(currentVal);
  if (currentIndex === -1) currentIndex = 0;
  const nextVal = activeOpts[(currentIndex + 1) % activeOpts.length];
  if (selector) selector.value = nextVal;
  if (typeof window.updateStatsPieChart === 'function') {
    window.updateStatsPieChart(nextVal);
  } else if (typeof updateStatsPieChart === 'function') {
    updateStatsPieChart(nextVal);
  }
  if (navigator.vibrate) navigator.vibrate(8);
}
window.onStatsTitleClick = onStatsTitleClick;

// ⭐️ 스크립트 로드 시점 홈 화면 계좌 정보 즉시 자동 렌더링
try {
  if (typeof document !== 'undefined') {
    const homeTable = document.getElementById('homeAccountTable');
    if (homeTable && !window.isStatsMode) {
      renderKiwoomBalanceOnStatsTable(homeTable);
    }
  }
} catch (e) {
  console.warn("homeAccountTable 초기 렌더링 시도:", e);
}
