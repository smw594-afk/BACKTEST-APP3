// utils/formatters.js
// 숫자 및 통화 포매팅 유틸 함수 모음

function fixFloat(value) {
  if (value === null || value === undefined || isNaN(value)) return 0;
  return Math.round(value * 100) / 100;
}

function formatComma(val) {
  if (!val && val !== 0) return '';
  let s = String(val).replace(/[^0-9.]/g, '');
  let parts = s.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join('.');
}

function unformatComma(val) {
  return String(val).replace(/,/g, '');
}

function pyRound2(num) {
  let factor = 100, temp = num * factor, rounded = Math.round(temp);
  if (Math.abs(temp % 1) === 0.5) rounded = (Math.floor(temp) % 2 === 0) ? Math.floor(temp) : Math.ceil(temp);
  return rounded / factor;
}

window.formatters = {
  fixFloat,
  formatComma,
  unformatComma,
  pyRound2
};
