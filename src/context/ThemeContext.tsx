'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  /** The mode the user picked ('system' means "follow the OS setting"). */
  mode: ThemeMode;
  /** The mode actually applied right now ('light' or 'dark' — 'system' is already resolved). */
  resolvedTheme: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'gbb_theme';

function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyThemeClass(isDark: boolean) {
  const root = document.documentElement;
  root.classList.toggle('dark', isDark);
  root.style.colorScheme = isDark ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Real initial value is set from localStorage/system in the effect
  // below (this runs after the inline anti-flash script in layout.tsx
  // has already applied the right class to <html>, so there's no
  // flash — this state just needs to catch up to match it).
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as ThemeMode | null) || 'system';
    setModeState(stored);
    const isDark = stored === 'dark' || (stored === 'system' && getSystemPrefersDark());
    setResolvedTheme(isDark ? 'dark' : 'light');
    applyThemeClass(isDark);
  }, []);

  useEffect(() => {
    if (mode !== 'system') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      setResolvedTheme(mql.matches ? 'dark' : 'light');
      applyThemeClass(mql.matches);
    };
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    localStorage.setItem(STORAGE_KEY, next);
    const isDark = next === 'dark' || (next === 'system' && getSystemPrefersDark());
    setResolvedTheme(isDark ? 'dark' : 'light');
    applyThemeClass(isDark);
  }, []);

  const toggle = useCallback(() => {
    setMode(resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [resolvedTheme, setMode]);

  const value = useMemo(() => ({ mode, resolvedTheme, setMode, toggle }), [mode, resolvedTheme, setMode, toggle]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}

/**
 * Inline script source, injected as a blocking <script> in the root
 * layout's <head> (see src/app/layout.tsx). Runs before React
 * hydrates and before first paint, so the correct theme class is
 * already on <html> — no flash of the wrong theme on reload.
 */
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('${STORAGE_KEY}');
    var isDark = stored === 'dark' || (stored !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var root = document.documentElement;
    if (isDark) root.classList.add('dark');
    root.style.colorScheme = isDark ? 'dark' : 'light';
  } catch (e) {}
})();
`;
