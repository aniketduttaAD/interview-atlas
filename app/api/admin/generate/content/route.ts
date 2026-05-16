import { NextRequest, NextResponse } from 'next/server';
import type { Question } from '@/types/question';
import {
  getOpenAI,
  ADMIN_ORCHESTRATOR_PROMPT,
  ADMIN_MARKDOWN_CONTENT_RULES,
  chatCompletionTokenLimit,
  getSectionContentTemplate,
} from '@/lib/ai/openai';
import { AI_ADMIN_GENERATE_MODEL } from '@/lib/ai/models';
import { getOpenAIApiKey } from '@/lib/env';
import { validateAdminSecret } from '@/lib/admin/require-admin-secret';

const CONTENT_SYSTEM_PROMPT = `${ADMIN_ORCHESTRATOR_PROMPT}\n\n${ADMIN_MARKDOWN_CONTENT_RULES}`;

/**
 * STEP 2: Per-Topic Content Generation
 * Generates the full markdownContent for a single stub.
 * Called when the user clicks "Generate Content" on an individual stub card.
 */

export async function POST(req: NextRequest) {
  const authError = validateAdminSecret(req);
  if (authError) return authError;

  try {
    const { stub, section, allStubs } = await req.json();

    if (!stub || !section) {
      return NextResponse.json(
        { error: 'stub and section are required.' },
        { status: 400 },
      );
    }

    if (!getOpenAIApiKey()) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY is not configured.' },
        { status: 503 },
      );
    }

    const contentTemplate = getSectionContentTemplate(section);
    const existingTopics = (allStubs || [])
      .map((s: Question) => `- [${s.category}] ${s.title}`)
      .join('\n');

    const systemContext = `
## CONTENT GENERATION TASK

You are generating the full markdown content for a single interview prep topic for a Senior/Staff Engineer's personal revision notebook.

### Context
**Section**: "${section}"
**Target Topic**: "${stub.title}"
**Category**: "${stub.category}"
**Difficulty**: "${stub.difficulty}"
**Pattern**: "${stub.pattern || 'N/A'}"
**Tags**: ${(stub.tags || []).join(', ') || 'N/A'}
**Companies that ask this**: ${(stub.companies || []).join(', ') || 'N/A'}

**Other topics in this section (cross-reference where it adds value)**:
${existingTopics || 'None yet'}

---

## CONTENT TEMPLATE (follow this structure EXACTLY):
${contentTemplate}

---

## GENERATION REQUIREMENTS:
1. **Replace every placeholder** — no bracket placeholders [like this] should remain in the output.
2. **High Signal, Low Noise** — every sentence must provide a data point, a tradeoff, or an actionable insight. No filler.
3. **Production depth** — write as if this will be read by a Staff Engineer 10 minutes before a FAANG interview. Skip basics.
4. **Code quality** — all code must be production-quality, clean, and commented only on non-obvious decisions (not narration).
5. **Tradeoffs are mandatory** — every topic must have a concrete comparison of alternatives.
6. **Diagrams where relevant** — use Mermaid for system flows, architecture diagrams, and data flows.
7. **Cohesion** — cross-reference related topics in this section where it genuinely adds value (not forced).
8. **Return ONLY the raw markdown string** — no JSON wrapping, no code fences around the entire response, no preamble.
    `.trim();

    const userMessage = `Generate the complete, production-depth markdown content for the topic: "${stub.title}" in the "${stub.category}" category of the "${section}" section. Follow the content template structure exactly. Replace all placeholders with real, accurate, interview-ready content. Do not truncate — write the full content.`;

    // For markdown generation, we don't need json_object mode
    const response = await getOpenAI().chat.completions.create({
      model: AI_ADMIN_GENERATE_MODEL,
      messages: [
        { role: 'system', content: CONTENT_SYSTEM_PROMPT },
        { role: 'user', content: systemContext },
        { role: 'user', content: userMessage },
      ],
      ...chatCompletionTokenLimit(8000),
    });

    const markdownContent = response.choices[0].message.content?.trim() || '';

    if (!markdownContent || markdownContent.length < 50) {
      return NextResponse.json(
        { error: 'AI returned insufficient content.' },
        { status: 500 },
      );
    }

    return NextResponse.json({ markdownContent });
  } catch (error: unknown) {
    console.error('[Content Gen] Failed:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Content generation failed.',
      },
      { status: 500 },
    );
  }
}
