import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import { BookX, Bot, CheckCircle2, Clock, FileText, MessagesSquare, PlayCircle, Users } from 'lucide-react';
import { courseService } from '@/services/courseService';
import { learningService } from '@/services/learningService';
import { getErrorMessage } from '@/services/apiClient';
import { qk, queryClient } from '@/services/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { CourseCover } from '@/components/common/CourseCover';
import { EmptyState, ErrorState, PageLoader, Spinner } from '@/components/common/feedback';
import { Avatar, DifficultyPill, Pill, Rating } from '@/components/common/ui';
import type { Enrollment } from '@/types';
import { formatCompact, formatDuration, formatPrice, pluralize } from '@/utils/format';

export default function CourseDetailPage() {
  const { courseId = '' } = useParams();
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const course = useQuery({
    queryKey: [...qk.course(courseId), !!user],
    queryFn: () => courseService.get(courseId),
  });
  const enrollments = useQuery({
    queryKey: qk.enrollments,
    queryFn: learningService.myEnrollments,
    enabled: hasRole('student'),
  });
  useDocumentTitle(course.data?.title);

  const enroll = useMutation({
    mutationFn: () => learningService.enroll(courseId),
    onSuccess: (e) => {
      toast.success(`Enrolled in ${e.course.title}`);
      // Put the new enrollment in the cache before navigating, so the player doesn't see a stale list.
      queryClient.setQueryData<Enrollment[]>(qk.enrollments, (list) =>
        list ? [...list.filter((x) => x.course_id !== e.course_id), e] : list,
      );
      void queryClient.invalidateQueries({ queryKey: qk.enrollments });
      void queryClient.invalidateQueries({ queryKey: ['courses'] });
      navigate(`/learn/${courseId}/${e.last_lecture_id ?? ''}`);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (course.isLoading) return <PageLoader />;
  if (course.isError) {
    // Unpublished or removed courses come back as 404 — retrying won't help, so point back to the catalog.
    if (axios.isAxiosError(course.error) && course.error.response?.status === 404)
      return (
        <EmptyState
          icon={<BookX className="h-6 w-6" />}
          title="This course isn’t available"
          body="It may not be published yet, or it was removed."
          action={
            <Link to="/catalog" className="btn-primary">
              Browse courses
            </Link>
          }
        />
      );
    return <ErrorState error={course.error} onRetry={() => course.refetch()} />;
  }
  const c = course.data!;
  const enrollment = enrollments.data?.find((e) => e.course_id === c.id);
  const completed = new Set(enrollment?.completed_lecture_ids ?? []);

  const cta = !user ? (
    <Link to={`/login?next=/courses/${c.id}`} className="btn-primary w-full">
      Sign in to enroll
    </Link>
  ) : enrollment ? (
    <Link to={`/learn/${c.id}/${enrollment.last_lecture_id ?? ''}`} className="btn-primary w-full">
      <PlayCircle className="h-4 w-4" />{' '}
      {enrollment.progress_percent > 0 ? 'Continue learning' : 'Start learning'}
    </Link>
  ) : hasRole('student') ? (
    <button
      className="btn-primary w-full"
      onClick={() => enroll.mutate()}
      disabled={enroll.isPending || c.status !== 'approved'}
    >
      {enroll.isPending && <Spinner />}
      {c.price ? `Enroll for ${formatPrice(c.price)}` : 'Enroll for free'}
    </button>
  ) : (
    <p className="text-sm text-ink-soft">Enrollment is for student accounts.</p>
  );

  return (
    <div>
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <p className="text-sm text-ink-soft">
            <Link to={`/catalog?category=${encodeURIComponent(c.category)}`} className="hover:underline">
              {c.category}
            </Link>
          </p>
          <h1 className="mt-1 text-3xl font-semibold leading-tight sm:text-4xl">{c.title}</h1>
          {c.status !== 'approved' && (
            <Pill tone="warn" className="mt-2">
              {c.status === 'pending' ? 'Awaiting admin approval — not public yet' : `Status: ${c.status}`}
            </Pill>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-soft">
            <span className="flex items-center gap-2">
              <Avatar name={c.instructor_name} size={24} /> {c.instructor_name}
            </span>
            <Rating value={c.rating} count={c.rating_count} />
            <DifficultyPill level={c.difficulty} />
            <span className="inline-flex items-center gap-1">
              <Users className="h-4 w-4" /> {formatCompact(c.enrollment_count)}{' '}
              {c.enrollment_count === 1 ? 'learner' : 'learners'}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-4 w-4" /> {formatDuration(c.total_duration_seconds)}
            </span>
          </div>

          <section className="mt-10">
            <h2 className="text-xl font-semibold">Curriculum</h2>
            <p className="text-sm text-ink-soft">
              {pluralize(c.modules.length, 'module')} · {pluralize(c.lecture_count, 'lecture')}
            </p>
            <ol className="mt-4 space-y-4">
              {c.modules.map((m, mi) => (
                <li key={m.id} className="panel overflow-hidden">
                  <div className="flex items-baseline gap-3 border-b border-line bg-sunken/60 px-4 py-2.5">
                    <span className="font-mono text-xs text-ink-faint">Module {mi + 1}</span>
                    <h3 className="font-medium">{m.title}</h3>
                  </div>
                  <ul className="divide-y divide-line">
                    {m.lectures.map((l) => (
                      <li key={l.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                        {completed.has(l.id) ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-ok" aria-label="Completed" />
                        ) : (
                          <PlayCircle className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
                        )}
                        {enrollment ? (
                          <Link
                            to={`/learn/${c.id}/${l.id}`}
                            className="flex-1 hover:text-brand hover:underline"
                          >
                            {l.title}
                          </Link>
                        ) : (
                          <span className="flex-1">{l.title}</span>
                        )}
                        {l.resource_urls.length > 0 && (
                          <FileText className="h-4 w-4 text-ink-faint" aria-label="Has slides" />
                        )}
                        <span className="font-mono text-xs text-ink-faint">
                          {formatDuration(l.duration_seconds)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="panel overflow-hidden">
            <CourseCover category={c.category} title={c.title} thumbnailUrl={c.thumbnail_url} />
            <div className="space-y-4 p-5">
              <p className="font-display text-2xl font-semibold">{formatPrice(c.price)}</p>
              {cta}
              {enrollment && (
                <p className="text-sm text-ink-soft">
                  You’re {Math.round(enrollment.progress_percent)}% through this course.
                </p>
              )}
              <ul className="space-y-2 border-t border-line pt-4 text-sm text-ink-soft">
                <li className="flex gap-2">
                  <Bot className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> AI tutor that answers from these
                  lectures, with timestamps
                </li>
                <li className="flex gap-2">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> Summaries, flashcards and a
                  personal study plan
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> Certificate when you finish
                  every lecture
                </li>
              </ul>
              {enrollment && (
                <Link to={`/courses/${c.id}/forum`} className="btn-secondary w-full">
                  <MessagesSquare className="h-4 w-4" /> Course discussion
                </Link>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
