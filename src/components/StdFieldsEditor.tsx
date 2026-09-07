'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';
import { TextInput, Button } from './FormControls';

interface StdFieldMeta {
  label: string;
  placeholder?: string;
}

interface StdFieldsEditorProps {
  // Every key this form knows about, in its original/default order —
  // used only to populate the "add back" list of currently-hidden
  // fields, not the render order (that's `included`).
  allKeys: string[];
  meta: Record<string, StdFieldMeta>;
  // The included keys, IN DISPLAY ORDER — this array's order is what
  // the registration form renders in.
  included: string[];
  required: string[];
  labels: Record<string, string>;
  // Keys that can never be marked mandatory (e.g. Asset Tag, which
  // always auto-fills to "N/A" when left blank) - their required
  // toggle renders disabled with an explanatory tooltip instead of
  // silently accepting a click that a save would ignore.
  nonRequirable?: string[];
  onChange: (next: { included: string[]; required: string[]; labels: Record<string, string> }) => void;
}

// Editor for a form's built-in/standard fields (as opposed to fully
// custom ones — see DeviceFieldEditor for those). Unlike a custom
// field, a standard field can't be deleted or have its type changed
// (its input widget is bespoke to the form, e.g. a license picker or a
// department select), but everything else — whether it's shown at
// all, its label, whether it's mandatory, and its position on the
// form — is fully admin-configurable here. Same list + reorder-arrows
// UX as DeviceFieldEditor so the two editors feel consistent.
export function StdFieldsEditor({ allKeys, meta, included, required, labels, nonRequirable = [], onChange }: StdFieldsEditorProps) {
  const [renamingKey, setRenamingKey] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  const hiddenKeys = allKeys.filter((k) => !included.includes(k));
  const fieldLabel = (key: string) => labels[key] ?? meta[key]?.label ?? key;

  const remove = (key: string) => {
    onChange({ included: included.filter((k) => k !== key), required: required.filter((k) => k !== key), labels });
    if (renamingKey === key) cancelRename();
  };

  const add = (key: string) => {
    onChange({ included: [...included, key], required, labels });
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= included.length) return;
    const next = [...included];
    [next[index], next[target]] = [next[target], next[index]];
    onChange({ included: next, required, labels });
  };

  const toggleRequired = (key: string) => {
    if (nonRequirable.includes(key)) return;
    const next = required.includes(key) ? required.filter((k) => k !== key) : [...required, key];
    onChange({ included, required: next, labels });
  };

  const startRename = (key: string) => {
    setRenamingKey(key);
    setRenameDraft(fieldLabel(key));
  };

  const cancelRename = () => {
    setRenamingKey(null);
    setRenameDraft('');
  };

  const saveRename = () => {
    if (!renamingKey) return;
    const trimmed = renameDraft.trim();
    const nextLabels = { ...labels };
    if (!trimmed || trimmed === meta[renamingKey]?.label) delete nextLabels[renamingKey];
    else nextLabels[renamingKey] = trimmed;
    onChange({ included, required, labels: nextLabels });
    cancelRename();
  };

  return (
    <div className="space-y-2">
      {included.length > 0 && (
        <div className="border border-brand-600 rounded-xl divide-y divide-gray-100 overflow-hidden">
          {included.map((key, i) => (
            <div key={key} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900">
              <div className="flex flex-col -my-1 shrink-0">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="text-gray-300 dark:text-gray-600 hover:text-brand-600 disabled:opacity-30 disabled:hover:text-gray-300 dark:disabled:hover:text-gray-600" title="Move up">
                  <ChevronUp size={13} />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === included.length - 1} className="text-gray-300 dark:text-gray-600 hover:text-brand-600 disabled:opacity-30 disabled:hover:text-gray-300 dark:disabled:hover:text-gray-600" title="Move down">
                  <ChevronDown size={13} />
                </button>
              </div>
              <GripVertical size={14} className="text-gray-200 dark:text-gray-700 shrink-0" />
              <div className="flex-1 min-w-0">
                {renamingKey === key ? (
                  <div className="flex items-center gap-1.5">
                    <TextInput
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); saveRename(); }
                        if (e.key === 'Escape') { e.preventDefault(); cancelRename(); }
                      }}
                      autoFocus
                      className="!py-1 !px-2 text-xs w-full max-w-xs"
                    />
                    <button type="button" onClick={saveRename} className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-brand-50 dark:hover:bg-brand-900/40 text-brand-600 shrink-0" title="Save">
                      <Check size={12} />
                    </button>
                    <button type="button" onClick={cancelRename} className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 shrink-0" title="Cancel">
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                    {fieldLabel(key)}
                    {required.includes(key) && <span className="text-red-500 ml-1">*</span>}
                  </p>
                )}
              </div>
              {renamingKey !== key && (
                <>
                  <button
                    type="button"
                    onClick={() => toggleRequired(key)}
                    disabled={nonRequirable.includes(key)}
                    title={
                      nonRequirable.includes(key)
                        ? 'Always optional'
                        : required.includes(key) ? 'Mandatory — click to make optional' : 'Optional — click to make mandatory'
                    }
                    className={`shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center border ${
                      required.includes(key)
                        ? 'bg-red-500 border-red-500 text-white'
                        : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:text-red-500 hover:border-red-300'
                    } ${nonRequirable.includes(key) ? 'opacity-40 cursor-not-allowed hover:text-gray-400 dark:hover:text-gray-500 hover:border-gray-300 dark:hover:border-gray-600' : ''}`}
                  >
                    *
                  </button>
                  <button type="button" onClick={() => startRename(key)} className="p-1.5 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/40 rounded-lg shrink-0" title="Rename field">
                    <Pencil size={14} />
                  </button>
                  <button type="button" onClick={() => remove(key)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg shrink-0" title="Remove from form">
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
      {included.length === 0 && <p className="text-xs text-gray-400 dark:text-gray-500">No standard fields included — add some below.</p>}

      {hiddenKeys.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Hidden — click to add back:</p>
          <div className="flex flex-wrap gap-1.5">
            {hiddenKeys.map((key) => (
              <Button key={key} type="button" variant="outline" size="sm" onClick={() => add(key)}>
                <Plus size={13} /> {meta[key]?.label ?? key}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
