// utils/period-calculator.js
// 월별, 년별, 일별 성과 데이터 계산 함수 모음

function calculateMonthlyData(dates, balances, mdds, inouts) {
  if (!dates || dates.length === 0) return [];
  let monthly = [];
  let currentMonth = dates[0].substring(0, 7);
  let monthStartBalance = balances[0];
  let monthStartInout = (inouts && inouts.length > 0) ? inouts[0] : 0;
  let currentMonthMinMdd = mdds[0];

  for (let i = 0; i < dates.length; i++) {
    let monthKey = dates[i].substring(0, 7);
    let dMdd = mdds[i];
    if (monthKey !== currentMonth) {
      let endBalance = balances[i - 1];
      let endInout = (inouts && inouts[i - 1] !== undefined) ? inouts[i - 1] : 0;
      let inoutForPeriod = endInout - monthStartInout;
      let monthProfit = endBalance - monthStartBalance - inoutForPeriod;
      let originalCapital = endBalance - monthProfit;
      monthly.push({
        period: currentMonth,
        asset: endBalance,
        rate: originalCapital > 0 ? monthProfit / originalCapital : 0,
        profit: monthProfit,
        mdd: currentMonthMinMdd
      });
      currentMonth = monthKey;
      monthStartBalance = endBalance;
      monthStartInout = endInout;
      currentMonthMinMdd = dMdd;
    } else {
      if (dMdd < currentMonthMinMdd) currentMonthMinMdd = dMdd;
    }
    if (i === dates.length - 1) {
      let endBalance = balances[i];
      let endInout = (inouts && inouts[i] !== undefined) ? inouts[i] : 0;
      let inoutForPeriod = endInout - monthStartInout;
      let monthProfit = endBalance - monthStartBalance - inoutForPeriod;
      let originalCapital = endBalance - monthProfit;
      monthly.push({
        period: currentMonth,
        asset: endBalance,
        rate: originalCapital > 0 ? monthProfit / originalCapital : 0,
        profit: monthProfit,
        mdd: currentMonthMinMdd
      });
    }
  }
  return monthly;
}

function calculateYearlyData(dates, balances, mdds, inouts) {
  if (!dates || dates.length === 0) return [];
  let yearly = [];
  let currentYear = dates[0].substring(0, 4);
  let yearStartBalance = balances[0];
  let yearStartInout = (inouts && inouts.length > 0) ? inouts[0] : 0;
  let currentYearMinMdd = mdds[0];

  for (let i = 0; i < dates.length; i++) {
    let yearKey = dates[i].substring(0, 4);
    let dMdd = mdds[i];
    if (yearKey !== currentYear) {
      let endBalance = balances[i - 1];
      let endInout = (inouts && inouts[i - 1] !== undefined) ? inouts[i - 1] : 0;
      let inoutForPeriod = endInout - yearStartInout;
      let yearProfit = endBalance - yearStartBalance - inoutForPeriod;
      let originalCapital = endBalance - yearProfit;
      yearly.push({
        period: currentYear,
        asset: endBalance,
        rate: originalCapital > 0 ? yearProfit / originalCapital : 0,
        profit: yearProfit,
        mdd: currentYearMinMdd
      });
      currentYear = yearKey;
      yearStartBalance = endBalance;
      yearStartInout = endInout;
      currentYearMinMdd = dMdd;
    } else {
      if (dMdd < currentYearMinMdd) currentYearMinMdd = dMdd;
    }
    if (i === dates.length - 1) {
      let endBalance = balances[i];
      let endInout = (inouts && inouts[i] !== undefined) ? inouts[i] : 0;
      let inoutForPeriod = endInout - yearStartInout;
      let yearProfit = endBalance - yearStartBalance - inoutForPeriod;
      let basis = yearStartBalance + inoutForPeriod;
      yearly.push({
        period: currentYear,
        asset: endBalance,
        rate: basis > 0 ? yearProfit / basis : 0,
        profit: yearProfit,
        mdd: currentYearMinMdd
      });
    }
  }
  return yearly;
}

function calculateDailyData(dates, balances, mdds, inouts) {
  if (!dates || dates.length === 0) return [];
  let daily = [];
  let startBalance = balances[0];
  let startInout = (inouts && inouts.length > 0) ? inouts[0] : 0;

  for (let i = 0; i < dates.length; i++) {
    let dayKey = dates[i];
    let endBalance = balances[i];
    let endInout = (inouts && inouts[i] !== undefined) ? inouts[i] : 0;
    let prevBalance = i > 0 ? balances[i - 1] : startBalance;
    let prevInout = i > 0 ? inouts[i - 1] : startInout;
    let inoutForPeriod = endInout - prevInout;
    let dayProfit = endBalance - prevBalance - inoutForPeriod;
    let originalCapital = endBalance - dayProfit;

    daily.push({
      period: dayKey,
      asset: endBalance,
      rate: originalCapital > 0 ? dayProfit / originalCapital : 0,
      profit: dayProfit,
      mdd: mdds[i]
    });
  }
  return daily;
}

window.periodCalculator = {
  calculateMonthlyData,
  calculateYearlyData,
  calculateDailyData
};
