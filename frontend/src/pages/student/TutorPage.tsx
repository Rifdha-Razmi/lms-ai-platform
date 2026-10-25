import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bot, MessageSquare, Plus, Trash2 } from 'lucide-react';
import { aiService } from '@/services/aiService';
import { learningService } from '@/services/learningService';
import { getErrorMessage } from '@/services/apiClient';
import { qk, queryClient } from '@/services/queryClient';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { ChatPanel } from '@/components/ai-tutor/ChatPanel';
import { EmptyState, Skeleton, Spinner } from '@/components/common/feedback';
import { ConfirmDialog } from '@/components/common/ui';
import type { ChatSession } from '@/types';
import { cn } from '@/utils/cn';
import { timeAgo } from '@/utils/format';

export default function TutorPage() {
  useDocumentTitle('AI tutor');
  const { sessionId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const enrollments = useQuery({ queryKey: qk.enrollments, queryFn: learningService.myEnrollments });
  const sessions = useQuery({ queryKey: qk.chatSessions, queryFn: aiService.sessions });

  const open = useMutation({
    mutationFn: ({ courseId, fresh }: { courseId: string; fresh?: boolean }) =>
      aiService.startSession(courseId, { fresh }),
    onSuccess: (s, { fresh }) => {
      queryClient.setQueryData(qk.chatSession(s.id), s);
      void queryClient.invalidateQueries({ queryKey: qk.chatSessions });
      // the lecture page's "Ask AI" tab follows the course's latest chat
      if (fresh) void queryClient.invalidateQueries({ queryKey: ['ai', 'session-for', s.course_id] });
      navigate(`/tutor/${s.id}`, { replace: !fresh });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  // ?course=… deep link (from dashboard, quiz results) opens that course's latest chat
  const courseParam = params.get('course');
  useEffect(() => {
    if (courseParam) open.mutate({ courseId: courseParam });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseParam]);
  // default to the most recent chat
  useEffect(() => {
    if (!sessionId && !courseParam && sessions.data?.length)
      navigate(`/tutor/${sessions.data[0].id}`, { replace: true });
  }, [sessionId, courseParam, sessions.data, navigate]);

  const active = sessions.data?.find((s) => s.id === sessionId);
  const activeCourseId = active?.course_id;
  const chatsFor = (courseId: string) => (sessions.data ?? []).filter((s) => s.course_id === courseId);
  const newChat = () => activeCourseId && open.mutate({ courseId: activeCourseId, fresh: true });

  const [deleting, setDeleting] = useState<ChatSession | null>(null);
  const remove = useMutation({
    mutationFn: (chat: ChatSession) => aiService.deleteSession(chat.id),
    onSuccess: (_, chat) => {
      toast.success('Chat deleted');
      setDeleting(null);
      queryClient.removeQueries({ queryKey: qk.chatSession(chat.id) });
      void queryClient.invalidateQueries({ queryKey: ['ai', 'session-for', chat.course_id] });
      const rest = chatsFor(chat.course_id).filter((c) => c.id !== chat.id);
      queryClient.setQueryData<ChatSession[]>(qk.chatSessions, (list) =>
        list?.filter((c) => c.id !== chat.id),
      );
      void queryClient.invalidateQueries({ queryKey: qk.chatSessions, exact: true });
      // Deleted the open chat → show the course's next most recent one, or a fresh chat.
      if (chat.id === sessionId) {
        if (rest.length) navigate(`/tutor/${rest[0].id}`, { replace: true });
        else open.mutate({ courseId: chat.course_id });
      }
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="grid h-[calc(100vh-7.5rem)] gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="hidden min-h-0 flex-col lg:flex">
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <Bot className="h-5 w-5 text-brand" /> AI tutor
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          One tutor per course. It only answers from that course’s material.
        </p>
        <ul className="mt-5 min-h-0 space-y-1 overflow-y-auto pr-1">
          {enrollments.isLoading && <Skeleton className="h-24" />}
          {enrollments.data?.map((e) => {
            const isActive = activeCourseId === e.course_id;
            const chats = isActive ? chatsFor(e.course_id) : [];
            return (
              <li key={e.id}>
                <button
                  onClick={() => !isActive && open.mutate({ courseId: e.course_id })}
                  aria-current={isActive || undefined}
                  className={cn(
                    'w-full rounded px-3 py-2 text-left text-sm',
                    isActive ? 'font-medium text-ink' : 'text-ink-soft hover:bg-sunken hover:text-ink',
                  )}
                >
                  {e.course.title}
                </button>
                {isActive && chats.length > 0 && (
                  <ul className="mb-2 ml-3 space-y-0.5 border-l border-line pl-2" aria-label="Chats">
                    {chats.map((c) => (
                      <ChatLink
                        key={c.id}
                        chat={c}
                        active={c.id === sessionId}
                        onDelete={() => setDeleting(c)}
                      />
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </aside>

      <section className="panel flex min-h-0 flex-col p-4 sm:p-5">
        <div className="mb-3 space-y-2 lg:hidden">
          <label htmlFor="course-pick" className="label">
            Course
          </label>
          <select
            id="course-pick"
            className="select"
            value={activeCourseId ?? ''}
            onChange={(e) => e.target.value && open.mutate({ courseId: e.target.value })}
          >
            <option value="">Choose a course</option>
            {enrollments.data?.map((e) => (
              <option key={e.id} value={e.course_id}>
                {e.course.title}
              </option>
            ))}
          </select>
          {activeCourseId && active && (
            <div className="flex gap-2">
              <select
                aria-label="Chat"
                className="select min-w-0 flex-1"
                value={sessionId}
                onChange={(e) => navigate(`/tutor/${e.target.value}`)}
              >
                {chatsFor(activeCourseId).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title ?? 'New chat'} · {timeAgo(c.last_message_at ?? c.created_at)}
                  </option>
                ))}
              </select>
              <button
                className="btn-secondary px-2.5 text-danger"
                onClick={() => setDeleting(active)}
                aria-label="Delete this chat"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
        {sessionId ? (
          <ChatPanel
            key={sessionId}
            sessionId={sessionId}
            onOpenSource={(s) =>
              activeCourseId && navigate(`/learn/${activeCourseId}/${s.lecture_id}?t=${s.timestamp_seconds}`)
            }
            headerAction={
              <button
                className="btn-secondary h-8 px-2.5 text-xs"
                onClick={newChat}
                disabled={!activeCourseId || open.isPending}
                title="Start a fresh conversation — this one stays in your history"
              >
                {open.isPending ? <Spinner /> : <Plus className="h-3.5 w-3.5" />} New chat
              </button>
            }
          />
        ) : enrollments.data?.length === 0 ? (
          <EmptyState
            title="Enroll in a course first"
            body="The tutor answers from a course’s own lectures, so it needs a course to work with."
            action={
              <Link to="/catalog" className="btn-primary">
                Browse courses
              </Link>
            }
          />
        ) : (
          <EmptyState
            icon={<Bot className="h-6 w-6" />}
            title="Pick a course to start"
            body="Choose one of your courses on the left."
          />
        )}
      </section>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete this chat?"
        body={
          <>
            “{deleting?.title ?? 'New chat'}” and its messages will be removed for good. Your notes, quizzes
            and progress aren’t affected.
          </>
        }
        confirmLabel="Delete chat"
        tone="danger"
        onConfirm={() => deleting && remove.mutate(deleting)}
        pending={remove.isPending}
      />
    </div>
  );
}

function ChatLink({ chat, active, onDelete }: { chat: ChatSession; active: boolean; onDelete: () => void }) {
  return (
    <li className="group relative">
      <Link
        to={`/tutor/${chat.id}`}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex items-start gap-2 rounded py-1.5 pl-2 pr-8 text-sm',
          active ? 'bg-brand-tint font-medium text-brand' : 'text-ink-soft hover:bg-sunken hover:text-ink',
        )}
      >
        <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="min-w-0">
          <span className="block truncate">{chat.title ?? 'New chat'}</span>
          <span className="block text-xs font-normal text-ink-faint">
            {timeAgo(chat.last_message_at ?? chat.created_at)}
          </span>
        </span>
      </Link>
      {/* Shown on hover / keyboard focus, and always on the open chat — like ChatGPT and Claude */}
      <button
        onClick={onDelete}
        aria-label={`Delete chat “${chat.title ?? 'New chat'}”`}
        title="Delete chat"
        className={cn(
          'absolute right-1 top-1.5 rounded p-1 text-ink-faint hover:bg-danger/10 hover:text-danger focus:opacity-100',
          active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        )}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}
