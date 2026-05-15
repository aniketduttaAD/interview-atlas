import { getQuestion, getAllData } from '@/lib/data/loader';
import { QuestionDetail } from '@/components/question/QuestionDetail';
import { notFound } from 'next/navigation';
import fs from 'fs/promises';
import path from 'path';

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
  const resolvedParams = await params;
  const { section, category, slug } = resolvedParams;
  const id = `${section}-${category}-${slug}`;

  let question = await getQuestion(id);

  // Fallback: If ID mismatch happens due to category slug differences, find by slug and section
  if (!question) {
    const all = await getAllData();
    question =
      all.find((q) => q.section === section && q.slug === slug) || null;
  }

  if (!question) {
    notFound();
  }

  let content = 'Content not found.';
  try {
    const mdPath = path.join(process.cwd(), 'content', question.markdownPath);
    content = await fs.readFile(mdPath, 'utf8');
  } catch (error) {
    console.error('Failed to load markdown:', error);
  }

  return <QuestionDetail question={question} content={content} />;
}
