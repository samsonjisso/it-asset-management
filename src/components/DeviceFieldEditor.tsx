"use client";

import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  ChevronUp,
  ChevronDown,
  GripVertical,
} from "lucide-react";
import { TextInput, SelectInput, Button } from "./FormControls";
import { DeviceTypeField } from "../lib/supabase";
import {
  FIELD_TYPE_OPTIONS,
  fieldTypeLabel,
  fieldTypeNeedsOptions,
} from "../lib/deviceTypeFields";

interface DeviceFieldEditorProps {
  fields: DeviceTypeField[];
  onChange: (fields: DeviceTypeField[]) => void;
}

type DraftField = {
  label: string;
  type: DeviceTypeField["type"];
  required: boolean;
  placeholder: string;
  optionsText: string; // one option per line, while editing
};

const emptyDraft: DraftField = {
  label: "",
  type: "text",
  required: false,
  placeholder: "",
  optionsText: "",
};

function slugifyKey(label: string, existing: string[]): string {
  let key = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!key) key = "field";
  if (existing.includes(key)) {
    let i = 2;
    while (existing.includes(`${key}_${i}`)) i++;
    key = `${key}_${i}`;
  }
  return key;
}

function optionsFromText(text: string): string[] {
  return Array.from(
    new Set(
      text
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  );
}

// Full CRUD editor for a device type's custom fields: add, edit, delete,
// reorder (the order here is the order they render on the registration
// form), and configure label / type / options / mandatory — with no
// code change required for a new field or a new device type. Grouped
// by group in the type picker so the long list of supported types
// (Text, Long Text, Number, Decimal, Date, Date & Time, Dropdown,
// Multi-select, Checkbox, Radio Button, IP Address, MAC Address, Email,
// URL, Image, File Upload, Employee/User, Department, Branch) stays
// easy to scan.
export function DeviceFieldEditor({
  fields,
  onChange,
}: DeviceFieldEditorProps) {
  const [mode, setMode] = useState<"idle" | "add" | "edit">("idle");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftField>(emptyDraft);

  const startAdd = () => {
    setMode("add");
    setEditingKey(null);
    setDraft(emptyDraft);
  };

  const startEdit = (f: DeviceTypeField) => {
    setMode("edit");
    setEditingKey(f.key);
    setDraft({
      label: f.label,
      type: f.type ?? "text",
      required: !!f.required,
      placeholder: f.placeholder ?? "",
      optionsText: (f.options ?? []).join("\n"),
    });
  };

  const cancel = () => {
    setMode("idle");
    setEditingKey(null);
    setDraft(emptyDraft);
  };

  const save = () => {
    const label = draft.label.trim();
    if (!label) return;
    const needsOptions = fieldTypeNeedsOptions(draft.type);
    const options = needsOptions
      ? optionsFromText(draft.optionsText)
      : undefined;
    if (needsOptions && (!options || options.length === 0)) return; // require at least one choice

    if (mode === "edit" && editingKey) {
      onChange(
        fields.map((f) =>
          f.key === editingKey
            ? {
                ...f,
                label,
                type: draft.type,
                required: draft.required,
                placeholder: draft.placeholder.trim() || undefined,
                options,
              }
            : f,
        ),
      );
    } else {
      const key = slugifyKey(
        label,
        fields.map((f) => f.key),
      );
      onChange([
        ...fields,
        {
          key,
          label,
          type: draft.type,
          required: draft.required,
          placeholder: draft.placeholder.trim() || undefined,
          options,
        },
      ]);
    }
    cancel();
  };

  const remove = (key: string) => {
    onChange(fields.filter((f) => f.key !== key));
    if (editingKey === key) cancel();
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  };

  const needsOptions = fieldTypeNeedsOptions(draft.type);

  return (
    <div className="space-y-2">
      {fields.length > 0 && (
        <div className="border border-brand-600 rounded-xl divide-y divide-gray-100 overflow-hidden">
          {fields.map((f, i) =>
            editingKey === f.key && mode === "edit" ? (
              <FieldDraftForm
                key={f.key}
                draft={draft}
                setDraft={setDraft}
                needsOptions={needsOptions}
                onSave={save}
                onCancel={cancel}
              />
            ) : (
              <div
                key={f.key}
                className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900"
              >
                <div className="flex flex-col -my-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    className="text-gray-300 dark:text-gray-600 hover:text-brand-600 disabled:opacity-30 disabled:hover:text-gray-300 dark:disabled:hover:text-gray-600"
                    title="Move up"
                  >
                    <ChevronUp size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === fields.length - 1}
                    className="text-gray-300 dark:text-gray-600 hover:text-brand-600 disabled:opacity-30 disabled:hover:text-gray-300 dark:disabled:hover:text-gray-600"
                    title="Move down"
                  >
                    <ChevronDown size={13} />
                  </button>
                </div>
                <GripVertical
                  size={14}
                  className="text-gray-200 dark:text-gray-700 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                    {f.label}
                    {f.required && <span className="text-red-500 ml-1">*</span>}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {fieldTypeLabel(f.type)}
                    {f.options?.length
                      ? ` · ${f.options.length} option${f.options.length === 1 ? "" : "s"}`
                      : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => startEdit(f)}
                  className="p-1.5 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/40 rounded-lg shrink-0"
                  title="Edit field"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => remove(f.key)}
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg shrink-0"
                  title="Delete field"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ),
          )}
        </div>
      )}

      {mode === "add" ? (
        <div className="border border-brand-200 rounded-xl overflow-hidden">
          <FieldDraftForm
            draft={draft}
            setDraft={setDraft}
            needsOptions={needsOptions}
            onSave={save}
            onCancel={cancel}
          />
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={startAdd}>
          <Plus size={14} /> Add Field
        </Button>
      )}
      {fields.length === 0 && mode === "idle" && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          No custom fields yet — add exactly what this device type needs.
        </p>
      )}
    </div>
  );
}

function FieldDraftForm({
  draft,
  setDraft,
  needsOptions,
  onSave,
  onCancel,
}: {
  draft: DraftField;
  setDraft: (d: DraftField) => void;
  needsOptions: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="p-3 bg-brand-50/40 space-y-2.5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <TextInput
          value={draft.label}
          onChange={(e) => setDraft({ ...draft, label: e.target.value })}
          placeholder="Field label, e.g., CPU, Capacity, Expiry Date"
          autoFocus
        />
        <SelectInput
          value={draft.type}
          onChange={(e) =>
            setDraft({
              ...draft,
              type: e.target.value as DeviceTypeField["type"],
            })
          }
        >
          {Object.entries(
            FIELD_TYPE_OPTIONS.reduce<
              Record<string, typeof FIELD_TYPE_OPTIONS>
            >((acc, o) => {
              (acc[o.group] ??= []).push(o);
              return acc;
            }, {}),
          ).map(([group, opts]) => (
            <optgroup key={group} label={group}>
              {opts.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </optgroup>
          ))}
        </SelectInput>
      </div>
      {needsOptions && (
        <div>
          <textarea
            value={draft.optionsText}
            onChange={(e) =>
              setDraft({ ...draft, optionsText: e.target.value })
            }
            placeholder={
              "One choice per line, e.g.\nOption A\nOption B\nOption C"
            }
            rows={3}
            className="gbb-input w-full px-3.5 py-2.5 rounded-xl border-2 border-brand-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 hover:border-brand-500 resize-y"
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            One choice per line — at least one is required.
          </p>
        </div>
      )}
      {!needsOptions && draft.type !== "checkbox" && (
        <TextInput
          value={draft.placeholder}
          onChange={(e) => setDraft({ ...draft, placeholder: e.target.value })}
          placeholder="Placeholder text (optional)"
        />
      )}
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={draft.required}
            onChange={(e) => setDraft({ ...draft, required: e.target.checked })}
            className="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600 text-red-500 focus:ring-red-400 focus:ring-offset-0"
          />
          Mandatory
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500"
            title="Cancel"
          >
            <X size={15} />
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={
              !draft.label.trim() ||
              (needsOptions && optionsFromText(draft.optionsText).length === 0)
            }
            className="w-7 h-7 flex items-center justify-center rounded-full bg-brand-600 hover:bg-brand-500 text-white disabled:opacity-40 disabled:hover:bg-brand-600"
            title="Save field"
          >
            <Check size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
