/** First line of a Mermaid diagram (unfenced AI output). */
const MERMAID_START =
  /^(graph\s+(?:TD|TB|BT|RL|LR)|flowchart\s+(?:TD|TB|BT|RL|LR)|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|gantt|pie\s|gitGraph|C4Context|mindmap|timeline|quadrantChart|sankey-beta|block-beta|xychart-beta)/i;

/** Continuation lines inside a multi-line diagram. */
function isMermaidContinuationLine(trimmed: string): boolean {
  if (!trimmed) return true;
  if (MERMAID_START.test(trimmed)) return true;
  if (/^#{1,6}\s/.test(trimmed)) return false;
  if (trimmed.startsWith('```')) return false;
  return (
    /-->|---/.test(trimmed) ||
    /^(subgraph|end|classDef|style|linkStyle|click|direction\s)/i.test(
      trimmed,
    ) ||
    /^[A-Za-z0-9_[\](){}<>"'|:\\/.,#%+\-=&;*?\s]+$/.test(trimmed)
  );
}

function peekNextNonEmpty(lines: string[], from: number): string | null {
  for (let j = from; j < lines.length; j++) {
    const t = lines[j].trim();
    if (t) return t;
  }
  return null;
}

/**
 * Wraps bare Mermaid blocks (no ``` fence) so react-markdown can route them to the renderer.
 * Fenced ```mermaid blocks are left unchanged.
 */
export function preprocessMermaidFences(markdown: string): string {
  if (!markdown.trim()) return markdown;

  const lines = markdown.split('\n');
  const out: string[] = [];
  let inFence = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      inFence = !inFence;
      out.push(line);
      continue;
    }

    if (!inFence && MERMAID_START.test(trimmed)) {
      const block: string[] = [line];
      i++;

      while (i < lines.length) {
        const next = lines[i];
        const nextTrim = next.trim();

        if (nextTrim === '') {
          const peek = peekNextNonEmpty(lines, i + 1);
          if (!peek || !isMermaidContinuationLine(peek)) break;
          block.push(next);
          i++;
          continue;
        }

        if (!isMermaidContinuationLine(nextTrim)) break;

        block.push(next);
        i++;
      }

      out.push('```mermaid', ...block, '```');
      i--;
      continue;
    }

    out.push(line);
  }

  return out.join('\n');
}
