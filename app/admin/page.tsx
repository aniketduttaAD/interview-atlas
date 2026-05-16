'use client';

import {
  FolderTree,
  Search,
  FileText,
  Loader2,
  Plus,
  LayoutGrid,
  RefreshCw,
  PenLine,
} from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { createSearchIndex, searchQuestions } from '@/lib/search/fuzzy';
import { useUIStore } from '@/store/uiStore';
import { Question } from '@/types/question';
import { AdminSection } from '@/types/admin';
import { adminCredentials, adminPostJsonInit } from '@/lib/admin/admin-fetch';

export default function AdminRootPage() {
  const { sections } = useUIStore();
  const [allData, setAllData] = useState<Question[]>([]);
  const [selectedSection, setSelectedSection] = useState<string | null>(
    sections[0]?.key || null,
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDomainOpen, setIsAddDomainOpen] = useState(false);
  const [newDomainName, setNewDomainName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        '/api/admin/content/latest?limit=2000',
        adminCredentials(),
      );
      const data = await res.json();
      setAllData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      await loadData();
    };
    fetchData();
  }, [loadData]);

  const searchIndex = useMemo(() => createSearchIndex(allData), [allData]);

  const filteredContent = useMemo(() => {
    if (searchQuery.trim()) {
      return searchQuestions(searchIndex, searchQuery);
    }
    if (selectedSection) {
      return allData.filter((item) => item.section === selectedSection);
    }
    return allData;
  }, [allData, selectedSection, searchQuery, searchIndex]);

  const handleCreateDomain = async () => {
    if (!newDomainName.trim()) return;
    setIsCreating(true);
    try {
      const res = await fetch(
        '/api/admin/section/create',
        adminPostJsonInit({ name: newDomainName }),
      );
      if (res.ok) {
        setIsAddDomainOpen(false);
        setNewDomainName('');
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Domain Explorer - Integrated Sub-nav */}
      <div className="bg-card border-b px-4 lg:px-6 py-1 shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide no-scrollbar">
          <button
            onClick={() => {
              setSelectedSection(null);
              setSearchQuery('');
            }}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-xs font-medium shrink-0 whitespace-nowrap',
              !selectedSection && !searchQuery
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50',
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            All Domains
          </button>
          <div className="w-px h-3 bg-border shrink-0 mx-1" />
          {(sections as AdminSection[]).map((section) => (
            <button
              key={section.key}
              onClick={() => {
                setSelectedSection(section.key);
                setSearchQuery('');
              }}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-xs font-medium shrink-0 whitespace-nowrap',
                selectedSection === section.key && !searchQuery
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50',
              )}
            >
              <FolderTree className="w-3.5 h-3.5" />
              {section.label}
            </button>
          ))}
          <button
            onClick={() => setIsAddDomainOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all text-xs font-medium shrink-0 whitespace-nowrap border border-dashed border-border"
          >
            <Plus className="w-3.5 h-3.5" />
            New
          </button>

          <div className="flex-1" />

          <button
            onClick={() => loadData()}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-primary bg-primary/5 hover:bg-primary/10 transition-all text-xs font-bold shrink-0 whitespace-nowrap border border-primary/20 disabled:opacity-50"
          >
            <RefreshCw
              className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')}
            />
            Sync Now
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto w-full px-4 lg:px-6 py-4">
          <div className="space-y-6">
            {/* High-Density Search */}
            <div className="relative group">
              <Search className="w-3.5 h-3.5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Query entire repository (e.g. 'Kafka patterns', 'distributed lock')..."
                className="w-full pl-11 pr-4 py-2.5 lg:py-3 bg-card border rounded-xl text-[11px] lg:text-[12px] font-medium focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/30 transition-all shadow-sm"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 px-2 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {searchQuery ? 'Search results' : 'DIRECT INDEX'}
                </span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                {!isLoading && (
                  <span className="text-[10px] font-semibold text-muted-foreground/40 tabular-nums">
                    {filteredContent.length} Topics
                  </span>
                )}
                {selectedSection && !searchQuery && (
                  <button
                    onClick={() =>
                      router.push(`/admin/generate?section=${selectedSection}`)
                    }
                    className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-foreground shadow-sm transition-all hover:bg-primary hover:text-primary-foreground"
                  >
                    <PenLine className="h-3 w-3" />
                    <span className="sm:hidden">Edit</span>
                    <span className="hidden sm:inline">Edit Section</span>
                  </button>
                )}
              </div>
            </div>

            <div className="divide-y divide-border/50 bg-card border rounded-2xl overflow-hidden shadow-sm">
              <div className="max-h-[calc(100vh-280px)] overflow-y-auto scrollbar-thin">
                {isLoading ? (
                  <div className="p-20 flex flex-col items-center justify-center text-muted-foreground gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary opacity-50" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">
                      Synchronizing Repository...
                    </p>
                  </div>
                ) : filteredContent.length === 0 ? (
                  <div className="p-24 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-secondary mx-auto flex items-center justify-center">
                      <Search className="w-7 h-7 text-muted-foreground/30" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-foreground">
                        No matches found
                      </p>
                      <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                        Try adjusting your query or selecting a different
                        knowledge domain.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 divide-y divide-border/40">
                    {filteredContent.map((item, i) => (
                      <div
                        key={i}
                        onClick={() =>
                          router.push(`/admin/generate?update=${item.id}`)
                        }
                        className="px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-muted/30 transition-all group cursor-pointer gap-2"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center border shrink-0 group-hover:scale-110 group-hover:border-primary/30 transition-all">
                            <FileText className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <h4 className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors tracking-tight">
                              {item.title}
                            </h4>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/40">
                                {item.section}
                              </span>
                              <div className="w-0.5 h-0.5 rounded-full bg-border" />
                              <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/40">
                                {item.category}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 justify-between sm:justify-end">
                          <div className="flex flex-wrap gap-1">
                            {item.tags?.slice(0, 1).map((tag: string) => (
                              <span
                                key={tag}
                                className="text-[7px] font-bold px-1.5 py-0.5 rounded bg-muted border text-muted-foreground/50"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog.Root open={isAddDomainOpen} onOpenChange={setIsAddDomainOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100]" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border/50 p-8 rounded-3xl shadow-2xl z-[101] w-full max-w-md animate-in zoom-in-95 duration-300">
            <Dialog.Title className="text-xl font-bold tracking-tight text-foreground mb-1">
              New Knowledge Domain
            </Dialog.Title>
            <Dialog.Description className="text-xs text-muted-foreground font-medium mb-6">
              Create a new section in the repository (e.g. &quot;Distributed
              Systems&quot;).
            </Dialog.Description>

            <div className="space-y-4">
              <input
                autoFocus
                type="text"
                placeholder="Domain name..."
                value={newDomainName}
                onChange={(e) => setNewDomainName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateDomain();
                }}
                className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsAddDomainOpen(false)}
                  className="flex-1 py-2.5 bg-secondary text-foreground rounded-xl text-xs font-bold border border-border/50 hover:bg-muted transition-all"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleCreateDomain}
                  disabled={isCreating || !newDomainName.trim()}
                  className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold shadow-lg hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {isCreating ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    'CREATE DOMAIN'
                  )}
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
