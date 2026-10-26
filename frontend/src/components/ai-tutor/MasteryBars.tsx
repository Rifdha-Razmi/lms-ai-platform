import type { TopicMastery } from '@/types';
import { cn } from '@/utils/cn';

const band = (m: number) =>
  m < 40
    ? { label: 'Needs work', cls: 'bg-danger' }
    : m < 70
      ? { label: 'Getting there', cls: 'bg-warn' }
      : { label: 'Strong', cls: 'bg-ok' };

/** Per-topic mastery (FR-A8), weakest first. Band is named in text, never colour alone. */
export function MasteryBars({ data, className }: { data: TopicMastery[]; className?: string }) {
  const sorted = [...data].sort((a, b) => a.mastery - b.mastery);
  return (
    <ul className={cn('space-y-3', className)}>
      {sorted.map((t) => {
        const b = band(t.mastery);
        return (
          <li key={t.topic} className="text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate" title={t.topic}>
                {t.topic}
              </span>
              <span className="shrink-0 whitespace-nowrap text-xs tabular-nums text-ink-soft">
                {t.mastery}% · {b.label}
              </span>
            </div>
            <span
              className="mt-1 block h-1.5 overflow-hidden rounded-full bg-sunken"
              role="meter"
              aria-valuenow={t.mastery}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${t.topic} mastery`}
            >
              <span
                className={cn('block h-full rounded-full', b.cls)}
                style={{ width: `${Math.max(t.mastery, 3)}%` }}
              />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
