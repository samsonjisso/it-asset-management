'use client';

import { DeviceTypeField, IpFormFields } from './supabase';
import { FIELD_TYPE_META } from './deviceTypeFields';

export const IP_BASE_FIELD_META: Record<string, { label: string; placeholder?: string }> = {
  hostname: { label: 'Hostname', placeholder: 'e.g., PC-HQ-001' },
  department_id: { label: 'Department / Branch' },
  ip_owner: { label: 'IP Address Owner (Employee)' },
  mac_address: { label: 'MAC Address', placeholder: '00:1A:2B:3C:4D:5E' },
  access_switch_port: { label: 'Access Switch Port / Interface Number', placeholder: 'e.g., Gi1/0/24' },
  patch_panel_label: { label: 'Patch Panel Label / Number' },
  notes: { label: 'Notes', placeholder: 'Additional notes...' },
};

export const ALL_IP_BASE_FIELDS = Object.keys(IP_BASE_FIELD_META);

function parseJsonValue<T>(value: unknown): T | null {
  if (typeof value !== 'string') return (value as T) ?? null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function parseIpBaseFields(config?: IpFormFields | null): string[] {
  const parsed = parseJsonValue<unknown>(config?.base_fields);
  if (!Array.isArray(parsed)) return ALL_IP_BASE_FIELDS;
  return parsed.filter((key: unknown): key is string => typeof key === 'string' && !!IP_BASE_FIELD_META[key]);
}

export function parseIpRequiredBaseFields(config?: IpFormFields | null): string[] {
  const parsed = parseJsonValue<unknown>(config?.required_base_fields);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((key: unknown): key is string => typeof key === 'string' && ALL_IP_BASE_FIELDS.includes(key));
}

export function parseIpFieldLabels(config?: IpFormFields | null): Record<string, string> {
  const parsed = parseJsonValue<unknown>(config?.field_labels);
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? parsed as Record<string, string>
    : {};
}

export function parseIpExtraFields(config?: IpFormFields | null): DeviceTypeField[] {
  const parsed = parseJsonValue<unknown>(config?.fields);
  if (!Array.isArray(parsed)) return [];
  return parsed.map((value: unknown) => {
    const field = value as DeviceTypeField;
    return {
      ...field,
      type: field.type && FIELD_TYPE_META[field.type] ? field.type : 'text',
      options: Array.isArray(field.options) ? field.options : undefined,
    };
  });
}
