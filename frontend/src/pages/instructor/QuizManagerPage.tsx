import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Sparkles } from 'lucide-react';
import { courseService } from '@/services/courseService';
import { assessmentService } from '@/services/assessmentService';
import { aiService } from '@/services/aiService';
import { getErrorMessage } from '@/services/apiClient';
import { qk } from '@/services/queryClient';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { EmptyState, ErrorState, Skeleton, Spinner } from '@/components/common/feedback';
import { Field, Modal, PageHeader, Pill } from '@/components/common/ui';
import { pluralize } from '@/utils/format';

export default function QuizManagerPage() {
  useDocumentTitle('Quizzes');
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const courses = useQuery({ queryKey: qk.instructorCourses, queryFn: courseService.mine });
  const courseId = params.get('course') ?? courses.data?.[0]?.id ?? '';
  const course = useQuery({
    queryKey: [...qk.course(courseId), true],
    queryFn: () => courseService.get(courseId),
    enabled: !!courseId,
  });
  const quizzes = useQuery({
    queryKey: qk.courseQuizzes(courseId),
    queryFn: () => assessmentService.courseQuizzes(courseId),
    enabled: !!courseId,
  });
  const [aiOpen, setAiOpen] = useState(false);
  const [lectureId, setLectureId] = useState('');
  const [count, setCount] = useState(5);
  const [newOpen, setNewOpen] = useState(false);
  const [moduleId, setModuleId] = useState('');
  const [title, setTitle] = useState('');

  const generate = useMutation({
    mutationFn: () => aiService.generateQuiz(lectureId, count),
    onSuccess: (q) => {
      toast.success('Draft ready for review');
      navigate(`/instructor/quizzes/${q.id}`);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const createBlank = useMutation({
    mutationFn: () =>
      assessmentService.createQuiz({
        module_id: moduleId,
        title,
        questions: [
          {
            question_text: 'New question',
            question_type: 'mcq',
            order_index: 0,
            options: [
              { option_text: 'Correct answer', is_correct: true },
              { option_text: 'Wrong answer', is_correct: false },
            ],
          },
        ],
      }),
    onSuccess: (q) => navigate(`/instructor/quizzes/${q.id}`),
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const lectures =
    course.data?.modules.flatMap((m) => m.lectures.map((l) => ({ ...l, moduleTitle: m.title }))) ?? [];
  const drafts = quizzes.data?.filter((q) => q.status === 'draft') ?? [];
  const published = quizzes.data?.filter((q) => q.status === 'published') ?? [];

  const QuizList = ({ items, empty }: { items: typeof drafts; empty: string }) =>
    items.length === 0 ? (
      <p className="rounded-lg border border-dashed border-line px-4 py-5 text-sm text-ink-soft">{empty}</p>
    ) : (
      <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
        {items.map((q) => (
          <li key={q.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{q.title}</p>
              <p className="text-xs text-ink-soft">
                {q.module_title} · {pluralize(q.questions.length, 'question')}
              </p>
            </div>
            {q.is_ai_generated && (
              <Pill tone="marker">
                <Sparkles className="h-3 w-3" /> AI-generated
              </Pill>
            )}
            <Link
              to={`/instructor/quizzes/${q.id}`}
              className={q.status === 'draft' ? 'btn-primary' : 'btn-secondary'}
            >
              {q.status === 'draft' ? 'Review' : 'Edit'}
            </Link>
          </li>
        ))}
      </ul>
    );

  return (
    <div>
      <PageHeader
        title="Quizzes"
        actions={
          <>
            <button className="btn-secondary" onClick={() => setNewOpen(true)} disabled={!course.data}>
              <Plus className="h-4 w-4" /> Blank quiz
            </button>
            <button className="btn-primary" onClick={() => setAiOpen(true)} disabled={!lectures.length}>
              <Sparkles className="h-4 w-4" /> Generate with AI
            </button>
          </>
        }
      />
      <Field label="Course" htmlFor="qm-course" className="mb-6 max-w-md">
        <select
          id="qm-course"
          className="select"
          value={courseId}
          onChange={(e) => setParams({ course: e.target.value })}
        >
          {courses.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </Field>
      {quizzes.isError ? (
        <ErrorState error={quizzes.error} onRetry={() => quizzes.refetch()} />
      ) : quizzes.isLoading || courses.isLoading ? (
        <Skeleton className="h-40" />
      ) : !courseId ? (
        <EmptyState title="Create a course first" />
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-2 text-lg font-semibold">Waiting for your review ({drafts.length})</h2>
            <QuizList
              items={drafts}
              empty="No drafts. AI-generated quizzes land here until you approve them."
            />
          </section>
          <section>
            <h2 className="mb-2 text-lg font-semibold">Published ({published.length})</h2>
            <QuizList items={published} empty="No published quizzes yet." />
          </section>
        </div>
      )}

      <Modal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        title="Generate a quiz from a lecture"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setAiOpen(false)}>
              Cancel
            </button>
            <button
              className="btn-primary"
              disabled={!lectureId || generate.isPending}
              onClick={() => generate.mutate()}
            >
              {generate.isPending ? <Spinner /> : <Sparkles className="h-4 w-4" />} Generate draft
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Lecture" htmlFor="ai-lec">
            <select
              id="ai-lec"
              className="select"
              value={lectureId}
              onChange={(e) => setLectureId(e.target.value)}
            >
              <option value="">Choose a lecture</option>
              {lectures.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.moduleTitle} — {l.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Number of questions" htmlFor="ai-count" hint="5 to 10">
            <input
              id="ai-count"
              type="number"
              min={5}
              max={10}
              className="input w-24"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </Field>
          <p className="text-sm text-ink-soft">
            The draft won’t be visible to students until you review and publish it.
          </p>
        </div>
      </Modal>

      <Modal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title="New quiz"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setNewOpen(false)}>
              Cancel
            </button>
            <button
              className="btn-primary"
              disabled={!moduleId || title.trim().length < 3 || createBlank.isPending}
              onClick={() => createBlank.mutate()}
            >
              Create and edit
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Title" htmlFor="nq-title">
            <input id="nq-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Module" htmlFor="nq-mod">
            <select
              id="nq-mod"
              className="select"
              value={moduleId}
              onChange={(e) => setModuleId(e.target.value)}
            >
              <option value="">Choose a module</option>
              {course.data?.modules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Modal>
    </div>
  );
}
