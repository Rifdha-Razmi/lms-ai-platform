import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { GraduationCap, Plus } from 'lucide-react';
import { courseService } from '@/services/courseService';
import { qk } from '@/services/queryClient';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { CourseCover } from '@/components/common/CourseCover';
import { EmptyState, ErrorState, Skeleton } from '@/components/common/feedback';
import { PageHeader } from '@/components/common/ui';
import { useAuthStore } from '@/store/authStore';
import { CourseStatusPill } from '@/components/instructor/CourseStatusPill';
import { formatCompact, formatPrice, pluralize } from '@/utils/format';

export default function InstructorCoursesPage() {
  const user = useAuthStore((st) => st.user);
  const roles = user?.roles ?? [];
  const allCourses = roles.includes('admin') && !roles.includes('instructor'); // admins see every course
  useDocumentTitle(allCourses ? 'All courses' : 'My courses');
  const q = useQuery({ queryKey: qk.instructorCourses, queryFn: courseService.mine });
  return (
    <div>
      <PageHeader
        title={allCourses ? 'All courses' : 'My courses'}
        actions={
          <Link to="/instructor/courses/new" className="btn-primary">
            <Plus className="h-4 w-4" /> New course
          </Link>
        }
      />
      {q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : q.isLoading ? (
        <Skeleton className="h-48" />
      ) : q.data!.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="h-6 w-6" />}
          title="Create your first course"
          body="Add a title and description, then upload lectures module by module."
          action={
            <Link to="/instructor/courses/new" className="btn-primary">
              New course
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {q.data!.map((c) => (
            <li key={c.id}>
              <Link
                to={`/instructor/courses/${c.id}`}
                className="panel flex items-center gap-4 overflow-hidden pr-4 hover:border-brand/50"
              >
                <CourseCover
                  category={c.category}
                  title={c.title}
                  thumbnailUrl={c.thumbnail_url}
                  className="hidden w-40 shrink-0 sm:block"
                />
                <div className="min-w-0 flex-1 py-3 pl-4 sm:pl-0">
                  <p className="font-medium">{c.title}</p>
                  <p className="text-sm text-ink-soft">
                    {c.category} · {pluralize(c.lecture_count, 'lecture')} · {formatPrice(c.price)} ·{' '}
                    {formatCompact(c.enrollment_count)} {c.enrollment_count === 1 ? 'learner' : 'learners'}
                  </p>
                </div>
                <CourseStatusPill status={c.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
