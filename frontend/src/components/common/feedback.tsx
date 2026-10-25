import type { ReactNode } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { getErrorMessage } from '@/services/apiClient';

export function Spinner({ className, label = 'Loading' }: { className?: string; label?: string }) {
  return <Loader2 aria-label={label} role="status" className={cn('h-4 w-4 animate-spin', className)} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded bg-sunken', className)} />;
}

export function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-ink-soft">
      <Spinner className="h-6 w-6" />
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      {icon && <div className="mb-3 text-ink-faint">{icon}</div>}
      <p className="font-display text-lg font-semibold">{title}</p>
      {body && <p className="mt-1 max-w-md text-sm text-ink-soft">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div role="alert" className={cn('flex flex-col items-center px-6 py-10 text-center', className)}>
      <AlertTriangle className="mb-2 h-6 w-6 text-danger" />
      <p className="font-medium">{getErrorMessage(error)}</p>
      {onRetry && (
        <button className="btn-secondary mt-3" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function InlineError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-xs text-danger">
      {message}
    </p>
  );
}
