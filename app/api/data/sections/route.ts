import { NextResponse } from 'next/server';
import { getSectionsServer } from '@/lib/data/sections-server';

export async function GET() {
  try {
    const sections = await getSectionsServer();
    return NextResponse.json(sections);
  } catch (error: unknown) {
    console.error('Failed to load dynamic sections', error);
    const message =
      error instanceof Error ? error.message : 'Failed to load sections';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
