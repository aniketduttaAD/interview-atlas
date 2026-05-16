'use client';

import {
  Suspense,
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import {
  ArrowLeft,
  Loader2,
  Database,
  ChevronUp,
  ChevronDown,
  Plus,
  Search,
  Sparkles,
  CheckCircle2,
  Clock,
  RefreshCw,
  EyeOff,
  Eye,
  Trash2,
  X,
  Square,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUIStore } from '@/store/uiStore';
import { Question, SectionKey } from '@/types/question';
import { toast } from 'sonner';
import { createSearchIndex } from '@/lib/search/fuzzy';
import clsx from 'clsx';
import * as Dialog from '@radix-ui/react-dialog';
import { StubItem, AdminSection } from '@/types/admin';
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer';
import { DomainSectionCard } from '@/components/domain/DomainSectionCard';
import { adminCredentials, adminPostJsonInit } from '@/lib/admin/admin-fetch';
import { isPlaceholderMarkdown } from '@/lib/admin/content-placeholder';

// ─── Helpers ───────────────────────────────────────────────────────────────────
function difficultyColor(d: string) {
  if (d === 'easy') return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  if (d === 'hard') return 'text-red-600 bg-red-50 border-red-200';
  return 'text-amber-600 bg-amber-50 border-amber-200';
}

function hasPreviewableContent(stub: Pick<StubItem, 'markdownContent'>) {
  return !isPlaceholderMarkdown(stub.markdownContent);
}

function statusIcon(stub: StubItem) {
  if (stub.contentStatus === 'generating')
    return <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />;
  if (hasPreviewableContent(stub))
    return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
  return <Clock className="w-3.5 h-3.5 text-muted-foreground/30" />;
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function GeneratePage() {
  return (
    <Suspense fallback={null}>
      <GeneratePageContent />
    </Suspense>
  );
}

function GeneratePageContent() {
  const { sections, setSections } = useUIStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const updateId = searchParams.get('update');
  const sectionParam = searchParams.get('section');

  // Section selection (explicit pick); deep links derive activeSection below
  const [selectedSection, setSelectedSection] = useState<SectionKey | null>(
    null,
  );

  // Content state
  const [stubs, setStubs] = useState<StubItem[]>([]);
  const [prompt, setPrompt] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Loading states
  const [isGeneratingStubs, setIsGeneratingStubs] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [storeStatus, setStoreStatus] = useState<{
    mode: string;
    message: string;
    canSave: boolean;
  } | null>(null);

  useEffect(() => {
    fetch('/api/admin/store-status', adminCredentials())
      .then((r) => r.json())
      .then(setStoreStatus)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (sections.length > 0) return;
    void fetch('/api/data/sections', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('sections'))))
      .then((data: AdminSection[]) => {
        if (Array.isArray(data) && data.length > 0) setSections(data);
      })
      .catch(() => {});
  }, [sections.length, setSections]);

  // Add Stub state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newStubData, setNewStubData] = useState<{
    title: string;
    category: string;
    difficulty: 'easy' | 'medium' | 'hard';
    pattern: string;
    companies: string;
    tags: string;
  }>({
    title: '',
    category: '',
    difficulty: 'medium',
    pattern: '',
    companies: '',
    tags: '',
  });

  // Add Section state
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');

  // Preview state — per-item expanded/collapsed
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null);

  const lastLoaded = useRef<string | null>(null);
  const stubsRef = useRef(stubs);
  const [deepLinkDismissed, setDeepLinkDismissed] = useState(false);

  useEffect(() => {
    stubsRef.current = stubs;
  }, [stubs]);
  const batchStopRef = useRef(false);

  const deepLinkSection = useMemo((): SectionKey | null => {
    if (deepLinkDismissed) return null;
    if (!sectionParam && !updateId) return null;
    if (sections.length === 0) return null;
    const inferred = (sectionParam || updateId?.split('-')[0]) as SectionKey;
    return (sections as AdminSection[]).some((s) => s.key === inferred)
      ? inferred
      : null;
  }, [deepLinkDismissed, sectionParam, updateId, sections]);

  const activeSection = selectedSection ?? deepLinkSection;

  const deepLinkSearchQuery =
    updateId && !deepLinkDismissed
      ? updateId.split('-').slice(2).join('-')
      : '';
  const effectiveSearchQuery = searchQuery || deepLinkSearchQuery;

  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
    completed: number;
    title: string;
  } | null>(null);

  const goToSectionSelect = useCallback(() => {
    if (isBatchGenerating) {
      toast.message('Stop batch generation before choosing another domain.');
      return;
    }
    setDeepLinkDismissed(true);
    router.replace('/admin/generate');
    setSelectedSection(null);
    lastLoaded.current = null;
    setStubs([]);
    setSearchQuery('');
    setPreviewId(null);
  }, [router, isBatchGenerating]);

  // Load existing stubs when the active section changes
  useEffect(() => {
    if (!activeSection || activeSection === lastLoaded.current) return;

    const sectionToLoad = activeSection;
    lastLoaded.current = sectionToLoad;

    const load = async () => {
      try {
        const res = await fetch(
          `/api/admin/content/section?section=${sectionToLoad}`,
          adminCredentials(),
        );
        if (!res.ok) throw new Error('Failed to load');
        const data: (Question & { markdownContent?: string })[] =
          await res.json();
        if (Array.isArray(data)) {
          setStubs(
            data.map((q) => ({
              ...q,
              contentStatus: hasPreviewableContent(q) ? 'done' : 'pending',
            })),
          );
        }
      } catch {
        toast.error('Failed to load section data.');
        lastLoaded.current = null;
        setDeepLinkDismissed(true);
        setSelectedSection(null);
      }
    };

    void load();
  }, [activeSection]);

  const handleCreateSection = async () => {
    if (!newSectionName.trim()) return;
    const t = toast.loading('Creating new domain...');
    try {
      const res = await fetch(
        '/api/admin/section/create',
        adminPostJsonInit({ name: newSectionName }),
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'Failed to create section',
        );
      }

      const newSection = data.section;
      setDeepLinkDismissed(true);
      setSelectedSection(newSection.key);
      setIsAddSectionOpen(false);
      setNewSectionName('');
      toast.success(`Domain "${newSection.label}" created.`, { id: t });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to create section';
      toast.error(message, { id: t });
    }
  };

  // ── Step 1: Generate stubs ───────────────────────────────────────────────────
  const handleGenerateStubs = async () => {
    if (isBatchGenerating) {
      toast.message('Stop batch generation before adding new stubs.');
      return;
    }
    if (!prompt.trim() || isGeneratingStubs || !activeSection) return;
    setIsGeneratingStubs(true);
    const t = toast.loading('Orchestrating stubs…');

    try {
      const res = await fetch(
        '/api/admin/generate/inline',
        adminPostJsonInit({
          prompt,
          currentContent: stubs,
          section: activeSection,
        }),
      );
      if (!res.ok) throw new Error('Stub generation failed.');
      const data = await res.json();

      const newGeneratedStubs: StubItem[] = (data.updatedContent || []).map(
        (q: Question) => ({
          ...q,
          contentStatus: 'pending',
        }),
      );

      setStubs((prev) => {
        const existingSlugs = new Set(prev.map((s) => s.slug));
        const filteredNew = newGeneratedStubs.filter(
          (s) => !existingSlugs.has(s.slug),
        );
        return [...prev, ...filteredNew];
      });

      setPrompt('');
      toast.success(`${newGeneratedStubs.length} stubs processed.`, { id: t });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to generate stubs.';
      toast.error(message, { id: t });
    } finally {
      setIsGeneratingStubs(false);
    }
  };

  // ── View / toggle markdown preview ───────────────────────────────────────────
  const handleTogglePreview = async (stubId: string) => {
    if (previewId === stubId) {
      setPreviewId(null);
      return;
    }

    const stub = stubs.find((s) => s.id === stubId);
    if (!stub) return;

    if (hasPreviewableContent(stub)) {
      setPreviewId(stubId);
      return;
    }

    if (!stub.markdownPath) {
      toast.info('No content yet. Generate content first.');
      return;
    }

    setLoadingPreviewId(stubId);
    try {
      const res = await fetch(
        `/api/admin/content/markdown?path=${encodeURIComponent(stub.markdownPath)}`,
        adminCredentials(),
      );
      if (!res.ok) throw new Error('not found');
      const { markdownContent } = await res.json();
      if (!hasPreviewableContent({ markdownContent })) {
        toast.info('No content yet. Generate content first.');
        return;
      }
      setStubs((prev) =>
        prev.map((s) =>
          s.id === stubId
            ? { ...s, markdownContent, contentStatus: 'done' as const }
            : s,
        ),
      );
      setPreviewId(stubId);
    } catch {
      toast.info('No content yet. Generate content first.');
    } finally {
      setLoadingPreviewId(null);
    }
  };

  // ── Step 2: Generate content for one stub ────────────────────────────────────
  const handleGenerateContent = async (
    stubId: string,
    options?: { fromBatch?: boolean },
  ): Promise<boolean> => {
    if (isBatchGenerating && !options?.fromBatch) {
      toast.message(
        'Batch generation is running. Stop it to generate individually.',
      );
      return false;
    }

    const stub = stubsRef.current.find((s) => s.id === stubId);
    if (!stub || stub.contentStatus === 'generating' || !activeSection) {
      return false;
    }

    setStubs((prev) =>
      prev.map((s) =>
        s.id === stubId ? { ...s, contentStatus: 'generating' } : s,
      ),
    );

    try {
      const res = await fetch(
        '/api/admin/generate/content',
        adminPostJsonInit({
          stub,
          section: activeSection,
          allStubs: stubsRef.current.map((s) => ({
            title: s.title,
            category: s.category,
          })),
        }),
      );
      if (!res.ok) throw new Error('Content generation failed.');
      const { markdownContent } = await res.json();
      setStubs((prev) =>
        prev.map((s) =>
          s.id === stubId
            ? { ...s, markdownContent, contentStatus: 'done' }
            : s,
        ),
      );
      if (!options?.fromBatch) {
        setPreviewId(stubId);
        toast.success(`Content ready for "${stub.title}"`);
      }
      return true;
    } catch {
      setStubs((prev) =>
        prev.map((s) =>
          s.id === stubId ? { ...s, contentStatus: 'pending' } : s,
        ),
      );
      if (!options?.fromBatch) {
        toast.error(`Failed to generate content for "${stub.title}"`);
      }
      return false;
    }
  };

  const handleStopBatchGeneration = () => {
    if (!isBatchGenerating) return;
    batchStopRef.current = true;
    toast.message('Stopping after the current topic finishes…', {
      duration: 4000,
    });
  };

  const handleGenerateAllContent = async () => {
    const pending = stubsRef.current.filter(
      (s) => s.contentStatus === 'pending',
    );
    if (pending.length === 0) {
      toast.info('No stubs need generation.');
      return;
    }
    if (isBatchGenerating) return;

    batchStopRef.current = false;
    setIsBatchGenerating(true);
    const total = pending.length;
    let succeeded = 0;
    let stopped = false;

    toast.info(`Orchestrating content for ${total} topics…`);

    try {
      for (let i = 0; i < pending.length; i++) {
        if (batchStopRef.current) {
          stopped = true;
          break;
        }

        const stub = pending[i];
        setBatchProgress({
          current: i + 1,
          total,
          completed: succeeded,
          title: stub.title,
        });

        const ok = await handleGenerateContent(stub.id, { fromBatch: true });
        if (ok) succeeded++;

        setBatchProgress({
          current: i + 1,
          total,
          completed: succeeded,
          title: stub.title,
        });

        if (batchStopRef.current) {
          stopped = true;
          break;
        }
      }
    } finally {
      setIsBatchGenerating(false);
      setBatchProgress(null);
      batchStopRef.current = false;
      setStubs((prev) =>
        prev.map((s) =>
          s.contentStatus === 'generating'
            ? { ...s, contentStatus: 'pending' as const }
            : s,
        ),
      );
    }

    if (stopped) {
      toast.info(
        `Batch stopped. Generated ${succeeded} of ${total} topic${total === 1 ? '' : 's'}.`,
        { duration: 6000 },
      );
    } else if (succeeded === total) {
      toast.success('Batch generation complete.');
    } else {
      toast.warning(
        `Batch finished with ${succeeded} of ${total} topic${total === 1 ? '' : 's'} generated.`,
        { duration: 6000 },
      );
    }
  };

  // ── Reorder ───────────────────────────────────────────────────────────────────
  const moveItem = (index: number, dir: 'up' | 'down') => {
    if (isBatchGenerating) return;
    const arr = [...stubs];
    const target = dir === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= arr.length) return;
    [arr[index], arr[target]] = [arr[target], arr[index]];
    setStubs(arr);
  };

  // ── Remove ────────────────────────────────────────────────────────────────────
  const confirmDelete = () => {
    if (isBatchGenerating) {
      toast.message('Stop batch generation before removing topics.');
      setDeletingId(null);
      return;
    }
    if (!deletingId) return;
    setStubs((prev) => prev.filter((s) => s.id !== deletingId));
    if (previewId === deletingId) setPreviewId(null);
    setDeletingId(null);
    toast.success('Topic removed.');
  };

  // ── Commit ────────────────────────────────────────────────────────────────────
  const handleCommit = async () => {
    if (!activeSection || isSaving) return;
    if (storeStatus && !storeStatus.canSave) {
      toast.error(storeStatus.message);
      return;
    }
    if (stubs.length === 0) {
      toast.info('Add at least one topic stub before syncing.');
      return;
    }
    setIsSaving(true);
    const loadingMsg = `Syncing ${stubs.length} topic${stubs.length === 1 ? '' : 's'}…`;
    const t = toast.loading(loadingMsg);
    try {
      const res = await fetch(
        '/api/admin/commit/inline',
        adminPostJsonInit({
          section: activeSection,
          content: stubs,
        }),
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : `Save failed (${res.status})`,
        );
      }
      const successMsg =
        (typeof data.message === 'string' && data.message) ||
        (data.stats
          ? `Saved ${data.stats.topics} topic(s) for ${data.stats.section}.`
          : 'Data synced successfully.');
      toast.success(successMsg, { id: t, duration: 8000 });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sync failed.';
      toast.error(message, { id: t, duration: 10000 });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Add manual stub ────────────────────────────────────────────────────────────
  const handleAddStub = () => {
    if (isBatchGenerating) {
      toast.message('Stop batch generation before adding a topic manually.');
      return;
    }
    if (!activeSection) return;
    if (!newStubData.title || !newStubData.category) {
      toast.error('Title and Category are required.');
      return;
    }

    const slug = newStubData.title
      .toLowerCase()
      .replace(/[\s\/]+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    const categorySlug = newStubData.category
      .toLowerCase()
      .replace(/[\s\/]+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    const newStub: StubItem = {
      id: `${activeSection}-${categorySlug}-${slug}-${Date.now()}`,
      section: activeSection,
      category: newStubData.category,
      title: newStubData.title,
      slug,
      difficulty: newStubData.difficulty,
      pattern: newStubData.pattern,
      companies: newStubData.companies
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean),
      tags: newStubData.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      markdownPath: `${activeSection}/${categorySlug}/${slug}.md`,
      frequency: 'medium',
      addedAt: new Date().toISOString(),
      contentStatus: 'pending',
    };

    setStubs((prev) => [...prev, newStub]);
    setIsAddDialogOpen(false);
    setNewStubData({
      title: '',
      category: '',
      difficulty: 'medium',
      pattern: '',
      companies: '',
      tags: '',
    });
    toast.success('Manual stub added.');
  };

  // ── Derived stats ─────────────────────────────────────────────────────────────
  const searchIndex = useMemo(() => createSearchIndex(stubs), [stubs]);
  const filtered = useMemo((): StubItem[] => {
    if (!effectiveSearchQuery.trim()) return stubs;
    return searchIndex
      .search(effectiveSearchQuery)
      .map((r) => r.item) as StubItem[];
  }, [effectiveSearchQuery, stubs, searchIndex]);

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <main className="flex-1 overflow-y-auto">
        {/* ── Step: Section Select ──────────────────────────────────────────── */}
        {!activeSection && (
          <div className="px-4 lg:px-8 py-4 lg:py-6 max-w-6xl mx-auto space-y-6 lg:space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-1">
                <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tighter uppercase bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-400 bg-clip-text text-transparent">
                  Select Knowledge Domain
                </h2>
              </div>
              <button
                onClick={() => setIsAddSectionOpen(true)}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold shadow-lg hover:opacity-90 active:scale-[0.98] transition-all uppercase tracking-wider"
              >
                <Plus className="w-4 h-4" />
                New Section
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 pb-24">
              {(sections as AdminSection[]).map((section) => (
                <DomainSectionCard
                  key={section.key}
                  section={section}
                  onClick={() => {
                    setDeepLinkDismissed(true);
                    setSelectedSection(section.key);
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Step: Editor ─────────────────────────────────────────────────── */}
        {activeSection && (
          <div className="flex min-h-full flex-col bg-muted/5 lg:h-full lg:overflow-hidden">
            <div className="sticky top-0 z-20 flex shrink-0 items-center gap-3 border-b bg-card/95 px-4 py-2.5 backdrop-blur-md lg:px-6">
              <button
                type="button"
                onClick={goToSectionSelect}
                className="flex shrink-0 items-center gap-2 rounded-xl border border-border/50 bg-secondary px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
              >
                <ArrowLeft className="h-4 w-4 shrink-0" />
                Choose domain
              </button>
              <div className="min-w-0 truncate text-[11px] font-bold uppercase tracking-tight text-muted-foreground/60">
                Orchestrating:{' '}
                <span className="text-foreground">{activeSection}</span>
                <span className="text-muted-foreground/50">
                  {' '}
                  · {filtered.length} topics
                </span>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col lg:flex-row lg:overflow-hidden">
              {/* Left Sidebar: Controls */}
              <div className="w-full shrink-0 border-b bg-card lg:w-[400px] lg:border-b-0 lg:border-r">
                <div className="space-y-4 p-4 sm:p-5 lg:space-y-6 lg:overflow-y-auto lg:p-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center border border-primary/20">
                        1
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Generate Stubs
                      </span>
                    </div>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleGenerateStubs();
                        }
                      }}
                      placeholder={`Describe topics to generate...`}
                      className="h-20 w-full resize-none rounded-xl border border-border/50 bg-background p-3 text-[11px] font-bold leading-tight focus:outline-none focus:ring-2 focus:ring-primary/20 sm:h-24 lg:h-32"
                    />
                    <button
                      onClick={handleGenerateStubs}
                      disabled={
                        isBatchGenerating || isGeneratingStubs || !prompt.trim()
                      }
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-2.5 text-[10px] font-black uppercase tracking-widest text-background shadow-lg transition-all hover:opacity-90 disabled:opacity-30 lg:py-3"
                    >
                      {isGeneratingStubs ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      GENERATE STUBS
                    </button>
                  </div>

                  <div className="space-y-3 border-t pt-4 lg:pt-6">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Search & Filter
                    </div>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
                      <input
                        type="text"
                        placeholder="Search topics..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-background border border-border/50 rounded-lg pl-9 pr-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                  </div>

                  {stubs.length > 0 &&
                    (stubs.some((s) => s.contentStatus === 'pending') ||
                      isBatchGenerating) && (
                      <div className="space-y-2 border-t pt-4 lg:pt-6">
                        <button
                          type="button"
                          onClick={handleGenerateAllContent}
                          disabled={isBatchGenerating}
                          className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2.5 text-[9px] font-black uppercase tracking-widest text-primary transition-all hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-40 lg:py-3"
                        >
                          {isBatchGenerating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                          GENERATE ALL CONTENT
                        </button>

                        {isBatchGenerating && batchProgress && (
                          <div className="space-y-2 rounded-lg border border-border/40 bg-muted/20 p-2.5">
                            <div className="flex items-center justify-between gap-2 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                              <span>Generating</span>
                              <span className="tabular-nums text-foreground">
                                {batchProgress.current}/{batchProgress.total}
                              </span>
                            </div>
                            <div
                              className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                              role="progressbar"
                              aria-valuenow={batchProgress.current}
                              aria-valuemin={0}
                              aria-valuemax={batchProgress.total}
                            >
                              <div
                                className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
                                style={{
                                  width: `${Math.min(100, Math.round((batchProgress.current / batchProgress.total) * 100))}%`,
                                }}
                              />
                            </div>
                            <p
                              className="px-0.5 text-[10px] leading-snug text-muted-foreground"
                              title={batchProgress.title}
                            >
                              <span className="line-clamp-2 font-medium text-foreground">
                                {batchProgress.title}
                              </span>
                            </p>
                            <button
                              type="button"
                              onClick={handleStopBatchGeneration}
                              className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-[9px] font-black uppercase tracking-widest text-destructive transition-all hover:bg-destructive/20 lg:py-3"
                            >
                              <Square className="w-3.5 h-3.5 fill-current" />
                              Stop Generating
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                </div>
              </div>

              {/* Main Area: Stub list */}
              <div className="min-w-0 flex-1 lg:overflow-y-auto lg:scrollbar-thin">
                <div className="mx-auto max-w-3xl space-y-3 p-4 pb-32 sm:space-y-4 sm:p-6 lg:p-10">
                  {storeStatus && (
                    <div
                      className={clsx(
                        'rounded-xl border px-4 py-3 text-xs leading-relaxed',
                        storeStatus.canSave
                          ? 'border-primary/20 bg-primary/5 text-foreground'
                          : 'border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100',
                      )}
                    >
                      {storeStatus.message}
                    </div>
                  )}
                  <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-end">
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                      <button
                        type="button"
                        onClick={() => setIsAddDialogOpen(true)}
                        disabled={isBatchGenerating}
                        className="flex items-center justify-center gap-2 rounded-xl border border-border/50 bg-secondary px-3 py-2 text-[9px] font-black uppercase tracking-widest text-foreground transition-all hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 sm:px-4"
                      >
                        <Plus className="w-3 h-3" />
                        ADD STUB
                      </button>
                      <button
                        onClick={handleCommit}
                        disabled={
                          isSaving ||
                          stubs.length === 0 ||
                          storeStatus?.canSave === false
                        }
                        className="flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-[9px] font-black uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:opacity-90 disabled:opacity-30 sm:px-5"
                      >
                        {isSaving ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Database className="w-3 h-3" />
                        )}
                        {storeStatus?.canSave
                          ? 'Sync Data'
                          : 'Sync unavailable'}
                      </button>
                    </div>
                  </div>

                  {/* Stub cards */}
                  {filtered.map((stub, index) => (
                    <div
                      key={stub.id}
                      className="group overflow-hidden rounded-xl border border-border/40 bg-card transition-all hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5"
                    >
                      <div className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap lg:gap-4 lg:p-4">
                        <div className="hidden sm:flex flex-col gap-1 text-muted-foreground/20 shrink-0 group-hover:text-muted-foreground/40 transition-colors">
                          <button
                            onClick={() => moveItem(index, 'up')}
                            disabled={isBatchGenerating || index === 0}
                            className="hover:text-primary transition-colors disabled:opacity-0 p-1 bg-secondary/50 rounded-lg"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => moveItem(index, 'down')}
                            disabled={
                              isBatchGenerating || index === stubs.length - 1
                            }
                            className="hover:text-primary transition-colors disabled:opacity-0 p-1 bg-secondary/50 rounded-lg"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="shrink-0 w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl bg-secondary/50 flex items-center justify-center border border-border/50">
                          {statusIcon(stub)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold tracking-tight text-foreground sm:truncate lg:text-sm">
                            {stub.title}
                          </h4>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="text-[9px] lg:text-[10px] bg-primary/5 text-primary px-2 py-0.5 rounded-md font-semibold uppercase tracking-wider border border-primary/10">
                              {stub.category}
                            </span>
                            <span
                              className={clsx(
                                'text-[9px] lg:text-[10px] px-2 py-0.5 rounded-md font-semibold uppercase tracking-wider border',
                                difficultyColor(stub.difficulty),
                              )}
                            >
                              {stub.difficulty}
                            </span>
                          </div>
                        </div>

                        <div className="flex w-full shrink-0 items-center gap-2 border-t border-border/40 pt-3 sm:w-auto sm:border-t-0 sm:pt-0 lg:gap-2">
                          {(hasPreviewableContent(stub) ||
                            stub.markdownPath) && (
                            <button
                              type="button"
                              onClick={() => handleTogglePreview(stub.id)}
                              disabled={
                                loadingPreviewId === stub.id ||
                                stub.contentStatus === 'generating'
                              }
                              title={
                                previewId === stub.id
                                  ? 'Hide content'
                                  : 'View content'
                              }
                              className={clsx(
                                'rounded-lg border p-2 transition-all lg:rounded-xl',
                                previewId === stub.id
                                  ? 'border-foreground bg-foreground text-background'
                                  : hasPreviewableContent(stub)
                                    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                                    : 'border-border/50 bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground',
                              )}
                            >
                              {loadingPreviewId === stub.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin lg:h-4 lg:w-4" />
                              ) : previewId === stub.id ? (
                                <EyeOff className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                              ) : (
                                <Eye className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                              )}
                            </button>
                          )}

                          {!isBatchGenerating &&
                            (stub.contentStatus !== 'done' ||
                            !hasPreviewableContent(stub) ? (
                              <button
                                type="button"
                                onClick={() => handleGenerateContent(stub.id)}
                                disabled={stub.contentStatus === 'generating'}
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-[8px] font-black uppercase tracking-widest text-primary transition-all hover:bg-primary/20 disabled:opacity-50 sm:flex-none lg:gap-2 lg:rounded-xl lg:px-4 lg:text-[9px]"
                              >
                                {stub.contentStatus === 'generating' ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Sparkles className="w-3 h-3" />
                                )}
                                <span>GENERATE</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleGenerateContent(stub.id)}
                                title="Regenerate content"
                                className="rounded-lg border border-border/50 p-2 text-muted-foreground/40 transition-all hover:bg-secondary hover:text-foreground lg:rounded-xl"
                              >
                                <RefreshCw className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
                              </button>
                            ))}

                          {isBatchGenerating &&
                            stub.contentStatus === 'pending' && (
                              <span className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border/50 bg-muted/30 px-3 py-2 text-[8px] font-bold uppercase tracking-widest text-muted-foreground/50 sm:flex-none lg:px-4 lg:text-[9px]">
                                Queued
                              </span>
                            )}

                          <button
                            type="button"
                            onClick={() => setDeletingId(stub.id)}
                            disabled={isBatchGenerating}
                            className="rounded-lg border border-transparent p-2 text-muted-foreground/30 transition-all hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30 lg:rounded-xl"
                          >
                            <Trash2 className="w-3 h-3 lg:w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {previewId === stub.id && stub.markdownContent && (
                        <div className="border-t border-border/50 bg-muted/30 p-4 lg:p-6">
                          <article className="rounded-xl border bg-card px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
                            <div className="[&>*:first-child]:!mt-0 [&_h2:first-of-type]:!mt-0 [&_h2:first-of-type]:border-t-0 [&_h2:first-of-type]:pt-1">
                              <MarkdownRenderer
                                content={stub.markdownContent}
                              />
                            </div>
                          </article>
                        </div>
                      )}
                    </div>
                  ))}

                  {filtered.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 lg:py-32 text-muted-foreground bg-card/30 border-2 border-dashed border-border/50 rounded-[2rem] lg:rounded-[3rem]">
                      <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-secondary flex items-center justify-center mb-6">
                        <Database className="w-6 h-6 lg:w-8 lg:h-8 opacity-20" />
                      </div>
                      <p className="text-[10px] lg:text-xs font-black uppercase tracking-[0.3em] opacity-40 italic">
                        {searchQuery
                          ? 'NO MATCHES FOUND'
                          : 'NO STUBS YET — USE PROMPT'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Add Section Dialog ──────────────────────────────────────────────── */}
      <Dialog.Root open={isAddSectionOpen} onOpenChange={setIsAddSectionOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] animate-in fade-in duration-300" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border/50 p-8 rounded-[2.5rem] shadow-2xl z-[101] w-full max-w-md animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-start mb-6">
              <div className="space-y-1">
                <Dialog.Title className="text-2xl font-black tracking-tighter uppercase italic">
                  Create New Domain
                </Dialog.Title>
                <Dialog.Description className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
                  Initialize a fresh knowledge section
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button className="p-2 hover:bg-secondary rounded-full transition-all border border-border/50">
                  <X className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Section Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. System Design"
                  value={newSectionName}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateSection();
                    }
                  }}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  className="w-full bg-background border border-border/50 rounded-2xl p-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <button
                onClick={handleCreateSection}
                className="w-full py-4 bg-primary text-primary-foreground rounded-full text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-primary/20"
              >
                Create Section
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ── Add Stub Dialog ─────────────────────────────────────────────────── */}
      <Dialog.Root open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] animate-in fade-in duration-300" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border/50 p-8 rounded-[2.5rem] shadow-2xl z-[101] w-full max-w-xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-start mb-8">
              <div className="space-y-1">
                <Dialog.Title className="text-2xl font-black tracking-tighter uppercase italic">
                  Add Manual Topic
                </Dialog.Title>
                <Dialog.Description className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
                  Architect a new stub from scratch
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button className="p-2 hover:bg-secondary rounded-full transition-all border border-border/50">
                  <X className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2 col-span-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Topic Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Database Indexing"
                  value={newStubData.title}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddStub();
                    }
                  }}
                  onChange={(e) =>
                    setNewStubData((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  className="w-full bg-background border border-border/50 rounded-2xl p-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Category
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fundamentals"
                  value={newStubData.category}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddStub();
                    }
                  }}
                  onChange={(e) =>
                    setNewStubData((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  className="w-full bg-background border border-border/50 rounded-2xl p-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Difficulty
                </label>
                <select
                  value={newStubData.difficulty}
                  onChange={(e) =>
                    setNewStubData((prev) => ({
                      ...prev,
                      difficulty: e.target.value as 'easy' | 'medium' | 'hard',
                    }))
                  }
                  className="w-full bg-background border border-border/50 rounded-2xl p-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Companies (CSV)
                </label>
                <input
                  type="text"
                  placeholder="Google, Meta"
                  value={newStubData.companies}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddStub();
                    }
                  }}
                  onChange={(e) =>
                    setNewStubData((prev) => ({
                      ...prev,
                      companies: e.target.value,
                    }))
                  }
                  className="w-full bg-background border border-border/50 rounded-2xl p-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Tags (CSV)
                </label>
                <input
                  type="text"
                  placeholder="sql, architecture"
                  value={newStubData.tags}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddStub();
                    }
                  }}
                  onChange={(e) =>
                    setNewStubData((prev) => ({
                      ...prev,
                      tags: e.target.value,
                    }))
                  }
                  className="w-full bg-background border border-border/50 rounded-2xl p-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            <div className="mt-10 flex gap-4">
              <button
                onClick={handleAddStub}
                className="flex-1 py-4 bg-foreground text-background rounded-full text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-foreground/5"
              >
                CREATE TOPIC STUB
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ── Delete Confirmation Dialog ─────────────────────────────────────────── */}
      <Dialog.Root open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100]" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border/50 p-8 rounded-[2.5rem] shadow-2xl z-[101] w-full max-w-sm animate-in zoom-in-95 duration-300">
            <Dialog.Title className="text-xl font-black tracking-tighter uppercase italic text-red-500 mb-2">
              Remove Topic?
            </Dialog.Title>
            <Dialog.Description className="text-xs text-muted-foreground font-bold uppercase tracking-widest leading-relaxed mb-8">
              This will remove the topic from your current draft.
            </Dialog.Description>
            <div className="flex gap-4">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 py-3 bg-secondary text-foreground rounded-full text-[10px] font-black uppercase tracking-widest border border-border/50"
              >
                CANCEL
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-3 bg-red-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest"
              >
                REMOVE
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
