'use client';

import { useUIStore } from '@/store/uiStore';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useOfflineLibrary } from '@/lib/offline/use-offline-library';
import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import { Search, FileText } from 'lucide-react';
import { createSearchIndex, searchQuestions } from '@/lib/search/fuzzy';
import { questionPath } from '@/lib/data/question-path';
import { AdminSection } from '@/types/admin';
import type { Question } from '@/types/question';
import { cn } from '@/lib/utils';

export function SearchOverlay() {
  const { searchOpen, setSearchOpen } = useUIStore();
  const [query, setQuery] = useState('');
  const { questions: allQuestions, sections } = useOfflineLibrary();
  const router = useRouter();

  const searchIndex = useMemo(
    () => createSearchIndex(allQuestions),
    [allQuestions],
  );

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return searchQuestions(searchIndex, query).slice(0, 8);
  }, [query, searchIndex]);

  const navigateToQuestion = useCallback(
    (q: Question) => {
      const path = questionPath(q);
      setSearchOpen(false);
      setQuery('');
      router.push(path);
    },
    [router, setSearchOpen],
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [setSearchOpen]);

  if (!searchOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] sm:pt-[20vh] px-4">
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        onClick={() => setSearchOpen(false)}
      />

      <div className="relative w-full max-w-2xl bg-card border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <Command
          label="Search commands"
          shouldFilter={false}
          className="flex flex-col h-full max-h-[60vh]"
        >
          <div className="flex items-center px-4 border-b h-14 shrink-0">
            <Search size={18} className="text-muted-foreground mr-3" />
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Search across all Interview Atlas sections..."
              className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground text-sm"
            />
            <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">ESC</span>
            </kbd>
          </div>

          <Command.List className="overflow-y-auto p-2 scrollbar-thin">
            <Command.Empty className="p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 h-6 text-muted-foreground/30" />
              </div>
              <p className="text-sm font-bold text-foreground">
                {query.length > 0 ? 'No topics found' : 'Type to explore'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Searching titles, categories, and patterns.
              </p>
            </Command.Empty>

            {results.length > 0 && (
              <Command.Group
                heading="Technical Content"
                className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 px-3 py-3"
              >
                {results.map((q) => (
                  <Command.Item
                    key={q.id}
                    value={`${q.id}-${q.title}`}
                    onSelect={() => navigateToQuestion(q)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      navigateToQuestion(q);
                    }}
                    className="flex items-center gap-4 px-3 py-3 rounded-xl cursor-pointer hover:bg-secondary aria-selected:bg-secondary transition-all group"
                  >
                    <div className="w-9 h-9 bg-background border flex items-center justify-center rounded-lg text-muted-foreground group-aria-selected:text-primary group-aria-selected:border-primary/30 transition-colors">
                      <FileText size={18} />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-sm font-bold text-foreground truncate group-aria-selected:text-primary transition-colors">
                        {q.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight truncate mt-0.5">
                        {
                          (sections as AdminSection[]).find(
                            (s) => s.key === q.section,
                          )?.label
                        }{' '}
                        <span className="mx-1 text-muted-foreground/30">/</span>{' '}
                        {q.category}
                      </span>
                    </div>
                    {q.difficulty && (
                      <span
                        className={cn(
                          'text-[8px] font-black uppercase tracking-tighter px-2 py-1 rounded border shrink-0',
                          q.difficulty === 'hard'
                            ? 'bg-red-500/5 text-red-600 border-red-500/10'
                            : q.difficulty === 'medium'
                              ? 'bg-amber-500/5 text-amber-600 border-amber-500/10'
                              : 'bg-emerald-500/5 text-emerald-600 border-emerald-500/10',
                        )}
                      >
                        {q.difficulty}
                      </span>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
