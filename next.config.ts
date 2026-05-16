import withSerwistInit from '@serwist/next';
import type { NextConfig } from 'next';
import { randomUUID } from 'node:crypto';

/** Shell routes only; topic URLs are cached at runtime after sync / navigation. */
function loadOfflinePrecacheEntries(): { url: string; revision: string }[] {
  const buildId = process.env.NEXT_BUILD_ID ?? randomUUID();
  const routes = ['/', '/progress', '/bookmarks', '/~offline'];
  return routes.map((url) => ({ url, revision: buildId }));
}

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  additionalPrecacheEntries: loadOfflinePrecacheEntries(),
  disable: process.env.NODE_ENV === 'development',
});

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: {},
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/admin/generate',
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
        ],
      },
    ];
  },
};

export default withSerwist(nextConfig);
