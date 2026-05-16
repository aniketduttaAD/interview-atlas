import { NextRequest, NextResponse } from 'next/server';
import { getCommitStoreStatus } from '@/lib/env';
import { guardAdminRequest } from '@/lib/admin/guard-admin-request';

export async function GET(req: NextRequest) {
  const authError = guardAdminRequest(req);
  if (authError) return authError;
  return NextResponse.json(getCommitStoreStatus());
}
