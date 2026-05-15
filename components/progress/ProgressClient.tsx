'use client';

import { useProgressStore } from '@/store/progressStore';
import { exportAllProgress, importAllProgress } from '@/lib/storage/helpers';
import { useUIStore } from '@/store/uiStore';
import { Question } from '@/types/question';
import { Download, Upload, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { AdminSection } from '@/types/admin';

export function ProgressClient({ allQuestions }: { allQuestions: Question[] }) {
  const { done, resetAll, resetSection } = useProgressStore();
  const { sections } = useUIStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const handle = requestAnimationFrame(() => setIsMounted(true));
    return () => cancelAnimationFrame(handle);
  }, []);

  if (!isMounted) return <div className="p-8">Loading progress...</div>;

  const totalDone = done.length;
  const totalQuestions = allQuestions.length;
  const percentage =
    totalQuestions > 0 ? Math.round((totalDone / totalQuestions) * 100) : 0;

  // Calculate difficulty breakdown
  const easyTotal = allQuestions.filter((q) => q.difficulty === 'easy').length;
  const mediumTotal = allQuestions.filter(
    (q) => q.difficulty === 'medium',
  ).length;
  const hardTotal = allQuestions.filter((q) => q.difficulty === 'hard').length;

  const easyDone = allQuestions.filter(
    (q) => q.difficulty === 'easy' && done.includes(q.id),
  ).length;
  const mediumDone = allQuestions.filter(
    (q) => q.difficulty === 'medium' && done.includes(q.id),
  ).length;
  const hardDone = allQuestions.filter(
    (q) => q.difficulty === 'hard' && done.includes(q.id),
  ).length;

  const handleExport = () => {
    const dataStr = exportAllProgress();
    const dataUri =
      'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = 'prephub-backup.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        importAllProgress(result);
        window.location.reload();
      }
    };
    reader.readAsText(file);
  };

  const confirmResetAll = () => {
    if (
      confirm(
        'Are you sure you want to reset ALL progress? This cannot be undone unless you have a backup.',
      )
    ) {
      resetAll();
    }
  };

  const confirmResetSection = (sectionKey: string, sectionLabel: string) => {
    if (
      confirm(`Are you sure you want to reset progress for ${sectionLabel}?`)
    ) {
      const ids = allQuestions
        .filter((q) => q.section === sectionKey)
        .map((q) => q.id);
      resetSection(ids);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-12">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tighter uppercase italic bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Progress Tracking
          </h1>
          <p className="text-muted-foreground font-medium">
            Detailed breakdown of your Atlas journey.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-full text-[10px] font-black uppercase tracking-widest transition-all"
          >
            <Download size={14} />
            Export
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-full text-[10px] font-black uppercase tracking-widest transition-all"
          >
            <Upload size={14} />
            Import
          </button>
          <input
            type="file"
            accept=".json"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImport}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Overall Progress Ring */}
        <div className="bg-card/50 border rounded-3xl p-8 flex flex-col items-center justify-center text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative w-48 h-48 flex items-center justify-center mb-6">
            <svg
              className="w-full h-full transform -rotate-90"
              viewBox="0 0 100 100"
            >
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-secondary"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 42}`}
                strokeDashoffset={`${2 * Math.PI * 42 * (1 - percentage / 100)}`}
                className="text-primary transition-all duration-1000 ease-out"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-black tracking-tighter">
                {percentage}%
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">
                Total
              </span>
            </div>
          </div>
          <p className="text-muted-foreground text-sm font-medium">
            {totalDone} of {totalQuestions} modules mastered
          </p>
        </div>

        {/* Difficulty Breakdown */}
        <div className="lg:col-span-2 bg-card/50 border rounded-3xl p-8 space-y-8">
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground/60 border-b pb-4">
            Difficulty Distribution
          </h3>
          <div className="space-y-8">
            {[
              {
                label: 'Easy',
                done: easyDone,
                total: easyTotal,
                color: 'bg-green-500',
                text: 'text-green-600 dark:text-green-400',
              },
              {
                label: 'Medium',
                done: mediumDone,
                total: mediumTotal,
                color: 'bg-amber-500',
                text: 'text-amber-600 dark:text-amber-400',
              },
              {
                label: 'Hard',
                done: hardDone,
                total: hardTotal,
                color: 'bg-red-500',
                text: 'text-red-600 dark:text-red-400',
              },
            ].map((d, i) => {
              const p = Math.round((d.done / d.total) * 100) || 0;
              return (
                <div key={i} className="space-y-3">
                  <div className="flex justify-between items-end">
                    <span
                      className={clsx(
                        'text-xs font-black uppercase tracking-widest',
                        d.text,
                      )}
                    >
                      {d.label}
                    </span>
                    <span className="text-xs font-bold font-mono">
                      {d.done} / {d.total} ({p}%)
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                    <div
                      className={clsx(
                        d.color,
                        'h-full rounded-full transition-all duration-700',
                      )}
                      style={{ width: `${p}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Section Progress Grid */}
      <div className="space-y-6">
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-4">
          Domain Mastery
          <div className="h-[1px] flex-1 bg-border" />
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {(sections as AdminSection[]).map((section) => {
            const sectionCount = section.questionCount;
            const sectionDone = done.filter((id) =>
              id.startsWith(`${section.key}-`),
            ).length;
            const percent = Math.round((sectionDone / sectionCount) * 100) || 0;

            return (
              <div
                key={section.key}
                className="bg-card border rounded-2xl p-6 hover:border-primary transition-all group relative overflow-hidden"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      {section.key}
                    </div>
                    <Link
                      href={`/${section.key}`}
                      className="font-black text-lg tracking-tight hover:text-primary transition-colors block"
                    >
                      {section.label}
                    </Link>
                  </div>
                  <button
                    onClick={() =>
                      confirmResetSection(section.key, section.label)
                    }
                    className="opacity-0 group-hover:opacity-100 p-1.5 bg-secondary hover:bg-destructive hover:text-destructive-foreground rounded-lg transition-all"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-[10px] font-black">
                    <span className="text-muted-foreground">
                      {sectionDone} / {sectionCount}
                    </span>
                    <span className="text-primary">{percent}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="pt-8 border-t">
        <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <h3 className="font-black text-red-600 dark:text-red-400 uppercase tracking-tight">
              Danger Zone
            </h3>
            <p className="text-sm text-red-600/60 dark:text-red-400/60 font-medium">
              Resetting data will permanently remove all your learning progress.
            </p>
          </div>
          <button
            onClick={confirmResetAll}
            className="px-8 py-3 bg-red-600 text-white rounded-full font-black text-xs uppercase tracking-[0.2em] hover:bg-red-700 transition-all shadow-lg active:scale-95 shrink-0"
          >
            Reset All Progress
          </button>
        </div>
      </div>
    </div>
  );
}
