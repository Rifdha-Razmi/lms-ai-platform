import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { learningService } from '@/services/learningService';
import { qk } from '@/services/queryClient';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { CourseCard } from '@/components/common/CourseCard';
import { EmptyState, ErrorState, Skeleton } from '@/components/common/feedback';
import { PageHeader, Tabs } from '@/components/common/ui';

type Filter = 'progress' | 'done' | 'all';

export default function MyLearningPage() {
  useDocumentTitle('My learning');
  const [filter, setFilter] = useState<Filter>('progress');
  const q = useQuery({ queryKey: qk.enrollments, queryFn: learningService.myEnrollments });
  const list = (q.data ?? []).filter((e) =>
    filter === 'all' ? true : filter === 'done' ? e.progress_percent >= 100 : e.progress_percent < 100,
  );
  const count = (f: Filter) =>
    (q.data ?? []).filter((e) =>
      f === 'all' ? true : f === 'done' ? e.progress_percent >= 100 : e.progress_percent < 100,
    ).length;

  return (
    <div>
      <PageHeader
        title="My learning"
        actions={
          <Link to="/catalog" className="btn-secondary">
            Find another course
          </Link>
        }
      />
      <Tabs
        value={filter}
        onChange={setFilter}
        tabs={[
          { value: 'progress', label: `In progress (${count('progress')})` },
          { value: 'done', label: `Completed (${count('done')})` },
          { value: 'all', label: `All (${count('all')})` },
        ]}
      />
      <div className="mt-6">
        {q.isError ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : q.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-72" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            title={filter === 'done' ? 'No finished courses yet' : 'Nothing in progress'}
            body={
              filter === 'done'
                ? 'Finish every lecture in a course to earn its certificate.'
                : 'Enroll in a course to start learning.'
            }
            action={
              <Link to="/catalog" className="btn-primary">
                Browse courses
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((e) => (
              <CourseCard
                key={e.id}
                course={e.course}
                progress={e.progress_percent}
                to={`/learn/${e.course_id}/${e.last_lecture_id ?? ''}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
