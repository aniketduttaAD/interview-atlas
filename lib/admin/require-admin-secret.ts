import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { equalSecret } from '@/lib/admin/secret-compare';
import {
  enforceAdminMutationOrigin,
  rejectBrowserAdminHeaderSecret,
} from '@/lib/api/admin-request-security';

/** HttpOnly cookie set by `POST /api/admin/login` after verifying `ADMIN_API_SECRET`. */
export const ADMIN_SESSION_COOKIE = 'atlas_admin_session';

/** Browser cookie lifetime (no server-side session expiry). */
export const ADMIN_SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

/** Routes reachable before login (session probe + sign-in only). */
export const ADMIN_API_PUBLIC_PATHS = new Set([
  '/api/admin/login',
  '/api/admin/session',
]);

export function getAdminApiSecret(): string | undefined {
  const secret = process.env.ADMIN_API_SECRET?.trim();
  return secret || undefined;
}

export function isAdminSecretConfigured(): boolean {
  return Boolean(getAdminApiSecret());
}

/** Production always requires a configured secret; dev allows open admin when unset. */
export function isAdminAuthEnforced(): boolean {
  return isAdminSecretConfigured() || process.env.NODE_ENV === 'production';
}

export function getAdminSessionSignature(secret: string): string {
  return createHmac('sha256', secret)
    .update('interview-atlas-admin-session-v1')
    .digest('hex');
}

function hasValidAdminSessionCookie(req: NextRequest, secret: string): boolean {
  const cookieVal = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const expected = getAdminSessionSignature(secret);
  if (typeof cookieVal !== 'string') return false;
  if (cookieVal.length !== expected.length) return false;
  return timingSafeEqual(
    Buffer.from(cookieVal, 'utf8'),
    Buffer.from(expected, 'utf8'),
  );
}

/** True when access is allowed: dev-open, or valid header / session cookie. */
export function isAdminAccessGranted(req: NextRequest): boolean {
  const secret = getAdminApiSecret();
  if (!secret) {
    return process.env.NODE_ENV !== 'production';
  }

  const headerSecret = req.headers.get('x-admin-secret');
  if (typeof headerSecret === 'string' && equalSecret(headerSecret, secret)) {
    return true;
  }

  return hasValidAdminSessionCookie(req, secret);
}

export function adminNotConfiguredResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Admin is not configured' },
    { status: 503 },
  );
}

export function adminUnauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

/**
 * When `ADMIN_API_SECRET` is set, require matching `x-admin-secret` header **or**
 * a valid `atlas_admin_session` cookie from `POST /api/admin/login`.
 */
export function validateAdminSecret(req: NextRequest): NextResponse | null {
  const secret = getAdminApiSecret();
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      return adminNotConfiguredResponse();
    }
    return null;
  }

  if (isAdminAccessGranted(req)) return null;
  return adminUnauthorizedResponse();
}

/** Edge/proxy guard for `/api/admin/*` (defense in depth vs per-route checks). */
export function validateAdminApiRoute(req: NextRequest): NextResponse | null {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith('/api/admin/')) return null;
  if (ADMIN_API_PUBLIC_PATHS.has(pathname)) return null;

  const authError = validateAdminSecret(req);
  if (authError) return authError;

  const headerError = rejectBrowserAdminHeaderSecret(req);
  if (headerError) return headerError;

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const originError = enforceAdminMutationOrigin(req);
    if (originError) return originError;
  }

  return null;
}
