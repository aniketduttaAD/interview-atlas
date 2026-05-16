import { NextRequest, NextResponse } from 'next/server';
import { createEmptyCatalog } from '@/lib/data/catalog-client';
import { getCommitStoreStatus } from '@/lib/env';
import { safeApiErrorMessage } from '@/lib/api/safe-error-message';
import { guardAdminRequest } from '@/lib/admin/guard-admin-request';
import {
  LIBRARY_SNAPSHOT_VERSION,
  readLibrarySnapshot,
  writeLibrarySnapshot,
} from '@/lib/blob/library-snapshot';

export async function POST(req: NextRequest) {
  const authError = guardAdminRequest(req);
  if (authError) return authError;

  try {
    const { name } = await req.json();

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Section name is required.' },
        { status: 400 },
      );
    }

    const key = name
      .toLowerCase()
      .trim()
      .replace(/[\s\/]+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    if (!key) {
      return NextResponse.json(
        { error: 'Invalid section name.' },
        { status: 400 },
      );
    }

    const store = getCommitStoreStatus();
    if (!store.canSave) {
      return NextResponse.json(
        { error: store.message, mode: store.mode },
        { status: 503 },
      );
    }

    const snap = await readLibrarySnapshot();
    const catalogBase = snap?.catalog ?? createEmptyCatalog();

    if (catalogBase.sections.some((s) => s.key === key)) {
      return NextResponse.json(
        { error: 'A domain with this key already exists.' },
        { status: 400 },
      );
    }

    const generatedAt = new Date().toISOString();
    const catalog = {
      ...catalogBase,
      generatedAt,
      sections: [
        ...catalogBase.sections,
        {
          key,
          label: name.toUpperCase(),
          color: 'primary' as const,
          icon: 'FolderTree' as const,
          questionCount: 0,
        },
      ].sort((a, b) => a.key.localeCompare(b.key)),
    };

    const contentById = snap?.contentById ?? {};

    await writeLibrarySnapshot({
      version: LIBRARY_SNAPSHOT_VERSION,
      generatedAt,
      catalog,
      contentById,
    });

    return NextResponse.json({
      success: true,
      section: {
        key,
        label: name.toUpperCase(),
        questionCount: 0,
      },
      catalog: {
        sections: catalog.sections.length,
        questions: catalog.questions.length,
        generatedAt: catalog.generatedAt,
      },
    });
  } catch (error: unknown) {
    console.error('Failed to create section:', error);
    return NextResponse.json(
      { error: safeApiErrorMessage(error, 'Failed to create section.') },
      { status: 500 },
    );
  }
}
