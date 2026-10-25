import { QueryClient } from '@tanstack/react-query';
import axios from 'axios';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (count, err) => {
        const status = axios.isAxiosError(err) ? err.response?.status : undefined;
        if (status && status >= 400 && status < 500) return false;
        return count < 2;
      },
    },
  },
});

/** Centralised query keys — keeps cache invalidation consistent across pages. */
export const qk = {
  catalog: (params: object) => ['courses', 'list', params] as const,
  categories: ['courses', 'categories'] as const,
  course: (id: string) => ['courses', 'detail', id] as const,
  enrollments: ['enrollments', 'me'] as const,
  lectureProgress: (id: string) => ['lectures', id, 'progress'] as const,
  notes: (lectureId: string) => ['lectures', lectureId, 'notes'] as const,
  bookmarks: (lectureId: string) => ['lectures', lectureId, 'bookmarks'] as const,
  myAssignments: ['assignments', 'me'] as const,
  courseAssignments: (id: string) => ['assignments', 'course', id] as const,
  submissions: (id: string) => ['assignments', id, 'submissions'] as const,
  myQuizzes: ['quizzes', 'me'] as const,
  courseQuizzes: (id: string) => ['quizzes', 'course', id] as const,
  quiz: (id: string) => ['quizzes', 'detail', id] as const,
  chatSessions: ['ai', 'sessions'] as const,
  chatSession: (id: string) => ['ai', 'sessions', id] as const,
  mastery: (courseId: string) => ['ai', 'mastery', courseId] as const,
  recommendations: ['recommendations'] as const,
  badges: ['badges'] as const,
  streak: ['streak'] as const,
  leaderboard: (id: string) => ['leaderboard', id] as const,
  certificates: ['certificates'] as const,
  threads: (courseId: string) => ['forum', courseId] as const,
  thread: (id: string) => ['forum', 'thread', id] as const,
  announcements: (courseId?: string) => ['announcements', courseId ?? 'all'] as const,
  notifications: ['notifications'] as const,
  instructorCourses: ['instructor', 'courses'] as const,
  instructorOverview: ['instructor', 'overview'] as const,
  courseAnalytics: (id: string) => ['instructor', 'analytics', id] as const,
  adminUsers: (params: object) => ['admin', 'users', params] as const,
  adminPending: ['admin', 'pending'] as const,
  adminCourses: ['admin', 'courses'] as const,
  adminOverview: ['admin', 'overview'] as const,
  flagged: ['admin', 'flagged'] as const,
  audit: ['admin', 'audit'] as const,
  me: ['me'] as const,
};
