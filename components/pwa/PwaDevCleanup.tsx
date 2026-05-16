'use client';

import { useEffect } from 'react';
import { unregisterServiceWorkersInDev } from '@/lib/pwa/dev-unregister-sw';

/** Drops leftover production SW registrations so dev/HMR does not hit IDB errors. */
export function PwaDevCleanup() {
  useEffect(() => {
    void unregisterServiceWorkersInDev();

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void unregisterServiceWorkersInDev();
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  return null;
}
