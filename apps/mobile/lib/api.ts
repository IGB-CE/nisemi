import Constants from 'expo-constants';

const detectedHost = Constants.expoConfig?.hostUri?.split(':')[0];
export const BASE =
  process.env.EXPO_PUBLIC_API_URL ?? (detectedHost ? `http://${detectedHost}:4000` : 'http://localhost:4000');

// Called when an authenticated request is rejected with 401 (expired/invalid
// JWT). The auth provider registers a handler that clears the session so the
// app routes back to login instead of getting stuck on an error screen.
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

async function request<T>(path: string, options: RequestInit & { token?: string } = {}): Promise<T> {
  const { token, ...init } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...headers, ...((init.headers as Record<string, string>) ?? {}) },
  });
  const data = await res.json();
  if (!res.ok) {
    // A 401 on a request we authenticated means the stored token expired or is
    // no longer valid — drop the session so the user can sign back in.
    if (res.status === 401 && token) onUnauthorized?.();
    throw new Error(data.error ?? 'Gabim i serverit');
  }
  return data as T;
}

export const api = {
  post: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body), token }),
  get: <T>(path: string, token?: string) => request<T>(path, { method: 'GET', token }),
  patch: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body), token }),
  delete: <T>(path: string, token?: string) => request<T>(path, { method: 'DELETE', token }),
};
