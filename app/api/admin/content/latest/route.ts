import { NextRequest, NextResponse } from 'next/server';
import { getLatestContent } from '@/lib/admin/fs-utils';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const content = await getLatestContent(limit);
    return NextResponse.json(content);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
