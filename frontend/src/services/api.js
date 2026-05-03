const TOKEN_KEY = 'sapal_token';
const SESSION_KEY = 'sapal_session';

/** 프로덕션: Vercel 등에서 Render API 호출 시 VITE_API_URL=https://xxx.onrender.com (끝 슬래시 없음) */
const API_BASE = String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function apiUrl(path) {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_BASE}${path}`;
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/** 로그인 직후·/auth/me 갱신 시 저장 (userType 등) */
export function setSession(profile) {
  if (!profile) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      id: profile.id != null ? String(profile.id) : '',
      userType: profile.userType === 'admin' ? 'admin' : 'user',
      email: profile.email || '',
    })
  );
}

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return { id: '', userType: 'user', email: '' };
    const o = JSON.parse(raw);
    return {
      id: typeof o.id === 'string' ? o.id : o.id != null ? String(o.id) : '',
      userType: o.userType === 'admin' ? 'admin' : 'user',
      email: typeof o.email === 'string' ? o.email : '',
    };
  } catch {
    return { id: '', userType: 'user', email: '' };
  }
}

/** 로그아웃 시 계정별 입력·분석 로컬 데이터 제거 (다른 계정 로그인 시 이전 값 유출 방지) */
export function clearAppLocalData() {
  try {
    const remove = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.startsWith('sapal_trade_draft') || k.startsWith('sapal_analysis_prices')) {
        remove.push(k);
      }
    }
    remove.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

export async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(apiUrl(path), { ...options, headers });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text || 'Invalid response' };
  }
  if (!res.ok) {
    const err = new Error(data?.error || res.statusText);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  if (res.status === 204) return null;
  return data;
}

export const authApi = {
  signup: (email, password) =>
    api('/auth/signup', { method: 'POST', body: JSON.stringify({ email, password }) }),
  login: (email, password) =>
    api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => api('/auth/me'),
};

export const assetsApi = {
  exists: (symbol) =>
    api(`/assets/exists?symbol=${encodeURIComponent(String(symbol || '').trim())}`),
  search: (q) => api(`/assets/search?q=${encodeURIComponent(q)}`),
  create: (body) => api('/assets', { method: 'POST', body: JSON.stringify(body) }),
  upload: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api('/assets/upload', { method: 'POST', body: fd });
  },
};

export const tradesApi = {
  create: (body) => api('/trades', { method: 'POST', body: JSON.stringify(body) }),
  list: () => api('/trades'),
  remove: (id) => api(`/trades/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  positions: () => api('/positions'),
  analysis: (pricesObj) => {
    const q =
      pricesObj && Object.keys(pricesObj).length
        ? `?prices=${encodeURIComponent(JSON.stringify(pricesObj))}`
        : '';
    return api(`/analysis${q}`);
  },
};
