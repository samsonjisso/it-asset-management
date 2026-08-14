"use client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';
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
