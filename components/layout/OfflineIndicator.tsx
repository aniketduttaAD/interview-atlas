'use client';

import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus';

export function OfflineIndicator() {
  const online = useOnlineStatus();

  if (online) return null;

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 px-3 py-1.5 text-[11px] font-semibold bg-amber-500/15 text-amber-900 dark:text-amber-100 border-b border-amber-500/30"
    >
      <WifiOff size={14} className="shrink-0" />
      <span>
        Offline — cached pages and progress work. AI and admin need internet.
      </span>
    </div>
  );
}
