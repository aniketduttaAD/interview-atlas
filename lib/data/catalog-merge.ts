import type { AppCatalog } from '@/lib/data/catalog-client';

/** Drop markdown bodies for questions removed from the catalog. */
export function pruneContentBundleForCatalog(
  bundle: { byId: Record<string, string> },
  catalog: AppCatalog,
): void {
  const ids = new Set(catalog.questions.map((q) => q.id));
  for (const id of Object.keys(bundle.byId)) {
    if (!ids.has(id)) delete bundle.byId[id];
  }
}

/**
 * Apply markdown writes from an admin commit onto an existing bundle.
 * New markdown may exist only in payload writes until the snapshot is written.
 */
export function mergeMarkdownWritesIntoContentBundle(
  bundle: { byId: Record<string, string> },
  catalog: AppCatalog,
  writes: { path: string; content: string }[],
): void {
  const contentPathToId = new Map<string, string>();
  for (const q of catalog.questions) {
    if (!q.markdownPath) continue;
    const mdRel = q.markdownPath.replace(/\\/g, '/');
    contentPathToId.set(`content/${mdRel}`, q.id);
  }
  for (const w of writes) {
    const p = w.path.replace(/\\/g, '/');
    if (!p.startsWith('content/')) continue;
    const id = contentPathToId.get(p);
    if (id) bundle.byId[id] = w.content;
  }
}
