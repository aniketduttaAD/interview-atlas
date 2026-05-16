import path from 'path';
import type { Question } from '@/types/question';
import { sanitizeQuestionForStorage } from '@/lib/data/sanitize-question';

export interface CommitFileWrite {
  path: string;
  content: string;
}

export interface MarkdownWritesPayload {
  writes: CommitFileWrite[];
}

/** Logical markdown paths under content/ merged into the Blob snapshot. */
export function buildMarkdownWritesPayload(
  content: (Question & { markdownContent?: string })[],
): MarkdownWritesPayload {
  const writes: CommitFileWrite[] = [];

  for (const q of content) {
    const metadata = sanitizeQuestionForStorage(
      q as Question & Record<string, unknown>,
    );
    const mdRel = metadata.markdownPath.replace(/\\/g, '/');
    const hasRealContent =
      typeof q.markdownContent === 'string' &&
      q.markdownContent.trim().length > 80;

    if (hasRealContent && q.markdownContent) {
      writes.push({
        path: path.join('content', mdRel).replace(/\\/g, '/'),
        content: q.markdownContent.trim() + '\n',
      });
    }
  }

  return { writes };
}
