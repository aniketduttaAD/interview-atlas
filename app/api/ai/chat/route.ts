import {
  getOpenAI,
  CHAT_GUARDRAIL_PROMPT,
  CHAT_SYSTEM_PROMPT,
  chatCompletionTokenLimit,
} from '@/lib/ai/openai';
import { AI_CHAT_MODEL } from '@/lib/ai/models';
import { assessChatRelevance } from '@/lib/ai/chat-relevance';
import { resolveChatTopicFromBlob } from '@/lib/ai/resolve-chat-topic';
import { getOpenAIApiKey } from '@/lib/env';
import { isBlobConfigured } from '@/lib/blob/library-snapshot';
import { safeApiErrorMessage } from '@/lib/api/safe-error-message';
import { enforceChatRateLimit } from '@/lib/api/chat-rate-limit';
import {
  enforceAiChatSameOrigin,
  parseAndValidateChatBody,
} from '@/lib/api/ai-chat-security';
import { NextRequest, NextResponse } from 'next/server';
import { ChatCompletionMessageParam } from 'openai/resources/index.mjs';

export const maxDuration = 60;

function buildTopicSystemContent(
  basePrompt: string,
  sectionLabel: string,
  questionTitle: string,
  questionContent: string,
): string {
  return `${basePrompt}

## TOPIC CONTEXT
**Section**: ${sectionLabel || 'General Engineering'}
**Topic**: ${questionTitle || 'Untitled'}

**Reference material (ground answers in this)**:
${questionContent || '(No content provided)'}`;
}

export async function POST(req: NextRequest) {
  const originBlock = enforceAiChatSameOrigin(req);
  if (originBlock) return originBlock;

  const rateBlock = enforceChatRateLimit(req);
  if (rateBlock) return rateBlock;

  const contentLength = req.headers.get('content-length');
  if (contentLength && Number(contentLength) > 512 * 1024) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  if (!getOpenAIApiKey()) {
    return NextResponse.json({
      reply: 'AI is temporarily unavailable.',
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

  const { questionId, userMessage, history } = parsed.data;

  let questionTitle = parsed.data.questionTitle;
  let sectionLabel = parsed.data.sectionLabel;
  let questionContent = parsed.data.questionContent;

  if (isBlobConfigured()) {
    const resolved = await resolveChatTopicFromBlob(questionId);
    if (!resolved) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }
    questionTitle = resolved.questionTitle;
    sectionLabel = resolved.sectionLabel;
    questionContent = resolved.questionContent;
  } else if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Content library is not available' },
      { status: 503 },
    );
  }

  const relevance = assessChatRelevance({
    userMessage,
    questionTitle,
    sectionLabel,
    questionContent,
    history,
  });

  if (relevance.tier === 'off_topic') {
    return NextResponse.json({
      reply:
        relevance.instantReply ??
        'I can only help with this interview topic on this page. Try asking about concepts, tradeoffs, or interview angles from the content here.',
    });
  }

  const systemPrompt =
    relevance.tier === 'borderline'
      ? CHAT_GUARDRAIL_PROMPT
      : CHAT_SYSTEM_PROMPT;
  const systemContent = buildTopicSystemContent(
    systemPrompt,
    sectionLabel,
    questionTitle,
    questionContent,
  );

  try {
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

    const maxTokens = relevance.tier === 'borderline' ? 280 : 4096;

    const response = await getOpenAI().chat.completions.create({
      model: AI_CHAT_MODEL,
      messages,
      ...chatCompletionTokenLimit(maxTokens),
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
    return NextResponse.json(
      { error: safeApiErrorMessage(error, 'AI request failed.') },
      { status: 500 },
    );
  }
}
