// utils/summary-calculator.js
// 백테스트 결과 요약 데이터 생성 함수 모음

function calculateCombinedSummaryEngine(activeResults) {
  if (!activeResults || activeResults.length === 0) return null;
  if (activeResults.length === 1) return activeResults[0].summary;

  let tAssets = 0, evalVal = 0, totalProfit = 0, realizedProfit = 0, cash = 0, qty = 0;
  let currPriceSum = 0, avgPriceSum = 0, sumRealPrincipal = 0, sumBase = 0;
  let count = activeResults.length;

  for (const r of activeResults) {
    const s = r.summary || {};
    tAssets += (s.totalAssets || 0);
    evalVal += (s.evalVal || 0);
    totalProfit += (s.totalProfit || 0);
    realizedProfit += (s.realizedProfit || 0);
    cash += (s.cash || 0);
    qty += (s.qty || 0);
    currPriceSum += (s.currPrice || 0);
    avgPriceSum += ((s.avgPrice || 0) * (s.qty || 0));
    sumRealPrincipal += (s.realPrincipal || 0);
    sumBase += (s.base || 0);
  }

  let combinedMdd = 0, combinedCurrentMdd = 0;
  let allDates = new Set();
  activeResults.forEach(r => { if (r.chartDates) r.chartDates.forEach(date => allDates.add(date)); });
  let sortedDates = Array.from(allDates).sort();

  if (sortedDates.length > 0) {
    let peak = 0, minDraw = 0;
    // 🚀 [성능 최적화]: 날짜가 정렬되어 있으므로 슬롯별 단일 패스 커서(O(D * S))로 이전 O(D^2 * S) 선형 탐색 병목 해결
    const slotTrackers = activeResults.map(r => ({
      dates: r.chartDates || [],
      balances: r.chartBalances || [],
      cursor: -1
    }));

    sortedDates.forEach((dt, i) => {
      let dayAsset = 0;
      for (let sIdx = 0; sIdx < slotTrackers.length; sIdx++) {
        const tracker = slotTrackers[sIdx];
        const dates = tracker.dates;
        const dLen = dates.length;
        while (tracker.cursor + 1 < dLen && dates[tracker.cursor + 1] <= dt) {
          tracker.cursor++;
        }
        if (tracker.cursor >= 0) {
          dayAsset += (tracker.balances[tracker.cursor] || 0);
        }
      }
      if (dayAsset > peak) peak = dayAsset;
      let draw = peak > 0 ? (dayAsset - peak) / peak : 0;
      if (draw < minDraw) minDraw = draw;
      if (i === sortedDates.length - 1) combinedCurrentMdd = draw;
    });
    combinedMdd = minDraw;
  }

  const totalProfitSum = totalProfit;
  const totalYieldCombined = sumRealPrincipal > 0 ? totalProfitSum / sumRealPrincipal : 0;

  const toDateObj = (str) => {
    if (!str) return new Date();
    let s = String(str).trim().replace(/[.\/]/g, '-');
    let p = s.split('-');
    if (p.length < 3) return new Date();
    let year = parseInt(p[0], 10);
    if (year < 100) year += 2000;
    return new Date(year, parseInt(p[1], 10) - 1, parseInt(p[2], 10));
  };

  let maxDays = 1;
  let totalCapitalDays = 0;
  let totalPrincipalForDays = 0;

  activeResults.forEach(r => {
    const sDateStr = (r.summary && r.summary.trueStartDate) ? r.summary.trueStartDate : (r.chartDates && r.chartDates[0]);
    if (sDateStr && r.chartDates && r.chartDates.length > 0) {
      const s = toDateObj(sDateStr);
      const e = toDateObj(r.chartDates[r.chartDates.length - 1]);
      const d = Math.max(1, Math.round((e - s) / 86400000));
      if (d > maxDays) maxDays = d;
      const principal = (r.summary && r.summary.realPrincipal) || 0;
      if (principal > 0) {
        totalCapitalDays += principal * d;
        totalPrincipalForDays += principal;
      }
    }
  });

  // 🛡️ [CAGR 정확도 개선]: 슬롯별 운용 기간이 다를 때의 왜곡을 방지하기 위해 자본 가중 운용일수(Capital-Weighted Duration) 적용
  const effectiveDays = (totalPrincipalForDays > 0)
    ? Math.max(1, Math.round(totalCapitalDays / totalPrincipalForDays))
    : maxDays;

  const cagrVal = Math.pow(1 + totalYieldCombined, 365 / effectiveDays) - 1;
  const finalCagr = (isFinite(cagrVal) && !isNaN(cagrVal)) ? cagrVal : totalYieldCombined;

  return {
    totalAssets: tAssets,
    yield: totalYieldCombined,
    cagr: finalCagr,
    mdd: combinedMdd,
    calmar: combinedMdd !== 0 ? Math.abs(finalCagr / combinedMdd) : 0,
    totalProfit: totalProfitSum,
    realizedProfit: realizedProfit,
    evalVal: evalVal,
    cash: cash,
    evalReturn: avgPriceSum > 0 ? (evalVal - avgPriceSum) / avgPriceSum : 0,
    qty: qty,
    currPrice: currPriceSum / count,
    avgPrice: qty > 0 ? avgPriceSum / qty : (avgPriceSum / count),
    base: sumBase,
    currentMdd: combinedCurrentMdd,
    realPrincipal: sumRealPrincipal,
    depletion: tAssets > 0 ? (evalVal / tAssets) : 0
  };
}

function generateCombinedPeriodDataEngine(activeResults) {
  if (!activeResults || activeResults.length === 0) return { monthly: [], yearly: [], daily: [] };
  if (activeResults.length === 1) return { monthly: activeResults[0].monthlyData, yearly: activeResults[0].yearlyData, daily: activeResults[0].dailyData };

  let allDatesSet = new Set();
  activeResults.forEach(r => { if (r.chartDates) r.chartDates.forEach(d => allDatesSet.add(d)); });
  let sortedDates = Array.from(allDatesSet).sort();

  let combinedBalances = [];
  let combinedInouts = [];
  let combinedMdds = [];
  let peak = 0;

  // 🚀 [성능 최적화]: 날짜가 정렬되어 있으므로 슬롯별 사전 계산 및 커서 스캔(O(D * S))으로 선형 탐색 제거
  const slotTrackers = activeResults.map(r => {
    const dates = r.chartDates || [];
    const balances = r.chartBalances || [];
    const inouts = r.chartInout || [];
    const isSynced = !!r.isSynced;
    const firstAsset = balances[0] || 0;
    const firstInout = inouts[0] || 0;
    const initialCash = (r.summary && r.summary.realPrincipal)
      ? (r.summary.realPrincipal - (r.summary.inout || 0))
      : firstAsset;

    return {
      dates,
      balances,
      inouts,
      isSynced,
      firstAsset,
      firstInout,
      initialCash,
      cursor: -1
    };
  });

  sortedDates.forEach(dt => {
    let dayAsset = 0;
    let dayInout = 0;

    for (let sIdx = 0; sIdx < slotTrackers.length; sIdx++) {
      const tracker = slotTrackers[sIdx];
      const dates = tracker.dates;
      const dLen = dates.length;

      while (tracker.cursor + 1 < dLen && dates[tracker.cursor + 1] <= dt) {
        tracker.cursor++;
      }

      if (tracker.cursor >= 0) {
        const k = tracker.cursor;
        const currentAsset = tracker.balances[k] || 0;
        let slotInoutVal = 0;

        if (tracker.isSynced) {
          const currInout = tracker.inouts[k] || 0;
          slotInoutVal = tracker.firstAsset + (currInout - tracker.firstInout);
        } else {
          slotInoutVal = tracker.initialCash + (tracker.inouts[k] || 0);
        }

        dayAsset += currentAsset;
        dayInout += slotInoutVal;
      }
    }

    combinedBalances.push(dayAsset);
    combinedInouts.push(dayInout);

    if (dayAsset > peak) peak = dayAsset;
    combinedMdds.push(peak > 0 ? (dayAsset - peak) / peak : 0);
  });

  return {
    monthly: window.periodCalculator.calculateMonthlyData(sortedDates, combinedBalances, combinedMdds, combinedInouts).reverse(),
    yearly: window.periodCalculator.calculateYearlyData(sortedDates, combinedBalances, combinedMdds, combinedInouts).reverse(),
    daily: window.periodCalculator.calculateDailyData(sortedDates, combinedBalances, combinedMdds, combinedInouts).reverse()
  };
}

window.summaryCalculator = {
  calculateCombinedSummaryEngine,
  generateCombinedPeriodDataEngine
};
