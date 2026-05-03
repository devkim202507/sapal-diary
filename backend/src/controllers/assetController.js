import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { Asset } from '../models/Asset.js';
import {
  buildAssetSearchFilter,
  sortAssetsByRelevance,
} from '../services/assetSearchService.js';

function normalizeRow(row) {
  const keys = Object.keys(row);
  const lower = {};
  for (const k of keys) {
    lower[String(k).trim().toLowerCase()] = row[k];
  }
  const symbol = String(lower.symbol ?? lower.ticker ?? '').trim().toUpperCase();
  const name = String(lower.name ?? lower['종목명'] ?? symbol).trim() || symbol;
  const market = String(lower.market ?? lower.exchange ?? '').trim();
  return { symbol, name, market };
}

function rowsFromBuffer(buffer, originalname) {
  const name = (originalname || '').toLowerCase();
  if (name.endsWith('.csv') || name.endsWith('.txt')) {
    const text = buffer.toString('utf8');
    const records = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    return records.map(normalizeRow).filter((r) => r.symbol);
  }
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  return json.map(normalizeRow).filter((r) => r.symbol);
}

export async function uploadAssets(req, res, next) {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ error: 'File required (CSV or Excel)' });
    }
    const rows = rowsFromBuffer(req.file.buffer, req.file.originalname);
    let created = 0;
    let updated = 0;
    for (const r of rows) {
      const existing = await Asset.findOne({ symbol: r.symbol });
      if (existing) {
        existing.name = r.name;
        existing.market = r.market;
        await existing.save();
        updated += 1;
      } else {
        await Asset.create({
          symbol: r.symbol,
          name: r.name,
          market: r.market,
        });
        created += 1;
      }
    }
    res.json({
      message: 'Upload processed',
      totalRows: rows.length,
      created,
      updated,
    });
  } catch (e) {
    next(e);
  }
}

export async function assetExists(req, res, next) {
  try {
    const symbol = String(req.query.symbol || '')
      .trim()
      .toUpperCase();
    if (!symbol) {
      return res.status(400).json({ error: 'symbol query is required' });
    }
    const exists = await Asset.exists({ symbol });
    res.json({ exists: Boolean(exists) });
  } catch (e) {
    next(e);
  }
}

export async function searchAssets(req, res, next) {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) {
      return res.json({ items: [] });
    }
    const filter = buildAssetSearchFilter(q);
    if (!filter) return res.json({ items: [] });

    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const raw = await Asset.find(filter).limit(200).lean();
    const sorted = sortAssetsByRelevance(raw, q).slice(0, limit);
    res.json({
      items: sorted.map((a) => ({
        id: a._id,
        symbol: a.symbol,
        name: a.name,
        market: a.market,
        usageCount: a.usageCount,
        lastUsedAt: a.lastUsedAt,
      })),
    });
  } catch (e) {
    next(e);
  }
}

export async function createAsset(req, res, next) {
  try {
    const symbol = String(req.body.symbol || '')
      .trim()
      .toUpperCase();
    const name = String(req.body.name || '').trim();
    const market = String(req.body.market || '').trim();
    if (!symbol) {
      return res.status(400).json({ error: 'symbol is required' });
    }
    if (!name) {
      return res.status(400).json({ error: '종목명(name)을 입력해 주세요.' });
    }
    const dupe = await Asset.findOne({ symbol }).select('_id').lean();
    if (dupe) {
      return res.status(409).json({ error: '이미 등록된 종목입니다.' });
    }
    const doc = await Asset.create({
      symbol,
      name,
      market,
    });
    res.status(201).json({
      id: doc._id,
      symbol: doc.symbol,
      name: doc.name,
      market: doc.market,
      usageCount: doc.usageCount,
      lastUsedAt: doc.lastUsedAt,
    });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(409).json({ error: '이미 등록된 종목입니다.' });
    }
    next(e);
  }
}
