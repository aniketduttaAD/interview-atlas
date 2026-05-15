import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const difficultyBadgeClass: Record<'easy' | 'medium' | 'hard', string> =
  {
    easy: 'badge-difficulty-easy',
    medium: 'badge-difficulty-medium',
    hard: 'badge-difficulty-hard',
  };
