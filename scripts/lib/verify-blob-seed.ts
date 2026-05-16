import assert from 'node:assert/strict';
import type { LibrarySnapshot } from '@/lib/blob/library-snapshot';
import { parseLibrarySnapshot } from '@/lib/blob/library-snapshot';
import { loadResolvedLibrary } from '@/lib/data/load-resolved-catalog';
import { getSectionsServer } from '@/lib/data/sections-server';
import { loadResolvedCatalog } from '@/lib/data/load-resolved-catalog';

/** Same shape as `GET /api/data/questions`. */
export function buildQuestionsApiPayload(
  catalog: LibrarySnapshot['catalog'],
  blobContentById: Record<string, string>,
): { q: (typeof catalog.questions)[0]; content: string }[] {
  return catalog.questions.map((q) => ({
    q,
    content: blobContentById[q.id]?.trim() ? blobContentById[q.id] : '',
  }));
}

/** Uses the same loaders as `/api/data/*` routes. */
export async function assertBlobMatchesAppLoad(
  expected: LibrarySnapshot,
): Promise<void> {
  const loaded = await loadResolvedLibrary();

  assert.equal(
    loaded.catalog.sections.length,
    expected.catalog.sections.length,
    'section count',
  );
  assert.equal(
    loaded.catalog.questions.length,
    expected.catalog.questions.length,
    'question count',
  );

  const apiItems = buildQuestionsApiPayload(
    loaded.catalog,
    loaded.blobContentById,
  );
  assert.equal(apiItems.length, expected.catalog.questions.length);

  for (const q of expected.catalog.questions) {
    const body = loaded.blobContentById[q.id];
    assert.ok(body?.trim(), `missing blob markdown for ${q.id}`);
    const apiRow = apiItems.find((row) => row.q.id === q.id);
    assert.ok(apiRow, `API row missing for ${q.id}`);
    assert.equal(apiRow.content, body);
  }

  const sections = await getSectionsServer();
  assert.equal(sections.length, expected.catalog.sections.length);

  const catalogOnly = await loadResolvedCatalog();
  assert.equal(catalogOnly.questions.length, expected.catalog.questions.length);
}

/** Ten checks (incl. edge cases) after upload + `readLibrarySnapshot`. */
export function runBlobSeedVerificationSuite(
  expected: LibrarySnapshot,
  readBack: LibrarySnapshot,
): void {
  const checks: { name: string; run: () => void }[] = [
    {
      name: 'parseLibrarySnapshot accepts blob JSON',
      run: () => {
        const parsed = parseLibrarySnapshot(readBack);
        assert.ok(parsed);
        assert.equal(parsed.version, expected.version);
      },
    },
    {
      name: 'catalog section and question counts match',
      run: () => {
        assert.equal(
          readBack.catalog.sections.length,
          expected.catalog.sections.length,
        );
        assert.equal(
          readBack.catalog.questions.length,
          expected.catalog.questions.length,
        );
      },
    },
    {
      name: 'question ids are unique',
      run: () => {
        const ids = readBack.catalog.questions.map((q) => q.id);
        assert.equal(new Set(ids).size, ids.length);
      },
    },
    {
      name: 'every markdownPath has contentById body',
      run: () => {
        for (const q of readBack.catalog.questions) {
          if (!q.markdownPath) continue;
          assert.ok(readBack.contentById[q.id]?.trim(), q.id);
        }
      },
    },
    {
      name: 'GET /api/data/questions payload shape and content',
      run: () => {
        const items = buildQuestionsApiPayload(
          readBack.catalog,
          readBack.contentById,
        );
        const sample = items.find((r) => r.q.slug === 'go-memory-model');
        assert.ok(sample);
        assert.ok(sample.content.length > 80);
        assert.equal(sample.q.section, 'golang');
      },
    },
    {
      name: 'GET /api/data/sections keys include placeholder sections',
      run: () => {
        const keys = readBack.catalog.sections.map((s) => s.key).sort();
        assert.ok(keys.includes('golang'));
        assert.ok(readBack.catalog.sections.length >= keys.length);
      },
    },
    {
      name: 'section questionCount matches questions array',
      run: () => {
        for (const s of readBack.catalog.sections) {
          const count = readBack.catalog.questions.filter(
            (q) => q.section === s.key,
          ).length;
          assert.equal(s.questionCount, count);
        }
      },
    },
    {
      name: 'generatedAt is ISO string',
      run: () => {
        assert.ok(!Number.isNaN(Date.parse(readBack.generatedAt)));
      },
    },
    {
      name: 'edge: minimum golang topic count',
      run: () => {
        assert.ok(readBack.catalog.questions.length >= 20);
      },
    },
    {
      name: 'edge: storage fields stripped from catalog questions',
      run: () => {
        for (const q of readBack.catalog.questions) {
          const extra = q as unknown as Record<string, unknown>;
          assert.equal(extra.markdownContent, undefined);
          assert.equal(extra.contentStatus, undefined);
        }
      },
    },
  ];

  for (const { name, run } of checks) {
    run();
    console.log(`  ✓ ${name}`);
  }
}
