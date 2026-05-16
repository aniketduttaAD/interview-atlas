import { STORAGE_KEYS } from '@/lib/storage/keys';

const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

type DismissRecord = { permanent: true } | { until: number };

function readDismiss(): DismissRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PWA_INSTALL_DISMISSED);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DismissRecord;
    if (parsed && 'permanent' in parsed && parsed.permanent) return parsed;
    if (parsed && 'until' in parsed && typeof parsed.until === 'number') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function isPwaInstallDismissed(): boolean {
  const record = readDismiss();
  if (!record) return false;
  if ('permanent' in record) return true;
  return Date.now() < record.until;
}

export function snoozePwaInstallPrompt(): void {
  try {
    localStorage.setItem(
      STORAGE_KEYS.PWA_INSTALL_DISMISSED,
      JSON.stringify({ until: Date.now() + SNOOZE_MS }),
    );
  } catch {
    // ignore quota
  }
}

export function dismissPwaInstallPromptPermanent(): void {
  try {
    localStorage.setItem(
      STORAGE_KEYS.PWA_INSTALL_DISMISSED,
      JSON.stringify({ permanent: true }),
    );
  } catch {
    // ignore
  }
}
