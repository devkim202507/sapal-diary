import { useCallback, useEffect, useRef, useState } from 'react';
import SymbolAutocomplete from './SymbolAutocomplete.jsx';
import RegisterAssetModal from './RegisterAssetModal.jsx';
import { assetsApi, tradesApi } from '../services/api.js';
import { useLocalStorage } from '../hooks/useLocalStorage.js';

const EMPTY_TRADE_DRAFT = { symbol: '', price: '', quantity: '' };

function validateTradeDraft(draft) {
  const symbol = String(draft.symbol ?? '').trim();
  if (!symbol) {
    return {
      ok: false,
      message: '종목 심볼을 입력해 주세요.',
      focus: 'symbol',
    };
  }

  const priceStr = String(draft.price ?? '').trim();
  if (!priceStr) {
    return {
      ok: false,
      message: '가격을 입력해 주세요.',
      focus: 'price',
    };
  }
  const price = Number(priceStr);
  if (!Number.isFinite(price) || price < 0) {
    return {
      ok: false,
      message: '올바른 가격(0 이상 숫자)을 입력해 주세요.',
      focus: 'price',
    };
  }

  const qtyStr = String(draft.quantity ?? '').trim();
  if (!qtyStr) {
    return {
      ok: false,
      message: '수량을 입력해 주세요.',
      focus: 'quantity',
    };
  }
  const quantity = Number(qtyStr);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return {
      ok: false,
      message: '올바른 수량(0보다 큰 숫자)을 입력해 주세요.',
      focus: 'quantity',
    };
  }

  return { ok: true, symbol: symbol.toUpperCase(), price, quantity };
}

export default function TradeInputTab({ onRecorded, isAdmin, userKey }) {
  const draftStorageKey = `sapal_trade_draft_${userKey}`;
  const [draft, setDraft] = useLocalStorage(draftStorageKey, EMPTY_TRADE_DRAFT);
  const [notice, setNotice] = useState(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [pendingTrade, setPendingTrade] = useState(null);
  const symbolRef = useRef(null);
  const priceRef = useRef(null);
  const qtyRef = useRef(null);
  const successTimer = useRef(null);

  useEffect(() => {
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, []);

  const clearNotice = useCallback(() => setNotice(null), []);

  const setField = useCallback(
    (k, v) => {
      clearNotice();
      setDraft((d) => ({ ...d, [k]: v }));
    },
    [clearNotice, setDraft]
  );

  const focusField = useCallback((focus) => {
    requestAnimationFrame(() => {
      if (focus === 'symbol') symbolRef.current?.focus();
      else if (focus === 'price') priceRef.current?.focus();
      else if (focus === 'quantity') qtyRef.current?.focus();
    });
  }, []);

  const finalizeSuccess = useCallback(
    (type) => {
      if (successTimer.current) clearTimeout(successTimer.current);
      setNotice({
        variant: 'success',
        text: type === 'BUY' ? '매수가 기록되었습니다.' : '매도가 기록되었습니다.',
      });
      successTimer.current = setTimeout(() => setNotice(null), 2800);
      onRecorded?.();
    },
    [onRecorded]
  );

  const submit = useCallback(
    async (type) => {
      const v = validateTradeDraft(draft);
      if (!v.ok) {
        setNotice({ variant: 'error', text: v.message });
        focusField(v.focus);
        return;
      }

      const date = new Date().toISOString();
      try {
        const { exists } = await assetsApi.exists(v.symbol);
        if (exists) {
          await tradesApi.create({
            symbol: v.symbol,
            type,
            price: v.price,
            quantity: v.quantity,
            date,
          });
          finalizeSuccess(type);
          return;
        }

        if (!isAdmin) {
          setNotice({
            variant: 'error',
            text: '등록되지 않은 종목입니다. 관리자에게 종목 등록을 요청하거나, 등록된 심볼을 선택해 주세요.',
          });
          return;
        }

        setPendingTrade({
          type,
          symbol: v.symbol,
          price: v.price,
          quantity: v.quantity,
          date,
        });
        setRegisterOpen(true);
      } catch (e) {
        setNotice({
          variant: 'error',
          text: e.message || '저장에 실패했습니다. 잠시 후 다시 시도해 주세요.',
        });
      }
    },
    [draft, finalizeSuccess, focusField, isAdmin]
  );

  async function handleRegisterConfirm({ name, market }) {
    if (!pendingTrade) return;
    const { type, symbol, price, quantity, date } = pendingTrade;
    await assetsApi.create({ symbol, name, market });
    await tradesApi.create({ symbol, type, price, quantity, date });
    setRegisterOpen(false);
    setPendingTrade(null);
    finalizeSuccess(type);
  }

  function onFormKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit('BUY');
    } else if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      submit('SELL');
    }
  }

  const tradeLabel =
    pendingTrade?.type === 'SELL' ? '매도' : pendingTrade?.type === 'BUY' ? '매수' : '';

  return (
    <div className="flex min-h-full flex-col pb-40" onKeyDown={onFormKeyDown}>
      <div className="px-4 pt-4">
        <p className="text-sm text-slate-400">
          Enter: 매수 · Shift+Enter: 매도 · 하단 바에서 빠르게 입력
        </p>
        <p className="mt-2 text-sm text-slate-500">
          미등록 심볼은 매매를 저장할 수 없습니다.
          {isAdmin
            ? ' 관리자는 등록 확인 후 종목명·시장을 입력해 새로 등록할 수 있습니다.'
            : ' 관리자에게 종목 등록을 요청해 주세요.'}
        </p>
      </div>

      <RegisterAssetModal
        open={registerOpen}
        symbol={pendingTrade?.symbol || ''}
        tradeTypeLabel={tradeLabel}
        onCancel={() => {
          setRegisterOpen(false);
          setPendingTrade(null);
        }}
        onConfirm={handleRegisterConfirm}
      />

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-lg flex-col gap-2">
          <SymbolAutocomplete
            ref={symbolRef}
            value={draft.symbol}
            onChangeSymbol={(v) => setField('symbol', v)}
            onInput={clearNotice}
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-400">가격</span>
              <input
                ref={priceRef}
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={draft.price}
                onChange={(e) => setField('price', e.target.value)}
                className="h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-base outline-none ring-emerald-500/40 focus:ring-2"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-400">수량</span>
              <input
                ref={qtyRef}
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={draft.quantity}
                onChange={(e) => setField('quantity', e.target.value)}
                className="h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-base outline-none ring-emerald-500/40 focus:ring-2"
              />
            </label>
          </div>

          {notice ? (
            <div
              role={notice.variant === 'error' ? 'alert' : 'status'}
              aria-live="polite"
              className={
                notice.variant === 'error'
                  ? 'rounded-xl border border-rose-800/60 bg-rose-950/40 px-3 py-2.5 text-sm text-rose-100'
                  : 'rounded-xl border border-emerald-800/50 bg-emerald-950/35 px-3 py-2.5 text-sm text-emerald-100'
              }
            >
              {notice.text}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => submit('BUY')}
              className="h-14 rounded-2xl bg-emerald-500 text-lg font-bold text-slate-950 active:scale-[0.99] active:bg-emerald-400"
            >
              매수
            </button>
            <button
              type="button"
              onClick={() => submit('SELL')}
              className="h-14 rounded-2xl bg-rose-500 text-lg font-bold text-white active:scale-[0.99] active:bg-rose-400"
            >
              매도
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
