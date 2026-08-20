import type { Device, DeviceType } from "@/lib/supabase";
import type { DeviceForm } from "../types/device";
import {
  STD_FIELD_META,
  parseExtraFields,
  parseBaseFields,
  parseCoreFields,
  parseFieldLabels,
} from "@/lib/deviceTypeFields";

export function parseExtraData(device?: Device | null): Record<string, string> {
  if (!device?.extra_data) return {};
  try {
    const parsed = JSON.parse(device.extra_data);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function formFromDevice(device: Device): DeviceForm {
  return {
    device_type: device.device_type,
    device_owner: device.device_owner ?? "",
    device_model: device.device_model ?? "",
    hostname: device.hostname ?? "",
    ip_address: device.ip_address ?? "",
    serial_number: device.serial_number ?? "",
    mac_address: device.mac_address ?? "",
    location: device.location ?? "",
    rack_number: device.rack_number ?? "",
    model_id: device.model_id ?? "",
    image: device.image ?? null,
    notes: device.notes ?? "",
    extra_data: parseExtraData(device),
  };
}

export function buildDevicePayload(
  form: DeviceForm,
  type: DeviceType | null,
  skipIP: boolean,
  registeredBy?: string,
) {
  const base = type ? parseBaseFields(type) : [];
  const core = type ? parseCoreFields(type) : [];
  const extra = type ? parseExtraFields(type) : [];
  return {
    ...form,
    device_owner: core.includes("device_owner")
      ? form.device_owner || null
      : null,
    device_model: core.includes("device_model")
      ? form.device_model || null
      : null,
    hostname: core.includes("hostname") ? form.hostname || null : null,
    ip_address:
      !skipIP && base.includes("ip_address") ? form.ip_address || null : null,
    serial_number: base.includes("serial_number")
      ? form.serial_number || null
      : null,
    mac_address: base.includes("mac_address") ? form.mac_address || null : null,
    location: base.includes("location") ? form.location || null : null,
    rack_number: base.includes("rack_number") ? form.rack_number || null : null,
    model_id: form.model_id || null,
    image: form.image || null,
    notes: form.notes || null,
    extra_data: extra.length ? JSON.stringify(form.extra_data) : null,
    registered_by: registeredBy,
  };
}

export function fieldLabel(type: DeviceType | null, key: string) {
  const labels = type ? parseFieldLabels(type) : {};
  return labels[key] ?? STD_FIELD_META[key]?.label ?? key;
}
