// Local replacement for the old Supabase client.
// Keeps the same shape (`supabase.from(table)...`, `supabase.auth...`)
// that the rest of the app already uses, but talks to our own Express
// + SQLite API instead of Supabase Cloud. This means the page
// components did not need to be rewritten.

import { api, getToken, setToken } from './api';

// admin  - full system access and management
// editor - can add and modify asset information
// reader - view-only access
// audit  - can view all system information but cannot edit or delete anything
export type UserRole = 'admin' | 'editor' | 'reader' | 'audit';

export interface AuthUserLike {
  id: string;
  email: string;
}

export interface AuthSessionLike {
  access_token: string;
  user: AuthUserLike;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string | null;
  is_active: boolean;
  must_change_password: boolean;
  // Ownership: at most one profile has this set - see is_owner in
  // server/schema.sql. That account can't be deleted, demoted,
  // disabled, or module-restricted by any other admin; ownership only
  // moves via the explicit transfer-ownership action.
  is_owner: boolean;
  // Per-User Module Access: null/absent means unrestricted (this
  // account gets everything its role normally allows). Otherwise the
  // list of module ids (see src/lib/permissions.ts) it's limited to.
  permissions?: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  is_branch: boolean;
  description?: string | null;
  created_at: string;
  created_by?: string | null;
}

export interface PCRegistration {
  id: string;
  asset_id?: string | null;
  hostname: string;
  monitor_serial?: string | null;
  asset_tag?: string | null;
  service_tag?: string | null;
  mac_address?: string | null;
  // Read-only mirror of the linked license's license_key, kept in sync
  // by the server whenever license_id changes. Only present as a
  // fallback for older records saved before this field was linked.
  product_key?: string | null;
  // Links this PC to a record in License Management (see `license`
  // below for the expanded record the server attaches).
  license_id?: string | null;
  cpu?: string | null;
  memory_detail?: string | null;
  generation_detail?: string | null;
  ip_address?: string | null;
  owner_name?: string | null;
  department_id?: string | null;
  floor_number?: string | null;
  switch_port_number?: string | null;
  access_switch_ip?: string | null;
  access_switch_name?: string | null;
  patch_level_number?: string | null;
  model_id?: string | null;
  image?: string | null;
  notes?: string | null;
  registered_by?: string | null;
  created_at: string;
  updated_at: string;
  department?: Department | null;
  // Attached server-side from license_id - the full linked license
  // record, so the form/detail view can show its type, subtype,
  // vendor, and key without a second lookup.
  license?: License | null;
  // Links this PC to its authoritative record in IP Management
  // (ip_addresses.id) whenever ip_address matches one already
  // registered there - set server-side, never taken from the client.
  ip_id?: string | null;
  // Attached server-side from ip_id - the full linked IP Management
  // record, so the form/detail view can show its owner/status/subnet
  // without a second lookup.
  ip_record?: IPAddress | null;
  // JSON-encoded Record<string, string> keyed by a custom field's key
  // (see PcFormFields.fields below) — same encoding as Device.extra_data.
  extra_data?: string | null;
}

// Single-row config for the "Register New PC" form — see
// src/lib/pcFormFields.ts for the parse helpers and the full set of
// standard field keys/labels this drives.
export interface PcFormFields {
  id: string;
  base_fields?: string | null; // JSON-encoded string[] of standard field keys, IN DISPLAY ORDER
  required_base_fields?: string | null; // JSON-encoded string[] — subset of base_fields that are mandatory
  field_labels?: string | null; // JSON-encoded { [fieldKey]: string } — custom labels for standard fields
  fields?: string | null; // JSON-encoded DeviceTypeField[] of fully custom fields
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

export interface IpFormFields {
  id: string;
  base_fields?: string | null;
  required_base_fields?: string | null;
  field_labels?: string | null;
  fields?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

export interface LicenseType {
  id: string;
  code: string;
  label: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

export interface LicenseSubtype {
  id: string;
  license_type_id: string;
  label: string;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

export interface License {
  id: string;
  asset_id?: string | null;
  license_name?: string | null;
  license_type: string;
  license_subtype?: string | null;
  vendor?: string | null;
  license_key?: string | null;
  number_of_licenses?: number | null;
  effective_date?: string | null;
  expiry_date?: string | null;
  alert_sent: boolean;
  notes?: string | null;
  // Supporting document for this license (e.g. license certificate or
  // proof of purchase) - stored as a base64 data URL, with the
  // original filename kept alongside it for display/download.
  attachment?: string | null;
  attachment_name?: string | null;
  registered_by?: string | null;
  created_at: string;
  updated_at: string;
  // Attached server-side - the PC (if any) this license is currently
  // linked to via pc_registrations.license_id. A license can only be
  // linked to one PC at a time.
  assigned_pc?: { id: string; hostname: string; asset_id?: string | null } | null;
}

// The full set of input types an admin can choose from when defining a
// custom field for a device type — see FIELD_TYPE_OPTIONS in
// lib/deviceTypeFields.tsx for the human labels + which of these need
// an `options` list. Kept as a plain string union (not string|undefined)
// on new fields going forward, but parsing always falls back to 'text'
// for older records saved before a given type existed.
export type DeviceFieldType =
  | 'text'
  | 'long_text'
  | 'number'
  | 'decimal'
  | 'date'
  | 'datetime'
  | 'dropdown'
  | 'multiselect'
  | 'checkbox'
  | 'radio'
  | 'ip_address'
  | 'mac_address'
  | 'email'
  | 'url'
  | 'image'
  | 'file'
  | 'employee'
  | 'department'
  | 'branch';

export interface DeviceTypeField {
  key: string;
  label: string;
  placeholder?: string;
  type?: DeviceFieldType;
  required?: boolean; // if true, this field must be filled in before the device can be saved
  // Choice list for 'dropdown' | 'multiselect' | 'radio' fields. Ignored
  // (and not needed) for every other field type.
  options?: string[];
}

export interface DeviceType {
  id: string;
  code: string;
  label: string;
  icon?: string | null;
  base_fields?: string | null; // JSON-encoded string[] of standard field keys shown for this type
  required_base_fields?: string | null; // JSON-encoded string[] — subset of base_fields that are mandatory
  core_fields?: string | null; // JSON-encoded string[] — which of device_owner/device_model/hostname are shown
  required_core_fields?: string | null; // JSON-encoded string[] — subset of core_fields that are mandatory
  field_labels?: string | null; // JSON-encoded { [fieldKey]: string } — custom labels for standard/core fields
  fields?: string | null; // JSON-encoded DeviceTypeField[] of type-specific extra fields
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

// Minimal, non-sensitive user record returned by GET /profiles/directory
// — used to populate an "Employee/User Selection" custom field without
// requiring the admin/audit-only full profile list.
export interface DirectoryUser {
  id: string;
  full_name: string;
  email: string;
}

export interface DeviceOwner {
  id: string;
  code: string;
  label: string;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

export interface Device {
  id: string;
  asset_id?: string | null;
  device_type: string;
  device_owner?: string | null;
  department_id?: string | null;
  // Attached server-side from department_id - the full linked
  // Customization > Departments record, so the form/detail view can
  // show its name without a second lookup (same pattern as
  // PCRegistration.department below).
  department?: Department | null;
  device_model?: string | null;
  hostname?: string | null;
  ip_address?: string | null;
  serial_number?: string | null;
  mac_address?: string | null;
  location?: string | null;
  rack_number?: string | null;
  // JSON-encoded Record<string, string> keyed by DeviceTypeField.key. Every
  // value is stored as a string regardless of field type — multiselect
  // encodes its array as a JSON string, checkbox as "true"/"false", and
  // image/file fields as a JSON string of { name, dataUrl }. See
  // lib/deviceFieldValues.ts for the encode/decode/format helpers.
  extra_data?: string | null;
  model_id?: string | null;
  image?: string | null;
  notes?: string | null;
  // Links this device to its authoritative record in IP Management
  // (ip_addresses.id) whenever ip_address matches one already
  // registered there - set server-side, never taken from the client.
  ip_id?: string | null;
  // Attached server-side from ip_id - the full linked IP Management
  // record, so the form/detail view can show its owner/status/subnet
  // without a second lookup.
  ip_record?: IPAddress | null;
  registered_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServerOwner {
  id: string;
  code: string;
  label: string;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

// Customization: vendors/manufacturers offered as a dropdown on the
// License, Asset Model and Server Registration forms.
export interface Vendor {
  id: string;
  code: string;
  label: string;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

// Customization: server types (Redhat, Ubuntu, Windows Server, ...)
// offered on the Server Registration form.
export interface ServerType {
  id: string;
  code: string;
  label: string;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

// Customization: server environments (Production, Test, Standby, ...)
// offered on the Server Registration form.
export interface ServerEnvironment {
  id: string;
  code: string;
  label: string;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

// Customization: OS Release values (Red Hat Enterprise Linux 8/9,
// Windows Server 2019/2022, Ubuntu Server, ...) offered on the Server
// Registration form's "OS Release" dropdown.
export interface OSRelease {
  id: string;
  code: string;
  label: string;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

// Customization: Host Location / platform values (VMware ESXi,
// Hyper-V, Physical Server, Cloud, ...) offered on the Server
// Registration form's "Host Location" dropdown. Not limited to VMware
// ESXi — administrators can add any platform/location.
export interface HostLocation {
  id: string;
  code: string;
  label: string;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

// Customization: Head Office floor/location values offered on the PC
// Registration form. Branch devices skip this field entirely.
export interface Floor {
  id: string;
  code: string;
  label: string;
  // Admin-controlled display/dropdown order - see the reorder arrows
  // on the Floors Customization page. Lower sorts first.
  position: number;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

// Customization: Access Switch Name values offered on the PC
// Registration form's "Access Switch Name" field.
export interface AccessSwitch {
  id: string;
  code: string;
  label: string;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

// Customization: Access Switch IP Address values offered on the PC
// Registration form's "Access Switch IP Address" field.
export interface AccessSwitchIp {
  id: string;
  code: string;
  label: string;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

// Customization: Patch / Level Number values, shared by the PC
// Registration form's "Patch / Level Number" field and the IP
// Management form's "Patch Panel Label / Number" field.
export interface PatchLevel {
  id: string;
  code: string;
  label: string;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

// Customization: maps an IP prefix (e.g. "10.6.13.") to a human label
// (e.g. "Head Office - Server Room") so forms can auto-detect which
// network segment an entered IP address belongs to.
export interface IPSubnet {
  id: string;
  prefix: string;
  label: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

// Customization: predefined computer/device models with a reference
// photo, selectable when registering a PC or device.
export interface AssetModel {
  id: string;
  target: 'pc' | 'device';
  device_type?: string | null;
  name: string;
  manufacturer?: string | null;
  image?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

export interface Server {
  id: string;
  asset_id?: string | null;
  server_type: string;
  server_type_other?: string | null;
  hostname: string;
  ip_address?: string | null;
  ssh_port: number;
  environment: string;
  server_owner: string;
  network_subnet?: string | null;
  vendor?: string | null;
  image?: string | null;
  ram?: string | null;
  cpu?: string | null;
  storage?: string | null;
  os_release?: string | null;
  host_location?: string | null;
  notes?: string | null;
  registered_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReminderType {
  id: string;
  label: string;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

export interface Reminder {
  id: string;
  title: string;
  reminder_type: string;
  detail?: string | null;
  remind_at: string;
  alert_email?: string | null;
  email_sent: boolean;
  is_notified: boolean;
  is_dismissed: boolean;
  // Set only for reminders auto-generated from a license's expiry date
  // (see LicenseRegistrationPage's "Remind me before expiry" option).
  // Null for reminders created manually from the Reminders page.
  license_id?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

// Admin Change Notifications: logged automatically whenever an
// important record (asset/IP/device/server/license/PC/user) is
// updated or deleted - see recordNotification in server/crud.js.
export interface AdminNotification {
  id: string;
  action: 'update' | 'delete';
  table_name: string;
  record_type: string;
  record_id?: string | null;
  record_label?: string | null;
  summary: string;
  actor_id?: string | null;
  actor_name: string;
  is_read: boolean;
  created_at: string;
}

export interface IPAddress {
  id: string;
  ip_address: string;
  subnet_id?: string | null;
  hostname?: string | null;
  department_id?: string | null;
  ip_owner?: string | null;
  mac_address?: string | null;
  access_switch_port?: string | null;
  patch_panel_label?: string | null;
  status: 'unassigned' | 'assigned' | 'reserved' | 'available' | 'decommissioned';
  notes?: string | null;
  extra_data?: string | null;
  registered_by?: string | null;
  created_at: string;
  updated_at: string;
  department?: Department | null;
}

type AuthListener = (session: AuthSessionLike | null) => void;

let currentSession: AuthSessionLike | null = null;
const listeners: AuthListener[] = [];

function notifyListeners() {
  listeners.forEach((l) => l(currentSession));
}

type Filter = { col: string; op: 'eq' | 'gte' | 'lte'; value: unknown };

class QueryBuilder {
  private table: string;
  private filters: Filter[] = [];
  private orderCol: string | null = null;
  private orderAsc = true;
  private op: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private payload: any = null;
  private wantsSingle = false;

  constructor(table: string) {
    this.table = table;
  }

  select(_columns?: string) {
    this.op = 'select';
    return this;
  }

  eq(col: string, value: unknown) {
    this.filters.push({ col, op: 'eq', value });
    return this;
  }

  gte(col: string, value: unknown) {
    this.filters.push({ col, op: 'gte', value });
    return this;
  }

  lte(col: string, value: unknown) {
    this.filters.push({ col, op: 'lte', value });
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.orderCol = col;
    this.orderAsc = opts?.ascending !== false;
    return this;
  }

  insert(payload: any) {
    this.op = 'insert';
    this.payload = payload;
    return this;
  }

  update(payload: any) {
    this.op = 'update';
    this.payload = payload;
    return this;
  }

  delete() {
    this.op = 'delete';
    return this;
  }

  maybeSingle() {
    this.wantsSingle = true;
    return this;
  }

  single() {
    this.wantsSingle = true;
    return this;
  }

  private idFilterValue(): string | undefined {
    return this.filters.find((f) => f.col === 'id' && f.op === 'eq')?.value as string | undefined;
  }

  private buildListQuery(): string {
    const params = new URLSearchParams();
    for (const f of this.filters) {
      if (f.col === 'id' && f.op === 'eq') continue; // handled as path param elsewhere
      const key = f.op === 'eq' ? f.col : `${f.col}_${f.op}`;
      params.set(key, String(f.value));
    }
    if (this.orderCol) {
      params.set('order', this.orderCol);
      params.set('ascending', String(this.orderAsc));
    }
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }

  private async execute(): Promise<{ data: any; error: { message: string } | null }> {
    if (this.op === 'select') {
      const id = this.idFilterValue();
      if (id && this.wantsSingle) {
        const res = await api.get(`/${this.table}/${id}`);
        if (res.error) {
          // maybeSingle()/single() should not error out on a missing row
          return { data: null, error: null };
        }
        return { data: res.data, error: null };
      }
      const res = await api.get(`/${this.table}${this.buildListQuery()}`);
      if (this.wantsSingle) {
        const arr = (res.data as any[]) ?? [];
        return { data: arr[0] ?? null, error: res.error };
      }
      return res;
    }

    if (this.op === 'insert') {
      const res = await api.post(`/${this.table}`, this.payload);
      return res;
    }

    if (this.op === 'update') {
      const id = this.idFilterValue();
      const res = await api.patch(`/${this.table}/${id}`, this.payload);
      return res;
    }

    if (this.op === 'delete') {
      const id = this.idFilterValue();
      const res = await api.del(`/${this.table}/${id}`);
      return res;
    }

    return { data: null, error: { message: 'Unsupported operation' } };
  }

  // Makes the builder awaitable / usable with Promise.all, just like
  // the real Supabase query builder.
  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled as any, onrejected as any);
  }
}

async function restoreSession() {
  const token = getToken();
  if (!token) {
    currentSession = null;
    return;
  }
  const res = await api.get<{ user: AuthUserLike; profile: Profile }>('/auth/session');
  if (res.error || !res.data) {
    setToken(null);
    currentSession = null;
    return;
  }
  currentSession = { access_token: token, user: res.data.user };
}

export const supabase = {
  from(table: string) {
    return new QueryBuilder(table);
  },

  auth: {
    async getSession() {
      await restoreSession();
      return { data: { session: currentSession } };
    },

    onAuthStateChange(callback: (event: string, session: AuthSessionLike | null) => void) {
      const listener: AuthListener = (session) => callback(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);
      listeners.push(listener);
      return {
        data: {
          subscription: {
            unsubscribe() {
              const idx = listeners.indexOf(listener);
              if (idx >= 0) listeners.splice(idx, 1);
            },
          },
        },
      };
    },

    async signInWithPassword({ email, password }: { email: string; password: string }) {
      const res = await api.post<{ token: string; user: AuthUserLike; profile: Profile }>('/auth/login', {
        email,
        password,
      });
      if (res.error || !res.data) {
        return { error: { message: res.error?.message ?? 'Sign in failed' } };
      }
      setToken(res.data.token);
      currentSession = { access_token: res.data.token, user: res.data.user };
      notifyListeners();
      return { error: null };
    },

    async signOut() {
      setToken(null);
      currentSession = null;
      notifyListeners();
      return { error: null };
    },

    async updateUser({ password }: { password: string }) {
      const res = await api.patch('/auth/password', { password });
      if (res.error) return { error: { message: res.error.message } };
      return { error: null };
    },

    admin: {
      async createUser(payload: {
        email: string;
        password: string;
        email_confirm?: boolean;
        user_metadata?: {
          full_name?: string;
          role?: UserRole;
          phone?: string;
          must_change_password?: boolean;
          permissions?: string[] | null;
        };
      }) {
        const res = await api.post<{ user: AuthUserLike }>('/auth/admin/create-user', {
          email: payload.email,
          password: payload.password,
          full_name: payload.user_metadata?.full_name,
          role: payload.user_metadata?.role,
          phone: payload.user_metadata?.phone,
          must_change_password: payload.user_metadata?.must_change_password,
          permissions: payload.user_metadata?.permissions ?? null,
        });
        if (res.error || !res.data) {
          return { data: { user: null }, error: { message: res.error?.message ?? 'Could not create user' } };
        }
        return { data: { user: res.data.user }, error: null };
      },

      // Admin resets another user's password. By default this also
      // forces that user to set a new password at their next login.
      async resetUserPassword(userId: string, password: string, forceChange = true) {
        const res = await api.post<{ ok: boolean }>(`/auth/admin/reset-password/${userId}`, {
          password,
          must_change_password: forceChange,
        });
        if (res.error) return { error: { message: res.error.message } };
        return { error: null };
      },
    },
  },
};
