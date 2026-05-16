export const CONTENT_PLACEHOLDER_MARKER = 'Content pending generation';

const MIN_REAL_CONTENT_CHARS = 80;

export function isPlaceholderMarkdown(
  body: string | undefined | null,
): boolean {
  const text = body?.trim() ?? '';
  if (!text || text.length < MIN_REAL_CONTENT_CHARS) return true;
  return text.includes(CONTENT_PLACEHOLDER_MARKER);
}

export function placeholderMarkdownForTitle(title: string): string {
  return `# ${title}\n\n> ${CONTENT_PLACEHOLDER_MARKER}. Use the AI generator to populate this topic.\n\n## Summary\nAdd content here.\n`;
}
