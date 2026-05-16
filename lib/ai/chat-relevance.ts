import Fuse from 'fuse.js';

/** Minimum similarity (0–1) between the user message and topic context. */
export const CHAT_MIN_TOPIC_SIMILARITY = 0.6;

/** Below this (but ≥ min), call AI only to return a brief friendly redirect. */
export const CHAT_BORDERLINE_SIMILARITY = 0.75;

const OFF_TOPIC_REPLIES = [
  (title: string, section: string) =>
    `I'm focused on **${title}**${section ? ` (${section})` : ''} on this page. Your question doesn't look related to that topic — try asking about concepts, tradeoffs, or how this shows up in interviews.`,
  (title: string) =>
    `I can only help with **${title}** here. Rephrase your question so it connects to this topic (e.g. explanation, hint, or mock interview on this material).`,
  (title: string) =>
    `That seems outside this study note (**${title}**). Ask something tied to the content on this page and I'll jump in.`,
];

const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'can',
  'this',
  'that',
  'these',
  'those',
  'it',
  'its',
  'i',
  'me',
  'my',
  'we',
  'you',
  'your',
  'what',
  'how',
  'why',
  'when',
  'where',
  'who',
  'which',
  'with',
  'from',
  'about',
  'into',
  'than',
  'then',
  'also',
  'just',
  'not',
  'no',
  'yes',
  'ok',
  'please',
  'give',
  'tell',
  'explain',
  'help',
]);

/** Only these skip the similarity check when continuing an in-topic thread. */
const PURE_CONTINUATION =
  /^(yes|yeah|yep|ok|okay|sure|thanks|thank you|continue|go on|tell me more|more|elaborate|go deeper|please continue|sounds good)$/i;

const JAILBREAK_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /disregard\s+(your\s+)?(system|instructions)/i,
  /you\s+are\s+now\s+/i,
  /pretend\s+you\s+are/i,
  /\bDAN\b/,
  /jailbreak/i,
];

const CLEAR_OFF_TOPIC_PATTERNS = [
  /\b(weather|stock\s*price|crypto|bitcoin|recipe|dating|horoscope)\b/i,
  /\b(write my homework|do my assignment|solve this leetcode\s*\d+)\b/i,
  /\b(who won (the )?(world cup|election)|celebrity|gossip)\b/i,
];

/** Built-in study prompts and on-page phrasing (do not require token overlap with body). */
const ON_PAGE_STUDY_INTENT =
  /\b(this topic|interview punchline|mock interview|senior-level|staff-level|tradeoffs?|key insight|high-level hint|what kinds of questions|why (is|are) (this|it) asked|explain this topic|deep-dive|deep dive|probing question|fair game)\b/i;

export type ChatRelevanceTier = 'off_topic' | 'borderline' | 'on_topic';

export interface ChatRelevanceAssessment {
  tier: ChatRelevanceTier;
  /** Best similarity score in [0, 1]. */
  similarity: number;
  instantReply?: string;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/#{1,6}\s+/g, ' ')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/[*_~>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildContextSegments(
  questionTitle: string,
  sectionLabel: string,
  questionContent: string,
): string[] {
  const segments: string[] = [];
  if (questionTitle.trim()) segments.push(questionTitle.trim());
  if (sectionLabel.trim()) segments.push(sectionLabel.trim());

  const plain = stripMarkdown(questionContent);
  if (plain) {
    segments.push(plain.slice(0, 12_000));
    for (const part of plain.split(/(?<=[.!?])\s+|\n+/)) {
      const chunk = part.trim();
      if (chunk.length >= 24 && chunk.length <= 600) {
        segments.push(chunk);
      }
    }
  }

  return [...new Set(segments)];
}

function hasAssistantReply(
  history: { role: string; content: string }[],
): boolean {
  return history.some((h) => h.role === 'assistant');
}

/** True only for explicit thread continuations, not arbitrary short text. */
function isPureContinuation(
  userMessage: string,
  history: { role: string; content: string }[],
): boolean {
  if (!hasAssistantReply(history)) return false;
  return PURE_CONTINUATION.test(userMessage.trim());
}

/** Enrich short or follow-up phrasing with recent user turns for scoring. */
function buildScoringQuery(
  userMessage: string,
  history: { role: string; content: string }[],
): string {
  const trimmed = userMessage.trim();
  if (history.length === 0) return trimmed;

  const needsContext =
    trimmed.length < 60 ||
    PURE_CONTINUATION.test(trimmed) ||
    /^(why|how|what about|and)\??$/i.test(trimmed);

  if (!needsContext) return trimmed;

  const recentUser = history
    .filter((h) => h.role === 'user')
    .slice(-2)
    .map((h) => h.content)
    .join(' ');

  return `${recentUser} ${trimmed}`.trim();
}

function fuseSimilarity(query: string, segments: string[]): number {
  if (!query.trim() || segments.length === 0) return 0;

  const fuse = new Fuse(
    segments.map((text) => ({ text })),
    {
      keys: ['text'],
      threshold: 1,
      includeScore: true,
      ignoreLocation: true,
      minMatchCharLength: 2,
    },
  );

  const results = fuse.search(query);
  if (results.length === 0) return 0;
  const best = results[0]?.score ?? 1;
  return Math.max(0, Math.min(1, 1 - best));
}

function tokenOverlapSimilarity(query: string, segments: string[]): number {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return 0;

  const contextTokens = new Set(tokenize(segments.join(' ')));
  if (contextTokens.size === 0) return 0;

  let hits = 0;
  for (const t of queryTokens) {
    if (contextTokens.has(t)) hits += 1;
  }
  return hits / queryTokens.length;
}

function titleAlignmentBoost(query: string, questionTitle: string): number {
  const titleTokens = tokenize(questionTitle);
  if (titleTokens.length === 0) return 0;
  const q = query.toLowerCase();
  let hits = 0;
  for (const t of titleTokens) {
    if (q.includes(t)) hits += 1;
  }
  return hits / titleTokens.length;
}

function computeSimilarity(
  query: string,
  segments: string[],
  questionTitle: string,
): number {
  const fuseScore = fuseSimilarity(query, segments);
  const tokenScore = tokenOverlapSimilarity(query, segments);
  const titleBoost = titleAlignmentBoost(query, questionTitle);

  return Math.max(
    fuseScore,
    tokenScore,
    titleBoost >= 0.5 ? Math.min(1, titleBoost + 0.1) : 0,
  );
}

function hasJailbreakIntent(userMessage: string): boolean {
  return JAILBREAK_PATTERNS.some((p) => p.test(userMessage));
}

function isOnPageStudyRequest(userMessage: string): boolean {
  return ON_PAGE_STUDY_INTENT.test(userMessage);
}

function hasClearOffTopicIntent(userMessage: string): boolean {
  return CLEAR_OFF_TOPIC_PATTERNS.some((p) => p.test(userMessage));
}

function pickInstantReply(questionTitle: string, sectionLabel: string): string {
  const title = questionTitle.trim() || 'this topic';
  const section = sectionLabel.trim();
  const idx =
    Math.abs(
      (title + section).split('').reduce((a, c) => a + c.charCodeAt(0), 0),
    ) % OFF_TOPIC_REPLIES.length;
  return OFF_TOPIC_REPLIES[idx](title, section);
}

/**
 * Score how related `userMessage` is to the topic context sent to the model.
 *
 * - similarity < 60% → instant friendly reply (no OpenAI)
 * - 60–75% or jailbreak → OpenAI with guardrail prompt only
 * - ≥ 75% and clean → full study assistant
 */
export function assessChatRelevance(input: {
  userMessage: string;
  questionTitle: string;
  sectionLabel: string;
  questionContent: string;
  history: { role: string; content: string }[];
}): ChatRelevanceAssessment {
  const { userMessage, questionTitle, sectionLabel, questionContent, history } =
    input;

  if (hasClearOffTopicIntent(userMessage)) {
    return {
      tier: 'off_topic',
      similarity: 0,
      instantReply: pickInstantReply(questionTitle, sectionLabel),
    };
  }

  if (isPureContinuation(userMessage, history)) {
    return { tier: 'on_topic', similarity: 1 };
  }

  if (isOnPageStudyRequest(userMessage)) {
    return { tier: 'on_topic', similarity: 1 };
  }

  if (hasJailbreakIntent(userMessage)) {
    return { tier: 'borderline', similarity: 0 };
  }

  const query = buildScoringQuery(userMessage, history);
  const segments = buildContextSegments(
    questionTitle,
    sectionLabel,
    questionContent,
  );

  const similarity = computeSimilarity(query, segments, questionTitle);

  if (similarity < CHAT_MIN_TOPIC_SIMILARITY) {
    return {
      tier: 'off_topic',
      similarity,
      instantReply: pickInstantReply(questionTitle, sectionLabel),
    };
  }

  if (similarity < CHAT_BORDERLINE_SIMILARITY) {
    return { tier: 'borderline', similarity };
  }

  return { tier: 'on_topic', similarity };
}
