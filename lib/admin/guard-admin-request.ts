import { NextRequest, NextResponse } from 'next/server';
import {
  enforceAdminBodySize,
  enforceAdminMutationOrigin,
  rejectBrowserAdminHeaderSecret,
} from '@/lib/api/admin-request-security';
import { validateAdminSecret } from '@/lib/admin/require-admin-secret';

/** Auth + origin/body/header rules for protected admin API handlers. */
export function guardAdminRequest(req: NextRequest): NextResponse | null {
  const authError = validateAdminSecret(req);
  if (authError) return authError;

  const headerError = rejectBrowserAdminHeaderSecret(req);
  if (headerError) return headerError;

  const originError = enforceAdminMutationOrigin(req);
  if (originError) return originError;

  const sizeError = enforceAdminBodySize(req);
  if (sizeError) return sizeError;

  return null;
}
