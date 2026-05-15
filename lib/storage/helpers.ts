import { STORAGE_KEYS } from './keys';

export function exportAllProgress(): string {
  const backup: Record<string, unknown> = {};
  if (typeof window === 'undefined') return JSON.stringify(backup);
  Object.values(STORAGE_KEYS).forEach((key) => {
    const val = localStorage.getItem(key);
    if (val) {
      try {
        backup[key] = JSON.parse(val);
      } catch {
        // ignore invalid json
      }
    }
  });
  return JSON.stringify(backup, null, 2);
}

export function importAllProgress(json: string): void {
  if (typeof window === 'undefined') return;
  try {
    const backup = JSON.parse(json);
    Object.entries(backup).forEach(([key, val]) => {
      localStorage.setItem(key, JSON.stringify(val));
    });
  } catch (e) {
    console.error('Failed to import progress', e);
  }
}
