// UI 모듈: 알림, 토스트, 로딩 상태 관리
// 함수: setBtnLoading, showToast, triggerIconAnim, showRankingModal, showPriceInfoView

function setBtnLoading(btnId, loadingText) {
  const btn = document.getElementById(btnId);
  if (!btn) return () => { };
  const orgHtml = btn.innerHTML;
  btn.innerHTML = loadingText;
  btn.disabled = true;
  return () => { btn.innerHTML = orgHtml; btn.disabled = false; };
}

function showToast(msg, icon = "🔔") {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>${icon}</span> ${msg}`;
  container.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 2500);
}

function triggerIconAnim(iconId) {
  const icon = document.getElementById(iconId);
  if (icon) { icon.classList.remove('icon-rotate'); void icon.offsetWidth; icon.classList.add('icon-rotate'); }
}

function showRankingModal() {
  if (isManualBacktestMode) {
    return openRankingModal('backtest');
  } else {
    return openRankingModal('live');
  }
}

// 랭킹 렌더링 헬퍼 유틸리티 (openRankingModal에서 활용하는 파싱 로직 포함)
function renderRankingsUI(list, contentEl, overlay) {
  try {
    // [정렬] 수익률 기준 내림차순 정렬
    const totalRank = [...list].sort((a, b) => b.totalYield - a.totalYield);
    const yearlyRank = [...list].sort((a, b) => {
      const rA = a.yearlyRate !== null ? a.yearlyRate : -Infinity;
      const rB = b.yearlyRate !== null ? b.yearlyRate : -Infinity;
      return rB - rA;
    });
    const monthlyRank = [...list].sort((a, b) => {
      const rA = a.monthlyRate !== null ? a.monthlyRate : -Infinity;
      const rB = b.monthlyRate !== null ? b.monthlyRate : -Infinity;
      return rB - rA;
    });

    // [정렬] MDD 기준 내림차순 정렬 (0%에 가까운, 즉 낙폭이 가장 작고 하락방어가 우수한 순서)
    const totalMddRank = [...list].sort((a, b) => {
      const vA = a.totalMdd !== null ? a.totalMdd : -Infinity;
      const vB = b.totalMdd !== null ? b.totalMdd : -Infinity;
      return vB - vA;
    });
    const yearlyMddRank = [...list].sort((a, b) => {
      const vA = a.yearlyMdd !== null ? a.yearlyMdd : -Infinity;
      const vB = b.yearlyMdd !== null ? b.yearlyMdd : -Infinity;
      return vB - vA;
    });
    const monthlyMddRank = [...list].sort((a, b) => {
      const vA = a.monthlyMdd !== null ? a.monthlyMdd : -Infinity;
      const vB = b.monthlyMdd !== null ? b.monthlyMdd : -Infinity;
      return vB - vA;
    });

    // [정렬] 칼마비율 기준 내림차순 정렬 (칼마비율이 높을수록 효율적인 투자법)
    const totalCalmarRank = [...list].sort((a, b) => {
      const vA = a.totalCalmar !== null ? a.totalCalmar : -Infinity;
      const vB = b.totalCalmar !== null ? b.totalCalmar : -Infinity;
      return vB - vA;
    });
    const yearlyCalmarRank = [...list].sort((a, b) => {
      const vA = a.yearlyCalmar !== null ? a.yearlyCalmar : -Infinity;
      const vB = b.yearlyCalmar !== null ? b.yearlyCalmar : -Infinity;
      return vB - vA;
    });
    const monthlyCalmarRank = [...list].sort((a, b) => {
      const vA = a.monthlyCalmar !== null ? a.monthlyCalmar : -Infinity;
      const vB = b.monthlyCalmar !== null ? b.monthlyCalmar : -Infinity;
      return vB - vA;
    });

    const getRankEmoji = (idx) => {
      if (idx === 0) return '🥇';
      if (idx === 1) return '🥈';
      if (idx === 2) return '🥉';
      return `<span style="opacity: 0.6; font-size: calc(var(--app-font-size, 10.5px) - 1.5px) !important;">${idx + 1}위</span>`;
    };

    const getRateText = (val, isBold = false) => {
      if (val === null || val === undefined || val === -Infinity) return `<span style="color:var(--text-muted);">-</span>`;
      const num = val * 100;
      const cls = num > 0 ? 'val-plus' : (num < 0 ? 'val-minus' : '');
      const prefix = num > 0 ? '+' : '';
      return `<span class="${cls}" style="font-weight: ${isBold ? '700' : '400'}; font-size: var(--app-font-size, 10.5px) !important;">${prefix}${num.toFixed(1)}%</span>`;
    };

    const getMddText = (val, isBold = false) => {
      if (val === null || val === undefined || val === -Infinity) return `<span style="color:var(--text-muted);">-</span>`;
      const num = val * 100;
      const cls = num < 0 ? 'val-minus' : '';
      return `<span class="${cls}" style="font-weight: ${isBold ? '700' : '400'}; font-size: var(--app-font-size, 10.5px) !important;">${num.toFixed(1)}%</span>`;
    };

    const getCalmarText = (val, isBold = false) => {
      if (val === null || val === undefined || val === -Infinity || isNaN(val)) return `<span style="color:var(--text-muted);">-</span>`;
      const cls = val > 1 ? 'val-plus' : (val < 0.5 ? 'val-minus' : '');
      return `<span class="${cls}" style="font-weight: ${isBold ? '700' : '400'}; font-size: var(--app-font-size, 10.5px) !important;">${val.toFixed(2)}</span>`;
    };

    const renderRankTable = (title, sortedList, key, showRank = false, valType = 'rate') => {
      const isLight = document.body.classList.contains('light-mode');
      const titleColor = isLight ? '#0f172a' : '#f8fafc';

      const flexStyle = showRank ? 'flex: 1.15 1 34%; min-width: 105px;' : 'flex: 0.92 1 28%; min-width: 90px;';
      const cardPadding = showRank ? '6px 6px 4.8px 6px' : '6px';
      const namePaddingRight = showRank ? '8px' : '4px';

      const defaultTextColor = isLight ? '#0f172a' : '#f8fafc';

      let rowsHtml = sortedList.map((item, idx) => {
        const val = item[key];
        const isBold = idx < 3;
        const fontWeightStyle = isBold ? '700' : '400';
        const nameColor = isBold ? item.color : defaultTextColor;

        const rankCol = showRank ? `
          <td style="padding: 4px 2px; text-align: center; font-weight: ${fontWeightStyle}; width: 22px; vertical-align: middle; font-size: var(--app-font-size, 10.5px) !important;">
            ${getRankEmoji(idx)}
          </td>
        ` : '';

        const displayValText = valType === 'calmar' ? getCalmarText(val, isBold) : (valType === 'mdd' ? getMddText(val, isBold) : getRateText(val, isBold));

        return `
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.03); height: 26px;">
            ${rankCol}
            <td style="padding: 4px ${namePaddingRight} 4px 4px; text-align: left; font-weight: ${fontWeightStyle}; color: ${nameColor}; font-size: var(--app-font-size, 10.5px) !important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; vertical-align: middle;" title="${item.name}">
              ${item.name}
            </td>
            <td style="padding: 4px 2px; text-align: right; font-size: var(--app-font-size, 10.5px) !important; font-weight: ${fontWeightStyle}; width: 55px; vertical-align: middle;">
              ${displayValText}
            </td>
          </tr>
        `;
      }).join('');

      return `
        <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: ${cardPadding}; box-sizing: border-box; ${flexStyle} max-width: 100%;">
          <h4 style="margin: 0 0 6px 0; font-size: calc(var(--app-font-size, 10.5px) + 0.5px) !important; font-weight: 700; color: ${titleColor}; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${title}</h4>
          <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      `;
    };

    let html = '';

    // 1행: 수익률 랭킹 영역
    html += '<div style="display:flex; flex-direction:row; flex-wrap:wrap; gap:4px; width:100%; justify-content:space-between; margin-bottom:3px;">';
    html += renderRankTable('📈 총수익률', totalRank, 'totalYield', true, 'rate');
    html += renderRankTable('📅 년수익률', yearlyRank, 'yearlyRate', false, 'rate');
    html += renderRankTable('🌙 월수익률', monthlyRank, 'monthlyRate', false, 'rate');
    html += '</div>';

    // 가로 구분선
    html += '<div style="width:100%; height:1px; background:rgba(255,255,255,0.08); margin:5px 0 5px 0; box-sizing:border-box;"></div>';

    // 2행: MDD 랭킹 영역
    html += '<div style="display:flex; flex-direction:row; flex-wrap:wrap; gap:4px; width:100%; justify-content:space-between; margin-bottom:3px;">';
    html += renderRankTable('📉 총 MDD', totalMddRank, 'totalMdd', true, 'mdd');
    html += renderRankTable('📅 년 MDD', yearlyMddRank, 'yearlyMdd', false, 'mdd');
    html += renderRankTable('🌙 월 MDD', monthlyMddRank, 'monthlyMdd', false, 'mdd');
    html += '</div>';

    // 가로 구분선
    html += '<div style="width:100%; height:1px; background:rgba(255,255,255,0.08); margin:5px 0 5px 0; box-sizing:border-box;"></div>';

    // 3행: 칼마비율 랭킹 영역
    html += '<div style="display:flex; flex-direction:row; flex-wrap:wrap; gap:4px; width:100%; justify-content:space-between;">';
    html += renderRankTable('⚖️ 총 칼마', totalCalmarRank, 'totalCalmar', true, 'calmar');
    html += renderRankTable('📅 년 칼마', yearlyCalmarRank, 'yearlyCalmar', false, 'calmar');
    html += renderRankTable('🌙 월 칼마', monthlyCalmarRank, 'monthlyCalmar', false, 'calmar');
    html += '</div>';

    contentEl.innerHTML = html;
    overlay.style.display = 'flex';
  } catch (e) {
    console.error("showRankingModal 실행 중 에러 발생:", e);
    showToast("랭킹 화면을 생성하는 중 에러가 발생했습니다.", "⚠️");
  }
}

function showPriceInfoView() {
  restoreFromPerfLayout();

  if (isManualBacktestMode) {
    restoreLocalCache();
    showToast("실전 데이터 모드로 복귀했습니다.", "🔄");
  }

  isStatsMode = false;
  window.isStatsMode = false;
  isOrderView = false;
  window.isOrderView = false;

  // 탑바 아이콘들의 활성화 탭 갱신
  const btnStats = document.getElementById('btnStatsShow');
  if (btnStats) btnStats.classList.remove('active');
  const btnPerf = document.getElementById('btnPerfShow');
  if (btnPerf) btnPerf.classList.remove('active');
  const btnInstant = document.getElementById('btnInstant');
  if (btnInstant) btnInstant.classList.remove('active');
  const btnPrice = document.getElementById('btnPriceInfo');
  if (btnPrice) btnPrice.classList.add('active');
  const btnAnalysis = document.getElementById('btnAnalysis');
  if (btnAnalysis) btnAnalysis.classList.remove('active');

  const grid = document.getElementById('mainGrid');
  if (grid) {
    grid.classList.remove('perf-metrics-layout', 'backtest-view-layout', 'perf-tab-layout', 'order-expanded', 'monthly-expanded', 'analysis-expanded');
    grid.classList.add('price-info-expanded');
  }

  // 성과 분석 패널 숨기기
  const perfAnalysisCard = document.getElementById('panelAnalysisView');
  if (perfAnalysisCard) {
    perfAnalysisCard.classList.add('hidden');
    perfAnalysisCard.style.display = 'none';
  }
  const analysisCurrencyBtnHide = document.getElementById('btnCurrencyToggleAnalysis');
  if (analysisCurrencyBtnHide) analysisCurrencyBtnHide.style.display = 'none';
  if (window.UI && window.UI.performance && window.UI.performance.destroyAnalysisCharts) {
    window.UI.performance.destroyAnalysisCharts();
  }

  const priceInfoCard = document.getElementById('panelPriceInfo');
  if (priceInfoCard) {
    priceInfoCard.classList.remove('hidden');
    priceInfoCard.style.display = 'flex';
  }

  // 하단 주가 정보 아이콘은 항상 종합 주가 정보 화면으로 진입 (개별 티커 선택 상태 무시)
  window.priceInfoTicker = 'total';

  window.UI.priceInfo.loadPriceInfoViewData();
}

function showPerformanceAnalysisView() {
  restoreFromPerfLayout();

  if (isManualBacktestMode) {
    restoreLocalCache();
    showToast("실전 데이터 모드로 복귀했습니다.", "🔄");
  }

  isStatsMode = false;
  window.isStatsMode = false;
  isOrderView = false;
  window.isOrderView = false;

  // 탑바 아이콘들의 활성화 탭 갱신
  const btnStats = document.getElementById('btnStatsShow');
  if (btnStats) btnStats.classList.remove('active');
  const btnPerf = document.getElementById('btnPerfShow');
  if (btnPerf) btnPerf.classList.remove('active');
  const btnInstant = document.getElementById('btnInstant');
  if (btnInstant) btnInstant.classList.remove('active');
  const btnAnalysis = document.getElementById('btnAnalysis');
  if (btnAnalysis) btnAnalysis.classList.add('active');

  const grid = document.getElementById('mainGrid');
  if (grid) {
    grid.classList.remove('perf-metrics-layout', 'backtest-view-layout', 'perf-tab-layout', 'order-expanded', 'monthly-expanded', 'price-info-expanded');
    grid.classList.add('analysis-expanded');
  }

  // 주가정보 패널 숨기기
  const priceInfoCard = document.getElementById('panelPriceInfo');
  if (priceInfoCard) {
    priceInfoCard.classList.add('hidden');
    priceInfoCard.style.display = 'none';
  }

  // 성과 분석 패널 표시 (panelAnalysisView)
  const perfAnalysisCard = document.getElementById('panelAnalysisView');
  if (perfAnalysisCard) {
    perfAnalysisCard.classList.remove('hidden');
    perfAnalysisCard.style.display = 'flex';
  }

  // restoreFromPerfLayout()이 모든 .btn-currency-toggle을 숨기므로 이 화면 것만 다시 표시
  const analysisCurrencyBtn = document.getElementById('btnCurrencyToggleAnalysis');
  if (analysisCurrencyBtn) analysisCurrencyBtn.style.display = 'flex';

  // 성과 분석 화면 렌더링
  if (window.UI && window.UI.performance && window.UI.performance.renderAnalysisView) {
    window.UI.performance.renderAnalysisView();
  }
}

// 년/월 수익률을 연 환산(CAGR)한다. 총 CAGR(s.cagr, engine.js runBacktestMemory의
// `yrs = (endDate-startDate)/(1000*60*60*24*365.25)` 공식)과 정확히 같은 기준을 쓰도록:
// - 365.25 기준을 동일하게 사용
// - 해당 구간이 백테스트의 첫 구간이면 시작 경계를 실제 첫 거래일 대신 설정된 시작일로,
//   마지막 구간이면 끝 경계를 실제 마지막 거래일 대신 설정된 종료일(또는 현재시각)로 맞춘다.
//   (실제 첫 거래일은 공휴일 등으로 설정 시작일보다 며칠 늦을 수 있어, 그대로 두면
//    총 기간과 년/월 구간이 완전히 일치해도 CAGR이 미세하게 달라지는 문제가 있었음)
function getPeriodCalendarDays(periodKey, dailyRows, boundaryStart, boundaryEnd) {
  if (!periodKey || !Array.isArray(dailyRows) || dailyRows.length === 0) return 0;
  const toDate = (s) => {
    const p = String(s).split('-');
    return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
  };
  const matching = dailyRows.filter(d => d && typeof d.period === 'string' && d.period.startsWith(periodKey));
  if (matching.length === 0) return 0;
  // ⚠️ dailyRows는 최신순(내림차순)으로 저장되므로 matching[0]가 최신·matching[last]가 최오래다.
  //    단순히 first=matching[0], last=matching[last]로 두면 (last-first)가 음수가 되어
  //    days가 1/24로 붕괴 → 연환산 지수가 폭발(예: e+130)한다. 순서와 무관하게 최소/최대로 구한다.
  let first = null, last = null;
  for (const d of matching) {
    const dt = toDate(d.period);
    if (isNaN(dt)) continue;
    if (first === null || dt < first) first = dt;
    if (last === null || dt > last) last = dt;
  }
  if (first === null || last === null) return 0;
  if (boundaryStart instanceof Date && !isNaN(boundaryStart) && boundaryStart < first) first = boundaryStart;
  if (boundaryEnd instanceof Date && !isNaN(boundaryEnd) && boundaryEnd > last) last = boundaryEnd;
  // 총 CAGR(yrs 계산)과 동일하게 반올림 없이 소수 일수 그대로 사용
  return Math.max(1 / 24, (last - first) / 86400000);
}
function annualizePeriodRate(rate, periodKey, dailyRows, boundaryStart, boundaryEnd, daysPerYear) {
  if (rate === null || rate === undefined) return rate;
  const days = getPeriodCalendarDays(periodKey, dailyRows, boundaryStart, boundaryEnd);
  if (!days) return rate;
  // 총 CAGR과 정확히 같은 기준으로 연환산해야 총/년/월 CAGR이 일치한다.
  //  - 실전(engine.js live 경로): 365, 실제 데이터 구간(마지막 거래일까지)
  //  - 백테스트(engine.js runBacktestMemory): 365.25, 설정 종료일(또는 현재시각)까지
  const base = (typeof daysPerYear === 'number' && daysPerYear > 0) ? daysPerYear : 365.25;
  const v = Math.pow(1 + rate, base / days) - 1;
  return (isFinite(v) && !isNaN(v)) ? v : rate;
}
// engine.js와 정확히 같은 기준으로 endDate를 계산한다: 종료일이 비어있으면 "오늘(현재시각)"
// engine.js의 `endDate.setHours(23, 59, 59, 999)` 동일 적용 필수
function getConfigBoundaryDates(cfgBasics) {
  if (!cfgBasics || !cfgBasics.startDate) return { start: null, end: null };
  const start = new Date(cfgBasics.startDate);
  const end = (cfgBasics.endDate && String(cfgBasics.endDate).trim() !== "") ? new Date(cfgBasics.endDate) : new Date();
  end.setHours(23, 59, 59, 999);
  return {
    start: isNaN(start) ? null : start,
    end: (end && isNaN(end)) ? null : end
  };
}

// 년/월 배열은 최신순(내림차순)으로 저장되므로 [length-1]은 "가장 오래된" 기간이다.
// 랭킹은 "최신" 년/월을 써야 하므로 정렬해서 최신 period를 고른다(live 모드의 getSlotLatestPeriodRow와 동일 기준).
function pickLatestPeriodRow(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return [...rows].filter(r => r && r.period)
    .sort((a, b) => String(b.period).localeCompare(String(a.period)))[0] || null;
}

function openRankingModal(mode = 'backtest') {
  try {
    const overlay = document.getElementById('rankingOverlay');
    const contentEl = document.getElementById('rankingModalContent');
    const titleEl = overlay ? overlay.querySelector('h3') : null;
    if (!overlay || !contentEl) return;

    overlay.setAttribute('data-mode', mode);
    const rankingCurrencyBtn = overlay.querySelector('.btn-currency-toggle');
    if (rankingCurrencyBtn) {
      rankingCurrencyBtn.style.display = 'flex';
    }

    if (titleEl) {
      titleEl.innerHTML = mode === 'live' ? '🏆 실전랭킹' : '🏆 BT랭킹';
    }

    const list = [];
    if (mode === 'backtest') {
      for (let i = 1; i <= MAX_SLOTS; i++) {
        // 🔒 백테스트 결과는 lastManualBTResults에서만 가져옴 (실전 데이터로 덮어씌워지지 않음)
        const res = window.lastManualBTResults?.[i] || lastBTResults[i];
        if (!res || !res.summary) continue;
        const s = res.summary; // 항상 summary 사용 (실전 데이터와 섞이지 않도록)

        // ⭐️ simulationConfigs는 새로고침 시 메모리에서 사라지는 런타임 전용 값이므로,
        // 없으면 복원된 res.currentStrat(스냅샷에 저장됨)을 폴백으로 사용해
        // F5 후에도 BT랭킹이 유지되도록 한다.
        const cfg = simulationConfigs[i];
        const strategyName = (cfg && cfg.basics && cfg.basics.strategy) || res.currentStrat || `투자법 ${i}`;
        const slotColor = SLOT_COLORS[(i - 1) % SLOT_COLORS.length];
        const tAssets = s.totalAssets !== undefined ? s.totalAssets : (s.total_assets || 0);
        const rPrincipal = s.realPrincipal !== undefined ? s.realPrincipal : (s.base || s.base_principal || 0);
        const totalYield = rPrincipal > 0 ? (tAssets - rPrincipal) / rPrincipal : 0;
        // BT랭킹은 백테스트 데이터만 사용 (실전 globalYearlyDataArr 참조 금지)
        // ⚠️ 최신순 정렬 데이터라 [length-1]은 최오래 기간 → 최신 기간을 정렬로 선택
        const yRow = pickLatestPeriodRow(res.yearlyData);
        const yearlyRate = yRow ? Number(yRow.rate || 0) : null;
        const mRow = pickLatestPeriodRow(res.monthlyData);
        const monthlyRate = mRow ? Number(mRow.rate || 0) : null;
        const totalMdd = s.mdd !== undefined ? s.mdd : 0;
        const yearlyMdd = yRow ? Number(yRow.mdd || 0) : null;
        const monthlyMdd = mRow ? Number(mRow.mdd || 0) : null;
        const totalCagr = s.cagr !== undefined ? s.cagr : null;
        const { start: cfgStart, end: cfgEnd } = getConfigBoundaryDates(cfg && cfg.basics);
        const isOnlyYear = res.yearlyData && res.yearlyData.length === 1;
        const isOnlyMonth = res.monthlyData && res.monthlyData.length === 1;
        const yearlyCagr = yRow ? annualizePeriodRate(yearlyRate, yRow.period, res.dailyData, isOnlyYear ? cfgStart : null, cfgEnd) : null;
        const monthlyCagr = mRow ? annualizePeriodRate(monthlyRate, mRow.period, res.dailyData, isOnlyMonth ? cfgStart : null, cfgEnd) : null;
        // 칼마비율 = CAGR(연환산 수익률) / MDD (단순 구간 수익률이 아님)
        const totalCalmar = s.calmar !== undefined ? s.calmar : 0;
        const yearlyCalmar = (yearlyCagr !== null && yRow && yRow.mdd && yRow.mdd !== 0) ? Math.abs(yearlyCagr / Number(yRow.mdd)) : null;
        const monthlyCalmar = (monthlyCagr !== null && mRow && mRow.mdd && mRow.mdd !== 0) ? Math.abs(monthlyCagr / Number(mRow.mdd)) : null;

        list.push({
          slotNum: i,
          name: strategyName,
          color: slotColor,
          totalProfit: tAssets - rPrincipal,
          yearlyProfit: yRow ? Number(yRow.profit || 0) : null,
          monthlyProfit: mRow ? Number(mRow.profit || 0) : null,
          totalYield: totalYield,
          yearlyRate: yearlyRate,
          monthlyRate: monthlyRate,
          totalMdd: totalMdd,
          yearlyMdd: yearlyMdd,
          monthlyMdd: monthlyMdd,
          totalCalmar: totalCalmar,
          yearlyCalmar: yearlyCalmar,
          monthlyCalmar: monthlyCalmar,
          totalCagr: totalCagr,
          yearlyCagr: yearlyCagr,
          monthlyCagr: monthlyCagr
        });
      }
    }
    if (mode === 'live') {
      for (let i = 1; i <= MAX_SLOTS; i++) {
        const liveCfg = slotConfigs[i];
        const isLiveActive = !!(liveCfg && liveCfg.basics && liveCfg.basics.strategy && liveCfg.basics.strategy !== "정지");
        if (!isLiveActive) continue;
        const res = getBestResult(lastBTResults[i], i);
        const displaySummary = res ? window.UI.stats.getDisplayStatusData(res, i) : null;
        if (!displaySummary) continue;

        const strategyName = getSlotConfig(i)?.basics?.strategy || `투자법${i}`;
        const slotColor = SLOT_COLORS[(i - 1) % SLOT_COLORS.length];
        const tAssets = displaySummary.totalAssets !== undefined ? displaySummary.totalAssets : (displaySummary.total_assets || 0);
        const rPrincipal = displaySummary.realPrincipal !== undefined ? displaySummary.realPrincipal : (displaySummary.base || displaySummary.base_principal || 0);
        const totalYield = rPrincipal > 0 ? (tAssets - rPrincipal) / rPrincipal : 0;
        const yRow = getSlotLatestPeriodRow(i, 'year');
        const yearlyRate = yRow ? Number(yRow.rate || 0) : null;
        const mRow = getSlotLatestPeriodRow(i, 'month');
        const monthlyRate = mRow ? Number(mRow.rate || 0) : null;
        const totalMdd = displaySummary.mdd !== undefined ? displaySummary.mdd : 0;
        const yearlyMdd = yRow ? Number(yRow.mdd || 0) : null;
        const monthlyMdd = mRow ? Number(mRow.mdd || 0) : null;
        const totalCagr = displaySummary.cagr !== undefined ? displaySummary.cagr : null;
        // 실전 총 CAGR(engine.js live 경로)은 "실제 일별 데이터 구간(첫~마지막 거래일), 365일" 기준이다.
        // 년/월 CAGR도 현재시각으로 늘리지 말고 동일 기준(경계 없음 + 365)으로 계산해 총 CAGR과 일치시킨다.
        // (단일 년 백테스트면 년 구간 = 총 구간 → 년 CAGR = 총 CAGR)
        const yearlyCagr = yRow ? annualizePeriodRate(yearlyRate, yRow.period, globalDailyDataArr[i], null, null, 365) : null;
        const monthlyCagr = mRow ? annualizePeriodRate(monthlyRate, mRow.period, globalDailyDataArr[i], null, null, 365) : null;
        // 칼마비율 = CAGR(연환산 수익률) / MDD (단순 구간 수익률이 아님)
        const totalCalmar = displaySummary.calmar !== undefined ? displaySummary.calmar : 0;
        const yearlyCalmar = (yearlyCagr !== null && yRow && yRow.mdd && yRow.mdd !== 0) ? Math.abs(yearlyCagr / Number(yRow.mdd)) : null;
        const monthlyCalmar = (monthlyCagr !== null && mRow && mRow.mdd && mRow.mdd !== 0) ? Math.abs(monthlyCagr / Number(mRow.mdd)) : null;

        list.push({
          slotNum: i,
          name: strategyName,
          color: slotColor,
          totalProfit: tAssets - rPrincipal,
          yearlyProfit: yRow ? Number(yRow.profit || 0) : null,
          monthlyProfit: mRow ? Number(mRow.profit || 0) : null,
          totalYield: totalYield,
          yearlyRate: yearlyRate,
          monthlyRate: monthlyRate,
          totalMdd: totalMdd,
          yearlyMdd: yearlyMdd,
          monthlyMdd: monthlyMdd,
          totalCalmar: totalCalmar,
          yearlyCalmar: yearlyCalmar,
          monthlyCalmar: monthlyCalmar,
          totalCagr: totalCagr,
          yearlyCagr: yearlyCagr,
          monthlyCagr: monthlyCagr
        });
      }
    }

    if (list.length === 0) {
      contentEl.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted);">${mode === 'live' ? '실전 운용 데이터가 있는 활성 투자법이 없습니다.' : 'BT랭킹 데이터가 있는 활성 투자법이 없습니다.'}</div>`;
      overlay.style.display = 'flex';
      return;
    }

    const totalProfitRank = [...list].sort((a, b) => (b.totalProfit ?? -Infinity) - (a.totalProfit ?? -Infinity));
    const yearlyProfitRank = [...list].sort((a, b) => (b.yearlyProfit ?? -Infinity) - (a.yearlyProfit ?? -Infinity));
    const monthlyProfitRank = [...list].sort((a, b) => (b.monthlyProfit ?? -Infinity) - (a.monthlyProfit ?? -Infinity));
    const totalRank = [...list].sort((a, b) => b.totalYield - a.totalYield);
    const yearlyRank = [...list].sort((a, b) => {
      const rA = a.yearlyRate !== null ? a.yearlyRate : -Infinity;
      const rB = b.yearlyRate !== null ? b.yearlyRate : -Infinity;
      return rB - rA;
    });
    const monthlyRank = [...list].sort((a, b) => {
      const rA = a.monthlyRate !== null ? a.monthlyRate : -Infinity;
      const rB = b.monthlyRate !== null ? b.monthlyRate : -Infinity;
      return rB - rA;
    });
    const totalMddRank = [...list].sort((a, b) => {
      const vA = a.totalMdd !== null ? a.totalMdd : -Infinity;
      const vB = b.totalMdd !== null ? b.totalMdd : -Infinity;
      return vB - vA;
    });
    const yearlyMddRank = [...list].sort((a, b) => {
      const vA = a.yearlyMdd !== null ? a.yearlyMdd : -Infinity;
      const vB = b.yearlyMdd !== null ? b.yearlyMdd : -Infinity;
      return vB - vA;
    });
    const monthlyMddRank = [...list].sort((a, b) => {
      const vA = a.monthlyMdd !== null ? a.monthlyMdd : -Infinity;
      const vB = b.monthlyMdd !== null ? b.monthlyMdd : -Infinity;
      return vB - vA;
    });
    const totalCalmarRank = [...list].sort((a, b) => {
      const vA = a.totalCalmar !== null ? a.totalCalmar : -Infinity;
      const vB = b.totalCalmar !== null ? b.totalCalmar : -Infinity;
      return vB - vA;
    });
    const yearlyCalmarRank = [...list].sort((a, b) => {
      const vA = a.yearlyCalmar !== null ? a.yearlyCalmar : -Infinity;
      const vB = b.yearlyCalmar !== null ? b.yearlyCalmar : -Infinity;
      return vB - vA;
    });
    const monthlyCalmarRank = [...list].sort((a, b) => {
      const vA = a.monthlyCalmar !== null ? a.monthlyCalmar : -Infinity;
      const vB = b.monthlyCalmar !== null ? b.monthlyCalmar : -Infinity;
      return vB - vA;
    });
    const totalCagrRank = [...list].sort((a, b) => {
      const vA = a.totalCagr !== null ? a.totalCagr : -Infinity;
      const vB = b.totalCagr !== null ? b.totalCagr : -Infinity;
      return vB - vA;
    });
    const yearlyCagrRank = [...list].sort((a, b) => {
      const vA = a.yearlyCagr !== null ? a.yearlyCagr : -Infinity;
      const vB = b.yearlyCagr !== null ? b.yearlyCagr : -Infinity;
      return vB - vA;
    });
    const monthlyCagrRank = [...list].sort((a, b) => {
      const vA = a.monthlyCagr !== null ? a.monthlyCagr : -Infinity;
      const vB = b.monthlyCagr !== null ? b.monthlyCagr : -Infinity;
      return vB - vA;
    });

    const getRankEmoji = (idx) => {
      if (idx === 0) return '🥇';
      if (idx === 1) return '🥈';
      if (idx === 2) return '🥉';
      return `<span style="opacity: 0.6; font-size: calc(var(--app-font-size, 10.5px) - 1.5px) !important;">${idx + 1}위</span>`;
    };

    const getMoneyText = (val, isBold = false) => {
      if (val === null || val === undefined || val === -Infinity || isNaN(val)) return `<span style="color:var(--text-muted);">-</span>`;
      const num = Number(val || 0);
      const cls = num > 0 ? 'val-plus' : (num < 0 ? 'val-minus' : '');
      const prefix = num > 0 ? '' : (num < 0 ? '-' : '');
      const abs = Math.abs(num);
      const money = isCurrencyKRW
        ? Math.round(abs * currentFXRate / 10000).toLocaleString() + '만'
        : '$' + Math.round(abs).toLocaleString();
      return `<span class="${cls}" style="font-weight: ${isBold ? '700' : '400'}; font-size: var(--app-font-size, 10.5px) !important;">${prefix}${money}</span>`;
    };
    const getRateText = (val, isBold = false) => {
      if (val === null || val === undefined || val === -Infinity) return `<span style="color:var(--text-muted);">-</span>`;
      const num = val * 100;
      const cls = num > 0 ? 'val-plus' : (num < 0 ? 'val-minus' : '');
      const prefix = num > 0 ? '+' : '';
      return `<span class="${cls}" style="font-weight: ${isBold ? '700' : '400'}; font-size: var(--app-font-size, 10.5px) !important;">${prefix}${num.toFixed(1)}%</span>`;
    };
    const getMddText = (val, isBold = false) => {
      if (val === null || val === undefined || val === -Infinity) return `<span style="color:var(--text-muted);">-</span>`;
      const num = val * 100;
      const cls = num < 0 ? 'val-minus' : '';
      return `<span class="${cls}" style="font-weight: ${isBold ? '700' : '400'}; font-size: var(--app-font-size, 10.5px) !important;">${num.toFixed(1)}%</span>`;
    };
    const getCalmarText = (val, isBold = false) => {
      if (val === null || val === undefined || val === -Infinity || isNaN(val)) return `<span style="color:var(--text-muted);">-</span>`;
      const cls = val > 1 ? 'val-plus' : (val < 0.5 ? 'val-minus' : '');
      return `<span class="${cls}" style="font-weight: ${isBold ? '700' : '400'}; font-size: var(--app-font-size, 10.5px) !important;">${val.toFixed(2)}</span>`;
    };

    const renderRankTable = (title, sortedList, key, showRank = false, valType = 'rate') => {
      const isLight = document.body.classList.contains('light-mode');
      const titleColor = isLight ? '#0f172a' : '#f8fafc';
      const flexStyle = showRank ? 'flex: 1.1 1 0px; min-width: 0;' : 'flex: 1 1 0px; min-width: 0;';
      const cardPadding = showRank ? '6px 4px 4.8px 4px' : '6px 4px';
      const namePaddingRight = '1px';
      const defaultTextColor = isLight ? '#0f172a' : '#f8fafc';

      let rowsHtml = sortedList.map((item, idx) => {
        const val = item[key];
        const isBold = idx < 3;
        const fontWeightStyle = isBold ? '700' : '400';
        const nameColor = isBold ? item.color : defaultTextColor;
        const rankCol = showRank ? `<td style="padding: 4px 0; text-align: left; font-weight: ${fontWeightStyle}; width: 28px; vertical-align: middle; font-size: var(--app-font-size, 10.5px) !important;">${getRankEmoji(idx)}</td>` : '';
        const displayValText = valType === 'calmar'
          ? getCalmarText(val, isBold)
          : (valType === 'mdd'
            ? getMddText(val, isBold)
            : (valType === 'money' ? getMoneyText(val, isBold) : getRateText(val, isBold)));

        return `
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.03); height: 26px;">
            ${rankCol}
            <td style="padding: 4px ${namePaddingRight} 4px 2px; text-align: left; font-weight: ${fontWeightStyle}; color: ${nameColor}; font-size: var(--app-font-size, 10.5px) !important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; vertical-align: middle;" title="${item.name}">
              ${formatStrategyNameWithSmallParentheses(item.name)}
            </td>
            <td style="padding: 4px 2px 4px 1px; text-align: right; font-size: var(--app-font-size, 10.5px) !important; font-weight: ${fontWeightStyle}; vertical-align: middle; white-space: nowrap;">
              ${displayValText}
            </td>
          </tr>
        `;
      }).join('');

      return `
        <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: ${cardPadding}; box-sizing: border-box; ${flexStyle} max-width: 100%;">
          <h4 style="margin: 0 0 6px 0; font-size: calc(var(--app-font-size, 10.5px) + 0.5px) !important; font-weight: 700; color: ${titleColor}; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${title}</h4>
          <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
            <colgroup>
              ${showRank ? '<col style="width: 28px;">' : ''}
              <col style="width: 50%;">
              <col style="width: 50%;">
            </colgroup>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      `;
    };

    let html = '';
    html += '<div style="display:flex; flex-direction:row; flex-wrap:nowrap; gap:4px; width:100%; justify-content:space-between; margin-bottom:3px;">';
    html += renderRankTable('💵 총 수익', totalProfitRank, 'totalProfit', true, 'money');
    html += renderRankTable('📅 년 수익', yearlyProfitRank, 'yearlyProfit', false, 'money');
    html += renderRankTable('🌙 월 수익', monthlyProfitRank, 'monthlyProfit', false, 'money');
    html += '</div>';
    html += '<div style="width:100%; height:1px; background:rgba(255,255,255,0.08); margin:5px 0 5px 0; box-sizing:border-box;"></div>';
    html += '<div style="display:flex; flex-direction:row; flex-wrap:nowrap; gap:4px; width:100%; justify-content:space-between; margin-bottom:3px;">';
    html += renderRankTable('📈 총수익률', totalRank, 'totalYield', true, 'rate');
    html += renderRankTable('📅 년수익률', yearlyRank, 'yearlyRate', false, 'rate');
    html += renderRankTable('🌙 월수익률', monthlyRank, 'monthlyRate', false, 'rate');
    html += '</div>';
    html += '<div style="width:100%; height:1px; background:rgba(255,255,255,0.08); margin:5px 0 5px 0; box-sizing:border-box;"></div>';
    html += '<div style="display:flex; flex-direction:row; flex-wrap:nowrap; gap:4px; width:100%; justify-content:space-between; margin-bottom:3px;">';
    html += renderRankTable('📉 총 MDD', totalMddRank, 'totalMdd', true, 'mdd');
    html += renderRankTable('📅 년 MDD', yearlyMddRank, 'yearlyMdd', false, 'mdd');
    html += renderRankTable('🌙 월 MDD', monthlyMddRank, 'monthlyMdd', false, 'mdd');
    html += '</div>';
    html += '<div style="width:100%; height:1px; background:rgba(255,255,255,0.08); margin:5px 0 5px 0; box-sizing:border-box;"></div>';
    html += '<div style="display:flex; flex-direction:row; flex-wrap:nowrap; gap:4px; width:100%; justify-content:space-between; margin-bottom:3px;">';
    html += renderRankTable('⚖️ 총 칼마', totalCalmarRank, 'totalCalmar', true, 'calmar');
    html += renderRankTable('📅 년 칼마', yearlyCalmarRank, 'yearlyCalmar', false, 'calmar');
    html += renderRankTable('🌙 월 칼마', monthlyCalmarRank, 'monthlyCalmar', false, 'calmar');
    html += '</div>';
    html += '<div style="width:100%; height:1px; background:rgba(255,255,255,0.08); margin:5px 0 5px 0; box-sizing:border-box;"></div>';
    html += '<div style="display:flex; flex-direction:row; flex-wrap:nowrap; gap:4px; width:100%; justify-content:space-between;">';
    html += renderRankTable('🚀 총 CAGR', totalCagrRank, 'totalCagr', true, 'rate');
    html += renderRankTable('📅 년 CAGR', yearlyCagrRank, 'yearlyCagr', false, 'rate');
    html += renderRankTable('🌙 월 CAGR', monthlyCagrRank, 'monthlyCagr', false, 'rate');
    html += '</div>';

    contentEl.innerHTML = html;
    overlay.style.display = 'flex';
    if (typeof syncCurrencyUI === 'function') syncCurrencyUI();
  } catch (e) {
    console.error("openRankingModal 실행 중 에러:", e);
    showToast("랭킹 화면을 생성하는 중 에러가 발생했습니다.", "⚠️");
  }
}

function showBacktestRankingModal() {
  return openRankingModal('backtest');
}

function showLiveRankingModal() {
  return openRankingModal('live');
}

window.showRankingModal = showRankingModal;
window.showPriceInfoView = showPriceInfoView;
window.showPerformanceAnalysisView = showPerformanceAnalysisView;
window.showLiveRankingModal = showLiveRankingModal;
window.showBacktestRankingModal = showBacktestRankingModal;
