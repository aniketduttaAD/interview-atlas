import type { OfflineLibrary } from './library';
import {
  getBundledLibrary,
  readStoredLibrary,
  resolveLibrary,
} from './library';

type Listener = () => void;

const serverSnapshot = getBundledLibrary();

let snapshot: OfflineLibrary = serverSnapshot;
let storageHydrated = false;
const listeners = new Set<Listener>();

function emit(): void {
  listeners.forEach((cb) => cb());
}

function hydrateFromStorage(): void {
  if (typeof window === 'undefined' || storageHydrated) return;
  storageHydrated = true;
  snapshot = resolveLibrary(readStoredLibrary());
  emit();
}

export function subscribeOfflineLibrary(listener: Listener): () => void {
  hydrateFromStorage();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getOfflineLibrarySnapshot(): OfflineLibrary {
  return snapshot;
}

export function getOfflineLibraryServerSnapshot(): OfflineLibrary {
  return serverSnapshot;
}

export function setOfflineLibrarySnapshot(next: OfflineLibrary): void {
  snapshot = next;
  storageHydrated = true;
  emit();
}
