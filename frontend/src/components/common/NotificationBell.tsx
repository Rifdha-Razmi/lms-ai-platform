import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react';
import { communityService } from '@/services/communityService';
import { qk, queryClient } from '@/services/queryClient';
import { cn } from '@/utils/cn';
import { timeAgo } from '@/utils/format';

export function NotificationBell() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { data = [] } = useQuery({
    queryKey: qk.notifications,
    queryFn: communityService.notifications,
    refetchInterval: 60_000,
  });
  const unread = data.filter((n) => !n.is_read).length;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: qk.notifications });
  const markAll = useMutation({ mutationFn: communityService.markAllRead, onSuccess: invalidate });
  const markOne = useMutation({ mutationFn: communityService.markRead, onSuccess: invalidate });

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        className="btn-ghost relative p-2"
        aria-label={`${t('common.notifications')}${unread ? `, ${unread} unread` : ''}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-marker px-1 text-[10px] font-semibold text-marker-ink">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[min(92vw,360px)] overflow-hidden rounded-lg border border-line bg-surface shadow-lift">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="font-medium">{t('common.notifications')}</span>
            {unread > 0 && (
              <button
                className="text-xs font-medium text-brand hover:underline"
                onClick={() => markAll.mutate()}
              >
                {t('common.markAllRead')}
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {data.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-ink-soft">{t('common.noNotifications')}</li>
            )}
            {data.map((n) => (
              <li key={n.id}>
                <button
                  className={cn(
                    'flex w-full gap-3 border-b border-line/60 px-4 py-3 text-left hover:bg-sunken',
                    !n.is_read && 'bg-brand-tint/40',
                  )}
                  onClick={() => {
                    if (!n.is_read) markOne.mutate(n.id);
                    setOpen(false);
                    if (n.link) navigate(n.link);
                  }}
                >
                  <span
                    className={cn(
                      'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                      n.is_read ? 'bg-transparent' : 'bg-brand',
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{n.title}</span>
                    <span className="block text-sm text-ink-soft">{n.body}</span>
                    <span className="mt-0.5 block text-xs text-ink-faint">{timeAgo(n.created_at)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
