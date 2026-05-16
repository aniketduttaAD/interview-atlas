/** Shared limits for `/api/ai/chat` (server + client UI). */
export const AI_CHAT_LIMITS = {
  maxUserMessageChars: 12_000,
  maxQuestionTitleChars: 500,
  maxSectionLabelChars: 120,
  maxQuestionContentChars: 150_000,
  maxHistoryMessages: 24,
  maxHistoryEntryChars: 16_000,
} as const;
