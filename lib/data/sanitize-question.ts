import type { Question } from '@/types/question';

/** Fields that must not be written to data/*.json (admin UI / runtime only). */
const STRIP_KEYS = new Set([
  'markdownContent',
  'contentStatus',
  'content',
]);

/** Normalize a question record before persisting to the content store (data/*.json). */
export function sanitizeQuestionForStorage(
  item: Question & Record<string, unknown>,
): Question {
  const clean = { ...item };
  for (const key of STRIP_KEYS) {
    delete clean[key];
  }
  return clean as Question;
}
