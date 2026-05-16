'use client';

import { useEffect, useMemo, useState } from 'react';
import { useOfflineLibrary } from '@/lib/offline/use-offline-library';
import { QuestionCard } from '@/components/question/QuestionCard';
import { useFilterStore } from '@/store/filterStore';
import { useProgressStore, useProgressHydrated } from '@/store/progressStore';
import { Filter, LayoutDashboard, X } from 'lucide-react';
import { AdminSection } from '@/types/admin';
import { cn } from '@/lib/utils';
import { ShareButton } from '@/components/share/ShareButton';

interface SectionClientProps {
  sectionKey: string;
  /** From server so SSR matches hydration before offline library loads. */
  sectionMeta: AdminSection;
}

export function SectionClient({ sectionKey, sectionMeta }: SectionClientProps) {
  const { questions: allQuestions } = useOfflineLibrary();
  const questions = useMemo(
    () => allQuestions.filter((q) => q.section === sectionKey),
    [allQuestions, sectionKey],
  );
  const { difficulty, status, setDifficulty, setStatus, resetFilters } =
    useFilterStore();
  const { isDone, isBookmarked } = useProgressStore();
  const progressHydrated = useProgressHydrated();
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    if ((status as string) === 'todo') setStatus('all');
  }, [status, setStatus]);

  const categories = Array.from(
    new Set(questions.map((q) => q.category)),
  ).sort();

  let filtered = questions;

  if (selectedCategory) {
    filtered = filtered.filter((q) => q.category === selectedCategory);
  }

  if (difficulty.length > 0) {
    filtered = filtered.filter((q) => difficulty.includes(q.difficulty));
  }

  if (status !== 'all' && progressHydrated) {
    filtered = filtered.filter((q) => {
      const done = isDone(q.id);
      const bookmarked = isBookmarked(q.id);
      if (status === 'done') return done;
      if (status === 'bookmarked') return bookmarked;
      return true;
    });
  }

  const hasActiveFilters =
    selectedCategory !== null || difficulty.length > 0 || status !== 'all';

  const handleDifficultyToggle = (diff: 'easy' | 'medium' | 'hard') => {
    if (difficulty.includes(diff)) {
      setDifficulty(difficulty.filter((d) => d !== diff));
    } else {
      setDifficulty([...difficulty, diff]);
    }
  };

  const handleResetFilters = () => {
    resetFilters();
    setSelectedCategory(null);
  };

  const formatCategoryLabel = (cat: string) => {
    const normalized = cat.replace(/-/g, ' ');
    if (normalized.length <= 18) return normalized;
    if (/patterns/i.test(normalized)) {
      return normalized.replace(/\s*patterns/i, ' Pat.');
    }
    return `${normalized.slice(0, 16)}…`;
  };

  const activeFilterChips: {
    key: string;
    label: string;
    onRemove: () => void;
  }[] = [];

  if (selectedCategory) {
    activeFilterChips.push({
      key: `category-${selectedCategory}`,
      label: formatCategoryLabel(selectedCategory),
      onRemove: () => setSelectedCategory(null),
    });
  }

  difficulty.forEach((diff) => {
    activeFilterChips.push({
      key: `difficulty-${diff}`,
      label: diff,
      onRemove: () => setDifficulty(difficulty.filter((d) => d !== diff)),
    });
  });

  if (status !== 'all') {
    activeFilterChips.push({
      key: `status-${status}`,
      label: status,
      onRemove: () => setStatus('all'),
    });
  }

  const categoryPillClass = (active: boolean) =>
    cn(
      'px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shrink-0 transition-all border max-w-[9.5rem] truncate',
      active
        ? 'bg-primary text-primary-foreground border-primary'
        : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground border-transparent hover:border-border',
    );

  return (
    <div className="max-w-7xl mx-auto p-4 pb-24 md:p-8 md:pb-10 space-y-8 md:space-y-10">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-primary">
                <LayoutDashboard size={12} />
                Domain Mastery
              </div>
              <ShareButton title={sectionMeta.label} className="md:hidden" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tighter uppercase italic bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              {sectionMeta.label}
            </h1>
            <p className="text-muted-foreground font-medium">
              {filtered.length === questions.length
                ? `${questions.length} technical modules curated for seniors.`
                : `${filtered.length} of ${questions.length} modules shown.`}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <ShareButton
              title={sectionMeta.label}
              className="hidden md:inline-flex"
            />
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm',
                showFilters || hasActiveFilters
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground hover:text-foreground',
              )}
            >
              <Filter size={14} />
              {hasActiveFilters ? 'Filters Active' : 'Filter Content'}
            </button>
          </div>
        </div>

        <div className="scrollbar-hide -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            className={categoryPillClass(selectedCategory === null)}
          >
            All Modules
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={categoryPillClass(selectedCategory === cat)}
            >
              {formatCategoryLabel(cat)}
            </button>
          ))}
        </div>

        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2">
            {activeFilterChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.onRemove}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground border border-primary text-[10px] font-black uppercase tracking-widest shrink-0 transition-all hover:bg-primary/90"
                aria-label={`Remove ${chip.label} filter`}
              >
                <span className="max-w-[140px] truncate capitalize">
                  {chip.label}
                </span>
                <X size={12} strokeWidth={3} className="shrink-0" />
              </button>
            ))}
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-destructive transition-colors px-2"
            >
              Clear all
            </button>
          </div>
        )}

        {showFilters && (
          <div className="bg-card border rounded-3xl p-6 space-y-6 shadow-xl animate-in fade-in slide-in-from-top-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Difficulty Level
                </label>
                <div className="flex flex-wrap gap-2">
                  {(['easy', 'medium', 'hard'] as const).map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => handleDifficultyToggle(diff)}
                      className={cn(
                        'px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all',
                        difficulty.includes(diff)
                          ? 'bg-primary text-primary-foreground border-primary shadow-lg scale-105'
                          : 'bg-background hover:bg-secondary text-muted-foreground border-border',
                      )}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Progress Status
                </label>
                <div className="flex flex-wrap gap-2">
                  {(['all', 'done', 'bookmarked'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(s)}
                      className={cn(
                        'px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all',
                        status === s
                          ? 'bg-primary text-primary-foreground border-primary shadow-lg scale-105'
                          : 'bg-background hover:bg-secondary text-muted-foreground border-border',
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t flex justify-end">
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-destructive transition-colors"
              >
                Reset All Filters
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="min-w-0">
        {filtered.length > 0 ? (
          <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-4">
            {filtered.map((q) => (
              <div key={q.id} className="min-w-0">
                <div className="h-full lg:hidden">
                  <QuestionCard compact question={q} />
                </div>
                <div className="hidden h-full lg:block">
                  <QuestionCard question={q} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 sm:p-20 text-center border-2 border-dashed rounded-3xl flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
              <Filter size={32} className="text-muted-foreground/30" />
            </div>
            <div className="space-y-1">
              <p className="font-black text-lg tracking-tight">
                No results found
              </p>
              <p className="text-sm text-muted-foreground font-medium">
                Try adjusting your filters to explore more content.
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-full text-[10px] font-black uppercase tracking-widest"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
