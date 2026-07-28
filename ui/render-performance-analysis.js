// ui/render-performance-analysis.js - 성과 분석 화면 (참조 앱 정확 복제)

let analysisChartInstances = {};

function getSlotColor(slotNum) {
  const colors = window.SLOT_COLORS || ['#6366f1', '#10b981', '#fbbf24', '#f43f5e', '#8b5cf6', '#06b6d4', '#eab308'];
  return colors[(slotNum - 1) % colors.length];
}

function getSlotStrategyName(slotNum, snap) {
  const cfg = (typeof getSlotConfig === 'function') ? getSlotConfig(slotNum) : (window.getSlotConfig ? window.getSlotConfig(slotNum) : null);
  return (cfg && cfg.basics && cfg.basics.strategy) || (snap && snap.currentStrat) || `투자법${slotNum}`;
}

function formatAnalysisMoney(value) {
  if (value === undefined || value === null) {
    return isCurrencyKRW ? '0만' : '$0';
  }
  const num = Number(value);
  const isKRW = typeof isCurrencyKRW !== 'undefined' ? isCurrencyKRW : false;
  const fx = typeof currentFXRate !== 'undefined' ? currentFXRate : 1;

  // 통화별 변환
  const displayValue = isKRW ? Math.round(num * fx / 10000) : Math.round(num);

  // 정수로 변환하고 쉼표 추가
  const intValue = Math.round(Math.abs(displayValue));
  const formatted = intValue.toLocaleString();

  // 부호 처리
  const sign = displayValue < 0 ? '-' : '';

  if (isKRW) {
    return sign + formatted + '만';
  }
  return sign + '$' + formatted;
}

// 스냅샷의 기간별 테이블(yearlyData/monthlyData/dailyData)에서 최신 행 추출
// (실시간 운영현황의 getSlotLatestPeriodRow와 동일한 선택 로직 — 두 화면 값 일치 보장)
function getLatestSnapPeriodRow(snap, kind) {
  const rows = kind === 'year' ? snap.yearlyData : (kind === 'month' ? snap.monthlyData : snap.dailyData);
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return [...rows].filter(r => r && r.period).sort((a, b) => String(b.period).localeCompare(String(a.period)))[0] || null;
}

function getAnalysisSeries(kind) {
  const slots = [];

  // 각 slot의 데이터 수집
  for (let slot = 1; slot <= MAX_SLOTS; slot++) {
    const snapKey = `vtotal3_snap${slot}_${myUserId || window.myUserId || ''}`;
    const snapStr = localStorage.getItem(snapKey);
    if (!snapStr) continue;

    try {
      const snap = JSON.parse(snapStr);
      const summary = snap.summary || {};
      const yield_ = Number(summary.yield || 0);
      const totalProfit = Number(summary.totalProfit || 0);
      const realPrincipal = Number(summary.realPrincipal || 0);
      const totalAssets = Number(summary.totalAssets || 0);

      let profit = 0;
      let rate = 0;
      let basis = 0; // 합계 수익률 분모용: 전기말 총잔고 (= 기간행.asset - profit) / 총원금

      if (kind === 'total') {
        profit = totalProfit;
        basis = realPrincipal; // 총 수익률 분모 = 총원금
        rate = basis > 0 ? profit / basis : 0;
      } else {
        // 년/월/일 수익: 스냅샷의 실제 기간별 집계값 사용 (운영현황과 동일한 데이터)
        const row = getLatestSnapPeriodRow(snap, kind);
        profit = row ? Number(row.profit || 0) : 0;
        rate = row ? Number(row.rate || 0) : 0;
        // 전기말 총잔고 = 기간말 자산 - 기간수익금 (실시간 운영현황과 동일한 분모)
        basis = row ? (Number(row.asset || 0) - profit) : 0;
      }

      const strategyName = getSlotStrategyName(slot, snap);

      slots.push({
        slotNum: slot,
        label: strategyName,
        shortLabel: strategyName,
        profit: profit,
        rate: rate,
        basis: basis,
        totalAssets: totalAssets,
        color: getSlotColor(slot)
      });
    } catch (e) {
      console.error(`Slot ${slot} 분석 오류:`, e);
    }
  }

  // 수익 기준으로 정렬
  return slots.sort((a, b) => b.profit - a.profit);
}

function renderAnalysisLegend(kind, containerId) {
  const container = document.getElementById(containerId);
  const titleMap = {
    total: 'analysisTitleTotal',
    year: 'analysisTitleYear',
    month: 'analysisTitleMonth',
    day: 'analysisTitleDay'
  };
  const titleEl = document.getElementById(titleMap[kind]);
  if (!container) return;

  const rows = getAnalysisSeries(kind);
  if (!rows.length) {
    if (titleEl) titleEl.innerHTML = '';
    container.innerHTML = '<div class="analysis-legend-value">데이터 없음</div>';
    return;
  }

  const totalProfit = rows.reduce((sum, row) => sum + row.profit, 0);

  // 합계 수익률 = Σ(기간수익금) / Σ(분모) — 실시간 운영현황 "통합 합산"과 동일
  //  · 총수익:   분모 = 각 투자법 총원금 합            → Σprofit / Σ원금
  //  · 년/월/일: 분모 = 각 투자법 전기말 총잔고 합       → Σprofit / Σ(기간말자산-기간수익금)
  const totalBasis = rows.reduce((sum, row) => sum + (Number(row.basis) || 0), 0);
  const combinedRate = totalBasis > 0 ? totalProfit / totalBasis : 0;

  const formatAnalysisRate = (r) => {
    const num = r * 100;
    const prefix = num > 0 ? '+' : '';
    return `${prefix}${num.toFixed(1)}%`;
  };

  const profitHeaderLabel = kind === 'total' ? '총 수익' : (kind === 'year' ? '년수익' : (kind === 'month' ? '월수익' : '일 수익'));
  if (titleEl) {
    titleEl.innerHTML = '';
  }

  const headerRow = `
    <div class="analysis-legend-header" style="display: flex; align-items: center; justify-content: center; width: 100%; padding: 2px 4px;">
      <span style="flex: 1 !important; min-width: 0; text-align: center; font-size: 11px; font-weight: 700; color: var(--text-muted);">투자법</span>
      <span style="flex: 1 !important; min-width: 0; text-align: center; font-size: 11px; font-weight: 700; color: var(--text-muted);">${profitHeaderLabel}</span>
      <span style="flex: 1 !important; min-width: 0; text-align: center; font-size: 11px; font-weight: 700; color: var(--text-muted);">수익률</span>
    </div>
  `;

  const modelRows = rows.map(row => `
    <div class="stats-asset-legend-row stats-asset-total" style="display: flex; align-items: center; justify-content: center; width: 100%; height: auto; padding: 0;">
      <div class="analysis-legend-left" style="flex: 1 !important; text-align: center; display: flex; justify-content: center; min-width: 0;">
        <span class="analysis-legend-label" style="color:${row.color}; font-weight: 700; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;">${window.formatStrategyNameWithSmallParentheses ? window.formatStrategyNameWithSmallParentheses(row.label) : row.label}</span>
      </div>
      <b style="color:${row.color}; flex: 1 !important; width: auto !important; min-width: 0 !important; max-width: none !important; text-align: center; font-weight: 700;">${formatAnalysisMoney(row.profit)}</b>
      <b style="color:${row.color}; flex: 1 !important; width: auto !important; min-width: 0 !important; max-width: none !important; text-align: center; font-weight: 700;">${formatAnalysisRate(row.rate)}</b>
    </div>
  `).join("");

  const summaryRow = `
    <div class="stats-asset-legend-row stats-asset-total analysis-legend-summary-row" style="display: flex; align-items: center; justify-content: center; width: 100%; height: auto; padding: 0;">
      <div class="analysis-legend-left" style="flex: 1 !important; text-align: center; display: flex; justify-content: center; min-width: 0;">
        <span class="analysis-legend-label analysis-legend-summary-label" style="font-weight: 800; text-align: center; color: var(--text);">합계</span>
      </div>
      <b class="analysis-legend-summary-value" style="flex: 1 !important; width: auto !important; min-width: 0 !important; max-width: none !important; text-align: center; font-weight: 800; color: var(--text);">${formatAnalysisMoney(totalProfit)}</b>
      <b style="flex: 1 !important; width: auto !important; min-width: 0 !important; max-width: none !important; text-align: center; font-weight: 800; color: var(--text);">${formatAnalysisRate(combinedRate)}</b>
    </div>
  `;

  container.innerHTML = `${headerRow}<div class="analysis-legend-models">${modelRows}</div>${summaryRow}`;
}

function renderAnalysisDonut(kind, canvasId, title) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined') return;

  const rows = getAnalysisSeries(kind);
  const ctx = canvas.getContext('2d');

  if (analysisChartInstances[canvasId]) {
    analysisChartInstances[canvasId].destroy();
    delete analysisChartInstances[canvasId];
  }

  canvas.width = canvas.width;

  if (!rows.length) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  const values = rows.map(row => Math.max(Math.abs(row.profit), 0));
  const safeValues = values.some(v => v > 0) ? values : rows.map(() => 1);
  const totalValue = rows.reduce((sum, row) => sum + row.profit, 0);

  const centerTextPlugin = {
    id: `analysisCenterText_${kind}`,
    afterDraw(chart) {
      if (chart.tooltip && (chart.tooltip.opacity > 0 || (chart.tooltip._active && chart.tooltip._active.length > 0))) {
        return;
      }
      const { ctx, chartArea } = chart;
      if (!chartArea) return;
      const centerX = (chartArea.left + chartArea.right) / 2;
      const centerY = (chartArea.top + chartArea.bottom) / 2;
      const textMutedColor = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#94a3b8';
      const appFontPx = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-font-size')) || 10.5;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = textMutedColor;
      ctx.font = `700 ${Math.max(10, appFontPx + 2)}px Outfit, Inter, sans-serif`;
      ctx.fillText(formatAnalysisMoney(totalValue), centerX, centerY - 4);
      ctx.font = `600 ${Math.max(9, appFontPx)}px Outfit, Inter, sans-serif`;
      ctx.fillText(title, centerX, centerY + 13);
      ctx.restore();
    }
  };

  const doughnutLabelsPlugin = {
    id: `analysisDoughnutLabels_${kind}`,
    afterDatasetsDraw(chart) {
      const dataset = chart.data.datasets[0];
      const total = dataset.data.reduce((a, b) => a + b, 0);
      if (total <= 0) return;
      const { ctx } = chart;
      const meta = chart.getDatasetMeta(0);
      meta.data.forEach((element, index) => {
        const value = Number(dataset.data[index] || 0);
        if (value <= 0 || value / total < 0.06) return;
        const middleAngle = element.startAngle + (element.endAngle - element.startAngle) / 2;
        const middleRadius = element.innerRadius + (element.outerRadius - element.innerRadius) / 2;
        const textX = element.x + Math.cos(middleAngle) * middleRadius;
        const textY = element.y + Math.sin(middleAngle) * middleRadius;
        ctx.save();
        ctx.font = `bold 9px Outfit, Inter, sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = 2;
        ctx.fillText(((value / total) * 100).toFixed(0) + '%', textX, textY);
        ctx.restore();
      });
    }
  };

  analysisChartInstances[canvasId] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: rows.map(row => row.shortLabel),
      datasets: [{
        data: safeValues,
        backgroundColor: rows.map(row => row.color),
        borderWidth: 0,
        borderColor: 'transparent',
        borderRadius: 0,
        hoverOffset: 5,
        spacing: 2
      }]
    },
    plugins: [centerTextPlugin, doughnutLabelsPlugin],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '55%',
      animation: false,
      layout: { padding: { top: 8, bottom: 8, left: 8, right: 8 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(context) {
              const row = rows[context.dataIndex];
              return [`${context.label}`, `${formatAnalysisMoney(row?.profit || 0)} (${(Number(row?.rate || 0) * 100).toFixed(1)}%)`];
            }
          }
        }
      }
    }
  });
}

function renderAnalysisView() {
  const panel = document.getElementById('panelAnalysisView');
  if (!panel || panel.classList.contains('hidden') || panel.style.display === 'none') return;

  renderAnalysisLegend('total', 'analysisLegendTotal');
  renderAnalysisLegend('year', 'analysisLegendYear');
  renderAnalysisLegend('month', 'analysisLegendMonth');
  renderAnalysisLegend('day', 'analysisLegendDay');

  renderAnalysisDonut('total', 'analysisTotalChart', '기간 총 수익');
  renderAnalysisDonut('year', 'analysisYearChart', '년 수익');
  renderAnalysisDonut('month', 'analysisMonthChart', '월 수익');
  renderAnalysisDonut('day', 'analysisDayChart', '일 수익');
}

function destroyAnalysisCharts() {
  Object.values(analysisChartInstances).forEach(chart => {
    if (chart) chart.destroy();
  });
  analysisChartInstances = {};
}

if (!window.UI) window.UI = {};
if (!window.UI.performance) window.UI.performance = {};
window.UI.performance.renderAnalysisView = renderAnalysisView;
window.UI.performance.destroyAnalysisCharts = destroyAnalysisCharts;
