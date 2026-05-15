'use client';

import { useProgressStore } from '@/store/progressStore';
import Link from 'next/link';
import { CheckCircle2, Bookmark, Flame, LayoutDashboard } from 'lucide-react';
import { Question } from '@/types/question';
import clsx from 'clsx';
import { AdminSection } from '@/types/admin';
import { useOfflineLibrary } from '@/lib/offline/use-offline-library';
import { useProgressHydrated } from '@/store/progressStore';
import { questionPath, sectionPath } from '@/lib/data/question-path';

export function DashboardClient() {
  const { done, bookmarks, recent } = useProgressStore();
  const { questions: allQuestions, sections } = useOfflineLibrary();
  const progressHydrated = useProgressHydrated();

  const totalQuestions = allQuestions.length;

  const recentQuestions = recent
    .map((id) => allQuestions.find((q) => q.id === id))
    .filter(Boolean) as Question[];

  const doneCount = progressHydrated ? done.length : 0;
  const bookmarkCount = progressHydrated ? bookmarks.length : 0;

  const progressPercent =
    totalQuestions > 0 ? Math.round((doneCount / totalQuestions) * 100) : 0;

  return (
    <div className="min-h-full pb-20">
      {/* Premium Hero Section */}
      <section className="relative overflow-hidden bg-background pt-16 pb-20 border-b">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-12">
            <div className="max-w-2xl space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-[0.2em] border border-primary/20">
                <Flame size={12} className="fill-current" />
                Knowledge Workbench
              </div>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-[0.9] text-foreground">
                Master the <br />
                <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                  Interview Atlas
                </span>
              </h1>
              <p className="text-xl text-muted-foreground font-medium max-w-lg leading-relaxed">
                A high-fidelity technical roadmap curated for senior engineers.
                Explore, track, and master every domain.
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <div className="flex items-center gap-4 px-6 border rounded-2xl bg-card/50 backdrop-blur-sm">
                  <div className="text-center">
                    <div className="text-lg font-bold">{progressPercent}%</div>
                    <div className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
                      Mastery
                    </div>
                  </div>
                  <div className="w-px h-8 bg-border" />
                  <div className="text-center">
                    <div className="text-lg font-bold">{doneCount}</div>
                    <div className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
                      Modules
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full lg:max-w-sm">
              {[
                {
                  label: 'Bookmarks',
                  value: bookmarkCount,
                  icon: Bookmark,
                  color: 'text-blue-500',
                },
                {
                  label: 'Domains',
                  value: sections.length,
                  icon: LayoutDashboard,
                  color: 'text-primary',
                },
              ].map((stat, idx) => (
                <div
                  key={idx}
                  className="bg-card border rounded-3xl p-6 shadow-sm flex flex-col justify-between aspect-square"
                >
                  <div
                    className={clsx(
                      'w-10 h-10 rounded-xl bg-secondary flex items-center justify-center',
                      stat.color,
                    )}
                  >
                    <stat.icon size={20} />
                  </div>
                  <div>
                    <div className="text-3xl font-bold">{stat.value}</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {stat.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Domain Grid */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 pt-20 space-y-12">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">
              Technical Domains
            </h2>
            <p className="text-muted-foreground text-sm font-medium">
              Select a module to begin your deep dive.
            </p>
          </div>
          <div className="h-px flex-1 bg-border/60 mx-10 hidden sm:block" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
          {(sections as AdminSection[]).map((section) => {
            const doneCount = done.filter((id) =>
              id.startsWith(`${section.key}-`),
            ).length;
            const percent =
              Math.round((doneCount / section.questionCount) * 100) || 0;

            return (
              <Link
                key={section.key}
                href={sectionPath(section.key)}
                className="block group min-w-0"
              >
                <div className="h-full bg-card border rounded-2xl sm:rounded-[2rem] p-4 sm:p-8 hover:border-primary hover:shadow-2xl hover:shadow-primary/5 transition-all flex flex-col justify-between overflow-hidden relative">
                  <div className="relative z-10 min-w-0">
                    <div className="flex justify-between items-start gap-1.5 mb-4 sm:mb-12">
                      <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-secondary group-hover:bg-primary/10 flex items-center justify-center transition-colors shrink-0">
                        <LayoutDashboard
                          size={18}
                          className="text-muted-foreground group-hover:text-primary transition-colors"
                        />
                      </div>
                      <div className="bg-secondary/50 px-1.5 py-0.5 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-[7px] sm:text-[10px] font-bold border border-border/50 uppercase tracking-tight shrink-0">
                        {section.questionCount} mod
                      </div>
                    </div>
                    <h3 className="font-bold text-sm sm:text-2xl tracking-tight leading-tight mb-1 sm:mb-2 truncate">
                      {section.label}
                    </h3>
                    <p className="hidden sm:block text-xs text-muted-foreground font-medium line-clamp-1">
                      Master {section.label.toLowerCase()} architecture
                    </p>
                  </div>

                  <div className="pt-3 sm:pt-10 space-y-1.5 sm:space-y-4 relative z-10">
                    <div className="flex justify-between text-[8px] sm:text-[10px] font-bold tracking-widest gap-1">
                      <span className="text-muted-foreground/60 uppercase truncate">
                        Mastery
                      </span>
                      <span className="text-primary shrink-0">{percent}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1 sm:h-1.5 overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Recent Activity Mini-Section */}
      {recentQuestions.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 md:px-8 pt-20">
          <div className="bg-secondary/20 rounded-[2.5rem] p-8 md:p-12 border border-border/50">
            <h2 className="text-xs font-bold uppercase tracking-[0.4em] text-muted-foreground/40 mb-8 text-center">
              Resume Journey
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {recentQuestions.slice(0, 3).map((q) => (
                <Link
                  key={q.id}
                  href={questionPath(q)}
                  className="flex items-center gap-5 p-6 bg-card hover:bg-card/80 border border-border/50 rounded-3xl transition-all group shadow-sm hover:shadow-md"
                >
                  <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <CheckCircle2 size={20} className="text-primary/30" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-primary/60 uppercase tracking-widest truncate mb-0.5">
                      {
                        (sections as AdminSection[]).find(
                          (s) => s.key === q.section,
                        )?.label
                      }
                    </div>
                    <div className="font-bold text-base truncate group-hover:text-primary transition-colors">
                      {q.title}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
