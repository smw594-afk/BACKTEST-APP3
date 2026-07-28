// ui/helpers/performance-icons.js - 성과 아이콘 및 시각화 함수

function getPerformanceIcon(rate, type = 'emoji') {
  const isPositive = rate > 0;
  const isNegative = rate < 0;

  if (type === 'emoji') {
    if (isPositive) return '📈';
    if (isNegative) return '📉';
    return '➡️';
  }

  if (type === 'arrow') {
    if (isPositive) return '↑';
    if (isNegative) return '↓';
    return '→';
  }

  if (type === 'trend') {
    if (isPositive) return '▲';
    if (isNegative) return '▼';
    return '●';
  }

  return '';
}

function getPerformanceColor(rate) {
  if (rate > 0) return '#3b82f6';
  if (rate < 0) return '#ef4444';
  return '#64748b';
}

function formatRateWithIcon(rate, decimals = 2) {
  const sign = rate >= 0 ? '+' : '';
  const icon = getPerformanceIcon(rate);
  const color = getPerformanceColor(rate);
  return {
    icon: icon,
    text: `${sign}${rate.toFixed(decimals)}%`,
    color: color,
    html: `<span style="color:${color}; font-weight:700;">${icon} ${sign}${rate.toFixed(decimals)}%</span>`
  };
}

function renderPerformanceCard(data) {
  const {
    title = '성과',
    rate = 0,
    value = '-',
    subtitle = '',
    iconType = 'emoji'
  } = data;

  const perfData = formatRateWithIcon(rate);

  return `
    <div style="
      background:rgba(255,255,255,0.03);
      border:1px solid rgba(255,255,255,0.08);
      border-radius:8px;
      padding:12px;
      text-align:center;
    ">
      <div style="font-size:10px; color:#94a3b8; margin-bottom:4px; font-weight:600;">
        ${title}
      </div>
      <div style="font-size:18px; font-weight:700; color:#e2e8f0; margin-bottom:4px;">
        ${value}
      </div>
      <div style="font-size:12px; color:${perfData.color}; font-weight:700;">
        ${perfData.html}
      </div>
      ${subtitle ? `<div style="font-size:9px; color:#64748b; margin-top:4px;">${subtitle}</div>` : ''}
    </div>
  `;
}

function renderPerformanceBar(rate, maxWidth = 100) {
  const color = getPerformanceColor(rate);
  const width = Math.min(Math.abs(rate), 100);
  const direction = rate >= 0 ? 'ltr' : 'rtl';

  return `
    <div style="
      display:flex;
      align-items:center;
      gap:8px;
    ">
      <div style="
        flex:1;
        height:20px;
        background:rgba(255,255,255,0.05);
        border-radius:4px;
        overflow:hidden;
      ">
        <div style="
          height:100%;
          width:${(width / 100) * maxWidth}px;
          background:${color};
          opacity:0.7;
          direction:${direction};
        "></div>
      </div>
      <span style="
        font-size:11px;
        font-weight:700;
        color:${color};
        min-width:50px;
        text-align:right;
      ">${rate >= 0 ? '+' : ''}${rate.toFixed(2)}%</span>
    </div>
  `;
}

function getStatusEmoji(value, threshold = { good: 5, bad: -5 }) {
  if (value >= threshold.good) return '✅';
  if (value <= threshold.bad) return '⚠️';
  return '📌';
}

if (!window.UI) window.UI = {};
if (!window.UI.perf) window.UI.perf = {};
window.UI.perf.getPerformanceIcon = getPerformanceIcon;
window.UI.perf.getPerformanceColor = getPerformanceColor;
window.UI.perf.formatRateWithIcon = formatRateWithIcon;
window.UI.perf.renderPerformanceCard = renderPerformanceCard;
window.UI.perf.renderPerformanceBar = renderPerformanceBar;
window.UI.perf.getStatusEmoji = getStatusEmoji;
