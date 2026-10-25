import { api } from './apiClient';
import type { Announcement, DiscussionPost, DiscussionThread, Notification } from '@/types';

export const communityService = {
  threads: (courseId: string) =>
    api.get<DiscussionThread[]>(`/courses/${courseId}/threads`).then((r) => r.data),
  createThread: (courseId: string, body: { title: string; content: string }) =>
    api.post<DiscussionThread>(`/courses/${courseId}/threads`, body).then((r) => r.data),
  thread: (threadId: string) =>
    api
      .get<{ thread: DiscussionThread; posts: DiscussionPost[] }>(`/threads/${threadId}`)
      .then((r) => r.data),
  reply: (threadId: string, body: { content: string; parent_id?: string | null }) =>
    api.post<DiscussionPost>(`/threads/${threadId}/posts`, body).then((r) => r.data),
  report: (postId: string, reason: string) => api.post(`/posts/${postId}/report`, { reason }),

  announcements: (courseId?: string) =>
    api.get<Announcement[]>('/announcements', { params: { course_id: courseId } }).then((r) => r.data),
  postAnnouncement: (courseId: string, content: string) =>
    api.post<Announcement>(`/courses/${courseId}/announcements`, { content }).then((r) => r.data),

  notifications: () => api.get<Notification[]>('/notifications').then((r) => r.data),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};
