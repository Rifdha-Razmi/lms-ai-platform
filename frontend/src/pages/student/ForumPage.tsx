import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowLeft, MessageSquare, Plus } from 'lucide-react';
import { communityService } from '@/services/communityService';
import { courseService } from '@/services/courseService';
import { getErrorMessage } from '@/services/apiClient';
import { qk, queryClient } from '@/services/queryClient';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { EmptyState, ErrorState, Skeleton, Spinner } from '@/components/common/feedback';
import { Avatar, Field, Modal, PageHeader, Pill } from '@/components/common/ui';
import { timeAgo } from '@/utils/format';

const schema = z.object({
  title: z.string().trim().min(8, 'Write a title of at least 8 characters'),
  content: z.string().trim().min(10, 'Add a little more detail (10+ characters)'),
});
type Values = z.infer<typeof schema>;

export default function ForumPage() {
  const { courseId = '' } = useParams();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const course = useQuery({
    queryKey: [...qk.course(courseId), true],
    queryFn: () => courseService.get(courseId),
  });
  const threads = useQuery({
    queryKey: qk.threads(courseId),
    queryFn: () => communityService.threads(courseId),
  });
  useDocumentTitle(course.data ? `${course.data.title} discussion` : 'Discussion');
  const { register, handleSubmit, reset, formState } = useForm<Values>({ resolver: zodResolver(schema) });

  const create = useMutation({
    mutationFn: (v: Values) => communityService.createThread(courseId, v),
    onSuccess: (t) => {
      toast.success('Question posted');
      reset();
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: qk.threads(courseId) });
      navigate(`/courses/${courseId}/forum/${t.id}`);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="max-w-4xl">
      <PageHeader
        back={
          <Link to={`/courses/${courseId}`} className="btn-ghost -ml-2 mb-2 px-2">
            <ArrowLeft className="h-4 w-4" /> {course.data?.title ?? 'Course'}
          </Link>
        }
        title="Discussion"
        actions={
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Ask a question
          </button>
        }
      />
      {threads.isError ? (
        <ErrorState error={threads.error} onRetry={() => threads.refetch()} />
      ) : threads.isLoading ? (
        <Skeleton className="h-48" />
      ) : threads.data!.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-6 w-6" />}
          title="No discussions yet"
          body="Be the first to ask something about this course."
        />
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
          {threads.data!.map((t) => (
            <li key={t.id}>
              <Link
                to={`/courses/${courseId}/forum/${t.id}`}
                className="flex items-start gap-3 px-4 py-3.5 hover:bg-sunken/60"
              >
                <Avatar name={t.author_name} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-snug">{t.title}</p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {t.author_name}
                    {t.author_role === 'instructor' && (
                      <Pill tone="brand" className="ml-1.5">
                        Instructor
                      </Pill>
                    )}{' '}
                    · active {timeAgo(t.last_activity_at)}
                  </p>
                </div>
                <span className="flex items-center gap-1 text-sm text-ink-soft">
                  <MessageSquare className="h-4 w-4" /> {t.post_count}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Ask a question"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary" form="new-thread" disabled={create.isPending}>
              {create.isPending && <Spinner />} Post question
            </button>
          </>
        }
      >
        <form id="new-thread" className="space-y-4" onSubmit={handleSubmit((v) => create.mutate(v))}>
          <Field label="Title" htmlFor="t-title" error={formState.errors.title?.message}>
            <input
              id="t-title"
              className="input"
              placeholder="e.g. Why is merge sort stable but quicksort isn’t?"
              {...register('title')}
            />
          </Field>
          <Field label="Details" htmlFor="t-body" error={formState.errors.content?.message}>
            <textarea
              id="t-body"
              rows={5}
              className="textarea"
              placeholder="What did you try? Which lecture is this about?"
              {...register('content')}
            />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
