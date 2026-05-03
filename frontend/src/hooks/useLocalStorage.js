import { useCallback, useEffect, useState } from 'react';

export function useLocalStorage(key, initialValue) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return initialValue;
      return JSON.parse(raw);
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) {
        setState(initialValue);
      } else {
        setState(JSON.parse(raw));
      }
    } catch {
      setState(initialValue);
    }
  }, [key, initialValue]);

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [key, state]);

  const update = useCallback((valueOrFn) => {
    setState((prev) => {
      const next =
        typeof valueOrFn === 'function' ? valueOrFn(prev) : valueOrFn;
      return next;
    });
  }, []);

  return [state, update];
}
