import { NextResponse } from 'next/server';
import { loadResolvedLibrary } from '@/lib/data/load-resolved-catalog';

export async function GET() {
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
    const message = err instanceof Error ? err.message : 'Failed to load data';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
