function getStopLossEstimatedDate(h, strategyName) {
  if (h && h.stopLossDate) return h.stopLossDate;
  if (h && h.cutDate) return h.cutDate;

  let buyDateStr = h ? (h.buyDate || h.date) : '';
  if (!buyDateStr || buyDateStr === '-') return '-';

  let bDate = new Date();
  try {
    let clean = String(buyDateStr).trim().replace(/[.\/]/g, '-');
    let parts = clean.split('-');
    if (parts.length === 2) {
      let now = new Date();
      bDate = new Date(now.getFullYear(), parseInt(parts[0], 10) - 1, parseInt(parts[1], 10));
    } else if (parts.length >= 3) {
      let yr = parseInt(parts[0], 10);
      if (yr < 100) yr += 2000;
      bDate = new Date(yr, parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else {
      return '-';
    }
  } catch(e) {
    return '-';
  }

  let strat = (window.MASTER_STRATEGIES && strategyName) ? window.MASTER_STRATEGIES[strategyName] : null;
  if (!strat && window.MASTER_STRATEGIES) strat = window.MASTER_STRATEGIES["2M3D1-1P"];
  let modeName = h ? (h.mode || 'SF') : 'SF';
  let modeData = strat?.modes?.[modeName] || strat?.modes?.['SF'];
  let tierIdx = Math.max(0, (parseInt(h ? (h.tier || 1) : 1, 10) - 1));
  let h_limit = (modeData?.hold && modeData.hold[tierIdx] !== undefined) ? modeData.hold[tierIdx] : 5;

  let targetDate = new Date(bDate);
  let addedDays = 0;
  // 주말을 제외하고 h_limit 영업일 후 날짜 계산
  while (addedDays < h_limit) {
    targetDate.setDate(targetDate.getDate() + 1);
    let dayOfWeek = targetDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      addedDays++;
    }
  }

  let m = String(targetDate.getMonth() + 1).padStart(2, '0');
  let d = String(targetDate.getDate()).padStart(2, '0');
  return `${m}-${d}`;
}

// ui/render-ui-updates.js - UI 상태 업데이트 렌더링 모듈

function renderPerfTabCharts() {
  const grid = document.getElementById('mainGrid');
  if (grid && grid.classList.contains('perf-tab-layout')) {
    if (typeof renderPeriodBarChartRaw === 'function') {
      if (yearlyDisplayMode === 'chart') renderPeriodBarChartRaw('perfYearlyBarChart', 1);
      if (monthlyDisplayMode === 'chart') renderPeriodBarChartRaw('perfMonthlyBarChart', 0);
      if (dailyDisplayMode === 'chart') renderPeriodBarChartRaw('perfDailyBarChart', 2);
    }
  }
}

function updateCurrentStatusUI(slotNum) {
  const panel = document.getElementById('settingsStatusPanel');
  if (!panel) return;

  let res = lastBTResults[slotNum];

  if (isManualBacktestMode) {
    const snapStr = localStorage.getItem(`vtotal3_snap${slotNum}_${myUserId}`);
    if (snapStr) {
      try {
        res = JSON.parse(snapStr);
      } catch (e) {
        res = null;
      }
    } else {
      res = null;
    }
  }

  const elDate = document.getElementById('statDate');
  const elTotal = document.getElementById('statTotal');
  const elRenew = document.getElementById('statRenew');
  const elPrincipal = document.getElementById('statPrincipal');
  const elCash = document.getElementById('statCash');
  const elRpCash = document.getElementById('statRpCash');

  if (!res || !res.summary) {
    if (elDate) elDate.innerText = "-";
    if (elTotal) elTotal.innerText = "-";
    if (elRenew) elRenew.innerText = "-";
    if (elPrincipal) elPrincipal.innerText = "-";
    if (elCash) elCash.innerText = "-";
    const elHoldings = document.getElementById('statHoldings');
    if (elHoldings) elHoldings.innerHTML = '<span class="holdings-empty">보유 주식 없음</span>';
    return;
  }

  const s = res.summary;
  const sheetDate = getDisplaySheetDate(slotNum, res, slotConfigs[slotNum]);
  const fmt = (val) => "$" + Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });

  // ⭐️ [시트 값 통일] 현황판 출력 기준
  let displayTotal = s.totalAssets;
  let displayBase = s.base;
  let displayPrincipal = s.realPrincipal || s.base;
  let displayCash = s.cash;
  let displayHoldings = [];

  // ⭐️ [운영현황 증액 보장] 동기화된 데이터(isSynced)는 무조건 summary(시트 최신값)를 사용!
  if (res.isSynced) {
    displayHoldings = res.inv || [];
  } else if (res.dailyStates && res.dailyStates.length > 0) {
    const lastState = res.dailyStates[res.dailyStates.length - 1];
    displayTotal = lastState.asset;
    try {
      const lastJson = JSON.parse(lastState.json);
      displayCash = lastJson.cash;
      displayBase = lastJson.base_principal;
      displayPrincipal = lastJson.realPrincipal || displayPrincipal;
      displayHoldings = lastJson.holdings || [];
    } catch (e) { /* JSON 파싱 실패 시 summary 값 사용 */ }
  } else if (res.inv) {
    displayHoldings = res.inv;
  }

  if (elDate) elDate.innerText = sheetDate;
  if (elTotal) elTotal.innerText = fmt(displayTotal);
  if (elRenew) elRenew.innerText = fmt(displayBase);
  if (elPrincipal) elPrincipal.innerText = fmt(displayPrincipal);
  if (elCash) elCash.innerText = fmt(displayCash);
  if (elRpCash) {
    let rpVal = s.rpCash;
    if (rpVal === undefined && window.orderStatusCache && window.orderStatusCache.balance) {
      rpVal = window.orderStatusCache.balance.rpCash;
    }
    if (rpVal === undefined) rpVal = 0;
    elRpCash.innerText = fmt(rpVal);
  }

  // 📦 보유 주식 (시트 꾸러미 데이터 - 꾸러미에 실제 저장되는 필드만 표시)
  const elHoldings = document.getElementById('statHoldings');
  if (elHoldings) {
    if (displayHoldings.length === 0) {
      elHoldings.innerHTML = '<span class="holdings-empty">보유 주식 없음</span>';
    } else {
      let html = displayHoldings.map((h) => {
        const m = h.mode || '-';
        const t = h.tier || '-';
        const bp = Number(h.buy_price || 0).toFixed(2);
        const q = h.qty || 0;
        const cost = Number(h.cost || 0).toFixed(2);
        const d = h.days || 0;
        const bd = h.buyDate || '-';
        return `<div class="holdings-grid-row">` +
          `<span style="color:#6366f1;">T${t}</span>` +
          `<span style="color:#fbbf24;">${m}</span>` +
          `<span style="color:#64748b;">${Number(bp).toFixed(2)}</span>` +
          `<span style="color:#10b981;">${q}주</span>` +
          `<span style="color:#f97316;">${Number(cost).toFixed(2)}</span>` +
          `<span style="color:#94a3b8;">${d}일</span>` +
          `<span style="color:#64748b;">${bd.split('-').slice(1).join('-')}</span>` +
          `</div>`;
      }).join('');
      elHoldings.innerHTML = html;
    }
  }
}

function updateUIWithResult(resBT, config, slotNum, skipSave = false) {
  const existing = lastBTResults[slotNum];
  let finalRes = resBT;

  // ⭐️ [거울 로직] 시트와 동기화된 데이터(existing)가 있더라도,
  // 엔진이 계산한 '오늘'의 새로운 매매나 상태가 있다면 이를 우선 반영하도록 개선
  if (existing && existing.isSynced && !resBT.isSynced) {
    // 엔진 결과(resBT)의 마지막 날짜가 시트 데이터(existing)의 마지막 날짜보다 크다면 엔진 데이터 사용
    const lastExistingDate = existing.chartDates && existing.chartDates.length > 0 ? existing.chartDates[existing.chartDates.length - 1] : "";
    const lastBTDate = resBT.chartDates && resBT.chartDates.length > 0 ? resBT.chartDates[resBT.chartDates.length - 1] : "";

    if (lastBTDate > lastExistingDate) {
      // ⭐️ [Smart Merge] 엔진이 더 최신이면 기존 시트 데이터 뒤에 엔진의 새로운 날짜들만 붙임
      const newIndices = [];
      for (let i = 0; i < resBT.chartDates.length; i++) {
        if (resBT.chartDates[i] > lastExistingDate) newIndices.push(i);
      }

      if (newIndices.length > 0) {
        const mergedDates = existing.chartDates.concat(newIndices.map(i => resBT.chartDates[i]));
        const mergedBalances = existing.chartBalances.concat(newIndices.map(i => resBT.chartBalances[i]));
        const mergedInout = (existing.chartInout || []).concat(newIndices.map(i => (resBT.chartInout ? resBT.chartInout[i] : 0)));

        let peak = -Infinity;
        const mergedMdd = mergedBalances.map(b => {
          if (b > peak) peak = b;
          return peak > 0 ? (b - peak) / peak : 0;
        });

        finalRes = {
          ...existing,
          orders: resBT.orders,
          nextOrderInfo: resBT.nextOrderInfo,
          orderDateStr: resBT.orderDateStr,
          currentStrat: resBT.currentStrat,
          chartDates: mergedDates,
          chartBalances: mergedBalances,
          chartInout: mergedInout,
          chartMdd: mergedMdd,
          monthlyData: calculateMonthlyData(mergedDates, mergedBalances, mergedMdd, mergedInout),
          yearlyData: calculateYearlyData(mergedDates, mergedBalances, mergedMdd, mergedInout),
          dailyData: calculateDailyData(mergedDates, mergedBalances, mergedMdd, mergedInout),
          dailyStates: (existing.dailyStates || []).concat(resBT.dailyStates || [])
        };
      } else {
        // 날짜가 같거나 뒤처지면 기존 데이터 구조 유지
        finalRes = {
          ...existing,
          orders: resBT.orders,
          nextOrderInfo: resBT.nextOrderInfo,
          orderDateStr: resBT.orderDateStr,
          currentStrat: resBT.currentStrat
        };
      }
    } else {
      // 날짜가 같거나 시트가 더 최신이면 기존처럼 시트 데이터 구조 유지
      finalRes = {
        ...existing,
        orders: resBT.orders,
        nextOrderInfo: resBT.nextOrderInfo,
        orderDateStr: resBT.orderDateStr,
        currentStrat: resBT.currentStrat
      };
    }
  }

  // ⭐️ [매매 내역 복원 오염 차단]
  // 실제 서버와 동기화된 실전 슬롯인 경우에 한하여, 엔진 구동 후 생성된 가상 trades 데이터를
  // 실제 자산 holdings 로그(dailyStates)의 변동 기록을 역추적한 정확한 실전 매매 내역으로 덮어씁니다.
  if (finalRes.isSynced && !finalRes.tradesFromSheet && finalRes.dailyStates && finalRes.dailyStates.length > 0) {
    const logsFormat = finalRes.dailyStates.map(state => [
      state.date,
      state.asset,
      state.inout || 0,
      state.json
    ]);
    finalRes.trades = window.UI.tradeHistory.reconstructRealTrades(logsFormat, slotNum);
  }

  lastBTResults[slotNum] = finalRes;
  globalMonthlyDataArr[slotNum] = finalRes.monthlyData;
  globalYearlyDataArr[slotNum] = finalRes.yearlyData;
  globalDailyDataArr[slotNum] = finalRes.dailyData;

  if (slotNum === 1) {
    currentActiveConfigStr = JSON.stringify(config);
    const op = document.getElementById('panelOrder'); if (op) op.classList.remove('hidden');
  }

  window.UI.order.renderOrderViewSlot(finalRes, slotNum);
  window.UI.performance.renderPeriodTableSlot(slotNum);
  (window.UI?.stats?.renderMetrics ? window.UI.stats.renderMetrics : (() => null))(finalRes.summary, finalRes.chartDates ? finalRes.chartDates.length : 0, slotNum);
  if (slotNum === activeSettingsTab) window.UI.updates.updateCurrentStatusUI(slotNum);
  window.UI.performance.calculateCombinedPeriodData();
  if (isStatsMode) window.UI.tradeHistory.renderDBTradeHistory();
}

// 글로벌 window.UI에 등록
if (!window.UI) window.UI = {};
if (!window.UI.updates) window.UI.updates = {};
window.UI.updates.updateUIWithResult = updateUIWithResult;
window.UI.updates.updateCurrentStatusUI = updateCurrentStatusUI;
window.UI.updates.renderPerfTabCharts = renderPerfTabCharts;
