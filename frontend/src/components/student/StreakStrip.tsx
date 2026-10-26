import { Flame } from 'lucide-react';
import type { Streak } from '@/types';
import { cn } from '@/utils/cn';
import { formatDate } from '@/utils/format';

/** 5-week activity grid. Today's cell is outlined; active days use the highlighter. */
export function StreakStrip({ streak, compact }: { streak: Streak; compact?: boolean }) {
  const weeks = Array.from({ length: Math.ceil(streak.activity.length / 7) }, (_, i) =>
    streak.activity.slice(i * 7, i * 7 + 7),
  );
  const last = streak.activity.length - 1;
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <Flame
          className={cn('h-5 w-5 self-center', streak.current_streak ? 'text-warn' : 'text-ink-faint')}
          aria-hidden
        />
        <span className="font-display text-3xl font-semibold tabular-nums">{streak.current_streak}</span>
        <span className="text-sm text-ink-soft">day streak</span>
        {!compact && <span className="ml-auto text-xs text-ink-faint">Best {streak.longest_streak}</span>}
      </div>
      <div
        className="mt-3 flex gap-1"
        role="img"
        aria-label={`Active on ${streak.activity.filter((a) => a.active).length} of the last ${streak.activity.length} days`}
      >
        {weeks.map((w, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {w.map((d, di) => (
              <span
                key={d.date}
                title={`${formatDate(d.date, 'EEE d MMM')}${d.active ? ' · active' : ''}`}
                className={cn(
                  'h-4 w-4 rounded-[3px] sm:h-[18px] sm:w-[18px]',
                  d.active ? 'bg-marker' : 'bg-line/70',
                  wi * 7 + di === last && 'ring-2 ring-brand ring-offset-1 ring-offset-surface',
                )}
              />
            ))}
          </div>
        ))}
      </div>
      {!compact && (
        <p className="mt-2 text-xs text-ink-soft">
          {streak.activity[last]?.active
            ? 'You’ve studied today. Nice.'
            : 'Watch a lecture or take a quiz today to keep your streak.'}
        </p>
      )}
    </div>
  );
}
