import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { adminService } from '@/services/adminService';
import { courseService } from '@/services/courseService';
import { getErrorMessage } from '@/services/apiClient';
import { qk, queryClient } from '@/services/queryClient';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { EmptyState, ErrorState, Skeleton, Spinner } from '@/components/common/feedback';
import { CourseCover } from '@/components/common/CourseCover';
import { DifficultyPill, Field, Modal, PageHeader } from '@/components/common/ui';
import type { Course } from '@/types';
import { formatDuration, formatPrice, timeAgo, pluralize } from '@/utils/format';

function ReviewModal({ course, onClose }: { course: Course | null; onClose: () => void }) {
  const detail = useQuery({
    queryKey: [...qk.course(course?.id ?? ''), true],
    queryFn: () => courseService.get(course!.id),
    enabled: !!course,
  });
  const [comment, setComment] = useState('');
  const review = useMutation({
    mutationFn: (decision: 'approved' | 'rejected') =>
      adminService.reviewCourse(course!.id, { decision, comment }),
    onSuccess: (c) => {
      toast.success(c.status === 'approved' ? `${c.title} is now live` : `Changes requested for ${c.title}`);
      setComment('');
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
      void queryClient.invalidateQueries({ queryKey: ['courses'] });
      onClose();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  return (
    <Modal
      open={!!course}
      onClose={onClose}
      title="Review course"
      size="lg"
      footer={
        <>
          <button
            className="btn-secondary"
            onClick={() => review.mutate('rejected')}
            disabled={review.isPending || !comment.trim()}
            title={!comment.trim() ? 'Add a comment explaining what to change' : undefined}
          >
            Request changes
          </button>
          <button
            className="btn-primary"
            onClick={() => review.mutate('approved')}
            disabled={review.isPending}
          >
            {review.isPending ? <Spinner /> : <CheckCircle2 className="h-4 w-4" />} Approve and publish
          </button>
        </>
      }
    >
      {course && (
        <div className="space-y-5">
          <div>
            <h3 className="text-xl font-semibold">{course.title}</h3>
            <p className="text-sm text-ink-soft">
              by {course.instructor_name} · {course.category} · {formatPrice(course.price)}
            </p>
            <p className="mt-3 text-sm">{course.description}</p>
          </div>
          <div>
            <p className="label">Curriculum</p>
            {detail.isLoading ? (
              <Skeleton className="h-24" />
            ) : (
              <ul className="space-y-3 text-sm">
                {detail.data?.modules.map((m) => (
                  <li key={m.id}>
                    <p className="font-medium">{m.title}</p>
                    <ul className="mt-1 space-y-1 pl-4 text-ink-soft">
                      {m.lectures.map((l) => (
                        <li key={l.id}>
                          {l.title} · {formatDuration(l.duration_seconds)}
                          {l.transcript && (
                            <span className="block truncate text-xs text-ink-faint">
                              “{l.transcript.slice(0, 110)}…”
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Field label="Comment for the instructor" htmlFor="rv-c" hint="Required when requesting changes">
            <textarea
              id="rv-c"
              rows={3}
              className="textarea"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </Field>
        </div>
      )}
    </Modal>
  );
}

export default function ApprovalsPage() {
  useDocumentTitle('Course approvals');
  const q = useQuery({ queryKey: qk.adminPending, queryFn: adminService.pendingCourses });
  const [reviewing, setReviewing] = useState<Course | null>(null);
  return (
    <div>
      <PageHeader title="Course approvals" />
      {q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : q.isLoading ? (
        <Skeleton className="h-40" />
      ) : q.data!.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck className="h-6 w-6" />}
          title="Queue is empty"
          body="No courses are waiting for review."
        />
      ) : (
        <ul className="space-y-3">
          {q.data!.map((c) => (
            <li key={c.id} className="panel flex flex-wrap items-center gap-4 overflow-hidden pr-4">
              <CourseCover category={c.category} title={c.title} className="hidden w-40 shrink-0 sm:block" />
              <div className="min-w-0 flex-1 py-3 pl-4 sm:pl-0">
                <p className="font-medium">{c.title}</p>
                <p className="text-sm text-ink-soft">
                  {c.instructor_name} · {c.category} · {pluralize(c.lecture_count, 'lecture')} · submitted{' '}
                  {timeAgo(c.created_at)}
                </p>
                <div className="mt-1">
                  <DifficultyPill level={c.difficulty} />
                </div>
              </div>
              <button className="btn-primary mb-3 sm:mb-0" onClick={() => setReviewing(c)}>
                Review
              </button>
            </li>
          ))}
        </ul>
      )}
      <ReviewModal course={reviewing} onClose={() => setReviewing(null)} />
    </div>
  );
}
