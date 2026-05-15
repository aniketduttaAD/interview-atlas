import fs from 'fs/promises';
import path from 'path';
import type { AdminSection } from '@/types/admin';
import type { Question } from '@/types/question';
import type { AppCatalog } from './catalog-client';

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

/** Write lib/data/catalog.generated.json (run after data/ changes). */
export async function writeCatalogFile(
  root = process.cwd(),
): Promise<AppCatalog> {
  const catalog = await buildCatalog(root);
  const outPath = path.join(root, 'lib/data/catalog.generated.json');
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, `${JSON.stringify(catalog, null, 2)}\n`);
  return catalog;
}
