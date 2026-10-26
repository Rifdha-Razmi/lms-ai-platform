import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarCheck, PlayCircle, Sparkles } from 'lucide-react';
import { aiService } from '@/services/aiService';
import { learningService } from '@/services/learningService';
import { getErrorMessage } from '@/services/apiClient';
import { qk } from '@/services/queryClient';
import { useAuthStore } from '@/store/authStore';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { MasteryBars } from '@/components/ai-tutor/MasteryBars';
import { EmptyState, Skeleton, Spinner } from '@/components/common/feedback';
import { PageHeader } from '@/components/common/ui';
import type { StudyPlan } from '@/types';
import { formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';

// Per user AND course, so a shared computer never shows one student another's plan.
const PLAN_KEY = (userId: string, courseId: string) => `lms-study-plan-${userId}-${courseId}`;
const load = <T,>(k: string): T | null => {
  try {
    return JSON.parse(localStorage.getItem(k) ?? 'null') as T | null;
  } catch {
    return null;
  }
};

export default function StudyPlanPage() {
  useDocumentTitle('Study plan');
  const userId = useAuthStore((st) => st.user?.id ?? 'anon');
  const [params, setParams] = useSearchParams();
  const enrollments = useQuery({ queryKey: qk.enrollments, queryFn: learningService.myEnrollments });
  const courseId =
    params.get('course') ??
    enrollments.data?.find((e) => e.progress_percent < 100)?.course_id ??
    enrollments.data?.[0]?.course_id ??
    '';
  const mastery = useQuery({
    queryKey: qk.mastery(courseId),
    queryFn: () => aiService.mastery(courseId),
    enabled: !!courseId,
  });
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!courseId) return;
    const saved = load<{ plan: StudyPlan; done: Record<string, boolean> }>(PLAN_KEY(userId, courseId));
    setPlan(saved?.plan ?? null);
    setDone(saved?.done ?? {});
  }, [courseId, userId]);
  useEffect(() => {
    if (!courseId || !plan) return;
    try {
      localStorage.setItem(PLAN_KEY(userId, courseId), JSON.stringify({ plan, done }));
    } catch {
      /* ignore */
    }
  }, [courseId, userId, plan, done]);

  const generate = useMutation({
    mutationFn: () => aiService.studyPlan(courseId),
    onSuccess: (p) => {
      setPlan(p);
      setDone({});
      toast.success('New 7-day plan ready');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const course = enrollments.data?.find((e) => e.course_id === courseId)?.course;
  const totalTasks = plan?.plan.reduce((s, d) => s + d.tasks.length, 0) ?? 0;
  const doneCount = Object.values(done).filter(Boolean).length;

  return (
    <div>
      <PageHeader
        title="Study plan"
        actions={
          <>
            <label htmlFor="plan-course" className="sr-only">
              Course
            </label>
            <select
              id="plan-course"
              className="select w-auto"
              value={courseId}
              onChange={(e) => setParams({ course: e.target.value })}
            >
              {enrollments.data?.map((e) => (
                <option key={e.id} value={e.course_id}>
                  {e.course.title}
                </option>
              ))}
            </select>
            <button
              className="btn-primary"
              onClick={() => generate.mutate()}
              disabled={!courseId || generate.isPending}
            >
              {generate.isPending ? <Spinner /> : <Sparkles className="h-4 w-4" />}{' '}
              {plan ? 'Regenerate plan' : 'Generate plan'}
            </button>
          </>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <section>
          {enrollments.isLoading ? (
            <Skeleton className="h-60" />
          ) : !plan ? (
            <div className="panel">
              <EmptyState
                icon={<CalendarCheck className="h-6 w-6" />}
                title={course ? `No plan yet for ${course.title}` : 'Enroll in a course to get a plan'}
                body="The plan uses your topic mastery to decide what to revisit each day, and links each task to the right lecture."
                action={
                  course && (
                    <button
                      className="btn-primary"
                      onClick={() => generate.mutate()}
                      disabled={generate.isPending}
                    >
                      Generate my plan
                    </button>
                  )
                }
              />
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm text-ink-soft">
                Generated {formatDate(plan.generated_at, 'd MMM, h:mm a')} · {doneCount}/{totalTasks} tasks
                done
              </p>
              <ol className="relative space-y-4 border-l border-line pl-6">
                {plan.plan.map((d) => {
                  const dayDone = d.tasks.every((_, i) => done[`${d.day}-${i}`]);
                  return (
                    <li key={d.day} className="relative">
                      <span
                        className={cn(
                          'absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2',
                          dayDone ? 'border-ok bg-ok' : 'border-brand bg-surface',
                        )}
                        aria-hidden
                      />
                      <div className="panel p-4">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <h3 className="font-semibold">
                            Day {d.day}:{' '}
                            <span className={cn(d.focus_topic !== 'Mixed review' && 'marker-underline')}>
                              {d.focus_topic}
                            </span>
                          </h3>
                          <span className="text-xs text-ink-faint">~{d.minutes} min</span>
                        </div>
                        <ul className="mt-3 space-y-2">
                          {d.tasks.map((t, i) => {
                            const k = `${d.day}-${i}`;
                            return (
                              <li key={k}>
                                <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                                  <input
                                    type="checkbox"
                                    className="checkbox mt-0.5"
                                    checked={!!done[k]}
                                    onChange={(e) => setDone((p) => ({ ...p, [k]: e.target.checked }))}
                                  />
                                  <span className={cn(done[k] && 'text-ink-faint line-through')}>{t}</span>
                                </label>
                              </li>
                            );
                          })}
                        </ul>
                        {d.lecture_ids[0] && (
                          <Link
                            to={`/learn/${courseId}/${d.lecture_ids[0]}`}
                            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
                          >
                            <PlayCircle className="h-4 w-4" /> Open the lecture
                          </Link>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </>
          )}
        </section>
        <aside>
          <div className="panel p-5">
            <h2 className="font-semibold">Topic mastery</h2>
            <p className="text-sm text-ink-soft">Updated after every quiz and tutor chat.</p>
            {mastery.isLoading ? (
              <Skeleton className="mt-4 h-32" />
            ) : mastery.data?.length ? (
              <MasteryBars data={mastery.data} className="mt-4" />
            ) : (
              <p className="mt-4 text-sm text-ink-soft">
                Take a quiz in this course to see your mastery by topic.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
