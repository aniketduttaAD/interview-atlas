import { NextRequest, NextResponse } from 'next/server';
import { AI_CHAT_LIMITS } from '@/lib/ai/chat-limits';

export interface ParsedChatBody {
  questionTitle: string;
  questionContent: string;
  sectionLabel: string;
  userMessage: string;
  history: { role: string; content: string }[];
}

/**
 * In production, only allow calls from this deployment (Origin or Referer must match).
 */
export function enforceAiChatSameOrigin(req: NextRequest): NextResponse | null {
  if (process.env.NODE_ENV !== 'production') return null;

  const expected = req.nextUrl.origin;
  const origin = req.headers.get('origin');
  if (origin) {
    if (origin !== expected) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return null;
  }

  const referer = req.headers.get('referer');
  if (referer) {
    try {
      if (new URL(referer).origin === expected) return null;
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export function parseAndValidateChatBody(
  raw: unknown,
): { ok: true; data: ParsedChatBody } | { ok: false; response: NextResponse } {
  if (!raw || typeof raw !== 'object') {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 },
      ),
    };
  }

  const o = raw as Record<string, unknown>;
  const userMessage =
    typeof o.userMessage === 'string' ? o.userMessage.trim() : '';
  if (!userMessage) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'userMessage is required.' },
        { status: 400 },
      ),
    };
  }
  if (userMessage.length > AI_CHAT_LIMITS.maxUserMessageChars) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Message too long' },
        { status: 400 },
      ),
    };
  }

  const questionTitle =
    typeof o.questionTitle === 'string' ? o.questionTitle.trim() : '';
  if (questionTitle.length > AI_CHAT_LIMITS.maxQuestionTitleChars) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Invalid topic title' },
        { status: 400 },
      ),
    };
  }

  const sectionLabel =
    typeof o.sectionLabel === 'string' ? o.sectionLabel.trim() : '';
  if (sectionLabel.length > AI_CHAT_LIMITS.maxSectionLabelChars) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Invalid section' },
        { status: 400 },
      ),
    };
  }

  const questionContent =
    typeof o.questionContent === 'string' ? o.questionContent : '';
  if (questionContent.length > AI_CHAT_LIMITS.maxQuestionContentChars) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Topic content too large' },
        { status: 400 },
      ),
    };
  }

  const historyRaw = o.history;
  const history: { role: string; content: string }[] = [];
  if (historyRaw !== undefined) {
    if (!Array.isArray(historyRaw)) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Invalid history' },
          { status: 400 },
        ),
      };
    }
    if (historyRaw.length > AI_CHAT_LIMITS.maxHistoryMessages) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Too many history messages' },
          { status: 400 },
        ),
      };
    }
    for (const item of historyRaw) {
      if (!item || typeof item !== 'object') {
        return {
          ok: false,
          response: NextResponse.json(
            { error: 'Invalid history entry' },
            { status: 400 },
          ),
        };
      }
      const h = item as Record<string, unknown>;
      const role = typeof h.role === 'string' ? h.role : '';
      const content = typeof h.content === 'string' ? h.content : '';
      if (role !== 'user' && role !== 'assistant') continue;
      if (content.length > AI_CHAT_LIMITS.maxHistoryEntryChars) {
        return {
          ok: false,
          response: NextResponse.json(
            { error: 'History message too long' },
            { status: 400 },
          ),
        };
      }
      history.push({ role, content });
    }
  }

  return {
    ok: true,
    data: {
      questionTitle,
      questionContent,
      sectionLabel,
      userMessage,
      history,
    },
  };
}
