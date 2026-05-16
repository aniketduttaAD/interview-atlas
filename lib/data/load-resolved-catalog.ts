import {
  isBlobConfigured,
  readLibrarySnapshot,
} from '@/lib/blob/library-snapshot';
import type { AppCatalog } from '@/lib/data/catalog-client';
import { createEmptyCatalog } from '@/lib/data/catalog-client';

export async function loadResolvedLibrary(): Promise<{
  catalog: AppCatalog;
  blobContentById: Record<string, string>;
}> {
  if (!isBlobConfigured()) {
    throw new Error(
      'BLOB_READ_WRITE_TOKEN is not set. Link a Vercel Blob store and run `vercel env pull`.',
    );
  }

  const snapshot = await readLibrarySnapshot();
  if (!snapshot) {
    return {
      catalog: createEmptyCatalog(),
      blobContentById: {},
    };
  }

  return {
    catalog: snapshot.catalog,
    blobContentById: snapshot.contentById,
  };
}

/** Canonical catalog from the private Blob snapshot (empty catalog if not seeded yet). */
export async function loadResolvedCatalog(): Promise<AppCatalog> {
  const { catalog } = await loadResolvedLibrary();
  return catalog;
}
