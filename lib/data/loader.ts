import { Question, SectionKey } from '@/types/question';
import { loadResolvedCatalog } from '@/lib/data/load-resolved-catalog';

export async function getSectionData(section: SectionKey): Promise<Question[]> {
  const catalog = await loadResolvedCatalog();
  return catalog.questions.filter((q) => q.section === section);
}

export async function getAllData(): Promise<Question[]> {
  const catalog = await loadResolvedCatalog();
  return catalog.questions;
}
