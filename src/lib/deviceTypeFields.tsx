import { ReactNode } from 'react';
import {
  HardDrive, Network, Server, Wifi, Router, Shield, Wind, Battery, Tv,
  Server as Rack, Camera, Printer, ScanLine, Boxes, Monitor, Cpu, Database,
  Laptop, Smartphone, Lock, KeyRound, Usb, Radio, Fingerprint, Landmark, Cctv, Cable,
} from 'lucide-react';
import { DeviceType, DeviceTypeField } from './supabase';

// Icons for the built-in device type codes seeded on first run. Any
// type added later (built-in or custom) that isn't listed here just
// falls back to the generic HardDrive icon — see getDeviceIcon.
export const deviceTypeIcons: Record<string, ReactNode> = {
  network: <Network size={18} />,
  physical_server: <Server size={18} />,
  storage_server: <Boxes size={18} />,
  wifi_access_point: <Wifi size={18} />,
  core_switch: <Network size={18} />,
  access_switch: <Network size={18} />,
  ethiotelecom_epon: <Wifi size={18} />,
  ethiotelecom_gpon: <Wifi size={18} />,
  edge_router: <Router size={18} />,
  distribution_switch: <Network size={18} />,
  fire_extinguisher: <Shield size={18} />,
  ac: <Wind size={18} />,
  ups: <Battery size={18} />,
  monitoring_tv: <Tv size={18} />,
  rack: <Rack size={18} />,
  cctv_camera: <Camera size={18} />,
  digital_signage: <Monitor size={18} />,
  printer_photocopy: <Printer size={18} />,
  check_scanner: <ScanLine size={18} />,
  normal_scanner: <ScanLine size={18} />,
};

// Named icon set a user can pick from when creating a custom device
// type. Keys are stored on the device_types row (icon column) so the
// chosen icon persists and renders everywhere that type appears.
export const ICON_OPTIONS: { name: string; icon: ReactNode }[] = [
  { name: 'HardDrive', icon: <HardDrive size={18} /> },
  { name: 'Network', icon: <Network size={18} /> },
  { name: 'Server', icon: <Server size={18} /> },
  { name: 'Boxes', icon: <Boxes size={18} /> },
  { name: 'Wifi', icon: <Wifi size={18} /> },
  { name: 'Router', icon: <Router size={18} /> },
  { name: 'Shield', icon: <Shield size={18} /> },
  { name: 'Wind', icon: <Wind size={18} /> },
  { name: 'Battery', icon: <Battery size={18} /> },
  { name: 'Tv', icon: <Tv size={18} /> },
  { name: 'Camera', icon: <Camera size={18} /> },
  { name: 'Cctv', icon: <Cctv size={18} /> },
  { name: 'Monitor', icon: <Monitor size={18} /> },
  { name: 'Printer', icon: <Printer size={18} /> },
  { name: 'ScanLine', icon: <ScanLine size={18} /> },
  { name: 'Cpu', icon: <Cpu size={18} /> },
  { name: 'Database', icon: <Database size={18} /> },
  { name: 'Laptop', icon: <Laptop size={18} /> },
  { name: 'Smartphone', icon: <Smartphone size={18} /> },
  { name: 'Lock', icon: <Lock size={18} /> },
  { name: 'KeyRound', icon: <KeyRound size={18} /> },
  { name: 'Usb', icon: <Usb size={18} /> },
  { name: 'Radio', icon: <Radio size={18} /> },
  { name: 'Fingerprint', icon: <Fingerprint size={18} /> },
  { name: 'Landmark', icon: <Landmark size={18} /> },
  { name: 'Cable', icon: <Cable size={18} /> },
];
export const ICON_MAP: Record<string, ReactNode> = Object.fromEntries(ICON_OPTIONS.map((o) => [o.name, o.icon]));

export function getDeviceTypeIcon(deviceTypes: DeviceType[], code: string): ReactNode {
  const rec = deviceTypes.find((t) => t.code === code);
  if (rec?.icon && ICON_MAP[rec.icon]) return ICON_MAP[rec.icon];
  return deviceTypeIcons[code] ?? <HardDrive size={16} />;
}

// The "core" fields — Device Owner, Device Model, Device Hostname —
// used to be unconditionally shown (and, for Owner/Hostname, always
// required) on every device type. They follow the exact same
// include/require/rename pattern as the base fields below, driven by
// each type's core_fields / required_core_fields / field_labels.
export const CORE_FIELD_META: Record<string, { label: string; placeholder?: string }> = {
  device_owner: { label: 'Device Owner / Department' },
  device_model: { label: 'Device Model (Detail Specification)', placeholder: 'e.g., Dell PowerEdge R740' },
  hostname: { label: 'Device Hostname', placeholder: 'Insert serial number if no hostname' },
};
export const ALL_CORE_FIELDS = Object.keys(CORE_FIELD_META);

// The standard columns every device type *can* use. Which ones actually
// show up on the form for a given type is controlled by that type's
// base_fields list (see parseBaseFields), so e.g. a Fire Extinguisher
// doesn't get an IP Address / MAC Address field.
export const BASE_FIELD_META: Record<string, { label: string; placeholder?: string }> = {
  ip_address: { label: 'Device IP Address' },
  serial_number: { label: 'Device Serial Number', placeholder: 'Serial number' },
  mac_address: { label: 'Device MAC Address', placeholder: 'MAC address' },
  location: { label: 'Location', placeholder: 'Datacenter, floor, or branch' },
  rack_number: { label: 'Rack Number', placeholder: 'e.g., 1, 2, 3' },
};
export const ALL_BASE_FIELDS = Object.keys(BASE_FIELD_META);

// Combined lookup used for rendering labels/placeholders regardless of
// whether a field key is a "core" field or a "base" field.
export const STD_FIELD_META: Record<string, { label: string; placeholder?: string }> = {
  ...CORE_FIELD_META,
  ...BASE_FIELD_META,
};
export const ALL_STD_FIELDS = [...ALL_CORE_FIELDS, ...ALL_BASE_FIELDS];

export function parseBaseFields(type?: DeviceType | null): string[] {
  if (!type?.base_fields) return ALL_BASE_FIELDS;
  try {
    const parsed = JSON.parse(type.base_fields);
    return Array.isArray(parsed) ? parsed : ALL_BASE_FIELDS;
  } catch {
    return ALL_BASE_FIELDS;
  }
}

// Which of a type's included base fields (IP, Serial, MAC, Location,
// Rack Number) are mandatory. Anything not listed here stays optional.
export function parseRequiredBaseFields(type?: DeviceType | null): string[] {
  if (!type?.required_base_fields) return [];
  try {
    const parsed = JSON.parse(type.required_base_fields);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Which of the core fields (Device Owner, Device Model, Device
// Hostname) are shown at all for this type. Defaults to all three so
// existing/older types behave exactly as before.
export function parseCoreFields(type?: DeviceType | null): string[] {
  if (!type?.core_fields) return ALL_CORE_FIELDS;
  try {
    const parsed = JSON.parse(type.core_fields);
    return Array.isArray(parsed) ? parsed : ALL_CORE_FIELDS;
  } catch {
    return ALL_CORE_FIELDS;
  }
}

// Which of a type's included core fields are mandatory. Defaults to
// Owner + Hostname, matching the old always-required behavior.
export function parseRequiredCoreFields(type?: DeviceType | null): string[] {
  if (!type?.required_core_fields) return ['device_owner', 'hostname'];
  try {
    const parsed = JSON.parse(type.required_core_fields);
    return Array.isArray(parsed) ? parsed : ['device_owner', 'hostname'];
  } catch {
    return ['device_owner', 'hostname'];
  }
}

// Per-type custom display labels for standard/core fields (e.g. an
// admin renamed "Location" to "Branch / Floor" for one device type).
// Keys not present here fall back to STD_FIELD_META's default label.
export function parseFieldLabels(type?: DeviceType | null): Record<string, string> {
  if (!type?.field_labels) return {};
  try {
    const parsed = JSON.parse(type.field_labels);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function parseExtraFields(type?: DeviceType | null): DeviceTypeField[] {
  if (!type?.fields) return [];
  try {
    const parsed = JSON.parse(type.fields);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
