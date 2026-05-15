import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { writeCatalogFile } from '@/lib/data/build-catalog';
import { assertContentStoreWritable } from '@/lib/env';

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Section name is required.' },
        { status: 400 },
      );
    }

    const key = name
      .toLowerCase()
      .trim()
      .replace(/[\s\/]+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    if (!key) {
      return NextResponse.json(
        { error: 'Invalid section name.' },
        { status: 400 },
      );
    }

    assertContentStoreWritable();

    const dataPath = path.join(process.cwd(), 'data', key);
    const contentPath = path.join(process.cwd(), 'content', key);

    // Create directories
    await fs.mkdir(dataPath, { recursive: true });
    await fs.mkdir(contentPath, { recursive: true });

    // Create a dummy category JSON if needed, or just let it be empty
    // Scanning logic works with empty directories as well.

    const catalog = await writeCatalogFile();

    return NextResponse.json({
      success: true,
      section: {
        key,
        label: name.toUpperCase(),
        questionCount: 0,
      },
      catalog: {
        sections: catalog.sections.length,
        questions: catalog.questions.length,
        generatedAt: catalog.generatedAt,
      },
    });
  } catch (error: unknown) {
    console.error('Failed to create section:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('not available on Vercel') ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
