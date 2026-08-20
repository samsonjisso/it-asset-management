import { useState, type FormEvent } from "react";
import type { Device, DeviceType } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";
import { isValidIPv4, isValidMac } from "@/lib/validation";
import type { DeviceForm } from "../types/device";
import { buildDevicePayload } from "../utils/deviceForm";
import { parseExtraFields } from "@/lib/deviceTypeFields";
type ExtraField = ReturnType<typeof parseExtraFields>[number];

type Args = {
  form: DeviceForm;
  editing: Device | null;
  selectedType: DeviceType | null;
  baseFields: string[];
  requiredBaseFields: string[];
  coreFields: string[];
  requiredCoreFields: string[];
  extraFields: ExtraField[];
  skipIP: boolean;
  profileId?: string;
  fieldLabel: (key: string) => string;
  onSaved: () => Promise<void>;
  onClose: () => void;
};

export function useDeviceRegistration() {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const save = async (event: FormEvent, args: Args) => {
    event.preventDefault();
    const {
      form,
      editing,
      selectedType,
      baseFields,
      requiredBaseFields,
      coreFields,
      requiredCoreFields,
      extraFields,
      skipIP,
      fieldLabel,
    } = args;
    if (!form.device_type) return toast("Device Type is required", "error");
    for (const key of [
      ...requiredCoreFields.filter((key) => coreFields.includes(key)),
      ...requiredBaseFields,
    ]) {
      if (key === "ip_address" && skipIP)
        return toast(
          "Device IP Address is required for this device type and cannot be skipped",
          "error",
        );
      const value = (form as Record<string, unknown>)[key];
      if (!value || (typeof value === "string" && !value.trim()))
        return toast(`${fieldLabel(key)} is required`, "error");
    }
    for (const field of extraFields) {
      const value = form.extra_data[field.key] ?? "";
      if (field.required && !value.trim())
        return toast(`${field.label} is required`, "error");
      if (
        field.type === "number" &&
        value &&
        !/^-?\d+(\.\d+)?$/.test(value.trim())
      )
        return toast(`${field.label} must be a number`, "error");
    }
    if (
      !skipIP &&
      baseFields.includes("ip_address") &&
      form.ip_address.trim() &&
      !isValidIPv4(form.ip_address)
    )
      return toast(
        `${fieldLabel("ip_address")} must be a valid IPv4 address (e.g. 10.6.13.45)`,
        "error",
      );
    if (
      baseFields.includes("mac_address") &&
      form.mac_address.trim() &&
      !isValidMac(form.mac_address)
    )
      return toast(
        `${fieldLabel("mac_address")} must look like 00:1A:2B:3C:4D:5E`,
        "error",
      );
    setSaving(true);
    const payload = buildDevicePayload(
      form,
      selectedType,
      skipIP,
      args.profileId,
    );
    const result = editing
      ? await supabase.from("devices").update(payload).eq("id", editing.id)
      : await supabase.from("devices").insert(payload);
    setSaving(false);
    if (result.error) return toast(result.error.message, "error");
    toast(editing ? "Device updated" : "Device registered", "success");
    await args.onSaved();
    args.onClose();
  };
  return { saving, save };
}
