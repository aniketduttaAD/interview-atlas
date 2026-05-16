import { NextRequest, NextResponse } from 'next/server';
import {
  isAdminAccessGranted,
  isAdminAuthEnforced,
  isAdminSecretConfigured,
} from '@/lib/admin/require-admin-secret';

export async function GET(req: NextRequest) {
  if (!isAdminAuthEnforced()) {
    return NextResponse.json({ locked: false, authenticated: true });
  }

  return NextResponse.json({
    locked: true,
    configured: isAdminSecretConfigured(),
    authenticated: isAdminAccessGranted(req),
  });
}
