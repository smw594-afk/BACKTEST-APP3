// ui/render-performance.js - 성과 차트/테이블 렌더링 (백업에서 복구됨)

function calculateCombinedPeriodData() {
  const activeRes = [];
  // ⚠️ 2026-07-31: 일별수익(테이블 모드)도 활성 브로커(키움 1~3 / LS 4~6)만 필터링한다(사용자 요청).
  for (let i = 1; i <= MAX_SLOTS; i++) {
    if (isSlotActive(i) && lastBTResults[i] && (!window.BrokerService || window.BrokerService.isSlotForBroker(i))) activeRes.push(getBestResult(lastBTResults[i], i));
  }

  const results = activeRes.filter(r => r != null && r.chartDates && r.chartDates.length > 0);

  // ⚠️ 활성 슬롯이 1개뿐이어도 "통합" 데이터는 그 슬롯 값 그대로가 되어야 한다.
  // generateCombinedPeriodDataEngine()은 이미 length===1 케이스를 올바르게 처리하므로
  // (해당 슬롯의 monthlyData/yearlyData/dailyData를 그대로 반환), 여기서 2개 미만이라고
  // 걸러버리면 슬롯 1개 계정은 자산현황(통합)에서 년/월/일수익이 계속 "-"로 나온다.
  if (results.length < 1) {
    globalCombinedMonthlyData = [];
    globalCombinedYearlyData = [];
    globalCombinedDailyData = [];
    return;
  }

  const sigs = results.map(r => {
    const fDates = r.chartDatesFull || r.chartDates || [];
    return r.summary ? `${r.currentStrat}_${r.summary.totalAssets}_${fDates.length}` : "null";
  });
  const newSig = sigs.join('|') + "|" + isCurrencyKRW;
  // ⭐️ 강제 갱신 지원
  if (!window.__forcePerfRender && window.lastMonthlySig === newSig) return;
  window.__forcePerfRender = false;
  window.lastMonthlySig = newSig;

  const combinedData = generateCombinedPeriodDataEngine(results);
  globalCombinedMonthlyData = combinedData.monthly;
  globalCombinedYearlyData = combinedData.yearly;
  globalCombinedDailyData = combinedData.daily;

  if (periodDisplayMode === 'chart') {
    renderPeriodBarChart();
  } else {
    for (let i = 1; i <= MAX_SLOTS; i++) {
      if (isSlotActive(i) && (!window.BrokerService || window.BrokerService.isSlotForBroker(i))) renderPeriodTableText(i);
    }
    renderPeriodTableText('Combined');
    renderPeriodTableText(0);
  }

  if (myUserId) {
    localStorage.setItem(`vtotal3_snap_combined_${myUserId}`, JSON.stringify({ m: globalCombinedMonthlyData, y: globalCombinedYearlyData, d: globalCombinedDailyData }));
  }
}

function renderPeriodTableTextRaw(slotNum, viewStateOverride, suffix = "") {
  const tbodyStr = slotNum === 'Combined' ? `periodBodyCombined${suffix}` : `periodBody${slotNum}${suffix}`;
  const tbody = document.getElementById(tbodyStr);
  if (!tbody) return;

  const CELL_STYLE = "vertical-align:middle; height:16px !important; line-height:16px !important; padding:0 4px !important; box-sizing:border-box !important; white-space:nowrap; overflow:hidden;";

  if (slotNum === 0) {
    let dataCandidate = [];
    // 현재 활성 브로커에 해당하는 슬롯 데이터와 종합 데이터만 모아서 가장 긴 배열(날짜 축)을 찾음
    const brokerDataArr = [];
    for (let i = 1; i <= MAX_SLOTS; i++) {
      if (isSlotActive(i) && (!window.BrokerService || window.BrokerService.isSlotForBroker(i))) {
        const d = viewStateOverride === 1 ? globalYearlyDataArr[i] : (viewStateOverride === 2 ? globalDailyDataArr[i] : globalMonthlyDataArr[i]);
        if (d) brokerDataArr.push(d);
      }
    }
    const combined = viewStateOverride === 1 ? globalCombinedYearlyData : (viewStateOverride === 2 ? globalCombinedDailyData : globalCombinedMonthlyData);
    if (combined) brokerDataArr.push(combined);

    for (let d of brokerDataArr) {
      if (d && d.length > (dataCandidate.length || 0)) dataCandidate = d;
    }
    

    if (!dataCandidate || dataCandidate.length === 0) {
      tbody.innerHTML = `<tr><td style="${CELL_STYLE} text-align:center;">-</td></tr>`;
      return;
    }

    let sortedData = [...dataCandidate];
    if (viewStateOverride === 2) {
      sortedData = sortedData.filter(row => row.period && row.period.includes('-') && row.period.length >= 8);
    }
    sortedData.sort((a, b) => b.period.localeCompare(a.period));

    tbody.innerHTML = sortedData.map(row => {
      let d = row.period;
      if (viewStateOverride === 2 && d.includes('-')) { const p = d.split('-'); d = p[1] + '/' + p[2]; }
      else if (d.includes('-')) { const p = d.split('-'); d = p[0].substring(2) + '/' + p[1]; }
      else if (d.length === 4) { d = d.substring(2); }
      return `<tr><td style="${CELL_STYLE} width:1%; text-align:center;">${d}</td></tr>`;
    }).join('');
    return;
  }

  if (slotNum !== 'Combined') {
    const titleEl = document.getElementById(`slot${slotNum}TableName${suffix}`);
    if (titleEl) titleEl.innerHTML = formatStrategyNameWithSmallParentheses(getSlotConfig(slotNum)?.basics?.strategy || `A-QUANT 2-${slotNum}`);
  }

  const mData = slotNum === 'Combined' ? globalCombinedMonthlyData : globalMonthlyDataArr[slotNum];
  const yData = slotNum === 'Combined' ? globalCombinedYearlyData : globalYearlyDataArr[slotNum];
  const dData = slotNum === 'Combined' ? globalCombinedDailyData : globalDailyDataArr[slotNum];
  let data = viewStateOverride === 1 ? yData : (viewStateOverride === 2 ? dData : mData);

  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan='4' style="${CELL_STYLE} text-align:center;">데이터가 없습니다.</td></tr>`;
    return;
  }

  let filteredData = [...data];
  if (viewStateOverride === 2) {
    filteredData = filteredData.filter(row => row.period && row.period.includes('-') && row.period.length >= 8);
  }
  filteredData.sort((a, b) => b.period.localeCompare(a.period));

  const fmtRate = (r) => { const v = (r * 100); return (v < 0 ? '-' : '') + Math.abs(v).toFixed(1) + '%'; };
  const fmtProfit = (p) => {
    if (isCurrencyKRW) {
      let val = Math.round((p * currentFXRate) / 10000);
      return (val < 0 ? '-' : '') + Math.abs(val).toLocaleString() + '만';
    } else {
      let val = Math.round(p);
      return (val < 0 ? '-$' : '$') + Math.abs(val).toLocaleString();
    }
  };
  const fmtAsset = (a) => {
    if (isCurrencyKRW) { return Math.round((a * currentFXRate) / 10000).toLocaleString() + '만'; }
    else { return '$' + Math.round(a).toLocaleString(); }
  };
  const fmtMdd = (m) => (m * 100).toFixed(1) + '%';
  const cls = (v) => {
    const num = Number(v || 0);
    if (num > 0.00001) return 'val-plus';
    if (num < -0.00001) return 'val-minus';
    return '';
  };

  tbody.innerHTML = filteredData.map(row => {
    let html = "";
    html += `<td class='${cls(row.profit)}' style='${CELL_STYLE}'>${fmtProfit(row.profit)}</td>`;
    html += `<td class='${cls(row.rate)}' style='${CELL_STYLE}'>${fmtRate(row.rate)}</td>`;
    html += `<td class='hide-on-cover ${cls(row.mdd)}' style='${CELL_STYLE}'>${fmtMdd(row.mdd)}</td>`;
    return `<tr>${html}</tr>`;
  }).join('');
}

function renderPeriodTableText(slotNum) {
  renderPeriodTableTextRaw(slotNum, periodViewState, "");
}

function renderPeriodTableSlot(slotNum) {
  if (periodDisplayMode === 'chart') {
    renderPeriodBarChart();
  } else {
    renderPeriodTableText(slotNum);
    renderPeriodTableText('Combined');
    renderPeriodTableText(0);
  }
}

function renderPerfTables() {
  // 년별 테이블 (viewStateOverride = 1, suffix = "Yearly")
  for (let i = 1; i <= MAX_SLOTS; i++) {
    if (isSlotActive(i) && (!window.BrokerService || window.BrokerService.isSlotForBroker(i))) renderPeriodTableTextRaw(i, 1, "Yearly");
  }
  renderPeriodTableTextRaw('Combined', 1, "Yearly");
  renderPeriodTableTextRaw(0, 1, "Yearly");

  // 월별 테이블 (viewStateOverride = 0, suffix = "Monthly")
  for (let i = 1; i <= MAX_SLOTS; i++) {
    if (isSlotActive(i) && (!window.BrokerService || window.BrokerService.isSlotForBroker(i))) renderPeriodTableTextRaw(i, 0, "Monthly");
  }
  renderPeriodTableTextRaw('Combined', 0, "Monthly");
  renderPeriodTableTextRaw(0, 0, "Monthly");

  // 일별 테이블 (viewStateOverride = 2, suffix = "Daily")
  for (let i = 1; i <= MAX_SLOTS; i++) {
    if (isSlotActive(i) && (!window.BrokerService || window.BrokerService.isSlotForBroker(i))) renderPeriodTableTextRaw(i, 2, "Daily");
  }
  renderPeriodTableTextRaw('Combined', 2, "Daily");
  renderPeriodTableTextRaw(0, 2, "Daily");
}

if (!window.UI) window.UI = {};
if (!window.UI.performance) window.UI.performance = {};
window.UI.performance.renderPeriodTableText = renderPeriodTableText;
window.UI.performance.renderPeriodTableTextRaw = renderPeriodTableTextRaw;
window.UI.performance.renderPeriodTableSlot = renderPeriodTableSlot;
window.UI.performance.calculateCombinedPeriodData = calculateCombinedPeriodData;
window.UI.performance.renderPerfTables = renderPerfTables;
