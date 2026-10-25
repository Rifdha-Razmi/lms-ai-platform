/**
 * Only allow in-app paths for post-login redirects (`?next=`), so a crafted link
 * can't bounce users to another site (open redirect).
 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next) return null;
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return null;
  return next;
}

/**
 * Only allow web and in-app URLs in links built from API data (submission files,
 * lecture resources), so a `javascript:` or `data:` URL can never run script.
 */
export function safeHref(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  try {
    const { protocol } = new URL(url);
    return ['http:', 'https:', 'blob:'].includes(protocol) ? url : null;
  } catch {
    return null;
  }
}
