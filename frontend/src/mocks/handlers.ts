// MSW request handlers implementing the PRD §8 REST contract against the
// in-browser mock DB. Swap to the real backend by setting VITE_USE_MOCKS=false.

import { delay, http, HttpResponse, type DefaultBodyType, type PathParams, type StrictRequest } from 'msw';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { env } from '@/utils/env';
import type { Difficulty, Role } from '@/types';
import {
  audit,
  getDb,
  isoDate,
  notify,
  nowIso,
  persist,
  uid,
  type CourseRow,
  type QuizRow,
  type UserRow,
} from './db';
import {
  asksAboutThisLecture,
  chunksForCourse,
  composeAnswer,
  flashcardsFor,
  generateQuizQuestions,
  lectureOpening,
  retrieve,
  sleep,
  summarize,
} from './ai';
import { CATEGORIES } from './seedContent';

const BASE = env.apiBaseUrl.startsWith('http') ? env.apiBaseUrl : `*${env.apiBaseUrl}`;
const p = (path: string) => `${BASE}${path}`;
const ACCESS_TTL_MS = 15 * 60 * 1000;

// ---------- response helpers ----------
type Req = StrictRequest<DefaultBodyType>;

const error = (status: number, code: string, message: string, field?: string) =>
  HttpResponse.json({ error: { code, message, ...(field ? { field } : {}) } }, { status });

class HttpError extends Error {
  constructor(public res: Response) {
    super('http');
  }
}
const fail = (status: number, code: string, message: string, field?: string): never => {
  throw new HttpError(error(status, code, message, field));
};

/** Wraps a handler: simulated latency + uniform error handling + persistence. */
function route<P extends Record<string, string> = Record<string, string>>(
  fn: (ctx: { request: Req; params: P; url: URL }) => Promise<Response | object> | Response | object,
  opts: { latency?: number } = {},
) {
  return async ({ request, params }: { request: Req; params: PathParams }) => {
    await delay(opts.latency ?? 180 + Math.random() * 220);
    try {
      const out = await fn({ request, params: params as P, url: new URL(request.url) });
      persist();
      return out instanceof Response ? out : HttpResponse.json(out as never);
    } catch (e) {
      if (e instanceof HttpError) return e.res;
      console.error('[mock api]', e);
      return error(500, 'INTERNAL', 'Unexpected server error');
    }
  };
}

const body = async <T>(request: Req): Promise<T> => {
  try {
    return (await request.json()) as T;
  } catch {
    return {} as T;
  }
};

// ---------- auth ----------
const makeAccess = (userId: string) => `mock-access.${userId}.${Date.now() + ACCESS_TTL_MS}`;
const makeRefresh = (userId: string) => `mock-refresh.${userId}.${uid()}`;

function authUser(request: Req): UserRow {
  const header = request.headers.get('Authorization') ?? '';
  const token = header.replace(/^Bearer\s+/, '');
  const [kind, userId, exp] = token.split('.');
  if (kind !== 'mock-access' || !userId) fail(401, 'UNAUTHORIZED', 'Sign in to continue.');
  if (Number(exp) < Date.now()) fail(401, 'TOKEN_EXPIRED', 'Your session expired.');
  const user = getDb().users.find((u) => u.id === userId);
  if (!user) fail(401, 'UNAUTHORIZED', 'Sign in to continue.');
  if (!user!.is_active) fail(403, 'ACCOUNT_SUSPENDED', 'This account is suspended. Contact support.');
  return user!;
}
const optionalUser = (request: Req) => {
  try {
    return request.headers.get('Authorization') ? authUser(request) : null;
  } catch {
    return null;
  }
};
function requireRole(user: UserRow, ...roles: Role[]) {
  if (!roles.some((r) => user.roles.includes(r)))
    fail(403, 'FORBIDDEN', 'You don’t have permission to do that.');
}
const primaryRole = (u: UserRow): Role =>
  u.roles.includes('admin') ? 'admin' : u.roles.includes('instructor') ? 'instructor' : 'student';
const userOut = (u: UserRow) => ({
  id: u.id,
  full_name: u.full_name,
  email: u.email,
  avatar_url: u.avatar_url,
  is_active: u.is_active,
  role: primaryRole(u),
  roles: u.roles,
  created_at: u.created_at,
});

// rate limiting (PRD §8.9)
const hits = new Map<string, number[]>();
function rateLimit(key: string, limit: number) {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < 60_000);
  if (arr.length >= limit) fail(429, 'RATE_LIMITED', 'Too many requests. Wait a minute and try again.');
  arr.push(now);
  hits.set(key, arr);
}

// ---------- serializers ----------
const db = () => getDb();
const userName = (id: string) => db().users.find((u) => u.id === id)?.full_name ?? 'Unknown';
const modulesOf = (courseId: string) =>
  db()
    .modules.filter((m) => m.course_id === courseId)
    .sort((a, b) => a.order_index - b.order_index);
const lecturesOfModule = (moduleId: string) =>
  db()
    .lectures.filter((l) => l.module_id === moduleId)
    .sort((a, b) => a.order_index - b.order_index);
const lecturesOf = (courseId: string) => modulesOf(courseId).flatMap((m) => lecturesOfModule(m.id));
const courseOfLecture = (lectureId: string) => {
  const l = db().lectures.find((x) => x.id === lectureId);
  const m = l && db().modules.find((x) => x.id === l.module_id);
  return m ? db().courses.find((c) => c.id === m.course_id) : undefined;
};
const getCourse = (id: string) =>
  db().courses.find((c) => c.id === id) ?? fail(404, 'NOT_FOUND', 'Course not found.');

function courseOut(c: CourseRow) {
  const lectures = lecturesOf(c.id);
  return {
    id: c.id,
    instructor_id: c.instructor_id,
    instructor_name: userName(c.instructor_id),
    title: c.title,
    description: c.description,
    category: c.category,
    difficulty: c.difficulty,
    thumbnail_url: c.thumbnail_url,
    price: c.price,
    status: c.status,
    rating: c.rating,
    rating_count: c.rating_count,
    enrollment_count: c.base_enrollments + db().enrollments.filter((e) => e.course_id === c.id).length,
    lecture_count: lectures.length,
    total_duration_seconds: lectures.reduce((s, l) => s + l.duration_seconds, 0),
    created_at: c.created_at,
  };
}

function courseDetailOut(c: CourseRow, viewer: UserRow | null) {
  const canSeeTranscript = !!viewer && (viewer.id === c.instructor_id || viewer.roles.includes('admin'));
  return {
    ...courseOut(c),
    is_enrolled: !!viewer && db().enrollments.some((e) => e.user_id === viewer.id && e.course_id === c.id),
    modules: modulesOf(c.id).map((m) => ({
      ...m,
      lectures: lecturesOfModule(m.id).map((l) => ({
        ...l,
        transcript: canSeeTranscript ? l.transcript : null,
      })),
    })),
  };
}

function progressPercent(userId: string, courseId: string) {
  const ls = lecturesOf(courseId);
  if (!ls.length) return 0;
  const done = ls.filter((l) =>
    db().progress.some((pr) => pr.user_id === userId && pr.lecture_id === l.id && pr.completed),
  ).length;
  return Math.round((done / ls.length) * 10000) / 100;
}

function enrollmentOut(e: { id: string; user_id: string; course_id: string; enrolled_at: string }) {
  const ls = lecturesOf(e.course_id);
  const mine = db().progress.filter(
    (pr) => pr.user_id === e.user_id && ls.some((l) => l.id === pr.lecture_id),
  );
  const last = [...mine].sort((a, b) => (b.last_watched_at ?? '').localeCompare(a.last_watched_at ?? ''))[0];
  const firstIncomplete = ls.find((l) => !mine.some((m) => m.lecture_id === l.id && m.completed));
  return {
    ...e,
    progress_percent: progressPercent(e.user_id, e.course_id),
    course: courseOut(getCourse(e.course_id)),
    last_lecture_id:
      (last && !last.completed ? last.lecture_id : firstIncomplete?.id) ??
      last?.lecture_id ??
      ls[0]?.id ??
      null,
    completed_lecture_ids: mine.filter((m) => m.completed).map((m) => m.lecture_id),
  };
}

function quizOut(q: QuizRow, reveal: boolean, userId?: string) {
  const m = db().modules.find((x) => x.id === q.module_id)!;
  const c = db().courses.find((x) => x.id === m.course_id)!;
  const scores = userId
    ? db()
        .attempts.filter((a) => a.quiz_id === q.id && a.user_id === userId && a.score != null)
        .map((a) => a.score!)
    : [];
  return {
    id: q.id,
    module_id: q.module_id,
    course_id: c.id,
    course_title: c.title,
    module_title: m.title,
    title: q.title,
    is_ai_generated: q.is_ai_generated,
    generated_from_lecture_id: q.generated_from_lecture_id,
    status: q.status,
    best_score: scores.length ? Math.max(...scores) : null,
    questions: q.questions.map((qq) => ({
      id: qq.id,
      question_text: qq.question_text,
      question_type: qq.question_type,
      order_index: qq.order_index,
      topic: qq.topic,
      options: qq.options.map((o) => (reveal ? o : { id: o.id, option_text: o.option_text })),
      ...(reveal ? { accepted_answers: qq.accepted_answers ?? [] } : {}),
    })),
  };
}

const ownsCourse = (user: UserRow, c: CourseRow) =>
  c.instructor_id === user.id || user.roles.includes('admin');
const enrolledIn = (userId: string, courseId: string) =>
  db().enrollments.some((e) => e.user_id === userId && e.course_id === courseId);
/** Course content (AI tools, forum, leaderboard) is for enrolled students, the course owner and admins. */
function requireCourseAccess(user: UserRow, courseId: string) {
  const c = getCourse(courseId);
  if (!ownsCourse(user, c) && !enrolledIn(user.id, c.id))
    fail(403, 'NOT_ENROLLED', 'Enroll in this course to use this.');
  return c;
}

// ---------- gamification side-effects ----------
function markActive(userId: string) {
  const today = isoDate(new Date());
  if (!db().activity.some((a) => a.user_id === userId && a.date === today))
    db().activity.push({ user_id: userId, date: today });
  if (streakOf(userId).current_streak >= 7) award(userId, 2);
}
function award(userId: string, badgeId: number) {
  if (db().user_badges.some((b) => b.user_id === userId && b.badge_id === badgeId)) return null;
  db().user_badges.push({ user_id: userId, badge_id: badgeId, earned_at: nowIso() });
  const badge = db().badges.find((b) => b.id === badgeId)!;
  notify(userId, `Badge earned: ${badge.name}`, badge.description, '/achievements');
  return { ...badge, earned_at: nowIso() };
}
function streakOf(userId: string) {
  const dates = new Set(
    db()
      .activity.filter((a) => a.user_id === userId)
      .map((a) => a.date),
  );
  const day = (offset: number) => isoDate(new Date(Date.now() - offset * 86400000));
  let current = 0;
  for (let i = dates.has(day(0)) ? 0 : 1; dates.has(day(i)); i++) current++;
  let longest = 0;
  let run = 0;
  for (let i = 120; i >= 0; i--) {
    run = dates.has(day(i)) ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  const sorted = [...dates].sort();
  return {
    current_streak: current,
    longest_streak: Math.max(longest, current),
    last_active_date: sorted[sorted.length - 1] ?? null,
    activity: Array.from({ length: 35 }, (_, i) => ({ date: day(34 - i), active: dates.has(day(34 - i)) })),
  };
}
function checkCompletion(userId: string, courseId: string) {
  if (progressPercent(userId, courseId) < 100) return;
  if (db().certificates.some((c) => c.user_id === userId && c.course_id === courseId)) return;
  db().certificates.push({ id: uid(), user_id: userId, course_id: courseId, issued_at: nowIso() });
  notify(
    userId,
    'Certificate ready',
    `You completed ${getCourse(courseId).title}. Download your certificate.`,
    '/certificates',
  );
  award(userId, 1);
}

/**
 * FR-A8: per-topic mastery feeds the tutor's starting depth. A student's first chat in a
 * course opens at Beginner when their average mastery is low, Advanced when it is high.
 */
function modeFromMastery(userId: string, courseId: string): Difficulty {
  const rows = db().mastery.filter((m) => m.user_id === userId && m.course_id === courseId);
  if (!rows.length) return 'intermediate';
  const avg = rows.reduce((s, r) => s + r.mastery, 0) / rows.length;
  return avg < 45 ? 'beginner' : avg >= 80 ? 'advanced' : 'intermediate';
}

// ---------- handlers ----------
export const handlers = [
  // ===== Auth (§8.1) =====
  http.post(
    p('/auth/register'),
    route(async ({ request }) => {
      rateLimit('auth', 10);
      // Public sign-up always creates a student (PRD §8.1). An admin grants other roles (FR-AD4).
      const b = await body<{ full_name?: string; email?: string; password?: string }>(request);
      if (!b.full_name || b.full_name.trim().length < 2)
        fail(400, 'VALIDATION_ERROR', 'Enter your full name.', 'full_name');
      if (!b.email || !/^\S+@\S+\.\S+$/.test(b.email))
        fail(400, 'VALIDATION_ERROR', 'email must be a valid email address', 'email');
      if (!b.password || b.password.length < 8)
        fail(400, 'VALIDATION_ERROR', 'Password must be at least 8 characters.', 'password');
      if (db().users.some((u) => u.email.toLowerCase() === b.email!.toLowerCase()))
        fail(409, 'EMAIL_TAKEN', 'An account with this email already exists. Sign in instead.', 'email');
      const user: UserRow = {
        id: uid(),
        full_name: b.full_name!.trim(),
        email: b.email!.toLowerCase(),
        password: b.password!,
        avatar_url: null,
        is_active: true,
        roles: ['student'],
        created_at: nowIso(),
      };
      db().users.push(user);
      notify(user.id, 'Welcome to LMS-AI', 'Browse the catalog and enroll in your first course.', '/catalog');
      const refresh = makeRefresh(user.id);
      db().refresh_tokens.push(refresh);
      audit(user.id, 'user.register', 'user', user.id);
      return HttpResponse.json(
        { access_token: makeAccess(user.id), refresh_token: refresh, user: userOut(user) },
        { status: 201 },
      );
    }),
  ),

  http.post(
    p('/auth/login'),
    route(async ({ request }) => {
      rateLimit('auth', 10);
      const b = await body<{ email?: string; password?: string }>(request);
      const user = db().users.find((u) => u.email.toLowerCase() === (b.email ?? '').toLowerCase());
      if (!user || user.password !== b.password)
        fail(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
      if (!user!.is_active) fail(403, 'ACCOUNT_SUSPENDED', 'This account is suspended. Contact support.');
      const refresh = makeRefresh(user!.id);
      db().refresh_tokens.push(refresh);
      if (user!.roles.includes('student')) markActive(user!.id);
      return { access_token: makeAccess(user!.id), refresh_token: refresh, user: userOut(user!) };
    }),
  ),

  http.post(
    p('/auth/refresh'),
    route(async ({ request }) => {
      const b = await body<{ refresh_token?: string }>(request);
      if (!b.refresh_token || !db().refresh_tokens.includes(b.refresh_token))
        fail(401, 'INVALID_REFRESH', 'Session ended. Sign in again.');
      return { access_token: makeAccess(b.refresh_token!.split('.')[1]) };
    }),
  ),

  http.post(
    p('/auth/logout'),
    route(async ({ request }) => {
      const b = await body<{ refresh_token?: string }>(request);
      db().refresh_tokens = db().refresh_tokens.filter((t) => t !== b.refresh_token);
      return new HttpResponse(null, { status: 204 });
    }),
  ),

  http.get(
    p('/auth/me'),
    route(({ request }) => userOut(authUser(request))),
  ),

  http.put(
    p('/users/me'),
    route(async ({ request }) => {
      const u = authUser(request);
      const b = await body<{ full_name?: string }>(request);
      if (b.full_name !== undefined) {
        if (b.full_name.trim().length < 2)
          fail(400, 'VALIDATION_ERROR', 'Enter your full name.', 'full_name');
        u.full_name = b.full_name.trim();
      }
      return userOut(u);
    }),
  ),

  // ===== Courses (§8.2) =====
  http.get(
    p('/courses/categories'),
    route(() => CATEGORIES),
  ),

  http.get(
    p('/courses'),
    route(({ url }) => {
      const q = (url.searchParams.get('q') ?? '').toLowerCase().trim();
      const category = url.searchParams.get('category') ?? '';
      const difficulty = url.searchParams.get('difficulty') ?? '';
      const minRating = Number(url.searchParams.get('min_rating') ?? 0);
      const sort = url.searchParams.get('sort') ?? 'popular';
      const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
      const pageSize = 9;
      let list = db()
        .courses.filter((c) => c.status === 'approved')
        .map(courseOut);
      if (q)
        list = list.filter((c) =>
          `${c.title} ${c.description} ${c.category} ${c.instructor_name}`.toLowerCase().includes(q),
        );
      if (category) list = list.filter((c) => c.category === category);
      if (difficulty) list = list.filter((c) => c.difficulty === difficulty);
      if (minRating) list = list.filter((c) => c.rating >= minRating);
      list.sort((a, b) =>
        sort === 'rating'
          ? b.rating - a.rating
          : sort === 'newest'
            ? b.created_at.localeCompare(a.created_at)
            : b.enrollment_count - a.enrollment_count,
      );
      return {
        data: list.slice((page - 1) * pageSize, page * pageSize),
        page,
        page_size: pageSize,
        total: list.length,
      };
    }),
  ),

  http.get(
    p('/courses/:id'),
    route<{ id: string }>(({ request, params }) => {
      const viewer = optionalUser(request);
      const c = getCourse(params.id);
      if (c.status !== 'approved' && !(viewer && ownsCourse(viewer, c)))
        fail(404, 'NOT_FOUND', 'Course not found.');
      return courseDetailOut(c, viewer);
    }),
  ),

  http.post(
    p('/courses'),
    route(async ({ request }) => {
      const u = authUser(request);
      requireRole(u, 'instructor', 'admin');
      const b = await body<Partial<CourseRow>>(request);
      if (!b.title || b.title.trim().length < 5)
        fail(400, 'VALIDATION_ERROR', 'Title must be at least 5 characters.', 'title');
      const c: CourseRow = {
        id: uid(),
        instructor_id: u.id,
        title: b.title!.trim(),
        description: b.description ?? '',
        category: b.category ?? 'Computer Science',
        difficulty: (b.difficulty as Difficulty) ?? 'beginner',
        thumbnail_url: b.thumbnail_url ?? null,
        price: Number(b.price ?? 0),
        status: 'draft',
        rating: 0,
        rating_count: 0,
        base_enrollments: 0,
        created_at: nowIso(),
      };
      db().courses.push(c);
      audit(u.id, 'course.create', 'course', c.id);
      return HttpResponse.json(courseOut(c), { status: 201 });
    }),
  ),

  http.put(
    p('/courses/:id'),
    route<{ id: string }>(async ({ request, params }) => {
      const u = authUser(request);
      const c = getCourse(params.id);
      if (!ownsCourse(u, c)) fail(403, 'FORBIDDEN', 'You can only edit your own courses.');
      const b = await body<Partial<CourseRow>>(request);
      (['title', 'description', 'category', 'difficulty', 'thumbnail_url'] as const).forEach((k) => {
        if (b[k] !== undefined) (c as unknown as Record<string, unknown>)[k] = b[k];
      });
      if (b.price !== undefined) c.price = Number(b.price);
      return courseOut(c);
    }),
  ),

  http.post(
    p('/courses/:id/submit'),
    route<{ id: string }>(({ request, params }) => {
      const u = authUser(request);
      const c = getCourse(params.id);
      if (!ownsCourse(u, c)) fail(403, 'FORBIDDEN', 'You can only submit your own courses.');
      if (!lecturesOf(c.id).length)
        fail(400, 'VALIDATION_ERROR', 'Add at least one lecture before submitting for review.');
      c.status = 'pending';
      audit(u.id, 'course.submit', 'course', c.id);
      db()
        .users.filter((x) => x.roles.includes('admin'))
        .forEach((a) =>
          notify(
            a.id,
            'Course awaiting approval',
            `${c.title} was submitted by ${u.full_name}.`,
            '/admin/approvals',
          ),
        );
      return courseOut(c);
    }),
  ),

  http.post(
    p('/courses/:id/modules'),
    route<{ id: string }>(async ({ request, params }) => {
      const u = authUser(request);
      const c = getCourse(params.id);
      if (!ownsCourse(u, c)) fail(403, 'FORBIDDEN', 'You can only edit your own courses.');
      const b = await body<{ title?: string }>(request);
      if (!b.title?.trim()) fail(400, 'VALIDATION_ERROR', 'Module title is required.', 'title');
      const m = { id: uid(), course_id: c.id, title: b.title!.trim(), order_index: modulesOf(c.id).length };
      db().modules.push(m);
      return HttpResponse.json({ ...m, lectures: [] }, { status: 201 });
    }),
  ),

  http.post(
    p('/modules/:id/lectures'),
    route<{ id: string }>(
      async ({ request, params }) => {
        const u = authUser(request);
        const m = db().modules.find((x) => x.id === params.id) ?? fail(404, 'NOT_FOUND', 'Module not found.');
        if (!ownsCourse(u, getCourse(m.course_id)))
          fail(403, 'FORBIDDEN', 'You can only edit your own courses.');
        const form = await request.formData();
        const title = String(form.get('title') ?? '').trim();
        if (!title) fail(400, 'VALIDATION_ERROR', 'Lecture title is required.', 'title');
        const video = form.get('video');
        const resources = form.getAll('resources').filter((f): f is File => f instanceof File);
        const l = {
          id: uid(),
          module_id: m.id,
          title,
          video_url: video instanceof File && video.size ? URL.createObjectURL(video) : null,
          transcript:
            String(form.get('transcript') ?? '') || `${title}. Transcript will be generated after upload.`,
          duration_seconds: Number(form.get('duration_seconds') ?? 600),
          order_index: lecturesOfModule(m.id).length,
          // uploaded files live in the browser session; '#name' keeps the original filename
          resource_urls: resources.map((f) => `${URL.createObjectURL(f)}#${encodeURIComponent(f.name)}`),
        };
        db().lectures.push(l);
        return HttpResponse.json(l, { status: 201 });
      },
      { latency: 900 },
    ),
  ),

  http.post(
    p('/courses/:id/approve'),
    route<{ id: string }>(async ({ request, params }) => {
      const u = authUser(request);
      requireRole(u, 'admin');
      const c = getCourse(params.id);
      const b = await body<{ decision?: 'approved' | 'rejected'; comment?: string }>(request);
      if (b.decision !== 'approved' && b.decision !== 'rejected')
        fail(400, 'VALIDATION_ERROR', 'decision must be approved or rejected', 'decision');
      if (b.decision === 'rejected' && !b.comment?.trim())
        fail(400, 'VALIDATION_ERROR', 'Add a comment so the instructor knows what to fix.', 'comment');
      c.status = b.decision!;
      db().course_approvals.push({
        id: uid(),
        course_id: c.id,
        reviewed_by: u.id,
        decision: b.decision!,
        comment: b.comment ?? '',
        reviewed_at: nowIso(),
      });
      audit(u.id, `course.${b.decision === 'approved' ? 'approve' : 'reject'}`, 'course', c.id);
      notify(
        c.instructor_id,
        b.decision === 'approved' ? 'Course approved' : 'Course needs changes',
        b.decision === 'approved' ? `${c.title} is now live in the catalog.` : `${c.title}: ${b.comment}`,
        `/instructor/courses/${c.id}`,
      );
      return courseOut(c);
    }),
  ),

  http.get(
    p('/instructor/courses'),
    route(({ request }) => {
      const u = authUser(request);
      requireRole(u, 'instructor', 'admin');
      // PRD §11: admins can create/edit any course, so they see all of them
      const isAdmin = u.roles.includes('admin');
      return db()
        .courses.filter((c) => isAdmin || c.instructor_id === u.id)
        .map(courseOut);
    }),
  ),

  // ===== Enrollment & progress (§8.3) =====
  http.post(
    p('/courses/:id/enroll'),
    route<{ id: string }>(({ request, params }) => {
      const u = authUser(request);
      requireRole(u, 'student');
      const c = getCourse(params.id);
      if (c.status !== 'approved') fail(400, 'NOT_AVAILABLE', 'This course isn’t open for enrollment.');
      if (enrolledIn(u.id, c.id)) fail(409, 'ALREADY_ENROLLED', 'You’re already enrolled in this course.');
      const e = { id: uid(), user_id: u.id, course_id: c.id, enrolled_at: nowIso() };
      db().enrollments.push(e);
      if (c.price > 0)
        db().payments.push({
          id: uid(),
          user_id: u.id,
          course_id: c.id,
          amount: c.price,
          status: 'success',
          created_at: nowIso(),
        });
      markActive(u.id);
      return HttpResponse.json(enrollmentOut(e), { status: 201 });
    }),
  ),

  http.get(
    p('/enrollments/me'),
    route(({ request }) => {
      const u = authUser(request);
      return db()
        .enrollments.filter((e) => e.user_id === u.id)
        .map(enrollmentOut);
    }),
  ),

  http.get(
    p('/lectures/:id/progress'),
    route<{ id: string }>(
      ({ request, params }) => {
        const u = authUser(request);
        const pr = db().progress.find((x) => x.user_id === u.id && x.lecture_id === params.id);
        return pr ?? { lecture_id: params.id, watched_seconds: 0, completed: false, last_watched_at: null };
      },
      { latency: 60 },
    ),
  ),

  http.post(
    p('/lectures/:id/progress'),
    route<{ id: string }>(
      async ({ request, params }) => {
        const u = authUser(request);
        const course = courseOfLecture(params.id) ?? fail(404, 'NOT_FOUND', 'Lecture not found.');
        if (!enrolledIn(u.id, course.id))
          fail(403, 'NOT_ENROLLED', 'Enroll in this course to track progress.');
        const b = await body<{ watched_seconds?: number; completed?: boolean }>(request);
        let pr = db().progress.find((x) => x.user_id === u.id && x.lecture_id === params.id);
        if (!pr) {
          pr = {
            user_id: u.id,
            lecture_id: params.id,
            watched_seconds: 0,
            completed: false,
            last_watched_at: null,
          };
          db().progress.push(pr);
        }
        pr.watched_seconds = Math.max(0, Math.round(b.watched_seconds ?? pr.watched_seconds));
        if (b.completed) pr.completed = true;
        pr.last_watched_at = nowIso();
        markActive(u.id);
        checkCompletion(u.id, course.id);
        return { ...pr, progress_percent: progressPercent(u.id, course.id) };
      },
      { latency: 80 },
    ),
  ),

  // Lecture material (slides PDF) — stands in for an S3/CDN object URL
  http.get(
    p('/lectures/:id/resources/:file'),
    route<{ id: string; file: string }>(async ({ request, params }) => {
      const u = authUser(request);
      const l = db().lectures.find((x) => x.id === params.id) ?? fail(404, 'NOT_FOUND', 'Lecture not found.');
      const course = courseOfLecture(l.id)!;
      if (!enrolledIn(u.id, course.id) && !ownsCourse(u, course))
        fail(403, 'NOT_ENROLLED', 'Enroll in this course to download its materials.');
      const bytes = await renderSlidesPdf(
        course.title,
        l.title,
        summarize(l),
        userName(course.instructor_id),
      );
      return new HttpResponse(bytes, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${params.file}"`,
        },
      });
    }),
  ),

  http.get(
    p('/lectures/:id/notes'),
    route<{ id: string }>(({ request, params }) => {
      const u = authUser(request);
      return db()
        .notes.filter((n) => n.user_id === u.id && n.lecture_id === params.id)
        .sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);
    }),
  ),
  http.post(
    p('/lectures/:id/notes'),
    route<{ id: string }>(async ({ request, params }) => {
      const u = authUser(request);
      const course = courseOfLecture(params.id) ?? fail(404, 'NOT_FOUND', 'Lecture not found.');
      requireCourseAccess(u, course.id);
      const b = await body<{ timestamp_seconds?: number; content?: string }>(request);
      if (!b.content?.trim())
        fail(400, 'VALIDATION_ERROR', 'Write something before saving the note.', 'content');
      const n = {
        id: uid(),
        user_id: u.id,
        lecture_id: params.id,
        timestamp_seconds: Math.round(b.timestamp_seconds ?? 0),
        content: b.content!.trim(),
        created_at: nowIso(),
      };
      db().notes.push(n);
      if (db().notes.filter((x) => x.user_id === u.id).length >= 10) award(u.id, 6);
      return HttpResponse.json(n, { status: 201 });
    }),
  ),
  http.delete(
    p('/notes/:id'),
    route<{ id: string }>(({ request, params }) => {
      const u = authUser(request);
      db().notes = db().notes.filter((n) => !(n.id === params.id && n.user_id === u.id));
      return new HttpResponse(null, { status: 204 });
    }),
  ),
  http.get(
    p('/lectures/:id/bookmarks'),
    route<{ id: string }>(({ request, params }) => {
      const u = authUser(request);
      return db()
        .bookmarks.filter((n) => n.user_id === u.id && n.lecture_id === params.id)
        .sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);
    }),
  ),
  http.post(
    p('/lectures/:id/bookmarks'),
    route<{ id: string }>(async ({ request, params }) => {
      const u = authUser(request);
      const course = courseOfLecture(params.id) ?? fail(404, 'NOT_FOUND', 'Lecture not found.');
      requireCourseAccess(u, course.id);
      const b = await body<{ timestamp_seconds?: number; label?: string }>(request);
      const bm = {
        id: uid(),
        user_id: u.id,
        lecture_id: params.id,
        timestamp_seconds: Math.round(b.timestamp_seconds ?? 0),
        label: b.label?.trim() || undefined,
        created_at: nowIso(),
      };
      db().bookmarks.push(bm);
      return HttpResponse.json(bm, { status: 201 });
    }),
  ),
  http.delete(
    p('/bookmarks/:id'),
    route<{ id: string }>(({ request, params }) => {
      const u = authUser(request);
      db().bookmarks = db().bookmarks.filter((n) => !(n.id === params.id && n.user_id === u.id));
      return new HttpResponse(null, { status: 204 });
    }),
  ),

  // ===== Assignments (§8.4) =====
  http.get(
    p('/assignments/me'),
    route(({ request }) => {
      const u = authUser(request);
      const courseIds = new Set(
        db()
          .enrollments.filter((e) => e.user_id === u.id)
          .map((e) => e.course_id),
      );
      return db()
        .assignments.filter((a) => courseIds.has(a.course_id))
        .map((a) => {
          const s = db().submissions.find((x) => x.assignment_id === a.id && x.user_id === u.id);
          return { ...a, course_title: getCourse(a.course_id).title, my_submission: s ?? null };
        })
        .sort((a, b) => a.due_date.localeCompare(b.due_date));
    }),
  ),
  http.get(
    p('/courses/:id/assignments'),
    route<{ id: string }>(({ request, params }) => {
      const u = authUser(request);
      const c = getCourse(params.id);
      if (!ownsCourse(u, c) && !enrolledIn(u.id, c.id)) fail(403, 'FORBIDDEN', 'Enroll to see assignments.');
      return db()
        .assignments.filter((a) => a.course_id === c.id)
        .map((a) => ({
          ...a,
          course_title: c.title,
          submission_count: db().submissions.filter((s) => s.assignment_id === a.id).length,
          my_submission: db().submissions.find((s) => s.assignment_id === a.id && s.user_id === u.id) ?? null,
        }));
    }),
  ),
  http.post(
    p('/assignments'),
    route(async ({ request }) => {
      const u = authUser(request);
      requireRole(u, 'instructor', 'admin');
      const b = await body<{
        course_id: string;
        title: string;
        instructions: string;
        rubric: { criterion: string; points: number }[];
        due_date: string;
      }>(request);
      const c = getCourse(b.course_id);
      if (!ownsCourse(u, c)) fail(403, 'FORBIDDEN', 'You can only add assignments to your own courses.');
      if (!b.title?.trim()) fail(400, 'VALIDATION_ERROR', 'Title is required.', 'title');
      if (!b.due_date || new Date(b.due_date) < new Date())
        fail(400, 'VALIDATION_ERROR', 'Pick a due date in the future.', 'due_date');
      const a = {
        id: uid(),
        course_id: c.id,
        title: b.title.trim(),
        instructions: b.instructions ?? '',
        rubric: b.rubric ?? [],
        due_date: b.due_date,
      };
      db().assignments.push(a);
      db()
        .enrollments.filter((e) => e.course_id === c.id)
        .forEach((e) => notify(e.user_id, 'New assignment', `${a.title} — ${c.title}`, '/assignments'));
      return HttpResponse.json({ ...a, course_title: c.title, submission_count: 0 }, { status: 201 });
    }),
  ),
  http.post(
    p('/assignments/:id/submit'),
    route<{ id: string }>(
      async ({ request, params }) => {
        const u = authUser(request);
        requireRole(u, 'student');
        const a =
          db().assignments.find((x) => x.id === params.id) ?? fail(404, 'NOT_FOUND', 'Assignment not found.');
        if (!enrolledIn(u.id, a.course_id)) fail(403, 'NOT_ENROLLED', 'Enroll in this course to submit.');
        if (new Date(a.due_date) < new Date())
          fail(400, 'DEADLINE_PASSED', 'The deadline for this assignment has passed.');
        const form = await request.formData();
        const file = form.get('file');
        if (!(file instanceof File) || !file.size)
          fail(400, 'VALIDATION_ERROR', 'Attach a file to submit.', 'file');
        const f = file as File;
        if (!/\.(pdf|zip|js|ts|tsx|py|java|cpp|c|ipynb|txt|md)$/i.test(f.name))
          fail(400, 'VALIDATION_ERROR', 'Upload a PDF, ZIP or source code file.', 'file');
        if (f.size > 25 * 1024 * 1024)
          fail(400, 'VALIDATION_ERROR', 'Files must be 25 MB or smaller.', 'file');
        const prev = db().submissions.find((s) => s.assignment_id === a.id && s.user_id === u.id);
        if (prev && prev.grade != null)
          fail(409, 'ALREADY_GRADED', 'This assignment is already graded, so it can’t be resubmitted.');
        db().submissions = db().submissions.filter((s) => !(s.assignment_id === a.id && s.user_id === u.id));
        const s = {
          id: uid(),
          assignment_id: a.id,
          user_id: u.id,
          file_name: f.name,
          file_url: URL.createObjectURL(f),
          submitted_at: nowIso(),
          grade: null,
          feedback: null,
        };
        db().submissions.push(s);
        if (new Date(a.due_date).getTime() - Date.now() > 2 * 86400000) award(u.id, 5);
        markActive(u.id);
        const c = getCourse(a.course_id);
        notify(
          c.instructor_id,
          'New submission',
          `${u.full_name} submitted ${a.title}.`,
          '/instructor/grading',
        );
        return HttpResponse.json(s, { status: 201 });
      },
      { latency: 900 },
    ),
  ),
  http.get(
    p('/assignments/:id/submissions'),
    route<{ id: string }>(({ request, params }) => {
      const u = authUser(request);
      const a =
        db().assignments.find((x) => x.id === params.id) ?? fail(404, 'NOT_FOUND', 'Assignment not found.');
      if (!ownsCourse(u, getCourse(a.course_id)))
        fail(403, 'FORBIDDEN', 'Only the course instructor can view submissions.');
      return db()
        .submissions.filter((s) => s.assignment_id === a.id)
        .map((s) => ({ ...s, student_name: userName(s.user_id) }));
    }),
  ),
  http.put(
    p('/submissions/:id/grade'),
    route<{ id: string }>(async ({ request, params }) => {
      const u = authUser(request);
      const s =
        db().submissions.find((x) => x.id === params.id) ?? fail(404, 'NOT_FOUND', 'Submission not found.');
      const a = db().assignments.find((x) => x.id === s.assignment_id)!;
      if (!ownsCourse(u, getCourse(a.course_id)))
        fail(403, 'FORBIDDEN', 'Only the course instructor can grade.');
      const b = await body<{ grade?: number; feedback?: string }>(request);
      const max = a.rubric.reduce((t, r) => t + r.points, 0) || 100;
      if (b.grade == null || b.grade < 0 || b.grade > max)
        fail(400, 'VALIDATION_ERROR', `Grade must be between 0 and ${max}.`, 'grade');
      s.grade = Number(b.grade);
      s.feedback = b.feedback ?? '';
      notify(s.user_id, 'Assignment graded', `${a.title}: ${s.grade}/${max}`, '/assignments');
      return { ...s, student_name: userName(s.user_id) };
    }),
  ),

  // ===== Quizzes (§8.4) =====
  http.get(
    p('/quizzes/me'),
    route(({ request }) => {
      const u = authUser(request);
      const courseIds = new Set(
        db()
          .enrollments.filter((e) => e.user_id === u.id)
          .map((e) => e.course_id),
      );
      return db()
        .quizzes.filter(
          (q) =>
            q.status === 'published' &&
            courseIds.has(db().modules.find((m) => m.id === q.module_id)!.course_id),
        )
        .map((q) => quizOut(q, false, u.id));
    }),
  ),
  http.get(
    p('/courses/:id/quizzes'),
    route<{ id: string }>(({ request, params }) => {
      const u = authUser(request);
      const c = getCourse(params.id);
      const owner = ownsCourse(u, c);
      if (!owner && !enrolledIn(u.id, c.id)) fail(403, 'FORBIDDEN', 'Enroll to see quizzes.');
      const moduleIds = new Set(modulesOf(c.id).map((m) => m.id));
      return db()
        .quizzes.filter((q) => moduleIds.has(q.module_id) && (owner || q.status === 'published'))
        .map((q) => quizOut(q, owner, u.id));
    }),
  ),
  http.get(
    p('/quizzes/:id'),
    route<{ id: string }>(({ request, params }) => {
      const u = authUser(request);
      const q = db().quizzes.find((x) => x.id === params.id) ?? fail(404, 'NOT_FOUND', 'Quiz not found.');
      const c = getCourse(db().modules.find((m) => m.id === q.module_id)!.course_id);
      const owner = ownsCourse(u, c);
      if (!owner && (q.status !== 'published' || !enrolledIn(u.id, c.id)))
        fail(403, 'FORBIDDEN', 'You can’t open this quiz.');
      return quizOut(q, owner, u.id);
    }),
  ),
  http.post(
    p('/quizzes'),
    route(async ({ request }) => {
      const u = authUser(request);
      requireRole(u, 'instructor', 'admin');
      const b = await body<{ module_id: string; title: string; questions: QuizRow['questions'] }>(request);
      const m =
        db().modules.find((x) => x.id === b.module_id) ??
        fail(400, 'VALIDATION_ERROR', 'Choose a module.', 'module_id');
      if (!ownsCourse(u, getCourse(m.course_id)))
        fail(403, 'FORBIDDEN', 'You can only add quizzes to your own courses.');
      if (!b.title?.trim()) fail(400, 'VALIDATION_ERROR', 'Quiz title is required.', 'title');
      if (!b.questions?.length) fail(400, 'VALIDATION_ERROR', 'Add at least one question.', 'questions');
      const q: QuizRow = {
        id: uid(),
        module_id: m.id,
        title: b.title.trim(),
        is_ai_generated: false,
        generated_from_lecture_id: null,
        status: 'published',
        questions: b.questions.map((qq, i) => ({
          ...qq,
          id: uid(),
          order_index: i,
          topic: qq.topic || m.title,
          options: qq.options.map((o) => ({ ...o, id: uid() })),
        })),
      };
      db().quizzes.push(q);
      return HttpResponse.json(quizOut(q, true), { status: 201 });
    }),
  ),
  http.put(
    p('/quizzes/:id'),
    route<{ id: string }>(async ({ request, params }) => {
      const u = authUser(request);
      const q = db().quizzes.find((x) => x.id === params.id) ?? fail(404, 'NOT_FOUND', 'Quiz not found.');
      if (!ownsCourse(u, getCourse(db().modules.find((m) => m.id === q.module_id)!.course_id)))
        fail(403, 'FORBIDDEN', 'Not your course.');
      const b = await body<Partial<QuizRow>>(request);
      if (b.title !== undefined) q.title = b.title;
      if (b.questions)
        q.questions = b.questions.map((qq, i) => ({
          ...qq,
          id: qq.id || uid(),
          order_index: i,
          options: qq.options.map((o) => ({ ...o, id: o.id || uid() })),
        }));
      return quizOut(q, true);
    }),
  ),
  http.post(
    p('/quizzes/:id/publish'),
    route<{ id: string }>(({ request, params }) => {
      const u = authUser(request);
      const q = db().quizzes.find((x) => x.id === params.id) ?? fail(404, 'NOT_FOUND', 'Quiz not found.');
      const c = getCourse(db().modules.find((m) => m.id === q.module_id)!.course_id);
      if (!ownsCourse(u, c)) fail(403, 'FORBIDDEN', 'Not your course.');
      if (!q.questions.length) fail(400, 'VALIDATION_ERROR', 'A quiz needs at least one question.');
      q.status = 'published';
      db()
        .enrollments.filter((e) => e.course_id === c.id)
        .forEach((e) => notify(e.user_id, 'New quiz available', `${q.title} — ${c.title}`, '/quizzes'));
      return quizOut(q, true);
    }),
  ),
  http.post(
    p('/quizzes/:id/attempt'),
    route<{ id: string }>(({ request, params }) => {
      const u = authUser(request);
      requireRole(u, 'student');
      const q =
        db().quizzes.find((x) => x.id === params.id && x.status === 'published') ??
        fail(404, 'NOT_FOUND', 'Quiz not found.');
      const a = {
        id: uid(),
        quiz_id: q.id,
        user_id: u.id,
        score: null,
        started_at: nowIso(),
        submitted_at: null,
        answers: [],
      };
      db().attempts.push(a);
      return HttpResponse.json(
        { id: a.id, quiz_id: a.quiz_id, score: null, started_at: a.started_at, submitted_at: null },
        { status: 201 },
      );
    }),
  ),
  http.post(
    p('/attempts/:id/submit'),
    route<{ id: string }>(async ({ request, params }) => {
      const u = authUser(request);
      const a =
        db().attempts.find((x) => x.id === params.id && x.user_id === u.id) ??
        fail(404, 'NOT_FOUND', 'Attempt not found.');
      if (a.submitted_at) fail(409, 'ALREADY_SUBMITTED', 'This attempt was already submitted.');
      const q = db().quizzes.find((x) => x.id === a.quiz_id)!;
      const b = await body<{
        answers: { question_id: string; selected_option_ids?: string[]; text_answer?: string }[];
      }>(request);
      const norm = (s: string) =>
        s
          .toLowerCase()
          .replace(/\s+/g, '')
          .replace(/[^a-z0-9()^]/g, '');
      const graded = q.questions.map((qq) => {
        const given = b.answers?.find((x) => x.question_id === qq.id) ?? { question_id: qq.id };
        const correctIds = qq.options.filter((o) => o.is_correct).map((o) => o.id);
        let ok = false;
        if (qq.question_type === 'short_answer')
          ok =
            !!given.text_answer &&
            (qq.accepted_answers ?? []).some((x) => norm(x) === norm(given.text_answer!));
        else {
          const sel = new Set(given.selected_option_ids ?? []);
          ok = sel.size === correctIds.length && correctIds.every((id) => sel.has(id));
        }
        return { ...given, is_correct: ok, correct_option_ids: correctIds };
      });
      a.answers = graded;
      a.score = Math.round((graded.filter((g) => g.is_correct).length / Math.max(graded.length, 1)) * 100);
      a.submitted_at = nowIso();
      // Update per-topic mastery (FR-A8): exponential moving average
      const courseId = db().modules.find((m) => m.id === q.module_id)!.course_id;
      q.questions.forEach((qq, i) => {
        let row = db().mastery.find(
          (m) => m.user_id === u.id && m.course_id === courseId && m.topic === qq.topic,
        );
        if (!row) {
          row = { user_id: u.id, course_id: courseId, topic: qq.topic, mastery: 50 };
          db().mastery.push(row);
        }
        row.mastery = Math.round(row.mastery * 0.6 + (graded[i].is_correct ? 100 : 0) * 0.4);
      });
      markActive(u.id);
      const badges = [a.score === 100 ? award(u.id, 3) : null].filter(Boolean);
      return {
        id: a.id,
        quiz_id: q.id,
        score: a.score,
        started_at: a.started_at,
        submitted_at: a.submitted_at,
        answers: graded,
        quiz: quizOut(q, true, u.id),
        badges_earned: badges,
      };
    }),
  ),

  // ===== AI Tutor (§8.5) =====
  http.get(
    p('/ai/chat/sessions'),
    route(({ request }) => {
      const u = authUser(request);
      return db()
        .chat_sessions.filter((s) => s.user_id === u.id)
        .map((s) => {
          const msgs = db().chat_messages.filter((m) => m.session_id === s.id);
          return {
            ...s,
            course_title: getCourse(s.course_id).title,
            messages: [],
            title: msgs.find((m) => m.sender === 'user')?.content.slice(0, 80) ?? null,
            last_message_at: msgs.at(-1)?.created_at ?? null,
          };
        })
        .sort((a, b) => (b.last_message_at ?? b.created_at).localeCompare(a.last_message_at ?? a.created_at));
    }),
  ),
  http.post(
    p('/ai/chat/sessions'),
    route(async ({ request }) => {
      const u = authUser(request);
      requireRole(u, 'student', 'instructor');
      const b = await body<{ course_id: string; mode?: Difficulty; new?: boolean }>(request);
      const c = getCourse(b.course_id);
      if (!enrolledIn(u.id, c.id) && !ownsCourse(u, c))
        fail(403, 'NOT_ENROLLED', 'Enroll in this course to use its AI tutor.');
      // Latest chat for this course. `new: true` starts a fresh one ("New chat"),
      // unless the latest is still empty — no point stacking blank chats.
      const hasMessages = (id: string) => db().chat_messages.some((m) => m.session_id === id);
      const latest = db()
        .chat_sessions.filter((s) => s.user_id === u.id && s.course_id === c.id)
        .sort((x, y) => y.created_at.localeCompare(x.created_at))[0];
      const existing = latest && (!b.new || !hasMessages(latest.id)) ? latest : undefined;
      const s = existing ?? {
        id: uid(),
        user_id: u.id,
        course_id: c.id,
        mode: latest?.mode ?? b.mode ?? modeFromMastery(u.id, c.id),
        created_at: nowIso(),
      };
      if (!existing) db().chat_sessions.push(s);
      return {
        ...s,
        course_title: c.title,
        messages: db().chat_messages.filter((m) => m.session_id === s.id),
      };
    }),
  ),
  http.get(
    p('/ai/chat/sessions/:id'),
    route<{ id: string }>(({ request, params }) => {
      const u = authUser(request);
      const s =
        db().chat_sessions.find((x) => x.id === params.id && x.user_id === u.id) ??
        fail(404, 'NOT_FOUND', 'Chat not found.');
      return {
        ...s,
        course_title: getCourse(s.course_id).title,
        messages: db().chat_messages.filter((m) => m.session_id === s.id),
      };
    }),
  ),
  // Not in PRD §8.5 — added so students can clear old conversations (ChatGPT-style).
  // Backend needs: DELETE /ai/chat/sessions/:id (messages cascade per §7 schema).
  http.delete(
    p('/ai/chat/sessions/:id'),
    route<{ id: string }>(({ request, params }) => {
      const u = authUser(request);
      const s =
        db().chat_sessions.find((x) => x.id === params.id && x.user_id === u.id) ??
        fail(404, 'NOT_FOUND', 'Chat not found.');
      db().chat_messages = db().chat_messages.filter((m) => m.session_id !== s.id);
      db().chat_sessions = db().chat_sessions.filter((x) => x.id !== s.id);
      return new HttpResponse(null, { status: 204 });
    }),
  ),
  http.put(
    p('/ai/chat/sessions/:id/mode'),
    route<{ id: string }>(async ({ request, params }) => {
      const u = authUser(request);
      const s =
        db().chat_sessions.find((x) => x.id === params.id && x.user_id === u.id) ??
        fail(404, 'NOT_FOUND', 'Chat not found.');
      const b = await body<{ mode: Difficulty }>(request);
      if (!['beginner', 'intermediate', 'advanced'].includes(b.mode))
        fail(400, 'VALIDATION_ERROR', 'mode must be beginner, intermediate or advanced', 'mode');
      s.mode = b.mode;
      return {
        ...s,
        course_title: getCourse(s.course_id).title,
        messages: db().chat_messages.filter((m) => m.session_id === s.id),
      };
    }),
  ),
  http.post(
    p('/ai/chat/sessions/:id/messages'),
    route<{ id: string }>(
      async ({ request, params }) => {
        const u = authUser(request);
        rateLimit(`ai:${u.id}`, 20);
        const s =
          db().chat_sessions.find((x) => x.id === params.id && x.user_id === u.id) ??
          fail(404, 'NOT_FOUND', 'Chat not found.');
        const b = await body<{ message?: string; lecture_id?: string }>(request);
        const text = (b.message ?? '').trim();
        if (!text) fail(400, 'VALIDATION_ERROR', 'Type a question first.', 'message');
        if (text.length > 2000)
          fail(400, 'VALIDATION_ERROR', 'Keep questions under 2000 characters.', 'message');
        await sleep(500 + Math.random() * 700);
        const chunks = chunksForCourse(db(), s.course_id);
        let found = retrieve(chunks, text, 3);
        if (b.lecture_id && asksAboutThisLecture(text)) {
          found = lectureOpening(chunksForCourse(db(), s.course_id, b.lecture_id));
        } else if (b.lecture_id) {
          const local = retrieve(chunksForCourse(db(), s.course_id, b.lecture_id), text, 2);
          if (local.length)
            found = [
              ...local,
              ...found.filter(
                (f) => !local.some((l) => l.c.lecture.id === f.c.lecture.id && l.c.index === f.c.index),
              ),
            ].slice(0, 3);
        }
        const topics = [...new Set(chunks.map((c) => c.lecture.title))];
        const { reply, sources } = composeAnswer(text, found, s.mode, topics);
        const userMsg = {
          id: uid(),
          session_id: s.id,
          sender: 'user' as const,
          content: text,
          sources: [],
          created_at: nowIso(),
        };
        const aiMsg = {
          id: uid(),
          session_id: s.id,
          sender: 'ai' as const,
          content: reply,
          sources,
          created_at: nowIso(),
        };
        db().chat_messages.push(userMsg, aiMsg);
        markActive(u.id);
        // background job (§9.2 step 5): nudge mastery for touched topics
        const asked = db().chat_messages.filter(
          (m) =>
            m.sender === 'user' &&
            db().chat_sessions.some((cs) => cs.id === m.session_id && cs.user_id === u.id),
        ).length;
        if (asked >= 10) award(u.id, 4);
        return { reply, sources, mode: s.mode, message: aiMsg, user_message: userMsg };
      },
      { latency: 50 },
    ),
  ),
  http.post(
    p('/ai/lectures/:id/summarize'),
    route<{ id: string }>(async ({ request, params }) => {
      const u = authUser(request);
      const l = db().lectures.find((x) => x.id === params.id) ?? fail(404, 'NOT_FOUND', 'Lecture not found.');
      requireCourseAccess(u, courseOfLecture(l.id)!.id);
      await sleep(700);
      return { lecture_id: l.id, key_points: summarize(l), generated_at: nowIso() };
    }),
  ),
  http.post(
    p('/ai/lectures/:id/generate-quiz'),
    route<{ id: string }>(
      async ({ request, params }) => {
        const u = authUser(request);
        requireRole(u, 'instructor', 'admin');
        const l =
          db().lectures.find((x) => x.id === params.id) ?? fail(404, 'NOT_FOUND', 'Lecture not found.');
        const m = db().modules.find((x) => x.id === l.module_id)!;
        if (!ownsCourse(u, getCourse(m.course_id))) fail(403, 'FORBIDDEN', 'Not your course.');
        const b = await body<{ count?: number }>(request);
        await sleep(1200);
        const q: QuizRow = {
          id: uid(),
          module_id: m.id,
          title: `${l.title} Quiz`, // neutral name — students see it once published
          is_ai_generated: true,
          generated_from_lecture_id: l.id,
          status: 'draft',
          questions: generateQuizQuestions(
            l,
            lecturesOf(m.course_id),
            Math.min(Math.max(b.count ?? 5, 5), 10),
            m.title,
          ),
        };
        if (!q.questions.length)
          fail(422, 'NOT_ENOUGH_CONTENT', 'This lecture’s transcript is too short to generate questions.');
        db().quizzes.push(q);
        return HttpResponse.json(quizOut(q, true), { status: 201 });
      },
      { latency: 50 },
    ),
  ),
  http.post(
    p('/ai/modules/:id/flashcards'),
    route<{ id: string }>(async ({ request, params }) => {
      const u = authUser(request);
      const m = db().modules.find((x) => x.id === params.id) ?? fail(404, 'NOT_FOUND', 'Module not found.');
      requireCourseAccess(u, m.course_id);
      await sleep(600);
      return flashcardsFor(lecturesOfModule(m.id)).map((f) => ({ ...f, module_id: m.id }));
    }),
  ),
  http.post(
    p('/ai/study-plan'),
    route(async ({ request }) => {
      const u = authUser(request);
      const b = await body<{ course_id: string }>(request);
      const c = getCourse(b.course_id);
      await sleep(900);
      const mods = modulesOf(c.id);
      let mastery = db().mastery.filter((m) => m.user_id === u.id && m.course_id === c.id);
      if (!mastery.length)
        mastery = mods.map((m) => ({ user_id: u.id, course_id: c.id, topic: m.title, mastery: 50 }));
      const weak = [...mastery].sort((a, b2) => a.mastery - b2.mastery);
      const lectures = lecturesOf(c.id);
      const findLecture = (topic: string) => {
        const t = topic.toLowerCase();
        const first = t.split(' ')[0];
        const mod = mods.find((m) => m.title.toLowerCase() === t);
        return (
          lectures.find((l) => l.title.toLowerCase().includes(t)) ??
          (mod && lecturesOfModule(mod.id)[0]) ??
          lectures.find((l) => l.title.toLowerCase().includes(first)) ??
          lectures.find((l) => l.transcript.toLowerCase().includes(t)) ??
          lectures[0]
        );
      };
      const plan = Array.from({ length: 7 }, (_, i) => {
        const topic = weak[i % weak.length];
        const lect = findLecture(topic.topic);
        const review = i === 6;
        return {
          day: i + 1,
          focus_topic: review ? 'Mixed review' : topic.topic,
          tasks: review
            ? [
                'Retake the quiz you scored lowest on',
                'Review your flashcards for all modules',
                'Ask the AI tutor about anything still unclear',
              ]
            : [
                `Re-watch “${lect.title}” and take timestamped notes`,
                topic.mastery < 50
                  ? `Ask the AI tutor to explain ${topic.topic} in beginner mode`
                  : `Explain ${topic.topic} to the AI tutor in advanced mode`,
                'Do 10 minutes of flashcards for this module',
              ],
          lecture_ids: [lect.id],
          minutes: topic.mastery < 50 ? 45 : 30,
        };
      });
      const sp = {
        id: uid(),
        course_id: c.id,
        generated_at: nowIso(),
        weak_topics: weak.map((w) => ({ topic: w.topic, mastery: w.mastery })),
        plan,
      };
      db().study_plans.push({
        id: sp.id,
        user_id: u.id,
        course_id: c.id,
        plan_json: sp,
        generated_at: sp.generated_at,
      });
      return sp;
    }),
  ),
  http.get(
    p('/ai/mastery/:courseId'),
    route<{ courseId: string }>(({ request, params }) => {
      const u = authUser(request);
      return db()
        .mastery.filter((m) => m.user_id === u.id && m.course_id === params.courseId)
        .map(({ topic, mastery }) => ({ topic, mastery }));
    }),
  ),

  // ===== Recommendations & gamification (§8.6) =====
  http.get(
    p('/recommendations/me'),
    route(({ request }) => {
      const u = authUser(request);
      const enrolled = db()
        .enrollments.filter((e) => e.user_id === u.id)
        .map((e) => getCourse(e.course_id));
      const cats = new Set(enrolled.map((c) => c.category));
      const weak = db()
        .mastery.filter((m) => m.user_id === u.id)
        .sort((a, b) => a.mastery - b.mastery)[0];
      return db()
        .courses.filter((c) => c.status === 'approved' && !enrolled.some((e) => e.id === c.id))
        .map((c) => {
          let score = c.rating * 10;
          let reason = `Popular with ${courseOut(c).enrollment_count.toLocaleString()} learners`;
          if (cats.has(c.category)) {
            score += 30;
            reason = `Builds on your ${c.category} courses`;
          }
          if (weak && c.category === getCourse(weak.course_id).category && c.difficulty !== 'beginner') {
            score += 15;
            reason = `Strengthens ${weak.topic}, where your quiz scores are lowest`;
          }
          return { id: uid(), course: courseOut(c), reason, score: Math.round(score) };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
    }),
  ),
  http.get(
    p('/users/me/badges'),
    route(({ request }) => {
      const u = authUser(request);
      return db().badges.map((b) => ({
        ...b,
        earned_at: db().user_badges.find((x) => x.user_id === u.id && x.badge_id === b.id)?.earned_at ?? null,
      }));
    }),
  ),
  http.get(
    p('/users/me/streak'),
    route(({ request }) => streakOf(authUser(request).id)),
  ),
  http.get(
    p('/leaderboard/:courseId'),
    route<{ courseId: string }>(({ request, params }) => {
      const u = authUser(request);
      requireCourseAccess(u, params.courseId);
      const moduleIds = new Set(modulesOf(params.courseId).map((m) => m.id));
      const quizIds = new Set(
        db()
          .quizzes.filter((q) => moduleIds.has(q.module_id))
          .map((q) => q.id),
      );
      const byUser = new Map<string, { best: Map<string, number>; count: number }>();
      db()
        .attempts.filter((a) => quizIds.has(a.quiz_id) && a.score != null)
        .forEach((a) => {
          const e = byUser.get(a.user_id) ?? { best: new Map(), count: 0 };
          e.best.set(a.quiz_id, Math.max(e.best.get(a.quiz_id) ?? 0, a.score!));
          e.count++;
          byUser.set(a.user_id, e);
        });
      return [...byUser.entries()]
        .map(([userId, e]) => ({
          user_id: userId,
          full_name: userName(userId),
          quizzes_taken: e.count,
          score: Math.round(
            [...e.best.values()].reduce((s, x) => s + x, 0) + progressPercent(userId, params.courseId) * 0.5,
          ),
          is_me: userId === u.id,
        }))
        .sort((a, b) => b.score - a.score)
        .map((x, i) => ({ ...x, rank: i + 1 }));
    }),
  ),
  http.get(
    p('/certificates/me'),
    route(({ request }) => {
      const u = authUser(request);
      return db()
        .certificates.filter((c) => c.user_id === u.id)
        .map((c) => {
          const course = getCourse(c.course_id);
          return {
            id: c.id,
            course_id: c.course_id,
            course_title: course.title,
            instructor_name: userName(course.instructor_id),
            user_name: u.full_name,
            certificate_url: `/api/v1/certificates/${c.id}/download`,
            issued_at: c.issued_at,
          };
        });
    }),
  ),
  http.get(
    p('/certificates/:id/download'),
    route<{ id: string }>(async ({ request, params }) => {
      const u = authUser(request);
      const cert =
        db().certificates.find((c) => c.id === params.id && c.user_id === u.id) ??
        fail(404, 'NOT_FOUND', 'Certificate not found.');
      const course = getCourse(cert.course_id);
      const bytes = await renderCertificatePdf(
        u.full_name,
        course.title,
        userName(course.instructor_id),
        cert.issued_at,
        cert.id,
      );
      return new HttpResponse(bytes, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="certificate-${course.id}.pdf"`,
        },
      });
    }),
  ),

  // ===== Discussions, announcements, notifications =====
  http.get(
    p('/courses/:id/threads'),
    route<{ id: string }>(({ request, params }) => {
      requireCourseAccess(authUser(request), params.id);
      return db()
        .threads.filter((t) => t.course_id === params.id)
        .map((t) => {
          const posts = db().posts.filter((x) => x.thread_id === t.id && !x.removed);
          const author = db().users.find((x) => x.id === t.created_by)!;
          return {
            ...t,
            author_name: author.full_name,
            author_role: primaryRole(author),
            post_count: posts.length,
            last_activity_at:
              posts
                .map((x) => x.created_at)
                .sort()
                .pop() ?? t.created_at,
          };
        })
        .sort((a, b) => b.last_activity_at.localeCompare(a.last_activity_at));
    }),
  ),
  http.post(
    p('/courses/:id/threads'),
    route<{ id: string }>(async ({ request, params }) => {
      const u = authUser(request);
      const c = getCourse(params.id);
      if (!enrolledIn(u.id, c.id) && !ownsCourse(u, c))
        fail(403, 'NOT_ENROLLED', 'Enroll to post in this forum.');
      const b = await body<{ title?: string; content?: string }>(request);
      if (!b.title?.trim() || b.title.trim().length < 8)
        fail(400, 'VALIDATION_ERROR', 'Write a title of at least 8 characters.', 'title');
      if (!b.content?.trim()) fail(400, 'VALIDATION_ERROR', 'Describe your question.', 'content');
      const t = {
        id: uid(),
        course_id: c.id,
        created_by: u.id,
        title: b.title!.trim(),
        created_at: nowIso(),
      };
      db().threads.push(t);
      db().posts.push({
        id: uid(),
        thread_id: t.id,
        parent_id: null,
        user_id: u.id,
        content: b.content!.trim(),
        is_flagged: false,
        flag_reason: null,
        removed: false,
        created_at: nowIso(),
      });
      if (u.id !== c.instructor_id)
        notify(
          c.instructor_id,
          'New forum question',
          `${u.full_name}: ${t.title}`,
          `/courses/${c.id}/forum/${t.id}`,
        );
      return HttpResponse.json(
        {
          ...t,
          author_name: u.full_name,
          author_role: primaryRole(u),
          post_count: 1,
          last_activity_at: t.created_at,
        },
        { status: 201 },
      );
    }),
  ),
  http.get(
    p('/threads/:id'),
    route<{ id: string }>(({ request, params }) => {
      const u = authUser(request);
      const t = db().threads.find((x) => x.id === params.id) ?? fail(404, 'NOT_FOUND', 'Thread not found.');
      requireCourseAccess(u, t.course_id);
      const author = db().users.find((x) => x.id === t.created_by)!;
      const posts = db()
        .posts.filter((x) => x.thread_id === t.id && !x.removed)
        .sort((a, b) => a.created_at.localeCompare(b.created_at));
      return {
        thread: {
          ...t,
          author_name: author.full_name,
          author_role: primaryRole(author),
          post_count: posts.length,
          last_activity_at: posts[posts.length - 1]?.created_at ?? t.created_at,
        },
        posts: posts.map((x) => {
          const pu = db().users.find((y) => y.id === x.user_id)!;
          return {
            id: x.id,
            thread_id: x.thread_id,
            parent_id: x.parent_id,
            user_id: x.user_id,
            author_name: pu.full_name,
            author_role: primaryRole(pu),
            content: x.content,
            is_flagged: x.is_flagged,
            created_at: x.created_at,
          };
        }),
      };
    }),
  ),
  http.post(
    p('/threads/:id/posts'),
    route<{ id: string }>(async ({ request, params }) => {
      const u = authUser(request);
      const t = db().threads.find((x) => x.id === params.id) ?? fail(404, 'NOT_FOUND', 'Thread not found.');
      requireCourseAccess(u, t.course_id);
      const b = await body<{ content?: string; parent_id?: string | null }>(request);
      if (!b.content?.trim()) fail(400, 'VALIDATION_ERROR', 'Write a reply first.', 'content');
      const post = {
        id: uid(),
        thread_id: t.id,
        parent_id: b.parent_id ?? null,
        user_id: u.id,
        content: b.content!.trim(),
        is_flagged: false,
        flag_reason: null,
        removed: false,
        created_at: nowIso(),
      };
      db().posts.push(post);
      if (t.created_by !== u.id)
        notify(
          t.created_by,
          'New reply on your thread',
          `${u.full_name} replied to “${t.title}”`,
          `/courses/${t.course_id}/forum/${t.id}`,
        );
      return HttpResponse.json(
        { ...post, author_name: u.full_name, author_role: primaryRole(u) },
        { status: 201 },
      );
    }),
  ),
  http.post(
    p('/posts/:id/report'),
    route<{ id: string }>(async ({ request, params }) => {
      const u = authUser(request);
      const post = db().posts.find((x) => x.id === params.id) ?? fail(404, 'NOT_FOUND', 'Post not found.');
      requireCourseAccess(u, db().threads.find((t) => t.id === post.thread_id)!.course_id);
      const b = await body<{ reason?: string }>(request);
      post.is_flagged = true;
      post.flag_reason = b.reason || 'Reported by a learner';
      audit(u.id, 'post.report', 'discussion_post', post.id);
      return { ok: true };
    }),
  ),
  http.get(
    p('/announcements'),
    route(({ request, url }) => {
      const u = authUser(request);
      const courseId = url.searchParams.get('course_id');
      const visible = new Set(
        courseId
          ? [courseId]
          : [
              ...db()
                .enrollments.filter((e) => e.user_id === u.id)
                .map((e) => e.course_id),
              ...db()
                .courses.filter((c) => c.instructor_id === u.id)
                .map((c) => c.id),
            ],
      );
      return db()
        .announcements.filter((a) => visible.has(a.course_id))
        .map((a) => ({
          ...a,
          course_title: getCourse(a.course_id).title,
          author_name: userName(a.posted_by),
        }))
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
    }),
  ),
  http.post(
    p('/courses/:id/announcements'),
    route<{ id: string }>(async ({ request, params }) => {
      const u = authUser(request);
      const c = getCourse(params.id);
      if (!ownsCourse(u, c)) fail(403, 'FORBIDDEN', 'Only the course instructor can post announcements.');
      const b = await body<{ content?: string }>(request);
      if (!b.content?.trim()) fail(400, 'VALIDATION_ERROR', 'Write the announcement first.', 'content');
      const a = {
        id: uid(),
        course_id: c.id,
        posted_by: u.id,
        content: b.content!.trim(),
        created_at: nowIso(),
      };
      db().announcements.push(a);
      db()
        .enrollments.filter((e) => e.course_id === c.id)
        .forEach((e) =>
          notify(e.user_id, `Announcement: ${c.title}`, a.content.slice(0, 120), `/courses/${c.id}`),
        );
      return HttpResponse.json({ ...a, course_title: c.title, author_name: u.full_name }, { status: 201 });
    }),
  ),
  http.get(
    p('/notifications'),
    route(
      ({ request }) => {
        const u = authUser(request);
        return db()
          .notifications.filter((n) => n.user_id === u.id)
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .slice(0, 30);
      },
      { latency: 80 },
    ),
  ),
  http.put(
    p('/notifications/read-all'),
    route(({ request }) => {
      const u = authUser(request);
      db()
        .notifications.filter((n) => n.user_id === u.id)
        .forEach((n) => (n.is_read = true));
      return { ok: true };
    }),
  ),
  http.put(
    p('/notifications/:id/read'),
    route<{ id: string }>(({ request, params }) => {
      const u = authUser(request);
      const n = db().notifications.find((x) => x.id === params.id && x.user_id === u.id);
      if (n) n.is_read = true;
      return { ok: true };
    }),
  ),

  // ===== Instructor analytics (FR-I5) =====
  http.get(
    p('/instructor/overview'),
    route(({ request }) => {
      const u = authUser(request);
      requireRole(u, 'instructor', 'admin');
      const mine = db().courses.filter((c) => c.instructor_id === u.id);
      const mineIds = new Set(mine.map((c) => c.id));
      const students = new Set(
        db()
          .enrollments.filter((e) => mineIds.has(e.course_id))
          .map((e) => e.user_id),
      );
      const quizIdsFor = (cid: string) =>
        new Set(
          db()
            .quizzes.filter((q) => modulesOf(cid).some((m) => m.id === q.module_id))
            .map((q) => q.id),
        );
      const avgFor = (ids: Set<string>) => {
        const s = db()
          .attempts.filter((a) => ids.has(a.quiz_id) && a.score != null)
          .map((a) => a.score!);
        return s.length ? Math.round(s.reduce((x, y) => x + y, 0) / s.length) : 0;
      };
      const allQuizIds = new Set(mine.flatMap((c) => [...quizIdsFor(c.id)]));
      const assignmentIds = new Set(
        db()
          .assignments.filter((a) => mineIds.has(a.course_id))
          .map((a) => a.id),
      );
      return {
        total_students: students.size,
        active_courses: mine.filter((c) => c.status === 'approved').length,
        avg_quiz_score: avgFor(allQuizIds),
        pending_submissions: db().submissions.filter(
          (s) => assignmentIds.has(s.assignment_id) && s.grade == null,
        ).length,
        courses: mine.map((c) => {
          const ens = db().enrollments.filter((e) => e.course_id === c.id);
          return {
            ...courseOut(c),
            avg_progress: ens.length
              ? Math.round(ens.reduce((s, e) => s + progressPercent(e.user_id, c.id), 0) / ens.length)
              : 0,
            avg_quiz_score: avgFor(quizIdsFor(c.id)),
          };
        }),
      };
    }),
  ),
  http.get(
    p('/instructor/courses/:id/analytics'),
    route<{ id: string }>(({ request, params }) => {
      const u = authUser(request);
      const c = getCourse(params.id);
      if (!ownsCourse(u, c)) fail(403, 'FORBIDDEN', 'You can only view analytics for your own courses.');
      const ens = db().enrollments.filter((e) => e.course_id === c.id);
      const users = new Set(ens.map((e) => e.user_id));
      const lectures = lecturesOf(c.id);
      const scale = Math.max(1, Math.round(c.base_enrollments / 40));
      const quizzes = db().quizzes.filter(
        (q) => modulesOf(c.id).some((m) => m.id === q.module_id) && q.status === 'published',
      );
      const topicScores = new Map<string, number[]>();
      db()
        .attempts.filter((a) => quizzes.some((q) => q.id === a.quiz_id))
        .forEach((a) => {
          const q = quizzes.find((x) => x.id === a.quiz_id)!;
          a.answers.forEach((ans) => {
            const qq = q.questions.find((x) => x.id === ans.question_id);
            if (!qq) return;
            topicScores.set(qq.topic, [...(topicScores.get(qq.topic) ?? []), ans.is_correct ? 100 : 0]);
          });
        });
      return {
        course_id: c.id,
        lecture_dropoff: lectures.map((l, i) => {
          const prs = db().progress.filter((pr) => pr.lecture_id === l.id && users.has(pr.user_id));
          return {
            lecture_id: l.id,
            title: l.title,
            started: prs.length * scale + Math.round(40 * Math.pow(0.86, i)),
            completed: prs.filter((x) => x.completed).length * scale + Math.round(32 * Math.pow(0.8, i)),
          };
        }),
        quiz_scores: quizzes.map((q) => {
          const s = db()
            .attempts.filter((a) => a.quiz_id === q.id && a.score != null)
            .map((a) => a.score!);
          return {
            quiz_title: q.title,
            avg_score: s.length ? Math.round(s.reduce((x, y) => x + y, 0) / s.length) : 0,
            attempts: s.length,
          };
        }),
        time_on_task: Array.from({ length: 8 }, (_, i) => ({
          week: `W${i + 1}`,
          minutes: Math.round(220 + 60 * Math.sin(i / 1.4) + i * 18),
        })),
        weak_topics: [...topicScores.entries()]
          .map(([topic, s]) => ({ topic, mastery: Math.round(s.reduce((x, y) => x + y, 0) / s.length) }))
          .sort((a, b) => a.mastery - b.mastery),
      };
    }),
  ),

  // ===== Admin (§8.7) =====
  http.get(
    p('/admin/users'),
    route(({ request, url }) => {
      const u = authUser(request);
      requireRole(u, 'admin');
      const q = (url.searchParams.get('q') ?? '').toLowerCase();
      const role = url.searchParams.get('role') ?? '';
      const status = url.searchParams.get('status') ?? '';
      const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
      const pageSize = 10;
      let list = db().users;
      if (q) list = list.filter((x) => `${x.full_name} ${x.email}`.toLowerCase().includes(q));
      if (role) list = list.filter((x) => x.roles.includes(role as Role));
      if (status) list = list.filter((x) => (status === 'active' ? x.is_active : !x.is_active));
      return {
        data: list.slice((page - 1) * pageSize, page * pageSize).map(userOut),
        page,
        page_size: pageSize,
        total: list.length,
      };
    }),
  ),
  http.put(
    p('/admin/users/:id/role'),
    route<{ id: string }>(async ({ request, params }) => {
      const u = authUser(request);
      requireRole(u, 'admin');
      const target = db().users.find((x) => x.id === params.id) ?? fail(404, 'NOT_FOUND', 'User not found.');
      const b = await body<{ roles?: Role[] }>(request);
      const roles = (b.roles ?? []).filter((r) => ['student', 'instructor', 'admin'].includes(r));
      if (!roles.length) fail(400, 'VALIDATION_ERROR', 'A user needs at least one role.', 'roles');
      if (target.id === u.id && !roles.includes('admin'))
        fail(400, 'VALIDATION_ERROR', 'You can’t remove your own admin role.');
      const before = [...target.roles];
      target.roles = roles;
      audit(u.id, 'user.roles', 'user', target.id);
      const added = roles.filter((r) => !before.includes(r));
      if (added.length)
        notify(
          target.id,
          'Your role was updated',
          `An admin gave you ${added.join(' and ')} access.`,
          added.includes('instructor') ? '/instructor' : added.includes('admin') ? '/admin' : null,
        );
      return userOut(target);
    }),
  ),
  http.put(
    p('/admin/users/:id/suspend'),
    route<{ id: string }>(async ({ request, params }) => {
      const u = authUser(request);
      requireRole(u, 'admin');
      const target = db().users.find((x) => x.id === params.id) ?? fail(404, 'NOT_FOUND', 'User not found.');
      if (target.id === u.id) fail(400, 'VALIDATION_ERROR', 'You can’t suspend your own account.');
      const b = await body<{ suspended?: boolean }>(request);
      target.is_active = !b.suspended;
      if (b.suspended) db().refresh_tokens = db().refresh_tokens.filter((t) => t.split('.')[1] !== target.id);
      audit(u.id, b.suspended ? 'user.suspend' : 'user.reactivate', 'user', target.id);
      return userOut(target);
    }),
  ),
  http.delete(
    p('/admin/users/:id'),
    route<{ id: string }>(({ request, params }) => {
      const u = authUser(request);
      requireRole(u, 'admin');
      if (params.id === u.id) fail(400, 'VALIDATION_ERROR', 'You can’t delete your own account.');
      if (db().courses.some((c) => c.instructor_id === params.id))
        fail(409, 'HAS_COURSES', 'This instructor still owns courses. Reassign or archive them first.');
      db().users = db().users.filter((x) => x.id !== params.id);
      db().enrollments = db().enrollments.filter((e) => e.user_id !== params.id);
      audit(u.id, 'user.delete', 'user', params.id);
      return new HttpResponse(null, { status: 204 });
    }),
  ),
  http.get(
    p('/admin/courses/pending'),
    route(({ request }) => {
      requireRole(authUser(request), 'admin');
      return db()
        .courses.filter((c) => c.status === 'pending')
        .map(courseOut)
        .sort((a, b) => a.created_at.localeCompare(b.created_at));
    }),
  ),
  http.get(
    p('/admin/courses'),
    route(({ request }) => {
      requireRole(authUser(request), 'admin');
      return db()
        .courses.filter((c) => c.status !== 'draft')
        .map(courseOut);
    }),
  ),
  http.get(
    p('/admin/analytics/overview'),
    route(({ request }) => {
      requireRole(authUser(request), 'admin');
      const d = db();
      const months = Array.from({ length: 8 }, (_, i) => {
        const dt = new Date();
        dt.setDate(1);
        dt.setMonth(dt.getMonth() - (7 - i));
        return { key: dt.toISOString().slice(0, 7), label: dt.toLocaleString('en', { month: 'short' }) };
      });
      const revenue = d.payments.filter((x) => x.status === 'success');
      const totalEnroll = d.courses.reduce((s, c) => s + c.base_enrollments, 0) + d.enrollments.length;
      const completions = d.enrollments.filter((e) => progressPercent(e.user_id, e.course_id) >= 100).length;
      return {
        dau: 1240 + d.activity.filter((a) => a.date === isoDate(new Date())).length,
        total_users: 24_180 + d.users.length,
        total_enrollments: totalEnroll,
        completion_rate: Math.round(((completions + 0.31 * totalEnroll) / totalEnroll) * 1000) / 10,
        revenue: revenue.reduce((s, x) => s + x.amount, 0) * 37,
        pending_courses: d.courses.filter((c) => c.status === 'pending').length,
        flagged_posts: d.posts.filter((x) => x.is_flagged && !x.removed).length,
        dau_series: Array.from({ length: 30 }, (_, i) => ({
          date: isoDate(new Date(Date.now() - (29 - i) * 86400000)),
          dau: Math.round(1050 + i * 7 + 140 * Math.sin(i / 2.2) + ((i * 37) % 60)),
        })),
        enrollment_series: months.map((m, i) => ({
          month: m.label,
          enrollments: 1800 + i * 260 + ((i * 131) % 300),
          completions: 520 + i * 95 + ((i * 71) % 120),
        })),
        revenue_series: months.map((m) => ({
          month: m.label,
          revenue:
            revenue.filter((x) => x.created_at.startsWith(m.key)).reduce((s, x) => s + x.amount, 0) * 37,
        })),
        category_split: CATEGORIES.map((cat) => ({
          category: cat,
          courses: d.courses.filter((c) => c.category === cat && c.status === 'approved').length,
        })).filter((x) => x.courses > 0),
      };
    }),
  ),
  http.get(
    p('/admin/moderation/flagged-posts'),
    route(({ request }) => {
      requireRole(authUser(request), 'admin');
      return db()
        .posts.filter((x) => x.is_flagged && !x.removed)
        .map((x) => {
          const t = db().threads.find((y) => y.id === x.thread_id)!;
          const pu = db().users.find((y) => y.id === x.user_id);
          return {
            ...x,
            author_name: pu?.full_name ?? 'Deleted user',
            author_role: pu ? primaryRole(pu) : 'student',
            thread_title: t.title,
            course_id: t.course_id,
            course_title: getCourse(t.course_id).title,
          };
        });
    }),
  ),
  http.post(
    p('/admin/moderation/posts/:id'),
    route<{ id: string }>(async ({ request, params }) => {
      const u = authUser(request);
      requireRole(u, 'admin', 'instructor');
      const post = db().posts.find((x) => x.id === params.id) ?? fail(404, 'NOT_FOUND', 'Post not found.');
      // PRD §11: instructors moderate their own course threads; admins moderate platform-wide
      const thread = db().threads.find((t) => t.id === post.thread_id)!;
      if (!ownsCourse(u, getCourse(thread.course_id)))
        fail(403, 'FORBIDDEN', 'You can only moderate posts in your own courses.');
      const b = await body<{ action?: 'dismiss' | 'remove' }>(request);
      if (b.action === 'remove') post.removed = true;
      post.is_flagged = false;
      audit(u.id, `post.${b.action}`, 'discussion_post', post.id);
      return { ok: true };
    }),
  ),
  http.get(
    p('/admin/audit-logs'),
    route(({ request }) => {
      requireRole(authUser(request), 'admin');
      return db()
        .audit_logs.slice(0, 50)
        .map((l) => ({ ...l, actor_name: userName(l.actor_id) }));
    }),
  ),

  // Health check (PRD §6 observability) — for the gateway and uptime monitoring
  http.get(p('/health'), () => HttpResponse.json({ status: 'ok', mode: 'mock' })),
];

// ---------- lecture slides PDF ----------
async function renderSlidesPdf(course: string, lecture: string, points: string[], instructor: string) {
  const pdf = await PDFDocument.create();
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(0.12, 0.23, 0.54);
  const ink = rgb(0.08, 0.12, 0.2);
  const W = 842;
  const H = 474;
  const wrap = (text: string, size: number, max: number, font = sans) => {
    const words = text.split(' ');
    const lines: string[] = [];
    let line = '';
    for (const w of words) {
      const t = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(t, size) > max && line) {
        lines.push(line);
        line = w;
      } else line = t;
    }
    if (line) lines.push(line);
    return lines;
  };
  // title slide
  const cover = pdf.addPage([W, H]);
  cover.drawRectangle({ x: 0, y: 0, width: W, height: H, color: navy });
  cover.drawRectangle({ x: 60, y: 150, width: 120, height: 8, color: rgb(1, 0.85, 0.3) });
  wrap(lecture, 34, W - 120, bold).forEach((ln, i) =>
    cover.drawText(ln, { x: 60, y: 300 - i * 42, size: 34, font: bold, color: rgb(1, 1, 1) }),
  );
  cover.drawText(course, { x: 60, y: 120, size: 14, font: sans, color: rgb(0.85, 0.88, 1) });
  cover.drawText(instructor, { x: 60, y: 98, size: 12, font: sans, color: rgb(0.75, 0.8, 0.95) });
  // content slides: two key points per slide
  for (let i = 0; i < points.length; i += 2) {
    const page = pdf.addPage([W, H]);
    page.drawText(`${lecture} — key points`, { x: 50, y: H - 60, size: 18, font: bold, color: navy });
    page.drawLine({ start: { x: 50, y: H - 74 }, end: { x: W - 50, y: H - 74 }, thickness: 1, color: navy });
    let y = H - 130;
    points.slice(i, i + 2).forEach((pt) => {
      page.drawRectangle({ x: 50, y: y + 4, width: 8, height: 8, color: rgb(1, 0.85, 0.3) });
      wrap(pt, 20, W - 150).forEach((ln) => {
        page.drawText(ln, { x: 72, y, size: 20, font: sans, color: ink });
        y -= 30;
      });
      y -= 30;
    });
    page.drawText(`${course} · slide ${i / 2 + 2}`, {
      x: 50,
      y: 24,
      size: 9,
      font: sans,
      color: rgb(0.45, 0.5, 0.6),
    });
  }
  return pdf.save();
}

// ---------- certificate PDF (stand-in for the Puppeteer/pdf-lib job) ----------
async function renderCertificatePdf(
  name: string,
  course: string,
  instructor: string,
  issuedAt: string,
  id: string,
) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([842, 595]);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const navy = rgb(0.12, 0.23, 0.54);
  const marker = rgb(1, 0.85, 0.3);
  page.drawRectangle({ x: 24, y: 24, width: 794, height: 547, borderColor: navy, borderWidth: 2 });
  page.drawRectangle({ x: 36, y: 36, width: 770, height: 523, borderColor: navy, borderWidth: 0.5 });
  const center = (text: string, y: number, size: number, font = serif, color = rgb(0.08, 0.12, 0.2)) =>
    page.drawText(text, { x: (842 - font.widthOfTextAtSize(text, size)) / 2, y, size, font, color });
  center('VERTEXON LEARNING', 500, 12, sans, navy);
  center('Certificate of Completion', 440, 36, serifBold, navy);
  center('This certifies that', 395, 14, serif);
  const nameW = serifBold.widthOfTextAtSize(name, 34);
  page.drawRectangle({
    x: (842 - nameW) / 2 - 10,
    y: 333,
    width: nameW + 20,
    height: 18,
    color: marker,
    opacity: 0.7,
  });
  center(name, 340, 34, serifBold);
  center('has successfully completed', 300, 14, serif);
  center(course, 265, 22, serifBold, navy);
  const date = new Date(issuedAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  page.drawLine({ start: { x: 140, y: 150 }, end: { x: 340, y: 150 }, thickness: 0.8, color: navy });
  page.drawLine({ start: { x: 502, y: 150 }, end: { x: 702, y: 150 }, thickness: 0.8, color: navy });
  page.drawText(instructor, {
    x: 240 - serif.widthOfTextAtSize(instructor, 13) / 2,
    y: 160,
    size: 13,
    font: serif,
  });
  page.drawText('Instructor', {
    x: 240 - sans.widthOfTextAtSize('Instructor', 9) / 2,
    y: 136,
    size: 9,
    font: sans,
  });
  page.drawText(date, { x: 602 - serif.widthOfTextAtSize(date, 13) / 2, y: 160, size: 13, font: serif });
  page.drawText('Date issued', {
    x: 602 - sans.widthOfTextAtSize('Date issued', 9) / 2,
    y: 136,
    size: 9,
    font: sans,
  });
  center(`Certificate ID ${id}`, 70, 8, sans, rgb(0.45, 0.5, 0.6));
  return pdf.save();
}
