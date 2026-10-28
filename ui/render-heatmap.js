// ui/render-heatmap.js
// 연도별·월별 성과 히트맵 모달 렌더러
(function(root) {
  function getHeatmapBgColor(rate) {
    if (rate === null || rate === undefined || isNaN(rate)) return 'rgba(255, 255, 255, 0.03)';
    const pct = rate * 100;
    if (Math.abs(pct) < 0.05) return 'rgba(255, 255, 255, 0.05)';
    if (pct > 0) {
      if (pct >= 25) return 'rgba(16, 185, 129, 0.75)'; // 진한 초록
      if (pct >= 15) return 'rgba(16, 185, 129, 0.60)';
      if (pct >= 8)  return 'rgba(16, 185, 129, 0.45)';
      if (pct >= 3)  return 'rgba(16, 185, 129, 0.32)';
      return 'rgba(16, 185, 129, 0.20)';
    } else {
      const abs = Math.abs(pct);
      if (abs >= 25) return 'rgba(239, 68, 68, 0.75)'; // 진한 빨강
      if (abs >= 15) return 'rgba(239, 68, 68, 0.60)';
      if (abs >= 8)  return 'rgba(239, 68, 68, 0.45)';
      if (abs >= 3)  return 'rgba(239, 68, 68, 0.32)';
      return 'rgba(239, 68, 68, 0.20)';
    }
  }

  function getMetricTextColor(val) {
    if (val === null || val === undefined || isNaN(val)) return '#f8fafc';
    if (val > 0) return '#3b82f6'; // +일 때 파랑
    if (val < 0) return '#ef4444'; // -값일 때만 빨강
    return '#f8fafc';
  }

  function formatPctText(rate) {
    if (rate === null || rate === undefined || isNaN(rate)) return '-';
    const pct = rate * 100;
    const sign = pct > 0 ? '+' : '';
    return `${sign}${pct.toFixed(1)}%`;
  }

  function extractYearlyStats(source, targetYear) {
    // 1) 연간 수익률 (YTD / 연간)
    // 2) 연내 MDD
    // 3) 거래 횟수
    // 4) 승률
    let yData = source?.yearlyData || [];
    let yRow = yData.find(y => String(y.period) === String(targetYear));
    let yYield = yRow ? Number(yRow.rate || 0) : null;
    let yMdd = yRow ? Number(yRow.mdd || 0) : null;

    // trades 집계 (해당 연도 청산 기준)
    let trades = source?.trades || [];
    let yearTrades = trades.filter(t => {
      const sD = t.sellDate || t.date || '';
      return sD.startsWith(String(targetYear));
    });

    let tradeCount = yearTrades.length;
    let winCount = yearTrades.filter(t => Number(t.profit || 0) > 0).length;
    let winRate = tradeCount > 0 ? (winCount / tradeCount) : null;

    return {
      yield: yYield,
      mdd: yMdd,
      tradeCount: tradeCount,
      winRate: winRate
    };
  }

  function openMonthlyHeatmapModal() {
    let overlay = document.getElementById('monthlyHeatmapOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'monthlyHeatmapOverlay';
      overlay.className = 'settings-overlay';
      overlay.style.cssText = 'display:none; z-index:1250; position:fixed; inset:0; background:rgba(0,0,0,0.7); backdrop-filter:blur(3px); align-items:center; justify-content:center;';
      overlay.onclick = (e) => { if (e.target === overlay) closeMonthlyHeatmapModal(); };
      document.body.appendChild(overlay);
    }

    renderHeatmapModalContent(overlay);
    overlay.style.display = 'flex';
  }

  function closeMonthlyHeatmapModal() {
    const overlay = document.getElementById('monthlyHeatmapOverlay');
    if (overlay) overlay.style.display = 'none';
  }

  function getAvailableSources() {
    const list = [];

    // 1. 통합 합산 (Combined)
    const combM = (typeof globalCombinedMonthlyData !== 'undefined' && globalCombinedMonthlyData && globalCombinedMonthlyData.length > 0)
      ? globalCombinedMonthlyData
      : (window.globalCombinedMonthlyData || []);
    const combY = (typeof globalCombinedYearlyData !== 'undefined' && globalCombinedYearlyData && globalCombinedYearlyData.length > 0)
      ? globalCombinedYearlyData
      : (window.globalCombinedYearlyData || []);

    // trades 수집 (모든 활성 슬롯의 trades 합산)
    let combinedTrades = [];
    for (let i = 1; i <= 12; i++) {
      if (typeof isSlotActive === 'function' && isSlotActive(i)) {
        const r = (window.lastBTResults && window.lastBTResults[i]) || (typeof getBestResult === 'function' ? getBestResult(window.lastBTResults?.[i], i) : null);
        if (r && Array.isArray(r.trades)) {
          combinedTrades = combinedTrades.concat(r.trades);
        }
      }
    }

    if (combM.length > 0) {
      list.push({
        id: 'Combined',
        name: '통합 합산',
        monthlyData: combM,
        yearlyData: combY,
        trades: combinedTrades
      });
    }

    // 2. 리밸런싱 (Rebalanced)
    if (window.cachedRebalanceResult) {
      list.push({
        id: 'Rebalanced',
        name: '리밸런싱 (합산)',
        monthlyData: window.cachedRebalanceResult.monthlyData || [],
        yearlyData: window.cachedRebalanceResult.yearlyData || [],
        trades: combinedTrades
      });
    }

    // 3. 개별 활성 슬롯
    for (let i = 1; i <= 12; i++) {
      if (typeof isSlotActive === 'function' && isSlotActive(i)) {
        const r = (window.lastBTResults && window.lastBTResults[i]) || (typeof getBestResult === 'function' ? getBestResult(window.lastBTResults?.[i], i) : null);
        const cfg = typeof getSlotConfig === 'function' ? getSlotConfig(i) : null;
        const sName = cfg?.basics?.strategy || `슬롯 ${i}`;
        const mData = (window.globalMonthlyDataArr && window.globalMonthlyDataArr[i]) || r?.monthlyData || [];
        const yData = (window.globalYearlyDataArr && window.globalYearlyDataArr[i]) || r?.yearlyData || [];
        const trades = r?.trades || [];

        if (mData.length > 0) {
          list.push({
            id: String(i),
            name: `[슬롯 ${i}] ${sName}`,
            monthlyData: mData,
            yearlyData: yData,
            trades: trades
          });
        }
      }
    }

    return list;
  }

  function renderHeatmapModalContent(overlay) {
    const sources = getAvailableSources();
    if (sources.length === 0) {
      overlay.innerHTML = `
        <div class="settings-modal" style="max-width:500px; width:95%; padding:20px; border-radius:12px; background:var(--card-bg, #1e293b); color:var(--text, #f8fafc); border:1px solid rgba(255,255,255,0.1); text-align:center;">
          <div style="font-size:16px; font-weight:700; margin-bottom:12px; color:var(--primary, #8b5cf6);">📅 연도별·월별 성과 히트맵</div>
          <div style="color:var(--text-muted, #94a3b8); margin-bottom:20px;">백테스트 실행 데이터가 없습니다. 먼저 백테스트를 실행해주세요.</div>
          <button class="btn-action" onclick="window.closeMonthlyHeatmapModal()" style="padding:6px 16px; border-radius:6px; background:var(--primary, #8b5cf6); color:white; border:none; cursor:pointer;">닫기</button>
        </div>
      `;
      return;
    }

    let selectedId = window.__currentHeatmapSourceId || sources[0].id;
    let currentSource = sources.find(s => s.id === selectedId) || sources[0];

    // 월별 데이터를 연도/월 맵으로 구성
    // m.period 형태: "2024-01"
    const yearMonthMap = {};
    const yearsSet = new Set();

    (currentSource.monthlyData || []).forEach(m => {
      if (!m || !m.period) return;
      const parts = m.period.split('-');
      if (parts.length < 2) return;
      const y = parts[0];
      const monthNum = parseInt(parts[1], 10);
      yearsSet.add(y);
      if (!yearMonthMap[y]) yearMonthMap[y] = {};
      yearMonthMap[y][monthNum] = Number(m.rate || 0);
    });

    (currentSource.yearlyData || []).forEach(y => {
      if (!y || !y.period) return;
      yearsSet.add(String(y.period));
    });

    // 최신 연도가 맨 위에 오도록 내림차순 정렬
    const sortedYears = Array.from(yearsSet).sort((a, b) => Number(b) - Number(a));

    const optionsHtml = sources.map(s => `
      <option value="${s.id}" ${s.id === currentSource.id ? 'selected' : ''}>${s.name}</option>
    `).join('');

    let rowsHtml = '';

    sortedYears.forEach(y => {
      const yStats = extractYearlyStats(currentSource, y);
      const yearLabel = y; // 연도에서 YTD 제거

      const yYieldStr = formatPctText(yStats.yield);
      const yYieldColor = getMetricTextColor(yStats.yield); // +일때 파랑, -값일때만 빨강
      const yYieldBg = getHeatmapBgColor(yStats.yield);

      const yMddStr = yStats.mdd !== null ? `${(Math.abs(yStats.mdd) * -100).toFixed(1)}%` : '-';
      const yMddColor = getMetricTextColor(yStats.mdd); // MDD는 음수이므로 빨강
      const tradeCountStr = yStats.tradeCount > 0 ? `${yStats.tradeCount}` : '-';
      const winRateStr = yStats.winRate !== null ? `${(yStats.winRate * 100).toFixed(1)}%` : '-';

      // 1월 ~ 12월 셀 생성 (각 모서리 라운드 & 셀 간격)
      let monthCellsHtml = '';
      for (let m = 1; m <= 12; m++) {
        const val = yearMonthMap[y]?.[m];
        const hasVal = (val !== undefined && val !== null);
        const cellText = hasVal ? formatPctText(val) : '—';
        const cellBg = hasVal ? getHeatmapBgColor(val) : 'rgba(255,255,255,0.03)';
        const cellColor = hasVal ? '#f8fafc' : 'rgba(255,255,255,0.25)'; // 글자색상 기본 흰색

        monthCellsHtml += `
          <td style="padding:0; height:32px;">
            <div style="height:32px; line-height:32px; display:flex; align-items:center; justify-content:center; text-align:center; font-weight:700; background:${cellBg}; color:${cellColor}; border-radius:4px; min-width:44px; font-size:11.5px; box-sizing:border-box;">
              ${cellText}
            </div>
          </td>
        `;
      }

      rowsHtml += `
        <tr style="transition:background 0.15s;">
          <!-- 좌측 요약 카드 테이블 (글자색상 기본 흰색 #f8fafc, 수익률과 MDD만 +파랑/-빨강, 각 셀 라운드 및 균일 높이 32px) -->
          <td style="padding:0; height:32px;"><div style="height:32px; line-height:32px; display:flex; align-items:center; justify-content:center; font-weight:700; color:#f8fafc; background:rgba(30,41,59,0.7); border-radius:4px; white-space:nowrap; font-size:11.5px;">${yearLabel}</div></td>
          <td style="padding:0; height:32px;"><div style="height:32px; line-height:32px; display:flex; align-items:center; justify-content:center; font-weight:800; background:${yYieldBg}; color:${yYieldColor}; border-radius:4px; white-space:nowrap; font-size:11.5px;">${yYieldStr}</div></td>
          <td style="padding:0; height:32px;"><div style="height:32px; line-height:32px; display:flex; align-items:center; justify-content:center; font-weight:700; background:rgba(239,68,68,0.14); color:${yMddColor}; border-radius:4px; white-space:nowrap; font-size:11.5px;">${yMddStr}</div></td>
          <td style="padding:0; height:32px; border-right:2px solid rgba(255,255,255,0.15);"><div style="height:32px; line-height:32px; display:flex; align-items:center; justify-content:center; font-weight:700; color:#f8fafc; background:rgba(30,41,59,0.5); border-radius:4px; white-space:nowrap; font-size:11.5px;">${winRateStr}</div></td>

          <!-- 우측 월별 히트맵 테이블 (1월 ~ 12월) -->
          ${monthCellsHtml}
        </tr>
      `;
    });

    overlay.innerHTML = `
      <div class="settings-modal" style="max-width:1120px; width:98%; max-height:94vh; padding:14px; border-radius:14px; background:#0f172a; color:#f8fafc; border:1px solid rgba(255,255,255,0.12); box-shadow:0 25px 50px -12px rgba(0,0,0,0.7); display:flex; flex-direction:column; box-sizing:border-box;">
        
        <!-- 상단 헤더 -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:8px; flex-wrap:wrap; gap:8px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:18px;">🔥</span>
            <h3 style="margin:0; font-size:16px; color:#f8fafc; font-weight:800; letter-spacing:-0.3px;">연도별·월별 성과</h3>
            <select id="heatmapSourceSelect" onchange="window.onHeatmapSourceChange(this.value)" style="background:rgba(255,255,255,0.1); color:#38bdf8; border:1px solid rgba(56,189,248,0.4); border-radius:6px; padding:3px 8px; font-size:12px; font-weight:700; outline:none; cursor:pointer;">
              ${optionsHtml}
            </select>
          </div>
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="display:flex; align-items:center; gap:6px; font-size:11px; color:#94a3b8;">
              <span style="display:inline-block; width:10px; height:10px; border-radius:2px; background:rgba(239, 68, 68, 0.65);"></span> 손실
              <span style="display:inline-block; width:10px; height:10px; border-radius:2px; background:rgba(16, 185, 129, 0.65); margin-left:4px;"></span> 수익
            </div>
            <button onclick="window.closeMonthlyHeatmapModal()" style="background:transparent; border:none; color:#94a3b8; font-size:20px; font-weight:700; cursor:pointer; padding:0 4px; line-height:1;" title="닫기">✕</button>
          </div>
        </div>

        <!-- 히트맵 테이블 영역 (가로 스크롤 가능, 셀간 여백 border-spacing) -->
        <div class="slim-scroll" style="flex:1; overflow:auto; min-height:0; -webkit-overflow-scrolling:touch; border-radius:8px; border:1px solid rgba(255,255,255,0.08); background:rgba(0,0,0,0.25); padding:8px;">
          <table style="width:100%; border-collapse:separate; border-spacing:3px 3px; font-size:11.5px; text-align:center; min-width:860px;">
            <thead>
              <tr style="color:#94a3b8; font-size:11px; font-weight:700;">
                <!-- 좌측 헤더 -->
                <th style="padding:0; height:32px; line-height:32px; width:48px; color:#f8fafc; background:rgba(30,41,59,0.9); border-radius:4px;">연도</th>
                <th style="padding:0; height:32px; line-height:32px; width:58px; color:#3b82f6; background:rgba(30,41,59,0.9); border-radius:4px;">수익률</th>
                <th style="padding:0; height:32px; line-height:32px; width:54px; color:#ef4444; background:rgba(30,41,59,0.9); border-radius:4px;">MDD</th>
                <th style="padding:0; height:32px; line-height:32px; width:52px; color:#f8fafc; background:rgba(30,41,59,0.9); border-radius:4px; border-right:2px solid rgba(255,255,255,0.15);">승률</th>

                <!-- 우측 헤더 (1월 ~ 12월) -->
                <th style="padding:0; height:32px; line-height:32px; color:#f8fafc; background:rgba(30,41,59,0.9); border-radius:4px;">1월</th>
                <th style="padding:0; height:32px; line-height:32px; color:#f8fafc; background:rgba(30,41,59,0.9); border-radius:4px;">2월</th>
                <th style="padding:0; height:32px; line-height:32px; color:#f8fafc; background:rgba(30,41,59,0.9); border-radius:4px;">3월</th>
                <th style="padding:0; height:32px; line-height:32px; color:#f8fafc; background:rgba(30,41,59,0.9); border-radius:4px;">4월</th>
                <th style="padding:0; height:32px; line-height:32px; color:#f8fafc; background:rgba(30,41,59,0.9); border-radius:4px;">5월</th>
                <th style="padding:0; height:32px; line-height:32px; color:#f8fafc; background:rgba(30,41,59,0.9); border-radius:4px;">6월</th>
                <th style="padding:0; height:32px; line-height:32px; color:#f8fafc; background:rgba(30,41,59,0.9); border-radius:4px;">7월</th>
                <th style="padding:0; height:32px; line-height:32px; color:#f8fafc; background:rgba(30,41,59,0.9); border-radius:4px;">8월</th>
                <th style="padding:0; height:32px; line-height:32px; color:#f8fafc; background:rgba(30,41,59,0.9); border-radius:4px;">9월</th>
                <th style="padding:0; height:32px; line-height:32px; color:#f8fafc; background:rgba(30,41,59,0.9); border-radius:4px;">10월</th>
                <th style="padding:0; height:32px; line-height:32px; color:#f8fafc; background:rgba(30,41,59,0.9); border-radius:4px;">11월</th>
                <th style="padding:0; height:32px; line-height:32px; color:#f8fafc; background:rgba(30,41,59,0.9); border-radius:4px;">12월</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>

        <!-- 하단 푸터 안내 -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; font-size:11px; color:#94a3b8; padding:0 4px; gap:8px;">
          <div style="display:flex; flex-direction:column; gap:2px; line-height:1.4;">
            <span>※ 월별 수익률은 해당 월 시작 잔고 대비 월말 잔고 변동률 기준이며, MDD는 해당 연도 내 최대 낙폭입니다.</span>
            <span>※ 승률은 투자법시작일 기준으로 계산된 값으로 투자법 변경등에 따라 데이터가 정확하지 않음.</span>
          </div>
          <button onclick="window.closeMonthlyHeatmapModal()" style="background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); border-radius:6px; color:#f8fafc; padding:4px 14px; font-weight:700; cursor:pointer; flex-shrink:0;">닫기</button>
        </div>
      </div>
    `;
  }

  window.onHeatmapSourceChange = function(newId) {
    window.__currentHeatmapSourceId = newId;
    const overlay = document.getElementById('monthlyHeatmapOverlay');
    if (overlay) renderHeatmapModalContent(overlay);
  };

  root.openMonthlyHeatmapModal = openMonthlyHeatmapModal;
  root.closeMonthlyHeatmapModal = closeMonthlyHeatmapModal;
  if (typeof window !== 'undefined') {
    window.openMonthlyHeatmapModal = openMonthlyHeatmapModal;
    window.closeMonthlyHeatmapModal = closeMonthlyHeatmapModal;
  }
})(typeof window !== 'undefined' ? window : this);
