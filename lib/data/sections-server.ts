import type { AdminSection } from '@/types/admin';
import { loadResolvedCatalog } from '@/lib/data/load-resolved-catalog';

/** Section list from the Blob-backed catalog. */
export async function getSectionsServer(): Promise<AdminSection[]> {
  const catalog = await loadResolvedCatalog();
  return catalog.sections;
}
