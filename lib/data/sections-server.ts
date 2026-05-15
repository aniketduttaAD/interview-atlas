import type { AdminSection } from '@/types/admin';
import { buildCatalog } from './build-catalog';

/** Section list derived from data/ — same source as catalog generation. */
export async function getSectionsServer(): Promise<AdminSection[]> {
  try {
    const catalog = await buildCatalog();
    return catalog.sections;
  } catch (error) {
    console.error('Failed to load sections from data/', error);
    return [];
  }
}
