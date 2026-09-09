"use client";

// Renders the correct input control for one admin-defined custom
// device field, based on its `type`. This is the single place that
// knows how to turn a DeviceTypeField definition into an editable
// control — the registration form calls it once per extra field
// instead of switching on type itself, so a new field type only needs
// to be taught here (plus lib/deviceFieldValues.ts for its value
// encoding) to work everywhere a device type can use it.
import { TextInput, NumberInput, TextArea } from "./FormControls";
import { SearchableSelect } from "./SearchableSelect";
import { ImageInput } from "./ImageInput";
import { FileInput } from "./FileInput";
import { IPV4_PATTERN, MAC_PATTERN } from "../lib/validation";
import { DeviceTypeField, Department, DirectoryUser } from "../lib/supabase";
import {
  decodeMultiselect,
  encodeMultiselect,
  decodeFileValue,
  encodeFileValue,
  decodeCheckbox,
} from "../lib/deviceFieldValues";

interface DynamicFieldProps {
  field: DeviceTypeField;
  value: string;
  onChange: (value: string) => void;
  departments?: Department[];
  employees?: DirectoryUser[];
}

export function DynamicField({
  field,
  value,
  onChange,
  departments = [],
  employees = [],
}: DynamicFieldProps) {
  const type = field.type ?? "text";
  const options = field.options ?? [];

  switch (type) {
    case "long_text":
      return (
        <TextArea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          rows={3}
        />
      );

    case "number":
      return (
        <NumberInput
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
        />
      );

    case "decimal":
      return (
        <TextInput
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
        />
      );

    case "date":
      return (
        <TextInput
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
        />
      );

    case "datetime":
      return (
        <TextInput
          type="datetime-local"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
        />
      );

    case "dropdown":
      // Admin-defined option lists can grow long, so this uses the
      // same searchable dropdown as every other large-list field
      // rather than a native <select> that dumps every option at once.
      return (
        <SearchableSelect
          options={options.map((opt) => ({ value: opt, label: opt }))}
          value={value}
          onChange={onChange}
          placeholder={`Select ${field.label}`}
          searchPlaceholder={`Search ${field.label.toLowerCase()}…`}
          emptyMessage="No matching options."
          required={field.required}
        />
      );

    case "multiselect": {
      const selected = decodeMultiselect(value);
      const toggle = (opt: string) => {
        const next = selected.includes(opt)
          ? selected.filter((v) => v !== opt)
          : [...selected, opt];
        onChange(encodeMultiselect(next));
      };
      return (
        <div className="flex flex-wrap gap-2">
          {options.length === 0 && (
            <span className="text-xs text-gray-400 dark:text-gray-500 italic">
              No options configured
            </span>
          )}
          {options.map((opt) => (
            <label
              key={opt}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer select-none ${
                selected.includes(opt)
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:border-brand-400"
              }`}
            >
              <input
                type="checkbox"
                className="hidden"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
              />
              {opt}
            </label>
          ))}
        </div>
      );
    }

    case "checkbox":
      return (
        <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={decodeCheckbox(value)}
            onChange={(e) => onChange(e.target.checked ? "true" : "false")}
            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-brand-600 focus:ring-brand-400 focus:ring-offset-0"
          />
          {field.placeholder || "Yes"}
        </label>
      );

    case "radio":
      return (
        <div className="flex flex-wrap gap-3">
          {options.length === 0 && (
            <span className="text-xs text-gray-400 dark:text-gray-500 italic">
              No options configured
            </span>
          )}
          {options.map((opt) => (
            <label
              key={opt}
              className="inline-flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none"
            >
              <input
                type="radio"
                name={field.key}
                checked={value === opt}
                onChange={() => onChange(opt)}
                className="w-4 h-4 border-gray-300 dark:border-gray-600 text-brand-600 focus:ring-brand-400 focus:ring-offset-0"
              />
              {opt}
            </label>
          ))}
        </div>
      );

    case "ip_address":
      return (
        <TextInput
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || "e.g., 10.6.13.45"}
          required={field.required}
          pattern={IPV4_PATTERN}
          title="Enter a valid IPv4 address, e.g. 10.6.13.45"
        />
      );

    case "mac_address":
      return (
        <TextInput
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || "00:1A:2B:3C:4D:5E"}
          required={field.required}
          pattern={MAC_PATTERN}
          title="Enter a valid MAC address, e.g. 00:1A:2B:3C:4D:5E"
        />
      );

    case "email":
      return (
        <TextInput
          type="email"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || "name@example.com"}
          required={field.required}
        />
      );

    case "url":
      return (
        <TextInput
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || "https://..."}
          required={field.required}
        />
      );

    case "image":
      return (
        <ImageInput
          value={value || null}
          onChange={(dataUrl) => onChange(dataUrl || "")}
          label=""
        />
      );

    case "file":
      return (
        <FileInput
          value={decodeFileValue(value)}
          onChange={(f) => onChange(encodeFileValue(f))}
        />
      );

    case "employee":
      // The employee directory can run into the hundreds, so this is
      // searchable rather than a plain <select> long-list dropdown.
      return (
        <SearchableSelect
          options={employees.map((u) => ({ value: u.id, label: u.full_name }))}
          value={value}
          onChange={onChange}
          placeholder={`Select ${field.label}`}
          searchPlaceholder="Search employees…"
          emptyMessage="No matching employees."
          required={field.required}
        />
      );

    case "department":
      return (
        <SearchableSelect
          options={departments
            .filter((d) => !d.is_branch)
            .map((d) => ({ value: d.id, label: d.name }))}
          value={value}
          onChange={onChange}
          placeholder={`Select ${field.label}`}
          searchPlaceholder="Search departments…"
          emptyMessage="No matching departments."
          required={field.required}
        />
      );

    case "branch":
      return (
        <SearchableSelect
          options={departments
            .filter((d) => d.is_branch)
            .map((d) => ({ value: d.id, label: d.name }))}
          value={value}
          onChange={onChange}
          placeholder={`Select ${field.label}`}
          searchPlaceholder="Search branches…"
          emptyMessage="No matching branches."
          required={field.required}
        />
      );

    case "text":
    default:
      return (
        <TextInput
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
        />
      );
  }
}
