import { describe, expect, it } from 'vitest';
import { safeHref, safeNextPath } from './safeUrl';

describe('safeNextPath (open-redirect guard)', () => {
  it('keeps in-app paths', () => {
    expect(safeNextPath('/courses/c-dsa')).toBe('/courses/c-dsa');
  });
  it('rejects other sites and protocol tricks', () => {
    for (const bad of ['https://evil.com', '//evil.com', '/\\evil.com', 'javascript:alert(1)', ''])
      expect(safeNextPath(bad)).toBeNull();
  });
});

describe('safeHref (script-URL guard)', () => {
  it('allows web, blob and in-app URLs', () => {
    expect(safeHref('https://cdn.example.com/a.pdf')).toBe('https://cdn.example.com/a.pdf');
    expect(safeHref('blob:http://localhost/abc')).toBe('blob:http://localhost/abc');
    expect(safeHref('/api/v1/lectures/x/resources/a.pdf')).toBe('/api/v1/lectures/x/resources/a.pdf');
  });
  it('blocks script and data URLs', () => {
    for (const bad of [
      'javascript:alert(1)',
      ' JavaScript:alert(1)',
      'data:text/html,<script>',
      '//evil.com',
    ])
      expect(safeHref(bad)).toBeNull();
  });
});
