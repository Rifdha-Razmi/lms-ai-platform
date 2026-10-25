import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Sparkles } from 'lucide-react';
import { instructorService } from '@/services/instructorService';
import { communityService } from '@/services/communityService';
import { qk } from '@/services/queryClient';
import { useAuthStore } from '@/store/authStore';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { ErrorState, PageLoader } from '@/components/common/feedback';
import { PageHeader, ProgressBar, Stat } from '@/components/common/ui';
import { CourseStatusPill } from '@/components/instructor/CourseStatusPill';
import { timeAgo, pluralize } from '@/utils/format';

export default function InstructorDashboard() {
  useDocumentTitle('Instructor dashboard');
  const user = useAuthStore((s) => s.user)!;
  const q = useQuery({ queryKey: qk.instructorOverview, queryFn: instructorService.overview });
  const notifications = useQuery({ queryKey: qk.notifications, queryFn: communityService.notifications });

  if (q.isLoading) return <PageLoader />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const d = q.data!;
  const todo = (notifications.data ?? []).filter((n) => !n.is_read).slice(0, 4);

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user.full_name.split(' ')[0]}`}
        actions={
          <Link to="/instructor/courses/new" className="btn-primary">
            <Plus className="h-4 w-4" /> New course
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-line py-5 md:grid-cols-4">
        <Stat label="Students enrolled" value={d.total_students} />
        <Stat label="Live courses" value={d.active_courses} />
        <Stat label="Average quiz score" value={`${d.avg_quiz_score}%`} />
        <Stat
          label="Submissions to grade"
          value={d.pending_submissions}
          hint={
            d.pending_submissions ? (
              <Link to="/instructor/grading" className="text-brand hover:underline">
                Grade now
              </Link>
            ) : (
              'All graded'
            )
          }
        />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <section>
          <h2 className="mb-3 text-lg font-semibold">Your courses</h2>
          <div className="overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="border-b border-line text-left text-xs text-ink-soft">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Course</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Avg. progress</th>
                  <th className="px-4 py-2.5 text-right font-medium">Avg. quiz</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {d.courses.map((c) => (
                  <tr key={c.id} className="hover:bg-sunken/50">
                    <td className="px-4 py-3">
                      <Link
                        to={`/instructor/courses/${c.id}`}
                        className="font-medium hover:text-brand hover:underline"
                      >
                        {c.title}
                      </Link>
                      <p className="text-xs text-ink-faint">{pluralize(c.lecture_count, 'lecture')}</p>
                    </td>
                    <td className="px-4 py-3">
                      <CourseStatusPill status={c.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ProgressBar
                          value={c.avg_progress}
                          className="w-24"
                          label={`${c.title} average progress`}
                        />
                        <span className="text-xs tabular-nums text-ink-soft">{c.avg_progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {c.avg_quiz_score ? `${c.avg_quiz_score}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <aside>
          <h2 className="mb-3 text-lg font-semibold">Needs attention</h2>
          {todo.length === 0 ? (
            <p className="text-sm text-ink-soft">Nothing waiting on you.</p>
          ) : (
            <ul className="space-y-3">
              {todo.map((n) => (
                <li key={n.id} className="border-l-2 border-marker pl-3">
                  <Link to={n.link ?? '#'} className="block hover:text-brand">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-sm text-ink-soft">{n.body}</p>
                    <p className="text-xs text-ink-faint">{timeAgo(n.created_at)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-8 rounded-lg border border-dashed border-line p-4">
            <p className="flex items-center gap-2 font-medium">
              <Sparkles className="h-4 w-4 text-brand" /> Let AI draft your next quiz
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              Pick a lecture and get 5–10 questions from its transcript. You review before anything is
              published.
            </p>
            <Link to="/instructor/quizzes" className="btn-secondary mt-3">
              Open quizzes
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
