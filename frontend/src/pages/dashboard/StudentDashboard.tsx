import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Bot, CalendarClock, Megaphone, Play, Sparkles } from 'lucide-react';
import { learningService } from '@/services/learningService';
import { gamificationService } from '@/services/gamificationService';
import { assessmentService } from '@/services/assessmentService';
import { communityService } from '@/services/communityService';
import { aiService } from '@/services/aiService';
import { qk } from '@/services/queryClient';
import { useAuthStore } from '@/store/authStore';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { CourseCover } from '@/components/common/CourseCover';
import { CourseCard } from '@/components/common/CourseCard';
import { EmptyState, ErrorState, Skeleton } from '@/components/common/feedback';
import { Pill, ProgressBar } from '@/components/common/ui';
import { StreakStrip } from '@/components/student/StreakStrip';
import { MasteryBars } from '@/components/ai-tutor/MasteryBars';
import { dueLabel, formatPrice, timeAgo, pluralize } from '@/utils/format';

export default function StudentDashboard() {
  useDocumentTitle('Dashboard');
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user)!;
  const enrollments = useQuery({ queryKey: qk.enrollments, queryFn: learningService.myEnrollments });
  const streak = useQuery({ queryKey: qk.streak, queryFn: gamificationService.streak });
  const recs = useQuery({ queryKey: qk.recommendations, queryFn: gamificationService.recommendations });
  const assignments = useQuery({ queryKey: qk.myAssignments, queryFn: assessmentService.myAssignments });
  const announcements = useQuery({
    queryKey: qk.announcements(),
    queryFn: () => communityService.announcements(),
  });

  const inProgress = (enrollments.data ?? []).filter((e) => e.progress_percent < 100);
  const current = [...inProgress].sort((a, b) => b.progress_percent - a.progress_percent)[0];
  const currentLecture = current?.last_lecture_id;
  const mastery = useQuery({
    queryKey: qk.mastery(current?.course_id ?? ''),
    queryFn: () => aiService.mastery(current!.course_id),
    enabled: !!current,
  });
  const upcoming = (assignments.data ?? [])
    .filter((a) => !a.my_submission && new Date(a.due_date) > new Date())
    .slice(0, 3);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold sm:text-[28px]">
        {t('dashboard.greeting', { name: user.full_name.split(' ')[0] })}
      </h1>

      {/* Hero: the one thing to do next */}
      <section className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        {enrollments.isLoading ? (
          <Skeleton className="h-56" />
        ) : enrollments.isError ? (
          <div className="panel">
            <ErrorState error={enrollments.error} onRetry={() => enrollments.refetch()} />
          </div>
        ) : current ? (
          <div className="panel grid overflow-hidden sm:grid-cols-[220px_1fr]">
            <CourseCover
              category={current.course.category}
              title={current.course.title}
              className="h-full sm:aspect-auto"
            />
            <div className="flex flex-col p-5">
              <p className="text-sm text-ink-soft">{t('dashboard.continue')}</p>
              <h2 className="mt-1 text-xl font-semibold leading-snug">{current.course.title}</h2>
              <ProgressBar value={current.progress_percent} className="mt-4" label="Course progress" />
              <p className="mt-1.5 text-sm text-ink-soft">
                {Math.round(current.progress_percent)}% · {current.completed_lecture_ids.length} of{' '}
                {pluralize(current.course.lecture_count, 'lecture')}
              </p>
              <div className="mt-auto flex flex-wrap gap-2 pt-5">
                <Link to={`/learn/${current.course_id}/${currentLecture ?? ''}`} className="btn-primary">
                  <Play className="h-4 w-4" /> Resume lecture
                </Link>
                <Link to={`/tutor?course=${current.course_id}`} className="btn-secondary">
                  <Bot className="h-4 w-4" /> Ask the AI tutor
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="panel">
            <EmptyState
              title="Start your first course"
              body="Pick a course from the catalog. Your progress, streak and AI tutor all start from there."
              action={
                <Link to="/catalog" className="btn-primary">
                  Browse courses
                </Link>
              }
            />
          </div>
        )}
        <div className="panel p-5">
          {streak.data ? <StreakStrip streak={streak.data} /> : <Skeleton className="h-40" />}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-8">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Your courses</h2>
              <Link to="/my-learning" className="text-sm font-medium text-brand hover:underline">
                View all
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {enrollments.isLoading && [0, 1].map((i) => <Skeleton key={i} className="h-64" />)}
              {(enrollments.data ?? []).slice(0, 4).map((e) => (
                <CourseCard
                  key={e.id}
                  course={e.course}
                  progress={e.progress_percent}
                  to={`/learn/${e.course_id}/${e.last_lecture_id ?? ''}`}
                />
              ))}
            </div>
          </section>

          {current && (mastery.data?.length ?? 0) > 0 && (
            <section className="panel p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Where you’re strong and weak</h2>
                  <p className="text-sm text-ink-soft">
                    Topic mastery in {current.course.title}, from your quizzes and tutor chats
                  </p>
                </div>
                <Link to={`/study-plan?course=${current.course_id}`} className="btn-secondary shrink-0">
                  <Sparkles className="h-4 w-4" /> Study plan
                </Link>
              </div>
              <MasteryBars data={mastery.data!} className="mt-4" />
            </section>
          )}
        </div>

        <aside className="space-y-8">
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <CalendarClock className="h-4 w-4 text-ink-faint" /> Due soon
            </h2>
            {assignments.isLoading ? (
              <Skeleton className="h-24" />
            ) : upcoming.length === 0 ? (
              <p className="text-sm text-ink-soft">Nothing due. You’re ahead.</p>
            ) : (
              <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
                {upcoming.map((a) => {
                  const due = dueLabel(a.due_date);
                  return (
                    <li key={a.id}>
                      <Link to="/assignments" className="block px-4 py-3 hover:bg-sunken">
                        <p className="text-sm font-medium">{a.title}</p>
                        <p className="mt-0.5 flex items-center gap-2 text-xs text-ink-soft">
                          <Pill
                            tone={due.tone === 'urgent' ? 'danger' : due.tone === 'soon' ? 'warn' : 'neutral'}
                          >
                            {due.text}
                          </Pill>
                          <span className="truncate">{a.course_title}</span>
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">Recommended next</h2>
            <ul className="space-y-3">
              {recs.isLoading && <Skeleton className="h-32" />}
              {recs.data?.map((r) => (
                <li key={r.id}>
                  <Link
                    to={`/courses/${r.course.id}`}
                    className="block rounded-lg border border-line bg-surface p-3 hover:border-brand/50"
                  >
                    <p className="font-medium leading-snug">{r.course.title}</p>
                    <p className="mt-1 text-xs text-ink-soft">{r.reason}</p>
                    <p className="mt-1 text-xs text-ink-faint">
                      {r.course.category} · {formatPrice(r.course.price)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {(announcements.data?.length ?? 0) > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                <Megaphone className="h-4 w-4 text-ink-faint" /> Announcements
              </h2>
              <ul className="space-y-3">
                {announcements.data!.slice(0, 3).map((a) => (
                  <li key={a.id} className="border-l-2 border-marker pl-3">
                    <p className="text-sm">{a.content}</p>
                    <p className="mt-0.5 text-xs text-ink-faint">
                      {a.author_name} · {a.course_title} · {timeAgo(a.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
