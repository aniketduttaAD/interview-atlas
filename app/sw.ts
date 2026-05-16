import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { NetworkFirst, NetworkOnly, Serwist } from 'serwist';

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
  navigationPreload: true,
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
      handler: new NetworkFirst({
        cacheName: 'api-data-catalog',
        networkTimeoutSeconds: 10,
      }),
    },
    // Cache pages visited while online so repeat opens work offline (no /~offline redirect).
    {
      matcher: ({ request, url }) =>
        request.mode === 'navigate' &&
        url.origin === self.location.origin &&
        !url.pathname.startsWith('/api/') &&
        !url.pathname.startsWith('/admin'),
      handler: new NetworkFirst({
        cacheName: 'document-pages',
        networkTimeoutSeconds: 5,
      }),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
