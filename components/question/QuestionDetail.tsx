'use client';

import { Question } from '@/types/question';
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer';
import { useProgressStore, useProgressHydrated } from '@/store/progressStore';
import { useOfflineLibrary } from '@/lib/offline/use-offline-library';
import { sectionPath } from '@/lib/data/question-path';
import Link from 'next/link';
import { useMemo, useEffect } from 'react';
import {
  ChevronRight,
  ArrowLeft,
  Building2,
  Clock,
  Box,
  CheckCircle2,
  Circle,
  Bookmark,
  Sparkles,
} from 'lucide-react';
import clsx from 'clsx';
import { difficultyBadgeClass } from '@/lib/utils';
import { AIPanel } from '@/components/ai/AIPanel';
import { useAIStore } from '@/store/aiStore';
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus';
import { AdminSection } from '@/types/admin';

interface QuestionDetailProps {
  question: Question;
  content: string;
}

const CONTENT_WIDTH =
  'w-full max-w-3xl lg:max-w-[44rem] xl:max-w-[50rem] 2xl:max-w-[54rem]';

function stripLeadingTitle(md: string, title: string): string {
  const match = md.match(/^#\s+(.+?)\s*$/m);
  if (!match) return md;
  const heading = match[1].trim();
  if (heading.toLowerCase() !== title.trim().toLowerCase()) return md;
  return md.slice(match[0].length).replace(/^\s+/, '');
}

export function QuestionDetail({ question, content }: QuestionDetailProps) {
  const {
    isDone,
    markDone,
    unmarkDone,
    isBookmarked,
    toggleBookmark,
    addRecent,
  } = useProgressStore();
  const { sections } = useOfflineLibrary();
  const { openPanel, panelOpen, closePanel } = useAIStore();
  const online = useOnlineStatus();
  const sectionMeta = (sections as AdminSection[]).find(
    (s) => s.key === question.section,
  );

  const progressHydrated = useProgressHydrated();
  const done = progressHydrated && isDone(question.id);
  const bookmarked = progressHydrated && isBookmarked(question.id);
  const sectionLabel = sectionMeta?.label || question.section.toUpperCase();
  const categoryLabel = question.category.replace(/-/g, ' ');
  const hasCompanies = question.companies && question.companies.length > 0;

  const articleContent = useMemo(
    () => stripLeadingTitle(content, question.title),
    [content, question.title],
  );

  useEffect(() => {
    addRecent(question.id);
  }, [question.id, addRecent]);

  useEffect(() => {
    if (!online && panelOpen) closePanel();
  }, [online, panelOpen, closePanel]);

  const toggleDone = () =>
    done ? unmarkDone(question.id) : markDone(question.id);

  const markDoneButton = (
    <button
      type="button"
      onClick={toggleDone}
      aria-pressed={done}
      title={done ? 'Marked as done' : 'Mark as done'}
      className={clsx(
        'inline-flex h-8 shrink-0 items-center gap-1 rounded-md border px-2 text-xs font-medium transition-colors',
        done
          ? 'border-green-500/30 bg-green-500/10 text-green-800 dark:text-green-400'
          : 'border-border bg-background text-foreground hover:bg-secondary',
      )}
    >
      {done ? <CheckCircle2 size={14} /> : <Circle size={14} />}
      <span>{done ? 'Done' : 'Mark done'}</span>
    </button>
  );

  const bookmarkButton = (
    <button
      type="button"
      onClick={() => toggleBookmark(question.id)}
      aria-pressed={bookmarked}
      aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark'}
      className={clsx(
        'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors',
        bookmarked
          ? 'border-primary/30 bg-primary/10 text-primary'
          : 'border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground',
      )}
    >
      <Bookmark size={14} className={bookmarked ? 'fill-current' : ''} />
    </button>
  );

  const askAiButton = (
    <button
      type="button"
      onClick={() => openPanel(question.id)}
      className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 shadow-sm transition-colors hover:bg-secondary dark:bg-card dark:hover:bg-secondary/80"
    >
      <Sparkles
        size={15}
        className="shrink-0 text-blue-600 dark:text-blue-400"
      />
      <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-sm font-bold uppercase tracking-tight text-transparent">
        Ask Atlas
      </span>
    </button>
  );

  return (
    <div
      className={clsx(
        'flex min-h-full flex-col',
        'pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:pb-14',
        panelOpen && 'sm:pr-[400px] md:pr-[450px]',
      )}
    >
      <header className="border-b bg-muted/40">
        <div
          className={clsx(CONTENT_WIDTH, 'mx-auto px-4 py-4 sm:px-6 lg:px-8')}
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <nav
              aria-label="Breadcrumb"
              className="hidden min-w-0 items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:flex"
            >
              <Link
                href={sectionPath(question.section)}
                className="hover:text-foreground"
              >
                {sectionLabel}
              </Link>
              <ChevronRight size={12} className="shrink-0 opacity-50" />
              <span className="capitalize">{categoryLabel}</span>
            </nav>

            <Link
              href={sectionPath(question.section)}
              className="inline-flex min-w-0 items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground md:hidden"
            >
              <ArrowLeft size={14} className="shrink-0" />
              <span className="truncate">{sectionLabel}</span>
            </Link>

            <div className="flex shrink-0 items-center gap-1.5">
              {markDoneButton}
              {bookmarkButton}
            </div>
          </div>

          <h1 className="mb-2 text-xl font-bold leading-tight text-foreground sm:text-2xl">
            {question.title}
          </h1>

          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={clsx(
                'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                difficultyBadgeClass[question.difficulty],
              )}
            >
              {question.difficulty.charAt(0).toUpperCase() +
                question.difficulty.slice(1)}
            </span>
            {question.pattern && (
              <span className="inline-flex rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground">
                {question.pattern}
              </span>
            )}
            {question.timeComplexity && (
              <span className="inline-flex items-center gap-1 rounded border border-border/80 bg-background px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                <Clock size={10} />
                {question.timeComplexity}
              </span>
            )}
            {question.spaceComplexity && (
              <span className="inline-flex items-center gap-1 rounded border border-border/80 bg-background px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                <Box size={10} />
                {question.spaceComplexity}
              </span>
            )}
            {hasCompanies && (
              <>
                <span className="mx-0.5 h-3 w-px bg-border" aria-hidden />
                <Building2 size={12} className="text-muted-foreground" />
                {question.companies!.map((company) => (
                  <span
                    key={company}
                    className="rounded bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground ring-1 ring-border/60"
                  >
                    {company}
                  </span>
                ))}
              </>
            )}
          </div>
        </div>
      </header>

      <main
        className={clsx(
          CONTENT_WIDTH,
          'mx-auto w-full flex-1 px-4 pt-3 pb-6 sm:px-6 lg:px-8',
        )}
      >
        <article className="rounded-xl border bg-card px-5 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="[&>*:first-child]:!mt-0 [&_h2:first-of-type]:!mt-0 [&_h2:first-of-type]:border-t-0 [&_h2:first-of-type]:pt-1">
            <MarkdownRenderer content={articleContent} />
          </div>
        </article>
      </main>

      {online && (
        <div
          className={clsx(
            'fixed z-30 left-0 border-t bg-background/95 backdrop-blur-md',
            'bottom-[calc(3.25rem+env(safe-area-inset-bottom,0px))] md:bottom-0',
            panelOpen ? 'right-0 sm:right-[400px] md:right-[450px]' : 'right-0',
            panelOpen && 'max-sm:hidden',
          )}
        >
          <div
            className={clsx(
              CONTENT_WIDTH,
              'mx-auto flex justify-end px-4 py-2 sm:px-6 lg:px-8',
            )}
          >
            {askAiButton}
          </div>
        </div>
      )}

      {online && panelOpen && (
        <>
          <div
            className="fixed inset-0 z-[55] bg-background/40 backdrop-blur-md sm:hidden"
            onClick={closePanel}
            aria-hidden
          />
          <AIPanel
            questionId={question.id}
            questionTitle={question.title}
            questionContent={content}
            sectionLabel={sectionLabel}
          />
        </>
      )}
    </div>
  );
}
