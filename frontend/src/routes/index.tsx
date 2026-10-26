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
        { path: '/catalog', element: page(() => import('@/pages/course-catalog/CatalogPage')) },
        {
          path: '/courses/:courseId',
          element: page(() => import('@/pages/course-catalog/CourseDetailPage')),
        },

        {
          element: <ProtectedRoute />,
          children: [
            { path: '/settings', element: page(() => import('@/pages/common/SettingsPage')) },
            { path: '/courses/:courseId/forum', element: page(() => import('@/pages/student/ForumPage')) },
            {
              path: '/courses/:courseId/forum/:threadId',
              element: page(() => import('@/pages/student/ThreadPage')),
            },
          ],
        },
        {
          element: <ProtectedRoute roles={['student']} />,
          children: [
            { path: '/dashboard', element: page(() => import('@/pages/dashboard/StudentDashboard')) },
            { path: '/my-learning', element: page(() => import('@/pages/student/MyLearningPage')) },
            {
              path: '/learn/:courseId/:lectureId?',
              element: page(() => import('@/pages/course-player/CoursePlayerPage')),
            },
            { path: '/quizzes', element: page(() => import('@/pages/quizzes/QuizzesPage')) },
            { path: '/quizzes/:quizId', element: page(() => import('@/pages/quizzes/QuizAttemptPage')) },
            { path: '/assignments', element: page(() => import('@/pages/student/AssignmentsPage')) },
            { path: '/tutor/:sessionId?', element: page(() => import('@/pages/student/TutorPage')) },
            { path: '/study-plan', element: page(() => import('@/pages/student/StudyPlanPage')) },
            { path: '/achievements', element: page(() => import('@/pages/student/AchievementsPage')) },
            { path: '/certificates', element: page(() => import('@/pages/student/CertificatesPage')) },
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
