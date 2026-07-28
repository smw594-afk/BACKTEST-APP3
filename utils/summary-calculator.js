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
    sortedDates.forEach((dt, i) => {
      let dayAsset = 0;
      activeResults.forEach(r => {
        if (r.chartDates && r.chartBalances) {
          let idx = r.chartDates.indexOf(dt);
          if (idx !== -1) dayAsset += r.chartBalances[idx];
          else {
            let lastIdx = -1;
            for (let j = 0; j < r.chartDates.length; j++) { if (r.chartDates[j] <= dt) lastIdx = j; }
            if (lastIdx !== -1) dayAsset += r.chartBalances[lastIdx];
          }
        }
      });
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
  activeResults.forEach(r => {
    const sDateStr = (r.summary && r.summary.trueStartDate) ? r.summary.trueStartDate : (r.chartDates && r.chartDates[0]);
    if (sDateStr && r.chartDates && r.chartDates.length > 0) {
      const s = toDateObj(sDateStr);
      const e = toDateObj(r.chartDates[r.chartDates.length - 1]);
      const d = Math.max(1, Math.round((e - s) / 86400000));
      if (d > maxDays) maxDays = d;
    }
  });

  const cagrVal = Math.pow(1 + totalYieldCombined, 365 / maxDays) - 1;
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

  sortedDates.forEach(dt => {
    let dayAsset = 0;
    let dayInout = 0;

    activeResults.forEach(r => {
      if (r.chartDates && r.chartBalances) {
        let idx = r.chartDates.indexOf(dt);
        let slotInoutVal = 0;
        let currentAsset = 0;

        if (idx !== -1) {
          currentAsset = r.chartBalances[idx];
          if (r.isSynced) {
            let firstAsset = r.chartBalances[0] || 0;
            let firstInout = r.chartInout ? r.chartInout[0] : 0;
            let currInout = r.chartInout ? r.chartInout[idx] : 0;
            slotInoutVal = firstAsset + (currInout - firstInout);
          } else {
            let initialCash = r.summary && r.summary.realPrincipal ? (r.summary.realPrincipal - (r.summary.inout || 0)) : (r.chartBalances[0] || 0);
            slotInoutVal = initialCash + (r.chartInout ? r.chartInout[idx] : 0);
          }
        } else {
          let lastI = -1;
          for (let j = 0; j < r.chartDates.length; j++) { if (r.chartDates[j] <= dt) lastI = j; }
          if (lastI !== -1) {
            currentAsset = r.chartBalances[lastI];
            if (r.isSynced) {
              let firstAsset = r.chartBalances[0] || 0;
              let firstInout = r.chartInout ? r.chartInout[0] : 0;
              let currInout = r.chartInout ? r.chartInout[lastI] : 0;
              slotInoutVal = firstAsset + (currInout - firstInout);
            } else {
              let initialCash = r.summary && r.summary.realPrincipal ? (r.summary.realPrincipal - (r.summary.inout || 0)) : (r.chartBalances[0] || 0);
              slotInoutVal = initialCash + (r.chartInout ? r.chartInout[lastI] : 0);
            }
          }
        }

        dayAsset += currentAsset;
        dayInout += slotInoutVal;
      }
    });

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
