import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/lib/storage/keys';
import { Message } from '@/types/ai';

interface AIState {
  panelOpen: boolean;
  activeQuestionId: string | null;
  messages: Record<string, Message[]>; // keyed by questionId
  loading: boolean;
  error: string | null;

  // Actions
  openPanel: (questionId: string) => void;
  closePanel: () => void;
  addMessage: (questionId: string, msg: Omit<Message, 'timestamp'>) => void;
  clearHistory: (questionId: string) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
}

export const useAIStore = create<AIState>()(
  persist(
    (set) => ({
      panelOpen: false,
      activeQuestionId: null,
      messages: {},
      loading: false,
      error: null,

      openPanel: (questionId) =>
        set({ panelOpen: true, activeQuestionId: questionId, error: null }),

      closePanel: () => set({ panelOpen: false, activeQuestionId: null }),

      addMessage: (questionId, msg) =>
        set((state) => {
          const currentHistory = state.messages[questionId] || [];
          return {
            messages: {
              ...state.messages,
              [questionId]: [
                ...currentHistory,
                { ...msg, timestamp: Date.now() },
              ],
            },
          };
        }),

      clearHistory: (questionId) =>
        set((state) => {
          const newMessages = { ...state.messages };
          delete newMessages[questionId];
          return { messages: newMessages };
        }),

      setLoading: (loading) => set({ loading }),

      setError: (error) => set({ error }),
    }),
    {
      name: STORAGE_KEYS.AI_HIST,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        messages: state.messages, // Only persist messages, not UI state like panelOpen
      }),
    },
  ),
);
