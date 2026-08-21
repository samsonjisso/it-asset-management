import { STD_FIELD_META } from "@/lib/deviceTypeFields";
import type { DeviceType } from "@/lib/supabase";
import type { DeviceTypeEditorState, DeviceTypePayload } from "../types";

export function validateDeviceType(
  state: DeviceTypeEditorState,
  existing: DeviceType[],
): { ok: true; value: DeviceTypePayload } | { ok: false; message: string } {
  const label = state.label.trim();

  if (!label) {
    return { ok: false, message: "Device type name is required" };
  }

  const duplicate = existing.some(
    (type) =>
      type.id !== state.editingTypeId &&
      type.label.toLowerCase() === label.toLowerCase(),
  );

  if (duplicate) {
    return { ok: false, message: "That device type already exists" };
  }

  const requiredCoreFields = state.requiredCoreFields.filter((key) =>
    state.coreFields.includes(key),
  );
  const requiredBaseFields = state.requiredBaseFields.filter((key) =>
    state.baseFields.includes(key),
  );

  for (const key of [...requiredCoreFields, ...requiredBaseFields]) {
    if (!STD_FIELD_META[key]) {
      return { ok: false, message: `Unknown standard field: ${key}` };
    }
  }

  return {
    ok: true,
    value: {
      label,
      icon: state.icon,
      base_fields: JSON.stringify(state.baseFields),
      required_base_fields: JSON.stringify(requiredBaseFields),
      core_fields: JSON.stringify(state.coreFields),
      required_core_fields: JSON.stringify(requiredCoreFields),
      field_labels: JSON.stringify(state.fieldLabels),
      fields: JSON.stringify(state.extraFields),
    } as DeviceTypePayload,
  };
}
