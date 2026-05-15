import Fuse from 'fuse.js';
import { Question } from '@/types/question';

interface SearchResult extends Question {
  href: string;
}

const FUSE_OPTIONS = {
  keys: [
    { name: 'title', weight: 0.7 },
    { name: 'category', weight: 0.2 },
    { name: 'tags', weight: 0.1 },
  ],
  threshold: 0.3,
  includeMatches: true,
  minMatchCharLength: 2,
};

export function createSearchIndex(data: Question[]): Fuse<Question> {
  return new Fuse(data, FUSE_OPTIONS);
}

export function searchQuestions(
  index: Fuse<Question>,
  query: string,
): SearchResult[] {
  if (!query) return [];

  return index.search(query).map((result) => {
    const q = result.item;
    return {
      ...q,
      href: `/${q.section}/${q.category.toLowerCase().replace(/\s+/g, '-')}/${q.slug}`,
    };
  });
}
