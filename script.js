function detectLayout() {
      const g = document.getElementById('mainGrid');
      const txt = document.getElementById('layoutModeText');
      // 수동 모드가 아닐 때만 자동 감지 수행
      if (!g.classList.contains('force-3-col') && !g.classList.contains('force-2-col')) {
        const sw = window.innerWidth;
        if (sw <= 1024) {
          document.documentElement.classList.add('is-cover');
        } else {
          document.documentElement.classList.remove('is-cover');
        }
      }
    }
    window.addEventListener('resize', () => { detectLayout(); if(window.myChart) window.myChart.resize(); });
    window.addEventListener('load', detectLayout);
    const GAS_URL = "https://script.google.com/macros/s/AKfycbw3OXD0thasfEHZWSUp8x06h-Z28YNs5_6L2YrPAeTc6wGPEgDwH33Hccg2CAgGIwjG/exec";
    let myUserId = "";
    let myChart = null;
    let currentOrderDate = "";
    let isOrderView = true;

    let isMonthlyView = true;
    let globalMonthlyData = [];
    let globalYearlyData = [];

    window.onload = function () {
      const isAuth = localStorage.getItem('vtotal_auth');
      const savedId = localStorage.getItem('vtotal_id');
      if (isAuth === 'true' && savedId) { myUserId = savedId; enterAppDirectly(); }
      else { document.getElementById('loginScreen').classList.remove('hidden'); }
      
      setupLongPress();
    };

    async function handleLogin() {
      const id = document.getElementById('loginId').value.trim();
      const pw = document.getElementById('loginPw').value.trim();
      const btn = document.getElementById('loginBtn');
      if (!id || !pw) return alert("아이디와 비밀번호를 입력하세요.");
      btn.innerText = "서버 통신 중..."; btn.disabled = true;
      try {
        const resp = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: "LOGIN_OR_REGISTER", id: id, pw: pw }) });
        const res = await resp.json();
        if (res.result === "success") {
          localStorage.setItem('vtotal_auth', 'true'); localStorage.setItem('vtotal_id', id); myUserId = id;
          enterAppDirectly();
        } else { alert(res.msg); btn.innerText = "로그인"; btn.disabled = false; }
      } catch (e) { alert("서버 연결 실패. 네트워크를 확인하세요."); btn.innerText = "로그인"; btn.disabled = false; }
    }

    function enterAppDirectly() {
      document.getElementById('loginScreen').classList.add('hidden');
      document.getElementById('mainGrid').classList.remove('hidden');
      document.getElementById('userDisplay').innerHTML = `⚪ ${myUserId}`;

      const autoToggle = document.getElementById('autoToggle');
      autoToggle.checked = localStorage.getItem(`vtotal_auto_${myUserId}`) === 'true';
      autoToggle.onchange = function () { localStorage.setItem(`vtotal_auto_${myUserId}`, this.checked); };

      fetch(`${GAS_URL}?action=GET_INIT&id=${myUserId}`).then(res => res.json()).then(async data => {
        if (data.config) {
          initData(data.config);
          document.getElementById('userDisplay').innerHTML = `🟢 ${myUserId}`;

          const resBT = await runBacktestMemory(data.config);
          if (resBT.status !== "error") {
            const hasEndDate = data.config.basics.endDate !== '';
            if (hasEndDate) document.getElementById('mainGrid').classList.add('hide-order-panel');
            else { document.getElementById('mainGrid').classList.remove('hide-order-panel'); renderOrderView(resBT); }

            globalMonthlyData = resBT.monthlyData; globalYearlyData = resBT.yearlyData;
            renderPeriodTable(); renderMetrics(resBT.summary, resBT.chartDates.length); renderChart(resBT);

            if (autoToggle.checked) {
              fetch(GAS_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: "BACKUP_AND_SAVE", id: myUserId, summary: resBT.summary, orders: resBT.orders }) });
            }
          }
        } else { throw new Error("데이터 없음"); }
      }).catch(err => { document.getElementById('userDisplay').innerHTML = `🔴 ${myUserId}`; });
    }

    function confirmLogout() {
      if (confirm("로그아웃 하시겠습니까?")) { localStorage.removeItem('vtotal_auth'); localStorage.removeItem('vtotal_id'); location.reload(); }
    }

    function formatDateNY(dateObj) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(dateObj); }
    function pyRound2(num) { let factor = 100, temp = num * factor, rounded = Math.round(temp); if (Math.abs(temp % 1) === 0.5) rounded = (Math.floor(temp) % 2 === 0) ? Math.floor(temp) : Math.ceil(temp); return rounded / factor; }

    const yahooCache = {};

    async function fetchYahooData(t, p1, p2, rnd) {
      if (!t) throw new Error("티커가 비어있습니다. 설정이 불러와졌는지 확인해주세요.");
      const cacheKey = `${t}_${p1}_${p2}`;
      if (yahooCache[cacheKey]) return yahooCache[cacheKey];

      const yUrl = `${GAS_URL}?action=GET_YAHOO&t=${t}&p1=${p1}&p2=${p2}`;
      try {
        const response = await fetch(yUrl);
        if (!response.ok) throw new Error("네트워크 오류");
        const res = await response.json();
        if (res.error) throw new Error(res.error);
        if (!res.chart || !res.chart.result) throw new Error("야후 데이터 응답 오류");

        const r = res.chart.result[0], ts = r.timestamp, cls = r.indicators.quote[0].close, ops = r.indicators.quote[0].open;
        let d = [], c = [], o = [], lastDay = "";

        for (let i = 0; i < ts.length; i++) {
          if (cls[i] !== null) {
            let dateObj = new Date(ts[i] * 1000); let dayStr = formatDateNY(dateObj);
            let cVal = rnd ? pyRound2(cls[i]) : cls[i];
            let oVal = rnd ? pyRound2(ops[i]) : ops[i];
            if (dayStr !== lastDay) {
              d.push(dateObj); c.push(cVal); o.push(oVal); lastDay = dayStr;
            } else {
              c[c.length - 1] = cVal;
              o[o.length - 1] = oVal;
            }
          }
        }
        const finalData = { dates: d, close: c, open: o };
        
        // 종가 기준 필터링: 미국 시간(NY) 기준으로 오늘 날짜의 데이터가 있고 장 마감(16:00) 전이면 제거
        const todayNY = formatDateNY(new Date());
        const nowNYHour = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }).format(new Date()));
        if (finalData.dates.length > 0) {
          const lastDayNY = formatDateNY(finalData.dates[finalData.dates.length - 1]);
          if (lastDayNY === todayNY && nowNYHour < 16) {
            finalData.dates.pop();
            finalData.close.pop();
            finalData.open.pop();
          }
        }

        yahooCache[cacheKey] = finalData; return finalData;
      } catch (e) { throw new Error("야후 데이터 수집 실패: " + e.message); }
    }

    function calculateWRSI_WFRI(qData) {
      let dD = qData.dates, qC = qData.close, weeklyData = {}, wP = [], wD = [];
      function getFridayEnd(d) { let date = new Date(d.getTime()), day = date.getDay(), diff = (day <= 5) ? (5 - day) : (5 + 7 - day); date.setDate(date.getDate() + diff); date.setHours(0, 0, 0, 0); return date.getTime(); }
      for (let i = 0; i < dD.length; i++) weeklyData[getFridayEnd(dD[i])] = { close: qC[i], date: dD[i] };
      let sortedFri = Object.keys(weeklyData).sort();
      for (let i = 0; i < sortedFri.length; i++) { wP.push(weeklyData[sortedFri[i]].close); wD.push(weeklyData[sortedFri[i]].date); }
      let p = 14, wRsi = [];
      for (let i = 0; i < wP.length; i++) { if (i < p) { wRsi.push(50); continue; } let g = 0, l = 0; for (let j = i - p + 1; j <= i; j++) { let df = wP[j] - wP[j - 1]; if (df > 0) g += df; else l -= df; } wRsi.push(l === 0 ? 100 : 100 - (100 / (1 + (g / p) / (l / p)))); }
      let wRMap = {};
      for (let i = 0; i < dD.length; i++) { let ds = formatDateNY(dD[i]), friEnd = getFridayEnd(dD[i]), wIdx = sortedFri.indexOf(friEnd.toString()); wRMap[ds] = { dR: (wIdx >= 1) ? wRsi[wIdx - 1] : 50, dRR: (wIdx >= 2) ? wRsi[wIdx - 2] : 50 }; }
      return wRMap;
    }

    function run_tungchigi_master(paramsArr) {
      if (!paramsArr || paramsArr.length === 0) return [];
      let g = new Float64Array(100), h = new Float64Array(100), i_p = new Float64Array(100), j = new Float64Array(100), k = new Array(100).fill(false);
      for (let idx = 0; idx < paramsArr.length; idx++) {
        if (idx >= 100) break;
        let side = paramsArr[idx][0], method = paramsArr[idx][1], price = parseFloat(paramsArr[idx][2]), qty = parseFloat(paramsArr[idx][3]);
        if (side === '매수') { g[idx] = price; h[idx] = qty; } else { i_p[idx] = price; j[idx] = qty; if (method.toUpperCase() === 'MOC') k[idx] = true; }
      }
      let u_g = Array.from(g).filter(v => v > 0), adj_sell = Array.from(i_p).map((val, i) => k[i] ? 0.01 : val), u_i = adj_sell.filter(v => v > 0);
      let m_prices = [...new Set([...u_g, ...u_i])].sort((a, b) => b - a), m_col = new Array(100).fill(NaN); m_prices.forEach((val, i) => m_col[i] = val);
      let n_col = new Float64Array(100), o_col = new Float64Array(100);
      for (let idx = 0; idx < 100; idx++) {
        if (isNaN(m_col[idx])) continue; let mv = m_col[idx], count_m = m_col.slice(0, idx + 1).filter(v => v === mv).length;
        if (count_m > 1) { n_col[idx] = 0; } else { let sum_h = 0; for (let x = 0; x < 100; x++) if (g[x] === mv) sum_h += h[x]; n_col[idx] = sum_h; }
        if (n_col[idx] > 0) { o_col[idx] = 0; } else if (mv === 0.01) { let sum_j = 0; for (let x = 0; x < 100; x++) if (k[x]) sum_j += j[x]; o_col[idx] = -sum_j; } else { let sum_j = 0; for (let x = 0; x < 100; x++) if (!k[x] && i_p[x] === mv) sum_j += j[x]; o_col[idx] = -sum_j; }
      }
      let p_col = new Float64Array(100), cumsum_n = 0; for (let idx = 0; idx < 99; idx++) { cumsum_n += n_col[idx]; p_col[idx + 1] = cumsum_n; }
      let q_col = new Float64Array(100), cumsum_o = 0; for (let idx = 98; idx >= 0; idx--) { cumsum_o += o_col[idx]; q_col[idx] = cumsum_o; }
      let r_col = new Float64Array(100); for (let idx = 0; idx < 100; idx++) r_col[idx] = p_col[idx] + q_col[idx];
      let s_col = new Float64Array(100);
      for (let idx = 0; idx < 100; idx++) {
        let curr = r_col[idx], prev = idx > 0 ? r_col[idx - 1] : 0, nxt = idx < 99 ? r_col[idx + 1] : 0;
        if (curr === 0) s_col[idx] = 0; else if (curr < 0) s_col[idx] = (nxt < 0) ? (curr - nxt) : curr; else s_col[idx] = (prev < 0) ? curr : (curr - prev);
      }
      let y_raw = [], z_raw = [];
      for (let idx = 0; idx < 99; idx++) { let mv = m_col[idx]; if (isNaN(mv)) continue; y_raw.push(o_col[idx] < 0 ? mv - 0.01 : mv); z_raw.push(n_col[idx] > 0 ? mv + 0.01 : mv); }
      let y_sorted = y_raw.sort((a, b) => b - a), z_sorted = z_raw.sort((a, b) => b - a), y_final = new Array(100).fill(NaN), z_final = new Array(100).fill(NaN);
      for (let i = 0; i < z_sorted.length; i++) z_final[i] = z_sorted[i];
      for (let i = 0; i < y_sorted.length; i++) if (i + 1 < 100) y_final[i + 1] = y_sorted[i];
      let grouped = {};
      for (let idx = 0; idx < 100; idx++) {
        let s = s_col[idx]; if (s === 0) continue; let side = s > 0 ? "매수" : "매도", price = s > 0 ? y_final[idx] : z_final[idx]; if (isNaN(price) || price <= 0) continue;
        let method = (price === 0.01 && side === "매도") ? "MOC" : "LOC", key = side + "|" + method + "|" + price.toFixed(4);
        if (!grouped[key]) grouped[key] = { side: side, method: method, price: price, qty: Math.abs(s) }; else grouped[key].qty += Math.abs(s);
      }
      return Object.values(grouped).sort((a, b) => b.price - a.price).map(r => [r.side, r.method, r.price, r.qty]);
    }

    async function runBacktestMemory(params) {
      try {
        let ticker = params.basics.ticker.toString().trim(), startDate = new Date(params.basics.startDate), endDate = params.basics.endDate ? new Date(params.basics.endDate) : new Date(); endDate.setHours(23, 59, 59, 999);
        function p(val) { const num = parseFloat(val); return isNaN(num) ? 0.0 : Number((num / 100.0).toFixed(8)); } function n(val, def) { return (val === "" || isNaN(val)) ? def : parseFloat(val); }
        let initialCash = n(params.basics.initialCash, 10000), compR = p(params.basics.compR), lossR = p(params.basics.lossR), fBase = p(params.basics.fBase), fSec = p(params.basics.fSec);
        let basePrincipal = n(params.basics.renewCash, initialCash), tierAssign = params.basics.tierMethod, dLimit = p(params.basics.dLimit), cDn3 = p(params.basics.cDn3), cDn2 = p(params.basics.cDn2), cDn1 = p(params.basics.cDn1);

        let useMid1 = params.basics.useMid1 !== 'OFF';
        let useMid3 = params.basics.useMid3 === 'ON';
        let useMid2 = params.basics.useMid2 !== 'OFF';

        const getM = (mName) => {
          const alts = { 'SF': ['SF'], 'Middle': ['Middle', 'Mid', 'Mid1'], 'AG': ['AG'], 'Middle2': ['Middle2', 'Mid2'], 'Middle3': ['Middle3', 'Mid3'] };
          for (let a of alts[mName]) { if (params.modes && params.modes[a]) return params.modes[a]; }
          return Array(12).fill([0, 0, 0, 20]);
        };
        const m3Data = getM('Middle3');

        let MODES = {
          'SF': { weight: getM('SF').map(r => p(r[0])), buy: getM('SF').map(r => p(r[1])), sell: getM('SF').map(r => p(r[2])), hold: getM('SF').map(r => n(r[3], 20)) },
          'Middle': { weight: getM('Middle').map(r => p(r[0])), buy: getM('Middle').map(r => p(r[1])), sell: getM('Middle').map(r => p(r[2])), hold: getM('Middle').map(r => n(r[3], 20)) },
          'AG': { weight: getM('AG').map(r => p(r[0])), buy: getM('AG').map(r => p(r[1])), sell: getM('AG').map(r => p(r[2])), hold: getM('AG').map(r => n(r[3], 20)) },
          'Middle2': { weight: getM('Middle2').map(r => p(r[0])), buy: getM('Middle2').map(r => p(r[1])), sell: getM('Middle2').map(r => p(r[2])), hold: getM('Middle2').map(r => n(r[3], 20)) },
          'Middle3': { weight: m3Data.map(r => p(r[0])), buy: m3Data.map(r => p(r[1])), sell: m3Data.map(r => p(r[2])), hold: m3Data.map(r => n(r[3], 20)) }
        };
        let startTs = Math.floor(startDate.getTime() / 1000) - (365 * 86400);
        let todayFixed = new Date(); todayFixed.setHours(23, 59, 59, 999);
        let endTs = Math.floor(todayFixed.getTime() / 1000);

        let [mainDataAll, qqqData] = await Promise.all([fetchYahooData(ticker, startTs, endTs, true), fetchYahooData("QQQ", startTs, endTs, true)]);
        window.globalMainData = mainDataAll;
        let startIndex = mainDataAll.dates.findIndex(d => d >= startDate); if (startIndex === -1) startIndex = 0;
        let firstPrevClose = (startIndex > 0) ? mainDataAll.close[startIndex - 1] : mainDataAll.open[0], wRsiMap = calculateWRSI_WFRI(qqqData);
        let cash = initialCash, prev_total = initialCash, peak = initialCash, base = basePrincipal, order_count = 0, inv = [];

        let res = { S: [], BA: [], BF: [], AV: [] }; let fBuy = fBase, fSellT = fBase + fSec, EPS = 0.0000001;
        function t2(v) { let s = (v >= 0 ? EPS : -EPS); return Math.trunc((v + s) * 100) / 100.0; } function c2(v) { return Math.ceil((v * 100) - EPS) / 100.0; } function R2(v) { return Number(Math.round((v + EPS) * 100) / 100); } function truncPct5(v) { let sign = v >= 0 ? 1e-11 : -1e-11; return Math.trunc((v + sign) * 100000) / 100000; }

        let bDates = mainDataAll.dates.filter(d => d <= endDate && d >= startDate), full_c = mainDataAll.close, rsi_m = 'SF';
        let finalTodayMode = "-", finalTodayTier = "-", finalTodayWeight = 0, currPrice = 0, evalVal = 0;
        let allLogs = [];

        for (let i = 0; i < bDates.length; i++) {
          let idx = startIndex + i, close = full_c[idx], dtStr = formatDateNY(bDates[i]), prev = (idx === 0) ? firstPrevClose : full_c[idx - 1];
          let rv = wRsiMap[dtStr] ? wRsiMap[dtStr].dR : 50, rrv = wRsiMap[dtStr] ? wRsiMap[dtStr].dRR : 50;
          if (rv !== 0) { if (rrv <= 35 && rrv < rv) rsi_m = 'AG'; else if (rrv >= 40 && rrv < 50 && rrv > rv) rsi_m = 'SF'; else if (rrv <= 50 && rv > 50) rsi_m = 'AG'; else if (rrv >= 50 && rv < 50) rsi_m = 'SF'; else if (rrv >= 50 && rrv < 60 && rrv < rv) rsi_m = 'AG'; else if (rrv > 65 && rrv > rv) rsi_m = 'SF'; }

          let curr_m = rsi_m;
          if (idx >= 4) {
            let pct_m1 = truncPct5((full_c[idx - 1] - full_c[idx - 2]) / full_c[idx - 2]);
            let pct_m2 = truncPct5((full_c[idx - 2] - full_c[idx - 3]) / full_c[idx - 3]);
            let pct_m3 = truncPct5((full_c[idx - 3] - full_c[idx - 4]) / full_c[idx - 4]);

            let is3Drop = (pct_m1 <= cDn1 && pct_m2 <= cDn2 && pct_m3 <= cDn3);
            let isPlunge = (pct_m1 <= dLimit);

            let applied_m = null;
            if (is3Drop) {
              if (useMid1 && useMid3) {
                applied_m = (curr_m === 'AG') ? 'Middle3' : 'Middle';
              } else if (useMid1) {
                applied_m = 'Middle';
              } else if (useMid3) {
                applied_m = 'Middle3';
              }
            }
            if (!applied_m && isPlunge && useMid2) {
              applied_m = 'Middle2';
            }

            if (applied_m) curr_m = applied_m;
          }

          let t = inv.length + 1; if (tierAssign === '최소(빈자리)' || tierAssign === '최소') { let used = inv.map(p => p.tier); t = 1; while (used.indexOf(t) !== -1) t++; }
          let b_qty = 0, b_tgt = 0, seed = 0.0, w_list = MODES[curr_m].weight;
          if (t <= w_list.length) { seed = t2(Math.min(base * w_list[t - 1], cash)); b_tgt = t2(prev * (1 + MODES[curr_m].buy[t - 1])); if (b_tgt > 0 && close <= b_tgt) b_qty = Math.floor(seed / (b_tgt * (1 + fBuy)) + 1e-12); }

          let d_sell_net = 0.0, d_buy_cost = 0.0, d_cf = 0.0, n_inv = [];
          for (let p_idx = 0; p_idx < inv.length; p_idx++) {
            let p_inv = inv[p_idx]; p_inv.days++; let s_tgt = c2(p_inv.buy_price * (1 + (MODES[p_inv.mode].sell[p_inv.tier - 1] || MODES[p_inv.mode].sell[0])));
            if (close >= s_tgt || p_inv.days >= (MODES[p_inv.mode].hold[p_inv.tier - 1] || MODES[p_inv.mode].hold[0])) { 
              let net = (p_inv.qty * close) * (1 - fSellT); 
              d_sell_net += net; d_buy_cost += p_inv.cost; d_cf += net; 
              if (p_inv.log) { p_inv.log[10] = dtStr; p_inv.log[11] = close; p_inv.log[12] = p_inv.qty; p_inv.log[13] = t2(net - p_inv.cost); }
            } else n_inv.push(p_inv);
          }
          inv = n_inv; let totalBC = 0;
          if (b_qty > 0) { 
            totalBC = (b_qty * close) * (1 + fBuy); 
            if (totalBC <= cash) { 
              d_cf -= totalBC; 
              let s_tgt_expected = c2(close * (1 + (MODES[curr_m].sell[t - 1] || MODES[curr_m].sell[0])));
              let logEntry = [dtStr, curr_m, t, seed, b_tgt, close, truncPct5((close - prev)/prev), s_tgt_expected, close, b_qty, "", "", "", "", 0, 0, 0, 0, 0, 0];
              allLogs.push(logEntry);
              inv.push({ buy_price: close, qty: b_qty, cost: totalBC, mode: curr_m, tier: t, days: 0, log: logEntry, buyDate: dtStr }); 
              order_count++; 
            } 
          }
          let hasEntryForToday = allLogs.some(l => l[0] === dtStr);
          if (!hasEntryForToday) {
            let dailyEntry = [dtStr, curr_m, "-", 0, 0, close, truncPct5((close - prev)/prev), 0, close, 0, "", "", "", "", 0, 0, 0, 0, 0, 0];
            allLogs.push(dailyEntry);
          }
          cash = t2(cash + d_cf);
          let pl_f = t2(d_sell_net - d_buy_cost), compA = 0.0; if (pl_f > 0) { compA = pl_f * compR; base += compA; } else if (pl_f < 0) { compA = pl_f * lossR; base += compA; } base = t2(base);
          evalVal = inv.reduce((s, p_i) => s + (p_i.qty * close), 0);
          let pct_from_prev = prev_total > 0 ? ((cash + t2(evalVal)) - prev_total) / prev_total : 0;
          let totalBalance = t2(cash + t2(evalVal)); prev_total = totalBalance; if (totalBalance > peak) peak = totalBalance;
          let currentMdd = peak > 0 ? truncPct5((totalBalance - peak) / peak) : 0;

          for (let l of allLogs) {
            if (l[0] === dtStr && l[14] === 0) {
              l[14] = t2(evalVal); l[15] = cash; l[16] = totalBalance; l[17] = base; l[18] = truncPct5(pct_from_prev); l[19] = currentMdd;
            }
          }

          currPrice = close; res.S.push(dtStr); res.BF.push(currentMdd); res.BA.push(R2(totalBalance)); res.AV.push(pl_f);
        }

        let rawOrderOutput = [], orderDateStr = "날짜 확인 불가";
        const todayNY = formatDateNY(new Date());
        let tIdx = full_c.length;
        if (tIdx > 0 && (!params.basics.endDate || params.basics.endDate === "" || formatDateNY(new Date(params.basics.endDate)) >= todayNY)) {
          let lastDateObj = new Date(mainDataAll.dates[tIdx - 1].getTime());
          let dayOfWeek = lastDateObj.getDay();
          if (dayOfWeek === 5) { lastDateObj.setDate(lastDateObj.getDate() + 3); }
          else if (dayOfWeek === 6) { lastDateObj.setDate(lastDateObj.getDate() + 2); }
          else { lastDateObj.setDate(lastDateObj.getDate() + 1); }
          orderDateStr = (lastDateObj.getMonth() + 1) + "/" + lastDateObj.getDate();

          let lastDataClose = full_c[tIdx - 1];
          // tp1_h(어제), tp2_h(그저께), tp3_h(그그저께) 등락률 계산
          let tp1_h = truncPct5((full_c[tIdx - 2] - (full_c[tIdx - 3] || full_c[tIdx - 2])) / (full_c[tIdx - 3] || full_c[tIdx - 2]));
          let tp2_h = truncPct5(((full_c[tIdx - 3] || full_c[tIdx - 2]) - (full_c[tIdx - 4] || full_c[tIdx - 3])) / (full_c[tIdx - 4] || full_c[tIdx - 3]));
          let tp3_h = truncPct5(((full_c[tIdx - 4] || full_c[tIdx - 3]) - (full_c[tIdx - 5] || full_c[tIdx - 4])) / (full_c[tIdx - 5] || full_c[tIdx - 4]));
          // Plunge 체크용 (어제 등락률)
          let tp_plunge = tp1_h;

          let today_m = rsi_m;
          if (tIdx >= 5) {
            let is3Drop_t = (tp1_h <= cDn1 && tp2_h <= cDn2 && tp3_h <= cDn3);
            let isPlunge_t = (tp_plunge <= dLimit);
            let applied_m_t = null;
            if (is3Drop_t) {
              if (useMid1 && useMid3) {
                applied_m_t = (today_m === 'AG') ? 'Middle3' : 'Middle';
              } else if (useMid1) {
                applied_m_t = 'Middle';
              } else if (useMid3) {
                applied_m_t = 'Middle3';
              }
            }
            if (!applied_m_t && isPlunge_t && useMid2) {
              applied_m_t = 'Middle2';
            }
            if (applied_m_t) today_m = applied_m_t;
          }

          let tTier = inv.length + 1; if (tierAssign === '최소(빈자리)' || tierAssign === '최소') { let used = inv.map(p_i => p_i.tier); tTier = 1; while (used.indexOf(tTier) !== -1) tTier++; }

          finalTodayMode = today_m; finalTodayTier = tTier;
          let currentW = MODES[today_m].weight[tTier - 1] !== undefined ? MODES[today_m].weight[tTier - 1] : (MODES[today_m].weight[0] || 0);
          finalTodayWeight = Math.round(currentW * 10000) / 100;

          let tSeed = t2(Math.min(base * currentW, cash)), tTgt = t2(lastDataClose * (1 + (MODES[today_m].buy[tTier - 1] !== undefined ? MODES[today_m].buy[tTier - 1] : (MODES[today_m].buy[0] || 0)))), todayBuyQty = (tTgt > 0) ? Math.floor((tSeed / (tTgt * (1 + fBuy))) + 1e-12) : 0;
          if (todayBuyQty > 0) rawOrderOutput.push(["매수", "LOC", tTgt, todayBuyQty]);
          inv.forEach(p_i => { let s_tgt = c2(p_i.buy_price * (1 + (MODES[p_i.mode].sell[p_i.tier - 1] || MODES[p_i.mode].sell[0]))); rawOrderOutput.push(["매도", "LOC", s_tgt, p_i.qty]); });
        }

        let lastIdx = res.BA.length - 1, tAssets = res.BA[lastIdx], totalRealizedProfit = res.AV.reduce((acc, cur) => acc + cur, 0);
        let tQty = inv.reduce((s, p) => s + p.qty, 0), avgPrice = tQty > 0 ? (inv.reduce((s, p) => s + p.cost, 0) / tQty) : 0;
        let yrs = (endDate - startDate) / (1000 * 60 * 60 * 24 * 365), cagr = yrs > 0 ? (Math.pow((tAssets / initialCash), (1 / yrs)) - 1) : 0, oMdd = res.BF.length > 0 ? Math.min(...res.BF) : 0;
        let summary = { totalAssets: tAssets, yield: (tAssets - initialCash) / initialCash, cagr: cagr, mdd: oMdd, calmar: oMdd !== 0 ? Math.abs(cagr / oMdd) : 0, totalProfit: tAssets - initialCash, realizedProfit: totalRealizedProfit, qty: tQty, avgPrice: avgPrice, evalReturn: tQty > 0 ? (currPrice - avgPrice) / avgPrice : 0, evalVal: evalVal, cash: cash, depletion: tAssets > 0 ? (evalVal / tAssets) : 0, currPrice: currPrice, currentMdd: res.BF[lastIdx], base: base, todayMode: finalTodayMode, todayTier: finalTodayTier, todayWeight: finalTodayWeight };
        let finalOrders = run_tungchigi_master(rawOrderOutput);

        window.latestHistory = allLogs;

        return { status: "success", inv: inv, orders: finalOrders, orderDateStr: orderDateStr, summary: summary, chartDates: res.S, chartBalances: res.BA, chartMdd: res.BF, monthlyData: calculateMonthlyData(res.S, res.BA, res.BF, initialCash), yearlyData: calculateYearlyData(res.S, res.BA, res.BF, initialCash) };
      } catch (e) { return { status: "error", message: e.toString() }; }
    }

    function calculateMonthlyData(dates, balances, mdds, initialCash) {
      let monthly = [], currentMonth = "", monthStartBalance = initialCash, currentMonthMinMdd = 0;
      for (let i = 0; i < dates.length; i++) {
        let monthKey = dates[i].substring(0, 7), dMdd = mdds[i];
        if (currentMonth === "") { currentMonth = monthKey; currentMonthMinMdd = dMdd; }
        if (monthKey !== currentMonth) { let endBalance = balances[i - 1], monthProfit = endBalance - monthStartBalance; monthly.push({ period: currentMonth, asset: endBalance, rate: monthProfit / monthStartBalance, profit: monthProfit, mdd: currentMonthMinMdd }); currentMonth = monthKey; monthStartBalance = endBalance; currentMonthMinMdd = dMdd; } else if (dMdd < currentMonthMinMdd) currentMonthMinMdd = dMdd;
        if (i === dates.length - 1) { let endBalance = balances[i], monthProfit = endBalance - monthStartBalance; monthly.push({ period: currentMonth, asset: endBalance, rate: monthProfit / monthStartBalance, profit: monthProfit, mdd: currentMonthMinMdd }); }
      } return monthly.reverse();
    }

    function calculateYearlyData(dates, balances, mdds, initialCash) {
      let yearly = [], currentYear = "", yearStartBalance = initialCash, currentYearMinMdd = 0;
      for (let i = 0; i < dates.length; i++) {
        let yearKey = dates[i].substring(0, 4), dMdd = mdds[i];
        if (currentYear === "") { currentYear = yearKey; currentYearMinMdd = dMdd; }
        if (yearKey !== currentYear) { let endBalance = balances[i - 1], yearProfit = endBalance - yearStartBalance; yearly.push({ period: currentYear, asset: endBalance, rate: yearProfit / yearStartBalance, profit: yearProfit, mdd: currentYearMinMdd }); currentYear = yearKey; yearStartBalance = endBalance; currentYearMinMdd = dMdd; } else if (dMdd < currentYearMinMdd) currentYearMinMdd = dMdd;
        if (i === dates.length - 1) { let endBalance = balances[i], yearProfit = endBalance - yearStartBalance; yearly.push({ period: currentYear, asset: endBalance, rate: yearProfit / yearStartBalance, profit: yearProfit, mdd: currentYearMinMdd }); }
      } return yearly.reverse();
    }

    function setBtnLoading(btnId, loadingText) { const btn = document.getElementById(btnId); const orgText = btn.innerHTML; btn.innerText = loadingText; btn.disabled = true; return function () { btn.innerHTML = orgText; btn.disabled = false; }; }
    function triggerIconAnim(id) { const el = document.getElementById(id); el.classList.add('icon-rotate', 'status-ready'); setTimeout(() => el.classList.remove('icon-rotate'), 600); }

    async function runEngine() {
      const ticker = document.getElementById('ticker').value; const startDate = document.getElementById('startDate').value;
      if (!ticker || !startDate) return alert("데이터를 완전히 불러온 후 실행해주세요.");
      const restoreBtn = setBtnLoading('runBtn', '⏳ 계산 중...'); const params = gatherParams(); const res = await runBacktestMemory(params); restoreBtn();
      if (res.status === "error") return alert("❌ 에러:
" + res.message);
      ['icoInstant', 'icoPerf', 'icoRun'].forEach(id => document.getElementById(id).classList.remove('status-ready')); triggerIconAnim('icoRun');
      const hasEndDate = document.getElementById('endDate').value !== '';
      if (hasEndDate) document.getElementById('mainGrid').classList.add('hide-order-panel'); else { document.getElementById('mainGrid').classList.remove('hide-order-panel'); renderOrderView(res); }
      globalMonthlyData = res.monthlyData; globalYearlyData = res.yearlyData; renderPeriodTable(); renderMetrics(res.summary, res.chartDates.length); renderChart(res);
    }

    async function handlePerformance() {
      const restoreBtn = setBtnLoading('btnPerf', '⏳ 계산 중...'); const res = await runBacktestMemory(gatherParams()); restoreBtn(); document.getElementById('icoPerf').classList.add('status-ready');
      if (res.status !== "error") { globalMonthlyData = res.monthlyData; globalYearlyData = res.yearlyData; renderPeriodTable(); renderMetrics(res.summary, res.chartDates.length); renderChart(res); } else alert(res.message);
    }

    async function handleInstantOrder() {
      const restoreBtn = setBtnLoading('btnInstant', '⏳ 계산 중...'); const res = await runBacktestMemory(gatherParams()); restoreBtn(); document.getElementById('icoInstant').classList.add('status-ready');
      if (res.status !== "error") { document.getElementById('mainGrid').classList.remove('hide-order-panel'); renderOrderView(res); } else alert(res.message);
    }

    let settingsTimer = null;
    function setupLongPress() {
      const btn = document.getElementById('btnToggleSettings');
      if (!btn) return;
      btn.onmousedown = btn.ontouchstart = (e) => {
        settingsTimer = setTimeout(() => {
          handleSaveHistoryAll();
          settingsTimer = null;
        }, 3000);
      };
      btn.onmouseup = btn.onmouseleave = btn.ontouchend = (e) => {
        if (settingsTimer) { clearTimeout(settingsTimer); settingsTimer = null; }
      };
    }

    function handleSaveHistoryAll() {
      if (!window.latestHistory || window.latestHistory.length === 0) return alert("백테스트 결과가 없습니다.");
      if (!confirm("전체 매매기록을 서버 시트(S5부터)에 모두 덮어쓰시겠습니까?")) return;
      const btn = document.getElementById('btnToggleSettings'), orgText = btn.innerHTML; 
      btn.innerText = '⏳ 전체 저장 중'; btn.disabled = true;
      let payload = { action: "FULL_OVERWRITE", id: myUserId, logs: window.latestHistory };
      fetch(GAS_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) })
        .then(() => { btn.innerText = '✅ 저장 완료'; setTimeout(() => { btn.innerHTML = orgText; btn.disabled = false; }, 2000); })
        .catch(() => { btn.innerText = '❌ 오류'; setTimeout(() => { btn.innerHTML = orgText; btn.disabled = false; }, 2000); });
    }

    function handleSave() {
      if (!confirm("현재 설정 및 매매기록(새로운 날짜만)을 서버에 저장하시겠습니까?")) return;
      const btn = document.getElementById('btnSaveTop'), orgText = btn.innerHTML; btn.innerText = '⏳ 저장 중'; btn.disabled = true;
      let payload = { action: "BACKUP_AND_SAVE", id: myUserId, params: gatherParams(), logs: window.latestHistory || [] };
      fetch(GAS_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) })
        .then(() => { btn.innerText = '✅ 적용 완료'; setTimeout(() => { btn.innerHTML = orgText; btn.disabled = false; }, 1500); }).catch(() => { btn.innerText = '❌ 오류'; setTimeout(() => { btn.innerHTML = orgText; btn.disabled = false; }, 1500); });
    }

    function initData(d) {
      if (!d || !d.basics) return; const b = d.basics;
      document.getElementById('ticker').value = b.ticker || ''; document.getElementById('startDate').value = b.startDate || ''; document.getElementById('endDate').value = b.endDate || ''; document.getElementById('initialCash').value = b.initialCash || ''; document.getElementById('renewCash').value = b.renewCash || '';

      document.getElementById('extraInputs').innerHTML = `
      <div class="input-group"><label>투자법</label><select id="strategySelect" onchange="handleStrategyChange(this.value)"><option value="2M3D1-1P" ${(b.strategy || '2M3D1-1P') === '2M3D1-1P' ? 'selected' : ''}>2M3D1-1P</option><option value="2M3D2(1.2)" ${b.strategy === '2M3D2(1.2)' ? 'selected' : ''}>2M3D2(1.2)</option><option value="2M3D2(2.0)" ${b.strategy === '2M3D2(2.0)' || b.strategy === '2M3D2' ? 'selected' : ''}>2M3D2(2.0)</option></select></div>
      <div class="input-group"><label>이익복리(%)</label><input type="number" id="compR" value="${b.compR}" step="any"></div>
      <div class="input-group"><label>손실복리(%)</label><input type="number" id="lossR" value="${b.lossR}" step="any"></div>
      <div class="input-group"><label>수수료(%)</label><input type="number" id="fBase" value="${b.fBase}" step="any"></div>
      <div class="input-group"><label>SEC(%)</label><input type="number" id="fSec" value="${b.fSec}" step="any"></div>
      <div class="input-group"><label>티어배정</label><select id="tierMethod"><option value="최소(빈자리)" ${b.tierMethod === '최소(빈자리)' ? 'selected' : ''}>최소(빈자리)</option><option value="보유" ${b.tierMethod === '보유' ? 'selected' : ''}>보유</option></select></div>
      <div class="input-group"><label>3떨 미들1</label><select id="useMid1"><option value="ON" ${(b.useMid1 || 'ON') === 'ON' ? 'selected' : ''}>ON</option><option value="OFF" ${b.useMid1 === 'OFF' ? 'selected' : ''}>OFF</option></select></div>
      <div class="input-group"><label>3떨 미들3</label><select id="useMid3"><option value="ON" ${b.useMid3 === 'ON' ? 'selected' : ''}>ON</option><option value="OFF" ${(b.useMid3 || 'OFF') === 'OFF' ? 'selected' : ''}>OFF</option></select></div>
      <div class="input-group"><label>미들2(폭락)</label><select id="useMid2"><option value="ON" ${(b.useMid2 || 'ON') === 'ON' ? 'selected' : ''}>ON</option><option value="OFF" ${b.useMid2 === 'OFF' ? 'selected' : ''}>OFF</option></select></div>
    `;

      document.getElementById('advancedExtraInputs').innerHTML = `<div class="input-group"><label>폭락점(%)</label><input type="number" id="dLimit" value="${b.dLimit}" step="any"></div><div class="input-group"><label>떨기준3(%)</label><input type="number" id="cDn3" value="${b.cDn3}" step="any"></div><div class="input-group"><label>떨기준2(%)</label><input type="number" id="cDn2" value="${b.cDn2}" step="any"></div><div class="input-group"><label>떨기준1(%)</label><input type="number" id="cDn1" value="${b.cDn1}" step="any"></div>`;

      const mC = document.getElementById('modeInputs'); mC.innerHTML = "";
      const modeKeyMap = {
        'SF': ['SF'],
        'Middle': ['Middle', 'Mid', 'Mid1'],
        'AG': ['AG'],
        'Middle2': ['Middle2', 'Mid2'],
        'Middle3': ['Middle3', 'Mid3']
      };
      const seedTargetMap = { 'SF': 'seedSF', 'Middle': 'seedMid', 'AG': 'seedAG', 'Middle2': 'seedMid2', 'Middle3': 'seedMid3' };

      const findData = (obj, keys) => {
        if (!obj) return null;
        const objKeys = Object.keys(obj);
        for (let k of keys) {
          const foundKey = objKeys.find(ok => ok.toLowerCase() === k.toLowerCase());
          if (foundKey) return obj[foundKey];
        }
        return null;
      };

      window.renderSingleModeTable = function (m, sData, mDataRaw = []) {
        const table = document.getElementById(`table-${m}`); if (!table) return;
        let mData = Array(sData).fill(null).map((_, i) => {
          let row = mDataRaw[i];
          if (!row) return [0, 0, 0, 20];
          return row.length === 5 ? row.slice(1) : (row.length === 4 ? row : [0, 0, 0, 20]);
        });
        let h = `<tr><th class="th-t">티어</th><th class="th-w">비중</th><th class="th-b">매수</th><th class="th-s">매도</th><th class="th-h">손절</th></tr>`;
        mData.forEach((r, i) => { h += `<tr><td>${i + 1}</td><td><input type="number" class="weight" value="${r[0]}" step="any"></td><td><input type="number" class="buy" value="${r[1]}" step="any"></td><td><input type="number" class="sell" value="${r[2]}" step="any"></td><td><input type="number" class="hold" value="${r[3]}"></td></tr>`; });
        table.innerHTML = h;
      };

      ['SF', 'Middle', 'AG', 'Middle2', 'Middle3'].forEach(m => {
        const alts = modeKeyMap[m].concat([m, m.toLowerCase(), m.toUpperCase(), 'm3', 'mid3', 'middle3']);
        let sData = findData(d.seeds, alts) || 10;
        if (m === 'Middle3' && b.seedMid3 !== undefined) sData = parseInt(b.seedMid3);
        if (isNaN(sData) || sData < 1) sData = 10;
        let mDataRaw = findData(d.modes, alts) || findData(d, alts) || [];

        const seedId = seedTargetMap[m];
        let h = `<div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;"><h3 style="margin:0; font-size:12px; color:#6366f1;">${m}</h3><div style="display:flex; gap:4px; align-items:center;"><label style="width:auto; margin:0; font-size:10px;">분할</label><input type="number" id="${seedId}" value="${sData}" class="seed-input" oninput="renderSingleModeTable('${m}', parseInt(this.value)||1)"></div></div><table class="mode-table" id="table-${m}"></table>`;
        mC.innerHTML += h;
        renderSingleModeTable(m, sData, mDataRaw);
      });
    }

    function handleStrategyChange(strategyName) {
      if (!strategyName) return;
      const sName = strategyName.trim();
      if (!confirm(`[${sName}] 투자법 설정값을 시트에서 즉시 불러오시겠습니까?
(현재 화면에 입력된 값은 새로 불러온 값으로 덮어씌워집니다)`)) {
        return;
      }

      const orgText = document.getElementById('userDisplay').innerHTML;
      document.getElementById('userDisplay').innerHTML = `🔄 ${sName} 불러오는 중...`;

      // GAS의 GET_STRATEGY가 doPost에 정의되어 있으므로 POST 방식으로 요청
      fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: "GET_STRATEGY", strategy: sName }) })
        .then(res => res.json())
        .then(data => {
          if (data && data.config) {
            initData(data.config);
            document.getElementById('strategySelect').value = sName;
            document.getElementById('userDisplay').innerHTML = `🟢 ${myUserId}`;
            alert(`[${sName}] 설정값을 성공적으로 불러왔습니다.`);
          } else {
            const rawMsg = data ? JSON.stringify(data) : "응답 없음";
            alert(`[${sName}] 시트에서 설정값을 불러오지 못했습니다.
(서버 응답: ${rawMsg})

구글 시트의 탭 이름과 빈칸 없이 정확히 일치하는지 확인해 주세요.`);
            document.getElementById('userDisplay').innerHTML = orgText;
            document.getElementById('strategySelect').value = ""; 
          }
        })
        .catch(e => {
          alert("서버와 통신 중 오류가 발생했습니다. 네트워크 상태 또는 GAS 배포 설정을 확인해 주세요.");
          document.getElementById('userDisplay').innerHTML = orgText;
        });
    }

    function gatherParams() {
      const mData = {};
      ['SF', 'Middle', 'AG', 'Middle2', 'Middle3'].forEach(m => {
        const rows = document.querySelectorAll(`#table-${m} tr:not(:first-child)`);
        mData[m] = Array.from(rows).map(r => [
          r.querySelector('.weight').value,
          r.querySelector('.buy').value,
          r.querySelector('.sell').value,
          r.querySelector('.hold').value
        ]);
      });
      return {
        basics: {
          ticker: document.getElementById('ticker').value,
          startDate: document.getElementById('startDate').value,
          endDate: document.getElementById('endDate').value,
          initialCash: document.getElementById('initialCash').value,
          strategy: document.getElementById('strategySelect') ? document.getElementById('strategySelect').value : '2M3D1-1P',
          compR: document.getElementById('compR').value,
          lossR: document.getElementById('lossR').value,
          fBase: document.getElementById('fBase').value,
          fSec: document.getElementById('fSec').value,
          tierMethod: document.getElementById('tierMethod').value,
          renewCash: document.getElementById('renewCash').value,
          dLimit: document.getElementById('dLimit').value,
          cDn3: document.getElementById('cDn3').value,
          cDn2: document.getElementById('cDn2').value,
          cDn1: document.getElementById('cDn1').value,
          useMid1: document.getElementById('useMid1').value,
          useMid3: document.getElementById('useMid3').value,
          useMid2: document.getElementById('useMid2').value,
          seedMid3: document.getElementById('seedMid3') ? document.getElementById('seedMid3').value : 10
        },
        seeds: {
          SF: document.getElementById('seedSF') ? document.getElementById('seedSF').value : 10,
          Middle: document.getElementById('seedMid') ? document.getElementById('seedMid').value : 10,
          AG: document.getElementById('seedAG') ? document.getElementById('seedAG').value : 10,
          Middle2: document.getElementById('seedMid2') ? document.getElementById('seedMid2').value : 10,
          Middle3: document.getElementById('seedMid3') ? document.getElementById('seedMid3').value : 10
        },
        modes: mData
      };
    }

    function renderOrderView(res) {
      if (!res) return; currentOrderDate = res.orderDateStr || ""; renderOrderTable(res.orders); renderHoldingsTable(res.inv || []); refreshOrderViewUI();
      if (res.summary) {
        const modeMap = { 'Middle': 'Mid1', 'Middle2': 'Mid2', 'Middle3': 'Mid3', 'SF': 'SF', 'AG': 'AG' };
        if (document.getElementById('modeCountVal')) document.getElementById('modeCountVal').innerText = (res.summary.todayMode && res.summary.todayMode !== "-") ? (modeMap[res.summary.todayMode] || res.summary.todayMode) : "-";
        if (document.getElementById('tierCountVal')) document.getElementById('tierCountVal').innerText = res.summary.todayTier || "-";
        if (document.getElementById('weightCountVal')) document.getElementById('weightCountVal').innerText = res.summary.todayWeight || "0";
        
        const currentQty = (res.summary.qty || 0);
        if (document.getElementById('qtyCountVal')) document.getElementById('qtyCountVal').innerText = currentQty;
        
        document.getElementById('tierFooter').style.display = 'flex';
      } else {
        document.getElementById('tierFooter').style.display = 'none';
      }
    }

    function toggleOrderView() { isOrderView = !isOrderView; refreshOrderViewUI(); }
    function toggleOrderExpansion() {
      const grid = document.getElementById('mainGrid');
      const btn = document.getElementById('btnExpandOrder');
      const isExpanded = grid.classList.toggle('order-expanded');
      if (isExpanded) {
        btn.classList.add('active');
        // if (grid.classList.contains('force-3-col')) toggleLayoutMode(); // 3열 모드 해제 로직 제거
      } else btn.classList.remove('active');
      if (myChart) setTimeout(() => myChart.resize(), 100);
    }
    
    function toggleLayoutMode() {
      const grid = document.getElementById('mainGrid');
      const txt = document.getElementById('layoutModeText');
      if (grid.classList.contains('force-3-col')) {
        grid.classList.remove('force-3-col');
        grid.classList.add('force-2-col');
        document.documentElement.classList.add('is-cover'); // 2열 강제 시 cover 스타일 적용
        txt.innerText = "2열";
      } else if (grid.classList.contains('force-2-col')) {
        grid.classList.remove('force-2-col');
        txt.innerText = "AUTO";
        detectLayout(); // 자동 감지 즉시 실행
      } else {
        grid.classList.add('force-3-col');
        document.documentElement.classList.remove('is-cover'); // 3열 강제 시 cover 스타일 제거
        txt.innerText = "3열";
        grid.classList.remove('order-expanded');
        document.getElementById('btnExpandOrder').classList.remove('active');
      }
      if (myChart) setTimeout(() => myChart.resize(), 100);
    }
    function refreshOrderViewUI() {
      document.getElementById('orderView').style.display = isOrderView ? 'block' : 'none';
      document.getElementById('holdingsView').style.display = isOrderView ? 'none' : 'block';
      document.getElementById('orderTitle').innerText = isOrderView ? "⚡ 주문표 (" + currentOrderDate + ")" : "📦 보유 잔량 (" + currentOrderDate + ")";
    }

    // 손절 진행률 직관적 표시 처리 추가
    function renderHoldingsTable(inv) {
      const tbody = document.getElementById('holdingsBody'); if (!inv || inv.length === 0) { tbody.innerHTML = "<tr><td colspan='6' style='padding:20px; color:#64748b;'>보유 잔량 없음</td></tr>"; return; } const p = gatherParams();
      const modeMap = { 'Middle': 'Mid1', 'Middle2': 'Mid2', 'Middle3': 'Mid3', 'SF': 'SF', 'AG': 'AG' };
      tbody.innerHTML = inv.map(o => {
        let sellPriceStr = "-";
        let stopDateStr = "-";
        try {
          const modeData = p.modes[o.mode];
          const tierData = modeData[o.tier - 1] || modeData[0];
          const sellPct = parseFloat(tierData[2]) / 100;
          sellPriceStr = "$" + (Math.ceil((o.buy_price * (1 + sellPct) * 100) - 0.000001) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 });
          holdLimit = parseInt(tierData[3]);
          if (o.buyDate && window.globalMainData && window.globalMainData.dates) {
            const bIdx = window.globalMainData.dates.findIndex(d => formatDateNY(d) === o.buyDate);
            if (bIdx !== -1) {
              const targetIdx = bIdx + holdLimit;
              if (targetIdx < window.globalMainData.dates.length) {
                const sDate = window.globalMainData.dates[targetIdx];
                stopDateStr = (sDate.getMonth() + 1) + "/" + sDate.getDate();
              } else {
                const buyDateObj = new Date(window.globalMainData.dates[bIdx]);
                buyDateObj.setDate(buyDateObj.getDate() + Math.round(holdLimit * 1.45));
                stopDateStr = (buyDateObj.getMonth() + 1) + "/" + buyDateObj.getDate();
              }
            }
          }
        } catch (e) { }
        return `<tr><td>${o.tier}</td><td>${modeMap[o.mode] || o.mode}</td><td>$${Number(o.buy_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td><td class="hide-on-cover" style="color:var(--danger);">${sellPriceStr}</td><td>${o.qty}</td><td>${stopDateStr}</td></tr>`;
      }).join('');
    }

    function renderOrderTable(orders) {
      const tbody = document.getElementById('orderBody'); if (!orders || orders.length === 0) { tbody.innerHTML = "<tr><td colspan='4' style='padding:20px; color:#64748b;'>주문 없음</td></tr>"; return; }
      tbody.innerHTML = orders.map(o => `<tr><td class="${o[0] === '매수' ? 'buy' : 'sell'}">${o[0]}</td><td>${o[1]}</td><td>$${Number(o[2]).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td><td>${o[3]}주</td></tr>`).join('');
    }

    function togglePeriodView() {
      isMonthlyView = !isMonthlyView;
      document.getElementById('periodTitle').innerHTML = isMonthlyView ? "📅 월별 성과" : "📆 년별 성과";
      document.getElementById('periodTableHead').innerHTML = isMonthlyView ?
        `<th>년/월</th><th class="hide-on-narrow">총자산</th><th>수익률</th><th>수익금</th><th class="hide-on-cover">MDD</th>` :
        `<th>연도</th><th class="hide-on-narrow">총자산</th><th>수익률</th><th>수익금</th><th class="hide-on-cover">MDD</th>`;
      renderPeriodTable();
    }

    function renderPeriodTable() {
      const data = isMonthlyView ? globalMonthlyData : globalYearlyData; const tbody = document.getElementById('periodBody'); if (!data || data.length === 0) { tbody.innerHTML = "<tr><td colspan='5'>데이터가 없습니다.</td></tr>"; return; } const isCoverMode = document.documentElement.classList.contains('is-cover');
      tbody.innerHTML = data.map(row => {
        const rateStr = row.rate > 0 ? '+' + (row.rate * 100).toFixed(1) + '%' : (row.rate * 100).toFixed(1) + '%';
        const profitStr = row.profit > 0 ? '+$' + Math.round(row.profit).toLocaleString() : '$' + Math.round(row.profit).toLocaleString();
        let displayPeriod = row.period;
        if (isMonthlyView && isCoverMode && displayPeriod.length === 7) { displayPeriod = displayPeriod.substring(2).replace('-', '/'); }
        return `<tr><td>${displayPeriod}</td><td class="hide-on-narrow">$${Math.round(row.asset).toLocaleString()}</td><td class="${row.rate > 0 ? 'val-plus' : 'val-minus'}" style="font-size:1.15em; font-weight:800;">${rateStr}</td><td class="${row.profit > 0 ? 'val-plus' : 'val-minus'}">${profitStr}</td><td class="hide-on-cover">${(row.mdd * 100).toFixed(1)}%</td></tr>`;
      }).join('');
    }

    // 상세지표 순서 위치 바꿈 반영
    function renderMetrics(s, days) {
      if (!s) return; document.getElementById('statsTitle').innerText = `📊 성과`; const isValid = (v) => v !== undefined && v !== null && !isNaN(v) && isFinite(v);
      const fmt = (v) => isValid(v) ? '$' + Math.round(Number(v)).toLocaleString() : '-';
      const fmtColor = (v, p) => { if (!isValid(v)) return `<span>-</span>`; let num = Number(v), str = p ? (Math.abs(num) * 100).toFixed(2) + '%' : '$' + Math.round(Math.abs(num)).toLocaleString(); return num > 0 ? `<span class="val-plus">+${str}</span>` : (num < 0 ? `<span class="val-minus">-${str}</span>` : `<span>${str}</span>`); };
      
      const currentMddVal = fmtColor(s.currentMdd, true);
      const monthlyQuick = document.getElementById('monthlyQuickStats');
      if (monthlyQuick) monthlyQuick.innerHTML = `<span class="hide-rate-mobile"><span style="color:var(--text-muted); font-size:1em;">수익률:</span> <span style="font-size:1.1em; font-weight:800;">${fmtColor(s.yield, true)}</span></span>`;
      
      const statsQuick = document.getElementById('statsQuickStats');
      if (statsQuick) statsQuick.innerHTML = `<span style="color:var(--text-muted); font-size:1em;">현재 MDD:</span> <span style="font-weight:800; color:#fff; font-size:1.1em;">${currentMddVal}</span>`;

      const metrics = [
        { label: "총자산", value: fmt(s.totalAssets) },
        { label: "수익률", value: fmtColor(s.yield, true) },
        { label: "전체 MDD", value: fmtColor(s.mdd, true) },
        { label: "진행율", value: fmtColor(s.depletion, true) },
        { label: "총수익금", value: fmtColor(s.totalProfit) },
        { label: "실현수익", value: fmtColor(s.realizedProfit) },
        { label: "평가금", value: fmt(s.evalVal) },
        { label: "칼마비율", value: isValid(s.calmar) ? Number(s.calmar).toFixed(2) : '-' },
        { label: "예수금", value: fmt(s.cash) },
        { label: "평가수익", value: fmtColor(s.evalReturn, true) },
        { label: "주식수", value: (s.qty || 0) + '주' },
        { label: "현재가", value: isValid(s.currPrice) ? '$' + Number(s.currPrice).toFixed(2) : '-' },
        { label: "평균단가", value: isValid(s.avgPrice) ? '$' + Number(s.avgPrice).toFixed(2) : '-' },
        { label: "CAGR", value: fmtColor(s.cagr, true) },
        { label: "갱신금", value: fmt(s.base) }
      ];

      let html = '<div style="display:flex; flex-direction:column; width:100%; gap:2px;">';
      // 3열씩 묶어서 헤더 행 + 값 행(음영 커버)으로 표시
      for (let i = 0; i < metrics.length; i += 3) {
        // 헤더 행 (음영 위)
        html += '<div style="display:flex; padding:0 4px;">';
        for (let j = 0; j < 3; j++) {
          const m = metrics[i + j];
          html += m ? `<div class="metric-label" style="flex:1; text-align:center;">${m.label}</div>` : '<div style="flex:1;"></div>';
        }
        html += '</div>';
        // 값 행 (음영 커버)
        html += '<div style="display:flex; background:rgba(255,255,255,0.04); border-radius:6px; padding:4px 0;">';
        for (let j = 0; j < 3; j++) {
          const m = metrics[i + j];
          html += m ? `<div class="metric-value" style="flex:1; text-align:center;">${m.value}</div>` : '<div style="flex:1;"></div>';
        }
        html += '</div>';
      }
      html += '</div>';
      document.getElementById('statsGrid').innerHTML = html;

    }

    const peakAnnotationPlugin = {
      id: 'peakAnnotation',
      afterDatasetsDraw(chart) {
        const { ctx, scales: { x, y, y1 }, data } = chart; const assetData = data.datasets[0].data, mddData = data.datasets[1].data; if (!assetData || !assetData.length) return;
        let maxAsset = -Infinity, maxAssetIdx = -1, maxMdd = Infinity, maxMddIdx = -1;
        assetData.forEach((val, i) => { if (val > maxAsset) { maxAsset = val; maxAssetIdx = i; } }); mddData.forEach((val, i) => { if (val < maxMdd) { maxMdd = val; maxMddIdx = i; } });
        const fontSize = document.documentElement.classList.contains('is-cover') ? (1.1 * window.innerHeight) / 100 : 12; ctx.save(); ctx.font = `bold ${fontSize}px "Segoe UI", sans-serif`;
        function drawLabel(text, px, py, color, isAsset) { ctx.beginPath(); ctx.arc(px, py, 4, 0, 2 * Math.PI); ctx.fillStyle = color; ctx.fill(); let textX = px - 8, textY = isAsset ? py - 8 : py + 12; ctx.textAlign = 'right'; ctx.textBaseline = isAsset ? 'bottom' : 'top'; if (px < 60) { textX = px + 8; ctx.textAlign = 'left'; } ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'; ctx.strokeText(text, textX, textY); ctx.fillStyle = color; ctx.fillText(text, textX, textY); }
        if (maxAssetIdx >= 0 && isFinite(maxAsset)) drawLabel(`$${Math.round(maxAsset).toLocaleString()}`, x.getPixelForValue(maxAssetIdx), y.getPixelForValue(maxAsset), '#6366f1', true);
        if (maxMddIdx >= 0 && isFinite(maxMdd)) drawLabel(`${maxMdd.toFixed(2)}%`, x.getPixelForValue(maxMddIdx), y1.getPixelForValue(maxMdd), '#ef4444', false); ctx.restore();
      }
    };

    function renderChart(res) {
      if (!res || !res.chartDates) return; if (myChart) myChart.destroy(); document.getElementById('chartBox').innerHTML = '<canvas id="balanceChart"></canvas>'; const ctx = document.getElementById('balanceChart').getContext('2d'); var mddValues = res.chartMdd.map(v => v * 100), worstMdd = Math.min.apply(null, mddValues); var dynamicMddMin = isFinite(worstMdd) ? Math.floor(worstMdd) - 10 : -50; const chartFontSize = document.documentElement.classList.contains('is-cover') ? (1.1 * window.innerHeight) / 100 : 12; Chart.defaults.font.size = chartFontSize;

      const assetGradient = ctx.createLinearGradient(0, 0, 0, 400);
      assetGradient.addColorStop(0, 'rgba(99, 102, 241, 0.4)');
      assetGradient.addColorStop(1, 'rgba(99, 102, 241, 0)');

      myChart = new Chart(ctx, { type: 'line', data: { labels: res.chartDates, datasets: [{ label: '자산', data: res.chartBalances, borderColor: '#6366f1', yAxisID: 'y', borderWidth: 2, pointRadius: 0, fill: true, backgroundColor: assetGradient, tension: 0.2 }, { label: 'MDD', data: mddValues, borderColor: '#ef4444', borderDash: [4, 4], yAxisID: 'y1', borderWidth: 1, pointRadius: 0, fill: false, tension: 0.2 }] }, options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: false }, tooltip: { enabled: true, backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1, padding: 12, titleFont: { family: 'Outfit', size: chartFontSize + 2, weight: '700' }, bodyFont: { family: 'Inter', size: chartFontSize }, cornerRadius: 12, displayColors: true }, zoom: { pan: { enabled: true, mode: 'x' }, zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' } } }, scales: { x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: chartFontSize }, color: '#94a3b8' } }, y: { position: 'left', grace: '10%', grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { font: { family: 'Inter', size: chartFontSize }, color: '#94a3b8' } }, y1: { position: 'right', min: dynamicMddMin, max: 0, grid: { display: false }, ticks: { font: { family: 'Inter', size: chartFontSize }, color: '#ef4444' } } } }, plugins: [peakAnnotationPlugin] });
    }

    function toggleSettings() { const w = document.getElementById('settingsWrapper'), grid = document.getElementById('mainGrid'), btn = document.getElementById('btnToggleSettings'), isOpening = (w.style.display === 'none' || w.style.display === ''); w.style.display = isOpening ? 'flex' : 'none'; btn.innerText = isOpening ? '⚙️ 설정 (닫기)' : '⚙️ 설정 (열기)'; if (isOpening) { grid.classList.add('expanded-settings'); } else { grid.classList.remove('expanded-settings'); } if (myChart) { setTimeout(() => myChart.resize(), 100); } }
    function toggleAdvanced() { const a = document.getElementById('advancedSettings'); a.style.display = a.style.display === 'none' ? 'block' : 'none'; if (myChart) { setTimeout(() => myChart.resize(), 100); } }