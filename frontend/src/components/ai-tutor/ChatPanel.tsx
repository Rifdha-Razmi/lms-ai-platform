import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowUp, Bot, PlayCircle } from 'lucide-react';
import { toast } from 'sonner';
import { aiService } from '@/services/aiService';
import { courseService } from '@/services/courseService';
import { starterQuestions } from './starters';
import { getErrorMessage } from '@/services/apiClient';
import { qk, queryClient } from '@/services/queryClient';
import type { ChatMessage, ChatSession, ChatSource, ExplanationMode } from '@/types';
import { cn } from '@/utils/cn';
import { formatTimestamp } from '@/utils/format';
import { ErrorState, Skeleton } from '@/components/common/feedback';

const MODES: { value: ExplanationMode; label: string; hint: string }[] = [
  { value: 'beginner', label: 'Beginner', hint: 'Plain words and an analogy' },
  { value: 'intermediate', label: 'Intermediate', hint: 'Direct answer from the lectures' },
  { value: 'advanced', label: 'Advanced', hint: 'Extra detail and edge cases' },
];

export function ModeSwitch({ session }: { session: ChatSession }) {
  const setMode = useMutation({
    mutationFn: (mode: ExplanationMode) => aiService.setMode(session.id, mode),
    onSuccess: (s) => queryClient.setQueryData(qk.chatSession(session.id), s),
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  return (
    <div
      role="radiogroup"
      aria-label="Explanation depth"
      className="inline-flex rounded border border-line bg-sunken p-0.5 text-xs"
    >
      {MODES.map((m) => (
        <button
          key={m.value}
          role="radio"
          aria-checked={session.mode === m.value}
          title={m.hint}
          onClick={() => setMode.mutate(m.value)}
          className={cn(
            'rounded-sm px-2.5 py-1 font-medium',
            session.mode === m.value ? 'bg-surface text-ink shadow-sm' : 'text-ink-soft hover:text-ink',
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

function SourceChip({ s, onOpen }: { s: ChatSource; onOpen: (s: ChatSource) => void }) {
  return (
    <button
      onClick={() => onOpen(s)}
      className="group flex w-full items-start gap-2 rounded border border-line bg-paper px-2.5 py-2 text-left text-xs hover:border-brand/60"
      title={s.snippet}
    >
      <PlayCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" aria-hidden />
      <span className="min-w-0">
        <span className="block truncate font-medium text-ink group-hover:text-brand">{s.lecture_title}</span>
        <span className="font-mono text-ink-faint">at {formatTimestamp(s.timestamp_seconds)}</span>
      </span>
    </button>
  );
}

function Message({ m, onOpenSource }: { m: ChatMessage; onOpenSource: (s: ChatSource) => void }) {
  if (m.sender === 'user') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap rounded-lg rounded-br-sm bg-brand px-3.5 py-2 text-sm text-white dark:text-paper">
          {m.content}
        </p>
      </div>
    );
  }
  return (
    <div className="flex gap-2.5">
      <span
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-marker text-marker-ink"
        aria-hidden
      >
        <Bot className="h-4 w-4" />
      </span>
      <div className="min-w-0 max-w-[90%]">
        <div className="whitespace-pre-wrap rounded-lg rounded-tl-sm border border-line bg-surface px-3.5 py-2.5 text-sm leading-relaxed">
          {m.content}
        </div>
        {m.sources.length > 0 && (
          <div className="mt-2">
            <p className="mb-1 text-xs text-ink-faint">From the course</p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {m.sources.map((s) => (
                <SourceChip key={s.lecture_id + s.timestamp_seconds} s={s} onOpen={onOpenSource} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * RAG-grounded chat (FR-A1/A2/A6). Optimistically shows the student's
 * question, then the AI reply with clickable source citations.
 */
export function ChatPanel({
  sessionId,
  lectureId,
  onOpenSource,
  compact,
  headerAction,
}: {
  sessionId: string;
  lectureId?: string;
  onOpenSource: (s: ChatSource) => void;
  compact?: boolean;
  /** e.g. the tutor page's "New chat" button */
  headerAction?: ReactNode;
}) {
  const session = useQuery({
    queryKey: qk.chatSession(sessionId),
    queryFn: () => aiService.getSession(sessionId),
  });
  const course = useQuery({
    queryKey: qk.course(session.data?.course_id ?? ''),
    queryFn: () => courseService.get(session.data!.course_id),
    enabled: !!session.data?.course_id,
  });
  const lectures = course.data?.modules.flatMap((m) => m.lectures) ?? [];
  const suggestions = starterQuestions(
    lectures.map((l) => l.title),
    lectures.find((l) => l.id === lectureId)?.title,
  );
  const [text, setText] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const send = useMutation({
    mutationFn: (msg: string) => aiService.send(sessionId, msg, lectureId),
    onMutate: (msg) => setPending(msg),
    onSuccess: (r) => {
      queryClient.setQueryData<ChatSession>(qk.chatSession(sessionId), (s) =>
        s ? { ...s, messages: [...s.messages, r.user_message, r.message] } : s,
      );
      // chat list shows each chat's first question and last activity
      void queryClient.invalidateQueries({ queryKey: qk.chatSessions, exact: true });
    },
    onError: (e, msg) => {
      toast.error(getErrorMessage(e));
      setText(msg);
    },
    onSettled: () => setPending(null),
  });

  const messages = session.data?.messages ?? [];
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, pending]);

  const submit = (msg = text) => {
    const m = msg.trim();
    if (!m || send.isPending) return;
    setText('');
    send.mutate(m);
  };

  if (session.isLoading) return <Skeleton className="h-80" />;
  if (session.isError) return <ErrorState error={session.error} onRetry={() => session.refetch()} />;

  return (
    <div className={cn('flex min-h-0 flex-col', compact ? 'h-[460px]' : 'h-full')}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <ModeSwitch session={session.data!} />
        <div className="flex items-center gap-3">{headerAction}</div>
      </div>
      <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto py-4" aria-live="polite">
        {messages.length === 0 && !pending && (
          <div className="py-6 text-center">
            <p className="font-medium">Ask anything about this course</p>
            <p className="mt-1 text-sm text-ink-soft">
              Every answer links back to the lecture moment it came from.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  className="rounded-full border border-line px-3 py-1 text-xs text-ink-soft hover:border-brand hover:text-ink"
                  onClick={() => submit(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <Message key={m.id} m={m} onOpenSource={onOpenSource} />
        ))}
        {pending && (
          <>
            <div className="flex justify-end">
              <p className="max-w-[85%] rounded-lg rounded-br-sm bg-brand/80 px-3.5 py-2 text-sm text-white dark:text-paper">
                {pending}
              </p>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-ink-soft">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-marker text-marker-ink">
                <Bot className="h-4 w-4" />
              </span>
              <span className="animate-pulse">Searching the lectures…</span>
            </div>
          </>
        )}
      </div>
      <form
        className="relative border-t border-line pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label htmlFor={`chat-${sessionId}`} className="sr-only">
          Ask the AI tutor
        </label>
        <textarea
          id={`chat-${sessionId}`}
          rows={2}
          className="textarea resize-none pr-12"
          placeholder="Ask a question about this course…"
          value={text}
          maxLength={2000}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button
          type="submit"
          className="btn-primary absolute bottom-2 right-2 h-8 w-8 p-0"
          disabled={!text.trim() || send.isPending}
          aria-label="Send question"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
