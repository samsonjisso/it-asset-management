"use client";

// Local replacement for the old Supabase client.
// Keeps the same shape (`supabase.from(table)...`, `supabase.auth...`)
// that the rest of the app already uses, but talks to our own Express
// + SQLite API instead of Supabase Cloud. This means the page
// components did not need to be rewritten.

import { api, getToken, setToken } from './api';

export type UserRole = 'admin' | 'manager' | 'register_user' | 'assessor';

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
  hostname: string;
  monitor_serial?: string | null;
  asset_tag?: string | null;
  service_tag?: string | null;
  mac_address?: string | null;
  product_key?: string | null;
  ip_address?: string | null;
  department_id?: string | null;
  floor_number?: string | null;
  switch_port_number?: string | null;
  access_switch_ip?: string | null;
  access_switch_name?: string | null;
  patch_level_number?: string | null;
  notes?: string | null;
  registered_by?: string | null;
  created_at: string;
  updated_at: string;
  department?: Department | null;
}

export interface License {
  id: string;
  license_type: 'operating_system' | 'email_365' | 'veam_backup' | 'vmware' | 'other';
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

export interface Device {
  id: string;
  device_type: string;
  device_owner: 'infrastructure_management' | 'application_management' | 'information_security';
  device_model?: string | null;
  hostname: string;
  ip_address?: string | null;
  serial_number?: string | null;
  mac_address?: string | null;
  location?: string | null;
  rack_number?: string | null;
  notes?: string | null;
  registered_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Server {
  id: string;
  server_type: 'redhat' | 'ubuntu' | 'windows_server' | 'other';
  server_type_other?: string | null;
  hostname: string;
  ip_address?: string | null;
  ssh_port: number;
  environment: 'production' | 'test' | 'standby';
  server_owner: 'application' | 'information_security' | 'infrastructure_management';
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
  status: 'assigned' | 'reserved' | 'available' | 'decommissioned';
  notes?: string | null;
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
        user_metadata?: { full_name?: string; role?: UserRole };
      }) {
        const res = await api.post<{ user: AuthUserLike }>('/auth/admin/create-user', {
          email: payload.email,
          password: payload.password,
          full_name: payload.user_metadata?.full_name,
          role: payload.user_metadata?.role,
        });
        if (res.error || !res.data) {
          return { data: { user: null }, error: { message: res.error?.message ?? 'Could not create user' } };
        }
        return { data: { user: res.data.user }, error: null };
      },
    },
  },
};
