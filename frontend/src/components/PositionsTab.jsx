import { useCallback, useEffect, useState } from 'react';
import { tradesApi } from '../services/api.js';

function Card({ children, className = '' }) {
  return (
    <div
      className={`rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

function formatTradeWhen(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('ko-KR', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function PositionsTab({ refreshKey, onRecorded }) {
  const [positions, setPositions] = useState([]);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [posRes, tradeList] = await Promise.all([
        tradesApi.positions(),
        tradesApi.list(),
      ]);
      setPositions(Array.isArray(posRes?.positions) ? posRes.positions : []);
      setTrades(Array.isArray(tradeList) ? tradeList : []);
    } catch (e) {
      setError(e.message || '불러오지 못했습니다.');
      setPositions([]);
      setTrades([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  async function handleDeleteTrade(trade) {
    const id = trade?._id;
    if (!id) return;
    if (
      !window.confirm(
        `${trade.symbol} ${trade.type === 'BUY' ? '매수' : '매도'} ${trade.quantity}주 기록을 삭제할까요?`
      )
    ) {
      return;
    }
    setDeletingId(id);
    setNotice(null);
    try {
      await tradesApi.remove(id);
      setNotice({ variant: 'success', text: '해당 매매 기록이 삭제되었습니다.' });
      await load();
      onRecorded?.();
    } catch (e) {
      setNotice({
        variant: 'error',
        text: e.message || '삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      });
    } finally {
      setDeletingId(null);
    }
  }

  if (error) {
    return <p className="px-4 text-sm text-rose-400">{error}</p>;
  }
  if (loading) {
    return <p className="px-4 text-sm text-slate-500">불러오는 중…</p>;
  }

  if (positions.length === 0) {
    return (
      <p className="px-4 pt-4 text-center text-sm text-slate-500">
        표시할 보유·거래 요약이 없습니다. 입력 탭에서 매매를 기록해 보세요.
      </p>
    );
  }

  return (
    <div className="space-y-4 px-4 pb-10 pt-4">
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

      {positions.map((p) => {
        const symbolTrades = trades
          .filter((t) => t.symbol === p.symbol)
          .sort(
            (a, b) =>
              new Date(b.date).getTime() - new Date(a.date).getTime() ||
              String(b._id).localeCompare(String(a._id))
          );
        const isOpen = p.holdingQuantity > 0;

        return (
          <Card key={p.symbol}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-lg font-bold text-white">{p.symbol}</span>
              <span
                className={`text-sm ${isOpen ? 'text-slate-300' : 'text-slate-500'}`}
              >
                {isOpen ? `보유 ${p.holdingQuantity}` : '보유 0 (청산)'}
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-slate-500">평균 매수가</dt>
                <dd className="font-medium text-slate-100">{p.averageBuyPrice}</dd>
              </div>
              <div>
                <dt className="text-slate-500">매수금액 합</dt>
                <dd className="font-medium text-slate-100">{p.totalBuyAmount}</dd>
              </div>
            </dl>

            <div className="mt-4 border-t border-slate-800/80 pt-3">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                이 종목 매매 기록
              </h3>
              {symbolTrades.length === 0 ? (
                <p className="text-sm text-slate-500">표시할 기록이 없습니다.</p>
              ) : (
                <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
                  {symbolTrades.map((t) => (
                    <li
                      key={t._id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-slate-800/90 bg-slate-950/40 px-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <span
                          className={
                            t.type === 'BUY'
                              ? 'text-xs font-semibold text-emerald-400'
                              : 'text-xs font-semibold text-rose-400'
                          }
                        >
                          {t.type === 'BUY' ? '매수' : '매도'}
                        </span>
                        <p className="truncate text-sm text-slate-300">
                          {t.price} × {t.quantity}
                          <span className="text-slate-600"> · </span>
                          {formatTradeWhen(t.date)}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={deletingId === t._id}
                        onClick={() => handleDeleteTrade(t)}
                        className="shrink-0 rounded-lg border border-slate-600 px-2.5 py-1.5 text-xs font-medium text-slate-200 active:bg-slate-800 disabled:opacity-50"
                      >
                        {deletingId === t._id ? '삭제 중…' : '삭제'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
