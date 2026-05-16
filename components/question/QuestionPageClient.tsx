'use client';

import { useMemo } from 'react';
import { QuestionDetail } from '@/components/question/QuestionDetail';
import { categoryMatchesParam } from '@/lib/data/category-slug';
import { useOfflineLibrary } from '@/lib/offline/use-offline-library';
import type { Question } from '@/types/question';

interface QuestionPageClientProps {
  /** Resolved on the server so direct / new-tab loads work before offline library hydrates. */
  question: Question;
  initialContent: string;
  section: string;
  category: string;
  slug: string;
}

export function QuestionPageClient({
  question: serverQuestion,
  initialContent,
  section,
  category,
  slug,
}: QuestionPageClientProps) {
  const { questions, getContent, offline } = useOfflineLibrary();

  const question = useMemo(() => {
    const decodedSection = decodeURIComponent(section);
    const decodedCategory = decodeURIComponent(category);
    const decodedSlug = decodeURIComponent(slug);
    return (
      questions.find(
        (q) =>
          q.section === decodedSection &&
          categoryMatchesParam(q, decodedCategory) &&
          q.slug === decodedSlug,
      ) ??
      questions.find(
        (q) => q.section === decodedSection && q.slug === decodedSlug,
      ) ??
      serverQuestion
    );
  }, [questions, section, category, slug, serverQuestion]);

  const content = useMemo(() => {
    const body = getContent(question.id);
    if (body) return body;
    if (initialContent) return initialContent;
    if (offline) {
      return 'This topic is not in your offline library yet. Connect to the internet to download all content.';
    }
    return 'Loading content…';
  }, [question.id, getContent, initialContent, offline]);

  return <QuestionDetail question={question} content={content} />;
}
