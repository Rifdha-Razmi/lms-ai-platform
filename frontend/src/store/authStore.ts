import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Role, User } from '@/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  /** True right after the user signs out — guards send them home instead of to Sign in. Not persisted. */
  signedOut: boolean;
  setSession: (p: { user: User; access_token: string; refresh_token: string }) => void;
  setAccessToken: (token: string) => void;
  setUser: (user: User) => void;
  clear: (opts?: { signedOut?: boolean }) => void;
  hasRole: (...roles: Role[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      signedOut: false,
      setSession: ({ user, access_token, refresh_token }) =>
        set({ user, accessToken: access_token, refreshToken: refresh_token, signedOut: false }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setUser: (user) => set({ user }),
      clear: (opts) =>
        set({ user: null, accessToken: null, refreshToken: null, signedOut: !!opts?.signedOut }),
      hasRole: (...roles) => {
        const u = get().user;
        return !!u && roles.some((r) => u.roles.includes(r));
      },
    }),
    {
      name: 'lms-auth',
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken, refreshToken: s.refreshToken }),
    },
  ),
);
