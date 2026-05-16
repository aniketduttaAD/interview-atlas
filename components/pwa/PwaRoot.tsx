'use client';

import type { ReactNode } from 'react';
import { SerwistProvider } from '@serwist/next/react';
import { OfflineLibraryProvider } from '@/lib/offline/offline-library-provider';
import { PwaDevCleanup } from '@/components/pwa/PwaDevCleanup';
import { PwaInstallProvider } from '@/lib/pwa/pwa-install-provider';

const isDev = process.env.NODE_ENV === 'development';

export function PwaRoot({ children }: { children: ReactNode }) {
  return (
    <SerwistProvider
      swUrl="/sw.js"
      disable={isDev}
      register={!isDev}
      cacheOnNavigation={false}
      reloadOnOnline={false}
    >
      <PwaInstallProvider>
        <OfflineLibraryProvider>
          {isDev ? <PwaDevCleanup /> : null}
          {children}
        </OfflineLibraryProvider>
      </PwaInstallProvider>
    </SerwistProvider>
  );
}
