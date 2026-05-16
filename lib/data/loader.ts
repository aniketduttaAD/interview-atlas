import { Question, SectionKey } from '@/types/question';
import { categoryMatchesParam } from '@/lib/data/category-slug';
import {
  loadResolvedCatalog,
  loadResolvedLibrary,
} from '@/lib/data/load-resolved-catalog';

export async function getSectionData(section: SectionKey): Promise<Question[]> {
  const catalog = await loadResolvedCatalog();
  return catalog.questions.filter((q) => q.section === section);
}

export async function getAllData(): Promise<Question[]> {
  const catalog = await loadResolvedCatalog();
  return catalog.questions;
}

export async function getQuestionByPath(
  section: string,
  category: string,
  slug: string,
): Promise<Question | undefined> {
  const catalog = await loadResolvedCatalog();
  const decodedSection = decodeURIComponent(section);
  const decodedCategory = decodeURIComponent(category);
  const decodedSlug = decodeURIComponent(slug);

  return (
    catalog.questions.find(
      (q) =>
        q.section === decodedSection &&
        categoryMatchesParam(q, decodedCategory) &&
        q.slug === decodedSlug,
    ) ??
    catalog.questions.find(
      (q) => q.section === decodedSection && q.slug === decodedSlug,
    )
  );
}

export async function getQuestionMarkdown(questionId: string): Promise<string> {
  try {
    const { blobContentById } = await loadResolvedLibrary();
    return blobContentById[questionId]?.trim() ?? '';
  } catch {
    return '';
  }
}
