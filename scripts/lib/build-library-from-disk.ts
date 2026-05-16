import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { AdminSection } from '@/types/admin';
import type { Question } from '@/types/question';
import type { AppCatalog } from '@/lib/data/catalog-client';
import { sanitizeQuestionForStorage } from '@/lib/data/sanitize-question';
import {
  LIBRARY_SNAPSHOT_VERSION,
  type LibrarySnapshot,
} from '@/lib/blob/library-snapshot';

async function loadSectionQuestions(
  dataDir: string,
  sectionKey: string,
): Promise<Question[]> {
  const sectionDir = path.join(dataDir, sectionKey);
  let questions: Question[] = [];
  try {
    const files = await readdir(sectionDir);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const raw = await readFile(path.join(sectionDir, file), 'utf8');
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) continue;
      for (const item of parsed) {
        questions.push(
          sanitizeQuestionForStorage(item as Question & Record<string, unknown>),
        );
      }
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
  return questions;
}

/** Build a `LibrarySnapshot` from repo `data/` + `content/` (one-time migration). */
export async function buildLibraryFromDisk(
  root = process.cwd(),
): Promise<LibrarySnapshot> {
  const dataDir = path.join(root, 'data');
  const entries = await readdir(dataDir, { withFileTypes: true });

  const sections: AdminSection[] = [];
  let questions: Question[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    const key = entry.name;
    const sectionQuestions = await loadSectionQuestions(dataDir, key);
    questions = questions.concat(sectionQuestions);
    sections.push({
      key,
      label: key.toUpperCase(),
      color: 'primary',
      icon: 'FolderTree',
      questionCount: sectionQuestions.length,
    });
  }

  sections.sort((a, b) => a.key.localeCompare(b.key));

  if (sections.length === 0) {
    throw new Error('No questions found under data/<section>/*.json');
  }

  const catalog: AppCatalog = {
    generatedAt: new Date().toISOString(),
    sections,
    questions,
  };

  const contentById: Record<string, string> = {};
  const missingMarkdown: string[] = [];

  for (const q of catalog.questions) {
    if (!q.markdownPath) continue;
    const mdPath = path.join(root, 'content', q.markdownPath);
    try {
      contentById[q.id] = await readFile(mdPath, 'utf8');
    } catch {
      missingMarkdown.push(q.id);
    }
  }

  if (missingMarkdown.length > 0) {
    throw new Error(
      `Missing markdown for ${missingMarkdown.length} question(s): ${missingMarkdown.slice(0, 5).join(', ')}${missingMarkdown.length > 5 ? '…' : ''}`,
    );
  }

  return {
    version: LIBRARY_SNAPSHOT_VERSION,
    generatedAt: catalog.generatedAt,
    catalog,
    contentById,
  };
}
