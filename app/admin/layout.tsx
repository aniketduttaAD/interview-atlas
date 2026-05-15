'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FolderTree as FolderIcon,
  Sparkles as SparklesIcon,
  LogOut as LogOutIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import Image from 'next/image';

const NAV_ITEMS = [
  { href: '/admin', label: 'Content Tree', icon: FolderIcon },
  { href: '/admin/generate', label: 'AI Generator', icon: SparklesIcon },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Primary Admin Header - Optimized to be the SINGLE source of navigation */}
      <header className="sticky top-0 z-[60] w-full border-b bg-background/95 backdrop-blur-md shrink-0">
        <div className="px-4 lg:px-6 flex h-12 items-center justify-between">
          <div className="flex items-center gap-6 lg:gap-8">
            <Link href="/" className="flex items-center gap-2 group">
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

            <nav className="flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                      isActive
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50',
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden md:inline">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="w-px h-4 bg-border mx-1 hidden sm:block" />
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
        <div className="min-h-full">{children}</div>
      </main>
    </div>
  );
}
