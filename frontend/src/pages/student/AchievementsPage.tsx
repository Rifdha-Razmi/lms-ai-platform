import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Flame,
  GraduationCap,
  Lock,
  NotebookPen,
  Sparkles,
  Sunrise,
  Target,
  type LucideIcon,
} from 'lucide-react';
import { gamificationService } from '@/services/gamificationService';
import { learningService } from '@/services/learningService';
import { qk } from '@/services/queryClient';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { StreakStrip } from '@/components/student/StreakStrip';
import { ErrorState, Skeleton } from '@/components/common/feedback';
import { Avatar, PageHeader } from '@/components/common/ui';
import { cn } from '@/utils/cn';
import { formatDate } from '@/utils/format';

const ICONS: Record<string, LucideIcon> = {
  graduation: GraduationCap,
  flame: Flame,
  target: Target,
  sparkles: Sparkles,
  sunrise: Sunrise,
  notebook: NotebookPen,
};

export default function AchievementsPage() {
  useDocumentTitle('Achievements');
  const streak = useQuery({ queryKey: qk.streak, queryFn: gamificationService.streak });
  const badges = useQuery({ queryKey: qk.badges, queryFn: gamificationService.badges });
  const enrollments = useQuery({ queryKey: qk.enrollments, queryFn: learningService.myEnrollments });
  const [courseId, setCourseId] = useState('');
  const activeCourse = courseId || enrollments.data?.[0]?.course_id || '';
  const board = useQuery({
    queryKey: qk.leaderboard(activeCourse),
    queryFn: () => gamificationService.leaderboard(activeCourse),
    enabled: !!activeCourse,
  });
  const earned = badges.data?.filter((b) => b.earned_at).length ?? 0;

  return (
    <div>
      <PageHeader title="Achievements" />
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          <section className="panel p-5">
            {streak.data ? <StreakStrip streak={streak.data} /> : <Skeleton className="h-36" />}
          </section>
          <section>
            <h2 className="text-lg font-semibold">
              Badges{' '}
              <span className="text-sm font-normal text-ink-soft">
                · {earned} of {badges.data?.length ?? 0} earned
              </span>
            </h2>
            {badges.isError && <ErrorState error={badges.error} />}
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {badges.data?.map((b) => {
                const Icon = ICONS[b.icon] ?? Sparkles;
                return (
                  <li
                    key={b.id}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border p-3',
                      b.earned_at ? 'border-line bg-surface' : 'border-dashed border-line',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
                        b.earned_at ? 'bg-marker text-marker-ink' : 'bg-sunken text-ink-faint',
                      )}
                    >
                      {b.earned_at ? <Icon className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0">
                      <p className={cn('font-medium', !b.earned_at && 'text-ink-soft')}>{b.name}</p>
                      <p className="text-xs text-ink-soft">{b.description}</p>
                      {b.earned_at && (
                        <p className="text-xs text-ink-faint">Earned {formatDate(b.earned_at)}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <section className="panel self-start">
          <div className="border-b border-line p-4">
            <h2 className="text-lg font-semibold">Leaderboard</h2>
            <label htmlFor="lb-course" className="sr-only">
              Course
            </label>
            <select
              id="lb-course"
              className="select mt-2"
              value={activeCourse}
              onChange={(e) => setCourseId(e.target.value)}
            >
              {enrollments.data?.map((e) => (
                <option key={e.id} value={e.course_id}>
                  {e.course.title}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-ink-faint">Best quiz scores plus course progress</p>
          </div>
          {board.isLoading ? (
            <Skeleton className="m-4 h-40" />
          ) : board.data?.length ? (
            <ol className="divide-y divide-line">
              {board.data.slice(0, 10).map((r) => (
                <li
                  key={r.user_id}
                  className={cn('flex items-center gap-3 px-4 py-2.5 text-sm', r.is_me && 'bg-marker/25')}
                >
                  <span className="w-5 text-right font-mono text-xs text-ink-faint">{r.rank}</span>
                  <Avatar name={r.full_name} size={26} />
                  <span className="flex-1 truncate">
                    {r.full_name}
                    {r.is_me && <span className="ml-1 text-xs text-ink-soft">(you)</span>}
                  </span>
                  <span className="font-mono text-xs tabular-nums">{r.score}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="p-4 text-sm text-ink-soft">No quiz attempts in this course yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}
