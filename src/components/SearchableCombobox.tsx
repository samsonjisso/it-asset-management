'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

export interface SearchableComboboxOption {
  value: string;
  // Optional secondary line shown under the value (e.g. a hostname's
  // linked status, an owner's department) — also included in search.
  sublabel?: string;
}

interface SearchableComboboxProps {
  options: SearchableComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  pattern?: string;
  title?: string;
  autoComplete?: string;
}

// Free-text input backed by a searchable suggestion dropdown, for
// fields that reference an existing list of values but still need to
// accept a brand-new one (hostnames, MAC addresses, patch panel
// labels, owner names, IP addresses typed by hand). This replaces the
// native <input list="..."> / <datalist> pattern used previously:
// same "type to filter, pick or keep typing" behavior, but styled and
// keyboard-navigable consistently with SearchableSelect elsewhere in
// the app (long lists of existing values become a filtered dropdown
// instead of a native browser popup).
export function SearchableCombobox({
  options,
  value,
  onChange,
  placeholder = 'Type or select…',
  searchPlaceholder,
  emptyMessage = 'No matches — keep typing to use a new value.',
  required,
  disabled,
  className,
  pattern,
  title,
  autoComplete = 'off',
}: SearchableComboboxProps) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => `${o.value} ${o.sublabel ?? ''}`.toLowerCase().includes(q));
  }, [options, value]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  useEffect(() => {
    setHighlight(0);
  }, [value, open]);

  const pick = (val: string) => {
    onChange(val);
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && open && filtered[highlight]) {
      e.preventDefault();
      pick(filtered[highlight].value);
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className ?? ''}`}>
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          pattern={pattern}
          title={title}
          autoComplete={autoComplete}
          className="gbb-input w-full pl-8 pr-8 py-2.5 rounded-xl border-2 border-brand-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 hover:border-brand-500 disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:text-gray-400 dark:disabled:text-gray-500"
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-red-500"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && !disabled && options.length > 0 && (
        <div className="absolute z-20 mt-1.5 w-full border border-brand-600 rounded-xl bg-white dark:bg-gray-900 shadow-soft p-2">
          {searchPlaceholder && (
            <p className="text-[11px] text-gray-400 dark:text-gray-500 px-1 pb-1">{searchPlaceholder}</p>
          )}
          <div className="max-h-56 overflow-y-auto divide-y divide-gray-100">
            {filtered.length === 0 && <p className="text-xs text-center text-gray-400 dark:text-gray-500 py-3 px-1">{emptyMessage}</p>}
            {filtered.map((o, i) => (
              <button
                key={o.value}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(o.value)}
                onMouseEnter={() => setHighlight(i)}
                className={`w-full text-left px-2.5 py-2 rounded-lg flex flex-col ${
                  i === highlight ? 'bg-brand-50 dark:bg-brand-900/40' : ''
                } ${o.value === value ? 'font-medium text-brand-700 dark:text-brand-300' : 'text-gray-900 dark:text-gray-100'}`}
              >
                <span className="text-sm truncate">{o.value}</span>
                {o.sublabel && <span className="text-xs text-gray-400 dark:text-gray-500 truncate">{o.sublabel}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
