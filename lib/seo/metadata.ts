import type { Metadata } from 'next';
import type { Question } from '@/types/question';
import { questionPath, sectionPath } from '@/lib/data/question-path';
import { absoluteUrl, getSiteUrl } from '@/lib/seo/site-url';

const APP_NAME = 'Interview Atlas';

function ogImage() {
  const url = absoluteUrl('/icon.png');
  return [
    {
      url,
      width: 512,
      height: 512,
      alt: APP_NAME,
      type: 'image/png' as const,
    },
  ];
}

function baseOpenGraph(
  title: string,
  description: string,
  url: string,
): Metadata['openGraph'] {
  return {
    type: 'website',
    siteName: APP_NAME,
    title,
    description,
    url,
    images: ogImage(),
  };
}

function baseTwitter(title: string, description: string): Metadata['twitter'] {
  return {
    card: 'summary',
    title,
    description,
    images: [absoluteUrl('/icon.png')],
  };
}

export function buildSectionMetadata(input: {
  sectionKey: string;
  sectionLabel: string;
  topicCount: number;
}): Metadata {
  const { sectionKey, sectionLabel, topicCount } = input;
  const path = sectionPath(sectionKey);
  const url = absoluteUrl(path);
  const title = sectionLabel;
  const description = `${topicCount} senior-level topic${topicCount === 1 ? '' : 's'} in ${sectionLabel}. Study offline with Interview Atlas.`;
  const ogTitle = `${sectionLabel} · ${APP_NAME}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: baseOpenGraph(ogTitle, description, url),
    twitter: baseTwitter(ogTitle, description),
  };
}

export function buildQuestionMetadata(input: {
  question: Pick<
    Question,
    'section' | 'category' | 'slug' | 'title' | 'difficulty'
  >;
  sectionLabel: string;
}): Metadata {
  const { question, sectionLabel } = input;
  const path = questionPath(question);
  const url = absoluteUrl(path);
  const title = question.title;
  const description = `${sectionLabel} — ${question.difficulty} interview topic. Open in Interview Atlas to study with offline notes and AI.`;
  const ogTitle = `${question.title} · ${sectionLabel} · ${APP_NAME}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: baseOpenGraph(ogTitle, description, url),
    twitter: baseTwitter(ogTitle, description),
  };
}

/** Default OG tags for the home page and fallback. */
export function buildRootMetadata(): Partial<Metadata> {
  const url = getSiteUrl();
  const description =
    'Offline-first interview preparation for senior engineers. AI assistant requires internet.';
  return {
    metadataBase: new URL(url),
    openGraph: baseOpenGraph(APP_NAME, description, url),
    twitter: baseTwitter(APP_NAME, description),
  };
}
