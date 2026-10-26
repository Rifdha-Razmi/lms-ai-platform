import { Pill } from '@/components/common/ui';
import type { CourseStatus } from '@/types';

const MAP: Record<CourseStatus, { label: string; tone: 'neutral' | 'warn' | 'ok' | 'danger' }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  pending: { label: 'In review', tone: 'warn' },
  approved: { label: 'Live', tone: 'ok' },
  rejected: { label: 'Changes requested', tone: 'danger' },
  archived: { label: 'Archived', tone: 'neutral' },
};

export function CourseStatusPill({ status }: { status: CourseStatus }) {
  const s = MAP[status] ?? MAP.draft;
  return <Pill tone={s.tone}>{s.label}</Pill>;
}
