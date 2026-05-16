import { get, put } from '@vercel/blob';
import type { AppCatalog } from '@/lib/data/catalog-client';
import { LIBRARY_SNAPSHOT_PATHNAME } from './constants';

export const LIBRARY_SNAPSHOT_VERSION = 1;

export interface LibrarySnapshot {
  version: number;
  generatedAt: string;
  catalog: AppCatalog;
  contentById: Record<string, string>;
}

export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

function isValidSnapshot(raw: unknown): raw is LibrarySnapshot {
  if (!raw || typeof raw !== 'object') return false;
  const o = raw as Record<string, unknown>;
  return (
    typeof o.version === 'number' &&
    typeof o.generatedAt === 'string' &&
    o.catalog !== null &&
    typeof o.catalog === 'object' &&
    Array.isArray((o.catalog as AppCatalog).sections) &&
    Array.isArray((o.catalog as AppCatalog).questions) &&
    typeof o.contentById === 'object' &&
    o.contentById !== null
  );
}

/** Strip legacy/extra JSON keys before using or persisting. */
export function normalizeLibrarySnapshot(
  parsed: LibrarySnapshot,
): LibrarySnapshot {
  return {
    version: parsed.version,
    generatedAt: parsed.generatedAt,
    catalog: parsed.catalog,
    contentById: parsed.contentById,
  };
}

/** Validate parsed JSON before uploading via seed script or tooling. */
export function parseLibrarySnapshot(data: unknown): LibrarySnapshot | null {
  if (!isValidSnapshot(data)) return null;
  return normalizeLibrarySnapshot(data);
}

/** Load snapshot from Blob; returns null if unconfigured, missing, or invalid. */
export async function readLibrarySnapshot(): Promise<LibrarySnapshot | null> {
  if (!isBlobConfigured()) return null;

  try {
    const result = await get(LIBRARY_SNAPSHOT_PATHNAME, {
      access: 'private',
      useCache: false,
    });
    if (!result?.stream) {
      return null;
    }

    const text = await streamToString(result.stream);
    const parsed: unknown = JSON.parse(text);
    if (!isValidSnapshot(parsed)) return null;
    return normalizeLibrarySnapshot(parsed);
  } catch {
    return null;
  }
}

async function streamToString(
  stream: ReadableStream<Uint8Array>,
): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let out = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) out += decoder.decode(value, { stream: true });
    }
    out += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  return out;
}

export async function writeLibrarySnapshot(
  snapshot: LibrarySnapshot,
): Promise<void> {
  if (!isBlobConfigured()) {
    throw new Error(
      'BLOB_READ_WRITE_TOKEN is not configured. Link a Blob store on Vercel or run vercel env pull.',
    );
  }

  const body = `${JSON.stringify(normalizeLibrarySnapshot(snapshot))}\n`;

  await put(LIBRARY_SNAPSHOT_PATHNAME, body, {
    access: 'private',
    allowOverwrite: true,
    multipart: true,
    contentType: 'application/json',
    addRandomSuffix: false,
  });
}
