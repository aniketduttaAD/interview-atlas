import { NextRequest, NextResponse } from 'next/server';

/** In production, only allow browser/API calls from this deployment. */
export function enforceSameOrigin(req: NextRequest): NextResponse | null {
  if (process.env.NODE_ENV !== 'production') return null;

  const expected = req.nextUrl.origin;
  const origin = req.headers.get('origin');
  if (origin) {
    if (origin !== expected) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return null;
  }

  const referer = req.headers.get('referer');
  if (referer) {
    try {
      if (new URL(referer).origin === expected) return null;
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
