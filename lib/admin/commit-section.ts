import type { Question } from '@/types/question';
import type { AppCatalog } from '@/lib/data/catalog-client';
import {
  mergeMarkdownWritesIntoContentBundle,
  pruneContentBundleForCatalog,
} from '@/lib/data/catalog-merge';
import { sanitizeQuestionForStorage } from '@/lib/data/sanitize-question';
import { loadResolvedCatalog } from '@/lib/data/load-resolved-catalog';
import { assertContentStoreWritable } from '@/lib/env';
import {
  LIBRARY_SNAPSHOT_VERSION,
  readLibrarySnapshot,
  writeLibrarySnapshot,
} from '@/lib/blob/library-snapshot';
import { buildMarkdownWritesForCommit } from './commit-payload';
import { normalizeSectionForCommit } from './normalize-question-for-commit';

async function buildCatalogWithSectionUpdate(
  section: string,
  content: Question[],
): Promise<AppCatalog> {
  const base = await loadResolvedCatalog();
  const sanitized = content.map((q) =>
    sanitizeQuestionForStorage(q as Question & Record<string, unknown>),
  );
  const otherQuestions = base.questions.filter((q) => q.section !== section);
  const questions = [...otherQuestions, ...sanitized];

  const sections = base.sections.map((s) =>
    s.key === section ? { ...s, questionCount: sanitized.length } : s,
  );

  const sectionExists = sections.some((s) => s.key === section);
  if (!sectionExists) {
    sections.push({
      key: section,
      label: section.toUpperCase(),
      color: 'primary',
      icon: 'FolderTree',
      questionCount: sanitized.length,
    });
    sections.sort((a, b) => a.key.localeCompare(b.key));
  }

  return {
    generatedAt: new Date().toISOString(),
    sections,
    questions,
  };
}

export interface CommitSectionResult {
  catalog: AppCatalog;
  stats: {
    section: string;
    topics: number;
    withContent: number;
    placeholders: number;
  };
}

/** Persist the library as a single private Vercel Blob snapshot. */
export async function commitSectionContent(
  section: string,
  content: (Question & { markdownContent?: string })[],
): Promise<CommitSectionResult> {
  assertContentStoreWritable();

  const normalized = normalizeSectionForCommit(section, content);
  const catalogQuestions = normalized.map((q) => {
    const meta: Question & Record<string, unknown> = { ...q };
    delete meta.markdownContent;
    return sanitizeQuestionForStorage(meta);
  });

  const prev = await readLibrarySnapshot();
  const blobContentForStubs = prev?.contentById ?? {};

  const { payload, stats } = buildMarkdownWritesForCommit(
    normalized,
    blobContentForStubs,
  );

  const catalog = await buildCatalogWithSectionUpdate(
    section,
    catalogQuestions,
  );

  const contentBundle = { byId: { ...(prev?.contentById ?? {}) } };
  pruneContentBundleForCatalog(contentBundle, catalog);
  mergeMarkdownWritesIntoContentBundle(contentBundle, catalog, payload.writes);

  await writeLibrarySnapshot({
    version: LIBRARY_SNAPSHOT_VERSION,
    generatedAt: catalog.generatedAt,
    catalog,
    contentById: contentBundle.byId,
  });

  return {
    catalog,
    stats: {
      section,
      topics: stats.total,
      withContent: stats.withContent,
      placeholders: stats.placeholders,
    },
  };
}
