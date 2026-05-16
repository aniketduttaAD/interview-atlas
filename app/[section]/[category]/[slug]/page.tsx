import type { Metadata } from 'next';
import { categorySlugForQuestion } from '@/lib/data/category-slug';
import {
  getAllData,
  getQuestionByPath,
  getQuestionMarkdown,
} from '@/lib/data/loader';
import { questionPath } from '@/lib/data/question-path';
import { getSectionsServer } from '@/lib/data/sections-server';
import { QuestionPageClient } from '@/components/question/QuestionPageClient';
import { buildQuestionMetadata } from '@/lib/seo/metadata';
import { notFound, redirect } from 'next/navigation';
import { AdminSection } from '@/types/admin';

export const dynamicParams = true;

interface PageProps {
  params: Promise<{
    section: string;
    category: string;
    slug: string;
  }>;
}

export async function generateStaticParams() {
  const all = await getAllData();
  return all.map((q) => ({
    section: q.section,
    category: categorySlugForQuestion(q),
    slug: q.slug,
  }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { section, category, slug } = await params;
  const question = await getQuestionByPath(section, category, slug);
  if (!question) return {};

  const sections = (await getSectionsServer()) as AdminSection[];
  const sectionMeta = sections.find((s) => s.key === question.section);
  const sectionLabel = sectionMeta?.label ?? question.section;

  return buildQuestionMetadata({ question, sectionLabel });
}

export default async function QuestionPage({ params }: PageProps) {
  const { section, category, slug } = await params;

  if (!section || !slug) {
    notFound();
  }

  const question = await getQuestionByPath(section, category, slug);
  if (!question) {
    notFound();
  }

  const canonicalCategory = categorySlugForQuestion(question);
  if (decodeURIComponent(category) !== canonicalCategory) {
    redirect(questionPath(question));
  }

  const initialContent = await getQuestionMarkdown(question.id);

  return (
    <QuestionPageClient
      question={question}
      initialContent={initialContent}
      section={section}
      category={canonicalCategory}
      slug={slug}
    />
  );
}
