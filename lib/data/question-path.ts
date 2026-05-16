import type { Question } from '@/types/question';
import { categorySlugForQuestion } from '@/lib/data/category-slug';

/** App Router path for a section index page. */
export function sectionPath(sectionKey: string): string {
  return `/${encodeURIComponent(sectionKey)}`;
}

/** App Router path for a question (category uses URL slug, not display name). */
export function questionPath(
  q: Pick<Question, 'section' | 'category' | 'slug'> &
    Partial<Pick<Question, 'markdownPath'>>,
): string {
  const category = categorySlugForQuestion(q);
  return `${sectionPath(q.section)}/${encodeURIComponent(category)}/${encodeURIComponent(q.slug)}`;
}
