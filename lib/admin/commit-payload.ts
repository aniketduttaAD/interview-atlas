import path from 'path';
import type { Question } from '@/types/question';
import {
  isPlaceholderMarkdown,
  placeholderMarkdownForTitle,
} from '@/lib/admin/content-placeholder';

export interface CommitFileWrite {
  path: string;
  content: string;
}

export interface MarkdownWritesPayload {
  writes: CommitFileWrite[];
}

export interface MarkdownWriteStats {
  total: number;
  withContent: number;
  placeholders: number;
}

function contentPathForQuestion(q: Question): string {
  const mdRel = q.markdownPath.replace(/\\/g, '/');
  return path.join('content', mdRel).replace(/\\/g, '/');
}

/**
 * One markdown write per topic in the section: real body, preserved Blob body, or placeholder.
 */
export function buildMarkdownWritesForCommit(
  content: (Question & { markdownContent?: string })[],
  blobContentById: Record<string, string>,
): { payload: MarkdownWritesPayload; stats: MarkdownWriteStats } {
  const writes: CommitFileWrite[] = [];
  let withContent = 0;
  let placeholders = 0;

  for (const q of content) {
    const filePath = contentPathForQuestion(q);
    const fromEditor = q.markdownContent?.trim();
    const fromBlob = blobContentById[q.id]?.trim();

    if (fromEditor && !isPlaceholderMarkdown(fromEditor)) {
      writes.push({ path: filePath, content: fromEditor + '\n' });
      withContent++;
      continue;
    }

    if (fromBlob && !isPlaceholderMarkdown(fromBlob)) {
      writes.push({
        path: filePath,
        content: fromBlob.endsWith('\n') ? fromBlob : `${fromBlob}\n`,
      });
      withContent++;
      continue;
    }

    writes.push({
      path: filePath,
      content: placeholderMarkdownForTitle(q.title),
    });
    placeholders++;
  }

  return {
    payload: { writes },
    stats: {
      total: content.length,
      withContent,
      placeholders,
    },
  };
}
