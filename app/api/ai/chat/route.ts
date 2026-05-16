import {
  getOpenAI,
  CHAT_SYSTEM_PROMPT,
  chatCompletionTokenLimit,
} from '@/lib/ai/openai';
import { AI_CHAT_MODEL } from '@/lib/ai/models';
import { getOpenAIApiKey } from '@/lib/env';
import {
  enforceAiChatSameOrigin,
  parseAndValidateChatBody,
} from '@/lib/api/ai-chat-security';
import { NextRequest, NextResponse } from 'next/server';
import { ChatCompletionMessageParam } from 'openai/resources/index.mjs';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const originBlock = enforceAiChatSameOrigin(req);
  if (originBlock) return originBlock;

  const contentLength = req.headers.get('content-length');
  if (contentLength && Number(contentLength) > 512 * 1024) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  if (!getOpenAIApiKey()) {
    return NextResponse.json({
      reply: 'AI is disabled: OPENAI_API_KEY is not set.',
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = parseAndValidateChatBody(body);
  if (!parsed.ok) return parsed.response;

  const { questionTitle, questionContent, sectionLabel, userMessage, history } =
    parsed.data;

  try {
    const systemContent = `${CHAT_SYSTEM_PROMPT}

## TOPIC CONTEXT
**Section**: ${sectionLabel || 'General Engineering'}
**Topic**: ${questionTitle || 'Untitled'}

**Reference material (ground answers in this)**:
${questionContent || '(No content provided)'}`;

    const priorTurns = history
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map(
        (m): ChatCompletionMessageParam => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }),
      );

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemContent },
      ...priorTurns,
      { role: 'user', content: userMessage },
    ];

    const response = await getOpenAI().chat.completions.create({
      model: AI_CHAT_MODEL,
      messages,
      ...chatCompletionTokenLimit(4096),
    });

    const reply = response.choices[0]?.message?.content;
    if (!reply) {
      return NextResponse.json(
        { error: 'AI returned an empty response' },
        { status: 502 },
      );
    }

    return NextResponse.json({ reply });
  } catch (error: unknown) {
    console.error('Chat AI error:', error);
    const message =
      error instanceof Error ? error.message : 'AI request failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
