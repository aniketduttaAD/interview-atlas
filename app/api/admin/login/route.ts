import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_COOKIE_MAX_AGE,
  getAdminApiSecret,
  getAdminSessionSignature,
} from '@/lib/admin/require-admin-secret';
import { equalSecret } from '@/lib/admin/secret-compare';
import {
  checkLoginAllowed,
  clearLoginFailures,
  getClientIp,
  recordLoginFailure,
} from '@/lib/admin/login-rate-limit';
import { enforceAdminBodySize } from '@/lib/api/admin-request-security';

export async function POST(req: NextRequest) {
  const sizeError = enforceAdminBodySize(req);
  if (sizeError) return sizeError;

  const secret = getAdminApiSecret();
  if (!secret) {
    return NextResponse.json(
      { error: 'Admin is not configured' },
      { status: 503 },
    );
  }

  const ip = getClientIp(req);
  const rate = checkLoginAllowed(ip);
  if (!rate.ok) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(rate.retryAfterSec) },
      },
    );
  }

  let body: { secret?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const provided = typeof body.secret === 'string' ? body.secret : '';
  if (!equalSecret(provided, secret)) {
    recordLoginFailure(ip);
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  clearLoginFailures(ip);
  const token = getAdminSessionSignature(secret);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ADMIN_SESSION_COOKIE_MAX_AGE,
  });
  return res;
}
