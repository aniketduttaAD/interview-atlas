import { getOpenAI, CHAT_SYSTEM_PROMPT } from '@/lib/ai/openai';
import { getOpenAIApiKey } from '@/lib/env';
import { NextRequest, NextResponse } from 'next/server';
import { ChatCompletionMessageParam } from 'openai/resources/index.mjs';

export async function POST(req: NextRequest) {
  try {
    const {
      questionTitle,
      questionContent,
      sectionLabel,
      userMessage,
      history = [],
    } = await req.json();

    if (!userMessage?.trim()) {
      return NextResponse.json(
        { error: 'userMessage is required.' },
        { status: 400 },
      );
    }

    if (!getOpenAIApiKey()) {
      return NextResponse.json({
        reply: 'AI is disabled: OPENAI_API_KEY is not set.',
      });
    }

    const systemContent = `${CHAT_SYSTEM_PROMPT}

## TOPIC CONTEXT
**Section**: ${sectionLabel || 'General Engineering'}
**Topic**: ${questionTitle || 'Untitled'}

**Reference material (ground answers in this)**:
${questionContent || '(No content provided)'}`;

    const priorTurns = (history as { role: string; content: string }[])
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
      { role: 'user', content: userMessage.trim() },
    ];

    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages,
    });

    return NextResponse.json({ reply: response.choices[0].message.content });
  } catch (error) {
    console.error('Chat AI error:', error);
    return NextResponse.json({ error: 'AI request failed' }, { status: 500 });
  }
}
