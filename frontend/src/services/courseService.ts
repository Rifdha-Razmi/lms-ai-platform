import { api } from './apiClient';
import type { Course, CourseDetail, CourseQuery, Lecture, Module, Paginated } from '@/types';

export interface CourseInput {
  title: string;
  description: string;
  category: string;
  difficulty: Course['difficulty'];
  price: number;
  thumbnail_url?: string | null;
}

export const courseService = {
  list: (params: CourseQuery) => api.get<Paginated<Course>>('/courses', { params }).then((r) => r.data),
  categories: () => api.get<string[]>('/courses/categories').then((r) => r.data),
  get: (id: string) => api.get<CourseDetail>(`/courses/${id}`).then((r) => r.data),
  create: (body: CourseInput) => api.post<Course>('/courses', body).then((r) => r.data),
  update: (id: string, body: Partial<CourseInput>) =>
    api.put<Course>(`/courses/${id}`, body).then((r) => r.data),
  submitForReview: (id: string) => api.post<Course>(`/courses/${id}/submit`).then((r) => r.data),
  addModule: (courseId: string, body: { title: string }) =>
    api.post<Module>(`/courses/${courseId}/modules`, body).then((r) => r.data),
  /** Multipart upload — video/PDF/slides (FR-I2). */
  addLecture: (moduleId: string, form: FormData, onProgress?: (pct: number) => void) =>
    api
      .post<Lecture>(`/modules/${moduleId}/lectures`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => e.total && onProgress?.(Math.round((e.loaded / e.total) * 100)),
      })
      .then((r) => r.data),
  mine: () => api.get<Course[]>('/instructor/courses').then((r) => r.data),
};
