'use client';

import { useMemo } from 'react';
import { notFound } from 'next/navigation';
import { QuestionDetail } from '@/components/question/QuestionDetail';
import { useOfflineLibrary } from '@/lib/offline/use-offline-library';

interface QuestionPageClientProps {
  section: string;
  category: string;
  slug: string;
}

export function QuestionPageClient({
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
          q.category === decodedCategory &&
          q.slug === decodedSlug,
      ) ??
      questions.find(
        (q) => q.section === decodedSection && q.slug === decodedSlug,
      ) ??
      null
    );
  }, [questions, section, category, slug]);

  const content = useMemo(() => {
    if (!question) return '';
    const body = getContent(question.id);
    if (body) return body;
    if (offline) {
      return 'This topic is not in your offline library yet. Connect to the internet to download all content.';
    }
    return 'Loading content…';
  }, [question, getContent, offline]);

  if (!question) {
    notFound();
  }

  return <QuestionDetail question={question} content={content} />;
}
