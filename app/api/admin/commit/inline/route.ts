import { NextRequest, NextResponse } from 'next/server';
import { commitSectionContent } from '@/lib/admin/fs-utils';
import { writeCatalogFile } from '@/lib/data/build-catalog';
import { assertContentStoreWritable } from '@/lib/env';

export async function POST(req: NextRequest) {
  try {
    const { section, content } = await req.json();

    if (!section || !Array.isArray(content)) {
      throw new Error('Invalid request data');
    }

    assertContentStoreWritable();
    await commitSectionContent(section, content);
    const catalog = await writeCatalogFile();

    return NextResponse.json({
      success: true,
      catalog: {
        sections: catalog.sections.length,
        questions: catalog.questions.length,
        generatedAt: catalog.generatedAt,
      },
    });
  } catch (error: unknown) {
    console.error('Commit failed:', error);
    const message =
      error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('not available on Vercel') ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
