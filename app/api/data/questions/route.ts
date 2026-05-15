import { NextResponse } from 'next/server';
import { getAllData } from '@/lib/data/loader';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const questions = await getAllData();
    const result = [];

    for (const q of questions) {
      let content = '';
      try {
        const mdPath = path.join(process.cwd(), 'content', q.markdownPath);
        content = await fs.readFile(mdPath, 'utf8');
      } catch {
        // Ignore if markdown file doesn't exist
      }

      result.push({ q, content });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 });
  }
}
