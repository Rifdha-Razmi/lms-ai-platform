import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Flag, Reply } from 'lucide-react';
import { courseService } from '@/services/courseService';
import { communityService } from '@/services/communityService';
import { adminService } from '@/services/adminService';
import { getErrorMessage } from '@/services/apiClient';
import { qk, queryClient } from '@/services/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { ErrorState, PageLoader, Spinner } from '@/components/common/feedback';
import { Avatar, Field, Modal, Pill } from '@/components/common/ui';
import type { DiscussionPost } from '@/types';
import { timeAgo, pluralize } from '@/utils/format';
import { cn } from '@/utils/cn';

const REASONS = ['Spam or advertising', 'Harassment or abuse', 'Sharing assignment answers', 'Off-topic'];

function ReplyBox({
  threadId,
  parentId,
  onDone,
}: {
  threadId: string;
  parentId: string | null;
  onDone?: () => void;
}) {
  const [text, setText] = useState('');
  const reply = useMutation({
    mutationFn: () => communityService.reply(threadId, { content: text, parent_id: parentId }),
    onSuccess: () => {
      setText('');
      onDone?.();
      void queryClient.invalidateQueries({ queryKey: qk.thread(threadId) });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  return (
    <form
      className="mt-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) reply.mutate();
      }}
    >
      <label htmlFor={`reply-${parentId ?? 'root'}`} className="sr-only">
        Your reply
      </label>
      <textarea
        id={`reply-${parentId ?? 'root'}`}
        rows={parentId ? 2 : 3}
        className="textarea"
        placeholder="Write a reply…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="mt-2 flex justify-end gap-2">
        {onDone && (
          <button type="button" className="btn-ghost" onClick={onDone}>
            Cancel
          </button>
        )}
        <button className="btn-primary" disabled={!text.trim() || reply.isPending}>
          {reply.isPending && <Spinner />} Reply
        </button>
      </div>
    </form>
  );
}

export default function ThreadPage() {
  const { courseId = '', threadId = '' } = useParams();
  const { user, hasRole } = useAuth();
  const q = useQuery({ queryKey: qk.thread(threadId), queryFn: () => communityService.thread(threadId) });
  const course = useQuery({
    queryKey: [...qk.course(courseId), !!user],
    queryFn: () => courseService.get(courseId),
    enabled: !!courseId,
  });
  useDocumentTitle(q.data?.thread.title);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [reporting, setReporting] = useState<DiscussionPost | null>(null);
  const [reason, setReason] = useState(REASONS[0]);

  const report = useMutation({
    mutationFn: () => communityService.report(reporting!.id, reason),
    onSuccess: () => {
      toast.success('Reported. A moderator will review it.');
      setReporting(null);
      void queryClient.invalidateQueries({ queryKey: qk.thread(threadId) });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => adminService.moderate(id, 'remove'),
    onSuccess: () => {
      toast.success('Post removed');
      void queryClient.invalidateQueries({ queryKey: qk.thread(threadId) });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (q.isLoading) return <PageLoader />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const { thread, posts } = q.data!;
  const roots = posts.filter((p) => !p.parent_id);
  const children = (id: string) => posts.filter((p) => p.parent_id === id);
  // PRD §11: admins moderate everywhere; instructors only in their own course's threads
  const canModerate = hasRole('admin') || (!!user && course.data?.instructor_id === user.id);

  const PostView = ({ p, depth }: { p: DiscussionPost; depth: number }) => (
    <li className={cn(depth > 0 && 'ml-6 border-l-2 border-line pl-4 sm:ml-10')}>
      <article className="py-4">
        <header className="flex items-center gap-2 text-sm">
          <Avatar name={p.author_name} size={28} />
          <span className="font-medium">{p.author_name}</span>
          {p.author_role === 'instructor' && <Pill tone="brand">Instructor</Pill>}
          <span className="text-xs text-ink-faint">{timeAgo(p.created_at)}</span>
          {p.is_flagged && <Pill tone="warn">Under review</Pill>}
        </header>
        <p className="mt-2 whitespace-pre-wrap pl-9 text-[15px]">{p.content}</p>
        <div className="mt-2 flex gap-1 pl-7">
          <button
            className="btn-ghost px-2 py-1 text-xs"
            onClick={() => setReplyTo(replyTo === p.id ? null : p.id)}
          >
            <Reply className="h-3.5 w-3.5" /> Reply
          </button>
          {p.user_id !== user?.id && !p.is_flagged && (
            <button className="btn-ghost px-2 py-1 text-xs" onClick={() => setReporting(p)}>
              <Flag className="h-3.5 w-3.5" /> Report
            </button>
          )}
          {canModerate && p.user_id !== user?.id && (
            <button className="btn-ghost px-2 py-1 text-xs text-danger" onClick={() => remove.mutate(p.id)}>
              Remove
            </button>
          )}
        </div>
        {replyTo === p.id && (
          <div className="pl-9">
            <ReplyBox threadId={threadId} parentId={p.id} onDone={() => setReplyTo(null)} />
          </div>
        )}
      </article>
      {children(p.id).length > 0 && (
        <ul>
          {children(p.id).map((c) => (
            <PostView key={c.id} p={c} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );

  return (
    <div className="max-w-3xl">
      <Link to={`/courses/${courseId}/forum`} className="btn-ghost -ml-2 mb-3 px-2">
        <ArrowLeft className="h-4 w-4" /> All discussions
      </Link>
      <h1 className="text-2xl font-semibold leading-snug">{thread.title}</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Asked by {thread.author_name} · {timeAgo(thread.created_at)} · {pluralize(thread.post_count, 'post')}
      </p>
      <ul className="mt-4 divide-y divide-line">
        {roots.map((p) => (
          <PostView key={p.id} p={p} depth={0} />
        ))}
      </ul>
      <section className="mt-4 border-t border-line pt-4">
        <h2 className="font-medium">Your answer</h2>
        <ReplyBox threadId={threadId} parentId={null} />
      </section>

      <Modal
        open={!!reporting}
        onClose={() => setReporting(null)}
        title="Report this post"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setReporting(null)}>
              Cancel
            </button>
            <button className="btn-danger" onClick={() => report.mutate()} disabled={report.isPending}>
              Report post
            </button>
          </>
        }
      >
        <Field label="Reason" htmlFor="reason">
          <select id="reason" className="select" value={reason} onChange={(e) => setReason(e.target.value)}>
            {REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </Field>
        <p className="mt-3 text-xs text-ink-soft">The author won’t see who reported it.</p>
      </Modal>
    </div>
  );
}
