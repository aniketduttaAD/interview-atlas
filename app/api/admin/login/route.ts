import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  getAdminSessionSignature,
} from '@/lib/admin/require-admin-secret';

function equalSecret(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export async function POST(req: NextRequest) {
  const secret = process.env.ADMIN_API_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: 'ADMIN_API_SECRET is not configured' },
      { status: 503 },
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
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const token = getAdminSessionSignature(secret);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
