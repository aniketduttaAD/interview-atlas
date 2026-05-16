import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  validateAdminSecret,
} from '@/lib/admin/require-admin-secret';

export async function POST(req: NextRequest) {
  const authError = validateAdminSecret(req);
  if (authError) return authError;

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_SESSION_COOKIE, '', {
    path: '/',
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  return res;
}
