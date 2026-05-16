'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { LogOut as LogOutIcon } from 'lucide-react';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { AdminSessionGate } from '@/components/admin/AdminSessionGate';
import Image from 'next/image';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <header className="sticky top-0 z-[60] w-full border-b bg-background/95 backdrop-blur-md shrink-0">
        <div className="px-4 lg:px-6 flex h-12 items-center justify-between">
          <Link
            href="/admin/generate"
            className="flex items-center gap-2 group"
          >
            <Image
              src="/icon.png"
              alt="Atlas"
              width={20}
              height={20}
              className="brightness-110 group-hover:scale-110 transition-all shrink-0"
            />
            <span className="font-extrabold text-[13px] lg:text-[14px] tracking-tighter uppercase bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-400 bg-clip-text text-transparent whitespace-nowrap">
              Interview Atlas <span className="opacity-80">Admin</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="w-px h-4 bg-border mx-1 hidden sm:block" />
            <button
              type="button"
              onClick={async () => {
                await fetch('/api/admin/logout', {
                  method: 'POST',
                  credentials: 'include',
                });
                window.location.reload();
              }}
              className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
            >
              Sign out
            </button>
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all"
            >
              <LogOutIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Exit</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto bg-muted/10">
        <div className="min-h-full">
          <AdminSessionGate>{children}</AdminSessionGate>
        </div>
      </main>
    </div>
  );
}
