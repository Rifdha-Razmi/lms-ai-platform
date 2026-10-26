import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Flag } from 'lucide-react';
import { adminService } from '@/services/adminService';
import { getErrorMessage } from '@/services/apiClient';
import { qk, queryClient } from '@/services/queryClient';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { EmptyState, ErrorState, Skeleton } from '@/components/common/feedback';
import { Avatar, PageHeader, Pill } from '@/components/common/ui';
import { timeAgo } from '@/utils/format';

export default function ModerationPage() {
  useDocumentTitle('Moderation');
  const q = useQuery({ queryKey: qk.flagged, queryFn: adminService.flaggedPosts });
  const act = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'dismiss' | 'remove' }) =>
      adminService.moderate(id, action),
    onSuccess: (_, v) => {
      toast.success(v.action === 'remove' ? 'Post removed' : 'Report dismissed — post stays up');
      void queryClient.invalidateQueries({ queryKey: qk.flagged });
      void queryClient.invalidateQueries({ queryKey: qk.adminOverview });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  return (
    <div className="max-w-4xl">
      <PageHeader title="Moderation" />
      {q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : q.isLoading ? (
        <Skeleton className="h-40" />
      ) : q.data!.length === 0 ? (
        <EmptyState
          icon={<Flag className="h-6 w-6" />}
          title="Nothing reported"
          body="Reported forum posts will appear here."
        />
      ) : (
        <ul className="space-y-3">
          {q.data!.map((p) => (
            <li key={p.id} className="panel p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Avatar name={p.author_name} size={26} />
                <span className="font-medium">{p.author_name}</span>
                <span className="text-ink-faint">· {timeAgo(p.created_at)}</span>
                <Pill tone="danger" className="ml-auto">
                  <Flag className="h-3 w-3" /> {p.flag_reason ?? 'Reported'}
                </Pill>
              </div>
              <blockquote className="mt-3 border-l-2 border-line pl-3 text-[15px]">{p.content}</blockquote>
              <p className="mt-2 text-xs text-ink-soft">
                In{' '}
                <Link
                  className="underline hover:text-brand"
                  to={`/courses/${p.course_id}/forum/${p.thread_id}`}
                >
                  {p.course_title}
                </Link>{' '}
                · thread “{p.thread_title}”
              </p>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  className="btn-secondary"
                  onClick={() => act.mutate({ id: p.id, action: 'dismiss' })}
                  disabled={act.isPending}
                >
                  Dismiss report
                </button>
                <button
                  className="btn-danger"
                  onClick={() => act.mutate({ id: p.id, action: 'remove' })}
                  disabled={act.isPending}
                >
                  Remove post
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
