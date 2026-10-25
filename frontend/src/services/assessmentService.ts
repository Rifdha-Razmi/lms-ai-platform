import { api } from './apiClient';
import type {
  Assignment,
  Quiz,
  QuizAnswerInput,
  QuizAttempt,
  QuizQuestion,
  QuizResult,
  RubricItem,
  Submission,
} from '@/types';

export interface AssignmentInput {
  course_id: string;
  title: string;
  instructions: string;
  rubric: RubricItem[];
  due_date: string;
}

export interface QuizInput {
  module_id: string;
  title: string;
  questions: (Omit<QuizQuestion, 'id' | 'options'> & {
    options: { option_text: string; is_correct: boolean }[];
  })[];
}

export const assessmentService = {
  // Assignments (§8.4)
  myAssignments: () => api.get<Assignment[]>('/assignments/me').then((r) => r.data),
  courseAssignments: (courseId: string) =>
    api.get<Assignment[]>(`/courses/${courseId}/assignments`).then((r) => r.data),
  createAssignment: (body: AssignmentInput) => api.post<Assignment>('/assignments', body).then((r) => r.data),
  submit: (assignmentId: string, file: File, onProgress?: (p: number) => void) => {
    const form = new FormData();
    form.append('file', file);
    return api
      .post<Submission>(`/assignments/${assignmentId}/submit`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => e.total && onProgress?.(Math.round((e.loaded / e.total) * 100)),
      })
      .then((r) => r.data);
  },
  submissions: (assignmentId: string) =>
    api.get<Submission[]>(`/assignments/${assignmentId}/submissions`).then((r) => r.data),
  grade: (submissionId: string, body: { grade: number; feedback: string }) =>
    api.put<Submission>(`/submissions/${submissionId}/grade`, body).then((r) => r.data),

  // Quizzes (§8.4)
  myQuizzes: () => api.get<Quiz[]>('/quizzes/me').then((r) => r.data),
  courseQuizzes: (courseId: string) => api.get<Quiz[]>(`/courses/${courseId}/quizzes`).then((r) => r.data),
  getQuiz: (id: string) => api.get<Quiz>(`/quizzes/${id}`).then((r) => r.data),
  createQuiz: (body: QuizInput) => api.post<Quiz>('/quizzes', body).then((r) => r.data),
  updateQuiz: (id: string, body: Partial<Pick<Quiz, 'title' | 'questions' | 'status'>>) =>
    api.put<Quiz>(`/quizzes/${id}`, body).then((r) => r.data),
  publishQuiz: (id: string) => api.post<Quiz>(`/quizzes/${id}/publish`).then((r) => r.data),
  startAttempt: (quizId: string) => api.post<QuizAttempt>(`/quizzes/${quizId}/attempt`).then((r) => r.data),
  submitAttempt: (attemptId: string, answers: QuizAnswerInput[]) =>
    api.post<QuizResult>(`/attempts/${attemptId}/submit`, { answers }).then((r) => r.data),
};
