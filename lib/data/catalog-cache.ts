import type { AppCatalog } from './catalog-client';
import { STORAGE_KEYS } from '@/lib/storage/keys';

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

export function readCatalogCache(): AppCatalog | null {
  try {
    const raw = storage()?.getItem(STORAGE_KEYS.CATALOG);
    if (!raw) return null;
    return JSON.parse(raw) as AppCatalog;
  } catch {
    return null;
  }
}

export function writeCatalogCache(catalog: AppCatalog): void {
  try {
    storage()?.setItem(STORAGE_KEYS.CATALOG, JSON.stringify(catalog));
  } catch {
    // Quota or private mode — bundled catalog remains fallback
  }
}

export function pickNewerCatalog(
  bundled: AppCatalog,
  cached: AppCatalog | null,
): AppCatalog {
  if (!cached?.generatedAt) return bundled;
  if (!bundled.generatedAt) return cached;
  return new Date(cached.generatedAt) >= new Date(bundled.generatedAt)
    ? cached
    : bundled;
}
