import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getSectionData } from '@/lib/data/loader';
import { SectionKey } from '@/types/question';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const section = searchParams.get('section') as SectionKey;

    if (!section) {
      return NextResponse.json(
        { error: 'Section is required' },
        { status: 400 },
      );
    }

    const data = await getSectionData(section);
    const content = await Promise.all(
      data.map(async (q) => {
        const markdownPath = path.join(
          process.cwd(),
          'content',
          q.markdownPath,
        );

        try {
          const markdownContent = await fs.readFile(markdownPath, 'utf8');
          return { ...q, section, markdownContent };
        } catch {
          return { ...q, section };
        }
      }),
    );

    return NextResponse.json(content);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
