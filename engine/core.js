// core.js (차트 렌더링 전용)
// 유틸 함수는 utils/ 에서 import됨

// ---------------------------------------------------------
// [1] 차트 관련 공통 변수
// ---------------------------------------------------------
let periodBarChartInstance = null;
window.currentChartSignature = "";
window.currentBarChartSignature = "";
let renderPeriodBarChartTimeout = null;

// ---------------------------------------------------------
// [2] 월별/연별 수익금 막대 차트 (Bar Chart)
// ---------------------------------------------------------
function renderPeriodBarChart() {
  if (window.skipChartRendering) return;
  const grid = document.getElementById('mainGrid');
  const schedule = (draw) => {
    if (renderPeriodBarChartTimeout) cancelAnimationFrame(renderPeriodBarChartTimeout);
    renderPeriodBarChartTimeout = requestAnimationFrame(draw);
  };
  if (grid && grid.classList.contains('perf-tab-layout')) {
    schedule(() => {
      if (typeof renderPeriodBarChartRaw === 'function') {
        renderPeriodBarChartRaw('perfYearlyBarChart', 1);
        renderPeriodBarChartRaw('perfMonthlyBarChart', 0);
        renderPeriodBarChartRaw('perfDailyBarChart', 2);
      }
    });
  } else {
    schedule(() => renderPeriodBarChartRaw());
  }
}

function renderPeriodBarChartRaw(canvasIdOverride, viewStateOverride) {
  if (window.skipChartRendering) return;

  const targetCanvasId = canvasIdOverride || 'periodBarChart';
  const targetViewState = (viewStateOverride !== undefined) ? viewStateOverride : periodViewState;
  const wrapperId = targetCanvasId === 'periodBarChart' ? 'periodBarChartWrapper' : 
                    (targetCanvasId === 'perfYearlyBarChart' ? 'perfYearlyChartWrapper' :
                    (targetCanvasId === 'perfDailyBarChart' ? 'perfDailyChartWrapper' : 'perfMonthlyChartWrapper'));
  const wrapper = document.getElementById(wrapperId);
  if (!wrapper) return;

  const appFontSizeStr = getComputedStyle(document.documentElement).getPropertyValue('--app-font-size') || "10.5px";
  const appFontSize = parseFloat(appFontSizeStr) || 10.5;
  const chartTextFontSize = appFontSize - 2;
  const chartTextColor = getComputedStyle(document.body).getPropertyValue('--text-muted').trim() || '#94a3b8';

  const isYearly = (targetViewState === 1);
  const isDaily = (targetViewState === 2);
  const globalDataArr = isDaily ? globalDailyDataArr : (isYearly ? globalYearlyDataArr : globalMonthlyDataArr);

  let activeSlotIndexes = [];
  for (let i = 1; i <= MAX_SLOTS; i++) {
    if (isSlotActive(i) && globalDataArr[i]) activeSlotIndexes.push(i);
  }

  // 데이터 변경이 없을 경우 렌더링 생략 (점멸 방지)
  const sigParts = activeSlotIndexes.map(i => {
    const data = globalDataArr[i] || [];
    const lastItem = (data.length > 0) ? data[data.length - 1] : null;
    const lastProfit = (lastItem && typeof lastItem.profit !== 'undefined' && lastItem.profit !== null) ? Math.round(lastItem.profit) : 0;
    return `${i}_${data.length}_${lastProfit}`;
  });
  const newSig = sigParts.join('|') + "|" + targetViewState + "|" + isCurrencyKRW + "|" + currentFXRate + "|" + chartTextColor;

  if (!window.barChartSignatures) window.barChartSignatures = {};
  if (window.barChartSignatures[targetCanvasId] === newSig) return;
  window.barChartSignatures[targetCanvasId] = newSig;

  if (!window.barChartInstances) window.barChartInstances = {};
  // 기존 차트 확실히 해제 및 Canvas 재생성으로 인스턴스 충돌 방지
  if (targetCanvasId === 'periodBarChart') {
    if (periodBarChartInstance) {
      periodBarChartInstance.destroy();
      periodBarChartInstance = null;
    }
  } else {
    if (window.barChartInstances[targetCanvasId]) {
      window.barChartInstances[targetCanvasId].destroy();
      window.barChartInstances[targetCanvasId] = null;
    }
  }

  wrapper.innerHTML = `<canvas id="${targetCanvasId}"></canvas>`;
  const canvas = document.getElementById(targetCanvasId);
  const ctx = canvas.getContext('2d');

  canvas.style.display = 'block';
  canvas.style.marginBottom = '0';
  wrapper.style.padding = '0';
  wrapper.style.margin = '0';
  wrapper.style.lineHeight = '0';
  wrapper.style.overflow = 'hidden';

  let allPeriods = new Set();
  for (let i = 1; i <= MAX_SLOTS; i++) {
    if (globalDataArr[i] && isSlotActive(i)) {
      globalDataArr[i].forEach(r => {
        if (isDaily) {
          if (r.period && r.period.includes('-') && r.period.length >= 8) {
            allPeriods.add(r.period);
          }
        } else {
          allPeriods.add(r.period);
        }
      });
    }
  }
  const sortedPeriods = [...allPeriods].sort().reverse();
  if (sortedPeriods.length === 0) return;

  const labels = sortedPeriods.map(p => {
    if (targetViewState === 2 && p.includes('-')) {
      const parts = p.split('-');
      return parts[1] + '/' + parts[2];
    }
    if (targetViewState === 0 && p.length === 7) return p.substring(2).replace('-', '/');
    return p;
  });

  const fx = isCurrencyKRW ? currentFXRate : 1;
  const isKRW = isCurrencyKRW;
  let datasets = [];



  // 데이터맵 생성
  const slotMaps = Array(MAX_SLOTS + 1).fill(null);
  activeSlotIndexes.forEach(i => {
    slotMaps[i] = {};
    globalDataArr[i].forEach(r => slotMaps[i][r.period] = r);
  });

  // 수익금 & 수익률 계산
  const slotProfits = Array(MAX_SLOTS + 1).fill([]);
  const slotRates = Array(MAX_SLOTS + 1).fill([]);

  activeSlotIndexes.forEach(i => {
    slotProfits[i] = sortedPeriods.map(p => slotMaps[i][p] ? Math.round((slotMaps[i][p].profit * fx) / (isKRW ? 10000 : 1)) : 0);
    slotRates[i] = sortedPeriods.map(p => slotMaps[i][p] ? Number((slotMaps[i][p].rate * 100).toFixed(2)) : 0);
  });

  // 수익금 오차 방지를 위한 보정 (마지막 슬롯에게 잔여 오차 몰아주기)
  if (activeSlotIndexes.length >= 2) {
    const combinedMap = {};
    const combinedData = isDaily ? globalCombinedDailyData : (isYearly ? globalCombinedYearlyData : globalCombinedMonthlyData);
    if (combinedData) combinedData.forEach(r => combinedMap[r.period] = r);

    const lastIdx = activeSlotIndexes[activeSlotIndexes.length - 1];
    slotProfits[lastIdx] = sortedPeriods.map((p, pIdx) => {
      const lastSlotHasData = !!slotMaps[lastIdx][p];
      if (!lastSlotHasData) return 0;

      if (!combinedMap[p]) return slotProfits[lastIdx][pIdx]; // 합산 데이터가 아직 없으면 오차 보정 생략
      const rawTotal = combinedMap[p].profit;
      const totalRounded = Math.round((rawTotal * fx) / (isKRW ? 10000 : 1));

      let sumOther = 0;
      for (let j = 0; j < activeSlotIndexes.length - 1; j++) {
        sumOther += slotProfits[activeSlotIndexes[j]][pIdx];
      }
      return totalRounded - sumOther;
    });
  }

  // Y/M/D 수익률 계산 (모든 활성 슬롯에서)
  // Y/M/D는 viewState와 무관하게 항상 최신 year/month/day의 종합 수익률을 표시해야 함
  const yearlyMap = {}, monthlyMap = {}, dailyMap = {};
  for (let i = 1; i <= MAX_SLOTS; i++) {
    if (!isSlotActive(i)) continue;

    if (globalYearlyDataArr[i]) globalYearlyDataArr[i].forEach(r => {
      if (r && r.period) {
        if (!yearlyMap[r.period]) yearlyMap[r.period] = { profit: 0, asset: 0 };
        yearlyMap[r.period].profit += Number(r.profit || 0);
        yearlyMap[r.period].asset += Number(r.asset || 0);
      }
    });
    if (globalMonthlyDataArr[i]) globalMonthlyDataArr[i].forEach(r => {
      if (r && r.period) {
        if (!monthlyMap[r.period]) monthlyMap[r.period] = { profit: 0, asset: 0 };
        monthlyMap[r.period].profit += Number(r.profit || 0);
        monthlyMap[r.period].asset += Number(r.asset || 0);
      }
    });
    if (globalDailyDataArr[i]) globalDailyDataArr[i].forEach(r => {
      if (r && r.period) {
        if (!dailyMap[r.period]) dailyMap[r.period] = { profit: 0, asset: 0 };
        dailyMap[r.period].profit += Number(r.profit || 0);
        dailyMap[r.period].asset += Number(r.asset || 0);
      }
    });
  }

  let yRate = 0, mRate = 0, dRate = 0;
  const latestYear = Object.keys(yearlyMap).sort().reverse()[0];
  if (latestYear) {
    const yData = yearlyMap[latestYear];
    const basis = yData.asset - yData.profit;
    yRate = basis > 0 ? (yData.profit / basis) * 100 : 0;
  }

  const latestMonth = Object.keys(monthlyMap).sort().reverse()[0];
  if (latestMonth) {
    const mData = monthlyMap[latestMonth];
    const basis = mData.asset - mData.profit;
    mRate = basis > 0 ? (mData.profit / basis) * 100 : 0;
  }

  const latestDay = Object.keys(dailyMap).sort().reverse()[0];
  if (latestDay) {
    const dData = dailyMap[latestDay];
    const basis = dData.asset - dData.profit;
    dRate = basis > 0 ? (dData.profit / basis) * 100 : 0;
  }

  let currentMddVal = 0;
  try {
    const activeRes = [];
    for (let i = 1; i <= MAX_SLOTS; i++) {
      if (typeof isSlotActive === 'function' && isSlotActive(i) && lastBTResults[i]) {
        const res = typeof getBestResult === 'function' ? getBestResult(lastBTResults[i], i) : lastBTResults[i];
        if (res) activeRes.push(res);
      }
    }
    if (activeRes.length > 0 && window.summaryCalculator && typeof window.summaryCalculator.calculateCombinedSummaryEngine === 'function') {
      const combinedSummary = window.summaryCalculator.calculateCombinedSummaryEngine(activeRes);
      if (combinedSummary && combinedSummary.currentMdd !== undefined) {
        currentMddVal = combinedSummary.currentMdd * 100;
      }
    }
  } catch(e) { console.error('core.js chartRatesData dd error:', e); }

  const latestYRow = latestYear ? yearlyMap[latestYear] : null;
  const latestMRow = latestMonth ? monthlyMap[latestMonth] : null;
  const latestDRow = latestDay ? dailyMap[latestDay] : null;

  window.chartRatesData = {
    y: Number(yRate.toFixed(1)),
    m: Number(mRate.toFixed(1)),
    d: Number(dRate.toFixed(1)),
    dd: Number(currentMddVal.toFixed(1)),
    yProfit: latestYRow ? Number(latestYRow.profit || 0) : 0,
    mProfit: latestMRow ? Number(latestMRow.profit || 0) : 0,
    dProfit: latestDRow ? Number(latestDRow.profit || 0) : 0
  };

  // 막대 그래프 데이터셋 추가
  activeSlotIndexes.forEach((slotNum, index) => {
    const isFirst = (index === 0);
    const isLast = (index === activeSlotIndexes.length - 1);

    let borderRadius = { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 };
    if (activeSlotIndexes.length === 1) {
      borderRadius = { topLeft: 4, topRight: 4, bottomLeft: 4, bottomRight: 4 };
    } else {
      if (isFirst) borderRadius = { topLeft: 0, topRight: 0, bottomLeft: 4, bottomRight: 4 };
      else if (isLast) borderRadius = { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 };
    }

    const resolveBarRadius = (ctx) => {
      const value = Number(ctx.raw || 0);
      return value < 0 ? { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 } : borderRadius;
    };

    // 원래 색상 유지 (모든 바에 동일한 색상)
    const baseColor = SLOT_COLORS[(slotNum - 1) % SLOT_COLORS.length];
    const backgroundColor = slotProfits[slotNum].map(() => {
      return baseColor + '80'; // 모든 바에 동일한 반투명 색상
    });

    datasets.push({
      label: (getSlotConfig(slotNum)?.basics?.strategy || `투자법 ${slotNum}`) + ' 수익금',
      data: slotProfits[slotNum],
      backgroundColor: backgroundColor,
      borderColor: baseColor,
      borderWidth: 1,
      borderRadius: resolveBarRadius,
      yAxisID: 'y',
      stack: 'profit',
      order: 2
    });
  });



  if (datasets.length === 0) return;

  const profitLabelPlugin = {
    id: 'periodProfitLabels',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      const cData = chart.customData || { activeSlotIndexes, slotProfits, slotRates, datasets };
      ctx.save();
      ctx.font = `bold ${chartTextFontSize}px "Inter", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      const meta = chart.getDatasetMeta(cData.datasets.findIndex(d => d.stack === 'profit'));
      if (!meta || !meta.data) { ctx.restore(); return; }

      const stackMetas = chart.data.datasets.map((d, i) => d.stack === 'profit' ? chart.getDatasetMeta(i) : null).filter(m => m !== null);
      if (stackMetas.length === 0) { ctx.restore(); return; }
      const topMeta = stackMetas[stackMetas.length - 1];

      topMeta.data.forEach((bar, i) => {
        let total = 0;
        cData.activeSlotIndexes.forEach(si => total += cData.slotProfits[si][i]);
        if (total === 0) return;

        let label = isCurrencyKRW
          ? (total < 0 ? '-' : '') + Math.abs(total).toLocaleString() + '만'
          : (total < 0 ? '-$' : '$') + Math.abs(total).toLocaleString();

        ctx.textBaseline = total >= 0 ? 'bottom' : 'top';
        const yPos = total >= 0 ? bar.y - 3 : bar.y + 3;
        const isLightMode = document.body.classList.contains('light-mode');
        ctx.fillStyle = total < 0 ? '#ef4444' : (isLightMode ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)');
        ctx.fillText(label, bar.x, yPos);
      });
      ctx.restore();
    }
  };

  const zeroLinePlugin = {
    id: `periodZeroLine_${targetCanvasId}`,
    beforeDatasetsDraw(chart) {
      if (targetViewState === 1) return;
      const yScale = chart.scales && chart.scales.y;
      if (!yScale) return;
      const yZero = yScale.getPixelForValue(0);
      const { ctx, chartArea } = chart;
      if (!chartArea || yZero < chartArea.top || yZero > chartArea.bottom) return;
      const isLightMode = document.body.classList.contains('light-mode');
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(chartArea.left, yZero);
      ctx.lineTo(chartArea.right, yZero);
      ctx.lineWidth = 0.7;
      ctx.strokeStyle = isLightMode ? 'rgba(15, 23, 42, 0.22)' : 'rgba(255, 255, 255, 0.22)';
      ctx.stroke();
      ctx.restore();
    }
  };

  const minBarWidth = isYearly ? 100 : (isDaily ? 35 : 39);
  const containerWidth = wrapper.parentElement.clientWidth;
  const neededWidth = labels.length * minBarWidth;
  wrapper.style.minWidth = neededWidth > containerWidth ? neededWidth + 'px' : '100%';
  const periodTotals = sortedPeriods.map((_, pIdx) => {
    let total = 0;
    activeSlotIndexes.forEach(si => { total += Number(slotProfits[si][pIdx] || 0); });
    return total;
  });
  const minPeriodTotal = periodTotals.length > 0 ? Math.min(...periodTotals) : 0;
  const maxPeriodTotal = periodTotals.length > 0 ? Math.max(...periodTotals) : 0;

  // 원화/달러 공통 상하 여백 기준 계산 (원화: 만원, 달러: $)
  // 상단 라벨 텍스트 잘림을 방지하기 위해 maxPeriodTotal에 최소 22% 이상의 상단 여백 확보
  const ySuggestedMax = maxPeriodTotal > 0 ? Math.ceil(maxPeriodTotal * 1.22) : undefined;
  const ySuggestedMin = minPeriodTotal < 0 ? Math.floor(minPeriodTotal * 1.22) : undefined;

  // ⭐️ 백테스트 중 다른 렌더링 호출이 끼어들어 wrapper의 canvas가 이미 교체/제거된 경우
  // (경합 상태) Chart.js가 detached canvas로 인해 "ownerDocument" 에러를 던지는 것을 방지
  if (!document.getElementById(targetCanvasId) || !document.body.contains(canvas)) {
    return;
  }

  const chartInstance = new Chart(ctx, {
    type: 'bar',
    data: { labels: labels, datasets: datasets },
    customData: { activeSlotIndexes, slotProfits, slotRates, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      layout: { padding: { top: 0, bottom: 14, left: 0, right: 0 } },
      events: ['click'],
      interaction: { mode: 'index', intersect: true },
      plugins: {
        legend: { display: false, labels: { font: { family: 'Inter', size: chartTextFontSize } } },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1, padding: 10,
          titleFont: { family: 'Outfit', size: chartTextFontSize, weight: 'bold' }, bodyFont: { family: 'Inter', size: chartTextFontSize }, cornerRadius: 8,
          filter: function (c) {
            if (c.dataset.yAxisID === 'yRate') return true;
            const slotNum = activeSlotIndexes[c.datasetIndex];
            const period = sortedPeriods[c.dataIndex];
            return !!(slotMaps[slotNum] && slotMaps[slotNum][period]);
          },
          callbacks: {
            label: function (c) {
              const v = c.parsed.y;
              if (c.dataset.yAxisID === 'yRate') return `${c.dataset.label}: ${v < 0 ? '-' : ''}${Math.abs(v).toFixed(2)}%`;
              if (isCurrencyKRW) return `${c.dataset.label}: ${v < 0 ? '-' : ''}${Math.abs(v).toLocaleString()}만원`;
              return `${c.dataset.label}: ${v < 0 ? '-$' : '$'}${Math.abs(v).toLocaleString()}`;
            }
          }
        }
      },
      scales: {
        x: {
          stacked: true, grid: { display: false, tickLength: 0, drawTicks: false, drawBorder: false },
          ticks: { font: { family: 'Inter', size: chartTextFontSize }, color: chartTextColor, autoSkip: false, maxTicksLimit: 50, padding: 0 }
        },
        y: {
          stacked: true, position: 'left', grid: { color: 'rgba(255, 255, 255, 0.05)', tickLength: 0, drawTicks: false, drawBorder: false },
          afterDataLimits: function(scale) {
            if (scale.max > 0) scale.max = scale.max * 1.20;
            if (scale.min < 0) scale.min = scale.min * 1.35;
          },
          ticks: { font: { family: 'Inter', size: chartTextFontSize }, color: chartTextColor, callback: function (v) { return isCurrencyKRW ? (v < 0 ? '-' : '') + Math.abs(v).toLocaleString() + '만' : (v < 0 ? '-$' : '$') + Math.abs(v).toLocaleString(); } }
        },
        yMirror: {
          display: isDaily,
          stacked: true,
          position: 'right',
          grid: { display: false, drawTicks: false, drawBorder: false },
          afterDataLimits: function(scale) {
            const yScale = scale.chart.scales.y;
            if (!yScale) return;
            scale.min = yScale.min;
            scale.max = yScale.max;
          },
          afterBuildTicks: function(scale) {
            const yScale = scale.chart.scales.y;
            if (!yScale || !Array.isArray(yScale.ticks)) return;
            scale.ticks = yScale.ticks.map(t => ({ ...t }));
          },
          ticks: { font: { family: 'Inter', size: chartTextFontSize }, color: chartTextColor, callback: function (v) { return isCurrencyKRW ? (v < 0 ? '-' : '') + Math.abs(v).toLocaleString() + '만' : (v < 0 ? '-$' : '$') + Math.abs(v).toLocaleString(); } }
        },
        yRate: {
          display: false,
          position: 'right', grid: { display: false },
          ticks: { font: { family: 'Inter', size: chartTextFontSize, weight: 'bold' }, color: '#a855f7', callback: function (v) { return v + '%'; } },
          title: { display: false }
        }
      }
    },
    plugins: [zeroLinePlugin, profitLabelPlugin]
  });

  if (targetCanvasId === 'periodBarChart') {
    periodBarChartInstance = chartInstance;
  } else {
    window.barChartInstances[targetCanvasId] = chartInstance;
  }

  // 막대 그래프 렌더링 후 Y/M/D 표시 업데이트
  if (typeof updateChartRatesDisplay === 'function') {
    updateChartRatesDisplay();
  }
}

// ---------------------------------------------------------
// [3] 자산 및 MDD 꺾은선 차트 플러그인
// ---------------------------------------------------------
const peakAnnotationPlugin = {
  id: 'peakAnnotation',
  afterDatasetsDraw(chart) {
    const { ctx, scales: { x, y, y1 }, data } = chart;
    if (!data || !data.datasets || data.datasets.length === 0) return;

    let globalMaxAsset = -Infinity, globalMaxAssetIdx = -1, globalMaxAssetColor = '#6366f1';
    let globalMinMdd = Infinity, globalMinMddIdx = -1, globalMinMddColor = '#ef4444';

    data.datasets.forEach((ds) => {
      if (ds.label && ds.label.includes('자산') && ds.data) {
        ds.data.forEach((val, i) => {
          if (val !== null && val > globalMaxAsset) { globalMaxAsset = val; globalMaxAssetIdx = i; globalMaxAssetColor = ds.borderColor; }
        });
      }
      if (ds.label && ds.label.includes('MDD') && ds.data) {
        ds.data.forEach((val, i) => {
          if (val !== null && val < globalMinMdd) { globalMinMdd = val; globalMinMddIdx = i; globalMinMddColor = ds.borderColor; }
        });
      }
    });

    const appFontSizeStr = getComputedStyle(document.documentElement).getPropertyValue('--app-font-size') || "10.5px";
    const fontSize = (parseFloat(appFontSizeStr) || 11) - 2;
    ctx.save();
    ctx.font = `bold ${fontSize}px "Outfit", "Inter", sans-serif`;

    function drawLabel(text, px, py, color, isAsset) {
      ctx.beginPath(); ctx.arc(px, py, 4, 0, 2 * Math.PI); ctx.fillStyle = color; ctx.fill();
      let textX = px - 6, textY = isAsset ? py - 6 : py + 10;
      ctx.textAlign = 'right'; ctx.textBaseline = isAsset ? 'bottom' : 'top';
      if (px < 60) { textX = px + 6; ctx.textAlign = 'left'; }
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.strokeText(text, textX, textY); ctx.fillStyle = color; ctx.fillText(text, textX, textY);
    }

    if (globalMaxAssetIdx >= 0 && isFinite(globalMaxAsset)) {
      const label = isCurrencyKRW ? `${Math.round(globalMaxAsset).toLocaleString()}만` : `$${Math.round(globalMaxAsset).toLocaleString()}`;
      drawLabel(label, x.getPixelForValue(globalMaxAssetIdx), y.getPixelForValue(globalMaxAsset), globalMaxAssetColor, true);
    }
    if (globalMinMddIdx >= 0 && isFinite(globalMinMdd)) {
      drawLabel(`${globalMinMdd.toFixed(1)}%`, x.getPixelForValue(globalMinMddIdx), y1.getPixelForValue(globalMinMdd), globalMinMddColor, false);
    }
    ctx.restore();
  }
};

const titleClickPlugin = {
  id: 'titleClick',
  afterEvent(chart, args) {
    const evt = args.event;
    if (evt.type === 'click' && evt.y <= 28) toggleChartView();
  }
};

// ---------------------------------------------------------
// [4] 메인 성과추이 꺾은선 차트 렌더링
// ---------------------------------------------------------
function renderChartAll() {
  const validRes = [];
  for (let i = 1; i <= MAX_SLOTS; i++) {
    if (isSlotActive(i) && lastBTResults[i]) validRes.push(lastBTResults[i]);
  }
  renderChart(validRes);
}

function renderChart(resultsArray) {
  const validRes = (Array.isArray(resultsArray) ? resultsArray : Array.from(arguments)).filter(r => r && r.chartDates && r.chartBalances);

  // ⭐️ 안전 보정: 만약 개별 투자법 뷰 모드인데 해당 슬롯이 비활성화되어 있다면 합산(0)으로 자동 리셋
  if (chartViewMode >= 2 && chartViewMode <= MAX_SLOTS + 1) {
    const slotIdx = chartViewMode - 1;
    if (typeof isSlotActive === 'function' && !isSlotActive(slotIdx)) {
      chartViewMode = 0;
      try { localStorage.setItem(`vtotal3_chart_view_mode_${myUserId}`, chartViewMode); } catch (e) { }
    }
  }

  if (validRes.length === 0) {
    if (myChart) { myChart.destroy(); myChart = null; }
    window.currentChartSignature = "";
    return;
  }

  const sigs = validRes.map(r => r.summary ? `${r.currentStrat}_${r.summary.totalAssets}_${r.chartDates.length}` : "null");
  const chartThemeKey = document.body.classList.contains('light-mode') ? 'light' : 'dark';
  const newSig = sigs.join('|') + "|" + chartViewMode + "|" + isCurrencyKRW + "|" + currentFXRate + "|" + chartThemeKey;

  let titleSuffix = '';
  if (chartViewMode === 0) {
    titleSuffix = '합산';
  } else if (chartViewMode === 1) {
    titleSuffix = '종합';
  } else if (chartViewMode >= 2 && chartViewMode <= MAX_SLOTS + 1) {
    const slotIdx = chartViewMode - 1;
    const cfg = getSlotConfig(slotIdx);
    titleSuffix = `${cfg?.basics?.strategy || `투자법 ${slotIdx}`}`;
  }

  const cTitle = document.getElementById('chartTitle');
  const smallStyle = 'style="font-size:0.85em; font-weight:normal; opacity:0.8; margin-left:2px;"';
  const displaySuffix = (typeof formatStrategyNameWithSmallParentheses === 'function') ? formatStrategyNameWithSmallParentheses(titleSuffix) : titleSuffix;
  if (cTitle) cTitle.innerHTML = `📈 성과추이 <span ${smallStyle}>(${displaySuffix})</span>`;

  if (window.currentChartSignature === newSig) return;
  window.currentChartSignature = newSig;

  if (myChart) myChart.destroy();
  document.getElementById('chartBox').innerHTML = '<canvas id="balanceChart" class="view-transition"></canvas>';
  const ctx = document.getElementById('balanceChart').getContext('2d');

  const appFontSizeStr = getComputedStyle(document.documentElement).getPropertyValue('--app-font-size') || "10.5px";
  const chartFontSize = parseFloat(appFontSizeStr) || 11;
  const chartTextFontSize = chartFontSize - 2;
  const chartTextColor = getComputedStyle(document.body).getPropertyValue('--text-muted').trim() || '#94a3b8';
  Chart.defaults.font.size = chartFontSize;

  const allDatesSet = new Set();
  validRes.forEach(r => r.chartDates.forEach(d => allDatesSet.add(d)));
  const universalDates = Array.from(allDatesSet).sort().reverse();
  if (universalDates.length === 0) return;

  const shortDates = universalDates.map(d => {
    const p = d.split('-');
    if (p.length < 3) return d;
    let y = p[0].length === 4 ? p[0].substring(2) : p[0];
    const mm = String(p[1]).padStart(2, '0');
    const dd = String(p[2]).padStart(2, '0');
    return `${y}/${mm}/${dd}`;
  });

  const fx = isCurrencyKRW ? currentFXRate : 1;
  const isKRW = isCurrencyKRW;

  const alignData = (resDates, resValues, skipFX = false) => {
    const map = {};
    resDates.forEach((d, i) => { map[d] = resValues[i]; });
    return universalDates.map(d => {
      if (map[d] === undefined) return null;
      if (skipFX) return map[d];
      return isKRW ? Math.round(map[d] * fx / 10000) : Math.round(map[d]);
    });
  };

  let datasets = [];
  let allMddValues = [];

  if (chartViewMode === 0) {
    const numDates = universalDates.length;
    const combinedBalances = new Array(numDates).fill(0);
    const combinedProfitMap = {};
    
    const slotMaps = [];
    for (let i = 1; i <= MAX_SLOTS; i++) {
      if (isSlotActive(i) && lastBTResults[i]) {
        const res = lastBTResults[i];
        const map = {};
        res.chartDates.forEach((d, idx) => { map[d] = res.chartBalances[idx]; });
        const dailyProfitMap = {};
        (res.dailyData || []).forEach(row => {
          if (row && row.period) {
            dailyProfitMap[row.period] = Number(row.profit || 0) || 0;
            combinedProfitMap[row.period] = (combinedProfitMap[row.period] || 0) + (Number(row.profit || 0) || 0);
          }
        });
        slotMaps.push({
          map: map,
          lastVal: 0,
          started: false,
          dailyProfitMap
        });
      }
    }

    for (let j = numDates - 1; j >= 0; j--) {
      const d = universalDates[j];
      let dailySum = 0;
      slotMaps.forEach(slot => {
        if (slot.map[d] !== undefined) {
          slot.lastVal = slot.map[d];
          slot.started = true;
        }
        if (slot.started) {
          dailySum += slot.lastVal;
        }
      });
      combinedBalances[j] = dailySum;
    }

    const cumulativeProfitOldToNew = [];
    let runningProfit = 0;
    const ascDates = [...universalDates].reverse();
    for (const d of ascDates) {
      runningProfit += Number(combinedProfitMap[d] || 0) || 0;
      cumulativeProfitOldToNew.push(runningProfit);
    }
    const combinedCumulativeProfit = cumulativeProfitOldToNew.reverse();

    const combinedMdd = new Array(numDates).fill(0);
    let peak = -Infinity;
    for (let j = numDates - 1; j >= 0; j--) {
      const bal = combinedBalances[j];
      if (bal > peak) {
        peak = bal;
      }
      if (peak > 0) {
        combinedMdd[j] = ((bal - peak) / peak) * 100;
      } else {
        combinedMdd[j] = 0;
      }
    }

    const alignedCombinedBA = combinedBalances.map(val => {
      return isKRW ? Math.round(val * fx / 10000) : Math.round(val);
    });
    const alignedCombinedProfit = combinedCumulativeProfit.map(val => {
      return isKRW ? Math.round(val * fx / 10000) : Math.round(val);
    });

    const color = '#3b82f6';
    const profitColor = '#facc15';
    const grad = ctx.createLinearGradient(0, 0, 0, 400);
    grad.addColorStop(0, color + '4D');
    grad.addColorStop(1, color + '00');

    datasets.push(
      { label: '합산 자산', data: alignedCombinedBA, borderColor: color, yAxisID: 'y', borderWidth: 2.5, pointRadius: 0, fill: true, backgroundColor: grad, tension: 0.2 },
      { label: '누적 순익', data: alignedCombinedProfit, borderColor: profitColor, borderDash: [6, 4], yAxisID: 'y', borderWidth: 1.8, pointRadius: 0, fill: false, tension: 0.2 },
      { label: '합산 MDD', data: combinedMdd, borderColor: '#ef4444', borderDash: [4, 4], yAxisID: 'y1', borderWidth: 1.5, pointRadius: 0, fill: false, tension: 0.2 }
    );
    allMddValues = combinedMdd;
  } else {
    for (let i = 1; i <= MAX_SLOTS; i++) {
      if (isSlotActive(i) && lastBTResults[i]) {
        if (chartViewMode === 1 || (chartViewMode - 1) === i) {
          const res = lastBTResults[i];
          const sName = getSlotConfig(i)?.basics?.strategy || `투자법 ${i}`;
          const alignedBA = alignData(res.chartDates, res.chartBalances, false);
          const mdd = (res.chartMdd || []).map(v => v * 100);
          const alignedMDD = alignData(res.chartDates, mdd, true);

          const color = SLOT_COLORS[(i - 1) % SLOT_COLORS.length];
          const grad = ctx.createLinearGradient(0, 0, 0, 400);
          grad.addColorStop(0, color + '4D'); // 30% alpha
          grad.addColorStop(1, color + '00'); // 0% alpha

          datasets.push(
            { label: sName + ' 자산', data: alignedBA, borderColor: color, yAxisID: 'y', borderWidth: 2, pointRadius: 0, fill: true, backgroundColor: grad, tension: 0.2 },
            { label: sName + ' MDD', data: alignedMDD, borderColor: color, borderDash: [4, 4], yAxisID: 'y1', borderWidth: 1, pointRadius: 0, fill: false, tension: 0.2 }
          );
          allMddValues = allMddValues.concat(mdd);
        }
      }
    }
  }

  const worstMdd = Math.min.apply(null, allMddValues.filter(v => v !== null && isFinite(v)));
  const dynamicMddMin = isFinite(worstMdd) ? Math.floor(worstMdd) - 10 : -50;

  if (Chart.Tooltip && !Chart.Tooltip.positioners.bottomLeft) {
    Chart.Tooltip.positioners.bottomLeft = function (items) {
      if (!items.length) return false;
      const chart = this.chart;
      return { x: 0, y: chart.height };
    };
  }

  // ⭐️ 백테스트 중 다른 렌더링 호출이 끼어들어 chartBox의 canvas가 이미 교체/제거된 경우
  // (경합 상태) Chart.js가 detached canvas로 인해 "ownerDocument" 에러를 던지는 것을 방지
  if (!document.getElementById('balanceChart') || !document.body.contains(ctx.canvas)) {
    return;
  }

  myChart = new Chart(ctx, {
    type: 'line',
    data: { labels: shortDates, datasets: datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      events: ['click'],
      interaction: { mode: 'index', intersect: false },
      plugins: {
        title: { display: false }, legend: { display: false, labels: { font: { family: 'Inter', size: chartTextFontSize } } },
        tooltip: {
          enabled: true, position: 'bottomLeft', xAlign: 'left', yAlign: 'bottom',
          backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1, padding: 8,
          titleFont: { family: 'Outfit', size: chartTextFontSize, weight: 'bold' }, bodyFont: { family: 'Inter', size: chartTextFontSize },
          cornerRadius: 8, displayColors: true,
          callbacks: {
            label: function (c) {
              let l = c.dataset.label || '';
              if (l.includes('자산')) return `${l}: ${isKRW ? '' : '$'}${c.parsed.y.toLocaleString()}${isKRW ? '만' : ''}`;
              if (l.includes('누적 순익')) return `${l}: ${isKRW ? '' : '$'}${c.parsed.y.toLocaleString()}${isKRW ? '만' : ''}`;
              if (l.includes('MDD')) return `${l}: ${c.parsed.y.toFixed(2)}%`;
              return `${l}: ${c.parsed.y}`;
            }
          }
        },
        zoom: { pan: { enabled: true, mode: 'x' }, zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' } }
      },
      scales: {
        x: {
          ticks: { font: { family: 'Inter', size: chartTextFontSize }, color: chartTextColor }
        },
        y: {
          position: 'left', grace: '10%', grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { font: { family: 'Inter', size: chartTextFontSize }, color: chartTextColor, callback: function (v) { return v.toLocaleString() + (isKRW ? '만' : '$'); } }
        },
        y1: {
          position: 'right', min: dynamicMddMin, max: 0, grid: { display: false },
          ticks: { font: { family: 'Inter', size: chartTextFontSize }, color: '#ef4444', callback: function (v) { return v.toFixed(1) + '%'; } }
        }
      }
    },
    plugins: [peakAnnotationPlugin, titleClickPlugin]
  });
}

// ---------------------------------------------------------
// [5] 거래 기록 CSV 내보내기 (Export)
// ---------------------------------------------------------
// 이 함수는 services/export-service.js로 이동됨
// script.js에서 exportService.exportTradeHistoryToCSV(slotNum) 호출
function exportTradeHistoryToCSV() {
  if (window.exportService) {
    return window.exportService.exportTradeHistoryToCSV(window.activeSettingsTab);
  }
  // Fallback (서비스가 로드되지 않은 경우)
  alert("Export service not loaded");
  return;

  // === 이전 코드는 services/export-service.js로 이동됨 ===
  const slotNum = activeSettingsTab;
  const res = lastBTResults[slotNum];

  if (!res || !res.dailyStates || res.dailyStates.length === 0) {
    alert("저장할 매매 기록이 없습니다. 수동 백테스트를 실행해주세요.");
    return;
  }

  const tradesByBuyDate = {};

  if (res.trades) {
    res.trades.forEach(t => {
      if (!tradesByBuyDate[t.buyDate]) tradesByBuyDate[t.buyDate] = [];
      tradesByBuyDate[t.buyDate].push(t);
    });
  }

  if (res.inv) {
    res.inv.forEach(h => {
      if (!tradesByBuyDate[h.buyDate]) tradesByBuyDate[h.buyDate] = [];
      tradesByBuyDate[h.buyDate].push({
        buyDate: h.buyDate,
        sellDate: '보유중',
        mode: h.mode,
        tier: h.tier,
        buyPrice: h.buy_price,
        sellPrice: 0,
        qty: h.qty
      });
    });
  }

  let csvContent = "\uFEFF";
  csvContent += "날짜(영업일),매도일,모드,티어,매수가,매도가,수량,총잔고(마감),갱신금(마감)\n";

  res.dailyStates.forEach(state => {
    const dateStr = state.date;
    const asset = state.asset.toFixed(2);

    let renewCash = "0.00";
    try {
      const parsed = JSON.parse(state.json);
      renewCash = (parsed.base_principal || parsed.base || 0).toFixed(2);
    } catch (e) { }

    const dayTrades = tradesByBuyDate[dateStr];

    if (dayTrades && dayTrades.length > 0) {
      dayTrades.forEach(t => {
        const sellD = t.sellDate || '-';
        const sPrice = t.sellPrice > 0 ? t.sellPrice.toFixed(2) : '-';

        const row = [
          dateStr,
          sellD,
          t.mode,
          t.tier,
          t.buyPrice.toFixed(2),
          sPrice,
          t.qty,
          asset,
          renewCash
        ];
        csvContent += row.join(",") + "\n";
      });
    } else {
      const row = [
        dateStr,
        '-', '-', '-', '-', '-', '-',
        asset,
        renewCash
      ];
      csvContent += row.join(",") + "\n";
    }
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `vtotal3_BACKTEST_SLOT${slotNum}_DAILY_LOG_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast("모든 영업일 기록이 엑셀로 저장되었습니다.", "📊");
}

// 유틸 함수들은 utils 폴더에서 import됨
// - formatters.js: fixFloat, formatComma, unformatComma, pyRound2
// - date-helpers.js: formatDateNY, normalizeDateKey, dateFromKey, getFridayEnd, isUSMarketHoliday
// - period-calculator.js: calculateMonthlyData, calculateYearlyData, calculateDailyData
// - summary-calculator.js: calculateCombinedSummaryEngine, generateCombinedPeriodDataEngine

// 통화/환율은 script.js에서 관리됨
// isCurrencyKRW, currentFXRate, updateCurrentFXRate()
