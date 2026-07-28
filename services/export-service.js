// services/export-service.js
// CSV 내보내기 서비스

const exportService = {
  // CSV로 거래 이력 내보내기
  exportTradeHistoryToCSV(slotNum) {
    // 글로벌 변수들 참조 (script.js에서 제공됨)
    const lastBTResults = window.lastBTResults;
    const showToast = window.showToast;

    if (!lastBTResults || !lastBTResults[slotNum]) {
      alert("백테스트 결과가 없습니다. 먼저 백테스트를 실행해주세요.");
      return;
    }

    const res = lastBTResults[slotNum];

    if (!res || !res.dailyStates || res.dailyStates.length === 0) {
      alert("저장할 매매 기록이 없습니다. 수동 백테스트를 실행해주세요.");
      return;
    }

    const tradesByBuyDate = {};

    if (res.trades) {
      res.trades.forEach(t => {
        if (!tradesByBuyDate[t.buyDate]) tradesByBuyDate[t.buyDate] = [];
        tradesByBuyDate[t.buyDate].push(t);
      });
    }

    if (res.inv) {
      res.inv.forEach(h => {
        if (!tradesByBuyDate[h.buyDate]) tradesByBuyDate[h.buyDate] = [];
        tradesByBuyDate[h.buyDate].push({
          buyDate: h.buyDate,
          sellDate: '보유중',
          mode: h.mode,
          tier: h.tier,
          buyPrice: h.buy_price,
          sellPrice: 0,
          qty: h.qty
        });
      });
    }

    let csvContent = "﻿";
    csvContent += "날짜(영업일),매도일,모드,티어,매수가,매도가,수량,총잔고(마감),갱신금(마감)\n";

    res.dailyStates.forEach(state => {
      const dateStr = state.date;
      const asset = state.asset.toFixed(2);

      let renewCash = "0.00";
      try {
        const parsed = JSON.parse(state.json);
        renewCash = (parsed.base_principal || parsed.base || 0).toFixed(2);
      } catch (e) { }

      const dayTrades = tradesByBuyDate[dateStr];

      if (dayTrades && dayTrades.length > 0) {
        dayTrades.forEach(t => {
          const sellD = t.sellDate || '-';
          const sPrice = t.sellPrice > 0 ? t.sellPrice.toFixed(2) : '-';

          const row = [
            dateStr,
            sellD,
            t.mode,
            t.tier,
            t.buyPrice.toFixed(2),
            sPrice,
            t.qty,
            asset,
            renewCash
          ];
          csvContent += row.join(",") + "\n";
        });
      } else {
        const row = [
          dateStr,
          '-', '-', '-', '-', '-', '-',
          asset,
          renewCash
        ];
        csvContent += row.join(",") + "\n";
      }
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `vtotal3_BACKTEST_SLOT${slotNum}_DAILY_LOG_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (showToast) {
      showToast("모든 영업일 기록이 엑셀로 저장되었습니다.", "📊");
    }
  }
};

window.exportService = exportService;
