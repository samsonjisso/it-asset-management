"use client";
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
export type UserRole = 'admin' | 'manager' | 'register_user' | 'assessor' | 'editor' | 'reader' | 'audit';

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
  product_key?: string | null;
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
  license_type: string;
  license_subtype?: string | null;
  vendor?: string | null;
  license_key?: string | null;
  number_of_licenses?: number | null;
  effective_date?: string | null;
  expiry_date?: string | null;
  alert_sent: boolean;
  notes?: string | null;
  registered_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeviceTypeField {
  key: string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'number' | 'date';
  required?: boolean; // if true, this field must be filled in before the device can be saved
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
  device_model?: string | null;
  hostname?: string | null;
  ip_address?: string | null;
  serial_number?: string | null;
  mac_address?: string | null;
  location?: string | null;
  rack_number?: string | null;
  extra_data?: string | null; // JSON-encoded Record<string, string> keyed by DeviceTypeField.key
  model_id?: string | null;
  image?: string | null;
  notes?: string | null;
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
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Asset {
  id: string;
  asset_id?: string | null;
  asset_name: string;
  asset_type: string;
  department_id?: string | null;
  owner?: string | null;
  location?: string | null;
  model?: string | null;
  hostname?: string | null;
  serial_number?: string | null;
  manufacturer?: string | null;
  supplier?: string | null;
  operating_system?: string | null;
  ip_address?: string | null;
  notes?: string | null;
  registered_by?: string | null;
  created_at: string;
  updated_at: string;
  department?: Department | null;
}

export interface IPAddress {
  id: string;
  ip_address: string;
  hostname?: string | null;
  department_id?: string | null;
  ip_owner?: string | null;
  mac_address?: string | null;
  access_switch_port?: string | null;
  patch_panel_label?: string | null;
  status: 'assigned' | 'reserved' | 'available' | 'decommissioned';
  notes?: string | null;
  registered_by?: string | null;
  created_at: string;
  updated_at: string;
  department?: Department | null;
  related_assets?: { pc?: { id:string; asset_id?:string|null; hostname?:string|null }|null; device?: { id:string; asset_id?:string|null; hostname?:string|null; device_type?:string|null }|null; server?: { id:string; asset_id?:string|null; hostname?:string|null; server_type?:string|null }|null; };
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
        user_metadata?: { full_name?: string; role?: UserRole; phone?: string; must_change_password?: boolean };
      }) {
        const res = await api.post<{ user: AuthUserLike }>('/auth/admin/create-user', {
          email: payload.email,
          password: payload.password,
          full_name: payload.user_metadata?.full_name,
          role: payload.user_metadata?.role,
          phone: payload.user_metadata?.phone,
          must_change_password: payload.user_metadata?.must_change_password,
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
