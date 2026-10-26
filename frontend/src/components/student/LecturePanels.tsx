import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Bookmark as BookmarkIcon,
  Download,
  ExternalLink,
  FileText,
  Layers,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { learningService } from '@/services/learningService';
import { aiService } from '@/services/aiService';
import { getErrorMessage } from '@/services/apiClient';
import { qk, queryClient } from '@/services/queryClient';
import { EmptyState, ErrorState, Skeleton, Spinner } from '@/components/common/feedback';
import { Flashcards } from '@/components/ai-tutor/Flashcards';
import { ChatPanel } from '@/components/ai-tutor/ChatPanel';
import type { ChatSource, Lecture, Module } from '@/types';
import { downloadBlob, formatTimestamp } from '@/utils/format';
import { safeHref } from '@/utils/safeUrl';

const Stamp = ({ s, onSeek }: { s: number; onSeek: (s: number) => void }) => (
  <button
    onClick={() => onSeek(s)}
    className="marker shrink-0 font-mono text-xs"
    aria-label={`Jump to ${formatTimestamp(s)}`}
  >
    {formatTimestamp(s)}
  </button>
);

export function NotesPanel({
  lectureId,
  getTime,
  onSeek,
}: {
  lectureId: string;
  getTime: () => number;
  onSeek: (s: number) => void;
}) {
  const notes = useQuery({ queryKey: qk.notes(lectureId), queryFn: () => learningService.notes(lectureId) });
  const [text, setText] = useState('');
  const invalidate = () => queryClient.invalidateQueries({ queryKey: qk.notes(lectureId) });
  const add = useMutation({
    mutationFn: () => learningService.addNote(lectureId, { timestamp_seconds: getTime(), content: text }),
    onSuccess: () => {
      setText('');
      void invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const del = useMutation({
    mutationFn: learningService.deleteNote,
    onSuccess: () => {
      toast.success('Note deleted');
      void invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) add.mutate();
        }}
      >
        <label htmlFor="note" className="label">
          Add a note at the current moment
        </label>
        <textarea
          id="note"
          rows={2}
          className="textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What clicked, or what to revisit?"
        />
        <div className="mt-2 flex justify-end">
          <button className="btn-primary" disabled={!text.trim() || add.isPending}>
            {add.isPending && <Spinner />} Save note
          </button>
        </div>
      </form>
      {notes.isLoading ? (
        <Skeleton className="mt-4 h-16" />
      ) : notes.data?.length ? (
        <ul className="mt-4 divide-y divide-line">
          {notes.data.map((n) => (
            <li key={n.id} className="flex items-start gap-3 py-3">
              <Stamp s={n.timestamp_seconds} onSeek={onSeek} />
              <p className="flex-1 whitespace-pre-wrap text-sm">{n.content}</p>
              <button
                className="btn-ghost p-1"
                onClick={() => del.mutate(n.id)}
                disabled={del.isPending && del.variables === n.id}
                aria-label="Delete note"
              >
                {del.isPending && del.variables === n.id ? <Spinner /> : <Trash2 className="h-4 w-4" />}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-ink-soft">
          No notes yet. Notes are pinned to the video time, so you can jump back later.
        </p>
      )}
    </div>
  );
}

export function BookmarksPanel({
  lectureId,
  getTime,
  onSeek,
}: {
  lectureId: string;
  getTime: () => number;
  onSeek: (s: number) => void;
}) {
  const list = useQuery({
    queryKey: qk.bookmarks(lectureId),
    queryFn: () => learningService.bookmarks(lectureId),
  });
  const [label, setLabel] = useState('');
  const invalidate = () => queryClient.invalidateQueries({ queryKey: qk.bookmarks(lectureId) });
  const add = useMutation({
    mutationFn: () => learningService.addBookmark(lectureId, { timestamp_seconds: getTime(), label }),
    onSuccess: () => {
      setLabel('');
      toast.success('Bookmarked');
      void invalidate();
    },
  });
  const del = useMutation({
    mutationFn: learningService.deleteBookmark,
    onSuccess: () => {
      toast.success('Bookmark removed');
      void invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  return (
    <div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add.mutate();
        }}
      >
        <label htmlFor="bm" className="sr-only">
          Bookmark label
        </label>
        <input
          id="bm"
          className="input"
          placeholder="Label (optional)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <button className="btn-primary shrink-0" disabled={add.isPending}>
          <BookmarkIcon className="h-4 w-4" /> Bookmark this moment
        </button>
      </form>
      <ul className="mt-4 divide-y divide-line">
        {list.data?.map((b) => (
          <li key={b.id} className="flex items-center gap-3 py-2.5">
            <Stamp s={b.timestamp_seconds} onSeek={onSeek} />
            <span className="flex-1 text-sm">{b.label || 'Untitled bookmark'}</span>
            <button
              className="btn-ghost p-1"
              onClick={() => del.mutate(b.id)}
              disabled={del.isPending && del.variables === b.id}
              aria-label="Delete bookmark"
            >
              {del.isPending && del.variables === b.id ? <Spinner /> : <Trash2 className="h-4 w-4" />}
            </button>
          </li>
        ))}
      </ul>
      {list.data?.length === 0 && <p className="mt-4 text-sm text-ink-soft">No bookmarks in this lecture.</p>}
    </div>
  );
}

export function SummaryPanel({ lecture }: { lecture: Lecture }) {
  const summary = useMutation({ mutationFn: () => aiService.summarize(lecture.id) });
  if (summary.isPending)
    return (
      <p className="flex items-center gap-2 py-6 text-sm text-ink-soft">
        <Spinner /> Reading the transcript…
      </p>
    );
  if (summary.isError) return <ErrorState error={summary.error} onRetry={() => summary.mutate()} />;
  if (!summary.data) {
    return (
      <EmptyState
        icon={<Sparkles className="h-6 w-6" />}
        title="Summarize this lecture"
        body="Get the key points in under a minute of reading."
        action={
          <button className="btn-primary" onClick={() => summary.mutate()}>
            <Sparkles className="h-4 w-4" /> Generate summary
          </button>
        }
      />
    );
  }
  return (
    <div>
      <h3 className="font-medium">Key points</h3>
      <ul className="mt-3 space-y-2">
        {summary.data!.key_points.map((p, i) => (
          <li key={i} className="flex gap-3 text-sm">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-marker" aria-hidden />
            {p}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-ink-faint">
        AI-generated from the lecture transcript. Check the video if something looks off.
      </p>
    </div>
  );
}

export function FlashcardsPanel({ module }: { module: Module }) {
  const cards = useMutation({ mutationFn: () => aiService.flashcards(module.id) });
  if (cards.isPending)
    return (
      <p className="flex items-center gap-2 py-6 text-sm text-ink-soft">
        <Spinner /> Building your deck…
      </p>
    );
  if (cards.isError) return <ErrorState error={cards.error} onRetry={() => cards.mutate()} />;
  if (!cards.data) {
    return (
      <EmptyState
        icon={<Layers className="h-6 w-6" />}
        title={`Flashcards for ${module.title}`}
        body="Question-and-answer cards built from every lecture in this module."
        action={
          <button className="btn-primary" onClick={() => cards.mutate()}>
            <Layers className="h-4 w-4" /> Generate flashcards
          </button>
        }
      />
    );
  }
  return <Flashcards cards={cards.data} />;
}

export function AskPanel({
  courseId,
  lectureId,
  onOpenSource,
}: {
  courseId: string;
  lectureId: string;
  onOpenSource: (s: ChatSource) => void;
}) {
  const session = useQuery({
    queryKey: ['ai', 'session-for', courseId],
    queryFn: () => aiService.startSession(courseId),
    staleTime: Infinity,
  });
  if (session.isLoading) return <Skeleton className="h-60" />;
  if (session.isError) return <ErrorState error={session.error} onRetry={() => session.refetch()} />;
  return <ChatPanel compact sessionId={session.data!.id} lectureId={lectureId} onOpenSource={onOpenSource} />;
}

/** Display name for a material URL: API path, blob URL with '#name', or a plain link. */
const resourceName = (u: string) =>
  u.startsWith('blob:')
    ? decodeURIComponent(u.split('#')[1] ?? 'Uploaded file')
    : decodeURIComponent(u.split('/').pop() ?? u);

function ResourceRow({ url }: { url: string }) {
  const name = resourceName(url);
  const viaApi = url.startsWith('/api/');
  const fetchFile = useMutation({
    mutationFn: () => learningService.resource(url),
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const open = async () => {
    if (!viaApi) {
      const href = safeHref(url.split('#')[0]);
      if (!href) return toast.error('This link can’t be opened.');
      return window.open(href, '_blank', 'noopener');
    }
    const blob = await fetchFile.mutateAsync();
    const href = URL.createObjectURL(blob);
    window.open(href, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(href), 60_000);
  };
  const download = async () => {
    if (!viaApi) {
      const a = document.createElement('a');
      a.href = url.split('#')[0];
      a.download = name;
      a.click();
      return;
    }
    downloadBlob(await fetchFile.mutateAsync(), name);
  };
  return (
    <li className="flex flex-wrap items-center gap-3 py-3 text-sm">
      <FileText className="h-5 w-5 shrink-0 text-danger" aria-hidden />
      <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
      <button className="btn-ghost" onClick={() => void open()} disabled={fetchFile.isPending}>
        {fetchFile.isPending ? <Spinner /> : <ExternalLink className="h-4 w-4" />} View
      </button>
      <button className="btn-secondary" onClick={() => void download()} disabled={fetchFile.isPending}>
        <Download className="h-4 w-4" /> Download
      </button>
    </li>
  );
}

export function ResourcesPanel({ lecture }: { lecture: Lecture }) {
  if (!lecture.resource_urls.length)
    return <p className="text-sm text-ink-soft">No slides or PDFs for this lecture.</p>;
  return (
    <div>
      <p className="text-sm text-ink-soft">Slides and handouts your instructor attached to this lecture.</p>
      <ul className="mt-2 divide-y divide-line">
        {lecture.resource_urls.map((u) => (
          <ResourceRow key={u} url={u} />
        ))}
      </ul>
    </div>
  );
}
