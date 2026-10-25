// In-browser mock database. Shapes follow PRD §7 tables; persisted to
// localStorage so demo changes survive reloads. Used only when VITE_USE_MOCKS=true.

import type { Difficulty, QuestionType, Role, RubricItem } from '@/types';
import { CATEGORIES, COURSE_SPECS, STUDENT_NAMES, VIDEO_POOL } from './seedContent';

const STORAGE_KEY = 'lms-mock-db-v5';

export interface UserRow {
  id: string;
  full_name: string;
  email: string;
  password: string;
  avatar_url: string | null;
  is_active: boolean;
  roles: Role[];
  created_at: string;
}
export interface CourseRow {
  id: string;
  instructor_id: string;
  title: string;
  description: string;
  category: string;
  difficulty: Difficulty;
  thumbnail_url: string | null;
  price: number;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'archived';
  rating: number;
  rating_count: number;
  base_enrollments: number;
  created_at: string;
}
export interface ModuleRow {
  id: string;
  course_id: string;
  title: string;
  order_index: number;
}
export interface LectureRow {
  id: string;
  module_id: string;
  title: string;
  video_url: string | null;
  transcript: string;
  duration_seconds: number;
  order_index: number;
  resource_urls: string[];
}
export interface EnrollmentRow {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
}
export interface ProgressRow {
  user_id: string;
  lecture_id: string;
  watched_seconds: number;
  completed: boolean;
  last_watched_at: string | null;
}
export interface NoteRow {
  id: string;
  user_id: string;
  lecture_id: string;
  timestamp_seconds: number;
  content: string;
  created_at: string;
}
export interface BookmarkRow {
  id: string;
  user_id: string;
  lecture_id: string;
  timestamp_seconds: number;
  label?: string;
  created_at: string;
}
export interface AssignmentRow {
  id: string;
  course_id: string;
  title: string;
  instructions: string;
  rubric: RubricItem[];
  due_date: string;
}
export interface SubmissionRow {
  id: string;
  assignment_id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  submitted_at: string;
  grade: number | null;
  feedback: string | null;
}
export interface QuestionRow {
  id: string;
  question_text: string;
  question_type: QuestionType;
  order_index: number;
  topic: string;
  options: { id: string; option_text: string; is_correct: boolean }[];
  accepted_answers?: string[];
}
export interface QuizRow {
  id: string;
  module_id: string;
  title: string;
  is_ai_generated: boolean;
  generated_from_lecture_id: string | null;
  status: 'draft' | 'published';
  questions: QuestionRow[];
}
export interface AttemptRow {
  id: string;
  quiz_id: string;
  user_id: string;
  score: number | null;
  started_at: string;
  submitted_at: string | null;
  answers: {
    question_id: string;
    selected_option_ids?: string[];
    text_answer?: string;
    is_correct: boolean;
  }[];
}
export interface ChatSessionRow {
  id: string;
  user_id: string;
  course_id: string;
  mode: Difficulty;
  created_at: string;
}
export interface ChatMessageRow {
  id: string;
  session_id: string;
  sender: 'user' | 'ai';
  content: string;
  sources: { lecture_id: string; lecture_title: string; timestamp_seconds: number; snippet?: string }[];
  created_at: string;
}
export interface ThreadRow {
  id: string;
  course_id: string;
  created_by: string;
  title: string;
  created_at: string;
}
export interface PostRow {
  id: string;
  thread_id: string;
  parent_id: string | null;
  user_id: string;
  content: string;
  is_flagged: boolean;
  flag_reason: string | null;
  removed: boolean;
  created_at: string;
}

export interface MockDb {
  users: UserRow[];
  courses: CourseRow[];
  modules: ModuleRow[];
  lectures: LectureRow[];
  enrollments: EnrollmentRow[];
  progress: ProgressRow[];
  notes: NoteRow[];
  bookmarks: BookmarkRow[];
  assignments: AssignmentRow[];
  submissions: SubmissionRow[];
  quizzes: QuizRow[];
  attempts: AttemptRow[];
  certificates: { id: string; user_id: string; course_id: string; issued_at: string }[];
  badges: { id: number; name: string; description: string; icon: string }[];
  user_badges: { user_id: string; badge_id: number; earned_at: string }[];
  activity: { user_id: string; date: string }[];
  chat_sessions: ChatSessionRow[];
  chat_messages: ChatMessageRow[];
  study_plans: { id: string; user_id: string; course_id: string; plan_json: unknown; generated_at: string }[];
  mastery: { user_id: string; course_id: string; topic: string; mastery: number }[];
  threads: ThreadRow[];
  posts: PostRow[];
  announcements: { id: string; course_id: string; posted_by: string; content: string; created_at: string }[];
  notifications: {
    id: string;
    user_id: string;
    title: string;
    body: string;
    link: string | null;
    is_read: boolean;
    created_at: string;
  }[];
  course_approvals: {
    id: string;
    course_id: string;
    reviewed_by: string;
    decision: 'approved' | 'rejected';
    comment: string;
    reviewed_at: string;
  }[];
  payments: {
    id: string;
    user_id: string;
    course_id: string;
    amount: number;
    status: 'success' | 'failed' | 'refunded';
    created_at: string;
  }[];
  audit_logs: {
    id: string;
    actor_id: string;
    action: string;
    entity: string;
    entity_id: string;
    created_at: string;
  }[];
  refresh_tokens: string[];
}

// ---------- helpers ----------
export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

export const nowIso = () => new Date().toISOString();
const daysAgo = (d: number, hour = 10) => {
  const t = new Date();
  t.setDate(t.getDate() - d);
  t.setHours(hour, 0, 0, 0);
  return t.toISOString();
};
const daysAhead = (d: number) => daysAgo(-d, 23);
export const isoDate = (d: Date | string) => new Date(d).toISOString().slice(0, 10);

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- seed ----------
function buildSeed(): MockDb {
  const rand = rng(42);
  const db: MockDb = {
    users: [],
    courses: [],
    modules: [],
    lectures: [],
    enrollments: [],
    progress: [],
    notes: [],
    bookmarks: [],
    assignments: [],
    submissions: [],
    quizzes: [],
    attempts: [],
    certificates: [],
    badges: [],
    user_badges: [],
    activity: [],
    chat_sessions: [],
    chat_messages: [],
    study_plans: [],
    mastery: [],
    threads: [],
    posts: [],
    announcements: [],
    notifications: [],
    course_approvals: [],
    payments: [],
    audit_logs: [],
    refresh_tokens: [],
  };

  const PASSWORD = 'SecurePass123';
  db.users.push(
    {
      id: 'u-ananya',
      full_name: 'Ananya Sharma',
      email: 'ananya@example.com',
      password: PASSWORD,
      avatar_url: null,
      is_active: true,
      roles: ['student'],
      created_at: daysAgo(120),
    },
    {
      id: 'u-rohit',
      full_name: 'Rohit Menon',
      email: 'rohit@example.com',
      password: PASSWORD,
      avatar_url: null,
      is_active: true,
      roles: ['instructor'],
      created_at: daysAgo(300),
    },
    {
      id: 'u-kavya',
      full_name: 'Kavya Subramaniam',
      email: 'kavya@example.com',
      password: PASSWORD,
      avatar_url: null,
      is_active: true,
      roles: ['instructor'],
      created_at: daysAgo(280),
    },
    {
      id: 'u-meera',
      full_name: 'Meera Iyer',
      email: 'meera@example.com',
      password: PASSWORD,
      avatar_url: null,
      is_active: true,
      roles: ['admin'],
      created_at: daysAgo(400),
    },
  );
  STUDENT_NAMES.forEach((name, i) => {
    db.users.push({
      id: `u-s${i + 1}`,
      full_name: name,
      email: `${name.split(' ')[0].toLowerCase()}@example.com`,
      password: PASSWORD,
      avatar_url: null,
      is_active: i !== 7,
      roles: ['student'],
      created_at: daysAgo(10 + i * 9),
    });
  });

  // Courses, modules, lectures
  let videoIdx = 0;
  for (const spec of COURSE_SPECS) {
    db.courses.push({
      id: spec.id,
      instructor_id: spec.instructor,
      title: spec.title,
      description: spec.description,
      category: spec.category,
      difficulty: spec.difficulty,
      thumbnail_url: null,
      price: spec.price,
      status: spec.status,
      rating: spec.rating,
      rating_count: spec.rating_count,
      base_enrollments: spec.enrollment_count,
      created_at: spec.created_at,
    });
    spec.modules.forEach((m, mi) => {
      const moduleId = `${spec.id}-m${mi + 1}`;
      db.modules.push({ id: moduleId, course_id: spec.id, title: m.title, order_index: mi });
      m.lectures.forEach((l, li) => {
        db.lectures.push({
          id: `${moduleId}-l${li + 1}`,
          module_id: moduleId,
          title: l.title,
          video_url: VIDEO_POOL[videoIdx++ % VIDEO_POOL.length],
          transcript: l.transcript,
          duration_seconds: l.minutes * 60,
          order_index: li,
          resource_urls: [
            `/api/v1/lectures/${moduleId}-l${li + 1}/resources/${l.title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, '')}-slides.pdf`,
          ],
        });
      });
    });
  }

  const lecturesOf = (courseId: string) =>
    db.modules
      .filter((m) => m.course_id === courseId)
      .flatMap((m) => db.lectures.filter((l) => l.module_id === m.id));

  // Enrollments + progress for Ananya (persona: 4 courses)
  const ananyaPlan: [string, number][] = [
    ['c-dsa', 4],
    ['c-react', 1],
    ['c-ml', 1],
    ['c-sql', 99],
  ];
  ananyaPlan.forEach(([courseId, done], i) => {
    db.enrollments.push({
      id: `e-ananya-${courseId}`,
      user_id: 'u-ananya',
      course_id: courseId,
      enrolled_at: daysAgo(60 - i * 10),
    });
    lecturesOf(courseId).forEach((l, li) => {
      if (li < done)
        db.progress.push({
          user_id: 'u-ananya',
          lecture_id: l.id,
          watched_seconds: l.duration_seconds,
          completed: true,
          last_watched_at: daysAgo(20 - li),
        });
      else if (li === done)
        db.progress.push({
          user_id: 'u-ananya',
          lecture_id: l.id,
          watched_seconds: Math.round(l.duration_seconds * 0.35),
          completed: false,
          last_watched_at: daysAgo(0, 8),
        });
    });
  });

  // Other students — random enrollments and progress
  const approved = COURSE_SPECS.filter((c) => c.status === 'approved').map((c) => c.id);
  db.users
    .filter((u) => u.id.startsWith('u-s'))
    .forEach((u) => {
      approved.forEach((cid) => {
        if (rand() < 0.55) {
          db.enrollments.push({
            id: uid(),
            user_id: u.id,
            course_id: cid,
            enrolled_at: daysAgo(Math.floor(rand() * 90)),
          });
          const ls = lecturesOf(cid);
          const done = Math.floor(rand() * (ls.length + 1));
          ls.slice(0, done).forEach((l) =>
            db.progress.push({
              user_id: u.id,
              lecture_id: l.id,
              watched_seconds: l.duration_seconds,
              completed: true,
              last_watched_at: daysAgo(Math.floor(rand() * 30)),
            }),
          );
          if (done < ls.length && rand() < 0.6)
            db.progress.push({
              user_id: u.id,
              lecture_id: ls[done].id,
              watched_seconds: Math.round(ls[done].duration_seconds * rand()),
              completed: false,
              last_watched_at: daysAgo(Math.floor(rand() * 10)),
            });
          if (cid !== 'c-dsa' && cid !== 'c-sql')
            db.payments.push({
              id: uid(),
              user_id: u.id,
              course_id: cid,
              amount: COURSE_SPECS.find((c) => c.id === cid)!.price,
              status: 'success',
              created_at: daysAgo(Math.floor(rand() * 180)),
            });
        }
      });
    });
  // Ananya's paid enrollments
  db.payments.push(
    {
      id: uid(),
      user_id: 'u-ananya',
      course_id: 'c-react',
      amount: 1499,
      status: 'success',
      created_at: daysAgo(50),
    },
    {
      id: uid(),
      user_id: 'u-ananya',
      course_id: 'c-ml',
      amount: 2499,
      status: 'success',
      created_at: daysAgo(40),
    },
  );
  // Synthetic historic revenue for admin charts
  for (let m = 0; m < 8; m++) {
    for (let k = 0; k < 6 + m * 2; k++) {
      const cid = ['c-react', 'c-ml', 'c-sysdesign', 'c-writing'][k % 4];
      db.payments.push({
        id: uid(),
        user_id: 'u-s1',
        course_id: cid,
        amount: COURSE_SPECS.find((c) => c.id === cid)!.price,
        status: k % 11 === 0 ? 'refunded' : 'success',
        created_at: daysAgo(m * 30 + Math.floor(rand() * 28)),
      });
    }
  }

  // Quizzes
  const q = (
    text: string,
    type: QuestionType,
    topic: string,
    opts: [string, boolean][],
    accepted?: string[],
  ): QuestionRow => ({
    id: uid(),
    question_text: text,
    question_type: type,
    order_index: 0,
    topic,
    options: opts.map(([option_text, is_correct]) => ({ id: uid(), option_text, is_correct })),
    accepted_answers: accepted,
  });
  const withOrder = (qs: QuestionRow[]) => qs.map((x, i) => ({ ...x, order_index: i }));

  db.quizzes.push(
    {
      id: 'qz-dsa-complexity',
      module_id: 'c-dsa-m1',
      title: 'Complexity Check',
      is_ai_generated: false,
      generated_from_lecture_id: null,
      status: 'published',
      questions: withOrder([
        q('What is the time complexity of binary search on a sorted array?', 'mcq', 'Complexity Analysis', [
          ['O(n)', false],
          ['O(log n)', true],
          ['O(n log n)', false],
          ['O(1)', false],
        ]),
        q(
          'Which of these are dropped when simplifying Big-O expressions?',
          'multi_select',
          'Complexity Analysis',
          [
            ['Constant factors', true],
            ['Lower order terms', true],
            ['The dominant term', false],
            ['The input size n', false],
          ],
        ),
        q(
          'A recursive function that recurses n levels deep uses how much stack space? (write in Big-O)',
          'short_answer',
          'Complexity Analysis',
          [],
          ['O(n)', 'on', 'o(n)'],
        ),
        q(
          'Using a hash map to speed up a search is an example of which trade-off?',
          'mcq',
          'Complexity Analysis',
          [
            ['Time-space trade-off', true],
            ['Stability trade-off', false],
            ['Precision-recall trade-off', false],
            ['No trade-off', false],
          ],
        ),
      ]),
    },
    {
      id: 'qz-dsa-sorting',
      module_id: 'c-dsa-m2',
      title: 'Sorting & Searching',
      is_ai_generated: false,
      generated_from_lecture_id: null,
      status: 'published',
      questions: withOrder([
        q('When does quicksort degrade to O(n^2)?', 'mcq', 'Quicksort', [
          ['When the pivot is always the smallest or largest element', true],
          ['When the array has duplicates', false],
          ['When the array is random', false],
          ['Never', false],
        ]),
        q('Which sorting algorithms run in O(n log n) in the worst case?', 'multi_select', 'Merge Sort', [
          ['Merge sort', true],
          ['Quicksort with first-element pivot', false],
          ['Heap sort', true],
          ['Bubble sort', false],
        ]),
        q(
          'Which property means equal elements keep their original order?',
          'short_answer',
          'Merge Sort',
          [],
          ['stable', 'stability'],
        ),
        q('Binary search requires the data to be…', 'mcq', 'Binary Search', [
          ['Sorted (or the condition monotonic)', true],
          ['Stored in a linked list', false],
          ['Unique', false],
          ['Smaller than 1000 items', false],
        ]),
        q('Which pivot strategies help quicksort avoid its worst case?', 'multi_select', 'Quicksort', [
          ['Random pivot', true],
          ['Median of three', true],
          ['Always the first element', false],
          ['Always the last element', false],
        ]),
      ]),
    },
    {
      id: 'qz-dsa-graphs',
      module_id: 'c-dsa-m3',
      title: 'Trees & Graphs',
      is_ai_generated: false,
      generated_from_lecture_id: null,
      status: 'published',
      questions: withOrder([
        q('Which traversal finds the shortest path in an unweighted graph?', 'mcq', 'Graph Traversal', [
          ['Breadth first search', true],
          ['Depth first search', false],
          ['In-order traversal', false],
          ['Binary search', false],
        ]),
        q('What is the time complexity of BFS and DFS?', 'mcq', 'Graph Traversal', [
          ['O(V + E)', true],
          ['O(V * E)', false],
          ['O(log V)', false],
          ['O(E^2)', false],
        ]),
        q(
          'An in-order traversal of a BST visits values in what order?',
          'short_answer',
          'Binary Search Trees',
          [],
          ['sorted', 'sorted order', 'ascending', 'increasing'],
        ),
      ]),
    },
    {
      id: 'qz-react-hooks',
      module_id: 'c-react-m2',
      title: 'Hooks Fundamentals',
      is_ai_generated: false,
      generated_from_lecture_id: null,
      status: 'published',
      questions: withOrder([
        q('What should you return from useEffect to avoid memory leaks?', 'mcq', 'useEffect', [
          ['A cleanup function', true],
          ['A promise', false],
          ['JSX', false],
          ['Nothing, ever', false],
        ]),
        q('Which statements about TanStack Query are true?', 'multi_select', 'Data Fetching', [
          ['Queries are identified by query keys', true],
          ['Mutations should invalidate related queries', true],
          ['It replaces the need for React', false],
          ['staleTime controls freshness', true],
        ]),
        q('Why shouldn’t you use the array index as a list key?', 'mcq', 'Lists and Keys', [
          ['It breaks when items are reordered or removed', true],
          ['It is slower to compute', false],
          ['TypeScript forbids it', false],
          ['Keys must be strings', false],
        ]),
      ]),
    },
    {
      id: 'qz-sql-basics',
      module_id: 'c-sql-m1',
      title: 'SQL Basics',
      is_ai_generated: false,
      generated_from_lecture_id: null,
      status: 'published',
      questions: withOrder([
        q('Which join keeps every row from the left table?', 'mcq', 'Joins', [
          ['LEFT JOIN', true],
          ['INNER JOIN', false],
          ['CROSS JOIN', false],
          ['SELF JOIN', false],
        ]),
        q('Which clause filters groups after aggregation?', 'short_answer', 'Aggregation', [], ['having']),
      ]),
    },
    {
      id: 'qz-ml-eval',
      module_id: 'c-ml-m2',
      title: 'Model Evaluation',
      is_ai_generated: false,
      generated_from_lecture_id: null,
      status: 'published',
      questions: withOrder([
        q('Which metric is the harmonic mean of precision and recall?', 'mcq', 'Metrics', [
          ['F1 score', true],
          ['Accuracy', false],
          ['ROC', false],
          ['MSE', false],
        ]),
        q('Which techniques help reduce overfitting?', 'multi_select', 'Overfitting', [
          ['More training data', true],
          ['L2 regularisation', true],
          ['Training longer on the same data', false],
          ['Cross validation for model selection', true],
        ]),
      ]),
    },
  );
  // An AI-generated draft awaiting instructor review (FR-A5 / FR-I4)
  db.quizzes.push({
    id: 'qz-dsa-ai-draft',
    module_id: 'c-dsa-m2',
    title: 'Quicksort Quiz',
    is_ai_generated: true,
    generated_from_lecture_id: 'c-dsa-m2-l2',
    status: 'draft',
    questions: withOrder([
      q('Quicksort partitions the array around a ____ element.', 'mcq', 'Quicksort', [
        ['pivot', true],
        ['median', false],
        ['sentinel', false],
        ['root', false],
      ]),
      q('On average, quicksort runs in which time complexity?', 'mcq', 'Quicksort', [
        ['O(n log n)', true],
        ['O(n^2)', false],
        ['O(n)', false],
        ['O(log n)', false],
      ]),
      q('Is quicksort stable by default?', 'mcq', 'Quicksort', [
        ['No', true],
        ['Yes', false],
      ]),
    ]),
  });

  // Quiz attempts
  const scoreAttempt = (quiz: QuizRow, userId: string, correctness: boolean[], when: string) => {
    const answers = quiz.questions.map((qq, i) => {
      const ok = correctness[i % correctness.length];
      const correctIds = qq.options.filter((o) => o.is_correct).map((o) => o.id);
      const wrong = qq.options.find((o) => !o.is_correct);
      return qq.question_type === 'short_answer'
        ? { question_id: qq.id, text_answer: ok ? qq.accepted_answers![0] : 'not sure', is_correct: ok }
        : {
            question_id: qq.id,
            selected_option_ids: ok ? correctIds : wrong ? [wrong.id] : [],
            is_correct: ok,
          };
    });
    const score = Math.round((answers.filter((a) => a.is_correct).length / answers.length) * 100);
    db.attempts.push({
      id: uid(),
      quiz_id: quiz.id,
      user_id: userId,
      score,
      started_at: when,
      submitted_at: when,
      answers,
    });
  };
  const quizById = (id: string) => db.quizzes.find((x) => x.id === id)!;
  scoreAttempt(quizById('qz-dsa-complexity'), 'u-ananya', [true, true, true, false], daysAgo(14));
  scoreAttempt(quizById('qz-dsa-sorting'), 'u-ananya', [false, true, true, true, false], daysAgo(5));
  scoreAttempt(quizById('qz-sql-basics'), 'u-ananya', [true, true], daysAgo(25));
  db.users
    .filter((u) => u.id.startsWith('u-s'))
    .forEach((u, i) => {
      ['qz-dsa-complexity', 'qz-dsa-sorting', 'qz-dsa-graphs', 'qz-react-hooks', 'qz-ml-eval'].forEach(
        (qid) => {
          const quiz = quizById(qid);
          const cid = db.modules.find((m) => m.id === quiz.module_id)!.course_id;
          if (db.enrollments.some((e) => e.user_id === u.id && e.course_id === cid) && rand() < 0.8) {
            scoreAttempt(
              quiz,
              u.id,
              quiz.questions.map(() => rand() < 0.45 + i * 0.03),
              daysAgo(Math.floor(rand() * 40)),
            );
          }
        },
      );
    });

  // Mastery (FR-A8) for Ananya
  db.mastery.push(
    { user_id: 'u-ananya', course_id: 'c-dsa', topic: 'Complexity Analysis', mastery: 82 },
    { user_id: 'u-ananya', course_id: 'c-dsa', topic: 'Quicksort', mastery: 38 },
    { user_id: 'u-ananya', course_id: 'c-dsa', topic: 'Merge Sort', mastery: 71 },
    { user_id: 'u-ananya', course_id: 'c-dsa', topic: 'Binary Search', mastery: 55 },
    { user_id: 'u-ananya', course_id: 'c-dsa', topic: 'Graph Traversal', mastery: 20 },
    { user_id: 'u-ananya', course_id: 'c-dsa', topic: 'Binary Search Trees', mastery: 30 },
    { user_id: 'u-ananya', course_id: 'c-react', topic: 'Components', mastery: 64 },
    { user_id: 'u-ananya', course_id: 'c-react', topic: 'useEffect', mastery: 35 },
  );

  // Assignments
  db.assignments.push(
    {
      id: 'as-dsa-1',
      course_id: 'c-dsa',
      title: 'Implement Quicksort with Median-of-Three',
      instructions:
        'Implement quicksort in any language using the median-of-three pivot rule. Include tests on sorted, reverse-sorted and random input, and a short README explaining the time complexity of each case.',
      rubric: [
        { criterion: 'Correctness', points: 40 },
        { criterion: 'Pivot strategy', points: 25 },
        { criterion: 'Tests', points: 20 },
        { criterion: 'Complexity explanation', points: 15 },
      ],
      due_date: daysAhead(3),
    },
    {
      id: 'as-dsa-2',
      course_id: 'c-dsa',
      title: 'BFS Shortest Path',
      instructions:
        'Given a grid with walls, return the length of the shortest path from the top-left to the bottom-right cell using BFS. Submit your code as a ZIP.',
      rubric: [
        { criterion: 'Correctness', points: 50 },
        { criterion: 'Complexity', points: 30 },
        { criterion: 'Code quality', points: 20 },
      ],
      due_date: daysAhead(10),
    },
    {
      id: 'as-dsa-0',
      course_id: 'c-dsa',
      title: 'Big-O Worksheet',
      instructions:
        'Analyse the time and space complexity of the 8 snippets in the attached worksheet. Submit as PDF.',
      rubric: [
        { criterion: 'Accuracy', points: 80 },
        { criterion: 'Explanations', points: 20 },
      ],
      due_date: daysAgo(12),
    },
    {
      id: 'as-react-1',
      course_id: 'c-react',
      title: 'Build a Typed Todo App',
      instructions:
        'Build a todo app with React and TypeScript. Use useState for items and persist them with useEffect + localStorage. Submit a ZIP of the src folder.',
      rubric: [
        { criterion: 'Functionality', points: 50 },
        { criterion: 'Types', points: 30 },
        { criterion: 'Styling', points: 20 },
      ],
      due_date: daysAhead(6),
    },
    {
      id: 'as-ml-1',
      course_id: 'c-ml',
      title: 'Evaluate a Spam Classifier',
      instructions:
        'Compute precision, recall and F1 for the provided predictions and explain which metric matters most for spam filtering.',
      rubric: [
        { criterion: 'Metrics', points: 60 },
        { criterion: 'Reasoning', points: 40 },
      ],
      due_date: daysAhead(14),
    },
  );
  db.submissions.push({
    id: uid(),
    assignment_id: 'as-dsa-0',
    user_id: 'u-ananya',
    file_name: 'bigo-worksheet.pdf',
    file_url: '#',
    submitted_at: daysAgo(13),
    grade: 88,
    feedback: 'Strong analysis. Recheck snippet 6 — the inner loop halves, so it is O(n log n), not O(n²).',
  });
  db.users
    .filter((u) => u.id.startsWith('u-s'))
    .slice(0, 7)
    .forEach((u, i) => {
      db.submissions.push({
        id: uid(),
        assignment_id: 'as-dsa-1',
        user_id: u.id,
        file_name: `quicksort-${u.full_name.split(' ')[0].toLowerCase()}.zip`,
        file_url: '#',
        submitted_at: daysAgo(i % 3),
        grade: i < 2 ? 70 + i * 12 : null,
        feedback: i < 2 ? 'Good tests. Explain the worst case more precisely.' : null,
      });
    });

  // Badges (FR-S9)
  db.badges.push(
    { id: 1, name: 'First Finish', description: 'Completed your first course', icon: 'graduation' },
    { id: 2, name: '7-Day Streak', description: 'Learned 7 days in a row', icon: 'flame' },
    { id: 3, name: 'Perfect Score', description: 'Scored 100% on a quiz', icon: 'target' },
    { id: 4, name: 'Curious Mind', description: 'Asked the AI tutor 10 questions', icon: 'sparkles' },
    { id: 5, name: 'Early Bird', description: 'Submitted an assignment 2+ days early', icon: 'sunrise' },
    { id: 6, name: 'Note Taker', description: 'Wrote 10 timestamped notes', icon: 'notebook' },
  );
  db.user_badges.push(
    { user_id: 'u-ananya', badge_id: 1, earned_at: daysAgo(22) },
    { user_id: 'u-ananya', badge_id: 3, earned_at: daysAgo(25) },
    { user_id: 'u-ananya', badge_id: 5, earned_at: daysAgo(13) },
  );
  db.certificates.push({
    id: 'cert-ananya-sql',
    user_id: 'u-ananya',
    course_id: 'c-sql',
    issued_at: daysAgo(22),
  });

  // Streak activity: last 5 days active + scattered history
  for (let d = 0; d < 35; d++) {
    if (d < 5 || (d > 6 && rand() < 0.55))
      db.activity.push({ user_id: 'u-ananya', date: isoDate(daysAgo(d)) });
  }

  // Notes & bookmarks
  db.notes.push(
    {
      id: uid(),
      user_id: 'u-ananya',
      lecture_id: 'c-dsa-m2-l2',
      timestamp_seconds: 312,
      content: 'Sorted input + first-element pivot = worst case. Use median of three!',
      created_at: daysAgo(3),
    },
    {
      id: uid(),
      user_id: 'u-ananya',
      lecture_id: 'c-dsa-m2-l1',
      timestamp_seconds: 540,
      content: 'Merge needs O(n) extra space — that is the trade-off vs quicksort.',
      created_at: daysAgo(6),
    },
  );
  db.bookmarks.push({
    id: uid(),
    user_id: 'u-ananya',
    lecture_id: 'c-dsa-m2-l2',
    timestamp_seconds: 842,
    label: 'Worst-case explanation',
    created_at: daysAgo(3),
  });

  // Forum
  db.threads.push(
    {
      id: 't-1',
      course_id: 'c-dsa',
      created_by: 'u-ananya',
      title: 'Why is quicksort still preferred if its worst case is O(n²)?',
      created_at: daysAgo(4),
    },
    {
      id: 't-2',
      course_id: 'c-dsa',
      created_by: 'u-s3',
      title: 'BFS vs DFS for detecting cycles?',
      created_at: daysAgo(2),
    },
    {
      id: 't-3',
      course_id: 'c-react',
      created_by: 'u-s5',
      title: 'useEffect runs twice in development — is that a bug?',
      created_at: daysAgo(1),
    },
  );
  db.posts.push(
    {
      id: uid(),
      thread_id: 't-1',
      parent_id: null,
      user_id: 'u-ananya',
      content: 'Merge sort is always O(n log n). So why do libraries still use quicksort variants?',
      is_flagged: false,
      flag_reason: null,
      removed: false,
      created_at: daysAgo(4),
    },
    {
      id: 'p-rohit-1',
      thread_id: 't-1',
      parent_id: null,
      user_id: 'u-rohit',
      content:
        'Great question. Quicksort sorts in place and has excellent cache behaviour, so its constant factors are small. With a random or median-of-three pivot the worst case is extremely unlikely.',
      is_flagged: false,
      flag_reason: null,
      removed: false,
      created_at: daysAgo(3),
    },
    {
      id: uid(),
      thread_id: 't-1',
      parent_id: 'p-rohit-1',
      user_id: 'u-s2',
      content: 'Also many libraries use introsort, which switches to heap sort if recursion gets too deep.',
      is_flagged: false,
      flag_reason: null,
      removed: false,
      created_at: daysAgo(3),
    },
    {
      id: uid(),
      thread_id: 't-2',
      parent_id: null,
      user_id: 'u-s3',
      content: 'For an undirected graph, can I use BFS to detect a cycle, or do I need DFS?',
      is_flagged: false,
      flag_reason: null,
      removed: false,
      created_at: daysAgo(2),
    },
    {
      id: 'p-flag-1',
      thread_id: 't-2',
      parent_id: null,
      user_id: 'u-s8',
      content: 'DM me for the full assignment answers, ₹200 only. Guaranteed full marks.',
      is_flagged: true,
      flag_reason: 'Spam / academic dishonesty',
      removed: false,
      created_at: daysAgo(1),
    },
    {
      id: uid(),
      thread_id: 't-3',
      parent_id: null,
      user_id: 'u-s5',
      content: 'My effect fetches twice in dev mode. Production is fine. What is going on?',
      is_flagged: false,
      flag_reason: null,
      removed: false,
      created_at: daysAgo(1),
    },
    {
      id: 'p-flag-2',
      thread_id: 't-3',
      parent_id: null,
      user_id: 'u-s10',
      content: 'This course is useless, the instructor clearly has no idea what they are doing.',
      is_flagged: true,
      flag_reason: 'Harassment',
      removed: false,
      created_at: daysAgo(0),
    },
  );

  // Announcements & notifications
  db.announcements.push(
    {
      id: uid(),
      course_id: 'c-dsa',
      posted_by: 'u-rohit',
      content: 'Live doubt-clearing session on Friday at 7 PM. Bring your quicksort questions!',
      created_at: daysAgo(1),
    },
    {
      id: uid(),
      course_id: 'c-react',
      posted_by: 'u-kavya',
      content: 'Module 3 (Testing) drops next Monday. Make sure you finish the hooks quiz first.',
      created_at: daysAgo(3),
    },
  );
  db.notifications.push(
    {
      id: uid(),
      user_id: 'u-ananya',
      title: 'Assignment due in 3 days',
      body: 'Implement Quicksort with Median-of-Three is due soon.',
      link: '/assignments',
      is_read: false,
      created_at: daysAgo(0, 7),
    },
    {
      id: uid(),
      user_id: 'u-ananya',
      title: 'New reply on your thread',
      body: 'Rohit Menon replied to “Why is quicksort still preferred…”',
      link: '/courses/c-dsa/forum/t-1',
      is_read: false,
      created_at: daysAgo(3),
    },
    {
      id: uid(),
      user_id: 'u-ananya',
      title: 'Assignment graded',
      body: 'Big-O Worksheet: 88/100',
      link: '/assignments',
      is_read: true,
      created_at: daysAgo(10),
    },
    {
      id: uid(),
      user_id: 'u-rohit',
      title: '7 new submissions',
      body: 'Implement Quicksort with Median-of-Three has new submissions to grade.',
      link: '/instructor/grading',
      is_read: false,
      created_at: daysAgo(0, 9),
    },
    {
      id: uid(),
      user_id: 'u-rohit',
      title: 'AI quiz draft ready',
      body: 'A quiz was generated from “Sorting Algorithms - Part 2: Quicksort”. Review it before publishing.',
      link: '/instructor/quizzes',
      is_read: false,
      created_at: daysAgo(1),
    },
    {
      id: uid(),
      user_id: 'u-meera',
      title: '2 courses awaiting approval',
      body: 'Cloud & DevOps Basics and Prompt Engineering for Developers were submitted.',
      link: '/admin/approvals',
      is_read: false,
      created_at: daysAgo(0, 8),
    },
    {
      id: uid(),
      user_id: 'u-meera',
      title: '2 posts reported',
      body: 'Forum posts in DSA and React were reported by students.',
      link: '/admin/moderation',
      is_read: false,
      created_at: daysAgo(0, 9),
    },
  );

  // A previous AI chat session for Ananya
  db.chat_sessions.push({
    id: 'cs-ananya-dsa',
    user_id: 'u-ananya',
    course_id: 'c-dsa',
    mode: 'intermediate',
    created_at: daysAgo(2),
  });
  db.chat_messages.push(
    {
      id: uid(),
      session_id: 'cs-ananya-dsa',
      sender: 'user',
      content: 'Why does quicksort degrade to O(n^2) on sorted input?',
      sources: [],
      created_at: daysAgo(2),
    },
    {
      id: uid(),
      session_id: 'cs-ananya-dsa',
      sender: 'ai',
      content:
        'Because the pivot chosen (commonly the first or last element) ends up being the smallest or largest value every time on sorted input. Each partition then removes only one element, so you get n levels of recursion doing O(n) work each — O(n²) overall.\n\nThe fix covered in the lecture: pick a random pivot or use the median of three.',
      sources: [
        {
          lecture_id: 'c-dsa-m2-l2',
          lecture_title: 'Sorting Algorithms - Part 2: Quicksort',
          timestamp_seconds: 842,
          snippet: 'Quicksort degrades to O(n^2) when the pivot is always the smallest or largest element…',
        },
      ],
      created_at: daysAgo(2),
    },
  );

  db.course_approvals.push({
    id: uid(),
    course_id: 'c-sysdesign',
    reviewed_by: 'u-meera',
    decision: 'approved',
    comment: 'Excellent structure.',
    reviewed_at: daysAgo(100),
  });
  db.audit_logs.push(
    {
      id: uid(),
      actor_id: 'u-meera',
      action: 'course.approve',
      entity: 'course',
      entity_id: 'c-sysdesign',
      created_at: daysAgo(100),
    },
    {
      id: uid(),
      actor_id: 'u-meera',
      action: 'user.suspend',
      entity: 'user',
      entity_id: 'u-s8',
      created_at: daysAgo(6),
    },
    {
      id: uid(),
      actor_id: 'u-rohit',
      action: 'course.submit',
      entity: 'course',
      entity_id: 'c-prompt',
      created_at: daysAgo(3),
    },
  );

  void CATEGORIES;
  return db;
}

// ---------- persistence ----------
let cache: MockDb | null = null;

export function getDb(): MockDb {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      cache = JSON.parse(raw) as MockDb;
      return cache;
    }
  } catch {
    /* corrupted or unavailable storage — reseed */
  }
  cache = buildSeed();
  persist();
  return cache;
}

export function persist() {
  try {
    if (cache) localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    /* storage full / private mode — keep in memory only */
  }
}

export function resetDb() {
  cache = buildSeed();
  persist();
}

export function audit(actor_id: string, action: string, entity: string, entity_id: string) {
  getDb().audit_logs.unshift({ id: uid(), actor_id, action, entity, entity_id, created_at: nowIso() });
}

export function notify(user_id: string, title: string, body: string, link: string | null = null) {
  getDb().notifications.unshift({
    id: uid(),
    user_id,
    title,
    body,
    link,
    is_read: false,
    created_at: nowIso(),
  });
}
