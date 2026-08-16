// engine/engine.js — 핵심 백테스트/통치기/주문표 로직 (변경 금지)
// 투자법 파라미터(MASTER_STRATEGIES)는 engine/strategies.js로 분리됨.
// index.html에서 strategies.js를 이 파일보다 먼저 로드하므로 MASTER_STRATEGIES는 전역으로 사용 가능.

// 퉁치기 주문표 정렬 및 병합 로직 (run_tungchigi_master)
function run_tungchigi_master(paramsArr) {
  if (!paramsArr || paramsArr.length === 0) return [];
  const MAX_ORDERS = 500;

  let g = new Float64Array(MAX_ORDERS), h = new Float64Array(MAX_ORDERS);
  let i_p = new Float64Array(MAX_ORDERS), j = new Float64Array(MAX_ORDERS);
  let k = new Array(MAX_ORDERS).fill(false);

  for (let idx = 0; idx < paramsArr.length; idx++) {
    if (idx >= MAX_ORDERS) break;
    let side = paramsArr[idx][0];
    let method = String(paramsArr[idx][1] || "").trim();
    let price = parseFloat(paramsArr[idx][2]);
    let qty = parseFloat(paramsArr[idx][3]);

    if (side === '매수') {
      g[idx] = price; h[idx] = qty;
    } else {
      i_p[idx] = price; j[idx] = qty;
      if (method.toUpperCase() === 'MOC') k[idx] = true;
    }
  }

  let u_g = Array.from(new Set(Array.from(g).filter(v => v > 0)));
  let adj_sell = Array.from(i_p).map((val, i) => k[i] ? 0.01 : val);
  let u_i = Array.from(new Set(adj_sell.filter(v => v > 0)));

  let m_prices = [...u_g, ...u_i].sort((a, b) => b - a);
  let m_col = new Array(MAX_ORDERS).fill(NaN);
  m_prices.forEach((val, i) => m_col[i] = val);

  let n_col = new Float64Array(MAX_ORDERS), o_col = new Float64Array(MAX_ORDERS);
  for (let idx = 0; idx < MAX_ORDERS; idx++) {
    if (isNaN(m_col[idx])) continue;
    let mv = m_col[idx];
    let count_m = m_col.slice(0, idx + 1).filter(v => v === mv).length;
    
    if (count_m > 1) {
      n_col[idx] = 0;
    } else {
      let sum_h = 0;
      for (let x = 0; x < MAX_ORDERS; x++) if (g[x] === mv) sum_h += h[x];
      n_col[idx] = sum_h;
    }

    if (n_col[idx] > 0) {
      o_col[idx] = 0;
    } else if (mv === 0.01) {
      let sum_j = 0;
      for (let x = 0; x < MAX_ORDERS; x++) if (k[x]) sum_j += j[x];
      o_col[idx] = -sum_j;
    } else {
      let sum_j = 0;
      for (let x = 0; x < MAX_ORDERS; x++) if (!k[x] && i_p[x] === mv) sum_j += j[x];
      o_col[idx] = -sum_j;
    }
  }

  let p_col = new Float64Array(MAX_ORDERS), cumsum_n = 0;
  for (let idx = 0; idx < MAX_ORDERS - 1; idx++) {
    cumsum_n += n_col[idx];
    p_col[idx + 1] = cumsum_n;
  }

  let q_col = new Float64Array(MAX_ORDERS), cumsum_o = 0;
  for (let idx = MAX_ORDERS - 2; idx >= 0; idx--) {
    cumsum_o += o_col[idx];
    q_col[idx] = cumsum_o;
  }

  let r_col = new Float64Array(MAX_ORDERS);
  for (let idx = 0; idx < MAX_ORDERS; idx++) r_col[idx] = p_col[idx] + q_col[idx];

  let s_col = new Float64Array(MAX_ORDERS);
  for (let idx = 0; idx < MAX_ORDERS; idx++) {
    let curr = r_col[idx], prev = idx > 0 ? r_col[idx - 1] : 0, nxt = idx < MAX_ORDERS - 1 ? r_col[idx + 1] : 0;
    if (curr === 0) s_col[idx] = 0;
    else if (curr < 0) s_col[idx] = (nxt < 0) ? (curr - nxt) : curr;
    else s_col[idx] = (prev < 0) ? curr : (curr - prev);
  }

  let y_raw = [], z_raw = [];
  for (let idx = 0; idx < MAX_ORDERS - 1; idx++) {
    let mv = m_col[idx]; if (isNaN(mv)) continue;
    y_raw.push(o_col[idx] < 0 ? mv - 0.01 : mv);
    z_raw.push(n_col[idx] > 0 ? mv + 0.01 : mv);
  }

  let y_sorted = y_raw.sort((a, b) => b - a), z_sorted = z_raw.sort((a, b) => b - a);
  let y_final = new Array(MAX_ORDERS).fill(NaN), z_final = new Array(MAX_ORDERS).fill(NaN);
  for (let i = 0; i < z_sorted.length; i++) z_final[i] = z_sorted[i];
  for (let i = 0; i < y_sorted.length; i++) if (i + 1 < MAX_ORDERS) y_final[i + 1] = y_sorted[i];

  let grouped = {};
  for (let idx = 0; idx < MAX_ORDERS; idx++) {
    let s = s_col[idx]; if (s === 0) continue;
    let side = s > 0 ? "매수" : "매도", price = s > 0 ? y_final[idx] : z_final[idx];
    if (isNaN(price) || price <= 0) continue;
    
    let method = (Math.abs(price - 0.01) < 0.0001 && side === "매도") ? "MOC" : "LOC";
    let key = side + "|" + method + "|" + price.toFixed(4);
    
    if (!grouped[key]) grouped[key] = { side: side, method: method, price: price, qty: Math.abs(s) };
    else grouped[key].qty += Math.abs(s);
  }

  const sortOrder = localStorage.getItem(`vtotal3_sort_order_${window.myUserId || ""}`) || "asc";
  const mult = sortOrder === "desc" ? -1 : 1;
  return Object.values(grouped).sort((a, b) => (a.price - b.price) * mult).map(r => {
    if (r.method === "MOC") {
      return ["매도", "MOC", "", r.qty]; 
    } else {
      return [r.side, r.method, r.price, r.qty];
    }
  });
}

// 주간 WRSI 및 WFRI 계산 (calculateWRSI_WFRI)
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

// ---------------------------------------------------------
// [메인 백테스트 연산 프로세스] - 순수 동기식 계산 연산부
// ---------------------------------------------------------
function runBacktestMemory(params, priceData, slotNum = null, overrideSnap = null) {
  try {
    let ticker = params.basics.ticker.toString().trim();
    let startDate = new Date(params.basics.startDate);
    let endDateInput = params.basics.endDate;
    let endDate = (endDateInput && endDateInput.trim() !== "") ? new Date(endDateInput) : new Date();
    endDate.setHours(23, 59, 59, 999);

    function n(val, def) { return (val === "" || isNaN(val)) ? def : parseFloat(val); }
    function p(val) { const num = parseFloat(val); return isNaN(num) ? 0.0 : (num / 100.0); }

    const realTimePrincipal = n(params.basics.initialCash, 10000);
    const realTimeRenew = n(params.basics.renewCash, realTimePrincipal);

    let initialCash = fixFloat(realTimePrincipal);
    let basePrincipal = fixFloat(realTimeRenew);

    let curStrat = params.basics.strategy || '2M3D1-1P';
    if (curStrat === 'RSI 3M') curStrat = '3M3D1-R';
    if (!MASTER_STRATEGIES[curStrat]) curStrat = '2M3D1-1P';
    let M_STRAT = MASTER_STRATEGIES[curStrat];
    let cfg = M_STRAT.config;
    let MODES = M_STRAT.modes;

    let compR = cfg.compR, lossR = cfg.lossR;
    let fBuy = p(params.basics.fBase);
    let fSellT = p(params.basics.fBase) + p(params.basics.fSec);
    let tierAssign = cfg.tierMethod, dLimit = cfg.dLimit, cDn3 = cfg.cDn3, cDn2 = cfg.cDn2, cDn1 = cfg.cDn1;
    let useMid1 = cfg.useMid1, useMid2 = cfg.useMid2, useMid3 = cfg.useMid3;
    let rsi_up = cfg.rsi_up !== undefined ? cfg.rsi_up : 65.2;
    let rsi_dn = cfg.rsi_dn !== undefined ? cfg.rsi_dn : 45.6;
    let isRsiStrat = cfg.rsi_up !== undefined || (curStrat.startsWith('3M3D1-R') || curStrat.startsWith('3M3D3-R'));

    // 주입받은 priceData에서 티커와 QQQ 가격 데이터 로딩
    let mainDataAll = priceData[ticker];
    let qqqData = priceData["QQQ"];

    if (!mainDataAll || !qqqData || mainDataAll.close.length === 0) {
      throw new Error(`${ticker} 또는 QQQ 구글 시트 주가 데이터가 없습니다.`);
    }

    window.globalMainData = mainDataAll;
    if (slotNum) {
      if (!window.globalMainDataSlot) window.globalMainDataSlot = {};
      window.globalMainDataSlot[slotNum] = mainDataAll;
    }

    let startIndex = mainDataAll.dates.findIndex(d => {
      const dTs = (d instanceof Date) ? d.getTime() : new Date(d).getTime();
      return dTs >= startDate.getTime();
    });
    if (startIndex === -1) startIndex = mainDataAll.dates.length;

    let firstPrevClose = (startIndex > 0) ? mainDataAll.close[startIndex - 1] : mainDataAll.open[0];
    let wRsiMap = calculateWRSI_WFRI(qqqData);

    let cash = initialCash, prev_total = initialCash, peak = initialCash, base = basePrincipal, inv = [];
    let cumulativeInOut = 0;
    let cumulativeRealizedProfit = 0;
    let trackingRealPrincipal = initialCash;
    let res = { S: [], BA: [], BF: [], AV: [], INOUT: [], dailyStates: [], trades: [] };

    let activeSlot = slotNum || activeSettingsTab;
    let bDates = mainDataAll.dates.filter(d => {
      const dTs = (d instanceof Date) ? d.getTime() : new Date(d).getTime();
      return dTs <= endDate.getTime() && dTs >= startDate.getTime();
    });
    const snapKey = `vtotal3_snap${activeSlot}_` + myUserId;
    const snapStr = localStorage.getItem(snapKey);
    let startLoopIdx = 0;
    let maxBuyDate = "";

    let snapToUse = null;
    if (overrideSnap) {
      snapToUse = overrideSnap;
    } else if (!isManualBacktestMode && snapStr) {
      try { snapToUse = JSON.parse(snapStr); } catch (e) { }
    }

    if (snapToUse) {
      let snap = snapToUse;
      if (snap.currentStrat === curStrat && snap.chartDates && snap.chartDates.length > 0) {
        res.S = snap.chartDates.slice();
        res.BA = snap.chartBalances.slice();
        res.BF = snap.chartMdd.slice();
        res.INOUT = (snap.chartInout || []).slice();
        res.trades = snap.trades || [];

        inv = snap.inv || [];
        inv.forEach(h => { if (h.buyDate > maxBuyDate) maxBuyDate = h.buyDate; });
        let lastSnapDateStr = res.S[res.S.length - 1];
        if (lastSnapDateStr > maxBuyDate) maxBuyDate = lastSnapDateStr;

        cash = fixFloat(snap.summary.cash);
        peak = snap.summary.peak || (res.BA.length > 0 ? Math.max(...res.BA) : initialCash);
        cumulativeRealizedProfit = snap.summary.realizedProfit || 0;

        let oldBase = fixFloat(snap.summary.base || initialCash);
        trackingRealPrincipal = snap.summary.realPrincipal || initialCash;
        cumulativeInOut = fixFloat(snap.summary.inout || 0);

        base = oldBase;

        lastSnapDateStr = res.S[res.S.length - 1];
        startLoopIdx = bDates.findIndex(d => formatDateNY(d) > lastSnapDateStr);
        if (startLoopIdx === -1) startLoopIdx = bDates.length;
      }
    }

    let full_c = mainDataAll.close, rsi_m = 'SF';
    function t2(v) { return (v === null || v === undefined || isNaN(v)) ? 0.0 : Math.trunc((v + 0.00001) * 100) / 100.0; }
    function t2_pl(v) { let sign_v = (v > 0 ? 1 : (v < 0 ? -1 : 0)); return (v === null || v === undefined || isNaN(v)) ? 0.0 : Math.trunc((v + sign_v * 0.00001) * 100) / 100.0; }
    function c2(v) { return (v === null || v === undefined || isNaN(v)) ? 0.0 : Math.ceil((v * 100) - 0.00001) / 100.0; }
    function truncPct5(v) { return v; }

    for (let wI = 0; wI < (startIndex + startLoopIdx); wI++) {
      let dtStrObj = mainDataAll.dates[wI];
      if (!dtStrObj) continue;
      let dtStr = formatDateNY(dtStrObj);
      let rv = wRsiMap[dtStr] ? wRsiMap[dtStr].dR : 50, rrv = wRsiMap[dtStr] ? wRsiMap[dtStr].dRR : 50;
      if (rv !== 0) {
        if (isRsiStrat) {
          if (rv >= rsi_up) rsi_m = 'AG';
          else if (rv <= rsi_dn) rsi_m = 'SF';
          else rsi_m = 'DEF';
        } else {
          if (rrv <= 35 && rrv < rv) rsi_m = 'AG';
          else if (rrv >= 40 && rrv < 50 && rrv > rv) rsi_m = 'SF';
          else if (rrv <= 50 && rv > 50) rsi_m = 'AG';
          else if (rrv >= 50 && rv < 50) rsi_m = 'SF';
          else if (rrv >= 50 && rrv < 60 && rrv < rv) rsi_m = 'AG';
          else if (rrv > 65 && rrv > rv) rsi_m = 'SF';
        }
      }
    }

    for (let i = startLoopIdx; i < bDates.length; i++) {
      let idx = startIndex + i, close = full_c[idx], dtStr = formatDateNY(bDates[i]), prev = (idx === 0) ? firstPrevClose : full_c[idx - 1];
      if (res.S.includes(dtStr)) continue;

      let current_daily_profits = 0;
      let daily_trades_temp = [];

      let rv = wRsiMap[dtStr] ? wRsiMap[dtStr].dR : 50, rrv = wRsiMap[dtStr] ? wRsiMap[dtStr].dRR : 50;
      if (rv !== 0) {
        if (isRsiStrat) {
          if (rv >= rsi_up) rsi_m = 'AG';
          else if (rv <= rsi_dn) rsi_m = 'SF';
          else rsi_m = 'DEF';
        } else {
          if (rrv <= 35 && rrv < rv) rsi_m = 'AG';
          else if (rrv >= 40 && rrv < 50 && rrv > rv) rsi_m = 'SF';
          else if (rrv <= 50 && rv > 50) rsi_m = 'AG';
          else if (rrv >= 50 && rv < 50) rsi_m = 'SF';
          else if (rrv >= 50 && rrv < 60 && rrv < rv) rsi_m = 'AG';
          else if (rrv > 65 && rrv > rv) rsi_m = 'SF';
        }
      }

      let is3Drop = (idx >= 4) && (truncPct5((full_c[idx - 3] - full_c[idx - 4]) / full_c[idx - 4]) <= cDn3) && (truncPct5((full_c[idx - 2] - full_c[idx - 3]) / full_c[idx - 3]) <= cDn2) && (truncPct5((full_c[idx - 1] - full_c[idx - 2]) / full_c[idx - 2]) <= cDn1);
      let isPlunge = (truncPct5((full_c[idx - 1] - full_c[idx - 2]) / full_c[idx - 2]) <= dLimit);
      let applied_m = null;
      if (is3Drop) {
        if (rsi_m === 'SF' && useMid1) applied_m = 'Middle';
        else if (rsi_m === 'AG' && useMid3) applied_m = 'Middle3';
        else if (rsi_m === 'DEF' && isRsiStrat) {
          applied_m = (useMid1 || useMid2 || useMid3) ? ((!useMid2 && curStrat !== '3M3D1-R') ? 'Middle2' : 'Middle') : null;
        }
      }
      if (!applied_m && isPlunge && useMid2) {
        applied_m = 'Middle2';
      }
      let curr_m = applied_m || rsi_m;

      let t = inv.length + 1;
      if (tierAssign === '최소(빈자리)' || tierAssign === '최소') {
        let used = inv.map(p => p.tier); t = 1; while (used.indexOf(t) !== -1) t++;
      }

      let b_qty = 0, b_tgt = 0, seed = 0.0;
      if (MODES[curr_m] && t <= MODES[curr_m].weight.length) {
        let w_val = MODES[curr_m].weight[t - 1];
        seed = t2(Math.min(base * w_val, cash));
        b_tgt = t2(prev * (1 + MODES[curr_m].buy[t - 1]));
        if (b_tgt > 0 && close <= b_tgt) b_qty = Math.floor(seed / (b_tgt * (1 + fBuy)) + 0.0001);
      }

      let d_sell_net = 0.0, d_buy_cost = 0.0, d_cf = 0.0, d_pl = 0.0, n_inv = [];
      for (let p_idx = 0; p_idx < inv.length; p_idx++) {
        let p_inv = inv[p_idx]; p_inv.days++;
        let p_mode = MODES[p_inv.mode]; if (!p_mode) continue;
        let tIdx = Math.min(p_inv.tier - 1, p_mode.sell.length - 1);
        let sellRate = p_mode.sell[tIdx] || 0;
        let s_tgt = c2(p_inv.buy_price * (1 + sellRate));
        let hIdx = Math.min(p_inv.tier - 1, p_mode.hold.length - 1);
        let h_limit = p_mode.hold[hIdx] || 1;

        if (close >= s_tgt || p_inv.days >= h_limit) {
          let net = (p_inv.qty * close) * (1 - fSellT);
          let trade_pl = net - p_inv.cost;
          d_pl += trade_pl; d_cf += net;
          d_sell_net += net; d_buy_cost += p_inv.cost;

          current_daily_profits += trade_pl;
          daily_trades_temp.push({
            buyDate: p_inv.buyDate,
            sellDate: dtStr,
            mode: p_inv.mode,
            tier: p_inv.tier,
            buyPrice: p_inv.buy_price,
            sellPrice: close,
            qty: p_inv.qty,
            profit: fixFloat(trade_pl)
          });
        } else n_inv.push(p_inv);
      }
      inv = n_inv;
      if (b_qty > 0) {
        let totalBC = (b_qty * close) * (1 + fBuy);
        if (totalBC <= cash) {
          d_cf -= totalBC;
          inv.push({ buy_price: close, qty: b_qty, cost: fixFloat(totalBC), mode: curr_m, tier: t, days: 0, buyDate: dtStr });
        }
      }

      cash = t2(cash + d_cf);
      let pl_f = t2_pl(d_pl);

      if (pl_f > 0) {
        base += pl_f * compR;
      } else if (pl_f < 0) {
        base += pl_f * lossR;
      }
      base = t2(base);

      cumulativeRealizedProfit += pl_f;

      let evalVal = t2(inv.reduce((s, p_i) => s + p_i.qty, 0) * close);
      let totalBalance = t2(cash + evalVal); prev_total = totalBalance; if (totalBalance > peak) peak = totalBalance;
      let currentMdd = peak > 0 ? truncPct5((totalBalance - peak) / peak) : 0;

      res.dailyStates.push({
        date: dtStr,
        asset: totalBalance,
        inout: cumulativeInOut,
        json: JSON.stringify({
          cash: fixFloat(cash),
          base_principal: fixFloat(base),
          realPrincipal: fixFloat(trackingRealPrincipal),
          holdings: inv.map(p => ({
            buy_price: fixFloat(p.buy_price),
            qty: fixFloat(p.qty),
            cost: fixFloat(p.cost),
            mode: p.mode,
            tier: p.tier,
            days: p.days,
            buyDate: p.buyDate
          }))
        })
      });

      res.S.push(dtStr); res.BF.push(currentMdd); res.BA.push(totalBalance); res.AV.push(pl_f); res.INOUT.push(cumulativeInOut);

      if (daily_trades_temp.length > 0) {
        daily_trades_temp.forEach(t => {
          t.dailyProfitSum = current_daily_profits;
          t.totalBalance = totalBalance;
          t.renewCash = base;
          res.trades.push(t);
        });
      }
    }

    if (res.S.length === 0) {
      peak = Math.max(peak, initialCash);
      prev_total = initialCash;
    }

    let rawOrderOutput = [], orderDateStr = "날짜 확인 불가";
    let nextOrderInfo = { tier: "-", mode: "-", weight: "-", qty: "-" };

    let tIdx = full_c.length;
    if (tIdx > 0) {
      const lastDateDaily = mainDataAll.dates[tIdx - 1];
      const lastDateNYStr = formatDateNY(lastDateDaily);
      const lp = lastDateNYStr.split('-');
      const lastDateNY = new Date(parseInt(lp[0]), parseInt(lp[1]) - 1, parseInt(lp[2]), 20);
      const dayOfWeekNY = lastDateNY.getDay();
      const lastFriTS = getFridayEnd(lastDateDaily);

      lastDateNY.setDate(lastDateNY.getDate() + (dayOfWeekNY === 5 ? 3 : 1));
      while (true) {
        const dateStr = formatDateNY(lastDateNY);
        const dow = lastDateNY.getDay();
        if (dow === 0 || dow === 6 || isUSMarketHoliday(dateStr)) {
          lastDateNY.setDate(lastDateNY.getDate() + 1);
        } else { break; }
      }
      const nextFriTS = getFridayEnd(lastDateNY);
      orderDateStr = (lastDateNY.getMonth() + 1) + "/" + lastDateNY.getDate();

      let today_m = rsi_m;

      if (nextFriTS !== lastFriTS) {
        const lastBarInfo = wRsiMap[lastDateNYStr];
        if (lastBarInfo) {
          const rv = lastBarInfo.dCurrent;
          const rrv = lastBarInfo.dR;
          if (rv !== 0) {
            if (isRsiStrat) {
              if (rv >= rsi_up) today_m = 'AG';
              else if (rv <= rsi_dn) today_m = 'SF';
              else today_m = 'DEF';
            } else {
              if (rrv <= 35 && rrv < rv) today_m = 'AG';
              else if (rrv >= 40 && rrv < 50 && rrv > rv) today_m = 'SF';
              else if (rrv <= 50 && rv > 50) today_m = 'AG';
              else if (rrv >= 50 && rv < 50) today_m = 'SF';
              else if (rrv >= 50 && rrv < 60 && rrv < rv) today_m = 'AG';
              else if (rrv > 65 && rrv > rv) today_m = 'SF';
            }
          }
        }
      }

      let lastDataClose = full_c[tIdx - 1];
      let tp1_h = truncPct5((full_c[tIdx - 1] - (full_c[tIdx - 2] || full_c[tIdx - 1])) / (full_c[tIdx - 2] || full_c[tIdx - 1]));
      let tp2_h = truncPct5(((full_c[tIdx - 2] || full_c[tIdx - 1]) - (full_c[tIdx - 3] || full_c[tIdx - 2])) / (full_c[tIdx - 3] || full_c[tIdx - 2]));
      let tp3_h = truncPct5(((full_c[tIdx - 3] || full_c[tIdx - 2]) - (full_c[tIdx - 4] || full_c[tIdx - 3])) / (full_c[tIdx - 4] || full_c[tIdx - 3]));

      if (tIdx >= 5) {
        let is3Drop_t = (tp1_h <= cDn1 && tp2_h <= cDn2 && tp3_h <= cDn3);
        let isPlunge_t = (tp1_h <= dLimit);
        let applied_m_t = null;
        if (is3Drop_t) {
          if (today_m === 'SF' && useMid1) applied_m_t = 'Middle';
          else if (today_m === 'AG' && useMid3) applied_m_t = 'Middle3';
          else if (today_m === 'DEF' && isRsiStrat) {
            applied_m_t = (useMid1 || useMid2 || useMid3) ? ((!useMid2 && curStrat !== '3M3D1-R') ? 'Middle2' : 'Middle') : null;
          }
        }
        if (!applied_m_t && isPlunge_t && useMid2) {
          applied_m_t = 'Middle2';
        }
        if (applied_m_t) today_m = applied_m_t;
      }

      let tTier = inv.length + 1; if (tierAssign === '최소(빈자리)' || tierAssign === '최소') { let used = inv.map(p_i => p_i.tier); tTier = 1; while (used.indexOf(tTier) !== -1) tTier++; }
      let currentW = MODES[today_m].weight[tTier - 1] || 0;
      let tSeed = t2(Math.min(base * currentW, cash));
      let bTgtVal = MODES[today_m].buy[tTier - 1] || 0;
      let tTgt = t2(lastDataClose * (1 + bTgtVal));
      let todayBuyQty = (tTgt > 0 && currentW > 0) ? Math.floor((tSeed / (tTgt * (1 + fBuy))) + 0.0001) : 0;

      if (todayBuyQty > 0) {
        rawOrderOutput.push(["매수", "LOC", tTgt, todayBuyQty]);
      }

      inv.forEach(p_i => {
        let p_mode = MODES[p_i.mode] || MODES['SF'];
        let sellRate = p_mode.sell[p_i.tier - 1] || p_mode.sell[0] || 0;
        let s_tgt = c2(p_i.buy_price * (1 + sellRate));
        let hIdx = Math.min(p_i.tier - 1, p_mode.hold.length - 1);
        let h_limit = p_mode.hold[hIdx] || 1;

        if (p_i.days !== undefined && p_i.days >= h_limit - 1) {
          rawOrderOutput.push(["매도", "MOC", "", p_i.qty]);
        } else {
          rawOrderOutput.push(["매도", "LOC", s_tgt, p_i.qty]);
        }
      });

      nextOrderInfo = { tier: tTier, mode: today_m, weight: (currentW * 100).toFixed(1), qty: todayBuyQty };
    }

    let lastIdx = res.BA.length - 1, tAssets = lastIdx >= 0 ? res.BA[lastIdx] : initialCash;
    let totalRealizedProfit = fixFloat(cumulativeRealizedProfit);
    let tQty = inv.reduce((s, p) => s + p.qty, 0), avgPrice = tQty > 0 ? fixFloat(inv.reduce((s, p) => s + p.cost, 0) / tQty) : 0;
    let lastCloseIdx = (startIndex >= 0 && bDates.length > 0) ? (startIndex + bDates.length - 1) : (full_c.length - 1);
    let currPrice = (lastCloseIdx >= 0 && lastCloseIdx < full_c.length) ? full_c[lastCloseIdx] : (full_c[full_c.length - 1] || 0);
    let evalVal = fixFloat(inv.reduce((s, p_i) => s + (p_i.qty * currPrice), 0));
    let realPrincipal = fixFloat(trackingRealPrincipal);
    let totalProfit = fixFloat(tAssets - realPrincipal);

    if (totalProfit === 0 && base !== tAssets) {
      totalProfit = fixFloat(tAssets - base);
    }

    let yrs = (endDate - startDate) / (1000 * 60 * 60 * 24 * 365.25);
    let cagr = yrs > 0 ? (Math.pow((tAssets / realPrincipal), (1 / yrs)) - 1) : 0;
    let oMdd = res.BF.length > 0 ? Math.min(...res.BF) : 0;

    let summary = {
      totalAssets: tAssets,
      yield: (realPrincipal > 0) ? (tAssets - realPrincipal) / realPrincipal : 0,
      cagr: cagr,
      mdd: oMdd, calmar: oMdd !== 0 ? Math.abs(cagr / oMdd) : 0,
      totalProfit: totalProfit,
      realizedProfit: fixFloat(tAssets - base),
      qty: tQty, avgPrice: avgPrice, evalReturn: tQty > 0 ? (currPrice - avgPrice) / avgPrice : 0,
      evalVal: evalVal, cash: cash, depletion: tAssets > 0 ? (evalVal / tAssets) : 0,
      currPrice: currPrice, currentMdd: lastIdx >= 0 ? res.BF[lastIdx] : 0,
      base: base, inout: cumulativeInOut, realPrincipal: realPrincipal, peak: peak
    };

    let finalOrders = run_tungchigi_master(rawOrderOutput);

    return {
      status: "success",
      inv: inv,
      trades: res.trades,
      orders: finalOrders,
      rawOrders: rawOrderOutput,
      orderDateStr: orderDateStr,
      summary: summary,
      chartDates: res.S,
      chartBalances: res.BA,
      chartMdd: res.BF,
      monthlyData: calculateMonthlyData(res.S, res.BA, res.BF, res.INOUT),
      yearlyData: calculateYearlyData(res.S, res.BA, res.BF, res.INOUT),
      dailyData: calculateDailyData(res.S, res.BA, res.BF, res.INOUT),
      currentStrat: curStrat,
      nextOrderInfo: nextOrderInfo,
      dailyStates: res.dailyStates,
      chartInout: res.INOUT,
      isSynced: false
    };
  } catch (e) {
    console.error("runBacktestMemory error:", e);
    return { status: "error", message: e.toString() };
  }
}

function normalizePriceSeries(series, ticker) {
  const map = new Map();
  if (series && series.dates && Array.isArray(series.dates)) {
    for (let i = 0; i < series.dates.length; i++) {
      const key = normalizeDateKey(series.dates[i]);
      if (!key || series.close[i] === null || series.close[i] === undefined) continue;
      map.set(key, {
        date: dateFromKey(key),
        close: series.close[i],
        open: series.open ? series.open[i] : series.close[i]
      });
    }
  }

  const keys = Array.from(map.keys()).sort();
  return {
    ticker: ticker || (series && series.ticker) || "",
    dates: keys.map(k => map.get(k).date),
    close: keys.map(k => map.get(k).close),
    open: keys.map(k => map.get(k).open)
  };
}

function processRealLogData(d, currentStrat, userInitialCash) {
  if (!d || !d.logs || d.logs.length === 0) return null;
  const logs = d.logs; const meta = d.meta;
  let restoredInv = []; let restoredBase = 0; let realizedProfit = fixFloat(meta.realizedProfit) || 0; let cash = fixFloat(meta.currentCash) || 0; let serverQty = fixFloat(meta.qty) || 0; let serverAvg = fixFloat(meta.avgPrice) || 0;
  let restoredRealPrincipal = 0;
  if (d.json && d.json.trim() !== "") { try { const parsed = JSON.parse(d.json);         if (parsed.holdings) {
          restoredInv = parsed.holdings.map(h => {
            const rawBp = h.buy_price !== undefined ? h.buy_price : (h.buyPrice || 0);
            const cleanBp = typeof rawBp === 'number' ? rawBp : parseFloat(String(rawBp).replace(/[^0-9.-]/g, "")) || 0;
            const rawCost = h.cost !== undefined ? h.cost : 0;
            const cleanCost = typeof rawCost === 'number' ? rawCost : parseFloat(String(rawCost).replace(/[^0-9.-]/g, "")) || 0;
            return { ...h, buy_price: fixFloat(cleanBp), cost: fixFloat(cleanCost) };
          });
        } if (parsed.base_principal !== undefined) { restoredBase = fixFloat(parsed.base_principal); } else if (parsed.base !== undefined) { restoredBase = fixFloat(parsed.base); } if (parsed.realizedProfit !== undefined) realizedProfit = fixFloat(parsed.realizedProfit); if (parsed.cash !== undefined) cash = fixFloat(parsed.cash); if (parsed.realPrincipal !== undefined) restoredRealPrincipal = fixFloat(parsed.realPrincipal); } catch (e) { console.error("JSON 파싱 오류", e); } }
  let qty = 0, totalCost = 0; restoredInv.forEach(item => { const itemQty = fixFloat(item.qty) || 0; const itemCost = fixFloat(item.cost) || (fixFloat(item.buy_price) * itemQty); qty += itemQty; totalCost += itemCost; }); let avgPrice = qty > 0 ? fixFloat(totalCost / qty) : 0;
  const parseAndFormatYYMMDD = (ds) => {
    if (!ds) return null;
    let str = String(ds).trim();
    str = str.replace(/[^0-9.\-\/]/g, '');
    str = str.replace(/[.\/]/g, '-');
    let p = str.split('-');
    if (p.length === 1 && str.length >= 6) { let y = str.slice(0, 4); let m = str.slice(4, 6); let d = str.slice(6, 8) || "01"; return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`; }
    if (p.length >= 3) { let y = p[0]; if (y.length === 2) y = "20" + y; let m = p[1].padStart(2, '0'); let d = p[2].padStart(2, '0'); return `${y}-${m}-${d}`; }
    else if (p.length === 2) { let y = p[0]; if (y.length === 2) y = "20" + y; let m = p[1].padStart(2, '0'); return `${y}-${m}-01`; }
    return str;
  };
  let rawLogs = []; for (let i = 0; i < logs.length; i++) { let r = logs[i]; let dateStr = r[0]; let asset = fixFloat(String(r[1]).replace(/[^0-9.-]+/g, "")) || 0; if (dateStr && asset > 0) { let exactDate = parseAndFormatYYMMDD(dateStr); let inoutValue = fixFloat(String(r[2]).replace(/[^0-9.-]+/g, "")) || 0; rawLogs.push({ date: exactDate, asset: asset, inout: inoutValue, raw: r }); } }

  if (rawLogs.length === 0) {
    const calculatedPrincipal = fixFloat(userInitialCash);
    return {
      summary: { realPrincipal: calculatedPrincipal, totalAssets: userInitialCash, cash: userInitialCash, inout: 0, base: userInitialCash },
      status: "success",
      chartDates: [],
      chartBalances: [],
      chartMdd: [],
      isSynced: true
    };
  }
  rawLogs.sort((a, b) => (a.date > b.date ? 1 : -1));

  const originalFirstDate = rawLogs[0].date;
  const trueStartDateStr = originalFirstDate;

  let totalInoutSum = 0;
  for (let i = 1; i < rawLogs.length; i++) {
    totalInoutSum += (rawLogs[i].inout || 0);
  }

  const sheetStartingAsset = rawLogs.length > 0 ? rawLogs[0].asset : userInitialCash;
  const calculatedPrincipal = fixFloat(sheetStartingAsset + totalInoutSum);

  let chartDates = [], chartBalances = [], chartMdd = [], chartInout = [];
  let peak = -Infinity; let runningInout = 0;

  rawLogs.forEach(r => {
    chartDates.push(r.date);
    chartBalances.push(r.asset);
    runningInout = fixFloat(runningInout + r.inout);
    chartInout.push(runningInout);
    if (r.asset > peak) peak = r.asset;
    chartMdd.push(peak > 0 ? (r.asset - peak) / peak : 0);
  });

  let chartDatesFull = [...chartDates], chartBalancesFull = [...chartBalances], chartInoutFull = [...chartInout], chartMddFull = [...chartMdd];

  const lastAsset = chartBalances[chartBalances.length - 1] || 0;
  const minMdd = chartMdd.length > 0 ? Math.min(...chartMdd) : 0;

  const principalFromState = restoredRealPrincipal > 0 ? restoredRealPrincipal : (restoredBase > 0 ? restoredBase : calculatedPrincipal);
  const finalPrincipal = restoredBase > 0 ? restoredBase : calculatedPrincipal;
  const totalProfit = fixFloat(lastAsset - principalFromState);
  const simpleYield = principalFromState > 0 ? totalProfit / principalFromState : 0;
  const evalVal = fixFloat(lastAsset - cash); const depletion = lastAsset > 0 ? (evalVal / lastAsset) : 0; const investPrincipal = fixFloat(qty * avgPrice); const evalReturn = investPrincipal > 0 ? (evalVal - investPrincipal) / investPrincipal : 0; const currPrice = parseFloat(meta.tickerPrice) || 0;

  let cagr = 0;
  const effectivePrincipal = principalFromState;

  if (chartDates.length > 0 && effectivePrincipal > 0 && lastAsset > 0) {
    const toDateObj = (str) => {
      let p = str.split('-');
      let year = parseInt(p[0], 10);
      if (year < 100) year += 2000;
      return new Date(year, parseInt(p[1], 10) - 1, parseInt(p[2], 10));
    };

    const sDateForCagr = toDateObj(trueStartDateStr);
    const eDateForCagr = toDateObj(chartDates[chartDates.length - 1]);

    let diffDays = Math.max(1, Math.round((eDateForCagr - sDateForCagr) / (1000 * 60 * 60 * 24)));

    const effProfit = fixFloat(lastAsset - effectivePrincipal);
    const effYield = effectivePrincipal > 0 ? effProfit / effectivePrincipal : 0;

    let calcValue = Math.pow(1 + effYield, 365 / diffDays) - 1;
    cagr = (isFinite(calcValue) && !isNaN(calcValue)) ? calcValue : effYield;
  }
  const calcPeriod = (type) => {
    if (chartDatesFull.length === 0) return [];
    let periods = {};
    for (let i = 0; i < chartDatesFull.length; i++) {
      let parts = chartDatesFull[i].split('-');
      let periodKey = type === 'month' ? `${parts[0]}-${parts[1]}` : (type === 'year' ? parts[0] : chartDatesFull[i]);
      if (!periods[periodKey]) { periods[periodKey] = { startIdx: i, endIdx: i, indices: [] }; }
      periods[periodKey].endIdx = i; periods[periodKey].indices.push(i);
    }
    let result = []; let pKeys = Object.keys(periods).sort();
    for (let i = 0; i < pKeys.length; i++) {
      let key = pKeys[i]; let pData = periods[key];
      let startAsset = 0; let startInout = 0;
      if (i === 0) {
        startAsset = chartBalancesFull[0]; startInout = chartInoutFull[0] || 0;
      } else {
        const prevEndIdx = periods[pKeys[i - 1]].endIdx;
        startAsset = chartBalancesFull[prevEndIdx];
        startInout = chartInoutFull[prevEndIdx] || 0;
      }
      let endAsset = chartBalancesFull[pData.endIdx];
      let endInout = chartInoutFull[pData.endIdx] || 0;
      let inoutForPeriod = endInout - startInout;
      let profit = endAsset - startAsset - inoutForPeriod;
      let profitBasis = startAsset + inoutForPeriod;
      let minMddVal = 0;
      for (let idx of pData.indices) { if (chartMddFull[idx] < minMddVal) minMddVal = chartMddFull[idx]; }
      result.push({ period: key, asset: endAsset, rate: profitBasis > 0 ? profit / profitBasis : 0, profit: profit, mdd: minMddVal });
    } return result.reverse();
  };

  let finalEffPrincipal = principalFromState;
  let finalProfit = fixFloat(lastAsset - finalEffPrincipal);
  let finalYield = finalEffPrincipal > 0 ? finalProfit / finalEffPrincipal : 0;

  let summary = {
    totalAssets: lastAsset,
    yield: finalYield,
    cagr: cagr,
    mdd: minMdd,
    calmar: minMdd !== 0 ? Math.abs(cagr / minMdd) : 0,
    totalProfit: finalProfit,
    realizedProfit: realizedProfit,
    qty: serverQty > 0 ? serverQty : qty,
    avgPrice: serverAvg > 0 ? serverAvg : avgPrice,
    evalReturn: evalReturn,
    evalVal: evalVal,
    cash: cash,
    depletion: depletion,
    currPrice: currPrice,
    currentMdd: chartMdd[chartMdd.length - 1],
    base: finalPrincipal,
    inout: totalInoutSum,
    realPrincipal: principalFromState,
    trueStartDate: trueStartDateStr
  };

  let rawOrderOutput = [];
  let targetStrat = currentStrat;
  if (targetStrat === 'RSI 3M') targetStrat = '3M3D1-R';
  let M_STRAT_T = MASTER_STRATEGIES[targetStrat] || MASTER_STRATEGIES["2M3D1-1P"];
  let MODES_T = M_STRAT_T.modes;
  function c2_T(v) { return Math.ceil((v * 100) - 0.0000001) / 100.0; }

  if (restoredInv.length > 0) {
    restoredInv.forEach(p_i => {
      let modeData = MODES_T[p_i.mode] || MODES_T['SF'];
      let sellRate = modeData.sell[p_i.tier - 1] || modeData.sell[0] || 0;
      let s_tgt = c2_T(p_i.buy_price * (1 + sellRate));

      let hIdx = Math.min(p_i.tier - 1, modeData.hold.length - 1);
      let h_limit = modeData.hold[hIdx] || 1;

      if (p_i.days !== undefined && p_i.days >= h_limit - 1) {
          rawOrderOutput.push(["매도", "MOC", "", p_i.qty]);
      } else {
          rawOrderOutput.push(["매도", "LOC", s_tgt, p_i.qty]);
      }
    });
  }

  const sortOrder = localStorage.getItem(`vtotal3_sort_order_${window.myUserId || ""}`) || "asc";
  const mult = sortOrder === "desc" ? -1 : 1;
  const finalOrders = rawOrderOutput.sort((a, b) => ((a[2] === "" ? 0 : a[2]) - (b[2] === "" ? 0 : b[2])) * mult);

  return {
    status: "success",
    S: chartDates,
    BA: chartBalances,
    BF: chartMdd,
    inv: restoredInv,
    orders: finalOrders,
    orderDateStr: chartDates[chartDates.length - 1],
    summary: summary,
    chartDates: chartDates,
    chartBalances: chartBalances,
    chartMdd: chartMdd,
    chartInout: chartInout,
    chartDatesFull: chartDatesFull,
    chartBalancesFull: chartBalancesFull,
    chartInoutFull: chartInoutFull,
    monthlyData: calcPeriod('month'),
    yearlyData: calcPeriod('year'),
    dailyData: calcPeriod('day'),
    currentStrat: currentStrat,
    isSynced: true
  };
}
