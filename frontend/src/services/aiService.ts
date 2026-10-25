import { api } from './apiClient';
import type {
  ChatReply,
  ChatSession,
  ExplanationMode,
  Flashcard,
  LectureSummary,
  Quiz,
  StudyPlan,
  TopicMastery,
} from '@/types';

/** AI Tutor service (FastAPI, PRD §8.5) — routed through the same gateway. */
export const aiService = {
  sessions: () => api.get<ChatSession[]>('/ai/chat/sessions').then((r) => r.data),
  /** Opens the course's latest chat, or a fresh one when `fresh` is set ("New chat"). */
  startSession: (course_id: string, opts: { mode?: ExplanationMode; fresh?: boolean } = {}) =>
    api
      .post<ChatSession>('/ai/chat/sessions', {
        course_id,
        mode: opts.mode, // omitted → server picks from topic mastery (FR-A8)
        new: opts.fresh ?? false,
      })
      .then((r) => r.data),
  getSession: (id: string) => api.get<ChatSession>(`/ai/chat/sessions/${id}`).then((r) => r.data),
  /** Extension beyond PRD §8.5 — needs DELETE /ai/chat/sessions/:id on the backend. */
  deleteSession: (id: string) => api.delete(`/ai/chat/sessions/${id}`),
  send: (sessionId: string, message: string, lecture_id?: string) =>
    api
      .post<ChatReply>(`/ai/chat/sessions/${sessionId}/messages`, { message, lecture_id })
      .then((r) => r.data),
  setMode: (sessionId: string, mode: ExplanationMode) =>
    api.put<ChatSession>(`/ai/chat/sessions/${sessionId}/mode`, { mode }).then((r) => r.data),
  summarize: (lectureId: string) =>
    api.post<LectureSummary>(`/ai/lectures/${lectureId}/summarize`).then((r) => r.data),
  generateQuiz: (lectureId: string, count = 5) =>
    api.post<Quiz>(`/ai/lectures/${lectureId}/generate-quiz`, { count }).then((r) => r.data),
  flashcards: (moduleId: string) =>
    api.post<Flashcard[]>(`/ai/modules/${moduleId}/flashcards`).then((r) => r.data),
  studyPlan: (course_id: string) => api.post<StudyPlan>('/ai/study-plan', { course_id }).then((r) => r.data),
  mastery: (courseId: string) => api.get<TopicMastery[]>(`/ai/mastery/${courseId}`).then((r) => r.data),
};
