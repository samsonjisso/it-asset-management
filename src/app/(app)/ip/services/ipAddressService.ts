import { supabase } from '../../../../lib/supabase';
import type { IPAddress, Department } from '../../../../lib/supabase';
import type { IPFormData } from '../types/ipManagement.types';

export async function fetchIpData(): Promise<{
  records: IPAddress[];
  departments: Department[];
}> {
  const [ipRes, departmentRes] = await Promise.all([
    supabase
      .from('ip_addresses')
      .select('*, department:departments(*)')
      .order('ip_address', { ascending: true }),
    supabase.from('departments').select('*').order('name'),
  ]);

  if (ipRes.error) throw ipRes.error;
  if (departmentRes.error) throw departmentRes.error;

  return {
    records: (ipRes.data ?? []) as IPAddress[],
    departments: (departmentRes.data ?? []) as Department[],
  };
}

function toPayload(form: IPFormData, profileId?: string) {
  return {
    ...form,
    hostname: form.hostname || null,
    department_id: form.department_id || null,
    ip_owner: form.ip_owner || null,
    mac_address: form.mac_address || null,
    access_switch_port: form.access_switch_port || null,
    patch_panel_label: form.patch_panel_label || null,
    notes: form.notes || null,
    registered_by: profileId,
  };
}

export async function createIpAddress(
  form: IPFormData,
  profileId?: string,
) {
  return supabase
    .from('ip_addresses')
    .insert(toPayload(form, profileId));
}

export async function updateIpAddress(
  id: string,
  form: IPFormData,
  profileId?: string,
) {
  return supabase
    .from('ip_addresses')
    .update(toPayload(form, profileId))
    .eq('id', id);
}

export async function deleteIpAddress(id: string) {
  return supabase.from('ip_addresses').delete().eq('id', id);
}
