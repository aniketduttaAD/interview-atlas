import { NextRequest, NextResponse } from 'next/server';
import { isAdminAccessGranted } from '@/lib/admin/require-admin-secret';

export async function GET(req: NextRequest) {
  const secret = process.env.ADMIN_API_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ locked: false, authenticated: true });
  }

  return NextResponse.json({
    locked: true,
    authenticated: isAdminAccessGranted(req),
  });
}
