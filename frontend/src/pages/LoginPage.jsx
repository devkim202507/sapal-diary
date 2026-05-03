import { useState } from 'react';
import { authApi } from '../services/api.js';

export default function LoginPage({ onLoggedIn }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    const em = email.trim();
    if (!em) {
      setError('이메일을 입력해 주세요.');
      return;
    }
    if (!em.includes('@')) {
      setError('이메일 형식을 확인해 주세요.');
      return;
    }
    if (!password) {
      setError('비밀번호를 입력해 주세요.');
      return;
    }
    if (mode === 'signup' && password.length < 6) {
      setError('비밀번호는 6자 이상 입력해 주세요.');
      return;
    }
    setLoading(true);
    try {
      const fn = mode === 'login' ? authApi.login : authApi.signup;
      const data = await fn(em, password);
      onLoggedIn(data);
    } catch (err) {
      setError(err.message || '요청에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col justify-center px-4 pb-24">
      <h1 className="mb-1 text-center text-2xl font-semibold tracking-tight text-white">
        sapal-diary
      </h1>
      <p className="mb-8 text-center text-sm text-slate-400">빠른 매매 기록 · 성과 분석</p>
      <form onSubmit={submit} className="mx-auto w-full max-w-sm space-y-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-400">이메일</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-base outline-none ring-emerald-500/40 focus:ring-2"
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-400">비밀번호</span>
          <input
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-base outline-none ring-emerald-500/40 focus:ring-2"
            required
            minLength={6}
          />
        </label>
        {error ? (
          <p className="text-sm text-rose-400" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-xl bg-emerald-500 text-base font-semibold text-slate-950 active:bg-emerald-400 disabled:opacity-50"
        >
          {loading ? '처리 중…' : mode === 'login' ? '로그인' : '가입하기'}
        </button>
      </form>
      <button
        type="button"
        onClick={() => {
          setMode((m) => (m === 'login' ? 'signup' : 'login'));
          setError('');
        }}
        className="mx-auto mt-6 text-sm text-emerald-400/90"
      >
        {mode === 'login' ? '계정이 없으면 가입' : '이미 계정이 있으면 로그인'}
      </button>
    </div>
  );
}
