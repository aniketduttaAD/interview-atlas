'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus';
import type { OfflineLibrary } from './library';
import {
  getOfflineLibraryServerSnapshot,
  getOfflineLibrarySnapshot,
  setOfflineLibrarySnapshot,
  subscribeOfflineLibrary,
} from './library-client-store';
import { getQuestionContent, readStoredLibrary } from './library';
import { onLibrarySynced, runLibrarySync } from './library-sync';

export interface OfflineLibraryContextValue {
  sections: OfflineLibrary['catalog']['sections'];
  questions: OfflineLibrary['catalog']['questions'];
  generatedAt: string;
  syncedAt: string;
  online: boolean;
  offline: boolean;
  syncing: boolean;
  syncFromNetwork: () => Promise<void>;
  getContent: (questionId: string) => string;
}

const OfflineLibraryContext = createContext<OfflineLibraryContextValue | null>(
  null,
);

export function OfflineLibraryProvider({ children }: { children: ReactNode }) {
  const online = useOnlineStatus();
  const library = useSyncExternalStore(
    subscribeOfflineLibrary,
    getOfflineLibrarySnapshot,
    getOfflineLibraryServerSnapshot,
  );
  const [syncing, setSyncing] = useState(false);

  useEffect(
    () =>
      onLibrarySynced((next) => {
        setOfflineLibrarySnapshot(next);
      }),
    [],
  );

  const syncFromNetwork = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.onLine) return;
    setSyncing(true);
    try {
      const remote = await runLibrarySync({ force: true });
      if (remote) setOfflineLibrarySnapshot(remote);
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    if (!online) return;

    let cancelled = false;
    void (async () => {
      setSyncing(true);
      const needsInitial = !readStoredLibrary();
      const remote = await runLibrarySync({ force: needsInitial });
      if (!cancelled && remote) setOfflineLibrarySnapshot(remote);
      if (!cancelled) setSyncing(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [online]);

  const value = useMemo<OfflineLibraryContextValue>(
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

  return (
    <OfflineLibraryContext.Provider value={value}>
      {children}
    </OfflineLibraryContext.Provider>
  );
}

export function useOfflineLibrary(): OfflineLibraryContextValue {
  const ctx = useContext(OfflineLibraryContext);
  if (!ctx) {
    throw new Error(
      'useOfflineLibrary must be used within OfflineLibraryProvider',
    );
  }
  return ctx;
}
