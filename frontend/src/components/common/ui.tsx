import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Star, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { initials } from '@/utils/format';
import type { Difficulty } from '@/types';

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back}
        <h1 className="text-2xl font-semibold sm:text-[28px] sm:leading-tight">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-ink-soft">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function ProgressBar({
  value,
  className,
  label,
}: {
  value: number;
  className?: string;
  label?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(v)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? 'Progress'}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-sunken', className)}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-500', v >= 100 ? 'bg-ok' : 'bg-brand')}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

const pillTones = {
  neutral: 'bg-sunken text-ink-soft',
  brand: 'bg-brand-tint text-brand',
  ok: 'bg-ok/10 text-ok',
  warn: 'bg-warn/10 text-warn',
  danger: 'bg-danger/10 text-danger',
  marker: 'bg-marker text-marker-ink',
} as const;

export function Pill({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: keyof typeof pillTones;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium',
        pillTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function DifficultyPill({ level }: { level: Difficulty }) {
  const bars = level === 'beginner' ? 1 : level === 'intermediate' ? 2 : 3;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft" title={`Difficulty: ${level}`}>
      <span className="flex items-end gap-[2px]" aria-hidden>
        {[1, 2, 3].map((b) => (
          <span
            key={b}
            className={cn('w-[3px] rounded-sm', b <= bars ? 'bg-brand' : 'bg-line')}
            style={{ height: 4 + b * 3 }}
          />
        ))}
      </span>
      <span className="capitalize">{level}</span>
    </span>
  );
}

export function Rating({ value, count }: { value: number; count?: number }) {
  if (!value) return <span className="text-xs text-ink-faint">New</span>;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs text-ink-soft"
      aria-label={`Rated ${value} out of 5`}
    >
      <Star className="h-3.5 w-3.5 fill-marker text-marker" aria-hidden />
      <span className="font-medium text-ink">{value.toFixed(1)}</span>
      {count != null && <span>({count.toLocaleString()})</span>}
    </span>
  );
}

const avatarHues = ['#1F3A8A', '#0F766E', '#7C3AED', '#B45309', '#BE123C', '#0369A1'];
export function Avatar({ name, size = 32, className }: { name: string; size?: number; className?: string }) {
  const hue = avatarHues[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % avatarHues.length];
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white',
        className,
      )}
      style={{ width: size, height: size, background: hue, fontSize: size * 0.38 }}
    >
      {initials(name)}
    </span>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div role="tablist" className={cn('flex flex-wrap gap-x-0.5 border-b border-line', className)}>
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={t.value === value}
          onClick={() => onChange(t.value)}
          className={cn(
            '-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 py-2 text-sm font-medium transition-colors',
            t.value === value ? 'border-brand text-ink' : 'border-transparent text-ink-soft hover:text-ink',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  // Keep the latest onClose without re-running the focus setup on every parent render.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return closeRef.current();
      if (e.key !== 'Tab') return;
      // Focus trap: Tab / Shift+Tab cycle inside the dialog (WCAG 2.4.3).
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !ref.current?.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !ref.current?.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    ref.current?.querySelector<HTMLElement>('input, textarea, select, button:not([data-close])')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus();
    };
  }, [open]);
  if (!open) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4"
      onMouseDown={onClose}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        onMouseDown={(e) => e.stopPropagation()}
        className={cn(
          'max-h-[92vh] w-full overflow-y-auto rounded-t-xl border border-line bg-surface shadow-lift sm:rounded-xl',
          size === 'sm' ? 'sm:max-w-md' : size === 'lg' ? 'sm:max-w-3xl' : 'sm:max-w-xl',
        )}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 id={id} className="text-lg font-semibold">
            {title}
          </h2>
          <button data-close className="btn-ghost -mr-2 p-1.5" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  tone = 'primary',
  onConfirm,
  onClose,
  pending,
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  onConfirm: () => void;
  onClose: () => void;
  pending?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className={tone === 'danger' ? 'btn-danger' : 'btn-primary'}
            onClick={onConfirm}
            disabled={pending}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="text-sm text-ink-soft">{body}</div>
    </Modal>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-between text-sm">
      <span className="text-ink-soft">
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
      </span>
      <div className="flex gap-1">
        <button className="btn-secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Previous
        </button>
        <button className="btn-secondary" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Next
        </button>
      </div>
    </nav>
  );
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="label">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-ink-faint">{hint}</p>
      ) : null}
    </div>
  );
}

/** Figure with a big value — used sparingly on dashboards. */
export function Stat({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-1">
      {icon && <div className="mt-1 text-ink-faint">{icon}</div>}
      <div>
        <div className="font-display text-2xl font-semibold tabular-nums leading-none">{value}</div>
        <div className="mt-1 text-sm text-ink-soft">{label}</div>
        {hint && <div className="text-xs text-ink-faint">{hint}</div>}
      </div>
    </div>
  );
}
