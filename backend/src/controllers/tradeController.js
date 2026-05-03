import mongoose from 'mongoose';
import { Asset } from '../models/Asset.js';
import { Trade } from '../models/Trade.js';
import { buildPositionsFromTrades } from '../services/positionService.js';
import { buildAnalysisResponse } from '../services/analysisService.js';
import {
  incrementAssetUsage,
  reconcileAssetUsageForSymbol,
} from '../services/assetUsageService.js';
import { assertTradeAllowed } from '../services/tradeValidationService.js';

function parseCurrentPrices(req) {
  const raw = req.query.prices ?? req.query.currentPrices;
  if (!raw || typeof raw !== 'string') return {};
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      const out = {};
      for (const [k, v] of Object.entries(obj)) {
        const n = Number(v);
        if (!Number.isNaN(n)) out[String(k).toUpperCase().trim()] = n;
      }
      return out;
    }
  } catch {
    /* ignore */
  }
  return {};
}

export async function createTrade(req, res, next) {
  try {
    const symbol = String(req.body.symbol || '')
      .trim()
      .toUpperCase();
    const type = String(req.body.type || '').toUpperCase();
    const price = Number(req.body.price);
    const quantity = Number(req.body.quantity);
    const date = req.body.date ? new Date(req.body.date) : new Date();

    if (!symbol || !['BUY', 'SELL'].includes(type)) {
      return res.status(400).json({ error: 'symbol and type (BUY|SELL) required' });
    }
    if (!Number.isFinite(price) || price < 0) {
      return res.status(400).json({ error: 'Valid price required' });
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return res.status(400).json({ error: 'Valid quantity required' });
    }
    if (Number.isNaN(date.getTime())) {
      return res.status(400).json({ error: 'Invalid date' });
    }

    const assetRegistered = await Asset.exists({ symbol });
    if (!assetRegistered) {
      return res.status(400).json({
        error:
          '등록되지 않은 종목입니다. 관리자에게 종목 등록을 요청하거나, 등록된 심볼을 사용해 주세요.',
      });
    }

    await assertTradeAllowed(req.userId, { symbol, type, price, quantity, date });

    const trade = await Trade.create({
      userId: req.userId,
      symbol,
      type,
      price,
      quantity,
      date,
    });

    await incrementAssetUsage(symbol);

    res.status(201).json(trade);
  } catch (e) {
    if (e.status) {
      return res.status(e.status).json({ error: e.message });
    }
    next(e);
  }
}

export async function listTrades(req, res, next) {
  try {
    const trades = await Trade.find({ userId: req.userId })
      .sort({ date: -1, _id: -1 })
      .lean();
    res.json(trades);
  } catch (e) {
    next(e);
  }
}

export async function deleteTrade(req, res, next) {
  try {
    const id = String(req.params.id || '');
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid trade id' });
    }
    const existing = await Trade.findOne({ _id: id, userId: req.userId })
      .select('symbol')
      .lean();
    if (!existing) {
      return res.status(404).json({ error: 'Trade not found' });
    }
    const symbol = String(existing.symbol || '').toUpperCase().trim();
    await Trade.deleteOne({ _id: id, userId: req.userId });
    if (symbol) {
      await reconcileAssetUsageForSymbol(symbol);
    }
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

export async function getPositions(req, res, next) {
  try {
    const trades = await Trade.find({ userId: req.userId })
      .sort({ date: 1, _id: 1 })
      .lean();
    const sorted = trades.map((t) => ({
      type: t.type,
      price: t.price,
      quantity: t.quantity,
      symbol: t.symbol,
      date: t.date,
    }));
    const positions = buildPositionsFromTrades(sorted);
    res.json({ positions });
  } catch (e) {
    next(e);
  }
}

export async function getAnalysis(req, res, next) {
  try {
    const trades = await Trade.find({ userId: req.userId })
      .sort({ date: 1, _id: 1 })
      .lean();
    const sorted = trades.map((t) => ({
      type: t.type,
      price: t.price,
      quantity: t.quantity,
      symbol: t.symbol,
      date: t.date,
    }));
    const currentPrices = parseCurrentPrices(req);
    const analysis = buildAnalysisResponse(sorted, currentPrices);
    res.json(analysis);
  } catch (e) {
    next(e);
  }
}
