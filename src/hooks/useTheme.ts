import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';
type ThemePref = Theme | 'system';

const STORAGE_KEY = 'loop-player:theme';

function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function readPref(): ThemePref {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

/**
 * Resolves the active theme: follows the device by default, but a user
 * override is persisted to localStorage and wins over the system setting.
 * Applies `data-theme` to <html> so CSS can react.
 */
export function useTheme() {
  const [pref, setPref] = useState<ThemePref>(() => readPref());
  const [resolved, setResolved] = useState<Theme>(() =>
    pref === 'system' ? systemTheme() : pref,
  );

  // Apply to the document root, and keep in sync with the OS while on 'system'.
  useEffect(() => {
    const root = document.documentElement;

    const apply = () => {
      const next = pref === 'system' ? systemTheme() : pref;
      setResolved(next);
      if (pref === 'system') root.removeAttribute('data-theme');
      else root.setAttribute('data-theme', pref);
    };

    apply();

    if (pref !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [pref]);

  const toggle = useCallback(() => {
    setPref((prev) => {
      const current = prev === 'system' ? systemTheme() : prev;
      const next: Theme = current === 'dark' ? 'light' : 'dark';
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return { theme: resolved, toggle };
}
