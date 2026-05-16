import { NextResponse } from 'next/server';
import { enforceSameOrigin } from '@/lib/api/same-origin';
import { safeApiErrorMessage } from '@/lib/api/safe-error-message';
import { getSectionsServer } from '@/lib/data/sections-server';
import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const originBlock = enforceSameOrigin(req);
  if (originBlock) return originBlock;

  try {
    const sections = await getSectionsServer();
    return NextResponse.json(sections);
  } catch (error: unknown) {
    console.error('Failed to load dynamic sections', error);
    return NextResponse.json(
      { error: safeApiErrorMessage(error, 'Failed to load sections.') },
      { status: 503 },
    );
  }
}
