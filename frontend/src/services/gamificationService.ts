import { api } from './apiClient';
import type { Badge, Certificate, LeaderboardEntry, Recommendation, Streak } from '@/types';

export const gamificationService = {
  recommendations: () => api.get<Recommendation[]>('/recommendations/me').then((r) => r.data),
  badges: () => api.get<Badge[]>('/users/me/badges').then((r) => r.data),
  streak: () => api.get<Streak>('/users/me/streak').then((r) => r.data),
  leaderboard: (courseId: string) =>
    api.get<LeaderboardEntry[]>(`/leaderboard/${courseId}`).then((r) => r.data),
  certificates: () => api.get<Certificate[]>('/certificates/me').then((r) => r.data),
  downloadCertificate: (id: string) =>
    api.get<Blob>(`/certificates/${id}/download`, { responseType: 'blob' }).then((r) => r.data),
};
