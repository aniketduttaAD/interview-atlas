import type { Metadata } from 'next';
import { SectionKey } from '@/types/question';
import { getSectionData } from '@/lib/data/loader';
import { getSectionsServer } from '@/lib/data/sections-server';
import { SectionClient } from '@/components/section/SectionClient';
import { buildSectionMetadata } from '@/lib/seo/metadata';
import { notFound } from 'next/navigation';
import { AdminSection } from '@/types/admin';

interface PageProps {
  params: Promise<{
    section: string;
  }>;
}

export async function generateStaticParams() {
  const sections = (await getSectionsServer()) as AdminSection[];
  return sections.map((s) => ({
    section: s.key,
  }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { section } = await params;
  const sections = (await getSectionsServer()) as AdminSection[];
  const sectionMeta = sections.find((s) => s.key === section);
  if (!sectionMeta) return {};

  const questions = await getSectionData(section as SectionKey);
  return buildSectionMetadata({
    sectionKey: sectionMeta.key,
    sectionLabel: sectionMeta.label,
    topicCount: questions.length,
  });
}

export default async function SectionPage({ params }: PageProps) {
  const resolvedParams = await params;
  const sectionKey = resolvedParams.section as SectionKey;

  const sections = (await getSectionsServer()) as AdminSection[];
  const sectionMeta = sections.find((s) => s.key === sectionKey);
  if (!sectionMeta) {
    notFound();
  }

  return <SectionClient sectionKey={sectionKey} sectionMeta={sectionMeta} />;
}
