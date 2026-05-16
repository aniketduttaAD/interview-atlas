import { NextRequest, NextResponse } from 'next/server';
import { commitSectionContent } from '@/lib/admin/commit-section';
import { safeApiErrorMessage } from '@/lib/api/safe-error-message';
import { getCommitStoreStatus } from '@/lib/env';
import { guardAdminRequest } from '@/lib/admin/guard-admin-request';

export async function POST(req: NextRequest) {
  const authError = guardAdminRequest(req);
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

    const { stats } = result;
    const detail =
      stats.placeholders > 0
        ? ` ${stats.withContent} with content, ${stats.placeholders} placeholder${stats.placeholders === 1 ? '' : 's'}.`
        : ` ${stats.withContent} topic${stats.withContent === 1 ? '' : 's'} with content.`;

    return NextResponse.json({
      success: true,
      mode: 'blob',
      catalog: {
        sections: result.catalog.sections.length,
        questions: result.catalog.questions.length,
        generatedAt: result.catalog.generatedAt,
      },
      stats,
      message: `Saved ${stats.topics} topic${stats.topics === 1 ? '' : 's'} for "${stats.section}".${detail} Learners sync while online.`,
    });
  } catch (error: unknown) {
    console.error('Commit failed:', error);
    return NextResponse.json(
      { error: safeApiErrorMessage(error, 'Sync failed.') },
      { status: 500 },
    );
  }
}
