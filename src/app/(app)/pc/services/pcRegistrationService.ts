import { supabase } from "@/lib/supabase";
import type { PCWritePayload } from "../types/pcRegistration.types";

export async function fetchPCRegistrations() {
  return supabase
    .from("pc_registrations")
    .select("*, department:departments(*)")
    .order("created_at", { ascending: false });
}

export async function fetchDepartments() {
  return supabase.from("departments").select("*").order("name");
}

export async function fetchPCModels() {
  return supabase.from("asset_models").select("*").order("name");
}

export async function createPC(payload: PCWritePayload) {
  return supabase.from("pc_registrations").insert(payload);
}

export async function updatePC(id: string, payload: PCWritePayload) {
  return supabase.from("pc_registrations").update(payload).eq("id", id);
}

export async function deletePC(id: string) {
  return supabase.from("pc_registrations").delete().eq("id", id);
}
