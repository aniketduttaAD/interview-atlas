'use client';

import { Question } from '@/types/question';
import { useProgressStore, useProgressHydrated } from '@/store/progressStore';
import Link from 'next/link';
import { CheckCircle2, Circle, Bookmark, Building2 } from 'lucide-react';
import { cn, difficultyBadgeClass } from '@/lib/utils';

interface QuestionCardProps {
  question: Question;
  showSection?: boolean;
  /** Dense layout for 2-column mobile grids */
  compact?: boolean;
}

export function QuestionCard({
  question,
  showSection = false,
  compact = false,
}: QuestionCardProps) {
  const { isDone, markDone, unmarkDone, isBookmarked, toggleBookmark } =
    useProgressStore();

  const progressHydrated = useProgressHydrated();
  const done = progressHydrated && isDone(question.id);
  const bookmarked = progressHydrated && isBookmarked(question.id);

  const handleDoneToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (done) unmarkDone(question.id);
    else markDone(question.id);
  };

  const handleBookmarkToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleBookmark(question.id);
  };

  if (compact) {
    return (
      <Link
        href={`/${question.section}/${question.category}/${question.slug}`}
        className={cn(
          'group flex h-full min-w-0 flex-col rounded-2xl border bg-card p-3 shadow-sm transition-all hover:border-primary hover:shadow-md',
          done && 'bg-secondary/20',
        )}
      >
        <div className="mb-2 flex items-start justify-between gap-1">
          <button
            type="button"
            onClick={handleDoneToggle}
            className="shrink-0"
            aria-label={done ? 'Mark incomplete' : 'Mark complete'}
          >
            {done ? (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500">
                <CheckCircle2 size={14} className="text-white" />
              </div>
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-muted-foreground/30">
                <Circle size={14} className="text-transparent" />
              </div>
            )}
          </button>
          <button
            type="button"
            onClick={handleBookmarkToggle}
            className={cn(
              'shrink-0 rounded-lg p-1 transition-colors',
              bookmarked
                ? 'text-primary'
                : 'text-muted-foreground/50 hover:text-foreground',
            )}
            aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark'}
          >
            <Bookmark size={14} className={bookmarked ? 'fill-primary' : ''} />
          </button>
        </div>

        <h3
          className={cn(
            'mb-2 min-h-[2.75rem] flex-1 text-xs font-bold leading-snug line-clamp-3 group-hover:text-primary',
            done && 'text-muted-foreground/60',
          )}
        >
          {question.title}
        </h3>

        <div className="mt-auto flex flex-wrap gap-1">
          <span
            className={cn(
              'rounded-md border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide',
              difficultyBadgeClass[question.difficulty],
            )}
          >
            {question.difficulty}
          </span>
          {question.pattern && (
            <span className="max-w-full truncate rounded-md bg-secondary/80 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-secondary-foreground">
              {question.pattern}
            </span>
          )}
        </div>

        {question.companies && question.companies.length > 0 && (
          <p className="mt-1.5 truncate text-[8px] font-semibold uppercase tracking-wide text-muted-foreground/50">
            {question.companies[0]}
            {question.companies.length > 1
              ? ` +${question.companies.length - 1}`
              : ''}
          </p>
        )}
      </Link>
    );
  }

  return (
    <Link
      href={`/${question.section}/${question.category}/${question.slug}`}
      className={cn(
        'group relative block overflow-hidden rounded-3xl border bg-card p-6 shadow-sm transition-all hover:border-primary hover:shadow-xl',
        done && 'bg-secondary/20',
      )}
    >
      <div className="pointer-events-none absolute right-0 top-0 p-4 opacity-[0.03] transition-opacity group-hover:opacity-[0.08]">
        <Building2 size={80} />
      </div>

      <div className="relative z-10 flex items-start gap-5">
        <button
          type="button"
          onClick={handleDoneToggle}
          className="mt-1 shrink-0 transition-transform group-hover:scale-110"
        >
          {done ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 shadow-lg shadow-green-500/20">
              <CheckCircle2 size={18} className="text-white" />
            </div>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-muted-foreground/30 transition-colors hover:border-primary">
              <Circle size={18} className="text-muted-foreground/0" />
            </div>
          )}
        </button>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              {showSection && (
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">
                  {question.section} • {question.category}
                </div>
              )}
              <h3
                className={cn(
                  'text-xl font-black leading-tight tracking-tight transition-colors group-hover:text-primary',
                  done && 'text-muted-foreground/60',
                )}
              >
                {question.title}
              </h3>
            </div>

            <button
              type="button"
              onClick={handleBookmarkToggle}
              className={cn(
                'shrink-0 rounded-xl border p-2 transition-all',
                bookmarked
                  ? 'border-primary/20 bg-primary/5 text-primary'
                  : 'border-transparent bg-secondary/50 text-muted-foreground hover:border-border',
              )}
            >
              <Bookmark
                size={18}
                className={bookmarked ? 'fill-primary' : ''}
              />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'rounded-lg border px-3 py-1 text-[10px] font-black uppercase tracking-widest',
                difficultyBadgeClass[question.difficulty],
              )}
            >
              {question.difficulty}
            </span>

            {question.pattern && (
              <span className="rounded-lg border border-transparent bg-secondary/80 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-secondary-foreground">
                {question.pattern}
              </span>
            )}

            {question.frequency && (
              <span className="rounded-lg border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400">
                {question.frequency} freq
              </span>
            )}
          </div>

          {question.companies && question.companies.length > 0 && (
            <div className="flex items-center gap-2 pt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              <Building2 size={12} className="shrink-0" />
              <span className="truncate">
                {question.companies.slice(0, 4).join(' • ')}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
