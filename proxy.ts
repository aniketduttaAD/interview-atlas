import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  if (
    request.nextUrl.pathname ===
    '/.well-known/appspecific/com.chrome.devtools.json'
  ) {
    return NextResponse.json({});
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/.well-known/appspecific/com.chrome.devtools.json',
};
