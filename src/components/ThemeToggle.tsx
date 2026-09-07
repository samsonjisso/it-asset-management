'use client';

import { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { useTheme, type ThemeMode } from '@/context/ThemeContext';

const OPTIONS: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
  { mode: 'light', label: 'Light', icon: Sun },
  { mode: 'dark', label: 'Dark', icon: Moon },
  { mode: 'system', label: 'System', icon: Monitor },
];

/**
 * Header control for switching theme. A single click toggles
 * light/dark directly (the common case); the small chevron opens a
 * menu with an explicit "System" option for people who want to follow
 * their OS setting instead.
 */
export function ThemeToggle({ variant = 'header' }: { variant?: 'header' | 'menu-item' }) {
  const { mode, resolvedTheme, setMode, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (variant === 'menu-item') {
    return (
      <div className="px-4 py-2">
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">Theme</p>
        <div className="flex gap-1">
          {OPTIONS.map(({ mode: m, label, icon: Icon }) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded text-xs font-medium transition-colors ${
                mode === m
                  ? 'bg-brand-50 dark:bg-brand-900/40 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 dark:text-brand-300 ring-1 ring-brand-600'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <div className="flex items-center rounded hover:bg-white/10 transition-colors">
        <button
          type="button"
          onClick={toggle}
          title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-2 text-white/70 hover:text-white transition-colors"
        >
          {resolvedTheme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Theme options"
          className="pr-1.5 pl-0.5 py-2 text-white/50 hover:text-white/80 transition-colors text-[10px]"
        >
          ▾
        </button>
      </div>
      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-900 dark:bg-gray-900 rounded shadow-lift ring-1 ring-black/5 border border-brand-600 z-40 gbb-pop-in py-1.5">
          {OPTIONS.map(({ mode: m, label, icon: Icon }) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Icon size={14} className="text-gray-400 dark:text-gray-500" />
              <span className="flex-1 text-left">{label}</span>
              {mode === m && <Check size={14} className="text-brand-600 dark:text-brand-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
