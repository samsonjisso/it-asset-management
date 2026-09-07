import { UserRole } from './supabase';

// Per-User Module Access: every module a user's access can be
// restricted to. Ids match the sidebar navigation item ids in
// Layout.tsx and the `activePage` keys in App.tsx, and must stay in
// sync with MODULE_KEYS in server/auth.js (which enforces the same
// restriction on the API side).
//
// Dashboard, About, and Profile are intentionally left out — every
// active user always has those, so they're never shown as a
// restrictable checkbox and never blocked by a permissions list.
export interface ModuleDef {
  id: string;
  label: string;
  group: 'main' | 'admin';
  // The roles that could ever see this module anyway. When building the
  // checklist for a given role, only modules whose `roles` includes
  // that role are offered — no point letting an admin tick a checkbox
  // for a page a reader could never open regardless.
  roles: UserRole[];
}

const ALL_ROLES: UserRole[] = ['admin', 'editor', 'reader', 'audit'];

export const ALL_MODULES: ModuleDef[] = [
  // Everyday modules
  { id: 'pc', label: 'PCs', group: 'main', roles: ALL_ROLES },
  { id: 'ip', label: 'IP Management', group: 'main', roles: ALL_ROLES },
  { id: 'licenses', label: 'Licenses', group: 'main', roles: ALL_ROLES },
  { id: 'devices', label: 'Devices', group: 'main', roles: ALL_ROLES },
  { id: 'servers', label: 'Servers', group: 'main', roles: ALL_ROLES },
  { id: 'reminders', label: 'Reminders', group: 'main', roles: ALL_ROLES },
  { id: 'notifications', label: 'Notifications', group: 'main', roles: ['admin', 'audit'] },
  { id: 'reports', label: 'Reports', group: 'main', roles: ALL_ROLES },
  { id: 'users', label: 'User Management', group: 'main', roles: ['admin', 'audit'] },
  { id: 'backup', label: 'Backup & Restore', group: 'main', roles: ['admin', 'audit'] },
  // Admin Customization
  { id: 'departments', label: 'Departments', group: 'admin', roles: ['admin', 'audit'] },
  { id: 'license_types', label: 'License Types', group: 'admin', roles: ['admin', 'audit'] },
  { id: 'server_owners', label: 'Server Owners', group: 'admin', roles: ['admin', 'audit'] },
  { id: 'device_owners', label: 'Device Owners', group: 'admin', roles: ['admin', 'audit'] },
  { id: 'server_types', label: 'Server Types', group: 'admin', roles: ['admin', 'editor', 'audit'] },
  { id: 'server_environments', label: 'Server Environments', group: 'admin', roles: ['admin', 'editor', 'audit'] },
  { id: 'os_releases', label: 'OS Releases', group: 'admin', roles: ['admin', 'editor', 'audit'] },
  { id: 'host_locations', label: 'Host Locations', group: 'admin', roles: ['admin', 'editor', 'audit'] },
  { id: 'floors', label: 'Floors', group: 'admin', roles: ['admin', 'editor', 'audit'] },
  { id: 'access_switches', label: 'Access Switches', group: 'admin', roles: ['admin', 'editor', 'audit'] },
  { id: 'access_switch_ips', label: 'Access Switch IPs', group: 'admin', roles: ['admin', 'editor', 'audit'] },
  { id: 'patch_levels', label: 'Patch / Level Numbers', group: 'admin', roles: ['admin', 'editor', 'audit'] },
  { id: 'device_types', label: 'Device Types', group: 'admin', roles: ['admin', 'audit'] },
  { id: 'reminder_types', label: 'Reminder Types', group: 'admin', roles: ['admin', 'audit'] },
  { id: 'pc_fields', label: 'PC Registration Fields', group: 'admin', roles: ['admin', 'audit'] },
  { id: 'ip_subnets', label: 'IP Subnets', group: 'admin', roles: ['admin', 'audit'] },
  { id: 'asset_models', label: 'Asset Models', group: 'admin', roles: ['admin', 'editor', 'audit'] },
  { id: 'vendors', label: 'Vendors', group: 'admin', roles: ['admin', 'editor', 'audit'] },
];

export const MODULE_LABELS: Record<string, string> = Object.fromEntries(
  ALL_MODULES.map((m) => [m.id, m.label])
);

// Pages every active user can always reach, regardless of any module
// restriction on their account.
export const ALWAYS_VISIBLE_PAGES = ['dashboard', 'about', 'profile'];

// True when `permissions` (a user's stored module-access list, or null
// for "unrestricted") allows the given module. Null/empty always means
// unrestricted — this is what makes the feature backwards-compatible
// with every account created before it existed.
export function isModuleAllowed(permissions: string[] | null | undefined, moduleId: string): boolean {
  if (ALWAYS_VISIBLE_PAGES.includes(moduleId)) return true;
  if (!permissions || permissions.length === 0) return true;
  return permissions.includes(moduleId);
}

// Modules a given role could ever be granted — used to build the
// checklist in the Create/Edit User forms.
export function modulesForRole(role: UserRole): ModuleDef[] {
  return ALL_MODULES.filter((m) => m.roles.includes(role));
}
