import Constants from 'expo-constants';

const detectedHost = Constants.expoConfig?.hostUri?.split(':')[0];
const BASE =
  process.env.EXPO_PUBLIC_API_URL ?? (detectedHost ? `http://${detectedHost}:4000` : 'http://localhost:4000');

async function request<T>(path: string, options: RequestInit & { token?: string } = {}): Promise<T> {
  const { token, ...init } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...headers, ...((init.headers as Record<string, string>) ?? {}) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Gabim i serverit');
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
