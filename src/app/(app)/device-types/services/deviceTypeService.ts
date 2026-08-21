import { supabase, type DeviceType } from "@/lib/supabase";
import type { DeviceTypePayload } from "../types";

export async function fetchDeviceTypes() {
  const { data, error } = await supabase
    .from("device_types")
    .select("*")
    .order("label");

  if (error) throw error;
  return (data ?? []) as DeviceType[];
}

export async function insertDeviceType(payload: DeviceTypePayload) {
  const { data, error } = await supabase
    .from("device_types")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data as DeviceType;
}

export async function updateDeviceType(
  id: string,
  payload: DeviceTypePayload,
) {
  const { data, error } = await supabase
    .from("device_types")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as DeviceType;
}

export async function removeDeviceType(id: string) {
  const { error } = await supabase
    .from("device_types")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
