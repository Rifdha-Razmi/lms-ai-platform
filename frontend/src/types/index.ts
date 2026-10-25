// Domain types — mirror the PRD §7 schema and §8 API payloads.
// Field names stay snake_case so they map 1:1 to the REST contract.

export type UUID = string;
export type Role = 'student' | 'instructor' | 'admin';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type CourseStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'archived';
export type ExplanationMode = Difficulty;

export interface User {
  id: UUID;
  full_name: string;
  email: string;
  avatar_url?: string | null;
  is_active: boolean;
  role: Role;
  roles: Role[];
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface Lecture {
  id: UUID;
  module_id: UUID;
  title: string;
  video_url: string | null;
  transcript?: string | null;
  duration_seconds: number;
  order_index: number;
  resource_urls: string[];
}

export interface Module {
  id: UUID;
  course_id: UUID;
  title: string;
  order_index: number;
  lectures: Lecture[];
}

export interface Course {
  id: UUID;
  instructor_id: UUID;
  instructor_name: string;
  title: string;
  description: string;
  category: string;
  difficulty: Difficulty;
  thumbnail_url: string | null;
  price: number;
  status: CourseStatus;
  rating: number;
  rating_count: number;
  enrollment_count: number;
  lecture_count: number;
  total_duration_seconds: number;
  created_at: string;
}

export interface CourseDetail extends Course {
  modules: Module[];
  is_enrolled?: boolean;
}

export interface Paginated<T> {
  data: T[];
  page: number;
  page_size: number;
  total: number;
}

export interface CourseQuery {
  q?: string;
  category?: string;
  difficulty?: Difficulty | '';
  min_rating?: number;
  page?: number;
  sort?: 'popular' | 'rating' | 'newest';
}

export interface Enrollment {
  id: UUID;
  user_id: UUID;
  course_id: UUID;
  enrolled_at: string;
  progress_percent: number;
  course: Course;
  last_lecture_id?: UUID | null;
  completed_lecture_ids: UUID[];
}

export interface LectureProgress {
  lecture_id: UUID;
  watched_seconds: number;
  completed: boolean;
  last_watched_at: string | null;
}

export interface Note {
  id: UUID;
  lecture_id: UUID;
  timestamp_seconds: number;
  content: string;
  created_at: string;
}

export interface Bookmark {
  id: UUID;
  lecture_id: UUID;
  timestamp_seconds: number;
  label?: string;
  created_at: string;
}

export interface RubricItem {
  criterion: string;
  points: number;
}

export interface Assignment {
  id: UUID;
  course_id: UUID;
  course_title?: string;
  title: string;
  instructions: string;
  rubric: RubricItem[];
  due_date: string;
  my_submission?: Submission | null;
  submission_count?: number;
}

export interface Submission {
  id: UUID;
  assignment_id: UUID;
  user_id: UUID;
  student_name?: string;
  file_name: string;
  file_url: string;
  submitted_at: string;
  grade: number | null;
  feedback: string | null;
}

export type QuestionType = 'mcq' | 'multi_select' | 'short_answer';

export interface QuizOption {
  id: UUID;
  option_text: string;
  is_correct?: boolean; // only visible to instructors / after grading
}

export interface QuizQuestion {
  id: UUID;
  question_text: string;
  question_type: QuestionType;
  order_index: number;
  options: QuizOption[];
  accepted_answers?: string[]; // short-answer keys (instructor only)
  topic?: string;
}

export interface Quiz {
  id: UUID;
  module_id: UUID;
  course_id: UUID;
  course_title?: string;
  module_title?: string;
  title: string;
  is_ai_generated: boolean;
  generated_from_lecture_id?: UUID | null;
  status: 'draft' | 'published';
  questions: QuizQuestion[];
  best_score?: number | null;
}

export interface QuizAnswerInput {
  question_id: UUID;
  selected_option_ids?: UUID[];
  text_answer?: string;
}

export interface QuizAttempt {
  id: UUID;
  quiz_id: UUID;
  score: number | null;
  started_at: string;
  submitted_at: string | null;
}

export interface QuizResult extends QuizAttempt {
  answers: (QuizAnswerInput & { is_correct: boolean; correct_option_ids: UUID[] })[];
  quiz: Quiz;
  badges_earned: Badge[];
}

export interface Certificate {
  id: UUID;
  course_id: UUID;
  course_title: string;
  instructor_name: string;
  user_name: string;
  certificate_url: string;
  issued_at: string;
}

export interface Badge {
  id: number;
  name: string;
  description: string;
  icon: string;
  earned_at?: string | null;
}

export interface Streak {
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  activity: { date: string; active: boolean }[];
}

export interface LeaderboardEntry {
  rank: number;
  user_id: UUID;
  full_name: string;
  score: number;
  quizzes_taken: number;
  is_me?: boolean;
}

export interface Recommendation {
  id: UUID;
  course: Course;
  reason: string;
  score: number;
}

// ---- AI tutor ----
export interface ChatSource {
  lecture_id: UUID;
  lecture_title: string;
  timestamp_seconds: number;
  snippet?: string;
}

export interface ChatMessage {
  id: UUID;
  session_id: UUID;
  sender: 'user' | 'ai';
  content: string;
  sources: ChatSource[];
  created_at: string;
}

export interface ChatSession {
  id: UUID;
  course_id: UUID;
  course_title: string;
  mode: ExplanationMode;
  created_at: string;
  messages: ChatMessage[];
  /** List view only: the first question asked, used as the chat's name. */
  title?: string | null;
  last_message_at?: string | null;
}

export interface ChatReply {
  reply: string;
  sources: ChatSource[];
  mode: ExplanationMode;
  message: ChatMessage;
  user_message: ChatMessage;
}

export interface LectureSummary {
  lecture_id: UUID;
  key_points: string[];
  generated_at: string;
}

export interface Flashcard {
  id: UUID;
  module_id: UUID;
  question: string;
  answer: string;
}

export interface StudyPlanItem {
  day: number;
  focus_topic: string;
  tasks: string[];
  lecture_ids: UUID[];
  minutes: number;
}

export interface StudyPlan {
  id: UUID;
  course_id: UUID;
  generated_at: string;
  weak_topics: { topic: string; mastery: number }[];
  plan: StudyPlanItem[];
}

export interface TopicMastery {
  topic: string;
  mastery: number; // 0..100
}

// ---- Community ----
export interface DiscussionThread {
  id: UUID;
  course_id: UUID;
  title: string;
  created_by: UUID;
  author_name: string;
  author_role: Role;
  created_at: string;
  post_count: number;
  last_activity_at: string;
}

export interface DiscussionPost {
  id: UUID;
  thread_id: UUID;
  parent_id: UUID | null;
  user_id: UUID;
  author_name: string;
  author_role: Role;
  content: string;
  is_flagged: boolean;
  flag_reason?: string | null;
  created_at: string;
}

export interface Announcement {
  id: UUID;
  course_id: UUID;
  course_title?: string;
  posted_by: UUID;
  author_name: string;
  content: string;
  created_at: string;
}

export interface Notification {
  id: UUID;
  title: string;
  body: string;
  link?: string | null;
  is_read: boolean;
  created_at: string;
}

// ---- Instructor analytics ----
export interface InstructorOverview {
  total_students: number;
  active_courses: number;
  avg_quiz_score: number;
  pending_submissions: number;
  courses: (Course & { avg_progress: number; avg_quiz_score: number })[];
}

export interface CourseAnalytics {
  course_id: UUID;
  lecture_dropoff: { lecture_id: UUID; title: string; started: number; completed: number }[];
  quiz_scores: { quiz_title: string; avg_score: number; attempts: number }[];
  time_on_task: { week: string; minutes: number }[];
  weak_topics: TopicMastery[];
}

// ---- Admin ----
export interface AdminOverview {
  dau: number;
  total_users: number;
  total_enrollments: number;
  completion_rate: number;
  revenue: number;
  pending_courses: number;
  flagged_posts: number;
  dau_series: { date: string; dau: number }[];
  enrollment_series: { month: string; enrollments: number; completions: number }[];
  revenue_series: { month: string; revenue: number }[];
  category_split: { category: string; courses: number }[];
}

export interface AuditLog {
  id: UUID;
  actor_name: string;
  action: string;
  entity: string;
  entity_id: UUID;
  created_at: string;
}

export interface ApiErrorBody {
  error: { code: string; message: string; field?: string };
}
