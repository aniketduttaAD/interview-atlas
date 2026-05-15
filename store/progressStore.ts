import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useSyncExternalStore } from 'react';
import { STORAGE_KEYS } from '@/lib/storage/keys';

interface ProgressState {
  done: string[];
  bookmarks: string[];
  recent: string[]; // FIFO queue, max 10 items

  // Actions
  markDone: (id: string) => void;
  unmarkDone: (id: string) => void;
  toggleBookmark: (id: string) => void;
  addRecent: (id: string) => void;

  // Computed helpers
  isDone: (id: string) => boolean;
  isBookmarked: (id: string) => boolean;
  getDoneCountBySection: (section: string, allIds: string[]) => number;
  resetSection: (sectionIds: string[]) => void;
  resetAll: () => void;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      done: [],
      bookmarks: [],
      recent: [],

      markDone: (id) =>
        set((state) => ({
          done: state.done.includes(id) ? state.done : [...state.done, id],
        })),

      unmarkDone: (id) =>
        set((state) => ({
          done: state.done.filter((x) => x !== id),
        })),

      toggleBookmark: (id) =>
        set((state) => ({
          bookmarks: state.bookmarks.includes(id)
            ? state.bookmarks.filter((x) => x !== id)
            : [...state.bookmarks, id],
        })),

      addRecent: (id) =>
        set((state) => {
          const filtered = state.recent.filter((x) => x !== id);
          return {
            recent: [id, ...filtered].slice(0, 10),
          };
        }),

      isDone: (id) => get().done.includes(id),

      isBookmarked: (id) => get().bookmarks.includes(id),

      getDoneCountBySection: (section, allIds) => {
        const done = get().done;
        return allIds.filter(
          (id) => done.includes(id) && id.startsWith(section + '-'),
        ).length;
      },

      resetSection: (sectionIds) =>
        set((state) => ({
          done: state.done.filter((id) => !sectionIds.includes(id)),
          bookmarks: state.bookmarks.filter((id) => !sectionIds.includes(id)),
          recent: state.recent.filter((id) => !sectionIds.includes(id)),
        })),

      resetAll: () => set({ done: [], bookmarks: [], recent: [] }),
    }),
    {
      name: STORAGE_KEYS.PROGRESS,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/** True after localStorage rehydration — use before reading done/bookmarks on SSR pages. */
export function useProgressHydrated() {
  return useSyncExternalStore(
    useProgressStore.persist.onFinishHydration,
    () => useProgressStore.persist.hasHydrated(),
    () => false,
  );
}
