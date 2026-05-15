'use client';

import { useProgressStore, useProgressHydrated } from '@/store/progressStore';
import { QuestionCard } from '@/components/question/QuestionCard';
import { Question } from '@/types/question';
import { Bookmark } from 'lucide-react';
import { useOfflineLibrary } from '@/lib/offline/use-offline-library';

export function BookmarksClient() {
  const { bookmarks } = useProgressStore();
  const { questions: allQuestions } = useOfflineLibrary();
  const progressHydrated = useProgressHydrated();

  if (!progressHydrated) {
    return (
      <div className="p-8 animate-pulse text-muted-foreground">
        Loading bookmarks...
      </div>
    );
  }

  const bookmarkedQuestions = bookmarks
    .map((id) => allQuestions.find((q) => q.id === id))
    .filter(Boolean) as Question[];

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 lg:p-12 space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b">
        <div className="space-y-1">
          <h1 className="text-3xl lg:text-4xl font-black tracking-tighter uppercase italic bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Bookmarked Modules
          </h1>
          <p className="text-muted-foreground font-medium">
            Your curated list of high-ROI interview topics.
          </p>
        </div>

        {bookmarkedQuestions.length > 0 && (
          <div className="rounded-2xl border bg-card px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground shadow-sm">
            {bookmarkedQuestions.length} Saved
          </div>
        )}
      </div>

      <div className="space-y-3">
        {bookmarkedQuestions.length > 0 ? (
          bookmarkedQuestions.map((q) => (
            <QuestionCard key={q.id} question={q} showSection />
          ))
        ) : (
          <div className="p-12 text-center border border-dashed rounded-lg bg-card/50 flex flex-col items-center">
            <div className="bg-secondary p-4 rounded-full mb-4">
              <Bookmark size={32} className="text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No bookmarks yet</h3>
            <p className="text-muted-foreground max-w-md">
              Save questions that you want to revise later or found particularly
              challenging by clicking the bookmark icon.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
