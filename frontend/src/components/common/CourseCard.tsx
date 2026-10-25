import { Link } from 'react-router-dom';
import { Clock, Users } from 'lucide-react';
import type { Course } from '@/types';
import { formatCompact, formatDuration, formatPrice } from '@/utils/format';
import { CourseCover } from './CourseCover';
import { DifficultyPill, ProgressBar, Rating } from './ui';

export function CourseCard({ course, progress, to }: { course: Course; progress?: number; to?: string }) {
  return (
    <Link
      to={to ?? `/courses/${course.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-line bg-surface transition-colors hover:border-brand/50"
    >
      <CourseCover category={course.category} title={course.title} thumbnailUrl={course.thumbnail_url} />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2 text-xs text-ink-soft">
          <span>{course.category}</span>
          <DifficultyPill level={course.difficulty} />
        </div>
        <h3 className="font-display text-[17px] font-semibold leading-snug group-hover:text-brand">
          {course.title}
        </h3>
        <p className="text-sm text-ink-soft">{course.instructor_name}</p>
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 whitespace-nowrap pt-2 text-xs text-ink-soft">
          <Rating value={course.rating} count={course.rating_count} />
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" aria-hidden />
            {formatCompact(course.enrollment_count)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {formatDuration(course.total_duration_seconds)}
          </span>
          {progress == null && (
            <span className="ml-auto font-medium text-ink">{formatPrice(course.price)}</span>
          )}
        </div>
        {progress != null && (
          <div className="pt-1">
            <ProgressBar value={progress} label={`${course.title} progress`} />
            <p className="mt-1 text-xs text-ink-soft">{Math.round(progress)}% complete</p>
          </div>
        )}
      </div>
    </Link>
  );
}
