import { supabase } from '@/lib/supabase';

export async function getAccessToken(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token;

  if (!token) {
    throw new Error('Not authenticated. Please sign in again.');
  }

  return token;
}

export async function authenticatedFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = await getAccessToken();

  const headers = new Headers(init.headers);

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  headers.set('Authorization', `Bearer ${token}`);

  return fetch(url, {
    ...init,
    headers,
  });
}