import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Gauge, VideoOff } from 'lucide-react';
import { formatTimestamp } from '@/utils/format';

export interface VideoPlayerHandle {
  currentTime: () => number;
  seek: (seconds: number) => void;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const SPEED_KEY = 'lms-playback-speed';

/**
 * Lecture player (FR-S4): resumes from the last saved position, remembers the
 * chosen playback speed, reports progress periodically and marks the lecture
 * complete once 90% has been watched.
 */
export const VideoPlayer = forwardRef<
  VideoPlayerHandle,
  {
    src: string | null;
    title: string;
    resumeAt?: number;
    startAt?: number | null;
    onProgress: (watchedSeconds: number, completed: boolean) => void;
  }
>(function VideoPlayer({ src, title, resumeAt = 0, startAt, onProgress }, ref) {
  const video = useRef<HTMLVideoElement>(null);
  const [speed, setSpeed] = useState(() => Number(localStorage.getItem(SPEED_KEY) ?? 1) || 1);
  const [resumed, setResumed] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const lastSent = useRef(0);
  const completedSent = useRef(false);

  useImperativeHandle(ref, () => ({
    currentTime: () => video.current?.currentTime ?? 0,
    seek: (s) => {
      if (!video.current) return;
      video.current.currentTime = s;
      void video.current.play().catch(() => undefined);
    },
  }));

  useEffect(() => {
    completedSent.current = false;
    lastSent.current = 0;
    setResumed(null);
    setFailed(false);
  }, [src]);

  useEffect(() => {
    if (video.current) video.current.playbackRate = speed;
    try {
      localStorage.setItem(SPEED_KEY, String(speed));
    } catch {
      /* ignore */
    }
  }, [speed]);

  const report = useCallback(
    (force = false) => {
      const v = video.current;
      if (!v || !v.duration || Number.isNaN(v.duration)) return;
      const done = v.currentTime / v.duration >= 0.9;
      if (done && !completedSent.current) {
        completedSent.current = true;
        onProgress(v.currentTime, true);
        lastSent.current = Date.now();
        return;
      }
      if (force || Date.now() - lastSent.current > 10_000) {
        lastSent.current = Date.now();
        onProgress(v.currentTime, false);
      }
    },
    [onProgress],
  );

  // Save position when leaving the lecture
  useEffect(() => {
    const v = video.current;
    return () => {
      if (v && v.currentTime > 1) onProgress(v.currentTime, false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  const onLoaded = () => {
    const v = video.current!;
    v.playbackRate = speed;
    const target = startAt ?? (resumeAt > 5 && resumeAt < v.duration - 5 ? resumeAt : 0);
    if (target > 0) {
      v.currentTime = Math.min(target, v.duration - 1);
      if (!startAt) setResumed(target);
    }
  };

  if (!src || failed) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg bg-[#0d1220] text-white/70">
        <VideoOff className="h-8 w-8" />
        <p className="text-sm">
          {failed
            ? 'This video couldn’t load. Check your connection and reload.'
            : 'No video for this lecture — read the resources below.'}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-hidden rounded-lg bg-black">
        <video
          ref={video}
          key={src}
          src={src}
          controls
          playsInline
          preload="metadata"
          aria-label={title}
          className="aspect-video w-full"
          onLoadedMetadata={onLoaded}
          onTimeUpdate={() => report()}
          onPause={() => report(true)}
          onEnded={() => report(true)}
          onError={() => setFailed(true)}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
        {resumed != null && (
          <span className="text-ink-soft">
            Resumed at <span className="font-mono">{formatTimestamp(resumed)}</span>
            <button
              className="ml-2 font-medium text-brand hover:underline"
              onClick={() => video.current && (video.current.currentTime = 0)}
            >
              Start over
            </button>
          </span>
        )}
        <label className="ml-auto flex items-center gap-1.5 text-ink-soft">
          <Gauge className="h-4 w-4" aria-hidden />
          <span className="sr-only">Playback speed</span>
          <select
            className="select h-8 w-auto py-0 pr-8 text-xs"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
          >
            {SPEEDS.map((s) => (
              <option key={s} value={s}>
                {s}×
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
});
