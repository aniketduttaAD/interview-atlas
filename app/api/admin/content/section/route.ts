import { NextRequest, NextResponse } from 'next/server';
import { safeApiErrorMessage } from '@/lib/api/safe-error-message';
import { guardAdminRequest } from '@/lib/admin/guard-admin-request';
import { getSectionData } from '@/lib/data/loader';
import { loadResolvedLibrary } from '@/lib/data/load-resolved-catalog';
import type { SectionKey } from '@/types/question';

export async function GET(req: NextRequest) {
  const authError = guardAdminRequest(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const section = searchParams.get('section') as SectionKey;

    if (!section) {
      return NextResponse.json(
        { error: 'Section is required' },
        { status: 400 },
      );
    }

    const { blobContentById } = await loadResolvedLibrary();
    const data = await getSectionData(section);

    const content = data.map((q) => {
      const blobMd = blobContentById[q.id]?.trim();
      if (blobMd) {
        return { ...q, section, markdownContent: blobMd };
      }
      return { ...q, section };
    });

    return NextResponse.json(content);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: safeApiErrorMessage(error, 'Failed to load section.') },
      { status: 503 },
    );
  }
}
