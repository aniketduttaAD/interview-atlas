import type { Question } from '@/types/question';

/** URL/path segment for a category (matches markdownPath folder). */
export function slugifySegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\s/]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function categorySlugForQuestion(
  q: Pick<Question, 'category'> & Partial<Pick<Question, 'markdownPath'>>,
): string {
  const parts = q.markdownPath?.replace(/\\/g, '/').split('/').filter(Boolean);
  if (parts && parts.length >= 2) {
    return parts[1];
  }
  return slugifySegment(q.category) || 'general';
}

/** Match category route param (slug or legacy display name). */
export function categoryMatchesParam(
  q: Pick<Question, 'category'> & Partial<Pick<Question, 'markdownPath'>>,
  param: string,
): boolean {
  const decoded = decodeURIComponent(param).trim();
  if (!decoded) return false;
  if (q.category === decoded) return true;

  const slug = categorySlugForQuestion(q);
  if (slug === decoded) return true;
  if (slugifySegment(decoded) === slug) return true;
  return false;
}
