import type { AdminSection } from '@/types/admin';
import type { Question } from '@/types/question';
import catalog from './catalog.generated.json';

export interface AppCatalog {
  generatedAt: string;
  sections: AdminSection[];
  questions: Question[];
}

const data = catalog as AppCatalog;

/** Sections metadata — available synchronously (offline-safe). */
export function getCatalogSections(): AdminSection[] {
  return data.sections;
}

/** All question stubs — available synchronously (offline-safe). */
export function getCatalogQuestions(): Question[] {
  return data.questions;
}

export function getCatalogGeneratedAt(): string {
  return data.generatedAt;
}
