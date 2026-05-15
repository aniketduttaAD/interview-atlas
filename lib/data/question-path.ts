import type { Question } from '@/types/question';

/** App Router path for a section index page. */
export function sectionPath(sectionKey: string): string {
  return `/${encodeURIComponent(sectionKey)}`;
}

/** App Router path for a question (encoded for URLs). */
export function questionPath(
  q: Pick<Question, 'section' | 'category' | 'slug'>,
): string {
  return `${sectionPath(q.section)}/${encodeURIComponent(q.category)}/${encodeURIComponent(q.slug)}`;
}
