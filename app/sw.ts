import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import {
  ExpirationPlugin,
  NetworkOnly,
  Serwist,
  StaleWhileRevalidate,
} from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [
    {
      matcher: ({ url }) => url.pathname.startsWith('/api/ai/'),
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ url }) => url.pathname.startsWith('/api/admin/'),
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ url }) => url.pathname.startsWith('/api/data/'),
      handler: new StaleWhileRevalidate({
        cacheName: 'api-data-catalog',
        plugins: [
          new ExpirationPlugin({
            maxEntries: 8,
            maxAgeSeconds: 7 * 24 * 60 * 60,
          }),
        ],
      }),
    },
    {
      matcher: ({ request, url, sameOrigin }) =>
        sameOrigin &&
        !url.pathname.startsWith('/api/') &&
        (request.mode === 'navigate' || request.headers.get('RSC') === '1'),
      handler: new StaleWhileRevalidate({
        cacheName: 'app-pages-offline',
        plugins: [
          new ExpirationPlugin({
            maxEntries: 128,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          }),
        ],
      }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: '/~offline',
        matcher({ request }) {
          return request.destination === 'document';
        },
      },
    ],
  },
});

serwist.addEventListeners();
