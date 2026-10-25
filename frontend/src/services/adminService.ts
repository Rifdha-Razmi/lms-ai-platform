import { api } from './apiClient';
import type { AdminOverview, AuditLog, Course, DiscussionPost, Paginated, Role, User } from '@/types';

export const adminService = {
  users: (params: { q?: string; role?: Role | ''; status?: 'active' | 'suspended' | ''; page?: number }) =>
    api.get<Paginated<User>>('/admin/users', { params }).then((r) => r.data),
  setRoles: (id: string, roles: Role[]) =>
    api.put<User>(`/admin/users/${id}/role`, { roles }).then((r) => r.data),
  setSuspended: (id: string, suspended: boolean) =>
    api.put<User>(`/admin/users/${id}/suspend`, { suspended }).then((r) => r.data),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  pendingCourses: () => api.get<Course[]>('/admin/courses/pending').then((r) => r.data),
  allCourses: () => api.get<Course[]>('/admin/courses').then((r) => r.data),
  reviewCourse: (id: string, body: { decision: 'approved' | 'rejected'; comment?: string }) =>
    api.post<Course>(`/courses/${id}/approve`, body).then((r) => r.data),
  overview: () => api.get<AdminOverview>('/admin/analytics/overview').then((r) => r.data),
  flaggedPosts: () =>
    api
      .get<
        (DiscussionPost & {
          course_id: string;
          course_title: string;
          thread_title: string;
          flag_reason?: string | null;
        })[]
      >('/admin/moderation/flagged-posts')
      .then((r) => r.data),
  moderate: (postId: string, action: 'dismiss' | 'remove') =>
    api.post(`/admin/moderation/posts/${postId}`, { action }),
  auditLogs: () => api.get<AuditLog[]>('/admin/audit-logs').then((r) => r.data),
};
