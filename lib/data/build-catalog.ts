import fs from 'fs/promises';
import path from 'path';
import type { AdminSection } from '@/types/admin';
import type { Question } from '@/types/question';
import type { AppCatalog } from './catalog-client';
import { questionPath } from './question-path';

async function loadSectionQuestions(
  dataDir: string,
  sectionKey: string,
): Promise<Question[]> {
  const sectionDir = path.join(dataDir, sectionKey);
  let questions: Question[] = [];
  try {
    const files = await fs.readdir(sectionDir);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const raw = await fs.readFile(path.join(sectionDir, file), 'utf8');
      const parsed = JSON.parse(raw) as Question[];
      if (Array.isArray(parsed)) questions = questions.concat(parsed);
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
  return questions;
}

/** Build catalog snapshot from data/ JSON files. */
export async function buildCatalog(root = process.cwd()): Promise<AppCatalog> {
  const dataDir = path.join(root, 'data');
  const entries = await fs.readdir(dataDir, { withFileTypes: true });

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

  return {
    generatedAt: new Date().toISOString(),
    sections,
    questions,
  };
}

/** Markdown keyed by question id for offline reads. */
export async function buildContentBundle(
  catalog: AppCatalog,
  root = process.cwd(),
): Promise<{ byId: Record<string, string> }> {
  const byId: Record<string, string> = {};

  for (const q of catalog.questions) {
    if (!q.markdownPath) continue;
    try {
      const mdPath = path.join(root, 'content', q.markdownPath);
      byId[q.id] = await fs.readFile(mdPath, 'utf8');
    } catch {
      // Skip missing files
    }
  }

  return { byId };
}

export function buildOfflineRoutes(catalog: AppCatalog): string[] {
  const routes = new Set<string>(['/', '/progress', '/bookmarks', '/~offline']);

  for (const section of catalog.sections) {
    routes.add(`/${encodeURIComponent(section.key)}`);
  }

  for (const q of catalog.questions) {
    routes.add(questionPath(q));
  }

  return [...routes].sort();
}

/** Write lib/data/catalog.generated.json (run after data/ changes). */
export async function writeCatalogFile(
  root = process.cwd(),
): Promise<AppCatalog> {
  const catalog = await buildCatalog(root);
  const dataDir = path.join(root, 'lib/data');
  await fs.mkdir(dataDir, { recursive: true });

  await fs.writeFile(
    path.join(dataDir, 'catalog.generated.json'),
    `${JSON.stringify(catalog, null, 2)}\n`,
  );

  const content = await buildContentBundle(catalog, root);
  await fs.writeFile(
    path.join(dataDir, 'content.generated.json'),
    `${JSON.stringify(content)}\n`,
  );

  const routes = buildOfflineRoutes(catalog);
  await fs.writeFile(
    path.join(dataDir, 'offline-routes.generated.json'),
    `${JSON.stringify(routes, null, 2)}\n`,
  );

  return catalog;
}
