import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { courseService } from '@/services/courseService';
import { instructorService } from '@/services/instructorService';
import { qk } from '@/services/queryClient';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { ChartCard, SimpleBarChart, SimpleLineChart } from '@/components/common/charts';
import { EmptyState, ErrorState, Skeleton } from '@/components/common/feedback';
import { Field, PageHeader } from '@/components/common/ui';
import { MasteryBars } from '@/components/ai-tutor/MasteryBars';

export default function AnalyticsPage() {
  useDocumentTitle('Analytics');
  const [params, setParams] = useSearchParams();
  const courses = useQuery({ queryKey: qk.instructorCourses, queryFn: courseService.mine });
  const live = courses.data?.filter((c) => c.status === 'approved') ?? [];
  const courseId = params.get('course') ?? live[0]?.id ?? '';
  const a = useQuery({
    queryKey: qk.courseAnalytics(courseId),
    queryFn: () => instructorService.analytics(courseId),
    enabled: !!courseId,
  });

  const dropoff =
    a.data?.lecture_dropoff.map((l, i) => ({
      lecture: `L${i + 1}`,
      title: l.title,
      completion: l.started ? Math.round((l.completed / l.started) * 100) : 0,
      started: l.started,
    })) ?? [];
  const worst = [...dropoff].sort((x, y) => x.completion - y.completion)[0];

  return (
    <div>
      <PageHeader
        title="Course analytics"
        actions={
          <Field label="Course" htmlFor="an-course" className="w-72">
            <select
              id="an-course"
              className="select"
              value={courseId}
              onChange={(e) => setParams({ course: e.target.value })}
            >
              {live.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </Field>
        }
      />
      {courses.isSuccess && live.length === 0 ? (
        <EmptyState
          title="No live courses yet"
          body="Analytics appear once a course is approved and students enroll."
        />
      ) : a.isError ? (
        <ErrorState error={a.error} onRetry={() => a.refetch()} />
      ) : a.isLoading || !a.data ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-72" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard
            className="lg:col-span-2"
            title="Lecture completion rate"
            subtitle={
              worst
                ? `Lowest: ${worst.lecture} “${worst.title}” at ${worst.completion}% — a good place to add a recap or quiz.`
                : undefined
            }
            data={dropoff}
            xKey="lecture"
            xLabel="Lecture"
            series={[
              { key: 'completion', label: 'Completed after starting', format: (v) => `${v}%` },
              { key: 'started', label: 'Students who started' },
            ]}
          >
            <SimpleBarChart
              data={dropoff}
              xKey="lecture"
              series={[{ key: 'completion', label: 'Completed after starting', format: (v) => `${v}%` }]}
              yMax={100}
            />
            <ol className="mt-3 grid gap-x-6 gap-y-1 text-xs text-ink-soft sm:grid-cols-2">
              {dropoff.map((d) => (
                <li key={d.lecture}>
                  <span className="font-mono text-ink-faint">{d.lecture}</span> {d.title}
                </li>
              ))}
            </ol>
          </ChartCard>
          <ChartCard
            title="Average quiz score"
            data={a.data.quiz_scores}
            xKey="quiz_title"
            xLabel="Quiz"
            series={[
              { key: 'avg_score', label: 'Average score', format: (v) => `${v}%` },
              { key: 'attempts', label: 'Attempts' },
            ]}
          >
            <SimpleBarChart
              data={a.data.quiz_scores}
              xKey="quiz_title"
              layout="vertical"
              yMax={100}
              series={[{ key: 'avg_score', label: 'Average score', format: (v) => `${v}%` }]}
              height={Math.max(160, a.data.quiz_scores.length * 52)}
            />
          </ChartCard>
          <ChartCard
            title="Time on task"
            subtitle="Total minutes watched per week"
            data={a.data.time_on_task}
            xKey="week"
            xLabel="Week"
            series={[{ key: 'minutes', label: 'Minutes' }]}
          >
            <SimpleLineChart
              data={a.data.time_on_task}
              xKey="week"
              series={[{ key: 'minutes', label: 'Minutes' }]}
            />
          </ChartCard>
          <section className="panel p-5 lg:col-span-2">
            <h2 className="font-semibold">Topics students struggle with</h2>
            <p className="text-sm text-ink-soft">
              Share of correct answers per quiz topic, across all attempts
            </p>
            {a.data.weak_topics.length ? (
              <MasteryBars data={a.data.weak_topics} className="mt-4" />
            ) : (
              <p className="mt-3 text-sm text-ink-soft">No quiz attempts yet.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
