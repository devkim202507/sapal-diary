/**
 * Average-cost realized P&L, per-sell stats, win rate, what-if, etc.
 */

function roundMoney(n) {
  return Math.round(n * 1e4) / 1e4;
}
function roundQty(n) {
  return Math.round(n * 1e8) / 1e8;
}

/**
 * Walk trades chronologically per symbol.
 * @returns {{
 *   realizedProfit: number,
 *   sellEvents: Array<{ symbol: string, date: Date, quantity: number, price: number, realizedFromThisSell: number, avgCostAtSell: number }>,
 *   symbolState: Map<string, { totalBuyQty: number, totalBuyAmt: number, runningQty: number, runningCost: number }>
 * }}
 */
export function analyzeTradesChronological(tradesSorted) {
  const bySymbol = new Map();
  const sellEvents = [];
  let realizedProfit = 0;

  function state(sym) {
    if (!bySymbol.has(sym)) {
      bySymbol.set(sym, {
        totalBuyQty: 0,
        totalBuyAmt: 0,
        runningQty: 0,
        runningCost: 0,
      });
    }
    return bySymbol.get(sym);
  }

  for (const t of tradesSorted) {
    const s = state(t.symbol);
    if (t.type === 'BUY') {
      s.totalBuyQty += t.quantity;
      s.totalBuyAmt += t.price * t.quantity;
      s.runningQty += t.quantity;
      s.runningCost += t.price * t.quantity;
    } else if (t.type === 'SELL') {
      const qty = t.quantity;
      const price = t.price;
      const avgCost =
        s.runningQty > 0 ? s.runningCost / s.runningQty : 0;
      const effectiveQty = Math.min(qty, s.runningQty);
      const pnl = (price - avgCost) * effectiveQty;
      realizedProfit += pnl;
      s.runningCost -= avgCost * effectiveQty;
      s.runningQty -= effectiveQty;

      sellEvents.push({
        symbol: t.symbol,
        date: t.date,
        quantity: effectiveQty,
        price,
        realizedFromThisSell: roundMoney(pnl),
        avgCostAtSell: roundMoney(avgCost),
      });
    }
  }

  return { realizedProfit: roundMoney(realizedProfit), sellEvents, bySymbol };
}

/**
 * @param {Map} bySymbol from analyzeTradesChronological
 * @param {Record<string, number>} currentPrices symbol -> price
 */
export function unrealizedAndHolding(bySymbol, currentPrices) {
  let unrealized = 0;
  const perSymbol = [];
  for (const [symbol, s] of bySymbol.entries()) {
    const holding = roundQty(s.runningQty);
    if (holding <= 0) continue;
    const avg = s.runningQty > 0 ? s.runningCost / s.runningQty : 0;
    const cur = currentPrices[symbol];
    if (cur == null || Number.isNaN(Number(cur))) continue;
    const u = (Number(cur) - avg) * holding;
    unrealized += u;
    perSymbol.push({
      symbol,
      holdingQuantity: holding,
      averageBuyPrice: roundMoney(avg),
      currentPrice: Number(cur),
      unrealizedProfit: roundMoney(u),
    });
  }
  return { unrealizedProfit: roundMoney(unrealized), perSymbol };
}

/**
 * What-if: bought all, never sold — mark-to-market at currentPrice.
 * Compare to actual path: realized + unrealized (same current prices).
 */
export function whatIfNeverSold(bySymbol, currentPrices) {
  const perSymbol = [];
  let hypotheticalTotal = 0;
  for (const [symbol, s] of bySymbol.entries()) {
    const cur = currentPrices[symbol];
    if (cur == null || Number.isNaN(Number(cur))) continue;
    if (s.totalBuyQty <= 0) continue;
    const avgEver = s.totalBuyAmt / s.totalBuyQty;
    const qtyIfHeldAll = s.totalBuyQty;
    const hypoUnrealized = (Number(cur) - avgEver) * qtyIfHeldAll;
    hypotheticalTotal += hypoUnrealized;
    perSymbol.push({
      symbol,
      totalBuyQuantity: roundQty(s.totalBuyQty),
      averageBuyPriceEver: roundMoney(avgEver),
      currentPrice: Number(cur),
      profitIfHeldAllBuysUntilNow: roundMoney(hypoUnrealized),
    });
  }
  return {
    totalProfitIfNeverSold: roundMoney(hypotheticalTotal),
    perSymbol,
  };
}

/** FIFO lots for holding duration (industry-agnostic diary MVP) */
export function computeHoldingStatsSimple(tradesSorted, now = new Date()) {
  const bySymbol = new Map();
  let totalWeightedDays = 0;
  let totalUnits = 0;

  for (const t of tradesSorted) {
    if (!bySymbol.has(t.symbol)) bySymbol.set(t.symbol, []);
    const lots = bySymbol.get(t.symbol);
    const time = new Date(t.date).getTime();

    if (t.type === 'BUY') {
      lots.push({ qty: t.quantity, buyTime: time });
    } else {
      let rem = t.quantity;
      while (rem > 0 && lots.length) {
        const lot = lots[0];
        const take = Math.min(rem, lot.qty);
        const days = (time - lot.buyTime) / (86400 * 1000);
        totalWeightedDays += take * days;
        totalUnits += take;
        lot.qty -= take;
        rem -= take;
        if (lot.qty <= 1e-12) lots.shift();
      }
    }
  }

  const nowMs = now.getTime();
  for (const lots of bySymbol.values()) {
    for (const lot of lots) {
      if (lot.qty > 0) {
        const days = (nowMs - lot.buyTime) / (86400 * 1000);
        totalWeightedDays += lot.qty * days;
        totalUnits += lot.qty;
      }
    }
  }

  const averageHoldingDays =
    totalUnits > 0 ? totalWeightedDays / totalUnits : 0;
  return {
    averageHoldingDays: roundMoney(averageHoldingDays),
    basis: 'FIFO lots for duration only; P&L uses average cost',
  };
}

export function buildAnalysisResponse(tradesSorted, currentPrices = {}) {
  const { realizedProfit, sellEvents, bySymbol } =
    analyzeTradesChronological(tradesSorted);

  const { unrealizedProfit, perSymbol: unrealizedPerSymbol } =
    unrealizedAndHolding(bySymbol, currentPrices);

  const actualTotalPnL = roundMoney(realizedProfit + unrealizedProfit);

  const { totalProfitIfNeverSold, perSymbol: whatIfPerSymbol } =
    whatIfNeverSold(bySymbol, currentPrices);

  const profitableSells = sellEvents.filter((e) => e.realizedFromThisSell > 0);
  const winRate =
    sellEvents.length > 0
      ? profitableSells.length / sellEvents.length
      : null;

  let bestTrade = null;
  let worstTrade = null;
  for (const e of sellEvents) {
    if (!bestTrade || e.realizedFromThisSell > bestTrade.realizedFromThisSell) {
      bestTrade = e;
    }
    if (!worstTrade || e.realizedFromThisSell < worstTrade.realizedFromThisSell) {
      worstTrade = e;
    }
  }

  const holdingStats = computeHoldingStatsSimple(tradesSorted);

  return {
    realizedProfit,
    unrealizedProfit,
    actualTotalPnL,
    winRate: winRate == null ? null : roundMoney(winRate),
    totalSellTrades: sellEvents.length,
    profitableSellCount: profitableSells.length,
    bestTrade: bestTrade
      ? {
          ...bestTrade,
          date: bestTrade.date,
        }
      : null,
    worstTrade: worstTrade
      ? {
          ...worstTrade,
          date: worstTrade.date,
        }
      : null,
    averageHoldingDays: holdingStats.averageHoldingDays,
    holdingPeriodNote: holdingStats.basis,
    unrealizedPerSymbol,
    whatIfNeverSold: {
      totalProfitIfHeldAllBuysUntilNow: totalProfitIfNeverSold,
      perSymbol: whatIfPerSymbol,
      comparison: {
        actualTotalPnL,
        hypotheticalMarkToMarketIfNeverSold: totalProfitIfNeverSold,
        difference: roundMoney(totalProfitIfNeverSold - actualTotalPnL),
      },
    },
    meta: {
      currentPricesProvided: Object.keys(currentPrices).length > 0,
    },
  };
}
