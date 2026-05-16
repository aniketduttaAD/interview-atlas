import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { enforceSameOrigin } from '@/lib/api/same-origin';
import { safeApiErrorMessage } from '@/lib/api/safe-error-message';
import { loadResolvedLibrary } from '@/lib/data/load-resolved-catalog';

export async function GET(req: NextRequest) {
  const originBlock = enforceSameOrigin(req);
  if (originBlock) return originBlock;

  try {
    const { catalog, blobContentById } = await loadResolvedLibrary();

    const result: { q: (typeof catalog.questions)[0]; content: string }[] = [];

    for (const q of catalog.questions) {
      const content = blobContentById[q.id]?.trim()
        ? blobContentById[q.id]
        : '';
      result.push({ q, content });
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error('Failed to load questions library', err);
    return NextResponse.json(
      { error: safeApiErrorMessage(err, 'Failed to load data.') },
      { status: 503 },
    );
  }
}
