import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

/** Read a single markdown file from content/ by relative path (e.g. golang/concurrency/foo.md). */
export async function GET(req: NextRequest) {
  try {
    const filePath = new URL(req.url).searchParams.get('path');

    if (!filePath?.trim()) {
      return NextResponse.json({ error: 'path is required' }, { status: 400 });
    }

    const normalized = filePath.replace(/^\/+/, '').replace(/\.\./g, '');
    const fullPath = path.join(process.cwd(), 'content', normalized);

    const contentRoot = path.join(process.cwd(), 'content');
    if (!fullPath.startsWith(contentRoot)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    const markdownContent = await fs.readFile(fullPath, 'utf8');
    return NextResponse.json({ markdownContent });
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
