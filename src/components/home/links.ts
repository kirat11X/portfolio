import { isExternalHref } from '@/lib/routes';

/** True for links that leave the site and should open in a new tab (not mailto:). */
export function opensNewTab(href: string): boolean {
  return isExternalHref(href) && !href.startsWith('mailto:');
}

/**
 * A short, human-readable form of a URL for display and print:
 * "https://www.github.com/kirat11X/" → "github.com/kirat11X", "mailto:a@b.c" → "a@b.c".
 */
export function displayUrl(href: string): string {
  if (href.startsWith('mailto:')) return href.slice('mailto:'.length).split('?')[0];
  try {
    const url = new URL(href);
    return `${url.hostname.replace(/^www\./, '')}${url.pathname.replace(/\/+$/, '')}`;
  } catch {
    return href;
  }
}
