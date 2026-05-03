/**
 * Derives positions from trades (average cost basis for display).
 * @param {Array<{ type: string, price: number, quantity: number, symbol: string, date: Date }>} tradesSorted
 */
export function buildPositionsFromTrades(tradesSorted) {
  const bySymbol = new Map();

  for (const t of tradesSorted) {
    if (!bySymbol.has(t.symbol)) {
      bySymbol.set(t.symbol, {
        symbol: t.symbol,
        totalBuyQuantity: 0,
        totalBuyAmount: 0,
        totalSellQuantity: 0,
        runningQty: 0,
        runningCostBasis: 0,
      });
    }
    const p = bySymbol.get(t.symbol);
    if (t.type === 'BUY') {
      p.totalBuyQuantity += t.quantity;
      p.totalBuyAmount += t.price * t.quantity;
      p.runningQty += t.quantity;
      p.runningCostBasis += t.price * t.quantity;
    } else if (t.type === 'SELL') {
      p.totalSellQuantity += t.quantity;
      const avg =
        p.runningQty > 0 ? p.runningCostBasis / p.runningQty : 0;
      const sellQty = Math.min(t.quantity, p.runningQty);
      p.runningCostBasis -= avg * sellQty;
      p.runningQty -= sellQty;
    }
  }

  const positions = [];
  for (const p of bySymbol.values()) {
    const holdingQuantity = p.totalBuyQuantity - p.totalSellQuantity;
    const averageBuyPrice =
      p.totalBuyQuantity > 0 ? p.totalBuyAmount / p.totalBuyQuantity : 0;
    positions.push({
      symbol: p.symbol,
      totalBuyQuantity: roundQty(p.totalBuyQuantity),
      totalBuyAmount: roundMoney(p.totalBuyAmount),
      totalSellQuantity: roundQty(p.totalSellQuantity),
      averageBuyPrice: roundMoney(averageBuyPrice),
      holdingQuantity: roundQty(holdingQuantity),
    });
  }

  return positions.filter((x) => x.holdingQuantity > 0 || x.totalSellQuantity > 0);
}

function roundQty(n) {
  return Math.round(n * 1e8) / 1e8;
}
function roundMoney(n) {
  return Math.round(n * 1e4) / 1e4;
}
