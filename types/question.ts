export type SectionKey = string;

export interface Question {
  id: string;
  section: SectionKey;
  category: string;
  title: string;
  slug: string;
  difficulty: 'easy' | 'medium' | 'hard';
  pattern?: string;
  companies: string[];
  tags: string[];
  markdownPath: string;
  timeComplexity?: string;
  spaceComplexity?: string;
  frequency?: 'very-high' | 'high' | 'medium' | 'low';
  addedAt: string;
}
