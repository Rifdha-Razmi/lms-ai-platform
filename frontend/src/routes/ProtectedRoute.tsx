import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { safeNextPath } from '@/utils/safeUrl';
import type { Role } from '@/types';
import { ForbiddenPage } from '@/pages/common/StatusPages';

/** Route guard: requires a session, and optionally one of the given roles (PRD §11). */
export function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const user = useAuthStore((s) => s.user);
  const signedOut = useAuthStore((s) => s.signedOut);
  const location = useLocation();
  if (!user)
    return (
      <Navigate
        to={signedOut ? '/catalog' : `/login?next=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  if (roles && !roles.some((r) => user.roles.includes(r))) return <ForbiddenPage />;
  return <Outlet />;
}

export function GuestOnly() {
  const user = useAuthStore((s) => s.user);
  const [params] = useSearchParams();
  // Just signed in: honour ?next= (in-app paths only) so people return to where they were.
  if (user) return <Navigate to={safeNextPath(params.get('next')) ?? '/'} replace />;
  return <Outlet />;
}
