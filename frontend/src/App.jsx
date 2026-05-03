import { useCallback, useEffect, useState } from 'react';
import LoginPage from './pages/LoginPage.jsx';
import TabBar from './components/TabBar.jsx';
import TradeInputTab from './components/TradeInputTab.jsx';
import PositionsTab from './components/PositionsTab.jsx';
import AnalysisTab from './components/AnalysisTab.jsx';
import {
  authApi,
  clearAppLocalData,
  getSession,
  getToken,
  setSession,
  setToken,
} from './services/api.js';

export default function App() {
  const [authed, setAuthed] = useState(() => Boolean(getToken()));
  const [session, setSessionState] = useState(() =>
    getToken() ? getSession() : null
  );
  const [tab, setTab] = useState('trade');
  const [refreshKey, setRefreshKey] = useState(0);

  const bump = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!authed) {
      setSessionState(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const me = await authApi.me();
        if (!cancelled) {
          setSessionState(me);
          setSession(me);
        }
      } catch {
        /* 토큰 만료 등은 기존 세션 유지 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authed]);

  if (!authed) {
    return (
      <LoginPage
        onLoggedIn={(data) => {
          setToken(data.token);
          setSession(data.user);
          setSessionState(data.user);
          setAuthed(true);
        }}
      />
    );
  }

  const isAdmin = session?.userType === 'admin';
  const userStorageKey = session?.id || session?.email || null;

  return (
    <div className="flex min-h-full flex-col">
      <header className="fixed inset-x-0 top-0 z-30 border-b border-slate-800 bg-slate-950/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-tight text-slate-200">
              sapal-diary
            </span>
            {isAdmin ? (
              <span className="rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
                관리자
              </span>
            ) : null}
          </div>
          <button
            type="button"
            className="text-xs text-slate-500"
            onClick={() => {
              if (!window.confirm('로그아웃하시겠습니까?')) return;
              clearAppLocalData();
              setToken(null);
              setSession(null);
              setSessionState(null);
              setAuthed(false);
            }}
          >
            로그아웃
          </button>
        </div>
        <TabBar active={tab} onChange={setTab} />
      </header>
      <main className="flex-1 pt-[calc(6.25rem+env(safe-area-inset-top))]">
        {tab === 'trade' ? (
          userStorageKey ? (
            <TradeInputTab
              onRecorded={bump}
              isAdmin={isAdmin}
              userKey={userStorageKey}
            />
          ) : (
            <p className="px-4 pt-4 text-sm text-slate-500">세션 확인 중…</p>
          )
        ) : null}
        {tab === 'positions' ? (
          <PositionsTab refreshKey={refreshKey} onRecorded={bump} />
        ) : null}
        {tab === 'analysis' ? (
          userStorageKey ? (
            <AnalysisTab refreshKey={refreshKey} userKey={userStorageKey} />
          ) : (
            <p className="px-4 pt-4 text-sm text-slate-500">세션 확인 중…</p>
          )
        ) : null}
      </main>
    </div>
  );
}
