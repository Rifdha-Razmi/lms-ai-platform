import { useQuery } from '@tanstack/react-query';
import { adminService } from '@/services/adminService';
import { qk } from '@/services/queryClient';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { ErrorState, Skeleton } from '@/components/common/feedback';
import { PageHeader } from '@/components/common/ui';
import { formatDate } from '@/utils/format';

const describe = (action: string) =>
  ({
    'course.approve': 'approved a course',
    'course.reject': 'requested changes on a course',
    'course.submit': 'submitted a course for review',
    'course.create': 'created a course',
    'user.suspend': 'suspended a user',
    'user.reactivate': 'reactivated a user',
    'user.delete': 'deleted a user',
    'user.roles': 'changed a user’s roles',
    'user.register': 'registered',
    'post.report': 'reported a forum post',
    'post.remove': 'removed a forum post',
    'post.dismiss': 'dismissed a report',
  })[action] ?? action;

export default function AuditLogPage() {
  useDocumentTitle('Audit log');
  const q = useQuery({ queryKey: qk.audit, queryFn: adminService.auditLogs });
  return (
    <div className="max-w-4xl">
      <PageHeader title="Audit log" />
      {q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : q.isLoading ? (
        <Skeleton className="h-60" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b border-line text-left text-xs text-ink-soft">
              <tr>
                <th className="px-4 py-2.5 font-medium">When</th>
                <th className="px-4 py-2.5 font-medium">Event</th>
                <th className="px-4 py-2.5 font-medium">Entity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {q.data!.map((l) => (
                <tr key={l.id}>
                  <td className="whitespace-nowrap px-4 py-2.5 text-ink-soft">
                    {formatDate(l.created_at, 'd MMM yyyy, h:mm a')}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-medium">{l.actor_name}</span> {describe(l.action)}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-ink-soft">
                    {l.entity}/{l.entity_id.slice(0, 12)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
