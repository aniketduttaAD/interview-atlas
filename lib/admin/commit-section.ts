import path from 'path';
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
import {
  buildMarkdownWritesPayload,
  type MarkdownWritesPayload,
} from './commit-payload';

function markdownStub(q: Question & { markdownContent?: string }): {
  path: string;
  content: string;
} {
  const rel = path.join('content', q.markdownPath).replace(/\\/g, '/');
  return {
    path: rel,
    content: `# ${q.title}\n\n> Content pending generation. Use the AI generator to populate this topic.\n\n## Summary\nAdd content here.\n`,
  };
}

async function appendMissingMarkdownStubs(
  payload: MarkdownWritesPayload,
  content: (Question & { markdownContent?: string })[],
  blobContentById: Record<string, string>,
): Promise<void> {
  for (const q of content) {
    const hasRealContent =
      typeof q.markdownContent === 'string' &&
      q.markdownContent.trim().length > 80;
    if (hasRealContent) continue;

    const stub = markdownStub(q);
    if (payload.writes.some((w) => w.path === stub.path)) continue;

    const meta = sanitizeQuestionForStorage(
      q as Question & Record<string, unknown>,
    );
    const existing = blobContentById[meta.id]?.trim() ?? '';
    if (existing.length > 80) continue;

    payload.writes.push(stub);
  }
}

async function buildCatalogWithSectionUpdate(
  section: string,
  content: (Question & { markdownContent?: string })[],
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

/** Persist the library as a single private Vercel Blob snapshot. */
export async function commitSectionContent(
  section: string,
  content: (Question & { markdownContent?: string })[],
): Promise<{ catalog: AppCatalog }> {
  assertContentStoreWritable();

  const prev = await readLibrarySnapshot();
  const blobContentForStubs = prev?.contentById ?? {};

  const payload = buildMarkdownWritesPayload(content);
  await appendMissingMarkdownStubs(payload, content, blobContentForStubs);

  const catalog = await buildCatalogWithSectionUpdate(section, content);

  const contentBundle = { byId: { ...(prev?.contentById ?? {}) } };
  pruneContentBundleForCatalog(contentBundle, catalog);
  mergeMarkdownWritesIntoContentBundle(contentBundle, catalog, payload.writes);

  await writeLibrarySnapshot({
    version: LIBRARY_SNAPSHOT_VERSION,
    generatedAt: catalog.generatedAt,
    catalog,
    contentById: contentBundle.byId,
  });

  return { catalog };
}
