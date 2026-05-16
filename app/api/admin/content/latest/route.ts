import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSecret } from '@/lib/admin/require-admin-secret';
import { loadResolvedCatalog } from '@/lib/data/load-resolved-catalog';

export async function GET(req: NextRequest) {
  const authError = validateAdminSecret(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const { questions } = await loadResolvedCatalog();
    return NextResponse.json(questions.slice(0, limit));
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
