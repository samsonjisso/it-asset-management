"use client";
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) || '/api';
const TOKEN_KEY = 'gbb_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
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
    if (res.status === 401 && typeof window !== 'undefined') {
      sessionStorage.setItem('gbb_return_path', window.location.pathname + window.location.search);
      window.dispatchEvent(new Event('gbb:session-expired'));
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

export interface ComputerInfoResult {
  ip: string | null;
  hostname: string | null;
  mac_address: string | null;
  owner_name: string | null;
  notes: string;
}

// Best-effort auto-detection of the calling PC's hostname/IP/MAC address
// from the network layer. Only meaningful when run from the browser of the
// PC being registered - see server/routes/network.js for what it can and
// can't see.
export function fetchComputerInfo() {
  return request<ComputerInfoResult>('GET', '/network/computer-info');
}
