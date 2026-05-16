'use client';

import { ThemeToggle } from './ThemeToggle';
import { usePathname } from 'next/navigation';
import { Search } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';
import Image from 'next/image';
import { useOfflineLibrary } from '@/lib/offline/use-offline-library';
import { OfflineIndicator } from './OfflineIndicator';
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');
  const { setSearchOpen, setSections } = useUIStore();
  const { sections } = useOfflineLibrary();

  useEffect(() => {
    setSections(sections);
  }, [sections, setSections]);

  if (isAdmin) {
    return <main className="min-h-screen bg-background">{children}</main>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <OfflineIndicator />
      {/* Unified Navbar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl shrink-0">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <Image
                src="/icon.png"
                alt="Atlas"
                width={32}
                height={32}
                className="group-hover:scale-110 transition-all"
              />
              <span className="font-bold text-lg bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent uppercase tracking-tight">
                Interview Atlas
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {[
                { label: 'Dashboard', href: '/' },
                { label: 'Progress', href: '/progress' },
                { label: 'Bookmarks', href: '/bookmarks' },
                { label: 'Admin Panel', href: '/admin/generate' },
              ].map((link) => {
                const isActive =
                  pathname === link.href ||
                  (link.href === '/admin/generate' &&
                    pathname?.startsWith('/admin'));

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50',
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground bg-secondary/50 hover:bg-secondary rounded-xl transition-all border border-transparent hover:border-border group"
            >
              <Search
                size={16}
                className="group-hover:text-primary transition-colors"
              />
              <span className="hidden sm:inline">Search Content</span>
              <kbd className="hidden lg:inline-flex ml-2 pointer-events-none h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                <span className="text-xs">⌘</span>K
              </kbd>
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden pb-20 md:pb-0">{children}</main>

      {/* Mobile Nav - Visible only on small screens */}
      <nav className="md:hidden sticky bottom-0 z-50 w-full border-t bg-background/80 backdrop-blur-xl flex items-center justify-around p-2">
        {[
          { label: 'Home', href: '/' },
          { label: 'Progress', href: '/progress' },
          { label: 'Bookmarks', href: '/bookmarks' },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
              pathname === link.href ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
