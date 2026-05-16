import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

/** HttpOnly cookie set by `POST /api/admin/login` after verifying `ADMIN_API_SECRET`. */
export const ADMIN_SESSION_COOKIE = 'atlas_admin_session';

export function getAdminSessionSignature(secret: string): string {
  return createHmac('sha256', secret)
    .update('interview-atlas-admin-session-v1')
    .digest('hex');
}

/** True when secret is unset (open admin) or request has valid header or session cookie. */
export function isAdminAccessGranted(req: NextRequest): boolean {
  const secret = process.env.ADMIN_API_SECRET?.trim();
  if (!secret) return true;

  if (req.headers.get('x-admin-secret') === secret) return true;

  const cookieVal = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const expected = getAdminSessionSignature(secret);
  if (
    typeof cookieVal === 'string' &&
    cookieVal.length === expected.length &&
    timingSafeEqual(
      Buffer.from(cookieVal, 'utf8'),
      Buffer.from(expected, 'utf8'),
    )
  ) {
    return true;
  }

  return false;
}

/**
 * When `ADMIN_API_SECRET` is set, require matching `x-admin-secret` header **or**
 * a valid `atlas_admin_session` cookie from `POST /api/admin/login`.
 */
export function validateAdminSecret(req: NextRequest): NextResponse | null {
  if (isAdminAccessGranted(req)) return null;
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
