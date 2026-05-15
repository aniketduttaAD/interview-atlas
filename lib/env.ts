/** True in Vercel deployments (serverless — no persistent writes to data/). */
export function isVercel(): boolean {
  return process.env.VERCEL === '1';
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/** Admin commit / section APIs that write to data/ and content/. */
export function assertContentStoreWritable(): void {
  if (isVercel()) {
    throw new Error(
      'Content store writes are not available on Vercel. Run admin save from your local machine.',
    );
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
