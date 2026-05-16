'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus';
import type { OfflineLibrary } from './library';
import {
  fetchRemoteLibrary,
  getInitialLibrary,
  getQuestionContent,
  writeStoredLibrary,
} from './library';

/**
 * Single offline-first data layer.
 * Online: downloads full catalog + markdown from Blob-backed APIs, stores locally.
 * Reconnect: auto-syncs when `online` fires, tab refocuses, or window gains focus.
 * Offline: reads stored library only (empty shell until first successful sync).
 */
export function useOfflineLibrary() {
  const online = useOnlineStatus();
  const [library, setLibrary] = useState<OfflineLibrary>(getInitialLibrary);
  const [syncing, setSyncing] = useState(false);
  const syncInFlight = useRef(false);

  const syncFromNetwork = useCallback(async () => {
    if (
      typeof window === 'undefined' ||
      !navigator.onLine ||
      syncInFlight.current
    ) {
      return;
    }

    syncInFlight.current = true;
    setSyncing(true);

    try {
      const remote = await fetchRemoteLibrary();
      writeStoredLibrary(remote);
      setLibrary(remote);
    } catch {
      // Keep existing library on failure
    } finally {
      setSyncing(false);
      syncInFlight.current = false;
    }
  }, []);

  // Initial load + every offline → online transition
  useEffect(() => {
    if (!online) return;
    const timer = window.setTimeout(() => {
      void syncFromNetwork();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [online, syncFromNetwork]);

  // Tab visible / window focused while online (e.g. laptop wake, mobile return)
  useEffect(() => {
    const syncIfOnline = () => {
      if (document.visibilityState !== 'hidden' && navigator.onLine) {
        window.setTimeout(() => void syncFromNetwork(), 0);
      }
    };

    document.addEventListener('visibilitychange', syncIfOnline);
    window.addEventListener('focus', syncIfOnline);
    window.addEventListener('online', syncIfOnline);

    return () => {
      document.removeEventListener('visibilitychange', syncIfOnline);
      window.removeEventListener('focus', syncIfOnline);
      window.removeEventListener('online', syncIfOnline);
    };
  }, [syncFromNetwork]);

  return useMemo(
    () => ({
      sections: library.catalog.sections,
      questions: library.catalog.questions,
      generatedAt: library.catalog.generatedAt,
      syncedAt: library.syncedAt,
      online,
      offline: !online,
      syncing,
      syncFromNetwork,
      getContent: (questionId: string) =>
        getQuestionContent(library, questionId),
    }),
    [library, online, syncing, syncFromNetwork],
  );
}
