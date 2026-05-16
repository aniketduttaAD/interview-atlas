/**
 * Seed Vercel Blob from repo `data/` + `content/`, verify against app loaders, then remove local folders.
 *
 * Requires `BLOB_READ_WRITE_TOKEN` in `.env.local` (or env).
 *
 *   pnpm blob:seed              # build from data/ + content/, upload, verify, delete folders
 *   pnpm blob:seed --empty      # empty snapshot only
 *   pnpm blob:seed --keep-local  # upload from repo but keep data/ and content/
 *   pnpm blob:seed ./file.json  # upload existing snapshot JSON
 */

import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import {
  isBlobConfigured,
  LIBRARY_SNAPSHOT_VERSION,
  parseLibrarySnapshot,
  readLibrarySnapshot,
  writeLibrarySnapshot,
  type LibrarySnapshot,
} from '../lib/blob/library-snapshot';
import { createEmptyCatalog } from '../lib/data/catalog-client';
import { buildLibraryFromDisk } from './lib/build-library-from-disk';
import { loadDotenvFiles } from './lib/load-dotenv';
import {
  assertBlobMatchesAppLoad,
  runBlobSeedVerificationSuite,
} from './lib/verify-blob-seed';

loadDotenvFiles();

function hasRepoLibraryDirs(root: string): boolean {
  return (
    existsSync(resolve(root, 'data')) && existsSync(resolve(root, 'content'))
  );
}

function parseArgs(): {
  mode: 'empty' | 'file' | 'repo';
  filePath: string | null;
  keepLocal: boolean;
} {
  const argv = process.argv.slice(2);
  let keepLocal = false;
  let filePath: string | null = null;

  for (const arg of argv) {
    if (arg === '--empty') return { mode: 'empty', filePath: null, keepLocal };
    if (arg === '--keep-local') {
      keepLocal = true;
      continue;
    }
    if (arg.startsWith('-')) continue;
    filePath = arg;
  }

  if (filePath) return { mode: 'file', filePath, keepLocal };

  if (hasRepoLibraryDirs(process.cwd())) {
    return { mode: 'repo', filePath: null, keepLocal };
  }

  return { mode: 'file', filePath: null, keepLocal };
}

async function readBackWithRetry(attempts = 6): Promise<LibrarySnapshot> {
  for (let i = 0; i < attempts; i++) {
    const snap = await readLibrarySnapshot();
    if (snap) return snap;
    const waitMs = 500 * (i + 1);
    console.log(`[blob:seed] Waiting ${waitMs}ms for Blob read consistency…`);
    await new Promise((r) => setTimeout(r, waitMs));
  }
  throw new Error('readLibrarySnapshot returned null after upload (retries exhausted).');
}

function removeLocalLibraryDirs(root: string): void {
  for (const dir of ['data', 'content']) {
    const abs = resolve(root, dir);
    if (!existsSync(abs)) continue;
    rmSync(abs, { recursive: true, force: true });
    console.log(`[blob:seed] Removed ${dir}/`);
  }
}

async function main() {
  if (!isBlobConfigured()) {
    console.error(
      '[blob:seed] BLOB_READ_WRITE_TOKEN is not set. Run `vercel env pull` or add it to .env.local.',
    );
    process.exit(1);
  }

  const { mode, filePath, keepLocal } = parseArgs();

  if (mode === 'file' && !filePath) {
    console.error(
      [
        '[blob:seed] No data/ + content/ found and no JSON file given.',
        '',
        '  pnpm blob:seed                 # uses data/ + content/',
        '  pnpm blob:seed --empty',
        '  pnpm blob:seed ./snapshot.json',
        '  pnpm blob:seed --keep-local',
      ].join('\n'),
    );
    process.exit(1);
  }

  let snapshot;

  if (mode === 'empty') {
    const catalog = createEmptyCatalog();
    snapshot = {
      version: LIBRARY_SNAPSHOT_VERSION,
      generatedAt: catalog.generatedAt,
      catalog,
      contentById: {},
    };
    console.log('[blob:seed] Building empty snapshot…');
  } else if (mode === 'repo') {
    console.log('[blob:seed] Building snapshot from data/ + content/…');
    snapshot = await buildLibraryFromDisk();
    console.log(
      `[blob:seed] Built ${snapshot.catalog.sections.length} section(s), ${snapshot.catalog.questions.length} topic(s), ${Object.keys(snapshot.contentById).length} markdown bodies.`,
    );
  } else {
    const raw = readFileSync(filePath!, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    const fromFile = parseLibrarySnapshot(parsed);
    if (!fromFile) {
      console.error('[blob:seed] Invalid snapshot JSON.');
      process.exit(1);
    }
    snapshot = fromFile;
    console.log('[blob:seed] Loaded snapshot from file.');
  }

  console.log('[blob:seed] Uploading to Vercel Blob…');
  await writeLibrarySnapshot(snapshot);

  console.log('[blob:seed] Reading back from Blob…');
  const readBack = await readBackWithRetry();

  console.log('[blob:seed] Verifying against app loaders (same as /api/data/*)…');
  await assertBlobMatchesAppLoad(snapshot);

  console.log('[blob:seed] Running 10 verification checks…');
  runBlobSeedVerificationSuite(snapshot, readBack);

  console.log(
    `[blob:seed] Done. Blob has ${readBack.catalog.sections.length} section(s), ${readBack.catalog.questions.length} topic(s).`,
  );

  if (mode === 'repo' && !keepLocal) {
    removeLocalLibraryDirs(process.cwd());
    console.log('[blob:seed] Local data/ and content/ removed (source of truth is now Blob).');
  } else if (mode === 'repo' && keepLocal) {
    console.log('[blob:seed] Kept local data/ and content/ (--keep-local).');
  }
}

main().catch((err: unknown) => {
  console.error('[blob:seed] failed:', err);
  process.exit(1);
});
