import { api } from './apiClient';
import type { AuthResponse, User } from '@/types';

export const authService = {
  register: (body: { full_name: string; email: string; password: string }) =>
    api.post<AuthResponse>('/auth/register', body).then((r) => r.data),
  login: (body: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', body).then((r) => r.data),
  logout: (refresh_token: string | null) => api.post('/auth/logout', { refresh_token }),
  me: () => api.get<User>('/auth/me').then((r) => r.data),
  updateProfile: (body: Partial<Pick<User, 'full_name' | 'avatar_url'>>) =>
    api.put<User>('/users/me', body).then((r) => r.data),
};
