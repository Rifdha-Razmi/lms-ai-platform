import { describe, expect, it } from 'vitest';
import {
  dueLabel,
  formatDuration,
  formatPrice,
  formatTimestamp,
  initials,
  pluralize,
  timeAgo,
} from './format';

describe('format utils', () => {
  it('says "just now" for the last minute', () => {
    expect(timeAgo(new Date().toISOString())).toBe('just now');
    expect(timeAgo(new Date(Date.now() - 5 * 60_000).toISOString())).toBe('5 minutes ago');
  });
  it('pluralizes counts', () => {
    expect(pluralize(1, 'lecture')).toBe('1 lecture');
    expect(pluralize(0, 'lecture')).toBe('0 lectures');
    expect(pluralize(3, 'reply', 'replies')).toBe('3 replies');
  });
  it('formats durations', () => {
    expect(formatDuration(600)).toBe('10 min');
    expect(formatDuration(6180)).toBe('1h 43m');
  });
  it('formats video timestamps', () => {
    expect(formatTimestamp(842)).toBe('14:02');
    expect(formatTimestamp(3725)).toBe('1:02:05');
  });
  it('shows free for zero-price courses', () => {
    expect(formatPrice(0)).toBe('Free');
    expect(formatPrice(1499)).toContain('1,499');
  });
  it('builds initials', () => {
    expect(initials('Ananya Sharma')).toBe('AS');
  });
  it('marks deadlines by urgency', () => {
    expect(dueLabel(new Date(Date.now() + 86400000).toISOString()).tone).toBe('urgent');
    expect(dueLabel(new Date(Date.now() - 86400000).toISOString()).tone).toBe('past');
  });
});
