import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { env } from '@/utils/env';
import { useAuthStore } from '@/store/authStore';
import type { ApiErrorBody } from '@/types';

/** Shared axios instance for the Core LMS + AI services (PRD §8, base /api/v1). */
export const api = axios.create({
  baseURL: env.apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// --- Silent refresh: one in-flight refresh shared by all 401'd requests ---
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const { refreshToken, setAccessToken } = useAuthStore.getState();
  if (!refreshToken) throw new Error('No refresh token');
  const { data } = await axios.post<{ access_token: string }>(`${env.apiBaseUrl}/auth/refresh`, {
    refresh_token: refreshToken,
  });
  setAccessToken(data.access_token);
  return data.access_token;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<ApiErrorBody>) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const isAuthCall = original?.url?.startsWith('/auth/');
    if (error.response?.status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      try {
        refreshPromise ??= refreshAccessToken().finally(() => (refreshPromise = null));
        const token = await refreshPromise;
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        useAuthStore.getState().clear();
        if (!location.pathname.startsWith('/login')) {
          location.assign(`/login?next=${encodeURIComponent(location.pathname)}`);
        }
      }
    }
    return Promise.reject(error);
  },
);

/** Normalises the PRD §8.8 error envelope into a readable message. */
export function getErrorMessage(err: unknown, fallback = 'Something went wrong. Try again.'): string {
  if (axios.isAxiosError<ApiErrorBody>(err)) {
    if (err.response?.data?.error?.message) return err.response.data.error.message;
    if (err.response?.status === 429) return 'Too many requests. Wait a minute and try again.';
    if (!err.response) return 'Can’t reach the server. Check your connection.';
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export function getErrorField(err: unknown): string | undefined {
  return axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data?.error?.field : undefined;
}
