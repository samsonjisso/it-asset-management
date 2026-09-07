const API_BASE = (process.env.NEXT_PUBLIC_API_URL as string | undefined) || '/api';
const TOKEN_KEY = 'gbb_token';

// Fired whenever the server rejects a request as unauthenticated/expired
// (401), so AuthContext can immediately drop the session and show the
// login screen — the user must be required to authenticate again the
// moment the session is no longer valid, not just on their next click.
export const UNAUTHORIZED_EVENT = 'gbb:unauthorized';

// Session Security: the token lives in sessionStorage, so closing the
// browser/tab ends the session. The login screen may remember the email
// address separately, but never persists authentication credentials.
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  // Remove tokens written by the former "Keep me signed in" behavior.
  localStorage.removeItem(TOKEN_KEY);
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === 'undefined') return;
  // Always clear both first so switching "remember me" on/off between
  // logins (or logging out) never leaves a stale copy in the other
  // storage for getToken() to pick up.
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
  if (!token) return;
  sessionStorage.setItem(TOKEN_KEY, token);
}

export interface ApiResult<T> {
  data: T | null;
  error: { message: string } | null;
}

async function request<T = any>(method: string, path: string, body?: unknown): Promise<ApiResult<T>> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    return { data: null, error: { message: 'Cannot reach the server. Is it running?' } };
  }

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) {
    // A 401 here means the token this tab is holding is no longer
    // valid — expired, revoked, or the account was logged out/disabled
    // elsewhere. Only a genuinely authenticated request should trigger
    // this (i.e. we actually sent a token), so a 401 on an anonymous
    // login attempt doesn't loop back into a sign-out.
    if (res.status === 401 && token && typeof window !== 'undefined') {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    return { data: null, error: { message: json?.error || res.statusText || 'Request failed' } };
  }
  return { data: json as T, error: null };
}

export const api = {
  get: <T = any>(path: string) => request<T>('GET', path),
  post: <T = any>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T = any>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  del: <T = any>(path: string) => request<T>('DELETE', path),
};

export interface PingResult {
  ip: string;
  reachable: boolean;
  status: 'assigned' | 'available';
  message: string;
  checked_at: string;
}

export function pingIp(ip: string) {
  return request<PingResult>('POST', '/network/ping', { ip });
}

export interface DirectoryUserResult {
  id: string;
  full_name: string;
  email: string;
}

// Minimal active-user list for populating "Employee/User Selection"
// custom fields — see GET /profiles/directory on the server.
export function fetchProfileDirectory() {
  return request<DirectoryUserResult[]>('GET', '/profiles/directory');
}

// Admin Change Notifications: marks every unread notification as read
// in one call, rather than one PATCH per row.
export function markAllNotificationsRead() {
  return request<{ ok: boolean }>('POST', '/notifications/mark_all_read');
}

// Transfer Ownership: reassigns the owner flag (see is_owner in
// server/schema.sql) from the caller to another admin. Only the
// current owner can call this, and it re-confirms their password
// server-side — see POST /profiles/:id/transfer-ownership.
export function transferOwnership(newOwnerId: string, password: string) {
  return request('POST', `/profiles/${newOwnerId}/transfer-ownership`, { password });
}

