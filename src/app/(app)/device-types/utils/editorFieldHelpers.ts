import {
  ALL_CORE_FIELDS,
  STD_FIELD_META,
} from "@/lib/deviceTypeFields";
import type { DeviceTypeField } from "@/lib/supabase";

export const EXTRA_FIELD_TYPES = ["text", "number", "date"] as const;

export function isCoreField(key: string) {
  return ALL_CORE_FIELDS.includes(key);
}

export function makeFieldKey(label: string, fields: DeviceTypeField[]) {
  let key = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!key) key = `field_${fields.length + 1}`;
  if (fields.some((field) => field.key === key)) {
    key = `${key}_${fields.length + 1}`;
  }

  return key;
}

export function getStandardFieldLabel(
  key: string,
  labels: Record<string, string>,
) {
  return labels[key] ?? STD_FIELD_META[key]?.label ?? key;
}

export function nextExtraFieldType(
  current: DeviceTypeField["type"] = "text",
) {
  const index = EXTRA_FIELD_TYPES.indexOf(current);
  return EXTRA_FIELD_TYPES[(index + 1) % EXTRA_FIELD_TYPES.length];
}
