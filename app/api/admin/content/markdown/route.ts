import { NextRequest, NextResponse } from 'next/server';
import { guardAdminRequest } from '@/lib/admin/guard-admin-request';
import { loadResolvedLibrary } from '@/lib/data/load-resolved-catalog';

/** Read markdown by relative path (e.g. golang/concurrency/foo.md). Served from Blob snapshot only. */
export async function GET(req: NextRequest) {
  const authError = guardAdminRequest(req);
  if (authError) return authError;

  try {
    const filePath = new URL(req.url).searchParams.get('path');

    if (!filePath?.trim()) {
      return NextResponse.json({ error: 'path is required' }, { status: 400 });
    }

    const normalized = filePath.replace(/^\/+/, '').replace(/\.\./g, '');

    const { catalog, blobContentById } = await loadResolvedLibrary();
    const question = catalog.questions.find(
      (q) => q.markdownPath.replace(/\\/g, '/') === normalized,
    );

    if (question && blobContentById[question.id]?.trim()) {
      return NextResponse.json({
        markdownContent: blobContentById[question.id],
      });
    }

    return NextResponse.json(
      { error: 'Content not found in snapshot' },
      { status: 404 },
    );
  } catch {
    return NextResponse.json(
      { error: 'Failed to resolve library' },
      { status: 503 },
    );
  }
}
