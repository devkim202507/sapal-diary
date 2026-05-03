import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { assetsApi } from '../services/api.js';

const SymbolAutocomplete = forwardRef(function SymbolAutocomplete(
  { value, onChangeSymbol, onBlurCommit, disabled, onInput },
  ref
) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const timer = useRef(null);
  const rootRef = useRef(null);

  const q = useMemo(() => value.trim(), [value]);

  const runSearch = useCallback(async (query) => {
    if (!query) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const data = await assetsApi.search(query);
      setItems(data.items || []);
      setActive(0);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => runSearch(q), 200);
    return () => clearTimeout(timer.current);
  }, [q, open, runSearch]);

  useEffect(() => {
    function onDoc(e) {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function pick(item) {
    onChangeSymbol(item.symbol);
    setOpen(false);
  }

  function onKeyDown(e) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter') && q) {
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(items.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && items[active]) {
      e.preventDefault();
      pick(items[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-400">종목</span>
        <input
          ref={ref}
          type="text"
          autoCapitalize="characters"
          autoComplete="off"
          disabled={disabled}
          value={value}
          onChange={(e) => {
            onInput?.();
            onChangeSymbol(e.target.value.toUpperCase());
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            onBlurCommit?.();
          }}
          onKeyDown={onKeyDown}
          placeholder="심볼 검색"
          className="h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-base font-medium outline-none ring-emerald-500/40 focus:ring-2"
        />
      </label>
      {open && q ? (
        <ul className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-700 bg-slate-900 py-1 shadow-xl">
          {loading ? (
            <li className="px-3 py-2 text-sm text-slate-500">검색 중…</li>
          ) : items.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500">결과 없음</li>
          ) : (
            items.map((it, idx) => (
              <li key={it.id || it.symbol}>
                <button
                  type="button"
                  className={`flex w-full flex-col items-start px-3 py-2 text-left text-sm ${
                    idx === active ? 'bg-slate-800' : ''
                  }`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(it)}
                >
                  <span className="font-semibold text-white">{it.symbol}</span>
                  <span className="text-xs text-slate-400">{it.name}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
});

SymbolAutocomplete.displayName = 'SymbolAutocomplete';

export default SymbolAutocomplete;
