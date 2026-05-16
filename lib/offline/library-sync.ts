import type { OfflineLibrary } from './library';
import {
  fetchRemoteLibrary,
  readStoredLibrary,
  writeStoredLibrary,
} from './library';

/** Minimum time between automatic background syncs (tab focus, etc.). */
export const LIBRARY_BACKGROUND_SYNC_MS = 15 * 60 * 1000;

const VISIBILITY_DEBOUNCE_MS = 600;

type LibraryListener = (library: OfflineLibrary) => void;

let inflightSync: Promise<OfflineLibrary | null> | null = null;
let lastSuccessfulSyncMs = 0;
let visibilityTimer: ReturnType<typeof setTimeout> | null = null;
let visibilityListenerRegistered = false;

const listeners = new Set<LibraryListener>();

function notifyListeners(library: OfflineLibrary): void {
  listeners.forEach((cb) => {
    try {
      cb(library);
    } catch {
      // ignore listener errors
    }
  });
}

function isLibraryStale(): boolean {
  if (Date.now() - lastSuccessfulSyncMs < LIBRARY_BACKGROUND_SYNC_MS) {
    return false;
  }

  const stored = readStoredLibrary();
  if (!stored?.syncedAt) return true;

  const age = Date.now() - new Date(stored.syncedAt).getTime();
  return age >= LIBRARY_BACKGROUND_SYNC_MS;
}

async function performSync(): Promise<OfflineLibrary | null> {
  try {
    const remote = await fetchRemoteLibrary();
    writeStoredLibrary(remote);
    lastSuccessfulSyncMs = Date.now();
    notifyListeners(remote);
    return remote;
  } catch {
    return null;
  }
}

/**
 * Download full catalog + markdown from Blob APIs.
 * Dedupes concurrent callers; skips when recently synced unless `force`.
 */
export function runLibrarySync(options?: {
  force?: boolean;
}): Promise<OfflineLibrary | null> {
  if (typeof window === 'undefined' || !navigator.onLine) {
    return Promise.resolve(null);
  }

  const force = options?.force ?? false;
  if (!force && !isLibraryStale()) {
    return Promise.resolve(null);
  }

  if (inflightSync) return inflightSync;

  inflightSync = performSync().finally(() => {
    inflightSync = null;
  });

  return inflightSync;
}

function ensureVisibilityListener(): void {
  if (visibilityListenerRegistered || typeof document === 'undefined') return;
  visibilityListenerRegistered = true;

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') return;
    scheduleDebouncedBackgroundSync();
  });

  window.addEventListener('online', () => {
    void runLibrarySync({ force: false });
  });
}

/** Subscribe to successful background syncs (singleton; safe across remounts). */
export function onLibrarySynced(listener: LibraryListener): () => void {
  listeners.add(listener);
  ensureVisibilityListener();
  return () => {
    listeners.delete(listener);
  };
}

/** Debounced sync when tab becomes visible (module singleton). */
export function scheduleDebouncedBackgroundSync(): void {
  if (typeof window === 'undefined') return;
  if (visibilityTimer) clearTimeout(visibilityTimer);
  visibilityTimer = setTimeout(() => {
    visibilityTimer = null;
    if (document.visibilityState === 'hidden' || !navigator.onLine) return;
    void runLibrarySync();
  }, VISIBILITY_DEBOUNCE_MS);
}
