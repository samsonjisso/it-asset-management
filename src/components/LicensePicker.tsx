'use client';

import { useMemo, useState } from 'react';
import { License, LicenseType } from '../lib/supabase';
import { Search, KeyRound, Pencil, X, ChevronDown } from 'lucide-react';

interface LicensePickerProps {
  licenses: License[];
  licenseTypeOptions: LicenseType[];
  value: string;
  // Combined callback: picking a license, switching to manual entry,
  // and clearing the field all need to update license_id and
  // product_key together in one atomic change. Calling two separate
  // setState-based callbacks back-to-back (one for each field) is not
  // safe here, since both would read the same stale parent state and
  // the second call would silently undo the first - which is exactly
  // what made this field "not properly editable" before this fix.
  onChange: (result: { licenseId: string; productKey: string }) => void;
  // The PC currently being edited (if any) - its own linked license
  // stays selectable even though it's "assigned", since it's assigned
  // to *this* record.
  excludePcId?: string;
  disabled?: boolean;
  // Manual-entry escape hatch: when the license someone needs isn't in
  // License Management yet, they can type it in directly instead of
  // picking a record. Mutually exclusive with `value` - picking a
  // license clears this, and typing a manual value clears `value`.
  manualValue?: string;
}

function licenseLabel(license: License, licenseTypeOptions: LicenseType[]) {
  if (license.license_name) return license.license_name;
  const typeLabel = licenseTypeOptions.find((t) => t.code === license.license_type)?.label ?? license.license_type;
  return license.license_subtype ? `${typeLabel} — ${license.license_subtype}` : typeLabel;
}

// Searchable "Add License" -> pick from License Management, per the
// Product Key / License Integration requirement: instead of typing a
// key by hand, the user selects an existing license record here.
export function LicensePicker({ licenses, licenseTypeOptions, value, onChange, excludePcId, disabled, manualValue }: LicensePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = licenses.find((l) => l.id === value) ?? null;
  const hasManual = !selected && !!manualValue?.trim();

  // A license already linked to a *different* PC can't be picked again
  // - this is the "prevent duplicate license assignment" rule. The
  // license currently linked to this PC (if editing) is always shown.
  const available = useMemo(
    () =>
      licenses.filter((l) => {
        if (l.id === value) return true;
        if (!l.assigned_pc) return true;
        return excludePcId ? l.assigned_pc.id === excludePcId : false;
      }),
    [licenses, value, excludePcId]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return available;
    return available.filter((l) => {
      const haystack = [
        licenseLabel(l, licenseTypeOptions),
        l.vendor ?? '',
        l.license_key ?? '',
        l.asset_id ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [available, query, licenseTypeOptions]);

  // Opening the dropdown to tweak an existing manual entry pre-fills
  // the search box with that value, so it can be edited/refined
  // instead of having to be retyped from scratch every time.
  const toggleOpen = () => {
    if (!open) setQuery(hasManual ? manualValue ?? '' : '');
    setOpen((o) => !o);
  };

  const pick = (id: string) => {
    onChange({ licenseId: id, productKey: '' });
    setOpen(false);
    setQuery('');
  };

  const useManual = (val: string) => {
    const v = val.trim();
    if (!v) return;
    onChange({ licenseId: '', productKey: v });
    setOpen(false);
    setQuery('');
  };

  const clearAll = () => {
    onChange({ licenseId: '', productKey: '' });
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={toggleOpen}
          className="gbb-input flex-1 flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border-2 border-brand-600 bg-white dark:bg-gray-900 text-sm text-left hover:border-brand-500 disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:text-gray-400 dark:disabled:text-gray-500"
        >
          {selected ? (
            <span className="flex items-center gap-2 min-w-0">
              <KeyRound size={14} className="text-brand-600 shrink-0" />
              <span className="truncate">
                <span className="font-medium text-gray-900 dark:text-gray-100">{licenseLabel(selected, licenseTypeOptions)}</span>
                {selected.license_key && <span className="text-gray-400 dark:text-gray-500 font-mono text-xs"> · {selected.license_key}</span>}
              </span>
            </span>
          ) : hasManual ? (
            <span className="flex items-center gap-2 min-w-0">
              <Pencil size={14} className="text-brand-600 shrink-0" />
              <span className="truncate">
                <span className="font-medium text-gray-900 dark:text-gray-100">{manualValue}</span>
                <span className="text-gray-400 dark:text-gray-500 text-xs"> · Entered manually</span>
              </span>
            </span>
          ) : (
            <span className="text-gray-400 dark:text-gray-500">Search and select a license…</span>
          )}
          <ChevronDown size={16} className={`text-gray-400 dark:text-gray-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {(selected || hasManual) && !disabled && (
          <button
            type="button"
            onClick={clearAll}
            className="px-2.5 rounded-xl border border-brand-600 text-gray-400 dark:text-gray-500 hover:text-red-500 hover:border-red-200"
            title="Clear selection"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {open && (
        <div className="border border-brand-600 rounded-xl bg-white dark:bg-gray-900 shadow-soft p-2 space-y-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by type, vendor, key, or asset ID…"
              className="gbb-input w-full pl-8 pr-3 py-2 rounded-lg border-2 border-brand-600 bg-white dark:bg-gray-900 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>
          <div className="max-h-56 overflow-y-auto divide-y divide-gray-100">
            {filtered.length === 0 && (
              <div className="text-xs text-center py-3 px-1 space-y-2">
                <p className="text-gray-400 dark:text-gray-500">
                  {licenses.length === 0
                    ? 'No licenses registered yet - add one under License Registration,'
                    : 'No matching licenses.'}{' '}
                  or enter it manually below.
                </p>
                {query.trim() && (
                  <button
                    type="button"
                    onClick={() => useManual(query)}
                    className="w-full px-3 py-2 rounded-lg border border-dashed border-brand-300 text-brand-600 font-medium hover:bg-brand-50 dark:hover:bg-brand-900/40 flex items-center justify-center gap-1.5"
                  >
                    <Pencil size={12} className="shrink-0" />
                    <span className="truncate">Use "{query.trim()}" manually</span>
                  </button>
                )}
              </div>
            )}
            {filtered.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => pick(l.id)}
                className={`w-full text-left px-2.5 py-2 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/40 flex items-center justify-between gap-2 ${l.id === value ? 'bg-brand-50 dark:bg-brand-900/40' : ''}`}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{licenseLabel(l, licenseTypeOptions)}</span>
                  <span className="block text-xs text-gray-400 dark:text-gray-500 truncate">
                    {l.vendor ?? 'No vendor'}
                    {l.license_key ? ` · ${l.license_key}` : ' · No key'}
                    {l.asset_id ? ` · ${l.asset_id}` : ''}
                  </span>
                </span>
              </button>
            ))}
          </div>
          {filtered.length > 0 && query.trim() && (
            // Keep the manual-entry escape hatch available even when the
            // typed text happens to substring-match an unrelated license -
            // a coincidental match should never block someone from
            // registering the key they actually typed.
            <button
              type="button"
              onClick={() => useManual(query)}
              className="w-full px-3 py-2 rounded-lg border border-dashed border-brand-300 text-brand-600 font-medium hover:bg-brand-50 dark:hover:bg-brand-900/40 flex items-center justify-center gap-1.5"
            >
              <Pencil size={12} className="shrink-0" />
              <span className="truncate">None of these — use "{query.trim()}" manually</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
