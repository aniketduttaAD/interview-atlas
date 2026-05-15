import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/lib/storage/keys';
import { createPersistJSONStorage } from '@/lib/storage/persist-storage';

type Difficulty = 'easy' | 'medium' | 'hard';
type Status = 'all' | 'done' | 'bookmarked';

interface FilterState {
  difficulty: Difficulty[];
  status: Status;

  setDifficulty: (d: Difficulty[]) => void;
  setStatus: (s: Status) => void;
  resetFilters: () => void;
}

const initialState = {
  difficulty: [] as Difficulty[],
  status: 'all' as Status,
};

export const useFilterStore = create<FilterState>()(
  persist(
    (set) => ({
      ...initialState,

      setDifficulty: (difficulty) => set({ difficulty }),

      setStatus: (status) => set({ status }),

      resetFilters: () => set(initialState),
    }),
    {
      name: STORAGE_KEYS.FILTERS,
      storage: createPersistJSONStorage(),
    },
  ),
);
