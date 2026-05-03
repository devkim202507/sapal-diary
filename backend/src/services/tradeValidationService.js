import { Trade } from '../models/Trade.js';

/**
 * Walk trades; throws if any SELL exceeds available quantity at that time.
 */
export function validateTradesSequence(tradesSorted) {
  const bySymbol = new Map();
  for (const t of tradesSorted) {
    const sym = t.symbol;
    if (!bySymbol.has(sym)) {
      bySymbol.set(sym, { runningQty: 0, runningCost: 0 });
    }
    const s = bySymbol.get(sym);
    if (t.type === 'BUY') {
      s.runningQty += t.quantity;
      s.runningCost += t.price * t.quantity;
    } else if (t.type === 'SELL') {
      if (t.quantity > s.runningQty + 1e-10) {
        const err = new Error('Sell quantity exceeds current holding');
        err.status = 400;
        throw err;
      }
      const avg = s.runningQty > 0 ? s.runningCost / s.runningQty : 0;
      s.runningCost -= avg * t.quantity;
      s.runningQty -= t.quantity;
    }
  }
}

/**
 * Validates inserting a trade (including back-dated) against full timeline.
 */
export async function assertTradeAllowed(userId, pending) {
  const trades = await Trade.find({ userId }).sort({ date: 1, _id: 1 }).lean();
  const pendingRow = {
    type: pending.type,
    price: Number(pending.price),
    quantity: Number(pending.quantity),
    symbol: String(pending.symbol).toUpperCase().trim(),
    date: new Date(pending.date),
    _isNew: true,
    _sortId: '\uffff',
  };
  const existing = trades.map((t) => ({
    type: t.type,
    price: t.price,
    quantity: t.quantity,
    symbol: String(t.symbol).toUpperCase().trim(),
    date: new Date(t.date),
    _isNew: false,
    _sortId: String(t._id),
  }));

  const combined = [...existing, pendingRow].sort((a, b) => {
    const d = a.date.getTime() - b.date.getTime();
    if (d !== 0) return d;
    if (a._isNew !== b._isNew) return a._isNew ? 1 : -1;
    return a._sortId.localeCompare(b._sortId);
  });

  validateTradesSequence(
    combined.map(({ type, price, quantity, symbol, date }) => ({
      type,
      price,
      quantity,
      symbol,
      date,
    }))
  );
}
