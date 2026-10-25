import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/services/authService';
import { queryClient } from '@/services/queryClient';
import { useAuthStore } from '@/store/authStore';
import type { Role, User } from '@/types';

export const homeFor = (user: Pick<User, 'roles'>) =>
  user.roles.includes('admin') ? '/admin' : user.roles.includes('instructor') ? '/instructor' : '/dashboard';

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);
  const clear = useAuthStore((s) => s.clear);
  const navigate = useNavigate();

  const login = useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      queryClient.clear();
      setSession(data);
    },
  });
  const register = useMutation({
    mutationFn: authService.register,
    onSuccess: (data) => {
      queryClient.clear();
      setSession(data);
    },
  });
  const logout = async () => {
    try {
      await authService.logout(useAuthStore.getState().refreshToken);
    } catch {
      /* ignore — we clear locally regardless */
    }
    clear({ signedOut: true }); // protected pages now send the user home, not to Sign in
    queryClient.clear();
    navigate('/catalog', { replace: true }); // public home page
  };
  const hasRole = (...roles: Role[]) => !!user && roles.some((r) => user.roles.includes(r));

  return { user, login, register, logout, hasRole, isAuthenticated: !!user };
}
