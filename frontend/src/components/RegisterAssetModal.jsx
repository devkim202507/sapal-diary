import { useEffect, useState } from 'react';

export default function RegisterAssetModal({
  open,
  symbol,
  tradeTypeLabel,
  onCancel,
  onConfirm,
}) {
  const [name, setName] = useState('');
  const [market, setMarket] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(symbol || '');
    setMarket('');
    setError('');
    setBusy(false);
  }, [open, symbol]);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    const n = name.trim();
    if (!n) {
      setError('종목명을 입력해 주세요.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await onConfirm({
        name: n,
        market: market.trim(),
      });
    } catch (err) {
      setError(err.message || '등록에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-3 py-6 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="register-asset-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-950 p-4 shadow-2xl">
        <h2 id="register-asset-title" className="text-lg font-semibold text-white">
          새 종목 등록
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          등록되지 않은 심볼입니다. 아래 정보를 입력한 뒤 {tradeTypeLabel} 기록까지
          진행합니다. (관리자 전용)
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-400">종목 코드</span>
            <input
              type="text"
              readOnly
              value={symbol}
              className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 text-base font-semibold text-slate-300"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-400">종목명</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-base outline-none ring-emerald-500/40 focus:ring-2"
              placeholder="예: 삼성전자"
              autoFocus
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-400">시장 (선택)</span>
            <input
              type="text"
              value={market}
              onChange={(e) => setMarket(e.target.value)}
              className="h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-base outline-none ring-emerald-500/40 focus:ring-2"
              placeholder="예: KOSPI, NASDAQ"
            />
          </label>

          {error ? (
            <p className="text-sm text-rose-400" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="h-12 flex-1 rounded-xl border border-slate-600 text-sm font-semibold text-slate-200 active:bg-slate-800 disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={busy}
              className="h-12 flex-1 rounded-xl bg-emerald-500 text-sm font-semibold text-slate-950 active:bg-emerald-400 disabled:opacity-50"
            >
              {busy ? '처리 중…' : '등록 후 저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
