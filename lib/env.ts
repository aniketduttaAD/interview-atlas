import { isBlobConfigured } from '@/lib/blob/library-snapshot';

export type CommitStoreMode = 'blob' | 'blocked';

/** Admin commits persist only when a Blob read/write token is configured. */
export function getCommitStoreMode(): CommitStoreMode {
  if (isBlobConfigured()) return 'blob';
  return 'blocked';
}

export function getCommitStoreStatus(): {
  mode: CommitStoreMode;
  message: string;
  canSave: boolean;
} {
  const mode = getCommitStoreMode();

  if (mode === 'blob') {
    return {
      mode,
      canSave: true,
      message:
        'Saves to Vercel Blob (private snapshot). Learners pick up changes after an online sync — no redeploy required for content. Service worker precache still reflects the last deployment.',
    };
  }

  return {
    mode,
    canSave: false,
    message:
      'Saving requires BLOB_READ_WRITE_TOKEN. Link a Blob store on Vercel and run `vercel env pull`, or set the token locally.',
  };
}

export function assertContentStoreWritable(): void {
  if (getCommitStoreMode() === 'blocked') {
    throw new Error(getCommitStoreStatus().message);
  }
}

export function getOpenAIApiKey(): string | undefined {
  const key = process.env.OPENAI_API_KEY?.trim();
  return key || undefined;
}

export function requireOpenAIApiKey(): string {
  const key = getOpenAIApiKey();
  if (!key) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  return key;
}
