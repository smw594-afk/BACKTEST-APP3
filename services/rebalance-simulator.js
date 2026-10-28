// services/rebalance-simulator.js
// 백테스트 다중 슬롯 사이클 마감형 연초 리밸런싱 시뮬레이터
// 골든 룰 2 준수: engine.js 수정 없이 동일한 수식으로 다중 슬롯 병렬 시뮬레이션

(function(root) {
  function t2(v) { return (v === null || v === undefined || isNaN(v)) ? 0.0 : Math.trunc((v + 0.00001) * 100) / 100.0; }
  function t2_pl(v) { let sign_v = (v > 0 ? 1 : (v < 0 ? -1 : 0)); return (v === null || v === undefined || isNaN(v)) ? 0.0 : Math.trunc((v + sign_v * 0.00001) * 100) / 100.0; }
  function c2(v) { return (v === null || v === undefined || isNaN(v)) ? 0.0 : Math.ceil((v * 100) - 0.00001) / 100.0; }
  function truncPct5(v) { return v; }
  function fixFloat(value) {
    if (value === null || value === undefined || isNaN(value)) return 0;
    return Math.round(value * 100) / 100;
  }
  function pyRound2(num) {
    let factor = 100, temp = num * factor, rounded = Math.round(temp);
    if (Math.abs(temp % 1) === 0.5) rounded = (Math.floor(temp) % 2 === 0) ? Math.floor(temp) : Math.ceil(temp);
    return rounded / factor;
  }

  function formatDateNY(d) {
    if (typeof d === 'string') return d.slice(0, 10);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function getFridayEnd(d) {
    const dt = (d instanceof Date) ? new Date(d) : new Date(d);
    const day = dt.getDay();
    const diff = (day >= 5) ? (day - 5) : (day + 2);
    const fri = new Date(dt);
    fri.setDate(fri.getDate() - diff);
    fri.setHours(20, 0, 0, 0);
    return fri.getTime();
  }

  function calculateWRSI_WFRI(qData) {
    let dD = qData.dates, qC = qData.close, weeklyData = {}, wP = [], wD = [];
    for (let i = 0; i < dD.length; i++) weeklyData[getFridayEnd(dD[i])] = { close: qC[i], date: dD[i] };
    let sortedFri = Object.keys(weeklyData).sort((a, b) => Number(a) - Number(b));
    for (let i = 0; i < sortedFri.length; i++) { wP.push(weeklyData[sortedFri[i]].close); wD.push(weeklyData[sortedFri[i]].date); }
    let p = 14, wRsi = [];
    for (let i = 0; i < wP.length; i++) {
      if (i < p) { wRsi.push(50); continue; }
      let g = 0, l = 0;
      for (let j = i - p + 1; j <= i; j++) {
        let df = wP[j] - wP[j - 1];
        if (df > 0) g += df; else l -= df;
      }
      let val = (l === 0 ? 50 : 100 - (100 / (1 + (g / p) / (l / p))));
      wRsi.push(pyRound2(val));
    }
    let wRMap = {};
    for (let i = 0; i < dD.length; i++) {
      let ds = formatDateNY(dD[i]);
      let friEnd = getFridayEnd(dD[i]);
      let wIdx = sortedFri.indexOf(friEnd.toString());
      wRMap[ds] = { dR: (wIdx >= 1) ? wRsi[wIdx - 1] : 50, dRR: (wIdx >= 2) ? wRsi[wIdx - 2] : 50, dCurrent: wRsi[wIdx] };
    }
    return wRMap;
  }

  function simulateRebalancedPortfolio(activeSlots, priceData, rebalanceMode) {
    // activeSlots: [{ slotNum, config, stratName, initialCash, renewCash, fBase, fSec }]
    // rebalanceMode: 'renew' (년초 리밸런싱 (투자갱신금)) 또는 'equal' (년초 리밸런싱)
    if (!activeSlots || activeSlots.length === 0) return null;
    const kCount = activeSlots.length;
    const firstCfg = activeSlots[0].config;
    const ticker = firstCfg.basics.ticker || 'SOXL';
    const startDate = new Date(firstCfg.basics.startDate);
    const endDateInput = firstCfg.basics.endDate;
    const endDate = (endDateInput && endDateInput.trim() !== '') ? new Date(endDateInput) : new Date();
    endDate.setHours(23, 59, 59, 999);

    const mainDataAll = priceData[ticker];
    const qqqData = priceData["QQQ"];
    if (!mainDataAll || !qqqData || mainDataAll.close.length === 0) return null;

    const full_c = mainDataAll.close;
    const wRsiMap = (root.calculateWRSI_WFRI && typeof root.calculateWRSI_WFRI === 'function')
      ? root.calculateWRSI_WFRI(qqqData)
      : calculateWRSI_WFRI(qqqData);

    const slotStates = activeSlots.map(s => {
      let curStrat = s.stratName || '2M3D1-1P';
      if (curStrat === 'RSI 3M') curStrat = '3M3D1-R';
      const stratMap = root.MASTER_STRATEGIES || (typeof window !== 'undefined' ? window.MASTER_STRATEGIES : {});
      if (!stratMap[curStrat]) curStrat = '2M3D1-1P';
      const M_STRAT = stratMap[curStrat] || {};
      const cfg = M_STRAT.config || {};
      const MODES = M_STRAT.modes || {};

      const fBuy = (parseFloat(s.fBase) || 0.08) / 100.0;
      const fSellT = ((parseFloat(s.fBase) || 0.08) + (parseFloat(s.fSec) || 0.00278)) / 100.0;
      const initialCash = fixFloat(parseFloat(s.initialCash) || 10000);
      const renewCash = fixFloat(parseFloat(s.renewCash) || initialCash);

      return {
        slotNum: s.slotNum,
        stratName: curStrat,
        cfg: cfg,
        MODES: MODES,
        fBuy: fBuy,
        fSellT: fSellT,
        cash: initialCash,
        base: renewCash,
        initialCash: initialCash,
        realPrincipal: initialCash,
        inv: [],
        peak: initialCash,
        prev_total: initialCash,
        cumulativeInOut: 0,
        cumulativeRealizedProfit: 0,
        rsi_m: 'SF',
        needsRebalanceYear: null,
        compR: cfg.compR !== undefined ? cfg.compR : 0.824,
        lossR: cfg.lossR !== undefined ? cfg.lossR : 0.329,
        tierAssign: cfg.tierMethod,
        dLimit: cfg.dLimit,
        cDn3: cfg.cDn3,
        cDn2: cfg.cDn2,
        cDn1: cfg.cDn1,
        useMid1: cfg.useMid1,
        useMid2: cfg.useMid2,
        useMid3: cfg.useMid3,
        rsi_up: cfg.rsi_up !== undefined ? cfg.rsi_up : 65.2,
        rsi_dn: cfg.rsi_dn !== undefined ? cfg.rsi_dn : 45.6,
        isRsiStrat: cfg.rsi_up !== undefined || (curStrat.startsWith('3M3D1') || curStrat.startsWith('3M3D3'))
      };
    });

    let startIndex = mainDataAll.dates.findIndex(d => {
      const dTs = (d instanceof Date) ? d.getTime() : new Date(d).getTime();
      return dTs >= startDate.getTime();
    });
    if (startIndex === -1) startIndex = mainDataAll.dates.length;

    const firstPrevClose = (startIndex > 0) ? mainDataAll.close[startIndex - 1] : mainDataAll.open[0];

    // 과거 워밍업 기간 동안의 rsi_m 상태 초기화 (engine.js lines 268-287과 동일)
    for (let wI = 0; wI < startIndex; wI++) {
      let dtStrObj = mainDataAll.dates[wI];
      if (!dtStrObj) continue;
      let dtStr = formatDateNY(dtStrObj);
      let rv = wRsiMap[dtStr] ? wRsiMap[dtStr].dR : 50, rrv = wRsiMap[dtStr] ? wRsiMap[dtStr].dRR : 50;
      if (rv !== 0) {
        slotStates.forEach(st => {
          if (st.isRsiStrat) {
            if (rv >= st.rsi_up) st.rsi_m = 'AG';
            else if (rv <= st.rsi_dn) st.rsi_m = 'SF';
            else st.rsi_m = 'DEF';
          } else {
            if (rrv <= 35 && rrv < rv) st.rsi_m = 'AG';
            else if (rrv >= 40 && rrv < 50 && rrv > rv) st.rsi_m = 'SF';
            else if (rrv <= 50 && rv > 50) st.rsi_m = 'AG';
            else if (rrv >= 50 && rv < 50) st.rsi_m = 'SF';
            else if (rrv >= 50 && rrv < 60 && rrv < rv) st.rsi_m = 'AG';
            else if (rrv > 65 && rrv > rv) st.rsi_m = 'SF';
          }
        });
      }
    }

    const bDates = mainDataAll.dates.filter(d => {
      const dTs = (d instanceof Date) ? d.getTime() : new Date(d).getTime();
      return dTs <= endDate.getTime() && dTs >= startDate.getTime();
    });

    let currentYear = null;
    const S = [], BA = [], BF = [], INOUT = [];
    let portfolioPeak = 0;
    const initialTotalPrincipal = slotStates.reduce((acc, st) => acc + st.initialCash, 0);

    for (let loop_i = 0; loop_i < bDates.length; loop_i++) {
      const idx = startIndex + loop_i;
      const close = full_c[idx];
      const prev = (idx === 0) ? firstPrevClose : full_c[idx - 1];
      const dtStr = formatDateNY(bDates[loop_i]);
      const dateYear = parseInt(dtStr.slice(0, 4), 10);

      // 연도 전환 감지: 1월 첫 거래일에 모든 슬롯에 리밸런싱 플래그 설정
      // ⚠️ 시작 연도(currentYear === null)는 1월 1일 이미 시작금액/갱신금이 일치된 상태로 출발하므로
      //    시작 연도 중에는 리밸런싱을 하지 않고, 해가 바뀐 다음 해(dateYear > currentYear)부터 리밸런싱 플래그를 설정한다.
      if (currentYear === null) {
        currentYear = dateYear;
      } else if (dateYear > currentYear) {
        currentYear = dateYear;
        slotStates.forEach(st => {
          st.needsRebalanceYear = currentYear;
        });
      }

      // 각 슬롯별 일간 매매 시뮬레이션
      slotStates.forEach(st => {
        const MODES = st.MODES;
        const isRsiStrat = st.isRsiStrat;

        // RSI 모드 계산 (engine.js와 100% 동일)
        let rv = wRsiMap[dtStr] ? wRsiMap[dtStr].dR : 50;
        let rrv = wRsiMap[dtStr] ? wRsiMap[dtStr].dRR : 50;
        if (rv !== 0) {
          if (isRsiStrat) {
            if (rv >= st.rsi_up) st.rsi_m = 'AG';
            else if (rv <= st.rsi_dn) st.rsi_m = 'SF';
            else st.rsi_m = 'DEF';
          } else {
            if (rrv <= 35 && rrv < rv) st.rsi_m = 'AG';
            else if (rrv >= 40 && rrv < 50 && rrv > rv) st.rsi_m = 'SF';
            else if (rrv <= 50 && rv > 50) st.rsi_m = 'AG';
            else if (rrv >= 50 && rv < 50) st.rsi_m = 'SF';
            else if (rrv >= 50 && rrv < 60 && rrv < rv) st.rsi_m = 'AG';
            else if (rrv > 65 && rrv > rv) st.rsi_m = 'SF';
          }
        }

        // 급락 / 3단 하락 판별
        const is3Drop = (idx >= 4) &&
          (truncPct5((full_c[idx - 3] - full_c[idx - 4]) / full_c[idx - 4]) <= st.cDn3) &&
          (truncPct5((full_c[idx - 2] - full_c[idx - 3]) / full_c[idx - 3]) <= st.cDn2) &&
          (truncPct5((full_c[idx - 1] - full_c[idx - 2]) / full_c[idx - 2]) <= st.cDn1);
        const isPlunge = (idx >= 2) && (truncPct5((full_c[idx - 1] - full_c[idx - 2]) / full_c[idx - 2]) <= st.dLimit);
        let applied_m = null;
        if (is3Drop) {
          if (st.rsi_m === 'SF' && st.useMid1) applied_m = 'Middle';
          else if (st.rsi_m === 'AG' && st.useMid3) applied_m = 'Middle3';
          else if (st.rsi_m === 'DEF' && isRsiStrat) {
            applied_m = (st.useMid1 || st.useMid2 || st.useMid3) ? ((!st.useMid2 && !st.stratName.startsWith('3M3D1')) ? 'Middle2' : 'Middle') : null;
          }
        }
        if (!applied_m && isPlunge && st.useMid2) {
          applied_m = 'Middle2';
        }
        const curr_m = applied_m || st.rsi_m;

        // 매수 티어 결정
        let t = st.inv.length + 1;
        if (st.tierAssign === '최소(빈자리)' || st.tierAssign === '최소') {
          const used = st.inv.map(p => p.tier);
          t = 1;
          while (used.indexOf(t) !== -1) t++;
        }

        let b_qty = 0;
        if (MODES[curr_m] && t <= MODES[curr_m].weight.length) {
          const w_val = MODES[curr_m].weight[t - 1];
          const seed = t2(Math.min(st.base * w_val, st.cash));
          const b_tgt = t2(prev * (1 + MODES[curr_m].buy[t - 1]));
          if (b_tgt > 0 && close <= b_tgt) {
            b_qty = Math.floor(seed / (b_tgt * (1 + st.fBuy)) + 0.0001);
          }
        }

        // 매도 판정
        let d_sell_net = 0.0, d_buy_cost = 0.0, d_cf = 0.0, d_pl = 0.0, n_inv = [];
        for (let p_idx = 0; p_idx < st.inv.length; p_idx++) {
          const p_inv = st.inv[p_idx];
          p_inv.days++;
          const p_mode = MODES[p_inv.mode];
          if (!p_mode) continue;
          const tIdx = Math.min(p_inv.tier - 1, p_mode.sell.length - 1);
          const sellRate = p_mode.sell[tIdx] || 0;
          const s_tgt = c2(p_inv.buy_price * (1 + sellRate));
          const hIdx = Math.min(p_inv.tier - 1, p_mode.hold.length - 1);
          const h_limit = p_mode.hold[hIdx] || 1;

          if (close >= s_tgt || p_inv.days >= h_limit) {
            const net = (p_inv.qty * close) * (1 - st.fSellT);
            const trade_pl = net - p_inv.cost;
            d_pl += trade_pl;
            d_cf += net;
            d_sell_net += net;
            d_buy_cost += p_inv.cost;
          } else {
            n_inv.push(p_inv);
          }
        }
        st.inv = n_inv;

        // 매수 체결 반영
        if (b_qty > 0) {
          const totalBC = (b_qty * close) * (1 + st.fBuy);
          if (totalBC <= st.cash) {
            d_cf -= totalBC;
            st.inv.push({ buy_price: close, qty: b_qty, cost: fixFloat(totalBC), mode: curr_m, tier: t, days: 0, buyDate: dtStr });
          }
        }

        // 현금 및 복리 갱신금 조정 (engine.js와 100% 동일한 수식)
        st.cash = t2(st.cash + d_cf);
        const pl_f = t2_pl(d_pl);
        if (pl_f > 0) {
          st.base += pl_f * st.compR;
        } else if (pl_f < 0) {
          st.base += pl_f * st.lossR;
        }
        st.base = t2(st.base);
        st.cumulativeRealizedProfit += pl_f;
      });

      // ⭐️ A안 사이클 마감형 연초 리밸런싱 실행
      // 주식을 모두 매도하여 사이클이 종료된 슬롯(inv.length === 0)이 존재하고 needsRebalanceYear가 설정되어 있을 때
      slotStates.forEach(st => {
        if (st.needsRebalanceYear !== null && st.inv.length === 0) {
          // 당일 전체 슬롯의 총자산 계산
          let totalPortfolioVal = 0;
          slotStates.forEach(s => {
            const sEval = s.inv.reduce((sum, p) => sum + p.qty, 0) * close;
            totalPortfolioVal += (s.cash + sEval);
          });

          const targetAssetPerSlot = t2(totalPortfolioVal / kCount);
          const currentSlotAsset = st.cash; // inv.length === 0이므로 st.cash가 곧 총자산
          const cashDelta = targetAssetPerSlot - currentSlotAsset;

          st.cash = targetAssetPerSlot;

          if (rebalanceMode === 'equal') {
            // ② 년초 리밸런싱: 투자갱신금 = 리밸런싱된 목표 총잔고
            st.base = targetAssetPerSlot;
          } else {
            // ① 년초 리밸런싱 (투자갱신금): 기존 갱신금에 증감분(cashDelta)을 동일하게 반영
            const prevBase = st.base;
            let newBase = prevBase + cashDelta;
            if (newBase <= 0) newBase = Math.max(100, targetAssetPerSlot * 0.1);
            if (newBase > targetAssetPerSlot) newBase = targetAssetPerSlot;
            st.base = t2(newBase);
          }

          st.needsRebalanceYear = null; // 해당 슬롯 당해 연도 리밸런싱 완료
        }
      });

      // 당일 포트폴리오 총합 자산 및 MDD 집계
      let dayTotalAsset = 0;
      let dayTotalQty = 0;
      let dayTotalEval = 0;
      let dayTotalCash = 0;

      slotStates.forEach(st => {
        const sQty = st.inv.reduce((sum, p) => sum + p.qty, 0);
        const sEval = t2(sQty * close);
        dayTotalQty += sQty;
        dayTotalEval += sEval;
        dayTotalCash += st.cash;
        dayTotalAsset += t2(st.cash + sEval);
      });

      dayTotalAsset = t2(dayTotalAsset);
      if (dayTotalAsset > portfolioPeak) portfolioPeak = dayTotalAsset;
      const dayMdd = portfolioPeak > 0 ? truncPct5((dayTotalAsset - portfolioPeak) / portfolioPeak) : 0;

      S.push(dtStr);
      BA.push(dayTotalAsset);
      BF.push(dayMdd);
      INOUT.push(0);
    }

    // 최종 집계 요약 생성
    const lastAsset = BA.length > 0 ? BA[BA.length - 1] : initialTotalPrincipal;
    const finalProfit = lastAsset - initialTotalPrincipal;
    const finalYield = initialTotalPrincipal > 0 ? finalProfit / initialTotalPrincipal : 0;

    const yrs = (endDate - startDate) / (1000 * 60 * 60 * 24 * 365.25);
    const finalCagr = yrs > 0 ? (Math.pow(lastAsset / initialTotalPrincipal, 1 / yrs) - 1) : 0;
    const minMdd = BF.length > 0 ? Math.min(...BF) : 0;
    const lastMdd = BF.length > 0 ? BF[BF.length - 1] : 0;
    const finalCalmar = minMdd !== 0 ? Math.abs(finalCagr / minMdd) : 0;

    let finalTotalQty = 0;
    let finalTotalCash = 0;
    let finalTotalEval = 0;
    let finalBaseSum = 0;
    const lastClose = full_c.length > 0 ? full_c[full_c.length - 1] : 0;

    slotStates.forEach(st => {
      const q = st.inv.reduce((sum, p) => sum + p.qty, 0);
      finalTotalQty += q;
      finalTotalCash += st.cash;
      finalTotalEval += (q * lastClose);
      finalBaseSum += st.base;
    });

    const summary = {
      totalAssets: lastAsset,
      yield: finalYield,
      cagr: finalCagr,
      mdd: minMdd,
      calmar: finalCalmar,
      totalProfit: finalProfit,
      realizedProfit: finalProfit,
      evalVal: finalTotalEval,
      cash: finalTotalCash,
      evalReturn: finalTotalEval > 0 ? 0 : 0,
      qty: finalTotalQty,
      currPrice: lastClose,
      avgPrice: finalTotalQty > 0 ? (finalTotalEval / finalTotalQty) : 0,
      base: finalBaseSum,
      currentMdd: lastMdd,
      realPrincipal: initialTotalPrincipal,
      depletion: lastAsset > 0 ? (finalTotalEval / lastAsset) : 0
    };

    const periodCalc = root.periodCalculator || window.periodCalculator;
    let monthlyData = [], yearlyData = [], dailyData = [];
    if (periodCalc) {
      monthlyData = periodCalc.calculateMonthlyData(S, BA, BF, INOUT).reverse();
      yearlyData = periodCalc.calculateYearlyData(S, BA, BF, INOUT).reverse();
      dailyData = periodCalc.calculateDailyData(S, BA, BF, INOUT).reverse();
    }

    return {
      status: "success",
      summary: summary,
      chartDates: S,
      chartBalances: BA,
      chartMdd: BF,
      monthlyData: monthlyData,
      yearlyData: yearlyData,
      dailyData: dailyData,
      isSynced: true
    };
  }

  root.RebalanceSimulator = {
    simulateRebalancedPortfolio: simulateRebalancedPortfolio
  };
  if (typeof window !== 'undefined') {
    window.RebalanceSimulator = root.RebalanceSimulator;
  }
})(typeof window !== 'undefined' ? window : this);
