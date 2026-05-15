import { Question } from './question';

export interface StubItem extends Partial<Question> {
  id: string;
  section: string;
  category: string;
  title: string;
  slug: string;
  difficulty: 'easy' | 'medium' | 'hard';
  pattern?: string;
  companies: string[];
  tags: string[];
  markdownPath: string;
  frequency?: 'very-high' | 'high' | 'medium' | 'low';
  addedAt: string;
  contentStatus: 'pending' | 'generating' | 'done' | 'error';
  content?: string;
  markdownContent?: string;
}

export interface AdminSection {
  key: string;
  label: string;
  questionCount: number;
  color?: string;
  icon?: string;
  path?: string;
}
