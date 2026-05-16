import { SectionKey } from '@/types/question';
import { getSectionsServer } from '@/lib/data/sections-server';
import { SectionClient } from '@/components/section/SectionClient';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{
    section: string;
  }>;
}

import { AdminSection } from '@/types/admin';

export async function generateStaticParams() {
  const sections = (await getSectionsServer()) as AdminSection[];
  return sections.map((s) => ({
    section: s.key,
  }));
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
