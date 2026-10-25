import { api } from './apiClient';
import type { Bookmark, Enrollment, LectureProgress, Note } from '@/types';

export const learningService = {
  /** Lecture materials served by the API (S3 links in production) — fetched with auth. */
  resource: (url: string) =>
    api.get<Blob>(url.replace(/^\/api\/v1/, ''), { responseType: 'blob' }).then((r) => r.data),
  enroll: (courseId: string) => api.post<Enrollment>(`/courses/${courseId}/enroll`).then((r) => r.data),
  myEnrollments: () => api.get<Enrollment[]>('/enrollments/me').then((r) => r.data),
  lectureProgress: (lectureId: string) =>
    api.get<LectureProgress>(`/lectures/${lectureId}/progress`).then((r) => r.data),
  updateProgress: (lectureId: string, body: { watched_seconds: number; completed?: boolean }) =>
    api
      .post<LectureProgress & { progress_percent: number }>(`/lectures/${lectureId}/progress`, body)
      .then((r) => r.data),
  notes: (lectureId: string) => api.get<Note[]>(`/lectures/${lectureId}/notes`).then((r) => r.data),
  addNote: (lectureId: string, body: { timestamp_seconds: number; content: string }) =>
    api.post<Note>(`/lectures/${lectureId}/notes`, body).then((r) => r.data),
  deleteNote: (id: string) => api.delete(`/notes/${id}`),
  bookmarks: (lectureId: string) =>
    api.get<Bookmark[]>(`/lectures/${lectureId}/bookmarks`).then((r) => r.data),
  addBookmark: (lectureId: string, body: { timestamp_seconds: number; label?: string }) =>
    api.post<Bookmark>(`/lectures/${lectureId}/bookmarks`, body).then((r) => r.data),
  deleteBookmark: (id: string) => api.delete(`/bookmarks/${id}`),
};
