'use client';

import type { ReactNode } from 'react';
import { SerwistProvider } from '@serwist/next/react';

const isDev = process.env.NODE_ENV === 'development';

export function PwaRoot({ children }: { children: ReactNode }) {
  return (
    <SerwistProvider
      swUrl="/sw.js"
      disable={isDev}
      register
      cacheOnNavigation
      reloadOnOnline
    >
      {children}
    </SerwistProvider>
  );
}
