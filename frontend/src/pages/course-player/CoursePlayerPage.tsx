import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Bookmark,
  Bot,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  FileText,
  Layers,
  ListVideo,
  MessagesSquare,
  NotebookPen,
  PlayCircle,
  Sparkles,
} from 'lucide-react';
import { courseService } from '@/services/courseService';
import { learningService } from '@/services/learningService';
import { qk, queryClient } from '@/services/queryClient';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { VideoPlayer, type VideoPlayerHandle } from '@/components/student/VideoPlayer';
import {
  AskPanel,
  BookmarksPanel,
  FlashcardsPanel,
  NotesPanel,
  ResourcesPanel,
  SummaryPanel,
} from '@/components/student/LecturePanels';
import { ErrorState, PageLoader } from '@/components/common/feedback';
import { ProgressBar, Tabs } from '@/components/common/ui';
import type { ChatSource, Enrollment } from '@/types';
import { cn } from '@/utils/cn';
import { formatDuration } from '@/utils/format';

type Tab = 'notes' | 'bookmarks' | 'summary' | 'flashcards' | 'ask' | 'resources';

export default function CoursePlayerPage() {
  const { courseId = '', lectureId } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const player = useRef<VideoPlayerHandle>(null);
  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) || 'notes');
  const [showCurriculum, setShowCurriculum] = useState(false);

  const course = useQuery({
    queryKey: [...qk.course(courseId), true],
    queryFn: () => courseService.get(courseId),
  });
  const enrollments = useQuery({ queryKey: qk.enrollments, queryFn: learningService.myEnrollments });
  const enrollment = enrollments.data?.find((e) => e.course_id === courseId);

  const flat = useMemo(
    () => course.data?.modules.flatMap((m) => m.lectures.map((l) => ({ ...l, module: m }))) ?? [],
    [course.data],
  );
  const index = flat.findIndex((l) => l.id === lectureId);
  const lecture = flat[index];
  useDocumentTitle(lecture?.title);

  const progress = useQuery({
    queryKey: qk.lectureProgress(lectureId ?? ''),
    queryFn: () => learningService.lectureProgress(lectureId!),
    enabled: !!lectureId && !!enrollment,
    staleTime: Infinity,
  });

  const save = useMutation({
    mutationFn: (v: { watched_seconds: number; completed?: boolean }) =>
      learningService.updateProgress(lectureId!, v),
    onSuccess: (res, v) => {
      queryClient.setQueryData(qk.lectureProgress(lectureId!), res);
      queryClient.setQueryData<Enrollment[]>(qk.enrollments, (list) =>
        list?.map((e) =>
          e.course_id === courseId
            ? {
                ...e,
                progress_percent: res.progress_percent,
                last_lecture_id: lectureId!,
                completed_lecture_ids: v.completed
                  ? Array.from(new Set([...e.completed_lecture_ids, lectureId!]))
                  : e.completed_lecture_ids,
              }
            : e,
        ),
      );
      if (v.completed) {
        toast.success('Lecture complete');
        if (res.progress_percent >= 100) {
          toast.success('Course complete! Your certificate is ready.', {
            action: { label: 'View', onClick: () => navigate('/certificates') },
          });
          void queryClient.invalidateQueries({ queryKey: qk.certificates });
        }
        void queryClient.invalidateQueries({ queryKey: qk.streak });
      }
    },
  });
  const onProgress = useCallback(
    (watched: number, completed: boolean) => {
      if (lectureId) save.mutate({ watched_seconds: watched, completed });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lectureId],
  );

  const seekParam = params.get('t');
  useEffect(() => {
    if (seekParam) {
      const next = new URLSearchParams(params);
      next.delete('t');
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lectureId]);

  const openSource = (s: ChatSource) => {
    if (s.lecture_id === lectureId) player.current?.seek(s.timestamp_seconds);
    else navigate(`/learn/${courseId}/${s.lecture_id}?t=${s.timestamp_seconds}&tab=ask`);
  };

  if (course.isLoading || enrollments.isLoading) return <PageLoader />;
  if (course.isError) return <ErrorState error={course.error} onRetry={() => course.refetch()} />;
  if (!enrollment) return <Navigate to={`/courses/${courseId}`} replace />;
  if (!lecture)
    return <Navigate to={`/learn/${courseId}/${enrollment.last_lecture_id ?? flat[0]?.id ?? ''}`} replace />;

  const done = new Set(enrollment.completed_lecture_ids);
  const prev = flat[index - 1];
  const next = flat[index + 1];
  const getTime = () => player.current?.currentTime() ?? 0;
  const watchedPct = Math.min(
    100,
    Math.round(((progress.data?.watched_seconds ?? 0) / Math.max(lecture.duration_seconds, 1)) * 100),
  );
  const seek = (s: number) => player.current?.seek(s);

  const curriculum = (
    <nav aria-label="Course contents" className="space-y-4">
      {course.data!.modules.map((m, mi) => (
        <div key={m.id}>
          <p className="px-2 text-xs font-medium text-ink-faint">
            Module {mi + 1} · {m.title}
          </p>
          <ul className="mt-1 space-y-0.5">
            {m.lectures.map((l) => (
              <li key={l.id}>
                <Link
                  to={`/learn/${courseId}/${l.id}`}
                  onClick={() => setShowCurriculum(false)}
                  aria-current={l.id === lectureId ? 'true' : undefined}
                  className={cn(
                    'flex items-start gap-2 rounded px-2 py-1.5 text-sm',
                    l.id === lectureId
                      ? 'bg-marker/40 font-medium text-ink'
                      : 'text-ink-soft hover:bg-sunken',
                  )}
                >
                  {done.has(l.id) ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-label="Completed" />
                  ) : l.id === lectureId ? (
                    <PlayCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
                  ) : (
                    <Circle className="mt-0.5 h-4 w-4 shrink-0 text-line" aria-hidden />
                  )}
                  <span className="flex-1">{l.title}</span>
                  <span
                    className={cn(
                      'font-mono text-[11px]',
                      l.id === lectureId ? 'text-ink' : 'text-ink-faint', // readable on the highlight
                    )}
                  >
                    {formatDuration(l.duration_seconds)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  const tabs: { value: Tab; label: React.ReactNode }[] = [
    {
      value: 'notes',
      label: (
        <>
          <NotebookPen className="h-4 w-4" /> Notes
        </>
      ),
    },
    {
      value: 'bookmarks',
      label: (
        <>
          <Bookmark className="h-4 w-4" /> Bookmarks
        </>
      ),
    },
    {
      value: 'ask',
      label: (
        <>
          <Bot className="h-4 w-4" /> Ask AI
        </>
      ),
    },
    {
      value: 'summary',
      label: (
        <>
          <Sparkles className="h-4 w-4" /> Summary
        </>
      ),
    },
    {
      value: 'flashcards',
      label: (
        <>
          <Layers className="h-4 w-4" /> Flashcards
        </>
      ),
    },
    {
      value: 'resources',
      label: (
        <>
          <FileText className="h-4 w-4" /> Resources
        </>
      ),
    },
  ];

  return (
    <div className="-mt-2">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link to="/my-learning" className="btn-ghost -ml-2 px-2">
          <ArrowLeft className="h-4 w-4" /> My learning
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden w-48 sm:block">
            <ProgressBar value={enrollment.progress_percent} label="Course progress" />
          </div>
          <span className="text-sm tabular-nums text-ink-soft">
            {Math.round(enrollment.progress_percent)}%
          </span>
          <Link to={`/courses/${courseId}/forum`} className="btn-secondary">
            <MessagesSquare className="h-4 w-4" /> <span className="hidden sm:inline">Discussion</span>
          </Link>
          <button
            className="btn-secondary lg:hidden"
            onClick={() => setShowCurriculum((s) => !s)}
            aria-expanded={showCurriculum}
          >
            <ListVideo className="h-4 w-4" /> Contents
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <VideoPlayer
            ref={player}
            src={lecture.video_url}
            title={lecture.title}
            resumeAt={progress.data?.watched_seconds}
            startAt={seekParam ? Number(seekParam) : null}
            onProgress={onProgress}
          />
          <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-ink-soft">
                {course.data!.title} · {lecture.module.title}
              </p>
              <h1 className="mt-0.5 text-2xl font-semibold">{lecture.title}</h1>
              <div className="mt-2 flex items-center gap-2 text-xs text-ink-soft">
                {done.has(lecture.id) ? (
                  <span className="inline-flex items-center gap-1 text-ok">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Lecture completed
                  </span>
                ) : (
                  <>
                    <ProgressBar value={watchedPct} className="w-32" label="Lecture watched" />
                    <span className="tabular-nums">{watchedPct}% watched</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {!done.has(lecture.id) && (
                <button
                  className="btn-secondary"
                  onClick={() => save.mutate({ watched_seconds: getTime(), completed: true })}
                  disabled={save.isPending}
                >
                  <CheckCircle2 className="h-4 w-4" /> Mark complete
                </button>
              )}
              {prev && (
                <Link
                  to={`/learn/${courseId}/${prev.id}`}
                  className="btn-secondary"
                  aria-label="Previous lecture"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Link>
              )}
              {next && (
                <Link to={`/learn/${courseId}/${next.id}`} className="btn-primary">
                  Next <ChevronRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>

          {showCurriculum && <div className="panel mt-4 p-3 lg:hidden">{curriculum}</div>}

          <Tabs tabs={tabs} value={tab} onChange={setTab} className="mt-6" />
          <div className="py-5" role="tabpanel">
            {tab === 'notes' && <NotesPanel lectureId={lecture.id} getTime={getTime} onSeek={seek} />}
            {tab === 'bookmarks' && <BookmarksPanel lectureId={lecture.id} getTime={getTime} onSeek={seek} />}
            {tab === 'ask' && (
              <AskPanel courseId={courseId} lectureId={lecture.id} onOpenSource={openSource} />
            )}
            {tab === 'summary' && <SummaryPanel key={lecture.id} lecture={lecture} />}
            {tab === 'flashcards' && <FlashcardsPanel key={lecture.module.id} module={lecture.module} />}
            {tab === 'resources' && <ResourcesPanel lecture={lecture} />}
          </div>
        </div>
        <aside className="hidden lg:block">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-lg border border-line bg-surface p-3">
            {curriculum}
          </div>
        </aside>
      </div>
    </div>
  );
}
