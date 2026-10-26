import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { PageLoader } from '@/components/common/feedback';
import { useAuthStore } from '@/store/authStore';
import { homeFor } from '@/hooks/useAuth';
import { GuestOnly, ProtectedRoute } from './ProtectedRoute';
import { NotFoundPage, RouteErrorPage } from '@/pages/common/StatusPages';

const page = (loader: () => Promise<{ default: React.ComponentType }>) => {
  const C = lazy(loader);
  return (
    <Suspense fallback={<PageLoader />}>
      <C />
    </Suspense>
  );
};

/** "/" — signed-in users land on their role's home; visitors get the public home (catalog). */
function Home(): ReactNode {
  const user = useAuthStore((s) => s.user);
  return <Navigate to={user ? homeFor(user) : '/catalog'} replace />;
}

export const router = createBrowserRouter(
  [
    {
      element: <AuthLayout />,
      errorElement: <RouteErrorPage />,
      children: [
        {
          element: <GuestOnly />,
          children: [
            { path: '/login', element: page(() => import('@/pages/auth/LoginPage')) },
            { path: '/register', element: page(() => import('@/pages/auth/RegisterPage')) },
          ],
        },
      ],
    },
    {
      element: <AppLayout />,
      errorElement: <RouteErrorPage />,
      children: [
        { path: '/', element: <Home /> },
        // Public catalog (PRD §8.2 — public endpoints)

        {
          element: <ProtectedRoute />,
          children: [
            { path: '/settings', element: page(() => import('@/pages/common/SettingsPage')) },
          ],
        },
        {
          element: <ProtectedRoute roles={['student']} />,
          children: [
          ],
        },
        {
          path: '/instructor',
          element: <ProtectedRoute roles={['instructor', 'admin']} />,
          children: [
          ],
        },
        {
          path: '/admin',
          element: <ProtectedRoute roles={['admin']} />,
          children: [
          ],
        },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ],
  {
    future: {
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_skipActionErrorRevalidation: true,
    },
  },
);
