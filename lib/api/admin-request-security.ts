import { NextRequest, NextResponse } from 'next/server';

/** Max JSON body for admin mutations (generate, commit, etc.). */
export const ADMIN_MAX_BODY_BYTES = 4 * 1024 * 1024;

/**
 * In production, admin mutations from the browser must come from this deployment.
 * Server scripts may omit Origin and use `x-admin-secret` instead.
 */
export function enforceAdminMutationOrigin(
  req: NextRequest,
): NextResponse | null {
  if (process.env.NODE_ENV !== 'production') return null;
  if (req.method === 'GET' || req.method === 'HEAD') return null;

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

  return null;
}

export function enforceAdminBodySize(req: NextRequest): NextResponse | null {
  if (req.method === 'GET' || req.method === 'HEAD') return null;
  const contentLength = req.headers.get('content-length');
  if (!contentLength) return null;
  const bytes = Number(contentLength);
  if (Number.isFinite(bytes) && bytes > ADMIN_MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }
  return null;
}

/**
 * Browser requests must use the httpOnly session cookie, not `x-admin-secret`
 * (avoids putting the master secret in frontend JS / extensions).
 */
export function rejectBrowserAdminHeaderSecret(
  req: NextRequest,
): NextResponse | null {
  if (process.env.NODE_ENV !== 'production') return null;
  if (!req.headers.get('x-admin-secret')) return null;
  if (!req.headers.get('origin') && !req.headers.get('referer')) return null;
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
