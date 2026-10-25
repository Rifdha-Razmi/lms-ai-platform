import { formatDistanceToNowStrict, format } from 'date-fns';

export const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m} min`;
};

export const formatTimestamp = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
};

export const formatPrice = (price: number) =>
  price === 0
    ? 'Free'
    : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
        price,
      );

export const formatCompact = (n: number) =>
  new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

export const timeAgo = (iso: string) =>
  Date.now() - new Date(iso).getTime() < 60_000
    ? 'just now'
    : `${formatDistanceToNowStrict(new Date(iso))} ago`;
export const formatDate = (iso: string, pattern = 'd MMM yyyy') => format(new Date(iso), pattern);

export type DueTone = 'past' | 'urgent' | 'soon' | 'later';
export const dueLabel = (iso: string): { text: string; tone: DueTone } => {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return { text: `Closed ${formatDistanceToNowStrict(new Date(iso))} ago`, tone: 'past' };
  const days = diff / 86400000;
  return {
    text: `Due in ${formatDistanceToNowStrict(new Date(iso))}`,
    tone: days < 2 ? 'urgent' : days < 5 ? 'soon' : 'later',
  };
};

export const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/** "1 lecture", "3 lectures" — `plural` defaults to word + "s". */
export const pluralize = (n: number, word: string, plural = `${word}s`) => `${n} ${n === 1 ? word : plural}`;
