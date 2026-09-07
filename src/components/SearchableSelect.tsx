'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

export interface SearchableSelectOption {
  value: string;
  label: string;
  // Optional secondary line shown under the label, and included in
  // the search match (e.g. an IP's status/owner) - lets a long list
  // stay searchable by more than just its primary label.
  sublabel?: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

// Drop-in replacement for a plain <SelectInput> when the option list
// can grow long (access switch IPs, and anything else pulled from a
// Customization table). Renders the same trigger height/styling as
// SelectInput but opens a searchable, keyboard-navigable list instead
// of dumping every option into the browser's native <select> popup -
// see requirement #20 (IP Address selection).
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Type to search…',
  emptyMessage = 'No matches.',
  required,
  disabled,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => `${o.label} ${o.sublabel ?? ''}`.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setHighlight(Math.max(0, options.findIndex((o) => o.value === value)));
      // Let the popover mount before focusing.
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  const pick = (val: string) => {
    onChange(val);
    setOpen(false);
    setQuery('');
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = filtered[highlight];
      if (opt) pick(opt.value);
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className ?? ''}`}>
      {/* Hidden input carries native required-field validation, since
          the visible control is a button rather than a real <select>. */}
      {required && <input tabIndex={-1} aria-hidden value={value} required onChange={() => {}} className="sr-only" />}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="gbb-input w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border-2 border-brand-600 bg-white dark:bg-gray-900 text-sm text-left hover:border-brand-500 disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:text-gray-400 dark:disabled:text-gray-500"
      >
        <span className={`truncate ${selected ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          {selected && !disabled && (
            <X
              size={14}
              className="text-gray-400 dark:text-gray-500 hover:text-red-500"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
            />
          )}
          <ChevronDown size={16} className={`text-gray-400 dark:text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {open && (
        <div className="absolute z-20 mt-1.5 w-full border border-brand-600 rounded-xl bg-white dark:bg-gray-900 shadow-soft p-2 space-y-1.5">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={searchPlaceholder}
              className="gbb-input w-full pl-8 pr-3 py-2 rounded-lg border-2 border-brand-600 bg-white dark:bg-gray-900 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>
          <div className="max-h-56 overflow-y-auto divide-y divide-gray-100">
            {filtered.length === 0 && <p className="text-xs text-center text-gray-400 dark:text-gray-500 py-3 px-1">{emptyMessage}</p>}
            {filtered.map((o, i) => (
              <button
                key={o.value}
                type="button"
                onClick={() => pick(o.value)}
                onMouseEnter={() => setHighlight(i)}
                className={`w-full text-left px-2.5 py-2 rounded-lg flex flex-col ${
                  i === highlight ? 'bg-brand-50 dark:bg-brand-900/40' : ''
                } ${o.value === value ? 'font-medium text-brand-700 dark:text-brand-300' : 'text-gray-900 dark:text-gray-100'}`}
              >
                <span className="text-sm truncate">{o.label}</span>
                {o.sublabel && <span className="text-xs text-gray-400 dark:text-gray-500 truncate">{o.sublabel}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
