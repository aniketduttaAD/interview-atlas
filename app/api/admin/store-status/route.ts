import { NextRequest, NextResponse } from 'next/server';
import { getCommitStoreStatus } from '@/lib/env';
import { validateAdminSecret } from '@/lib/admin/require-admin-secret';

export async function GET(req: NextRequest) {
  const authError = validateAdminSecret(req);
  if (authError) return authError;
  return NextResponse.json(getCommitStoreStatus());
}
