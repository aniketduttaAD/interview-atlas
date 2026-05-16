import type { AdminSection } from '@/types/admin';
import type { Question } from '@/types/question';

export interface AppCatalog {
  generatedAt: string;
  sections: AdminSection[];
  questions: Question[];
}

/** Offline bootstrap before the first successful `/api/data/*` sync (empty shell). */
export const BUNDLED_FALLBACK_CATALOG: AppCatalog = {
  generatedAt: '1970-01-01T00:00:00.000Z',
  sections: [],
  questions: [],
};

export function createEmptyCatalog(): AppCatalog {
  return {
    generatedAt: new Date().toISOString(),
    sections: [],
    questions: [],
  };
}
