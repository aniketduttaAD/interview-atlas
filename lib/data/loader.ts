import fs from 'fs/promises';
import path from 'path';
import { Question, SectionKey } from '@/types/question';
import { buildCatalog } from './build-catalog';

export async function getSectionData(section: SectionKey): Promise<Question[]> {
  const dataDir = path.join(process.cwd(), 'data', section);
  try {
    const files = await fs.readdir(dataDir);
    const jsonFiles = files.filter((f) => f.endsWith('.json'));

    let allQuestions: Question[] = [];

    for (const file of jsonFiles) {
      const filePath = path.join(dataDir, file);
      const content = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(content) as Question[];
      allQuestions = allQuestions.concat(parsed);
    }

    return allQuestions;
  } catch (error: unknown) {
    if ((error as { code?: string }).code !== 'ENOENT') {
      console.error(`Error loading data for section ${section}:`, error);
    }
    return [];
  }
}

export async function getAllData(): Promise<Question[]> {
  const catalog = await buildCatalog();
  return catalog.questions;
}

export async function getQuestion(id: string): Promise<Question | null> {
  const all = await getAllData();
  return all.find((q) => q.id === id) || null;
}
