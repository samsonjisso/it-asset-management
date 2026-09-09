// Encode/decode/format/validate helpers for a custom device-type
// field's *value* (as opposed to its *definition* in
// lib/deviceTypeFields.tsx). Every value is ultimately stored as a
// plain string inside a device's extra_data JSON blob (see the
// DeviceTypeField comment on supabase.ts), so choice/attachment types
// that don't naturally hold a string (arrays, booleans, files) each
// get a small, self-contained encoding here — kept in one place so the
// registration form, the details view and CSV export all agree on it.
import { DeviceTypeField } from "./supabase";
import {
  isValidIPv4,
  isValidMac,
  isValidEmail,
  isValidUrl,
} from "./validation";

export interface FileFieldValue {
  name: string;
  dataUrl: string;
}

// ---- multiselect: JSON array <-> string --------------------------------

export function decodeMultiselect(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((v) => typeof v === "string")
      : [];
  } catch {
    return [];
  }
}

export function encodeMultiselect(values: string[]): string {
  return JSON.stringify(values);
}

// ---- image/file: JSON { name, dataUrl } <-> string ----------------------

export function decodeFileValue(
  raw: string | undefined,
): FileFieldValue | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.dataUrl === "string"
    ) {
      return {
        name: typeof parsed.name === "string" ? parsed.name : "file",
        dataUrl: parsed.dataUrl,
      };
    }
  } catch {
    // fall through
  }
  return null;
}

export function encodeFileValue(value: FileFieldValue | null): string {
  return value ? JSON.stringify(value) : "";
}

// ---- checkbox: 'true'/'false' <-> boolean --------------------------------

export function decodeCheckbox(raw: string | undefined): boolean {
  return raw === "true";
}

// ---- required-ness + format validation -----------------------------------

// True if `raw` counts as "filled in" for this field's type — used both
// to enforce "mandatory" and to decide whether a value should be sent
// to the server at all.
export function isFieldValueFilled(
  field: DeviceTypeField,
  raw: string | undefined,
): boolean {
  const type = field.type ?? "text";
  if (type === "checkbox") return decodeCheckbox(raw);
  if (type === "multiselect") return decodeMultiselect(raw).length > 0;
  // 'image' stores a plain base64 data URL directly (same convention as
  // the device's own photo column), so a plain string check is enough.
  if (type === "image") return !!(raw ?? "").trim();
  if (type === "file") return !!decodeFileValue(raw);
  return !!(raw ?? "").trim();
}

// Returns an error message if `raw` doesn't satisfy this field's
// mandatory flag or type-specific format, or null if it's fine to save.
// Only checks format when a value is actually present, so an optional,
// empty field never fails validation.
export function validateFieldValue(
  field: DeviceTypeField,
  raw: string | undefined,
): string | null {
  const type = field.type ?? "text";
  const filled = isFieldValueFilled(field, raw);
  if (field.required && !filled) return `${field.label} is required`;
  if (!filled) return null;
  const value = (raw ?? "").trim();
  switch (type) {
    case "number":
      if (!/^-?\d+$/.test(value))
        return `${field.label} must be a whole number`;
      return null;
    case "decimal":
      if (!/^-?\d+(\.\d+)?$/.test(value))
        return `${field.label} must be a number`;
      return null;
    case "ip_address":
      if (!isValidIPv4(value))
        return `${field.label} must be a valid IPv4 address (e.g., 10.6.13.45)`;
      return null;
    case "mac_address":
      if (!isValidMac(value))
        return `${field.label} must look like 00:1A:2B:3C:4D:5E`;
      return null;
    case "email":
      if (!isValidEmail(value))
        return `${field.label} must be a valid email address`;
      return null;
    case "url":
      if (!isValidUrl(value))
        return `${field.label} must be a valid URL (starting with http:// or https://)`;
      return null;
    default:
      return null;
  }
}

// ---- display formatting (details modal, CSV export) ----------------------

export function formatFieldValueForDisplay(
  field: DeviceTypeField,
  raw: string | undefined,
  lookups?: {
    departmentLabel?: (code: string) => string;
    employeeLabel?: (id: string) => string;
  },
): string {
  const type = field.type ?? "text";
  if (!isFieldValueFilled(field, raw)) return "";
  switch (type) {
    case "checkbox":
      return decodeCheckbox(raw) ? "Yes" : "No";
    case "multiselect":
      return decodeMultiselect(raw).join(", ");
    case "image":
      return raw ? "Image attached" : "";
    case "file":
      return decodeFileValue(raw)?.name ?? "";
    case "department":
    case "branch":
      return (
        (lookups?.departmentLabel
          ? lookups.departmentLabel(raw!.trim())
          : raw!.trim()) || raw!.trim()
      );
    case "employee":
      return (
        (lookups?.employeeLabel
          ? lookups.employeeLabel(raw!.trim())
          : raw!.trim()) || raw!.trim()
      );
    case "date":
      return raw ? new Date(raw).toLocaleDateString() : "";
    case "datetime":
      return raw ? new Date(raw).toLocaleString() : "";
    default:
      return (raw ?? "").trim();
  }
}
