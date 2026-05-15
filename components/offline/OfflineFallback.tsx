'use client';

import Link from 'next/link';
import { WifiOff } from 'lucide-react';
import { questionPath, sectionPath } from '@/lib/data/question-path';
import { useOfflineLibrary } from '@/lib/offline/use-offline-library';

export function OfflineFallback() {
  const { sections, questions: allQuestions } = useOfflineLibrary();
  const questions = allQuestions.slice(0, 8);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 py-12 gap-8 max-w-lg mx-auto">
      <WifiOff size={40} className="text-foreground/70" aria-hidden />
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          You are offline
        </h1>
        <p className="text-foreground/70 text-sm leading-relaxed">
          Study content is bundled in this app. Open the dashboard or a section
          below. AI chat needs internet.
        </p>
      </div>

      <div className="flex flex-col w-full gap-2">
        <Link
          href="/"
          prefetch={false}
          className="w-full text-center px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold"
        >
          Back to dashboard
        </Link>
        <div className="grid grid-cols-2 gap-2 pt-2">
          {sections
            .filter((s) => s.questionCount > 0)
            .slice(0, 6)
            .map((s) => (
              <Link
                key={s.key}
                href={sectionPath(s.key)}
                prefetch={false}
                className="px-3 py-2 rounded-lg border border-border bg-card text-xs font-bold uppercase tracking-wide text-foreground hover:border-primary text-center"
              >
                {s.label}
              </Link>
            ))}
        </div>
      </div>

      {questions.length > 0 && (
        <div className="w-full space-y-2 border-t border-border pt-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/50 text-center">
            Topics (offline)
          </p>
          <ul className="space-y-1">
            {questions.map((q) => (
              <li key={q.id}>
                <Link
                  href={questionPath(q)}
                  prefetch={false}
                  className="block text-sm font-medium text-foreground/80 hover:text-primary truncate py-1"
                >
                  {q.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
