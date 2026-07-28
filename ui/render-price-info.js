// ui/render-price-info.js - 주가정보 렌더링 (백업에서 복구됨)

const CORE_PRICE_TICKERS = ['SOXL', 'QQQ', 'TQQQ', 'SOXX', 'KRW=X'];
const COMPOSITE_TICKERS = ['SOXL', 'SOXX', 'TQQQ', 'QQQ'];

async function preloadCorePriceTickers() {
  // priceLoader 데이터는 이미 loadAllSheetPrices()에서 로드됨
  console.log("✅ 주가 선로딩: priceLoader에서 이미 로드됨");
}

window.priceInfoTicker = window.priceInfoTicker || 'total';

function changePriceInfoTicker(ticker) {
  window.priceInfoTicker = ticker;
  loadPriceInfoViewData();
}
window.changePriceInfoTicker = changePriceInfoTicker;

function restoreCacheDates(cacheObj) {
  if (!cacheObj) return;
  if (cacheObj.latest && cacheObj.latest.date) cacheObj.latest.date = new Date(cacheObj.latest.date);
  if (cacheObj.day && cacheObj.day.date) cacheObj.day.date = new Date(cacheObj.day.date);
  if (cacheObj.week && cacheObj.week.date) cacheObj.week.date = new Date(cacheObj.week.date);
  if (cacheObj.month && cacheObj.month.date) cacheObj.month.date = new Date(cacheObj.month.date);
  if (cacheObj.year && cacheObj.year.date) cacheObj.year.date = new Date(cacheObj.year.date);
  if (cacheObj.high && cacheObj.high.date) cacheObj.high.date = new Date(cacheObj.high.date);
  if (cacheObj.low && cacheObj.low.date) cacheObj.low.date = new Date(cacheObj.low.date);
  if (cacheObj.lastYearEnd) cacheObj.lastYearEnd = new Date(cacheObj.lastYearEnd);
  if (cacheObj.rawDates && Array.isArray(cacheObj.rawDates)) {
    cacheObj.rawDates = cacheObj.rawDates.map(d => new Date(d));
  }
}

// 주봉/월봉/년봉 기준: 데이터를 주/월/년 단위로 묶었을 때, 마지막(진행 중인) 봉 이전에
// 완결된 마지막 봉의 종가(=전주말/전월말/전년말 실제 거래일 종가)를 반환한다.
// 단순히 "N일 전과 날짜가 가장 가까운 거래일"을 찾는 방식은 월/년 경계에서
// 다음 달·다음 해로 잘못 넘어가는 오류가 있어(예: 4/30이 휴장일이면 5/1을 "한달전"으로 오인),
// 실제 봉 데이터를 기준으로 직전 완결봉을 찾도록 변경.
function getWeekKey(d) {
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diffToMonday);
  return `${monday.getFullYear()}-${monday.getMonth()}-${monday.getDate()}`;
}
function getMonthKey(d) { return `${d.getFullYear()}-${d.getMonth()}`; }
function getYearKey(d) { return `${d.getFullYear()}`; }

function findLastCompletedPeriodClose(dates, closes, keyFn, currentKey) {
  for (let i = dates.length - 1; i >= 0; i--) {
    if (keyFn(dates[i]) !== currentKey) {
      return { price: closes[i], date: dates[i] };
    }
  }
  return null;
}

function buildTickerViewData(ticker, now) {
  const data = priceLoader.getPriceSeries(ticker);
  if (!data || !data.close || data.close.length === 0) return null;

  const len = data.close.length;
  const latestPrice = data.close[len - 1];
  const latestDate = data.dates[len - 1];

  const findClosestPrice = (targetDate) => {
    const targetTime = targetDate.getTime();
    let closestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < len; i++) {
      const diff = Math.abs(data.dates[i].getTime() - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }
    return {
      price: data.close[closestIdx],
      date: data.dates[closestIdx]
    };
  };

  const oneDayAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const thisMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
  const lastWeekFriday = new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() - 3);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31);

  const dayAgo = (len >= 2) ? {
    price: data.close[len - 2],
    date: data.dates[len - 2]
  } : findClosestPrice(oneDayAgo);
  // 실제 마지막 데이터일(latestDate) 기준으로 "진행 중인 주/월/년"을 판단하고,
  // 그 이전 완결봉의 종가(=주봉/월봉/년봉 종가)를 사용한다.
  const weekAgo = findLastCompletedPeriodClose(data.dates, data.close, getWeekKey, getWeekKey(latestDate))
    || findClosestPrice(lastWeekFriday);
  const monthAgo = findLastCompletedPeriodClose(data.dates, data.close, getMonthKey, getMonthKey(latestDate))
    || findClosestPrice(lastMonthEnd);
  const yearAgo = findLastCompletedPeriodClose(data.dates, data.close, getYearKey, getYearKey(latestDate))
    || findClosestPrice(lastYearEnd);

  const calcRate = (past, current) => {
    if (past === 0) return 0;
    return ((current - past) / past) * 100;
  };

  // 주가 비교의 "1년전" 기준일부터 현재까지 기간 내 최고가/최저가
  const periodStartTime = yearAgo.date.getTime();
  let periodHigh = null;
  let periodLow = null;
  for (let i = 0; i < len; i++) {
    if (data.dates[i].getTime() < periodStartTime) continue;
    const p = data.close[i];
    if (p === null || p === undefined || isNaN(p)) continue;
    if (!periodHigh || p > periodHigh.price) periodHigh = { price: p, date: data.dates[i] };
    if (!periodLow || p < periodLow.price) periodLow = { price: p, date: data.dates[i] };
  }

  return {
    ticker: ticker,
    latest: { price: latestPrice, date: latestDate },
    day: { price: dayAgo.price, date: dayAgo.date, rate: calcRate(dayAgo.price, latestPrice) },
    week: { price: weekAgo.price, date: weekAgo.date, rate: calcRate(weekAgo.price, latestPrice) },
    month: { price: monthAgo.price, date: monthAgo.date, rate: calcRate(monthAgo.price, latestPrice) },
    year: { price: yearAgo.price, date: yearAgo.date, rate: calcRate(yearAgo.price, latestPrice) },
    high: periodHigh ? { price: periodHigh.price, date: periodHigh.date, rate: calcRate(periodHigh.price, latestPrice) } : null,
    low: periodLow ? { price: periodLow.price, date: periodLow.date, rate: calcRate(periodLow.price, latestPrice) } : null,
    rawDates: data.dates,
    rawClose: data.close,
    lastYearEnd: lastYearEnd
  };
}

function loadSingleTickerViewData(ticker, contentEl) {
  const cacheKey = `cachedPriceData_${ticker}`;

  // 1) 전역 메모리 캐시가 존재하면 대기 없이 즉시 화면 렌더링
  window.cachedPriceMap = window.cachedPriceMap || {};
  if (window.cachedPriceMap[ticker]) {
    renderPriceInfoView(window.cachedPriceMap[ticker]);
  } else {
    // 2) 메모리 캐시가 없으면 localStorage 캐시를 로드하여 즉시 화면 렌더링 (Stale)
    try {
      const localCacheStr = localStorage.getItem(cacheKey);
      if (localCacheStr) {
        const localCache = JSON.parse(localCacheStr);
        restoreCacheDates(localCache);
        window.cachedPriceMap[ticker] = localCache;
        renderPriceInfoView(localCache);
      } else {
        contentEl.innerHTML = `<div style="text-align:center; padding:20px; color:#64748b;">${ticker} 주가 데이터를 불러오는 중...</div>`;
      }
    } catch (e) {
      console.error(`${ticker} 로컬 캐시 복원 중 오류 발생:`, e);
      contentEl.innerHTML = `<div style="text-align:center; padding:20px; color:#64748b;">${ticker} 주가 데이터를 불러오는 중...</div>`;
    }
  }

  try {
    const viewData = buildTickerViewData(ticker, new Date());
    if (!viewData) {
      if (!window.cachedPriceMap[ticker]) {
        contentEl.innerHTML = `<div style="text-align:center; padding:20px; color:#ef4444;">${ticker} 데이터가 없습니다.</div>`;
      }
      return;
    }

    // 3) 전역 변수 메모리 및 로컬스토리지 영구 캐시 업데이트
    window.cachedPriceMap[ticker] = viewData;
    localStorage.setItem(cacheKey, JSON.stringify(viewData));

    // 4) 최신 정보로 렌더링 업데이트 (Revalidate)
    renderPriceInfoView(viewData);

  } catch (error) {
    console.error(error);
    if (!window.cachedPriceMap[ticker] && contentEl) {
      contentEl.innerHTML = `<div style="text-align:center; padding:20px; color:#ef4444;">오류 발생: ${error.message}</div>`;
    }
  }
}

function loadTotalPriceInfoData(contentEl) {
  window.cachedPriceMap = window.cachedPriceMap || {};

  // 캐시가 있으면 즉시 렌더링 (Stale)
  if (COMPOSITE_TICKERS.every(t => window.cachedPriceMap[t])) {
    renderPriceInfoView({ ticker: 'total', items: COMPOSITE_TICKERS.map(t => window.cachedPriceMap[t]) });
  } else {
    contentEl.innerHTML = `<div style="text-align:center; padding:20px; color:#64748b;">종합 주가 데이터를 불러오는 중...</div>`;
  }

  try {
    const now = new Date();
    const items = COMPOSITE_TICKERS.map(t => {
      const viewData = buildTickerViewData(t, now);
      if (!viewData) throw new Error(`${t} 데이터가 없습니다.`);
      window.cachedPriceMap[t] = viewData;
      localStorage.setItem(`cachedPriceData_${t}`, JSON.stringify(viewData));
      return viewData;
    });

    renderPriceInfoView({ ticker: 'total', items: items });
  } catch (error) {
    console.error(error);
    if (!COMPOSITE_TICKERS.every(t => window.cachedPriceMap[t]) && contentEl) {
      contentEl.innerHTML = `<div style="text-align:center; padding:20px; color:#ef4444;">오류 발생: ${error.message}</div>`;
    }
  }
}

async function loadPriceInfoViewData() {
  const contentEl = document.getElementById('priceInfoViewContent');
  if (!contentEl) return;

  const ticker = window.priceInfoTicker || 'total';

  // 타이틀 텍스트 동적 갱신
  const titleEl = document.getElementById('priceInfoTitle');
  if (titleEl) {
    titleEl.innerHTML = ticker === 'total' ? '📊 종합 주가 정보' : `📈 ${ticker} 주가 정보`;
  }

  // 우측 상단 셀렉터 동기화
  const selectorEl = document.getElementById('priceInfoTickerSelector');
  if (selectorEl) {
    selectorEl.value = ticker;
  }

  if (ticker === 'total') {
    loadTotalPriceInfoData(contentEl);
  } else {
    loadSingleTickerViewData(ticker, contentEl);
  }
}

function formatPriceInfoHeaderDate(dateVal) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const yy = String(d.getFullYear()).substring(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `(${yy}/${mm}/${dd})`;
}

function renderPriceInfoTotalView(data) {
  const contentEl = document.getElementById('priceInfoViewContent');
  if (!contentEl) return;

  const items = data.items || [];
  const firstItem = items[0] || {};
  const dateLatest = firstItem.latest ? formatPriceInfoHeaderDate(firstItem.latest.date) : '';
  const dateDay = firstItem.day ? formatPriceInfoHeaderDate(firstItem.day.date) : '';
  const dateWeek = firstItem.week ? formatPriceInfoHeaderDate(firstItem.week.date) : '';
  const dateMonth = firstItem.month ? formatPriceInfoHeaderDate(firstItem.month.date) : '';
  const dateYear = firstItem.year ? formatPriceInfoHeaderDate(firstItem.year.date) : '';

  const summaryCards = items.map(item => {
    const isNasdaq = (item.ticker === 'QQQ' || item.ticker === 'TQQQ');
    const isPositive = item.day.rate >= 0;
    const rateColor = isPositive ? '#10b981' : '#f43f5e';
    const prefix = isPositive ? '+' : '';

    return `
      <div onclick="changePriceInfoTicker('${item.ticker}')" style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 12px; padding: 10px 12px; display: flex; flex-direction: column; gap: 4px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); cursor: pointer; transition: all 0.2s ease; user-select: none;" onmouseover="this.style.background='rgba(255, 255, 255, 0.05)'; this.style.borderColor='rgba(255, 255, 255, 0.12)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.02)'; this.style.borderColor='rgba(255, 255, 255, 0.06)'">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span style="font-weight: 800; font-size: calc(var(--app-font-size, 10.5px) + 2.5px) !important; color: ${isNasdaq ? '#818cf8' : '#fda4af'};">${item.ticker}</span>
          <span style="font-size: var(--app-font-size, 10.5px) !important; color: #64748b;">${formatDateNY(item.latest.date).substring(5)}</span>
        </div>
        <div style="font-size: calc(var(--app-font-size, 10.5px) + 5.5px) !important; font-weight: 700; color: var(--text);">$${item.latest.price.toFixed(2)}</div>
        <div style="font-size: calc(var(--app-font-size, 10.5px) - 0.5px) !important; font-weight: 700; color: ${rateColor};">${prefix}${item.day.rate.toFixed(2)}%</div>
      </div>
    `;
  }).join('');

  const getRateBadge = (rate, date = null) => {
    const isPositive = rate >= 0;
    const color = isPositive ? '#10b981' : '#f43f5e';
    const prefix = isPositive ? '+' : '';
    let rateText = `${prefix}${rate.toFixed(1)}%`;
    if (date) {
      const d = new Date(date);
      const mm = d.getMonth() + 1;
      const dd = d.getDate();
      rateText = `${prefix}${rate.toFixed(1)}%<span style="font-size:0.75em; opacity:0.8;">(${mm}/${dd})</span>`;
    }
    return `<span style="color:${color}; font-weight:700; font-size:calc(var(--app-font-size, 10.5px) - 0.5px) !important;">${rateText}</span>`;
  };

  const tableRows = items.map(item => `
    <tr>
      <td style="padding: 10px 2px; text-align: center; font-weight: 700; color: var(--text); font-size: calc(var(--app-font-size, 10.5px) + 2px) !important;">${item.ticker}</td>
      <td class="price-compare-col-closing" style="padding: 10px 2px; text-align: center; font-weight: 600; color: var(--text); font-size: calc(var(--app-font-size, 10.5px) + 2px) !important;">$${item.latest.price.toFixed(2)}</td>
      <td style="padding: 10px 2px; text-align: center; font-size: calc(var(--app-font-size, 10.5px) + 2px) !important; line-height: 1.2;">
        <span style="color: var(--text); font-weight: 600;">$${item.day.price.toFixed(2)}</span><br>${getRateBadge(item.day.rate)}
      </td>
      <td style="padding: 10px 2px; text-align: center; font-size: calc(var(--app-font-size, 10.5px) + 2px) !important; line-height: 1.2;">
        <span style="color: var(--text); font-weight: 600;">$${item.week.price.toFixed(2)}</span><br>${getRateBadge(item.week.rate)}
      </td>
      <td style="padding: 10px 2px; text-align: center; font-size: calc(var(--app-font-size, 10.5px) + 2px) !important; line-height: 1.2;">
        <span style="color: var(--text); font-weight: 600;">$${item.month.price.toFixed(2)}</span><br>${getRateBadge(item.month.rate)}
      </td>
      <td style="padding: 10px 2px; text-align: center; font-size: calc(var(--app-font-size, 10.5px) + 2px) !important; line-height: 1.2;">
        <span style="color: var(--text); font-weight: 600;">$${item.year.price.toFixed(2)}</span><br>${getRateBadge(item.year.rate)}
      </td>
      <td class="price-compare-col-high" style="padding: 10px 2px; text-align: center; font-size: calc(var(--app-font-size, 10.5px) + 2px) !important; line-height: 1.2;">
        ${item.high ? `<span style="color: var(--text); font-weight: 600;">$${item.high.price.toFixed(2)}</span><br>${getRateBadge(item.high.rate, item.high.date)}` : '-'}
      </td>
      <td class="price-compare-col-low" style="padding: 10px 2px; text-align: center; font-size: calc(var(--app-font-size, 10.5px) + 2px) !important; line-height: 1.2;">
        ${item.low ? `<span style="color: var(--text); font-weight: 600;">$${item.low.price.toFixed(2)}</span><br>${getRateBadge(item.low.rate, item.low.date)}` : '-'}
      </td>
    </tr>
  `).join('');

  const htmlContent = `
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 14px;">
      ${summaryCards}
    </div>

    <div class="price-comparison-box" style="border-radius: 12px; padding: 12px 2px; flex: 1; display: flex; flex-direction: column; min-height: 0;">
      <div style="font-size: calc(var(--app-font-size, 10.5px) + 2px) !important; font-weight: 700; color: var(--primary); margin-bottom: 10px;">
        📊 주가 비교
      </div>
      <div style="overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%; flex: 1; min-height: 0;">
        <table class="price-info-comparison-table" style="width: 100%; border-collapse: separate; border-spacing: 1px 1px; table-layout: fixed; min-width: 460px;">
          <thead>
            <tr style="color: var(--text-muted); font-size: calc(var(--app-font-size, 10.5px) + 2px) !important; font-weight: 700;">
              <th style="padding: 6px 2px; text-align: center; width: 10%; vertical-align: bottom;">티커</th>
              <th class="price-compare-col-closing" style="padding: 6px 2px; text-align: center; width: 13%; vertical-align: bottom;">
                종가<span style="font-size: calc(var(--app-font-size, 10.5px) - 1px) !important; font-weight: 500; opacity: 0.6; display: block; margin-top: 1px;">${dateLatest}</span>
              </th>
              <th style="padding: 6px 2px; text-align: center; width: 12.8%;">
                일봉<span style="font-size: calc(var(--app-font-size, 10.5px) - 1px) !important; font-weight: 500; opacity: 0.6; display: block; margin-top: 1px;">${dateDay}</span>
              </th>
              <th style="padding: 6px 2px; text-align: center; width: 12.8%;">
                주봉<span style="font-size: calc(var(--app-font-size, 10.5px) - 1px) !important; font-weight: 500; opacity: 0.6; display: block; margin-top: 1px;">${dateWeek}</span>
              </th>
              <th style="padding: 6px 2px; text-align: center; width: 12.8%;">
                월봉<span style="font-size: calc(var(--app-font-size, 10.5px) - 1px) !important; font-weight: 500; opacity: 0.6; display: block; margin-top: 1px;">${dateMonth}</span>
              </th>
              <th style="padding: 6px 2px; text-align: center; width: 12.8%;">
                년봉<span style="font-size: calc(var(--app-font-size, 10.5px) - 1px) !important; font-weight: 500; opacity: 0.6; display: block; margin-top: 1px;">${dateYear}</span>
              </th>
              <th class="price-compare-col-high" style="padding: 6px 2px; text-align: center; width: 12.8%;">
                최고가
              </th>
              <th class="price-compare-col-low" style="padding: 6px 2px; text-align: center; width: 12.8%;">
                최저가
              </th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    </div>
  `;

  contentEl.innerHTML = htmlContent;

  if (window.soxlPriceChartInstance) {
    try {
      window.soxlPriceChartInstance.destroy();
      window.soxlPriceChartInstance = null;
    } catch (e) { }
  }
}

function renderPriceInfoView(data) {
  if (data.ticker === 'total') {
    renderPriceInfoTotalView(data);
    return;
  }

  const contentEl = document.getElementById('priceInfoViewContent');
  if (!contentEl) return;

  const { latest, day, week, month, year, rawDates, rawClose, lastYearEnd } = data;
  const ticker = data.ticker || 'SOXL';

  const getRateHtml = (rate) => {
    const isPositive = rate >= 0;
    const prefix = isPositive ? '+' : '';
    const color = isPositive ? '#3b82f6' : '#ef4444';
    return `<span style="color: ${color} !important; font-weight: 700;">${prefix}${rate.toFixed(2)}%</span>`;
  };

  const latestDateStr = formatDateNY(latest.date);
  const dayDateStr = formatDateNY(day.date);
  const weekDateStr = formatDateNY(week.date);
  const monthDateStr = formatDateNY(month.date);
  const yearDateStr = formatDateNY(year.date);

  const chartDates = [];
  const chartPrices = [];
  let maxPrice = -Infinity;
  let minPrice = Infinity;

  for (let i = 0; i < rawDates.length; i++) {
    const itemDate = new Date(rawDates[i]);
    if (itemDate >= lastYearEnd) {
      const dStr = formatDateNY(itemDate);
      chartDates.push(dStr.substring(5)); // 'MM-DD'
      const priceVal = rawClose[i];
      chartPrices.push(priceVal);
      if (priceVal > maxPrice) maxPrice = priceVal;
      if (priceVal < minPrice) minPrice = priceVal;
    }
  }

  if (chartDates.length === 0 && rawDates.length > 0) {
    const fallbackStart = Math.max(0, rawDates.length - 260);
    for (let i = fallbackStart; i < rawDates.length; i++) {
      const itemDate = new Date(rawDates[i]);
      const dStr = formatDateNY(itemDate);
      const priceVal = rawClose[i];
      if (!dStr || priceVal === null || priceVal === undefined || isNaN(priceVal)) continue;
      chartDates.push(dStr.substring(5));
      chartPrices.push(priceVal);
      if (priceVal > maxPrice) maxPrice = priceVal;
      if (priceVal < minPrice) minPrice = priceVal;
    }
  }

  const getTableRowsHtml = () => `
    <tr>
      <td style="padding:6px 2px; text-align:center; font-size:11px; vertical-align:middle;">
        일봉<br><span style="font-size:9px; color:#64748b;">${dayDateStr}</span>
      </td>
      <td style="padding:6px 2px; text-align:center; font-weight:600; color:#3b82f6; vertical-align:middle;">$${day.price.toFixed(2)}</td>
      <td style="padding:6px 2px; text-align:center; font-weight:700; vertical-align:middle;">${getRateHtml(day.rate)}</td>
    </tr>
    <tr>
      <td style="padding:6px 2px; text-align:center; font-size:11px; vertical-align:middle;">
        주봉<br><span style="font-size:9px; color:#64748b;">${weekDateStr}</span>
      </td>
      <td style="padding:6px 2px; text-align:center; font-weight:600; color:#3b82f6; vertical-align:middle;">$${week.price.toFixed(2)}</td>
      <td style="padding:6px 2px; text-align:center; font-weight:700; vertical-align:middle;">${getRateHtml(week.rate)}</td>
    </tr>
    <tr>
      <td style="padding:6px 2px; text-align:center; font-size:11px; vertical-align:middle;">
        월봉<br><span style="font-size:9px; color:#64748b;">${monthDateStr}</span>
      </td>
      <td style="padding:6px 2px; text-align:center; font-weight:600; color:#3b82f6; vertical-align:middle;">$${month.price.toFixed(2)}</td>
      <td style="padding:6px 2px; text-align:center; font-weight:700; vertical-align:middle;">${getRateHtml(month.rate)}</td>
    </tr>
    <tr>
      <td style="padding:6px 2px; text-align:center; font-size:11px; vertical-align:middle;">
        년봉<br><span style="font-size:9px; color:#64748b;">${yearDateStr}</span>
      </td>
      <td style="padding:6px 2px; text-align:center; font-weight:600; color:#3b82f6; vertical-align:middle;">$${year.price.toFixed(2)}</td>
      <td style="padding:6px 2px; text-align:center; font-weight:700; vertical-align:middle;">${getRateHtml(year.rate)}</td>
    </tr>
  `;

  const existingCanvas = document.getElementById('soxlPriceChart');
  const existingHeader = contentEl.querySelector('.price-info-header-block');

  if (existingCanvas && existingHeader) {
    const latestDateEl = contentEl.querySelector('.price-info-latest-date');
    const latestPriceEl = contentEl.querySelector('.price-info-latest-price');
    const tableBodyEl = contentEl.querySelector('.price-info-table-body');
    const chartTitleEl = contentEl.querySelector('.price-info-chart-title');

    if (latestDateEl) latestDateEl.innerHTML = `최근 종가 <span style="font-size: calc(100% - 2px); font-weight: inherit; opacity: 0.8; margin-left: 2px;">(${latestDateStr})</span>`;
    if (latestPriceEl) latestPriceEl.textContent = `$${latest.price.toFixed(2)}`;
    if (tableBodyEl) tableBodyEl.innerHTML = getTableRowsHtml();
    if (chartTitleEl) {
      if (maxPrice !== -Infinity && minPrice !== Infinity) {
        chartTitleEl.innerHTML = `📈 당해년도 주가 <span style="font-weight: normal; font-size: 10px; color: #94a3b8; margin-left: 6px;">(최고: $${maxPrice.toFixed(2)} / 최저: $${minPrice.toFixed(2)})</span>`;
      } else {
        chartTitleEl.innerHTML = `📈 당해년도 주가`;
      }
    }
  } else {
    let chartTitleHtml = `📈 당해년도 주가`;
    if (maxPrice !== -Infinity && minPrice !== Infinity) {
      chartTitleHtml = `📈 당해년도 주가 <span style="font-weight: normal; font-size: 10px; color: #94a3b8; margin-left: 6px;">(최고: $${maxPrice.toFixed(2)} / 최저: $${minPrice.toFixed(2)})</span>`;
    }

    contentEl.innerHTML = `
      <div class="price-info-header-block" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:12px; text-align:center;">
        <div class="price-info-latest-date" style="font-size:11px; color:#94a3b8; margin-bottom:4px;">최근 종가 <span style="font-size: calc(100% - 2px); font-weight: inherit; opacity: 0.8; margin-left: 2px;">(${latestDateStr})</span></div>
        <div class="price-info-latest-price" style="font-size:24px; font-weight:700; color:#ef4444;">$${latest.price.toFixed(2)}</div>
      </div>

      <table class="data-table" style="width:100%; margin-top:8px; table-layout:fixed;">
        <thead>
          <tr style="color:var(--text-muted); font-weight:700;">
            <th style="padding:6px 2px; text-align:center; font-size:11px; width:33.33%;">기간</th>
            <th style="padding:6px 2px; text-align:center; font-size:11px; width:33.33%;">과거 주가</th>
            <th style="padding:6px 2px; text-align:center; font-size:11px; width:33.33%;">현재 상승률</th>
          </tr>
        </thead>
        <tbody class="price-info-table-body">
          ${getTableRowsHtml()}
        </tbody>
      </table>

      <!-- 주가 그래프 영역 -->
      <div style="margin-top:16px; border-top:1px solid rgba(255,255,255,0.08); padding-top:12px; flex:1; display:flex; flex-direction:column;">
        <div class="price-info-chart-title" style="font-size:11px; color:#94a3b8; font-weight:600; margin-bottom:8px; text-align:left;">${chartTitleHtml}</div>
        <div style="flex:1; min-height:180px; position:relative; width:100%;">
          <canvas id="soxlPriceChart"></canvas>
        </div>
      </div>
    `;
  }

  const runChartDraw = () => {
    const ctx = document.getElementById('soxlPriceChart');
    if (!ctx) return;

    if (typeof Chart === 'undefined') {
      console.warn("Chart.js is not loaded yet.");
      return;
    }

    const isNasdaq = (ticker === 'QQQ' || ticker === 'TQQQ');
    const chartColor = isNasdaq ? '#6366f1' : '#ef4444';
    const chartBgColor = isNasdaq ? 'rgba(99, 102, 241, 0.05)' : 'rgba(239, 68, 68, 0.05)';

    const maxMinPlugin = {
      id: 'maxMinPlugin',
      afterDatasetsDraw(chart) {
        const { ctx, scales: { x, y } } = chart;
        const dataset = chart.data.datasets[0];
        if (!dataset || !dataset.data || dataset.data.length === 0) return;

        const data = dataset.data;
        let maxVal = -Infinity;
        let minVal = Infinity;
        let maxIdx = -1;
        let minIdx = -1;

        for (let i = 0; i < data.length; i++) {
          const val = data[i];
          if (val > maxVal) {
            maxVal = val;
            maxIdx = i;
          }
          if (val < minVal) {
            minVal = val;
            minIdx = i;
          }
        }

        if (maxIdx === -1 || minIdx === -1) return;

        ctx.save();
        ctx.font = 'bold 9px sans-serif';
        ctx.textBaseline = 'middle';

        const meta = chart.getDatasetMeta(0);
        if (meta && meta.data && meta.data[maxIdx]) {
          const maxX = meta.data[maxIdx].x;
          const maxY = meta.data[maxIdx].y;

          ctx.beginPath();
          ctx.arc(maxX, maxY, 4, 0, 2 * Math.PI);
          ctx.fillStyle = '#ef4444';
          ctx.fill();
          ctx.lineWidth = 1;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();

          ctx.fillStyle = '#ef4444';
          ctx.textAlign = 'center';
          ctx.fillText(`▲ $${maxVal.toFixed(2)}`, maxX, maxY - 10);
        }

        if (meta && meta.data && meta.data[minIdx]) {
          const minX = meta.data[minIdx].x;
          const minY = meta.data[minIdx].y;

          ctx.beginPath();
          ctx.arc(minX, minY, 4, 0, 2 * Math.PI);
          ctx.fillStyle = '#3b82f6';
          ctx.fill();
          ctx.lineWidth = 1;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();

          ctx.fillStyle = '#3b82f6';
          ctx.textAlign = 'center';
          ctx.fillText(`▼ $${minVal.toFixed(2)}`, minX, minY + 10);
        }

        ctx.restore();
      }
    };

    if (window.soxlPriceChartInstance && window.soxlPriceChartInstance.canvas === ctx) {
      const chartInstance = window.soxlPriceChartInstance;
      chartInstance.data.labels = chartDates;
      chartInstance.data.datasets[0].label = ticker;
      chartInstance.data.datasets[0].data = chartPrices;
      chartInstance.data.datasets[0].borderColor = chartColor;
      chartInstance.data.datasets[0].backgroundColor = chartBgColor;

      const plugins = chartInstance.config.plugins || [];
      if (!plugins.some(p => p.id === 'maxMinPlugin')) {
        plugins.push(maxMinPlugin);
        chartInstance.config.plugins = plugins;
      }

      chartInstance.update();
    } else {
      if (window.soxlPriceChartInstance) {
        try { window.soxlPriceChartInstance.destroy(); } catch (e) {}
      }
      window.soxlPriceChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: chartDates,
          datasets: [{
            label: ticker,
            data: chartPrices,
            borderColor: chartColor,
            backgroundColor: chartBgColor,
            borderWidth: 1.5,
            pointRadius: 0,
            pointHoverRadius: 4,
            fill: true,
            tension: 0.1
          }]
        },
        plugins: [maxMinPlugin],
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: {
            padding: { top: 15, bottom: 15, left: 8, right: 8 }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              mode: 'index',
              intersect: false,
              callbacks: {
                label: function(context) {
                  return `$${Number(context.raw).toFixed(2)}`;
                }
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              afterBuildTicks: function(scale) {
                const ticks = scale.ticks;
                if (!ticks || ticks.length === 0) return;
                const total = ticks.length;
                if (total <= 5) return;
                const step = Math.floor((total - 1) / 4);
                const targetIndices = [0, step, step * 2, step * 3, total - 1];
                scale.ticks = ticks.filter((t, idx) => targetIndices.includes(idx));
              },
              ticks: {
                color: '#64748b',
                font: { size: 9 }
              }
            },
            y: {
              grid: { color: 'rgba(255, 255, 255, 0.04)' },
              ticks: {
                maxTicksLimit: 4,
                color: '#64748b',
                font: { size: 9 },
                callback: function(value) {
                  return `$${value}`;
                }
              }
            }
          }
        }
      });
    }
  };

  if (existingCanvas && existingHeader) {
    runChartDraw();
  } else {
    setTimeout(runChartDraw, 100);
  }
}

if (!window.UI) window.UI = {};
if (!window.UI.priceInfo) window.UI.priceInfo = {};
window.UI.priceInfo.preloadCorePriceTickers = preloadCorePriceTickers;
window.UI.priceInfo.loadPriceInfoViewData = loadPriceInfoViewData;
window.UI.priceInfo.renderPriceInfoView = renderPriceInfoView;
window.UI.priceInfo.changePriceInfoTicker = changePriceInfoTicker;
