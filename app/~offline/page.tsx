import Link from 'next/link';
import { WifiOff } from 'lucide-react';

export default function OfflinePage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center gap-6">
      <div>
        <WifiOff size={40} className="text-muted-foreground" />
      </div>
      <div className="space-y-2 max-w-md">
        <h1 className="text-2xl font-bold tracking-tight">You are offline</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Pages you have already opened should still work. Use the home screen
          app or revisit a section you loaded before. AI chat needs an internet
          connection.
        </p>
      </div>
      <Link
        href="/"
        className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
