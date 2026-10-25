import { api } from './apiClient';
import type { CourseAnalytics, InstructorOverview } from '@/types';

export const instructorService = {
  overview: () => api.get<InstructorOverview>('/instructor/overview').then((r) => r.data),
  analytics: (courseId: string) =>
    api.get<CourseAnalytics>(`/instructor/courses/${courseId}/analytics`).then((r) => r.data),
};
