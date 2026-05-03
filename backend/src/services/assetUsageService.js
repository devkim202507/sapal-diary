import { Asset } from '../models/Asset.js';
import { Trade } from '../models/Trade.js';

export async function incrementAssetUsage(symbol) {
  const sym = String(symbol).toUpperCase().trim();
  if (!sym) return;
  await Asset.findOneAndUpdate(
    { symbol: sym },
    { $inc: { usageCount: 1 }, $set: { lastUsedAt: new Date() } }
  );
}

/**
 * 해당 심볼의 전체 매매 건수로 usageCount·lastUsedAt을 맞춤 (삭제 후 등).
 * Asset 문서가 없으면 아무 것도 하지 않음.
 */
export async function reconcileAssetUsageForSymbol(symbol) {
  const sym = String(symbol).toUpperCase().trim();
  if (!sym) return;

  const exists = await Asset.exists({ symbol: sym });
  if (!exists) return;

  const usageCount = await Trade.countDocuments({ symbol: sym });
  let lastUsedAt = null;
  if (usageCount > 0) {
    const latest = await Trade.findOne({ symbol: sym })
      .sort({ date: -1, _id: -1 })
      .select('date')
      .lean();
    lastUsedAt = latest?.date ?? null;
  }

  await Asset.updateOne(
    { symbol: sym },
    { $set: { usageCount, lastUsedAt } }
  );
}
