import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/lib/storage/keys';
import { AdminSection } from '@/types/admin';

type Theme = 'light' | 'dark' | 'system';

interface UIState {
  searchOpen: boolean;
  theme: Theme;

  // Dynamic Sections
  sections: AdminSection[];
  setSections: (sections: AdminSection[]) => void;

  // Actions
  setSearchOpen: (open: boolean) => void;
  setTheme: (t: Theme) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      searchOpen: false,
      theme: 'system',

      sections: [],
      setSections: (sections) => set({ sections }),

      setSearchOpen: (open) => set({ searchOpen: open }),

      setTheme: (theme) => set({ theme }),
    }),
    {
      name: STORAGE_KEYS.UI,
      storage: createJSONStorage(() => localStorage),
      // Keep transient UI like searchOpen out of persisted state.
      partialize: (state) => ({
        theme: state.theme,
      }),
    },
  ),
);
