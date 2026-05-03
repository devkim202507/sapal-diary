import { useEffect, useMemo, useState } from 'react';
import { tradesApi } from '../services/api.js';
import { useLocalStorage } from '../hooks/useLocalStorage.js';

const SAMPLE_PRICES_JSON = `{
  "AAPL": 175.5,
  "005930": 71200,
  "TSLA": 242.1
}`;

function Card({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <h3 className="text-sm font-semibold text-emerald-400/90">{title}</h3>
      <div className="mt-2 text-sm text-slate-200">{children}</div>
    </section>
  );
}

export default function AnalysisTab({ refreshKey, userKey }) {
  const pricesStorageKey = `sapal_analysis_prices_${userKey}`;
  const [pricesText, setPricesText] = useLocalStorage(pricesStorageKey, '{}');
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState('');

  const pricesObj = useMemo(() => {
    try {
      const o = JSON.parse(pricesText || '{}');
      return typeof o === 'object' && o && !Array.isArray(o) ? o : {};
    } catch {
      return {};
    }
  }, [pricesText]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await tradesApi.analysis(pricesObj);
        if (!cancelled) setAnalysis(res);
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey, pricesObj]);

  return (
    <div className="space-y-4 px-4 pb-10 pt-4">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <h2 className="text-sm font-semibold text-slate-200">현재가 (선택)</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          <strong className="font-medium text-slate-300">미실현·“안 팔았다면?”</strong> 계산에 쓸
          종목별 현재 주가입니다.{' '}
          <span className="text-slate-500">
            JSON 객체 형태로, 키는 <strong className="text-slate-400">심볼</strong>(대문자 권장),
            값은 <strong className="text-slate-400">숫자(가격)</strong>만 넣으면 됩니다.
          </span>
        </p>

        <details className="mt-3 rounded-xl border border-slate-700/80 bg-slate-950/50 px-3 py-2">
          <summary className="cursor-pointer select-none text-sm font-medium text-emerald-400/90">
            입력 예시 보기
          </summary>
          <p className="mt-2 text-xs text-slate-500">
            아래는 형식만 보여 주는 예시입니다. 실제 보유 심볼·가격으로 바꿔 쓰세요.
          </p>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-950 p-3 text-left font-mono text-xs leading-relaxed text-slate-300">
            {SAMPLE_PRICES_JSON}
          </pre>
        </details>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPricesText(SAMPLE_PRICES_JSON.trim())}
            className="rounded-lg border border-emerald-800/60 bg-emerald-950/30 px-3 py-2 text-xs font-semibold text-emerald-200 active:bg-emerald-950/50"
          >
            샘플로 채우기
          </button>
          <button
            type="button"
            onClick={() => setPricesText('{}')}
            className="rounded-lg border border-slate-600 px-3 py-2 text-xs font-medium text-slate-300 active:bg-slate-800"
          >
            비우기 ({'{}'})
          </button>
        </div>

        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-medium text-slate-400">
            현재가 JSON
          </span>
          <textarea
            rows={6}
            spellCheck={false}
            value={pricesText}
            onChange={(e) => setPricesText(e.target.value)}
            placeholder={'한 줄 예: {"005930": 70000}\n\n여러 줄 예는 위 「입력 예시 보기」 참고'}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 font-mono text-sm leading-relaxed outline-none ring-emerald-500/40 focus:ring-2"
          />
        </label>
        <p className="mt-2 text-xs text-slate-500">
          JSON이 비어 있거나 잘못되면 미실현·가정 손익은 0에 가깝게 나올 수 있습니다. 키와 문자열은
          표준 JSON처럼 큰따옴표로 감싸 주세요.
        </p>
      </section>
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      {!analysis ? (
        <p className="text-sm text-slate-500">분석 불러오는 중…</p>
      ) : (
        <div className="space-y-3">
          <Card title="손익 요약">
            <ul className="space-y-1">
              <li>실현: {analysis.realizedProfit}</li>
              <li>미실현: {analysis.unrealizedProfit}</li>
              <li>합산(실현+미실현): {analysis.actualTotalPnL}</li>
            </ul>
          </Card>
          <Card title="승률 (매도 건 기준)">
            {analysis.winRate == null ? (
              <span>매도 체결이 없습니다.</span>
            ) : (
              <span>
                {(analysis.winRate * 100).toFixed(1)}% ({analysis.profitableSellCount}/
                {analysis.totalSellTrades})
              </span>
            )}
          </Card>
          <Card title="평균 보유 기간">
            <p>{analysis.averageHoldingDays} 일</p>
            <p className="mt-1 text-xs text-slate-500">{analysis.holdingPeriodNote}</p>
          </Card>
          <Card title="최고 / 최악 매도">
            <p className="text-emerald-300">
              최고:{' '}
              {analysis.bestTrade
                ? `${analysis.bestTrade.symbol} · ${analysis.bestTrade.realizedFromThisSell}`
                : '-'}
            </p>
            <p className="mt-1 text-rose-300">
              최악:{' '}
              {analysis.worstTrade
                ? `${analysis.worstTrade.symbol} · ${analysis.worstTrade.realizedFromThisSell}`
                : '-'}
            </p>
          </Card>
          <Card title="안 팔았다면? (전량 보유 가정)">
            <p>가정 손익: {analysis.whatIfNeverSold.totalProfitIfHeldAllBuysUntilNow}</p>
            <p className="mt-1">실제 합산과 차이: {analysis.whatIfNeverSold.comparison.difference}</p>
            <p className="mt-1 text-xs text-slate-500">
              현재가 JSON이 있는 심볼만 반영됩니다.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
