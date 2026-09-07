// Register New PC Fields Customization: parsing helpers for the single
// pc_form_fields config row, mirroring lib/deviceTypeFields.tsx's
// parseBaseFields/parseRequiredBaseFields/parseFieldLabels/
// parseExtraFields for device types — the field-customization
// framework is intentionally the same, just backed by one row instead
// of one per device type. See PCRegistrationPage.tsx (the form these
// drive) and PCFieldsPage.tsx (the admin editor).
import { DeviceTypeField, PcFormFields } from './supabase';
import { FIELD_TYPE_META } from './deviceTypeFields';

// The standard PC fields that used to be unconditionally shown (in
// this exact order) before the form became configurable. An admin can
// now hide, rename, reorder, and mark any of these mandatory/optional
// via pc_form_fields.base_fields/required_base_fields/field_labels.
// Their input widgets (license picker, department/floor/switch
// selects, MAC/IP pattern validation, the asset-tag skip toggle,
// model-photo autofill) stay bespoke to this form, same as devices'
// base fields stay bespoke to theirs — only fully custom fields
// (pc_form_fields.fields) get a generic type picker.
export const PC_BASE_FIELD_META: Record<string, { label: string; placeholder?: string }> = {
  hostname: { label: 'PC Hostname', placeholder: 'e.g., PC-HQ-001' },
  monitor_serial: { label: 'Display Monitor / Serial Number', placeholder: 'Monitor serial number' },
  asset_tag: { label: 'Asset Tag', placeholder: 'Asset tag number' },
  service_tag: { label: 'Service Tag / Serial Number', placeholder: 'Service tag' },
  mac_address: { label: 'MAC Address', placeholder: '00:1A:2B:3C:4D:5E' },
  license_id: { label: 'Product Key / License' },
  cpu: { label: 'CPU', placeholder: 'e.g., Intel Core i5-1240P' },
  memory_detail: { label: 'Memory Detail', placeholder: 'e.g., 16GB DDR4' },
  generation_detail: { label: 'Generation Detail', placeholder: 'e.g., 12th Gen' },
  ip_address: { label: 'IP Address', placeholder: '10.6.x.x' },
  owner_name: { label: 'Owner / Logged-in User', placeholder: 'Employee who uses this PC' },
  department_id: { label: 'Department / Branch' },
  floor_number: { label: 'Floor Number / Location' },
  switch_port_number: { label: 'Switch Port Number', placeholder: 'e.g., Port 24' },
  access_switch_name: { label: 'Access Switch Name' },
  access_switch_ip: { label: 'Access Switch IP Address' },
  patch_level_number: { label: 'Patch / Level Number', placeholder: 'Patch level number' },
  model_id: { label: 'Model' },
};
export const ALL_PC_BASE_FIELDS = Object.keys(PC_BASE_FIELD_META);

export function parsePcBaseFields(config?: PcFormFields | null): string[] {
  if (!config?.base_fields) return ALL_PC_BASE_FIELDS;
  try {
    const parsed = JSON.parse(config.base_fields);
    if (!Array.isArray(parsed)) return ALL_PC_BASE_FIELDS;
    // Ignore any key that's no longer a recognized standard field
    // (e.g. this build removed one) rather than rendering a blank row.
    return parsed.filter((k: string) => typeof k === 'string' && PC_BASE_FIELD_META[k]);
  } catch {
    return ALL_PC_BASE_FIELDS;
  }
}

export function parsePcRequiredBaseFields(config?: PcFormFields | null): string[] {
  if (!config?.required_base_fields) return [];
  try {
    const parsed = JSON.parse(config.required_base_fields);
    // Asset Tag is always optional (it auto-fills to "N/A" when left
    // blank - see PCRegistrationPage.handleSave), so it can never be
    // enforced as mandatory even if an older/stale config row has it
    // saved as required.
    return Array.isArray(parsed) ? parsed.filter((k: string) => typeof k === 'string' && k !== 'asset_tag') : [];
  } catch {
    return [];
  }
}

export function parsePcFieldLabels(config?: PcFormFields | null): Record<string, string> {
  if (!config?.field_labels) return {};
  try {
    const parsed = JSON.parse(config.field_labels);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function parsePcExtraFields(config?: PcFormFields | null): DeviceTypeField[] {
  if (!config?.fields) return [];
  try {
    const parsed = JSON.parse(config.fields);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((f: DeviceTypeField) => ({
      ...f,
      type: f.type && FIELD_TYPE_META[f.type] ? f.type : 'text',
      options: Array.isArray(f.options) ? f.options : undefined,
    }));
  } catch {
    return [];
  }
}
