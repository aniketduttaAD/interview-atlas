import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { validateAdminApiRoute } from '@/lib/admin/require-admin-secret';
import { enforceChatRateLimit } from '@/lib/api/chat-rate-limit';
import { enforceSameOrigin } from '@/lib/api/same-origin';

export function proxy(request: NextRequest) {
  if (
    request.nextUrl.pathname ===
    '/.well-known/appspecific/com.chrome.devtools.json'
  ) {
    return NextResponse.json({});
  }

  const { pathname } = request.nextUrl;

  if (pathname === '/api/ai/chat' && request.method === 'POST') {
    const originBlock = enforceSameOrigin(request);
    if (originBlock) return originBlock;

    const rateBlock = enforceChatRateLimit(request);
    if (rateBlock) return rateBlock;
  }

  if (pathname.startsWith('/api/data/') && request.method === 'GET') {
    const originBlock = enforceSameOrigin(request);
    if (originBlock) return originBlock;
  }

  const adminBlock = validateAdminApiRoute(request);
  if (adminBlock) return adminBlock;

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/.well-known/appspecific/com.chrome.devtools.json',
    '/api/admin/:path*',
    '/api/ai/chat',
    '/api/data/:path*',
  ],
};
