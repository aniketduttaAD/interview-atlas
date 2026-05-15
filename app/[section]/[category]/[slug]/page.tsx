import { getAllData } from '@/lib/data/loader';
import { QuestionPageClient } from '@/components/question/QuestionPageClient';
import { notFound } from 'next/navigation';

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
    category: q.category,
    slug: q.slug,
  }));
}

export default async function QuestionPage({ params }: PageProps) {
  const { section, category, slug } = await params;

  if (!section || !slug) {
    notFound();
  }

  return (
    <QuestionPageClient section={section} category={category} slug={slug} />
  );
}
