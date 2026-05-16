import { loadResolvedLibrary } from '@/lib/data/load-resolved-catalog';
import { isBlobConfigured } from '@/lib/blob/library-snapshot';

export interface ResolvedChatTopic {
  questionTitle: string;
  sectionLabel: string;
  questionContent: string;
}

/**
 * Load topic context from the Blob library snapshot (source of truth).
 * Prevents clients from spoofing huge or unrelated `questionContent` to game relevance or prompts.
 */
export async function resolveChatTopicFromBlob(
  questionId: string,
): Promise<ResolvedChatTopic | null> {
  const id = questionId.trim();
  if (!id || !isBlobConfigured()) return null;

  const { catalog, blobContentById } = await loadResolvedLibrary();
  const question = catalog.questions.find((q) => q.id === id);
  if (!question) return null;

  const section = catalog.sections.find((s) => s.key === question.section);
  const questionContent = blobContentById[question.id]?.trim() ?? '';

  return {
    questionTitle: question.title,
    sectionLabel: section?.label ?? question.section,
    questionContent,
  };
}
