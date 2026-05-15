import { createJSONStorage, type StateStorage } from 'zustand/middleware';

/**
 * Browser localStorage in the client; in-memory noop during SSR/build.
 * Without this, createJSONStorage(() => localStorage) fails on the server,
 * persist skips attaching api.persist, and useProgressHydrated crashes.
 */
export function getPersistStorage(): StateStorage {
  if (typeof window !== 'undefined') {
    return window.localStorage;
  }
  return {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };
}

export function createPersistJSONStorage<T>() {
  return createJSONStorage<T>(() => getPersistStorage());
}
