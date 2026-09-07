// Roles: admin (full access), editor (add/modify/delete asset info),
// reader (view-only), audit (view everything, no edit/delete).
export const ALL_ROLES = ['admin', 'editor', 'reader', 'audit'] as const;
export type Role = (typeof ALL_ROLES)[number];

export const WRITE_ROLES: Role[] = ['admin', 'editor'];
// DELETE_ROLES: admin-only. Used for Customization/config tables where
// insert/update are already admin-only — delete must match.
export const DELETE_ROLES: Role[] = ['admin'];
// ASSET_DELETE_ROLES: admin + editor — the actual asset-record tables
// (devices, ip_addresses, licenses, pc_registrations, servers, reminders).
export const ASSET_DELETE_ROLES: Role[] = ['admin', 'editor'];
export const AUDIT_VIEW_ROLES: Role[] = ['admin', 'audit'];

// Canonical list of module keys grantable/restrictable via Per-User
// Module Access. Kept in sync with TABLE_MODULE_MAP in crudConfig.ts.
export const MODULE_KEYS = [
  'pc', 'ip', 'licenses', 'devices', 'servers', 'reminders', 'reports',
  'users', 'backup', 'notifications',
  'departments', 'license_types', 'server_owners', 'device_owners',
  'server_types', 'server_environments', 'os_releases', 'host_locations',
  'floors', 'access_switches', 'access_switch_ips', 'patch_levels',
  'device_types', 'reminder_types', 'pc_fields', 'ip_subnets', 'asset_models', 'vendors',
] as const;
export type ModuleKey = (typeof MODULE_KEYS)[number];

// Maps each CRUD-backed table to the sidebar module key it belongs to,
// so a user restricted to specific modules is blocked from every route
// that table exposes.
export const TABLE_MODULE_MAP: Record<string, ModuleKey> = {
  departments: 'departments',
  license_types: 'license_types',
  license_subtypes: 'license_types',
  device_types: 'device_types',
  pc_form_fields: 'pc_fields',
  device_owners: 'device_owners',
  server_owners: 'server_owners',
  server_types: 'server_types',
  server_environments: 'server_environments',
  os_releases: 'os_releases',
  host_locations: 'host_locations',
  floors: 'floors',
  access_switches: 'access_switches',
  access_switch_ips: 'access_switch_ips',
  patch_levels: 'patch_levels',
  ip_subnets: 'ip_subnets',
  asset_models: 'asset_models',
  vendors: 'vendors',
  reminder_types: 'reminder_types',
  pc_registrations: 'pc',
  licenses: 'licenses',
  devices: 'devices',
  servers: 'servers',
  reminders: 'reminders',
  ip_addresses: 'ip',
};

export const BOOLEAN_COLUMNS = new Set([
  'is_branch',
  'is_active',
  'alert_sent',
  'is_notified',
  'is_dismissed',
  'email_sent',
  'must_change_password',
  'is_owner',
  'is_read',
]);

// Columns never meaningful in a change-notification diff, or too large
// to show verbatim.
export const NOTIFY_SKIP_COLUMNS = new Set([
  'id', 'created_at', 'updated_at', 'password_hash',
  'image', 'attachment', 'extra_data',
]);
