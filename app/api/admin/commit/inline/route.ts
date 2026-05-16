import { NextRequest, NextResponse } from 'next/server';
import { commitSectionContent } from '@/lib/admin/commit-section';
import { getCommitStoreStatus } from '@/lib/env';
import { validateAdminSecret } from '@/lib/admin/require-admin-secret';

export async function POST(req: NextRequest) {
  const authError = validateAdminSecret(req);
  if (authError) return authError;

  try {
    const { section, content } = await req.json();

    if (!section || !Array.isArray(content)) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 },
      );
    }

    const store = getCommitStoreStatus();
    if (!store.canSave) {
      return NextResponse.json(
        { error: store.message, mode: store.mode },
        { status: 503 },
      );
    }

    const result = await commitSectionContent(section, content);

    return NextResponse.json({
      success: true,
      mode: 'blob',
      catalog: {
        sections: result.catalog.sections.length,
        questions: result.catalog.questions.length,
        generatedAt: result.catalog.generatedAt,
      },
      message:
        'Saved to Vercel Blob. Users get updates after an online sync (no redeploy needed for content).',
    });
  } catch (error: unknown) {
    console.error('Commit failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
