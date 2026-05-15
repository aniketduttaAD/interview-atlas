'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AdminSection } from '@/types/admin';
import type { Question } from '@/types/question';
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus';
import {
  getCatalogGeneratedAt,
  getCatalogQuestions,
  getCatalogSections,
  type AppCatalog,
} from './catalog-client';
import {
  pickNewerCatalog,
  readCatalogCache,
  writeCatalogCache,
} from './catalog-cache';

const bundledCatalog: AppCatalog = {
  generatedAt: getCatalogGeneratedAt(),
  sections: getCatalogSections(),
  questions: getCatalogQuestions(),
};

function getInitialCatalog(): AppCatalog {
  return pickNewerCatalog(bundledCatalog, readCatalogCache());
}

async function fetchLiveCatalog(): Promise<AppCatalog> {
  const [sectionsRes, questionsRes] = await Promise.all([
    fetch('/api/data/sections', { cache: 'no-store' }),
    fetch('/api/data/questions', { cache: 'no-store' }),
  ]);

  if (!sectionsRes.ok || !questionsRes.ok) {
    throw new Error('Failed to load live catalog');
  }

  const sections = (await sectionsRes.json()) as AdminSection[];
  const questionPayload = (await questionsRes.json()) as {
    q: Question;
  }[];

  return {
    generatedAt: new Date().toISOString(),
    sections,
    questions: questionPayload.map((item) => item.q),
  };
}

/**
 * Offline-first catalog: bundled JSON + optional localStorage cache.
 * When online, refreshes from /api/data/* so admin commits are visible without rebuild.
 */
export function useAppCatalog() {
  const online = useOnlineStatus();
  const [catalog, setCatalog] = useState<AppCatalog>(getInitialCatalog);
  const [syncing, setSyncing] = useState(false);

  const refreshFromNetwork = useCallback(async () => {
    if (!navigator.onLine) return;
    setSyncing(true);
    try {
      const live = await fetchLiveCatalog();
      writeCatalogCache(live);
      setCatalog(live);
    } catch {
      // Keep bundled / cached catalog on failure
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    if (!online) return;
    const timer = window.setTimeout(() => {
      void refreshFromNetwork();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [online, refreshFromNetwork]);

  return useMemo(
    () => ({
      sections: catalog.sections,
      questions: catalog.questions,
      generatedAt: catalog.generatedAt,
      syncing,
      refreshFromNetwork,
    }),
    [catalog, syncing, refreshFromNetwork],
  );
}
