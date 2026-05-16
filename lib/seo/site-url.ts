/** Canonical production origin for Open Graph / share URLs (no trailing slash). */
export const SITE_URL = 'https://interviewatlas.aniketdutta.space';

export function getSiteUrl(): string {
  return SITE_URL;
}

export function absoluteUrl(path: string): string {
  const base = getSiteUrl();
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
