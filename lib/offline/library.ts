import type { AppCatalog } from '@/lib/data/catalog-client';
import {
  getCatalogGeneratedAt,
  getCatalogQuestions,
  getCatalogSections,
} from '@/lib/data/catalog-client';
import { STORAGE_KEYS } from '@/lib/storage/keys';
import type { Question } from '@/types/question';

import bundledContent from '@/lib/data/content.generated.json';

/** Full offline payload: metadata + markdown bodies. */
export interface OfflineLibrary {
  catalog: AppCatalog;
  contentById: Record<string, string>;
  syncedAt: string;
}

const bundledCatalog: AppCatalog = {
  generatedAt: getCatalogGeneratedAt(),
  sections: getCatalogSections(),
  questions: getCatalogQuestions(),
};

const bundledContentById = (bundledContent as { byId: Record<string, string> })
  .byId;

export function getBundledLibrary(): OfflineLibrary {
  return {
    catalog: bundledCatalog,
    contentById: { ...bundledContentById },
    syncedAt: bundledCatalog.generatedAt,
  };
}

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

export function readStoredLibrary(): OfflineLibrary | null {
  try {
    const raw = storage()?.getItem(STORAGE_KEYS.OFFLINE_LIBRARY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OfflineLibrary;
    if (!parsed?.catalog?.questions?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeStoredLibrary(library: OfflineLibrary): void {
  try {
    storage()?.setItem(STORAGE_KEYS.OFFLINE_LIBRARY, JSON.stringify(library));
  } catch {
    // Quota exceeded — keep serving bundled data
  }
}

/** Prefer newer synced copy; fall back to build-time bundle. */
export function resolveLibrary(stored: OfflineLibrary | null): OfflineLibrary {
  const bundled = getBundledLibrary();
  if (!stored?.syncedAt) return bundled;

  const storedTime = new Date(stored.syncedAt).getTime();
  const bundledTime = new Date(bundled.syncedAt).getTime();

  if (storedTime >= bundledTime) {
    return {
      catalog: stored.catalog,
      contentById: { ...bundled.contentById, ...stored.contentById },
      syncedAt: stored.syncedAt,
    };
  }

  return {
    catalog: bundled.catalog,
    contentById: { ...bundled.contentById, ...stored.contentById },
    syncedAt: bundled.syncedAt,
  };
}

export function getInitialLibrary(): OfflineLibrary {
  return resolveLibrary(readStoredLibrary());
}

/** Download catalog + all markdown from the server (online only). */
export async function fetchRemoteLibrary(): Promise<OfflineLibrary> {
  const [sectionsRes, questionsRes] = await Promise.all([
    fetch('/api/data/sections', { cache: 'no-store' }),
    fetch('/api/data/questions', { cache: 'no-store' }),
  ]);

  if (!sectionsRes.ok || !questionsRes.ok) {
    throw new Error('Failed to download library');
  }

  const sections = (await sectionsRes.json()) as AppCatalog['sections'];
  const items = (await questionsRes.json()) as {
    q: Question;
    content: string;
  }[];

  const questions = items.map((item) => item.q);
  const contentById: Record<string, string> = {};

  for (const { q, content } of items) {
    if (content?.trim()) {
      contentById[q.id] = content;
    }
  }

  const syncedAt = new Date().toISOString();

  return {
    catalog: { generatedAt: syncedAt, sections, questions },
    contentById,
    syncedAt,
  };
}

export function getQuestionContent(
  library: OfflineLibrary,
  questionId: string,
): string {
  return library.contentById[questionId] ?? '';
}
