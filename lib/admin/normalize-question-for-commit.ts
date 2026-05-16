import type { Question } from '@/types/question';

const VALID_DIFFICULTIES = new Set<Question['difficulty']>([
  'easy',
  'medium',
  'hard',
]);
const VALID_FREQUENCIES = new Set<NonNullable<Question['frequency']>>([
  'very-high',
  'high',
  'medium',
  'low',
]);

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\s/]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

/** Canonical question metadata + optional markdown for Blob commit. */
export function normalizeQuestionForCommit(
  item: Question & { markdownContent?: string },
  section: string,
): Question & { markdownContent?: string } {
  const sectionKey = (item.section || section).trim();
  const category = (item.category || 'General').trim();
  const categorySlug = slugify(category) || 'general';
  const title = (item.title || 'Untitled').trim();
  const slug = slugify(item.slug || title) || 'untitled';
  const id = (item.id || `${sectionKey}-${categorySlug}-${slug}`).trim();

  const markdownPath = (
    item.markdownPath || `${sectionKey}/${categorySlug}/${slug}.md`
  )
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');

  const difficulty = VALID_DIFFICULTIES.has(item.difficulty)
    ? item.difficulty
    : 'medium';

  const frequency =
    item.frequency && VALID_FREQUENCIES.has(item.frequency)
      ? item.frequency
      : 'medium';

  const normalized: Question & { markdownContent?: string } = {
    id,
    section: sectionKey,
    category,
    title,
    slug,
    difficulty,
    pattern: typeof item.pattern === 'string' ? item.pattern.trim() : '',
    companies: asStringArray(item.companies),
    tags: asStringArray(item.tags),
    markdownPath,
    frequency,
    addedAt: item.addedAt || new Date().toISOString(),
  };

  if (item.timeComplexity) normalized.timeComplexity = item.timeComplexity;
  if (item.spaceComplexity) normalized.spaceComplexity = item.spaceComplexity;

  if (typeof item.markdownContent === 'string') {
    normalized.markdownContent = item.markdownContent;
  }

  return normalized;
}

/** Normalize and dedupe by id (last wins) for a full section sync. */
export function normalizeSectionForCommit(
  section: string,
  items: (Question & { markdownContent?: string })[],
): (Question & { markdownContent?: string })[] {
  const byId = new Map<string, Question & { markdownContent?: string }>();

  for (const item of items) {
    const normalized = normalizeQuestionForCommit(item, section);
    byId.set(normalized.id, normalized);
  }

  return Array.from(byId.values());
}
