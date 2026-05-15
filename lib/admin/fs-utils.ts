import fs from 'fs/promises';
import path from 'path';
import { Question } from '@/types/question';
import { buildCatalog } from '@/lib/data/build-catalog';
import { sanitizeQuestionForStorage } from '@/lib/data/sanitize-question';
import { assertContentStoreWritable } from '@/lib/env';

export async function getLatestContent(limit = 10) {
  const { questions } = await buildCatalog();
  return questions.slice(0, limit);
}

export async function commitSectionContent(
  section: string,
  content: (Question & { markdownContent?: string })[],
) {
  assertContentStoreWritable();
  const sectionDir = path.join(process.cwd(), 'data', section);
  await fs.mkdir(sectionDir, { recursive: true });

  const files = await fs.readdir(sectionDir);
  for (const file of files) {
    if (file.endsWith('.json')) {
      await fs.unlink(path.join(sectionDir, file));
    }
  }

  const grouped: Record<string, Question[]> = {};
  content.forEach((q) => {
    const metadata = sanitizeQuestionForStorage(
      q as Question & Record<string, unknown>,
    );
    const category = metadata.category;
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(metadata);
  });

  for (const [category, questions] of Object.entries(grouped)) {
    const fileName =
      category
        .toLowerCase()
        .replace(/[\s\/]+/g, '-')
        .replace(/[^a-z0-9-]/g, '') + '.json';
    const filePath = path.join(sectionDir, fileName);
    await fs.writeFile(filePath, JSON.stringify(questions, null, 2));
  }

  for (const q of content) {
    const mdPath = path.join(process.cwd(), 'content', q.markdownPath);
    await fs.mkdir(path.dirname(mdPath), { recursive: true });

    const hasRealContent =
      typeof q.markdownContent === 'string' &&
      q.markdownContent.trim().length > 80;

    if (hasRealContent && q.markdownContent) {
      await fs.writeFile(mdPath, q.markdownContent.trim());
    } else {
      try {
        await fs.access(mdPath);
      } catch {
        const stub = `# ${q.title}\n\n> Content pending generation. Use the AI generator to populate this topic.\n\n## Summary\nAdd content here.`;
        await fs.writeFile(mdPath, stub);
      }
    }
  }
}
