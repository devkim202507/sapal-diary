function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Match score (higher = better). Sort: score, lastUsedAt, usageCount.
 */
export function scoreAssetMatch(asset, qUpper) {
  const sym = (asset.symbol || '').toUpperCase();
  const name = (asset.name || '').toUpperCase();
  let score = 0;
  if (sym === qUpper) score += 1000;
  else if (sym.startsWith(qUpper)) score += 500;
  else if (sym.includes(qUpper)) score += 200;
  if (name.includes(qUpper)) score += 100;
  return score;
}

export function sortAssetsByRelevance(assets, q) {
  const qu = q.trim().toUpperCase();
  return [...assets].sort((a, b) => {
    const sb = scoreAssetMatch(b, qu) - scoreAssetMatch(a, qu);
    if (sb !== 0) return sb;
    const tb = (b.lastUsedAt?.getTime() || 0) - (a.lastUsedAt?.getTime() || 0);
    if (tb !== 0) return tb;
    return (b.usageCount || 0) - (a.usageCount || 0);
  });
}

export function buildAssetSearchFilter(q) {
  const trimmed = q.trim();
  if (!trimmed) return null;
  const rx = new RegExp(escapeRegex(trimmed), 'i');
  return { $or: [{ symbol: rx }, { name: rx }] };
}
