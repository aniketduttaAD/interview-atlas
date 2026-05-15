'use client';

import { WifiOff, RefreshCw } from 'lucide-react';
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus';
import { useOfflineLibrary } from '@/lib/offline/use-offline-library';

export function OfflineIndicator() {
  const online = useOnlineStatus();
  const { syncing, syncFromNetwork } = useOfflineLibrary();

  if (online && !syncing) return null;

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 px-3 py-1.5 text-[11px] font-semibold bg-amber-100 text-amber-950 border-b border-amber-300 dark:bg-amber-950/50 dark:text-amber-50 dark:border-amber-800"
    >
      {syncing ? (
        <>
          <RefreshCw size={14} className="shrink-0 animate-spin" />
          <span>Syncing study content from server…</span>
        </>
      ) : (
        <>
          <WifiOff size={14} className="shrink-0" />
          <span>
            Offline — using downloaded content. Search works. AI needs internet.
          </span>
          <button
            type="button"
            onClick={() => void syncFromNetwork()}
            className="ml-2 underline underline-offset-2 hover:no-underline"
          >
            Retry sync
          </button>
        </>
      )}
    </div>
  );
}
